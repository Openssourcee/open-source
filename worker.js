// Open Source ($OS): Cloudflare Worker.
// Serves the static site (sitio/) and a small API so anyone can contribute from the page itself,
// with no account: paint a plot, write lore, propose code or tech, or send an idea.
// Each visitor's first painting, chapter or idea goes live straight away; after that, and always for
// code or anything with a link, it waits for the maintainer at /admin.html, who can also take down
// anything that is live. Contributed code is stored as text for review. It is never executed.

const KINDS = ["paint", "story", "code", "idea"];
const MAX_BODY = { story: 2000, code: 8000, idea: 1500 };
const PIXEL_CHARS = ".0123456789abcdefghijklmnopqrstuv"; // "." = transparent, then palette index 0-31
const CUSTOM = { minW: 4, minH: 4, maxW: 48, maxH: 40 };
const RATE = { perHour: 6 };

export default {
  async fetch(request, env, ctx) {
    // switched off before launch (wrangler.off.jsonc): every page and the API answer 404
    if (env.OFFLINE === "1") return new Response("Not found", { status: 404, headers: { "content-type": "text/plain", "cache-control": "no-store" } });
    const url = new URL(request.url);
    const p = url.pathname;
    try {
      if (p === "/api/canvas" && request.method === "GET") return await canvas(env);
      if (p === "/api/contribute" && request.method === "POST") return await contribute(request, env);
      if (p === "/api/admin/pending" && request.method === "GET") return await adminOnly(request, env, () => pending(env));
      if (p === "/api/admin/live" && request.method === "GET") return await adminOnly(request, env, () => liveNow(env));
      if (p === "/api/admin/review" && request.method === "POST") return await adminOnly(request, env, () => review(request, env));
      if (p.startsWith("/api/")) return json({ error: "Not found" }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: "Something broke on our side. Try again in a minute." }, 500);
    }
    return env.ASSETS.fetch(request);
  },
};

// ---------- public ----------

async function canvas(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, kind, plot_id, x, y, w, h, pixels, handle, title, body, link, created_at FROM contributions WHERE status = 'approved' ORDER BY reviewed_at ASC, id ASC"
  ).all();
  const paints = [], texts = [];
  for (const r of results) {
    if (r.kind === "paint") paints.push({ id: r.id, plotId: r.plot_id, x: r.x, y: r.y, w: r.w, h: r.h, pixels: r.pixels, handle: r.handle, title: r.title, caption: r.body, created: r.created_at });
    else texts.push({ id: r.id, kind: r.kind, plotId: r.plot_id, handle: r.handle, title: r.title, body: r.kind === "code" ? clip(r.body, 600) : r.body, link: r.link, created: r.created_at });
  }
  const pendingCount = (await env.DB.prepare("SELECT COUNT(*) AS n FROM contributions WHERE status = 'pending'").first()).n;
  return json({ paints, texts, pending: pendingCount }, 200, 15);
}

async function contribute(request, env) {
  const raw = await request.text();
  if (raw.length > 20000) return json({ error: "That is too big to send in one go." }, 413);
  let d;
  try { d = JSON.parse(raw); } catch { return json({ error: "That did not arrive in one piece. Try again." }, 400); }

  const kind = String(d.kind || "");
  if (!KINDS.includes(kind)) return json({ error: "Pick what you are sending: paint, story, code or idea." }, 400);
  const handle = clean(d.handle, 30) || "anon";
  const title = clean(d.title, 80);
  const link = clean(d.link, 200);
  if (link && !/^https?:\/\/[^\s]+$/i.test(link)) return json({ error: "Links must start with http:// or https://" }, 400);

  const { plots, config } = await staticData(env, request);
  const now = Date.now();
  const ipHash = await hashIp(request, env);
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM contributions WHERE ip_hash = ? AND created_at > ?").bind(ipHash, now - 3600_000).first();
  if (recent.n >= RATE.perHour) return json({ error: "You have sent a lot this hour. Give the reviewer a moment and try again later." }, 429);

  // first contribution from this visitor: straight to the site (never code, never links)
  const prior = await env.DB.prepare("SELECT COUNT(*) AS n FROM contributions WHERE ip_hash = ?").bind(ipHash).first();
  const auto = prior.n === 0 && kind !== "code" && !link;
  const status = auto ? "approved" : "pending";
  const reviewedAt = auto ? now : null;

  let plotId = d.plotId ? String(d.plotId) : null;
  if (plotId && !plots.some((p) => p.id === plotId)) return json({ error: "That plot does not exist." }, 400);

  if (kind === "paint") {
    let rect;
    if (plotId) {
      const p = plots.find((q) => q.id === plotId);
      if (p.status === "built") return json({ error: "That plot is already painted. Pick an open one or make your own." }, 409);
      rect = { x: p.x, y: p.y, w: p.w, h: p.h };
      if ((await approvedPaints(env)).some((q) => overlaps(q, rect))) return json({ error: "Someone already painted that plot. Pick another or make your own." }, 409);
    } else {
      rect = { x: int(d.x), y: int(d.y), w: int(d.w), h: int(d.h) };
      if ([rect.x, rect.y, rect.w, rect.h].some((n) => n === null)) return json({ error: "Your plot needs a position and a size." }, 400);
      if (rect.w < CUSTOM.minW || rect.h < CUSTOM.minH || rect.w > CUSTOM.maxW || rect.h > CUSTOM.maxH) return json({ error: `Your own plot can be ${CUSTOM.minW}x${CUSTOM.minH} up to ${CUSTOM.maxW}x${CUSTOM.maxH} tiles.` }, 400);
      if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > config.canvas.cols || rect.y + rect.h > config.canvas.rows) return json({ error: "Your plot goes off the canvas." }, 400);
      if (plots.some((p) => overlaps(p, rect))) return json({ error: "Your plot overlaps another plot. Move it to an empty spot." }, 409);
      const approved = await approvedPaints(env);
      if (approved.some((p) => overlaps(p, rect))) return json({ error: "Someone already painted that spot. Move your plot." }, 409);
    }
    const pixels = String(d.pixels || "");
    if (pixels.length !== rect.w * rect.h || [...pixels].some((c) => !PIXEL_CHARS.includes(c))) return json({ error: "The painting does not match the plot size." }, 400);
    if ([...pixels].filter((c) => c !== ".").length < 8) return json({ error: "Paint at least a few pixels first." }, 400);
    await env.DB.prepare(
      "INSERT INTO contributions (kind, plot_id, x, y, w, h, pixels, handle, title, body, link, status, auto, created_at, reviewed_at, ip_hash) VALUES ('paint', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(plotId, rect.x, rect.y, rect.w, rect.h, pixels, handle, title, clean(d.body, 280), link, status, auto ? 1 : 0, now, reviewedAt, ipHash).run();
  } else {
    const body = clean(d.body, MAX_BODY[kind], kind === "code");
    if (body.length < 10) return json({ error: "Write a little more so the reviewer knows what it is." }, 400);
    await env.DB.prepare(
      "INSERT INTO contributions (kind, plot_id, handle, title, body, link, status, auto, created_at, reviewed_at, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(kind, plotId, handle, title, body, link, status, auto ? 1 : 0, now, reviewedAt, ipHash).run();
  }
  const row = await env.DB.prepare("SELECT last_insert_rowid() AS id").first();
  return json(auto
    ? { ok: true, live: true, id: row.id, message: "It is live. Your first contribution goes up straight away." }
    : { ok: true, live: false, id: row.id, message: "Sent. It goes live as soon as it is checked." }, 201);
}

// ---------- maintainer ----------

async function adminOnly(request, env, fn) {
  if (!env.ADMIN_TOKEN) return json({ error: "The review page is not set up yet (no ADMIN_TOKEN)." }, 503);
  const got = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!(await sameSecret(got, env.ADMIN_TOKEN))) return json({ error: "Wrong review key." }, 401);
  return fn();
}

