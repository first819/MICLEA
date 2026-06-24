#!/usr/bin/env python3
# Export the dot-halftone grid (per-cell ink amount 0..1) using the SAME
# algorithm as dotify.py, so the interactive HTML reproduces the exact structure.
from PIL import Image, ImageOps, ImageFilter
import json, os

SRC = "Acropolis-of-Athens.jpg.webp"
OUT_W = 1500
CELL  = 9
DOT_MAX = 4.6
LOW_PT, HIGH_PT, GAMMA = 0.40, 0.82, 0.9
TR_FILL, TR_POW = 0.34, 2.2
LEFT_FADE = 1.0

src = Image.open(SRC).convert("RGB")
aspect = src.height / src.width
OUT_H = int(round(OUT_W * aspect))
W, H = OUT_W, OUT_H
gray = ImageOps.grayscale(src).resize((W, H), Image.LANCZOS)
gray = gray.filter(ImageFilter.GaussianBlur(radius=0.5))
px = gray.load()

def amount(lum, x, y):
    b = lum/255.0
    d = 1.0 - b
    if d <= LOW_PT: d = 0.0
    elif d >= HIGH_PT: d = 1.0
    else: d = (d-LOW_PT)/(HIGH_PT-LOW_PT)
    d = d**GAMMA
    tr = (x/W)*(1.0-y/H)
    d += TR_FILL*(tr**TR_POW)
    return max(0.0,min(1.0,d))

cols, rows = W//CELL, H//CELL
amps=[]
gy = CELL//2
r=0
for j in range(rows):
    gx = CELL//2
    for i in range(cols):
        sx,sy=min(gx,W-1),min(gy,H-1)
        a=amount(px[sx,sy],gx,gy)
        amps.append(round(a,3))
        gx+=CELL
    gy+=CELL

data={"cols":cols,"rows":rows,"cell":CELL,"dotMax":DOT_MAX,
      "outW":OUT_W,"outH":OUT_H,"amps":amps}
with open("dotgrid.json","w") as f: json.dump(data,f,separators=(",",":"))
print("cols",cols,"rows",rows,"dots",cols*rows,"size",os.path.getsize("dotgrid.json"))

# sparse version: keep dots with meaningful ink, pack as [index, amp*255]
THRESH=0.06
sparse=[]
for idx,a in enumerate(amps):
    if a>=THRESH:
        sparse.append([idx, int(round(a*255))])
data2={"cols":cols,"rows":rows,"cell":CELL,"dotMax":DOT_MAX,
       "outW":OUT_W,"outH":OUT_H,"thresh":THRESH,"dots":sparse}
with open("dotgrid_sparse.json","w") as f: json.dump(data2,f,separators=(",",":"))
print("kept",len(sparse),"of",len(amps),"size",os.path.getsize("dotgrid_sparse.json"))
