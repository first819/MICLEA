#!/usr/bin/env python3
"""Convert the Temple of Zeus photo into a blue dashed-line halftone."""
from PIL import Image, ImageDraw, ImageOps, ImageFilter
import sys

SRC = sys.argv[2] if len(sys.argv) > 2 else "Temple-of-Zeus-Olympieion.jpg (1).webp"
OUT = sys.argv[1] if len(sys.argv) > 1 else "temple-blue-dashes.png"

# ---- tunables -------------------------------------------------------------
SCALE      = 3          # supersample factor for crisp rounded caps
OUT_W      = 1500       # final width (px); height follows source aspect
ROW_PITCH  = 7          # vertical distance between scan lines (px, final)
LINE_THICK = 3          # dash thickness (px, final)
CELL_W     = 8          # horizontal sampling cell (px, final)
GAP        = 2          # min gap kept between dashes inside a cell (px, final)
LOW_PT     = 0.32       # luminance at/below this -> no dash (empty)
HIGH_PT    = 0.80       # luminance at/above this -> full-length dash
CONTRAST   = 1.25       # >1 hardens the midtone rolloff
import os
if os.environ.get("MONO_BLUE"):
    BLUE   = (150, 185, 255)   # light periwinkle dashes
    BG     = (12, 14, 60)      # deep blue field (no white)
else:
    BLUE   = (32, 22, 240)     # ink color
    BG     = (255, 255, 255)   # paper
# ---------------------------------------------------------------------------

src = Image.open(SRC).convert("RGB")
aspect = src.height / src.width
OUT_H = int(round(OUT_W * aspect))

# work at supersampled resolution
W, H = OUT_W * SCALE, OUT_H * SCALE
pitch = ROW_PITCH * SCALE
thick = LINE_THICK * SCALE
cell  = CELL_W * SCALE
gap   = GAP * SCALE

# luminance map, sampled at the output grid
gray = ImageOps.grayscale(src).resize((W, H), Image.LANCZOS)
gray = gray.filter(ImageFilter.GaussianBlur(radius=SCALE * 0.6))
px = gray.load()

canvas = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(canvas)

INVERT = bool(os.environ.get("MONO_BLUE"))

def ink_amount(lum):
    """0..1 dash length for a 0..255 luminance (BRIGHT -> longer dash)."""
    b = lum / 255.0
    if INVERT:
        b = 1.0 - b   # dark structure -> long bright dash (glows on dark field)
    if b <= LOW_PT:
        d = 0.0
    elif b >= HIGH_PT:
        d = 1.0
    else:
        d = (b - LOW_PT) / (HIGH_PT - LOW_PT)
    # harden midtones around 0.5
    d = d ** CONTRAST
    return d

ncells = W // cell
y = pitch // 2
while y < H:
    x = 0
    while x < ncells * cell:
        # average luminance of the cell (sample a few points)
        cx0, cx1 = x, min(x + cell, W - 1)
        sy = min(y, H - 1)
        lum = (px[cx0, sy] + px[(cx0 + cx1) // 2, sy] + px[cx1, sy]) / 3.0
        d = ink_amount(lum)
        max_len = cell - gap
        dash = d * max_len
        if dash >= SCALE:  # skip sub-pixel specks
            cxm = x + cell / 2.0
            x0 = cxm - dash / 2.0
            x1 = cxm + dash / 2.0
            y0 = y - thick / 2.0
            y1 = y + thick / 2.0
            r = thick / 2.0
            draw.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=BLUE)
        x += cell
    y += pitch

final = canvas.resize((OUT_W, OUT_H), Image.LANCZOS)
final.save(OUT)
print(f"wrote {OUT} ({OUT_W}x{OUT_H})")