async function pending(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, kind, plot_id, x, y, w, h, pixels, handle, title, body, link, created_at FROM contributions WHERE status = 'pending' ORDER BY id ASC LIMIT 100"
  ).all();
  return json({ items: results });
}

async function liveNow(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, kind, plot_id, x, y, w, h, pixels, handle, title, body, link, auto, created_at FROM contributions WHERE status = 'approved' ORDER BY reviewed_at DESC LIMIT 100"
  ).all();
  return json({ items: results });
}

async function review(request, env) {
  const d = await request.json().catch(() => ({}));
  const id = int(d.id), action = d.action;
  if (id === null || !["approve", "reject", "remove"].includes(action)) return json({ error: "Bad request." }, 400);
  const row = await env.DB.prepare("SELECT * FROM contributions WHERE id = ?").bind(id).first();
  if (!row) return json({ error: "Not found." }, 404);
  if (action === "remove") {
    if (row.status !== "approved") return json({ error: `It is ${row.status}, not live.` }, 409);
    await env.DB.prepare("UPDATE contributions SET status = 'removed', reviewed_at = ? WHERE id = ?").bind(Date.now(), id).run();
    return json({ ok: true });
  }
  if (row.status !== "pending") return json({ error: `Already ${row.status}.` }, 409);
  if (action === "approve" && row.kind === "paint") {
    const approved = await approvedPaints(env);
    if (approved.some((p) => overlaps(p, row))) return json({ error: "Another painting was already approved on this spot. Reject this one." }, 409);
  }
  await env.DB.prepare("UPDATE contributions SET status = ?, reviewed_at = ? WHERE id = ?").bind(action === "approve" ? "approved" : "rejected", Date.now(), id).run();
  return json({ ok: true });
}

// ---------- helpers ----------

async function approvedPaints(env) {
  const { results } = await env.DB.prepare("SELECT x, y, w, h FROM contributions WHERE status = 'approved' AND kind = 'paint'").all();
  return results;
}

async function staticData(env, request) {
  const base = new URL(request.url).origin;
  const [plots, config] = await Promise.all([
    env.ASSETS.fetch(new Request(base + "/data/plots.json")).then((r) => r.json()),
    env.ASSETS.fetch(new Request(base + "/data/config.json")).then((r) => r.json()),
  ]);
  return { plots, config };
}

function overlaps(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function int(v) {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

function clean(v, max, keepLayout = false) {
  let s = String(v ?? "");
  s = keepLayout ? s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "") : s.replace(/[\u0000-\u001F\u007F]+/g, (m) => (m.includes("\n") ? "\n" : " "));
  return s.trim().slice(0, max);
}

function clip(s, n) {
  return s && s.length > n ? s.slice(0, n) + "\n..." : s;
}

async function hashIp(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const data = new TextEncoder().encode(ip + "|" + (env.IP_SALT || "open-source-os"));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sameSecret(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const ua = new Uint8Array(x), ub = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

function json(body, status = 200, maxAge = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": maxAge ? `public, max-age=${maxAge}` : "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
