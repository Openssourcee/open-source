// Shared drawing helpers for the $OS profile picture, banner and video.
// Same palette, pixel logo and plot style as the website.

export const C = {
  ink: "#000000", ink2: "#515252", ink3: "#898D90", line: "#D4D7D9",
  grid: "#EEF0F1", ground: "#FFFFFF", ground2: "#F6F7F8",
  yellow: "#FFD635", pale: "#FFF8B8",
  blue: "#3690EA", pink: "#FF3881", green: "#00A368", green2: "#00CC78", orange: "#FFA800",
  red: "#FF4500", wine: "#BE0039", navy: "#2450A4", sky: "#51E9F4", lilac: "#94B3FF",
  teal: "#00756F", lime: "#7EED56", rose: "#FF99AA", peach: "#FFB470", brown: "#6D482F",
};

export const CAT = { code: C.blue, art: C.pink, game: C.green, words: C.orange };

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const P = (t, a, d) => clamp((t - a) / d);
export const eo = (x) => 1 - Math.pow(1 - x, 4);
export const eio = (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2);
export const back = (x) => { const c1 = 1.3, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// The fork logo: three branches (commit rings) merge into one handle. 20 x 36 tiles.
export function logoTiles(merge = C.yellow) {
  const T = new Map();
  const put = (x, y, c) => T.set(`${x},${y}`, [x, y, c]);
  [[0, C.blue], [7, C.green2], [14, C.pink]].forEach(([nx, col]) => {
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) {
      const corner = (x === 0 || x === 5) && (y === 0 || y === 5);
      const inner = x >= 2 && x <= 3 && y >= 2 && y <= 3;
      if (!corner && !inner) put(nx + x, y, col);
    }
    for (let y = 6; y < 16; y++) { put(nx + 2, y, col); put(nx + 3, y, col); }
  });
  [[1, 18], [1, 18], [2, 17], [4, 15]].forEach(([x0, x1], i) => { for (let x = x0; x <= x1; x++) put(x, 16 + i, C.ink); });
  for (let y = 16; y < 18; y++) { put(9, y, merge); put(10, y, merge); }
  for (let y = 20; y < 23; y++) for (let x = 7; x < 13; x++) put(x, y, C.ink);
  for (let y = 23; y < 35; y++) { for (let x = 8; x < 12; x++) put(x, y, C.ink); put(8, y, C.ink2); }
  put(9, 35, C.ink); put(10, 35, C.ink);
  return [...T.values()];
}

export function drawTiles(g, tiles, ox, oy, s, shown = tiles.length) {
  for (let i = 0; i < shown && i < tiles.length; i++) {
    const [x, y, c] = tiles[i];
    g.fillStyle = c;
    g.fillRect(Math.round(ox + x * s), Math.round(oy + y * s), Math.ceil(s), Math.ceil(s));
  }
}

// Sprites: one character per tile, mapped to a colour.
export const SPRITES = {
  heart: [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."],
  lt: ["..#", ".#.", "#..", ".#.", "..#"],
  sl: ["..#", "..#", ".#.", "#..", "#.."],
  gt: ["#..", ".#.", "..#", ".#.", "#.."],
  coin: ["..####..", ".#yyyy#.", "#yyhyyy#", "#yhyyyy#", "#yyyyyy#", "#yyyyyy#", ".#yyyy#.", "..####.."],
  lock: ["..###..", ".#...#.", ".#...#.", "#######", "#yyyyy#", "#yy#yy#", "#yy#yy#", "#yyyyy#", "#######"],
  heartIcon: [".##.##.", "#pp#pp#", "#ppppp#", ".#ppp#.", "..#p#..", "...#..."],
  bot: [
    ".....r.....",
    ".....#.....",
    ".#########.",
    ".#bbbbbbb#.",
    ".#bwwbwwb#.",
    ".#bwkbwkb#.",
    ".#bbbbbbb#.",
    ".#bb###bb#.",
    ".#########.",
    "..#.....#..",
  ],
  cursor: [
    "#.........",
    "##........",
    "#w#.......",
    "#ww#......",
    "#www#.....",
    "#wwww#....",
    "#wwwww#...",
    "#wwwwww#..",
    "#wwwwwww#.",
    "#wwww####.",
    "#w#ww#....",
    "##.#ww#...",
    "#..#ww#...",
    "....##....",
  ],
  tick: ["......#", ".....##", "#...##.", "##.##..", ".###...", "..#...."],
};

export function drawSprite(g, rows, ox, oy, s, colors) {
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      g.fillStyle = colors[ch] || C.ink;
      g.fillRect(Math.round(ox + x * s), Math.round(oy + y * s), Math.ceil(s), Math.ceil(s));
    });
  });
}

