#!/usr/bin/env python3
"""Blue dot-halftone with spotlight and detail weighting."""
from PIL import Image, ImageDraw, ImageOps, ImageFilter
import sys, os

OUT = sys.argv[1] if len(sys.argv) > 1 else "parthenon-blue-dots.png"
SRC = sys.argv[2] if len(sys.argv) > 2 else "Acropolis-of-Athens.jpg.webp"

SCALE     = 3
OUT_W     = 1500
CELL      = 9
DOT_MAX   = 4.6
DOT_MIN   = 0.7
BRIGHT    = bool(os.environ.get("BRIGHT"))
LOW_PT    = float(os.environ.get("LOW_PT", 0.40))
HIGH_PT   = float(os.environ.get("HIGH_PT", 0.82))
GAMMA     = float(os.environ.get("GAMMA", 0.9))
TR_FILL   = float(os.environ.get("TR_FILL", 0.34))
TR_POW    = 2.2
LEFT_FADE = float(os.environ.get("LEFT_FADE", 1.0))
SPOT      = bool(os.environ.get("SPOT"))
SPOT_X    = float(os.environ.get("SPOT_X", 0.70))
SPOT_Y    = float(os.environ.get("SPOT_Y", 0.50))
SPOT_RX   = float(os.environ.get("SPOT_RX", 0.42))
SPOT_RY   = float(os.environ.get("SPOT_RY", 0.60))
SPOT_SOFT = float(os.environ.get("SPOT_SOFT", 0.55))
SPOT_FLOOR= float(os.environ.get("SPOT_FLOOR", 0.0))
DETAIL    = float(os.environ.get("DETAIL", 0.0))
DET_FLOOR = float(os.environ.get("DET_FLOOR", 0.18))
DET_GAIN  = float(os.environ.get("DET_GAIN", 6.0))
BLUE      = (40, 30, 235)
BG        = (255, 255, 255)

src = Image.open(SRC).convert("RGB")
aspect = src.height / src.width
OUT_H = int(round(OUT_W * aspect))
W, H = OUT_W * SCALE, OUT_H * SCALE
cell = CELL * SCALE

gray = ImageOps.grayscale(src).resize((W, H), Image.LANCZOS)
gray = gray.filter(ImageFilter.GaussianBlur(radius=SCALE * 0.5))
px = gray.load()

if DETAIL:
    blur = gray.filter(ImageFilter.GaussianBlur(radius=cell * 1.1))
    bpx = blur.load()
    det = Image.new("L", (W, H))
    dpx = det.load()
    for yy in range(H):
        for xx in range(W):
            v = abs(px[xx, yy] - bpx[xx, yy]) * DET_GAIN
            dpx[xx, yy] = 255 if v > 255 else int(v)
    det = det.filter(ImageFilter.GaussianBlur(radius=cell * 0.8))
    detpx = det.load()

canvas = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(canvas)

def amount(lum, x, y):
    b = lum / 255.0
    d = b if BRIGHT else 1.0 - b
    if d <= LOW_PT:
        d = 0.0
    elif d >= HIGH_PT:
        d = 1.0
    else:
        d = (d - LOW_PT) / (HIGH_PT - LOW_PT)
    d = d ** GAMMA
    if TR_FILL:
        tr = (x / W) * (1.0 - y / H)
        d += TR_FILL * (tr ** TR_POW)
    if LEFT_FADE < 1.0:
        d *= LEFT_FADE + (1.0 - LEFT_FADE) * (x / W)
    if DETAIL:
        dv = detpx[min(x, W - 1), min(y, H - 1)] / 255.0
        w = DET_FLOOR + (1.0 - DET_FLOOR) * dv
        d *= (1.0 - DETAIL) + DETAIL * w
    if SPOT:
        nx = (x - SPOT_X * W) / (SPOT_RX * W)
        ny = (y - SPOT_Y * H) / (SPOT_RY * H)
        r = (nx * nx + ny * ny) ** 0.5
        if r <= 1.0:
            m = 1.0
        else:
            m = max(0.0, 1.0 - (r - 1.0) / SPOT_SOFT)
        d *= SPOT_FLOOR + (1.0 - SPOT_FLOOR) * m
    return max(0.0, min(1.0, d))

gy = cell // 2
while gy < H:
    gx = cell // 2
    while gx < W:
        sx, sy = min(gx, W - 1), min(gy, H - 1)
        r = amount(px[sx, sy], gx, gy) * (DOT_MAX * SCALE)
        if r >= DOT_MIN * SCALE:
            draw.ellipse([gx - r, gy - r, gx + r, gy + r], fill=BLUE)
        gx += cell
    gy += cell

final = canvas.resize((OUT_W, OUT_H), Image.LANCZOS)
final.save(OUT)
print(f"wrote {OUT} ({OUT_W}x{OUT_H})")
