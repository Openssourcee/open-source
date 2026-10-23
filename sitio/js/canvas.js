// The shared canvas. One tile = one pixel of a plot's art.
// Painted plots live in a small offscreen bitmap (cols x rows) scaled up with smoothing off;
// open plots are drawn on top as dashed, labelled frames. Two editing modes:
//   "choose": drag on empty space to mark out your own plot
//   "paint":  paint tiles inside one plot before sending it for review

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
export const PIXEL_CHARS = ".0123456789abcdefghijklmnopqrstuv"; // "." = transparent, then palette index 0-31

// Turn a pixel string into a small canvas, one canvas pixel per tile.
export function pixelsToCanvas(w, h, pixels, palette) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d");
  for (let i = 0; i < pixels.length; i++) {
    const k = PIXEL_CHARS.indexOf(pixels[i]) - 1;
    if (k < 0) continue;
    x.fillStyle = palette[k];
    x.fillRect(i % w, Math.floor(i / w), 1, 1);
  }
  return c;
}

export class World {
  constructor(canvas, { cols, rows, plots, categories }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.cols = cols;
    this.rows = rows;
    this.plots = plots;
    this.categories = categories;

    this.bitmap = document.createElement("canvas");
    this.bitmap.width = cols;
    this.bitmap.height = rows;
    this.bctx = this.bitmap.getContext("2d");

    this.scale = 6;
    this.ox = 0;
    this.oy = 0;
    this.hoverTile = null;
    this.hoverPlot = null;
    this.selected = null;
    this.mode = null;
    this.draft = null; // { rect, cells: [] of PIXEL_CHARS }
    this.paintIndex = 0;
    this.palette = [];
    this.sel = null;
    this.ghosts = [];
    this.canClaim = () => true;
    this.intro = new Map(); // plot id -> 0..1 reveal progress
    this.visible = true;
    this.listeners = {};
    this.pointers = new Map();
    this.needs = true;

    this.resize();
    new ResizeObserver(() => { this.resize(); }).observe(canvas);
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; if (this.visible) this.kick(); }).observe(canvas);
    document.addEventListener("visibilitychange", () => this.kick());
    this.bindInput();
    this.kick();
  }

  on(name, fn) { (this.listeners[name] ||= []).push(fn); }
  emit(name, data) { (this.listeners[name] || []).forEach((fn) => fn(data)); }

  // ---------- geometry ----------
  resize() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const firstSize = !this.w;
    const cx = this.w ? (this.w / 2 - this.ox) / this.scale : null;
    const cy = this.h ? (this.h / 2 - this.oy) / this.scale : null;
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.dpr = dpr;
    if (firstSize || this.homeOnResize) this.home(false);
    else { this.ox = this.w / 2 - cx * this.scale; this.oy = this.h / 2 - cy * this.scale; this.clamp(); }
    this.needs = true;
  }

  homeView() {
    // Wide screens: the whole world, edge to edge, like the full r/place board. Narrow screens: frame the genesis plot and its neighbours.
    if (this.w >= 900) {
      const s = Math.min(this.w / this.cols, (this.h - 24) / this.rows);
      return { s, cx: this.cols / 2, cy: this.rows / 2 - 12 / s };
    }
    const focus = { x: 88, y: 4, w: 112, h: 96 };
    const usableH = this.h - 110; // leave room for the palette bar
    const s = Math.min(this.w / focus.w, usableH / focus.h);
    return { s, cx: focus.x + focus.w / 2, cy: focus.y + focus.h / 2 + 52 / s };
  }

  home(animate = true) {
    const v = this.homeView();
    this.homeOnResize = true;
    this.flyTo(v.s, v.cx, v.cy, animate);
  }

  minScale() { return Math.min(this.w / this.cols, this.h / this.rows) * 0.9; }

  clamp() {
    const ww = this.cols * this.scale, wh = this.rows * this.scale;
    const m = 80; // keep at least this much of the world on screen
    this.ox = Math.min(this.w - m, Math.max(m - ww, this.ox));
    this.oy = Math.min(this.h - m, Math.max(m - wh, this.oy));
    if (ww <= this.w) this.ox = Math.min(Math.max(this.ox, Math.min(0, this.w - ww)), Math.max(0, this.w - ww));
    if (wh <= this.h) this.oy = Math.min(Math.max(this.oy, Math.min(0, this.h - wh)), Math.max(0, this.h - wh));
  }

  zoomAt(factor, px, py) {
    this.homeOnResize = false;
    const next = Math.min(48, Math.max(this.minScale(), this.scale * factor));
    const k = next / this.scale;
    this.ox = px - (px - this.ox) * k;
    this.oy = py - (py - this.oy) * k;
    this.scale = next;
    this.clamp();
    this.emit("view", this.view());
    this.needs = true;
    this.kick();
  }

  flyTo(s, cx, cy, animate = true) {
    const to = { s, ox: this.w / 2 - cx * s, oy: this.h / 2 - cy * s };
    if (!animate || reduceMotion.matches) {
      Object.assign(this, { scale: to.s, ox: to.ox, oy: to.oy });
      this.clamp();
      this.emit("view", this.view());
      this.needs = true;
      return Promise.resolve();
    }
    const from = { s: this.scale, ox: this.ox, oy: this.oy };
    const t0 = performance.now(), dur = 520;
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    return new Promise((done) => {
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur), e = ease(t);
        this.scale = from.s + (to.s - from.s) * e;
        this.ox = from.ox + (to.ox - from.ox) * e;
        this.oy = from.oy + (to.oy - from.oy) * e;
        this.needs = true;
        this.kick();
        if (t < 1) requestAnimationFrame(step);
        else { this.clamp(); this.emit("view", this.view()); done(); }
      };
      requestAnimationFrame(step);
    });
  }

  focusPlot(plot) {
    this.homeOnResize = false;
    const pad = this.w < 900 ? 1.25 : 2.2;
    const s = Math.min(36, Math.min(this.w / (plot.w * pad), (this.h - 140) / (plot.h * pad)));
    return this.flyTo(s, plot.x + plot.w / 2, plot.y + plot.h / 2 + 30 / s);
  }

  view() {
    return { scale: this.scale, zoom: this.scale / this.homeView().s };
  }

  tileAt(px, py) {
    const x = Math.floor((px - this.ox) / this.scale);
    const y = Math.floor((py - this.oy) / this.scale);
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return null;
    return { x, y };
  }

  plotAt(tile) {
    if (!tile) return null;
    return this.plots.find((p) => tile.x >= p.x && tile.x < p.x + p.w && tile.y >= p.y && tile.y < p.y + p.h) || null;
  }

  ghostAt(tile) {
    return this.ghosts.find(({ rect: p }) => tile.x >= p.x && tile.x < p.x + p.w && tile.y >= p.y && tile.y < p.y + p.h) || null;
  }

  plotRect(p) {
    return { x: this.ox + p.x * this.scale, y: this.oy + p.y * this.scale, w: p.w * this.scale, h: p.h * this.scale };
  }

  // ---------- painting ----------
  paintImage(plot, img, animate) {
    const c = document.createElement("canvas");
    c.width = plot.w; c.height = plot.h;
    const cx = c.getContext("2d");
    cx.drawImage(img, 0, 0, plot.w, plot.h);
    const data = cx.getImageData(0, 0, plot.w, plot.h).data;
    if (!animate || reduceMotion.matches) {
      this.bctx.drawImage(c, plot.x, plot.y);
      this.intro.set(plot.id, 1);
      this.needs = true;
      return;
    }
    // Timelapse: pixels land in a rough upward wave, the way a canvas fills when many hands paint at once.
    const px = [];
    for (let y = 0; y < plot.h; y++) for (let x = 0; x < plot.w; x++) {
      const i = (y * plot.w + x) * 4;
      if (data[i + 3] < 8) continue;
      px.push({ x, y, k: (plot.h - y) * 0.55 + Math.random() * 22, c: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})` });
    }
    px.sort((a, b) => a.k - b.k);
    const t0 = performance.now(), dur = 1500;
    let done = 0;
    this.intro.set(plot.id, 0);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const target = Math.floor(px.length * (1 - Math.pow(1 - t, 2)));
      for (; done < target; done++) {
        const p = px[done];
        this.bctx.fillStyle = p.c;
        this.bctx.fillRect(plot.x + p.x, plot.y + p.y, 1, 1);
      }
      this.intro.set(plot.id, t);
      this.needs = true;
      this.kick();
      if (t < 1) requestAnimationFrame(step);
      else this.bctx.drawImage(c, plot.x, plot.y);
    };
    requestAnimationFrame(step);
  }

  // ---------- modes ----------
  setMode(mode) {
    this.mode = mode;
    if (mode !== "paint") this.draft = null;
    if (mode !== "choose") this.sel = null;
    this.canvas.classList.toggle("editing", !!mode);
    this.needs = true;
    this.kick();
    this.emit("mode", mode);
  }

  startPaint(rect) {
    this.draft = { rect, cells: Array(rect.w * rect.h).fill(".") };
    this.setMode("paint");
    this.emit("draft", 0);
  }

  draftPixels() { return this.draft ? this.draft.cells.join("") : ""; }
  draftCount() { return this.draft ? this.draft.cells.filter((c) => c !== ".").length : 0; }

  clearDraft() {
    if (!this.draft) return;
    this.draft.cells.fill(".");
    this.needs = true; this.kick();
    this.emit("draft", 0);
  }

  paintTile(tile) {
    const d = this.draft;
    if (!d || !tile) return;
    const { rect } = d;
    if (tile.x < rect.x || tile.y < rect.y || tile.x >= rect.x + rect.w || tile.y >= rect.y + rect.h) return;
    const i = (tile.y - rect.y) * rect.w + (tile.x - rect.x);
    const ch = this.paintIndex < 0 ? "." : PIXEL_CHARS[this.paintIndex + 1];
    if (d.cells[i] === ch) return;
    d.cells[i] = ch;
    if (ch !== "." && !reduceMotion.matches) (this.pops ||= []).push({ x: tile.x, y: tile.y, color: this.palette[this.paintIndex], t0: performance.now() });
    this.needs = true; this.kick();
    this.emit("draft", this.draftCount());
  }

  addGhost(rect, pixels) {
    this.ghosts.push({ rect, img: pixelsToCanvas(rect.w, rect.h, pixels, this.palette) });
    this.needs = true; this.kick();
  }

  selRect() {
    if (!this.sel) return null;
    const x = Math.min(this.sel.a.x, this.sel.b.x), y = Math.min(this.sel.a.y, this.sel.b.y);
    return { x, y, w: Math.abs(this.sel.a.x - this.sel.b.x) + 1, h: Math.abs(this.sel.a.y - this.sel.b.y) + 1 };
  }

  // ---------- render loop ----------
  kick() {
    if (this.raf) return;
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  frame(t) {
    this.raf = null;
    const openPlots = this.plots.some((p) => p.status !== "built") || !!this.mode;
    const ants = openPlots && !reduceMotion.matches && this.visible && !document.hidden;
    const popping = this.pops?.length > 0;
    if (this.needs || ants || popping) this.draw(t);
    this.needs = false;
    if (ants || popping) this.kick();
  }

  draw(t) {
    const { ctx, scale: s } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    const ww = this.cols * s, wh = this.rows * s;
    // the stage is all canvas: no grey bands around the board, the grid simply keeps going
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, this.w, this.h);

    // the 1-tile grid, only when tiles are big enough to read
    if (s >= 4) {
      ctx.strokeStyle = s >= 14 ? "rgba(20,21,22,0.09)" : s >= 7 ? "rgba(20,21,22,0.055)" : "rgba(20,21,22,0.035)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const x0 = Math.floor(-this.ox / s), x1 = Math.ceil((this.w - this.ox) / s);
      const y0 = Math.floor(-this.oy / s), y1 = Math.ceil((this.h - this.oy) / s);
      for (let x = x0; x <= x1; x++) { const X = Math.round(this.ox + x * s) + 0.5; ctx.moveTo(X, 0); ctx.lineTo(X, this.h); }
      for (let y = y0; y <= y1; y++) { const Y = Math.round(this.oy + y * s) + 0.5; ctx.moveTo(0, Y); ctx.lineTo(this.w, Y); }
      ctx.stroke();
    }
    // tiles outside the board are a shade darker so the edge is findable without a hard border
    ctx.fillStyle = "rgba(20,21,22,0.035)";
    ctx.fillRect(0, 0, this.w, Math.max(0, this.oy));
    ctx.fillRect(0, this.oy + wh, this.w, Math.max(0, this.h - this.oy - wh));
    ctx.fillRect(0, Math.max(0, this.oy), Math.max(0, this.ox), wh);
    ctx.fillRect(this.ox + ww, Math.max(0, this.oy), Math.max(0, this.w - this.ox - ww), wh);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.bitmap, this.ox, this.oy, ww, wh);

    // open plots: hatched in their category colour, dashed edge that keeps moving while the plot waits
    const dash = Math.max(3, Math.min(8, s * 0.9));
    const dr = this.draft?.rect;
    for (const p of this.plots) {
      if (p.status === "built") continue;
      if (dr && dr.x === p.x && dr.y === p.y && dr.w === p.w && dr.h === p.h) continue; // being painted right now
      const r = this.plotRect(p);
      if (r.x > this.w || r.y > this.h || r.x + r.w < 0 || r.y + r.h < 0) continue;
      const color = this.categories[p.category]?.color || "#141516";
      const hot = this.hoverPlot === p || this.selected === p;
      ctx.save();
      ctx.beginPath();
      ctx.rect(r.x, r.y, r.w, r.h);
      ctx.clip();
      ctx.globalAlpha = hot ? 0.26 : 0.14;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, s * 0.45);
      ctx.beginPath();
      const step = Math.max(8, s * 2.2);
      for (let d = -r.h; d < r.w; d += step) { ctx.moveTo(r.x + d, r.y + r.h); ctx.lineTo(r.x + d + r.h, r.y); }
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.lineWidth = hot ? 3 : 2;
      ctx.strokeStyle = hot ? color : "#141516";
      ctx.setLineDash([dash, dash * 0.75]);
      ctx.lineDashOffset = reduceMotion.matches ? 0 : -(t || 0) / 70;
      ctx.strokeRect(Math.round(r.x) + 1, Math.round(r.y) + 1, Math.round(r.w) - 2, Math.round(r.h) - 2);
      ctx.restore();

      this.tag(r, this.categories[p.category]?.label || "Open", color);
    }

    // painted plots get a quiet label with their author when zoomed in enough
    for (const p of this.plots) {
      if (p.status !== "built" || (this.intro.get(p.id) ?? 1) < 1) continue;
      const r = this.plotRect(p);
      if (this.hoverPlot === p || this.selected === p) {
        ctx.strokeStyle = "#141516"; ctx.lineWidth = 3; ctx.setLineDash([]);
        ctx.strokeRect(r.x - 1.5, r.y - 1.5, r.w + 3, r.h + 3);
        this.tag({ x: r.x, y: r.y - 26, w: r.w, h: 0 }, `@${p.author}`, "#141516", true);
      }
    }

    // contributions this visitor sent that are still waiting for review
    for (const g of this.ghosts) {
      const r = this.plotRect(g.rect);
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.drawImage(g.img, r.x, r.y, r.w, r.h);
      ctx.restore();
      ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.strokeStyle = "#141516";
      ctx.strokeRect(Math.round(r.x) + 1, Math.round(r.y) + 1, Math.round(r.w) - 2, Math.round(r.h) - 2);
      ctx.setLineDash([]);
      this.tag(r, "in review", "#FFA800");
    }

    // choose mode: the rectangle being dragged out
    const sr = this.selRect();
    if (sr) {
      const r = this.plotRect(sr);
      const ok = this.canClaim(sr);
      ctx.fillStyle = ok ? "rgba(255,214,53,0.28)" : "rgba(190,0,57,0.16)";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.strokeStyle = ok ? "#141516" : "#BE0039";
      ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      ctx.setLineDash([]);
      this.tag({ x: r.x, y: r.y - 26, w: 200, h: 0 }, ok ? `${sr.w}×${sr.h}` : "taken or too big", ok ? "#FFD635" : "#BE0039", true);
    }

    // paint mode: everything else steps back, the draft sits on top
    if (this.draft) {
      const { rect, cells } = this.draft;
      const r = this.plotRect(rect);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(0, 0, this.w, Math.max(0, r.y));
      ctx.fillRect(0, r.y + r.h, this.w, Math.max(0, this.h - r.y - r.h));
      ctx.fillRect(0, r.y, Math.max(0, r.x), r.h);
      ctx.fillRect(r.x + r.w, r.y, Math.max(0, this.w - r.x - r.w), r.h);
      for (let i = 0; i < cells.length; i++) {
        const k = PIXEL_CHARS.indexOf(cells[i]) - 1;
        if (k < 0) continue;
        ctx.fillStyle = this.palette[k];
        ctx.fillRect(Math.floor(r.x + (i % rect.w) * s), Math.floor(r.y + Math.floor(i / rect.w) * s), Math.ceil(s), Math.ceil(s));
      }
      ctx.lineWidth = 3; ctx.strokeStyle = "#141516";
      ctx.strokeRect(r.x - 1.5, r.y - 1.5, r.w + 3, r.h + 3);
    }

    // freshly placed pixels: a ring that opens out and fades, 420ms
    if (this.pops?.length) {
      const now = performance.now();
      this.pops = this.pops.filter((p) => now - p.t0 < 420);
      for (const p of this.pops) {
        const k = (now - p.t0) / 420, e = 1 - Math.pow(1 - k, 3);
        const cx = this.ox + (p.x + 0.5) * s, cy = this.oy + (p.y + 0.5) * s;
        const size = s * (1 + e * 2.6) + 6 * e;
        ctx.save();
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = p.color === "#FFFFFF" ? "#141516" : p.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
        ctx.restore();
      }
    }

    // the painting reticle
    const d = this.draft, ht = this.hoverTile;
    if (d && ht && ht.x >= d.rect.x && ht.y >= d.rect.y && ht.x < d.rect.x + d.rect.w && ht.y < d.rect.y + d.rect.h) {
      const x = this.ox + ht.x * s, y = this.oy + ht.y * s;
      ctx.fillStyle = this.paintIndex < 0 ? "#ffffff" : this.palette[this.paintIndex];
      ctx.globalAlpha = 0.6;
      ctx.fillRect(x, y, s, s);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#141516";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(x - 2, y - 2, s + 4, s + 4);
    }
  }

  tag(r, text, color, solid = false) {
    const { ctx } = this;
    ctx.font = "600 11px 'Martian Mono', ui-monospace, monospace";
    const h = 20, pad = 7;
    let sq = 8;
    const tw = ctx.measureText(text).width;
    let w = tw + pad * 2 + sq + 6;
    let x = Math.round(r.x + 6), y = Math.round(r.y + 6);
    // never drop the unit: lose the colour square first, then hang the tag above the plot
    if (!solid && w > r.w - 10) { sq = 0; w = tw + pad * 2; }
    if (!solid && w > r.w - 10) { x = Math.round(r.x); y = Math.round(r.y - h - 4); }
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(20,21,22,0.14)";
    roundRect(ctx, x, y + 1.5, w, h, 10); ctx.fill();
    ctx.fillStyle = solid ? "#141516" : "#ffffff";
    roundRect(ctx, x, y, w, h, 10); ctx.fill();
    if (sq) {
      ctx.fillStyle = solid ? "#ffd635" : color;
      ctx.fillRect(x + pad, y + (h - sq) / 2, sq, sq);
    }
    ctx.fillStyle = solid ? "#ffffff" : "#141516";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + pad + (sq ? sq + 6 : 0), y + h / 2 + 0.5);
  }

  // ---------- input ----------
  bindInput() {
    const c = this.canvas;
    const pos = (e) => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

    c.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const p = pos(e);
      this.pointers.set(e.pointerId, p);
      if (this.pointers.size === 1) {
        this.gesture = { start: p, last: p, moved: false, id: e.pointerId };
        const tile = this.tileAt(p.x, p.y);
        const r = this.draft?.rect;
        if (this.mode === "paint" && tile && r && tile.x >= r.x && tile.y >= r.y && tile.x < r.x + r.w && tile.y < r.y + r.h) {
          this.gesture.painting = true;
          c.setPointerCapture?.(e.pointerId);
          this.paintTile(tile);
        } else if (this.mode === "choose" && tile && !this.plotAt(tile) && !this.ghostAt(tile)) {
          this.gesture.selecting = true;
          c.setPointerCapture?.(e.pointerId);
          this.sel = { a: tile, b: tile };
          this.needs = true; this.kick();
        }
      }
      else if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
        if (this.gesture) { this.gesture.moved = true; this.gesture.painting = false; this.gesture.selecting = false; this.sel = null; }
      }
    });

    c.addEventListener("pointermove", (e) => {
      const p = pos(e);
      if (e.pointerType === "mouse" && !this.pointers.size) {
        const tile = this.tileAt(p.x, p.y);
        const plot = this.plotAt(tile);
        if (tile?.x !== this.hoverTile?.x || tile?.y !== this.hoverTile?.y || plot !== this.hoverPlot) {
          this.hoverTile = tile; this.hoverPlot = plot; this.needs = true; this.kick();
          this.emit("hover", tile);
          c.style.cursor = this.mode === "paint" ? "crosshair" : plot ? "pointer" : this.mode === "choose" ? "cell" : "";
        }
      }
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, p);
      if (this.pointers.size === 2 && this.pinch) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        this.ox += mid.x - this.pinch.mid.x; this.oy += mid.y - this.pinch.mid.y;
        this.zoomAt(d / this.pinch.d, mid.x, mid.y);
        this.pinch = { d, mid };
        return;
      }
      const g = this.gesture;
      if (!g || g.id !== e.pointerId) return;
      if (g.painting) { this.hoverTile = this.tileAt(p.x, p.y); this.paintTile(this.hoverTile); return; }
      if (g.selecting) {
        const t = this.tileAt(p.x, p.y);
        if (t) { this.sel.b = t; this.needs = true; this.kick(); }
        if (Math.hypot(p.x - g.start.x, p.y - g.start.y) > 5) g.moved = true;
        return;
      }
      if (!g.moved && Math.hypot(p.x - g.start.x, p.y - g.start.y) > 5) {
        g.moved = true;
        c.setPointerCapture?.(e.pointerId);
        c.classList.add("dragging");
        this.homeOnResize = false;
      }
      if (g.moved) {
        this.ox += p.x - g.last.x; this.oy += p.y - g.last.y;
        this.clamp(); this.needs = true; this.kick();
      }
      g.last = p;
    });

    const end = (e) => {
      const g = this.gesture;
      const wasTap = g && g.id === e.pointerId && !g.moved && e.type === "pointerup";
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = null;
      if (!this.pointers.size) { this.gesture = null; c.classList.remove("dragging"); }
      if (g?.selecting && g.id === e.pointerId) {
        const r = this.selRect();
        if (g.moved && r) this.emit("select", r);
        else { this.sel = null; this.needs = true; this.kick(); }
        if (!g.moved) { const p = pos(e); const tile = this.tileAt(p.x, p.y); this.emit("tap", { tile, plot: this.plotAt(tile) }); }
        return;
      }
      if (g?.painting) return;
      if (wasTap) {
        const p = pos(e);
        const tile = this.tileAt(p.x, p.y);
        this.emit("tap", { tile, plot: this.plotAt(tile) });
      }
      if (g?.moved) this.emit("view", this.view());
    };
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", end);
    c.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse" && !this.pointers.size) { this.hoverTile = null; this.hoverPlot = null; this.needs = true; this.kick(); }
    });

    // Plain wheel scrolls the page. Pinch on a trackpad (ctrl+wheel) and the wheel in explore mode zoom.
    c.addEventListener("wheel", (e) => {
      if (!e.ctrlKey && !this.exploring) return;
      e.preventDefault();
      const p = pos(e);
      this.zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)), p.x, p.y);
    }, { passive: false });

    c.addEventListener("keydown", (e) => {
      const stepPx = 60;
      const map = { ArrowLeft: [stepPx, 0], ArrowRight: [-stepPx, 0], ArrowUp: [0, stepPx], ArrowDown: [0, -stepPx] };
      if (map[e.key]) {
        e.preventDefault();
        this.homeOnResize = false;
        this.ox += map[e.key][0]; this.oy += map[e.key][1];
        this.clamp(); this.needs = true; this.kick();
      } else if (e.key === "+" || e.key === "=") { this.zoomAt(1.25, this.w / 2, this.h / 2); this.kick(); }
      else if (e.key === "-" || e.key === "_") { this.zoomAt(0.8, this.w / 2, this.h / 2); this.kick(); }
    });
  }
}



function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