// What a painted community plot looks like, as a list of [x, y, colour] tiles.
export function plotArt(kind, w, h) {
  const grid = Array.from({ length: h }, () => Array(w).fill(null));
  const fill = (c) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) grid[y][x] = c; };
  const stamp = (rows, ox, oy, col) => rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch !== "." && grid[oy + y] && ox + x < w && ox + x >= 0) grid[oy + y][ox + x] = typeof col === "function" ? col(ch) : col;
  }));
  const fit = (sw, sh) => Math.max(1, Math.floor(Math.min((w - 2) / sw, (h - 2) / sh)));
  const scaled = (rows, k) => rows.flatMap((r) => Array(k).fill([...r].map((ch) => ch.repeat(k)).join("")));
  if (kind === "heart") {
    fill(C.rose);
    const k = fit(7, 6), rows = scaled(SPRITES.heart, k);
    stamp(rows, Math.floor((w - 7 * k) / 2), Math.floor((h - 6 * k) / 2), C.wine);
  } else if (kind === "code") {
    fill(C.navy);
    const glyph = SPRITES.lt.map((r, i) => r + "." + SPRITES.sl[i] + "." + SPRITES.gt[i]);
    const k = fit(11, 5), rows = scaled(glyph, k);
    stamp(rows, Math.floor((w - 11 * k) / 2), Math.floor((h - 5 * k) / 2), C.sky);
  } else if (kind === "snake") {
    fill(C.teal);
    // a two-tile-thick snake winding back and forth, head up, apple waiting
    const path = [];
    let x = 2, y = h - 4;
    const L = w - 9;
    const moves = [[1, 0, L], [0, -1, 4], [-1, 0, L - 6], [0, -1, 4], [1, 0, 6]];
    path.push([x, y]);
    for (const [dx, dy, n] of moves) for (let i = 0; i < n; i++) { x += dx; y += dy; path.push([x, y]); }
    path.forEach(([px, py]) => {
      for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (grid[py + oy] && px + ox < w && py + oy >= 0) grid[py + oy][px + ox] = C.lime;
    });
    const [hx, hy] = path[path.length - 1];
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([ox, oy]) => { if (grid[hy + oy]) grid[hy + oy][hx + ox] = C.green2; });
    if (grid[hy]) grid[hy][hx + 1] = C.ink;
    const ax = Math.min(w - 3, hx + 6), ay = hy;
    for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (grid[ay + oy] && ax + ox < w) grid[ay + oy][ax + ox] = C.red;
  } else if (kind === "lore") {
    fill(C.pale);
    const r = rng(w * 31 + h);
    for (let y = 2, line = 0; y < h - 1; y += 2, line++) {
      const len = line === 0 ? Math.floor(w * 0.45) : Math.floor((w - 4) * (0.55 + r() * 0.45));
      for (let x = 2; x < 2 + len && x < w - 2; x++) grid[y][x] = line === 0 ? C.orange : C.brown;
    }
  } else if (kind === "sun") {
    fill(C.sky);
    const cx = (w - 1) / 2, cy = (h - 1) / 2, rad = Math.min(w, h) / 2 - 1.5;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= rad) grid[y][x] = C.yellow;
      else if (d <= rad + 1) grid[y][x] = C.orange;
    }
    const ex = Math.round(rad * 0.4), ey = Math.round(cy - rad * 0.25);
    [Math.round(cx - ex), Math.round(cx + ex)].forEach((x) => { grid[ey][x] = C.ink; grid[ey + 1] && (grid[ey + 1][x] = C.ink); });
    const my = Math.round(cy + rad * 0.35);
    for (let x = Math.round(cx - ex); x <= Math.round(cx + ex); x++) grid[my][x] = C.ink;
    grid[my - 1][Math.round(cx - ex) - 1] = C.ink; grid[my - 1][Math.round(cx + ex) + 1] = C.ink;
  }
  const out = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (grid[y][x]) out.push([x, y, grid[y][x]]);
  return out;
}

// Shuffle tiles so they "paint in" like many hands at once, roughly left to right.
export function paintOrder(tiles, seed = 7) {
  const r = rng(seed);
  const maxX = Math.max(...tiles.map((t) => t[0])) || 1;
  return tiles.map((t) => [t, t[0] / maxX * 0.6 + r() * 0.4]).sort((a, b) => a[1] - b[1]).map((p) => p[0]);
}

export function grid(g, w, h, step, color = C.grid, offY = 0) {
  g.fillStyle = color;
  for (let x = 0; x <= w; x += step) g.fillRect(Math.round(x), 0, 1, h);
  for (let y = -step + (offY % step); y <= h; y += step) g.fillRect(0, Math.round(y), w, 1);
}

// The open-plot border: marching ants, like the site.
export function ants(g, x, y, w, h, offset = 0, width = 3, dash = 10) {
  g.save();
  g.strokeStyle = C.ink;
  g.lineWidth = width;
  g.setLineDash([dash, dash * 0.7]);
  g.lineDashOffset = -offset;
  g.strokeRect(x + width / 2, y + width / 2, w - width, h - width);
  g.restore();
}

// The little category tag that hangs above a plot.
export function tag(g, x, y, label, color, size = 15) {
  g.save();
  g.font = `600 ${size}px "Familjen Grotesk"`;
  const pad = size * 0.55, sq = size * 0.6;
  const tw = g.measureText(label).width;
  const w = pad + sq + size * 0.4 + tw + pad, h = size * 1.75;
  g.fillStyle = C.ground;
  g.strokeStyle = C.ink;
  g.lineWidth = Math.max(1.5, size / 9);
  g.beginPath(); g.roundRect(x, y - h, w, h, size * 0.35); g.fill(); g.stroke();
  g.fillStyle = color;
  g.fillRect(x + pad, y - h / 2 - sq / 2, sq, sq);
  g.fillStyle = C.ink;
  g.textBaseline = "middle";
  g.textAlign = "left";
  g.fillText(label, x + pad + sq + size * 0.4, y - h / 2 + 1);
  g.restore();
  return w;
}

export async function loadFonts() {
  await Promise.all([
    '400 120px "Jersey 10"', '400 40px "Familjen Grotesk"', '600 40px "Familjen Grotesk"', '700 40px "Familjen Grotesk"',
    '400 24px "Martian Mono"', '600 24px "Martian Mono"',
  ].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  return document.fonts.check('120px "Jersey 10"') && document.fonts.check('40px "Martian Mono"');
}

export async function loadGenesis(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  const tiles = [];
  for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) {
    const i = (y * c.width + xx) * 4;
    if (d[i + 3] < 128) continue;
    tiles.push([xx, y, `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`]);
  }
  return { tiles, w: c.width, h: c.height };
}
