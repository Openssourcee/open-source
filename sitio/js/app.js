import { World, pixelsToCanvas, PIXEL_CHARS } from "./canvas.js";

const $ = (s, el = document) => el.querySelector(s);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: nothing to remember */ } },
};
const CUSTOM = { minW: 4, minH: 4, maxW: 48, maxH: 40 };
const KIND_ACTION = { art: ["paint", "Paint it"], code: ["code", "Send code"], game: ["code", "Send code"], words: ["idea", "Send it"] };

async function loadStatic() {
  const get = (f) => fetch(f, { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(f); return r.json(); });
  const [config, plots, changelog] = await Promise.all([get("data/config.json"), get("data/plots.json"), get("data/changelog.json")]);
  return { config, plots, changelog };
}

// Approved contributions from the server. Without it (a plain static preview) the page still works, read-only.
async function loadLive() {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 5000);
    const r = await fetch("/api/canvas", { signal: ctl.signal, cache: "no-cache" });
    clearTimeout(t);
    if (!r.ok) throw new Error(String(r.status));
    return { ok: true, ...(await r.json()) };
  } catch {
    return { ok: false, paints: [], texts: [], pending: 0 };
  }
}

Promise.all([loadStatic(), loadLive()]).then(([data, live]) => start(data, live)).catch((err) => {
  console.error(err);
  $("#paletteStatus").textContent = "The canvas data could not load. Refresh to try again.";
});

