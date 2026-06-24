#!/usr/bin/env python3
# Fully self-contained: reads the raw Washington Square Arch photo (which lives
# outside the project dir, so it survives the workspace wipes), builds the blue
# dot-halftone grid with the dotify tone algorithm, and writes the three
# interactive variants. Re-run any time: python3 build_washington.py
from PIL import Image, ImageOps, ImageFilter
import base64, math

SRC_PHOTO = "/Users/first/Downloads/MICLEA/NYCCCC/washington square arch.jpg"
PREFIX    = "washington"
TITLE     = "Washington Square Arch"

# ---- halftone tone curve (tuned to match the pasted reference) -------------
OUT_W   = 1500
CELL    = 9
DOT_MAX = 4.6
INK     = "rgb(160,154,255)"     # render colour (light blue, matches the set)
LOW_PT, HIGH_PT, GAMMA = 0.20, 0.80, 0.95   # dark->ink; bright arch/sky stay white

src = Image.open(SRC_PHOTO).convert("RGB")
aspect = src.height / src.width
OUT_H  = int(round(OUT_W * aspect))
W, H   = OUT_W, OUT_H
gray = ImageOps.grayscale(src).resize((W, H), Image.LANCZOS)
gray = gray.filter(ImageFilter.GaussianBlur(radius=0.5))
px   = gray.load()

def amount(lum):
    d = 1.0 - lum / 255.0
    if   d <= LOW_PT: d = 0.0
    elif d >= HIGH_PT: d = 1.0
    else: d = (d - LOW_PT) / (HIGH_PT - LOW_PT)
    d = d ** GAMMA
    return 0.0 if d < 0 else (1.0 if d > 1 else d)

