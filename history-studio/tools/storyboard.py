"""Lay out storyboard pages from snapshot frames.

Usage: python3 -I tools/storyboard.py <video-folder> <snapshot-dir>

Reads <video-folder>/storyboard/shots.json (written by the film build) and the
frame-NN-*.png files in <snapshot-dir> (one per shot, in order), and writes
<video-folder>/storyboard/page-N.jpg: 12 shots a page, each with its number,
time, inscription and the narration it plays under.
"""

import json
import sys
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONTS = "/usr/share/fonts/truetype"
BOLD = ImageFont.truetype(f"{FONTS}/dejavu/DejaVuSerif-Bold.ttf", 22)
BODY = ImageFont.truetype(f"{FONTS}/liberation/LiberationSerif-Italic.ttf", 22)
HEAD = ImageFont.truetype(f"{FONTS}/dejavu/DejaVuSerif-Bold.ttf", 34)
INK, RED, PAPER = (58, 44, 34), (168, 67, 47), (239, 228, 200)
COLS, ROWS, TW, TH, PAD, CAP = 3, 4, 600, 338, 28, 120


def clock(t):
    m, s = divmod(int(t), 60)
    return f"{m}:{s:02d}"


def main():
    folder, snaps = Path(sys.argv[1]), Path(sys.argv[2])
    shots = json.loads((folder / "storyboard/shots.json").read_text(encoding="utf-8"))
    frames = sorted(snaps.glob("frame-*.png"), key=lambda p: int(p.name.split("-")[1]))[: len(shots)]
    per = COLS * ROWS
    pages = (len(shots) + per - 1) // per
    for pg in range(pages):
        W = PAD + COLS * (TW + PAD)
        H = 90 + ROWS * (TH + CAP + PAD) + PAD
        page = Image.new("RGB", (W, H), PAPER)
        d = ImageDraw.Draw(page)
        d.text((PAD, 28), f"{shots[0]['title']}  ·  storyboard {pg + 1}/{pages}", font=HEAD, fill=RED)
        for i, shot in enumerate(shots[pg * per:(pg + 1) * per]):
            r, c = divmod(i, COLS)
            x, y = PAD + c * (TW + PAD), 90 + r * (TH + CAP + PAD)
            idx = pg * per + i
            if idx < len(frames):
                page.paste(Image.open(frames[idx]).convert("RGB").resize((TW, TH), Image.LANCZOS), (x, y))
            d.rectangle([x - 1, y - 1, x + TW, y + TH], outline=INK, width=2)
            d.text((x, y + TH + 8), f"{shot['n']:02d}  ·  {clock(shot['start'])}–{clock(shot['end'])}", font=BOLD, fill=RED)
            words = "“" + shot["text"] + "”"
            for j, line in enumerate(textwrap.wrap(words, 52)[:3]):
                d.text((x, y + TH + 38 + j * 25), line + ("…" if j == 2 and len(words) > 156 else ""), font=BODY, fill=INK)
        out = folder / f"storyboard/page-{pg + 1}.jpg"
        page.save(out, quality=86)
        print(out)


if __name__ == "__main__":
    main()