function start({ config, plots, changelog }, live) {
  const cats = config.categories;
  const repo = (config.repo || "").replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
  const repoUrl = repo ? `https://github.com/${repo}` : "";
  setupLinks(config, repoUrl);

  // ---------- approved paintings join the canvas ----------
  for (const p of live.paints) {
    const target = p.plotId && plots.find((q) => q.id === p.plotId);
    if (target) Object.assign(target, { status: "built", author: p.handle, pixels: p.pixels, brief: p.caption || target.brief, painted: true, title: p.title || target.title });
    else plots.push({ id: `c${p.id}`, status: "built", title: p.title || "Untitled plot", brief: p.caption || "", category: "art", x: p.x, y: p.y, w: p.w, h: p.h, pixels: p.pixels, author: p.handle, custom: true, painted: true });
  }
  const stories = live.texts.filter((t) => t.kind === "story");
  const proposals = live.texts.filter((t) => t.kind !== "story");

  // ---------- the canvas ----------
  const world = new World($("#world"), { cols: config.canvas.cols, rows: config.canvas.rows, plots, categories: cats });
  world.palette = config.palette;
  (document.fonts?.ready ?? Promise.resolve()).then(() => { world.needs = true; world.kick(); });

  const art = new Map();
  plots.filter((p) => p.status === "built").forEach((p, i) => {
    const delay = 250 + i * 260;
    if (p.pixels) {
      const c = pixelsToCanvas(p.w, p.h, p.pixels, config.palette);
      art.set(p.id, c);
      setTimeout(() => world.paintImage(p, c, true), delay);
    } else if (p.art) {
      const img = new Image();
      img.onload = () => { art.set(p.id, img); drawMinis(); setTimeout(() => world.paintImage(p, img, true), delay); };
      img.src = p.art;
    }
  });

  // what this visitor sent and is still waiting for review (shown only to them)
  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const sent = store.get("os.sent", []).filter((g) => Date.now() - g.at < 7 * 864e5 && !plots.some((p) => p.status === "built" && overlap(p, g.rect)));
  store.set("os.sent", sent);
  sent.forEach((g) => world.addGhost(g.rect, g.pixels));

  world.canClaim = (r) => r.w >= CUSTOM.minW && r.h >= CUSTOM.minH && r.w <= CUSTOM.maxW && r.h <= CUSTOM.maxH
    && r.x >= 0 && r.y >= 0 && r.x + r.w <= config.canvas.cols && r.y + r.h <= config.canvas.rows
    && !plots.some((p) => overlap(p, r)) && !world.ghosts.some((g) => overlap(g.rect, r));

  const coords = $("#coords"), zoomLabel = $("#zoomLabel");
  world.on("hover", (t) => { if (t) coords.textContent = `(${t.x}, ${t.y})`; });
  world.on("view", (v) => { zoomLabel.textContent = `${v.zoom < 10 ? v.zoom.toFixed(1).replace(/\.0$/, "") : Math.round(v.zoom)}x`; });
  world.emit("view", world.view());

  $("#zoomIn").addEventListener("click", () => world.zoomAt(1.4, world.w / 2, world.h / 2));
  $("#zoomOut").addEventListener("click", () => world.zoomAt(1 / 1.4, world.w / 2, world.h / 2));
  $("#zoomHome").addEventListener("click", () => { closePop(); world.home(); });

  const stage = $("#stage"), exploreBtn = $("#exploreBtn");
  const setExplore = (on) => {
    stage.classList.toggle("exploring", on);
    document.body.classList.toggle("exploring", on);
    world.exploring = on;
    exploreBtn.setAttribute("aria-pressed", String(on));
    exploreBtn.setAttribute("aria-label", on ? "Leave full screen" : "Explore full screen");
    exploreBtn.innerHTML = `<i class="ph-bold ${on ? "ph-arrows-in" : "ph-arrows-out-simple"}" aria-hidden="true"></i>`;
    requestAnimationFrame(() => world.resize());
    if (on) $("#world").focus({ preventScroll: true });
  };
  exploreBtn.addEventListener("click", () => setExplore(!world.exploring));

  // ---------- palette strip: idle, choosing a spot, painting ----------
  const swatches = $("#swatches"), status = $("#paletteStatus"), palette = $("#palette");
  const btn = { eraser: $("#eraserBtn"), clear: $("#clearBtn"), cancel: $("#cancelBtn"), own: $("#ownBtn"), send: $("#sendBtn") };
  let colour = 27; // ink by default
  let paintTarget = null; // { plotId, title }
  config.palette.forEach((hex, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "swatch"; b.style.background = hex;
    b.setAttribute("role", "radio"); b.setAttribute("aria-label", `Colour ${hex}`);
    b.addEventListener("click", () => {
      colour = i;
      world.paintIndex = i;
      btn.eraser.setAttribute("aria-pressed", "false");
      markSwatch();
      if (!world.mode) enterChoose();
    });
    swatches.append(b);
  });
  function markSwatch() {
    swatches.querySelectorAll(".swatch").forEach((s, j) => s.setAttribute("aria-checked", String(world.mode === "paint" && world.paintIndex === j)));
  }

  function ui() {
    const mode = world.mode || "idle";
    palette.dataset.mode = mode;
    btn.own.hidden = mode !== "idle";
    btn.cancel.hidden = mode === "idle";
    btn.eraser.hidden = btn.clear.hidden = btn.send.hidden = mode !== "paint";
    const n = world.draftCount();
    btn.send.disabled = n < 8;
    if (mode === "idle") status.textContent = "Pick an open plot to paint, or make your own.";
    else if (mode === "choose") status.innerHTML = `Drag on an empty spot to mark your plot. Up to ${CUSTOM.maxW}&times;${CUSTOM.maxH} tiles.`;
    else status.innerHTML = `Painting <strong>${esc(paintTarget?.title || "your plot")}</strong>. ${n < 8 ? `Paint at least ${8 - n} more ${8 - n === 1 ? "pixel" : "pixels"}.` : `${n} pixels.`}`;
    markSwatch();
  }

  function enterChoose() {
    closePop();
    world.setMode("choose");
    toast("Drag on any empty space to mark out your plot, or tap an open art plot.");
  }
  function startPaintRect(rect, target) {
    closePop();
    paintTarget = target;
    world.paintIndex = colour;
    world.startPaint(rect);
    world.focusPlot(rect);
    btn.cancel.dataset.armed = "";
    btn.cancel.textContent = "Cancel";
  }
  function startPaintPlot(p) {
    $("#top").scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" });
    startPaintRect({ x: p.x, y: p.y, w: p.w, h: p.h }, { plotId: p.id, title: p.title });
  }
  function leaveModes() {
    world.setMode(null);
    paintTarget = null;
  }

  world.on("mode", ui);
  world.on("draft", ui);
  ui();

  btn.own.addEventListener("click", enterChoose);
  btn.clear.addEventListener("click", () => world.clearDraft());
  btn.eraser.addEventListener("click", () => {
    const on = btn.eraser.getAttribute("aria-pressed") !== "true";
    btn.eraser.setAttribute("aria-pressed", String(on));
    world.paintIndex = on ? -1 : colour;
    markSwatch();
  });
  btn.cancel.addEventListener("click", () => {
    if (world.mode === "paint" && world.draftCount() > 0 && !btn.cancel.dataset.armed) {
      btn.cancel.dataset.armed = "1";
      btn.cancel.textContent = "Discard painting?";
      setTimeout(() => { btn.cancel.dataset.armed = ""; btn.cancel.textContent = "Cancel"; }, 3000);
      return;
    }
    btn.cancel.dataset.armed = "";
    btn.cancel.textContent = "Cancel";
    leaveModes();
  });
  btn.send.addEventListener("click", () => openContribute("paint-send"));

  world.on("select", (r) => {
    if (world.canClaim(r)) startPaintRect(r, { plotId: null, title: "your own plot" });
    else { world.sel = null; world.needs = true; world.kick(); toast(`That spot overlaps another plot or is too big. Plots can be ${CUSTOM.minW}x${CUSTOM.minH} up to ${CUSTOM.maxW}x${CUSTOM.maxH} tiles.`, 4500); }
  });

  world.on("tap", ({ tile, plot }) => {
    if (world.mode === "paint") return;
    if (world.mode === "choose") {
      if (plot && plot.status !== "built" && plot.category === "art") startPaintPlot(plot);
      else if (plot) toast("That plot is taken or is not an art plot. Drag on empty space instead.");
      return;
    }
    if (plot) { openPop(plot); return; }
    closePop();
    if (tile && world.ghostAt(tile)) toast("This is yours, waiting for review. Only you can see it until it is approved.", 4500);
    else if (tile) toast("Empty space. Use Make your own plot to claim it.");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || $("#contribute").open) return;
    if (!$("#popover").hidden) closePop();
    else if (world.exploring) setExplore(false);
  });

  // ---------- plot popover ----------
  const pop = $("#popover"), popBody = $("#popBody");
  let popPlot = null, lastFocus = null;
  function actionFor(p) { return KIND_ACTION[p.category] || ["idea", "Send it"]; }
  function openPop(p) {
    popPlot = p;
    world.selected = p; world.needs = true; world.kick();
    const kind = cats[p.category] || { label: "Plot", color: "#141516" };
    if (p.status === "built") {
      popBody.innerHTML = `
        <h3 id="popTitle">${esc(p.title)}</h3>
        ${p.brief ? `<p>${esc(p.brief)}</p>` : ""}
        <div class="pop-meta"><span>by @${esc(p.author)}</span><span>${p.w}&times;${p.h}</span></div>`;
    } else {
      const [kindKey, label] = actionFor(p);
      popBody.innerHTML = `
        <h3 id="popTitle">${esc(p.title)}</h3>
        <p>${esc(p.brief)}</p>
        <div class="pop-meta"><span class="kind" style="--kind:${kind.color}">${esc(kind.label)}</span><span>${p.w}&times;${p.h}</span><span>free to take</span></div>
        <div class="pop-actions"><button class="btn primary" type="button" data-act>${label}</button><a class="btn quiet" href="#plot-${p.id}" data-card>Details</a></div>`;
      popBody.querySelector("[data-act]").addEventListener("click", () => {
        closePop();
        if (kindKey === "paint") startPaintPlot(p); else openContribute(kindKey, p.id);
      });
      popBody.querySelector("[data-card]").addEventListener("click", (e) => { e.preventDefault(); closePop(); showCard(p.id); });
    }
    lastFocus = document.activeElement;
    pop.hidden = false;
    placePop();
    if (!reduceMotion.matches) {
      pop.classList.add("entering");
      requestAnimationFrame(() => requestAnimationFrame(() => pop.classList.remove("entering")));
    }
    $("#popClose").focus({ preventScroll: true });
  }
  function placePop() {
    if (!popPlot || pop.hidden) return;
    const r = world.plotRect(popPlot);
    const pw = pop.offsetWidth, ph = pop.offsetHeight, W = world.w, H = world.h, gap = 12;
    let x, y, origin;
    if (W < 600) { x = (W - pw) / 2; y = 64; origin = "50% 0%"; }
    else if (r.x + r.w + gap + pw < W - 60) { x = r.x + r.w + gap; y = r.y; origin = "0% 0%"; }
    else if (r.x - gap - pw > 12) { x = r.x - gap - pw; y = r.y; origin = "100% 0%"; }
    else { x = r.x + r.w / 2 - pw / 2; y = r.y + r.h + gap; origin = "50% 0%"; }
    x = Math.max(12, Math.min(W - pw - 12, x));
    y = Math.max(64, Math.min(H - ph - 12, y));
    pop.style.left = `${x}px`; pop.style.top = `${y}px`; pop.style.transformOrigin = origin;
  }
  function closePop() {
    if (pop.hidden) return;
    pop.hidden = true; popPlot = null;
    world.selected = null; world.needs = true; world.kick();
    if (lastFocus && document.contains(lastFocus) && lastFocus !== document.body) lastFocus.focus({ preventScroll: true });
  }
  $("#popClose").addEventListener("click", closePop);
  world.on("view", placePop);
  new ResizeObserver(placePop).observe(stage);

  // ---------- open plots list ----------
  const open = plots.filter((p) => p.status !== "built");
  const grid = $("#plotGrid"), filters = $("#filters");
  let filter = "all";
  const kinds = ["all", ...Object.keys(cats).filter((k) => open.some((p) => p.category === k))];
  kinds.forEach((k) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip";
    const n = k === "all" ? open.length : open.filter((p) => p.category === k).length;
    b.innerHTML = `${k === "all" ? "" : `<i style="--kind:${cats[k].color}"></i>`}${k === "all" ? "All" : cats[k].label} <span class="n">${n}</span>`;
    b.setAttribute("aria-pressed", String(k === filter));
    b.addEventListener("click", () => {
      filter = k;
      filters.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
      renderGrid();
    });
    filters.append(b);
  });
  function renderGrid() {
    const list = open.filter((p) => filter === "all" || p.category === filter).sort((a, b) => b.w * b.h - a.w * a.h);
    grid.innerHTML = list.map((p, i) => {
      const kind = cats[p.category];
      const big = filter === "all" && list.length > 4 && i < 2;
      const [, label] = actionFor(p);
      return `<li class="plot-card${big ? " big" : ""}" id="plot-${p.id}" style="--kind:${kind.color}">
        <div class="plot-thumb">
          <canvas data-mini="${p.id}" aria-hidden="true"></canvas>
          <span class="tag"><i></i>${esc(kind.label)}</span>
        </div>
        <div class="plot-text">
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.brief)}</p>
          <p class="plot-size">${p.w}&times;${p.h} at (${p.x},&nbsp;${p.y})</p>
          <div class="plot-actions">
            <button class="btn primary" type="button" data-act="${p.id}">${label}</button>
            <a class="btn quiet" href="#top" data-find="${p.id}">Find it</a>
          </div>
        </div>
      </li>`;
    }).join("");
    $("#plotsEmpty").hidden = list.length > 0;
    drawMinis();
    grid.querySelectorAll("[data-find]").forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      const p = plots.find((q) => q.id === a.dataset.find);
      $("#top").scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" });
      setTimeout(() => world.focusPlot(p).then(() => openPop(p)), reduceMotion.matches ? 0 : 450);
    }));
    grid.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => {
      const p = plots.find((q) => q.id === b.dataset.act);
      const [kindKey] = actionFor(p);
      if (kindKey === "paint") setTimeout(() => startPaintPlot(p), 0); else openContribute(kindKey, p.id);
    }));
  }
  function drawMinis() {
    grid.querySelectorAll("canvas[data-mini]").forEach((c) => drawMini(c, plots.find((q) => q.id === c.dataset.mini), plots, art, cats, config.canvas));
  }
  new ResizeObserver(() => drawMinis()).observe(grid);
  renderGrid();
  function showCard(id) {
    if (filter !== "all") filters.querySelector(".chip").click();
    const card = $(`#plot-${id}`);
    card.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "center" });
    card.classList.remove("flash"); void card.offsetWidth; card.classList.add("flash");
  }

  // ---------- lore ----------
  $("#chapters").innerHTML = stories.map((s, i) => `
    <li class="chapter">
      <span class="chapter-n">Chapter ${i + 1}</span>
      <h3>${esc(s.title || "Untitled")}</h3>
      ${String(s.body || "").split(/\n{2,}/).map((para) => `<p>${esc(para).replace(/\n/g, "<br>")}</p>`).join("")}
      <p class="chapter-by">by @${esc(s.handle)}${s.link ? ` &middot; ${safeLink(s.link)}` : ""}</p>
    </li>`).join("");
  $("#loreEmpty").hidden = stories.length > 0;

  // ---------- people, proposals, versions ----------
  const counts = new Map();
  plots.filter((p) => p.status === "built").forEach((p) => counts.set(p.author, (counts.get(p.author) || 0) + 1));
  live.texts.forEach((t) => counts.set(t.handle, (counts.get(t.handle) || 0) + 1));
  const faces = $("#faces");
  for (const [handle, n] of counts) {
    const li = document.createElement("li");
    li.className = "face";
    const genesis = plots.find((p) => p.author === handle && p.avatar);
    let c;
    if (genesis) { c = new Image(); c.src = genesis.avatar; c.alt = ""; c.width = 72; c.height = 72; c.style.imageRendering = "pixelated"; }
    else c = identicon(handle, config.palette);
    li.append(c);
    li.insertAdjacentHTML("beforeend", `<b>@${esc(handle)}</b><span>${n} ${n === 1 ? "contribution" : "contributions"}</span>`);
    faces.append(li);
  }
  const slots = Math.max(3, 6 - counts.size);
  for (let i = 0; i < slots; i++) {
    faces.insertAdjacentHTML("beforeend", `<li class="face open"><button class="slot" type="button" data-contribute aria-label="Contribute"><i class="ph-bold ph-plus" aria-hidden="true"></i></button><b>${i === 0 ? "You, next" : "Open"}</b></li>`);
  }
  const icons = { code: "ph-code", idea: "ph-lightbulb" };
  $("#proposals").innerHTML = proposals.map((t) => `
    <li><i class="ph-bold ${icons[t.kind] || "ph-lightbulb"}" aria-hidden="true"></i><div><b>${esc(t.title || "Untitled")}</b><span>by @${esc(t.handle)}${t.link ? ` &middot; ${safeLink(t.link)}` : ""}</span></div></li>`).join("");
  $("#proposalsEmpty").hidden = proposals.length > 0;
  $("#versions").innerHTML = changelog.slice().reverse().map((v) => `
    <li class="version">
      <h3><code>${esc(v.version)}</code> ${esc(v.title)}</h3>
      <time datetime="${esc(v.date)}">${new Date(v.date + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} &middot; @${esc(v.by)}</time>
      <ul>${v.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
    </li>`).join("");

  // ---------- fees and tally ----------
  const painted = plots.filter((p) => p.status === "built").length;
  $("#tally").innerHTML = `So far: <b>${painted}</b> ${painted === 1 ? "plot" : "plots"} painted, <b>${stories.length}</b> ${stories.length === 1 ? "chapter" : "chapters"} of lore, <b>${proposals.length}</b> ${proposals.length === 1 ? "proposal" : "proposals"} accepted${live.ok ? `, <b>${live.pending}</b> waiting for review` : ""}.`;
  if (config.devWallet && config.devKey) {
    $("#devkeyTitle").textContent = "Here is the dev key. It controls nothing.";
    $("#devAddr").textContent = config.devWallet;
    const scan = $("#devScan");
    scan.href = `https://solscan.io/account/${encodeURIComponent(config.devWallet)}`;
    scan.hidden = false;
    $("#devKey").textContent = config.devKey;
    const copy = $("#copyKey");
    copy.hidden = false;
    copy.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(config.devKey); copy.textContent = "Copied"; }
      catch { getSelection().selectAllChildren($("#devKey")); copy.textContent = "Selected"; }
      setTimeout(() => { copy.textContent = "Copy"; }, 1600);
    });
  }
  $("#charities").innerHTML = (config.charities || []).map((c) => `
    <li><a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.name)}</a><span>${esc(c.why)}</span></li>`).join("");

  // ---------- how it works ----------
  document.querySelectorAll(".step-art").forEach((c) => drawStep(c, c.dataset.state));
  const branch = $("#branch");
  branch.querySelectorAll(".step").forEach((s, i) => s.style.setProperty("--i", i));
  if (!reduceMotion.matches && "IntersectionObserver" in window) {
    branch.classList.add("pending");
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      branch.classList.remove("pending");
      io.disconnect();
    }, { threshold: 0.25 });
    io.observe(branch);
  }

  // ---------- who built this ----------
  const blameBtn = $("#blameBtn");
  blameBtn.addEventListener("click", () => {
    const on = !document.body.classList.contains("blame");
    document.body.classList.toggle("blame", on);
    blameBtn.setAttribute("aria-pressed", String(on));
    if (on) toast("Every part of this page shows who built it. Right now that is @genesis. That should change soon.", 4500);
  });

  // ---------- contribute sheet ----------
  const sheet = $("#contribute"), form = $("#cForm");
  const f = { handle: $("#fHandle"), title: $("#fTitle"), body: $("#fBody"), link: $("#fLink"), plot: $("#fPlot") };
  open.forEach((p) => f.plot.insertAdjacentHTML("beforeend", `<option value="${esc(p.id)}">${esc(p.title)}</option>`));
  const SHEET = {
    story: { body: "Your chapter", help: "Up to 2,000 characters. Keep it fun and keep it kind.", max: 2000, link: false, plot: true, title: "Write a chapter" },
    code: { body: "Your code, or how it would work", help: "Up to 8,000 characters. Paste code, or describe the feature and link a repo or gist.", max: 8000, link: true, plot: true, title: "Code & tech" },
    idea: { body: "Your idea", help: "Up to 1,500 characters.", max: 1500, link: true, plot: true, title: "Send an idea" },
    "paint-send": { body: "Caption", help: "Optional. One line about your painting.", max: 280, link: false, plot: false, title: "Send your painting" },
  };
  let sheetKind = null;

  function setSheet(kind) {
    sheetKind = kind;
    const paintSend = kind === "paint-send";
    $("#kinds").hidden = paintSend;
    form.querySelectorAll("input[name=kind]").forEach((r) => { r.checked = r.value === kind; });
    $("#paintIntro").hidden = kind !== "paint";
    $("#paintPreview").hidden = !paintSend;
    const cfg = SHEET[kind];
    $("#fields").hidden = $("#sheetFoot").hidden = !cfg;
    $("#cTitle").textContent = cfg ? cfg.title : kind === "paint" ? "Paint a plot" : "Contribute";
    if (!cfg) return;
    $("#bodyLabel").textContent = cfg.body;
    $("#bodyHelp").textContent = cfg.help;
    f.body.maxLength = cfg.max;
    f.body.classList.toggle("mono", kind === "code");
    f.body.rows = kind === "code" ? 10 : paintSend ? 2 : 7;
    $("#linkField").hidden = !cfg.link;
    $("#plotField").hidden = !cfg.plot;
    $("#formError").hidden = true;
  }

  function openContribute(kind = null, plotId = "") {
    form.reset();
    f.handle.value = store.get("os.handle", "");
    f.plot.value = plotId || "";
    $("#sent").hidden = true; form.hidden = false;
    $("#formError").hidden = true;
    setSheet(kind);
    if (kind === "paint-send") {
      const d = world.draft;
      const pc = $("#previewCanvas");
      const k = Math.max(2, Math.floor(Math.min(240 / d.rect.w, 160 / d.rect.h)));
      pc.width = d.rect.w * k; pc.height = d.rect.h * k;
      const x = pc.getContext("2d");
      x.imageSmoothingEnabled = false;
      x.fillStyle = "#ffffff"; x.fillRect(0, 0, pc.width, pc.height);
      x.drawImage(pixelsToCanvas(d.rect.w, d.rect.h, world.draftPixels(), config.palette), 0, 0, pc.width, pc.height);
      $("#previewInfo").textContent = `${paintTarget?.plotId ? paintTarget.title : "Your own plot"}, ${d.rect.w}×${d.rect.h} tiles, ${world.draftCount()} pixels.`;
      f.title.value = paintTarget?.plotId ? paintTarget.title : "";
    }
    sheet.showModal();
    const first = kind && kind !== "paint" ? (kind === "paint-send" ? f.title : f.title) : form.querySelector("input[name=kind]");
    first?.focus();
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-contribute]");
    if (!t) return;
    e.preventDefault();
    openContribute(t.dataset.contribute || null);
  });
  form.querySelectorAll("input[name=kind]").forEach((r) => r.addEventListener("change", () => setSheet(r.value)));
  $("#goPaint").addEventListener("click", () => {
    sheet.close();
    $("#top").scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" });
    enterChoose();
  });
  const closeSheet = () => sheet.close();
  $("#cClose").addEventListener("click", closeSheet);
  $("#sentClose").addEventListener("click", closeSheet);
  sheet.addEventListener("click", (e) => { if (e.target === sheet) closeSheet(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#formError");
    const fail = (msg, field) => { err.textContent = msg; err.hidden = false; field?.focus(); };
    err.hidden = true;
    const kind = sheetKind === "paint-send" ? "paint" : sheetKind;
    if (!kind || kind === "paint" && !world.draft) return fail("Pick what you are adding first.");
    const body = f.body.value.trim(), link = f.link.value.trim();
    if (kind !== "paint" && body.length < 10) return fail("Write a little more so the reviewer knows what it is.", f.body);
    if (link && !/^https?:\/\/\S+$/i.test(link)) return fail("Links must start with https://", f.link);
    if (!live.ok) return fail("Sending opens when the site is live. This is a preview without a server.");
    const payload = { kind, handle: f.handle.value.trim(), title: f.title.value.trim(), body, link, plotId: f.plot.value || null };
    if (kind === "paint") Object.assign(payload, { ...world.draft.rect, pixels: world.draftPixels(), plotId: paintTarget?.plotId || null, link: "" });
    const submit = $("#cSubmit");
    submit.disabled = true; submit.textContent = "Sending...";
    try {
      const r = await fetch("/api/contribute", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return fail(d.error || "That did not go through. Try again.");
      store.set("os.handle", payload.handle);
      const handle = payload.handle || "anon";
      if (kind === "paint") {
        const rect = { ...world.draft.rect }, pixels = world.draftPixels();
        if (d.live) {
          // first contribution: it is already public, so paint it for real
          const target = paintTarget?.plotId && plots.find((q) => q.id === paintTarget.plotId);
          const plot = target || { id: `c${d.id}`, category: "art", ...rect, custom: true };
          Object.assign(plot, { status: "built", author: handle, pixels, title: payload.title || plot.title || "Untitled plot", brief: payload.body || plot.brief || "" });
          if (!target) plots.push(plot);
          const c = pixelsToCanvas(rect.w, rect.h, pixels, config.palette);
          art.set(plot.id, c);
          leaveModes();
          world.paintImage(plot, c, true);
        } else {
          const g = { rect, pixels, at: Date.now() };
          const list = store.get("os.sent", []); list.push(g); store.set("os.sent", list);
          world.addGhost(g.rect, g.pixels);
          leaveModes();
        }
      } else if (d.live && kind === "story") {
        const n = $("#chapters").children.length + 1;
        $("#chapters").insertAdjacentHTML("beforeend", `<li class="chapter"><span class="chapter-n">Chapter ${n}</span><h3>${esc(payload.title || "Untitled")}</h3>${body.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("")}<p class="chapter-by">by @${esc(handle)}</p></li>`);
        $("#loreEmpty").hidden = true;
      } else if (d.live) {
        $("#proposals").insertAdjacentHTML("beforeend", `<li><i class="ph-bold ph-lightbulb" aria-hidden="true"></i><div><b>${esc(payload.title || "Untitled")}</b><span>by @${esc(handle)}</span></div></li>`);
        $("#proposalsEmpty").hidden = true;
      }
      $("#sent").querySelector("h2").textContent = d.live ? "It is live." : "Sent.";
      $("#sentText").textContent = d.live
        ? "Your first contribution goes up straight away. It is on the site now, with your name on it."
        : kind === "paint"
          ? "Your painting is on the canvas for you already, marked in review. Everyone sees it as soon as it is checked."
          : "It goes live as soon as it is checked. Thanks for building.";
      form.hidden = true; $("#sent").hidden = false;
      $("#sentClose").focus();
    } catch {
      fail("Could not reach the server. Check your connection and try again.");
    } finally {
      submit.disabled = false; submit.textContent = "Send for review";
    }
  });

  // ---------- live pull requests ----------
  if (repo) {
    fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(`repo:${repo} is:pr is:open`)}&per_page=1`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || typeof d.total_count !== "number") return;
        const pill = $("#prPill");
        pill.href = `${repoUrl}/pulls`;
        pill.innerHTML = `<i class="ph-bold ph-git-pull-request" aria-hidden="true"></i>${d.total_count} in review`;
        pill.setAttribute("aria-label", `${d.total_count} pull requests in review on GitHub`);
        pill.hidden = false;
      })
      .catch(() => {});
  }
}

function safeLink(url) {
  if (!/^https?:\/\//i.test(url)) return "";
  let host = url;
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
  return `<a href="${esc(url)}" target="_blank" rel="noopener nofollow ugc">${esc(host)}</a>`;
}

// ---------- helpers ----------
function setupLinks(config, repoUrl) {
  const buyUrl = config.buyUrl || (config.ca ? `https://pump.fun/coin/${config.ca}` : "");
  document.querySelectorAll(".buy").forEach((a) => {
    if (buyUrl) a.href = buyUrl;
    else { a.removeAttribute("href"); a.setAttribute("aria-disabled", "true"); a.textContent = "Buy at launch"; a.title = "The coin is not live yet"; }
  });
  if (config.x) { const x = $("#xLink"); x.href = config.x; x.hidden = false; }
  const repoLink = $("#repoLink");
  if (repoUrl) repoLink.href = repoUrl;
  else { repoLink.setAttribute("aria-disabled", "true"); repoLink.title = "The repo goes public at launch"; repoLink.querySelector("span").textContent = "Source goes public at launch"; }
  if (config.ca) {
    $("#caText").textContent = config.ca;
    const btn = $("#copyCa");
    btn.disabled = false;
    btn.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(config.ca); }
      catch { const r = document.createRange(); r.selectNodeContents($("#caText")); getSelection().removeAllRanges(); getSelection().addRange(r); }
      btn.classList.add("done");
      clearTimeout(btn._t);
      btn._t = setTimeout(() => btn.classList.remove("done"), 1600);
    });
  }
}