cols, rows = W // CELL, H // CELL
buf = bytearray()
for j in range(rows):
    cy = min(j * CELL + CELL // 2, H - 1)
    for i in range(cols):
        cx = min(i * CELL + CELL // 2, W - 1)
        # average the cell for a clean tone, then map to ink amount
        s = 0
        for yy in range(j*CELL, min(j*CELL+CELL, H)):
            for xx in range(i*CELL, min(i*CELL+CELL, W)):
                s += px[xx, yy]
        lum = s / (CELL * CELL)
        buf.append(int(round(amount(lum) * 255)))

B64 = base64.b64encode(bytes(buf)).decode("ascii")
print("grid:", cols, "x", rows, "=", cols*rows, "| size", W, "x", H, "| b64", len(B64))

# ===========================================================================
HEAD = r'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__</title>
<style>
  :root { --paper: #ffffff; }
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { height:100%; }
  body {
    background: var(--paper);
    display:flex; align-items:center; justify-content:center;
    overflow:hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  #stage { position:relative; width:100vw; height:100vh; cursor:crosshair; }
  canvas { display:block; width:100%; height:100%; }
</style>
</head>
<body>
  <div id="stage">
    <canvas id="c"></canvas>
  </div>
<script>
const META = {cols:__COLS__, rows:__ROWS__, cell:__CELL__, dotMax:__DOTMAX__, outW:__OUTW__, outH:__OUTH__};
const B64 = "__B64__";

const bin = atob(B64);
const N = bin.length;
const amp = new Float32Array(N);
for (let i = 0; i < N; i++) amp[i] = bin.charCodeAt(i) / 255;
'''

CANVAS_LAYOUT = r'''
const stage = document.getElementById('stage');
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const INK = '__INK__';
let DPR = 1, scale = 1, offX = 0, offY = 0;

function layout() {
  const rect = stage.getBoundingClientRect();
  DPR = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * DPR);
  canvas.height = Math.round(rect.height * DPR);
  scale = Math.min(rect.width / META.outW, rect.height / META.outH);
  offX = (rect.width - META.outW * scale) / 2;
  offY = (rect.height - META.outH * scale) / 2;
  draw();
}

let mx = -1e6, my = -1e6;
let cx = -1e6, cy = -1e6;
let energy = 0, energyTarget = 0;
let lastMove = -1e9;
let running = false;

function toWorld(clientX, clientY) {
  const rect = stage.getBoundingClientRect();
  return [ (clientX - rect.left - offX) / scale, (clientY - rect.top - offY) / scale ];
}
function moved(e) {
  [mx, my] = toWorld(e.clientX, e.clientY);
  if (cx < -1e5) { cx = mx; cy = my; }
  lastMove = performance.now();
  energyTarget = 1; ensureRunning();
}
stage.addEventListener('pointermove', moved);
stage.addEventListener('pointerenter', moved);
stage.addEventListener('pointerleave', () => { energyTarget = 0; ensureRunning(); });

const TAU     = 6.28318530718;
const RADIUS  = 170;
const SWELL   = 4.2;
const DOT_MIN = 0.7;
const IDLE_MS = 180;
const INV_S2  = 1 / (RADIUS * RADIUS * 0.20);
'''

TICK = r'''
function tick() {
  if (performance.now() - lastMove > IDLE_MS) energyTarget = 0;
  energy += (energyTarget - energy) * 0.09;
  cx += (mx - cx) * 0.08;
  cy += (my - cy) * 0.08;
  draw();
  const busy = energy > 0.003 || Math.abs(energyTarget - energy) > 0.002;
  if (busy) { requestAnimationFrame(tick); }
  else { running = false; energy = 0; draw(); }
}
function ensureRunning() { if (!running) { running = true; requestAnimationFrame(tick); } }

window.addEventListener('resize', layout);
layout();
</script>
</body>
</html>'''

SIMPLE_PRECOMPUTE = r'''
const FLOOR = 0.04;
const xs = [], ys = [], as = [];
for (let r = 0; r < META.rows; r++) {
  for (let cI = 0; cI < META.cols; cI++) {
    const a = amp[r * META.cols + cI];
    if (a < FLOOR) continue;
    xs.push(cI * META.cell + META.cell / 2);
    ys.push(r * META.cell + META.cell / 2);
    as.push(a);
  }
}
const M = xs.length;
const wx = Float32Array.from(xs), wy = Float32Array.from(ys), wa = Float32Array.from(as);
'''

SIMPLE_DRAW = r'''
function draw() {
  const w = canvas.width, h = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const s = scale * DPR, ox = offX * DPR, oy = offY * DPR;
  const dmax = META.dotMax;
  const e = energy;
  const active = e > 0.003;
  const R2 = RADIUS * RADIUS;

  ctx.globalAlpha = 1;
  ctx.fillStyle = INK;
  ctx.beginPath();
  for (let i = 0; i < M; i++) {
    let r = wa[i] * dmax;
    if (active) {
      const dx = wx[i] - cx, dy = wy[i] - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < R2) { const f = Math.exp(-d2 * INV_S2); r += f * SWELL * e; }
    }
    if (r < DOT_MIN) continue;
    const px = wx[i] * s + ox, py = wy[i] * s + oy, pr = r * s;
__DOTDRAW__
  }
  ctx.fill();
}
'''

UNEVEN_PRECOMPUTE = r'''
const FLOOR      = 0.04;
const EDGE_MIN   = 0.06;
const EDGE_BLOOM = 0.70;
const K          = 2;
function ampAt(r, c){ if (r<0||c<0||r>=META.rows||c>=META.cols) return 0; return amp[r*META.cols+c]; }
function h01(n){ const x = Math.sin(n*12.9898 + 7.13) * 43758.5453; return x - Math.floor(x); }

const xs = [], ys = [], as = [], bs = [], fws = [], fhs = [];
for (let r = 0; r < META.rows; r++) {
  for (let cI = 0; cI < META.cols; cI++) {
    const a = amp[r * META.cols + cI];
    let baseAmp, bloom;
    if (a >= FLOOR) {
      baseAmp = a; bloom = 1.0;
    } else {
      let best = 0;
      for (let dr = -K; dr <= K; dr++)
        for (let dc = -K; dc <= K; dc++) {
          if (!dr && !dc) continue;
          if (ampAt(r+dr, cI+dc) >= FLOOR) {
            const w = 1 - Math.sqrt(dr*dr + dc*dc) / (K + 1);
            if (w > best) best = w;
          }
        }
      if (best <= EDGE_MIN) continue;
      baseAmp = 0; bloom = best * EDGE_BLOOM;
    }
    xs.push(cI * META.cell + META.cell / 2);
    ys.push(r * META.cell + META.cell / 2);
    as.push(baseAmp); bs.push(bloom);
    const seed = r * META.cols + cI;
    fws.push(1 + (h01(seed*2)     - 0.5) * 0.85);
    fhs.push(1 + (h01(seed*2 + 1) - 0.5) * 0.85);
  }
}
const M = xs.length;
const wx = Float32Array.from(xs), wy = Float32Array.from(ys);
const wa = Float32Array.from(as), wb = Float32Array.from(bs);
const wfw = Float32Array.from(fws), wfh = Float32Array.from(fhs);
'''

UNEVEN_DRAW = r'''
function draw() {
  const w = canvas.width, h = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const s = scale * DPR, ox = offX * DPR, oy = offY * DPR;
  const dmax = META.dotMax;
  const e = energy;
  const active = e > 0.003;
  const R2 = RADIUS * RADIUS;

  ctx.globalAlpha = 1;
  ctx.fillStyle = INK;
  ctx.beginPath();
  for (let i = 0; i < M; i++) {
    let r = wa[i] * dmax;
    if (active) {
      const dx = wx[i] - cx, dy = wy[i] - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < R2) { const f = Math.exp(-d2 * INV_S2); r += f * SWELL * e * wb[i]; }
    }
    if (r < DOT_MIN) continue;
    const px = wx[i] * s + ox, py = wy[i] * s + oy, pr = r * s;
    const hw = pr * wfw[i], hh = pr * wfh[i];
    ctx.rect(px - hw, py - hh, hw * 2, hh * 2);
  }
  ctx.fill();
}
'''

ROUND_DRAW  = "    ctx.moveTo(px + pr, py);\n    ctx.arc(px, py, pr, 0, TAU);"
SQUARE_DRAW = "    ctx.rect(px - pr, py - pr, pr * 2, pr * 2);"

def fill(s):
    return (s.replace("__COLS__", str(cols)).replace("__ROWS__", str(rows))
             .replace("__CELL__", str(CELL)).replace("__DOTMAX__", str(DOT_MAX))
             .replace("__OUTW__", str(W)).replace("__OUTH__", str(H))
             .replace("__INK__", INK).replace("__B64__", B64))

def build_simple(out, title, dotdraw):
    html = fill(HEAD) + fill(SIMPLE_PRECOMPUTE) + fill(CANVAS_LAYOUT) \
         + SIMPLE_DRAW.replace("__DOTDRAW__", dotdraw) + TICK
    open(out, "w").write(html.replace("__TITLE__", title)); print("wrote", out)

def build_uneven(out, title):
    html = fill(HEAD) + fill(UNEVEN_PRECOMPUTE) + fill(CANVAS_LAYOUT) + UNEVEN_DRAW + TICK
    open(out, "w").write(html.replace("__TITLE__", title)); print("wrote", out)

build_simple(f"{PREFIX}-interactive.html", f"{TITLE} — Interactive Halftone", ROUND_DRAW)
build_simple(f"{PREFIX}-square.html",      f"{TITLE} — Interactive Halftone (Square Dots)", SQUARE_DRAW)
build_uneven(f"{PREFIX}-uneven.html",      f"{TITLE} — Interactive Halftone (Uneven Blocks)")