let toastTimer;
function toast(text, ms = 3200) {
  const t = $("#toast");
  clearTimeout(toastTimer);
  t.textContent = text;
  if (t.hidden) { t.classList.add("off"); t.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => t.classList.remove("off"))); }
  toastTimer = setTimeout(() => {
    t.classList.add("off");
    setTimeout(() => { if (t.classList.contains("off")) t.hidden = true; }, 240);
  }, ms);
}

function identicon(name, palette) {
  let h = 2166136261;
  for (const ch of name) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const strong = palette.filter((c) => !["#FFFFFF", "#D4D7D9", "#FFF8B8", "#898D90"].includes(c.toUpperCase()));
  const color = strong[Math.abs(h) % strong.length];
  const c = document.createElement("canvas");
  c.width = 5; c.height = 5;
  const x = c.getContext("2d");
  x.fillStyle = color;
  for (let row = 0; row < 5; row++) for (let col = 0; col < 3; col++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    if ((h >>> 7) & 1) { x.fillRect(col, row, 1, 1); x.fillRect(4 - col, row, 1, 1); }
  }
  c.setAttribute("aria-hidden", "true");
  return c;
}

// A 16 x 10 plot drawn four times: waiting, claimed, in review, merged.
const HEART = [
  "................",
  "................",
  "....pp...pp.....",
  "...pPPp.pPPp..y.",
  "...pPPPpPPPp.yYy",
  "...pPPPPPPPp..y.",
  "....pPPPPPp.....",
  ".....pPPPp......",
  "......pPp.......",
  ".......p........",
];
const HEART_COLORS = { p: "#DE107F", P: "#FF3881", y: "#FFA800", Y: "#FFD635" };

function drawStep(c, state) {
  const W = 320, H = 200, T = 20;
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, W, H);
  x.strokeStyle = "rgba(20,21,22,0.07)"; x.lineWidth = 1;
  x.beginPath();
  for (let i = 0; i <= 16; i++) { x.moveTo(i * T + 0.5, 0); x.lineTo(i * T + 0.5, H); }
  for (let j = 0; j <= 10; j++) { x.moveTo(0, j * T + 0.5); x.lineTo(W, j * T + 0.5); }
  x.stroke();

  const painted = state === "merged" ? 1 : state === "review" ? 0.5 : 0;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  HEART.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === "." || rnd() > painted) return;
    x.fillStyle = HEART_COLORS[ch]; x.fillRect(i * T, j * T, T, T);
  }));

  if (state !== "merged") {
    x.save();
    x.globalAlpha = 0.13; x.strokeStyle = "#FF3881"; x.lineWidth = 8;
    x.beginPath(); for (let d = -H; d < W; d += 40) { x.moveTo(d, H); x.lineTo(d + H, 0); } x.stroke();
    x.restore();
    x.setLineDash([14, 10]); x.lineWidth = 4; x.strokeStyle = "#141516"; x.strokeRect(2, 2, W - 4, H - 4); x.setLineDash([]);
  } else {
    x.lineWidth = 4; x.strokeStyle = "#141516"; x.strokeRect(2, 2, W - 4, H - 4);
  }
  const label = { open: "Art", claimed: "@you", review: "in review", merged: "live by @you" }[state];
  const solid = state === "merged";
  x.font = "600 22px 'Martian Mono', ui-monospace, monospace";
  const draw = () => {
    const tw = x.measureText(label).width, h = 40, pad = 14, sq = 14, w = tw + pad * 2 + sq + 10;
    x.fillStyle = "rgba(20,21,22,0.16)"; pill(x, 12, 15, w, h); x.fill();
    x.fillStyle = solid ? "#141516" : "#ffffff"; pill(x, 12, 12, w, h); x.fill();
    x.fillStyle = solid ? "#00CC78" : state === "claimed" ? "#FF3881" : state === "review" ? "#FFA800" : "#FF3881";
    x.fillRect(12 + pad, 12 + (h - sq) / 2, sq, sq);
    x.fillStyle = solid ? "#ffffff" : "#141516"; x.textBaseline = "middle";
    x.fillText(label, 12 + pad + sq + 10, 12 + h / 2 + 1);
  };
  draw();
  document.fonts?.ready.then(() => { if (!c.dataset.redrawn) { c.dataset.redrawn = "1"; drawStep(c, state); } });
}

// A crop of the real canvas around one plot, at a whole number of pixels per tile so nothing aliases.
// The plot is centred (as far as the board edge allows), everything else is muted.
function drawMini(c, plot, plots, art, cats, world) {
  const W = c.clientWidth, H = c.clientHeight;
  if (!W || !H || !plot) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  const x = c.getContext("2d");
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const s = Math.max(2, Math.floor(Math.min(W / (plot.w * 1.3), H / (plot.h * 1.3))));
  let ox = Math.round(W / 2 - (plot.x + plot.w / 2) * s);
  let oy = Math.round(H / 2 - (plot.y + plot.h / 2) * s);
  // keep the crop on the board
  ox = Math.min(0, Math.max(W - world.cols * s, ox));
  oy = Math.min(0, Math.max(H - world.rows * s, oy));
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, W, H);
  if (s >= 4) {
    x.strokeStyle = "rgba(20,21,22,0.06)"; x.lineWidth = 1; x.beginPath();
    for (let X = ox % s; X <= W; X += s) { x.moveTo(X + 0.5, 0); x.lineTo(X + 0.5, H); }
    for (let Y = oy % s; Y <= H; Y += s) { x.moveTo(0, Y + 0.5); x.lineTo(W, Y + 0.5); }
    x.stroke();
  }
  x.imageSmoothingEnabled = false;
  for (const p of plots) {
    const r = { x: ox + p.x * s, y: oy + p.y * s, w: p.w * s, h: p.h * s };
    if (r.x > W || r.y > H || r.x + r.w < 0 || r.y + r.h < 0 || p === plot) continue;
    x.globalAlpha = 0.28;
    if (p.status === "built") { const img = art.get(p.id); if (img) x.drawImage(img, r.x, r.y, r.w, r.h); }
    else { x.setLineDash([s, s]); x.lineWidth = 1; x.strokeStyle = "#141516"; x.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1); }
    x.globalAlpha = 1;
  }
  // the plot itself: a pixel hatch (every third diagonal tile) in its category colour, dashed ink edge
  const r = { x: ox + plot.x * s, y: oy + plot.y * s, w: plot.w * s, h: plot.h * s };
  x.fillStyle = cats[plot.category].color;
  x.globalAlpha = 0.3;
  for (let j = 0; j < plot.h; j++) for (let i = 0; i < plot.w; i++) if ((i + j) % 3 === 0) x.fillRect(r.x + i * s, r.y + j * s, s, s);
  x.globalAlpha = 1;
  x.setLineDash([Math.max(4, s * 2), Math.max(3, s * 1.5)]);
  x.lineWidth = 2;
  x.strokeStyle = "#141516";
  x.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  x.setLineDash([]);
}

function pill(x, l, t, w, h) {
  const r = h / 2;
  x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r);
  x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath();
}

function nextVersion(log) {
  const last = log[log.length - 1]?.version || "v0.0";
  const [maj, min] = last.replace("v", "").split(".").map(Number);
  return `v${maj}.${min + 1}`;
}
function short(a) { return a.length > 12 ? `${a.slice(0, 4)}...${a.slice(-4)}` : a; }
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
