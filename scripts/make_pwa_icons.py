#!/usr/bin/env python3
"""Generate the PWA icon set in docs/pwa/icons/.

The mark follows the digest's newspaper look: a near-black ink square with a
white serif N. Maskable and apple-touch variants use a full-bleed background
so launcher masks and iOS corner rounding never cut into transparent edges.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

INK = (28, 25, 23, 255)
PAPER = (250, 250, 249, 255)
OUT = Path(__file__).resolve().parent.parent / 'docs' / 'pwa' / 'icons'
FONT_PATHS = [
    '/System/Library/Fonts/Supplemental/Georgia Bold.ttf',
    '/System/Library/Fonts/Supplemental/Georgia.ttf',
]


def font(px):
    for path in FONT_PATHS:
        try:
            return ImageFont.truetype(path, px)
        except OSError:
            continue
    raise SystemExit('no Georgia font found; edit FONT_PATHS for this machine')


def make(size, kind):
    if kind in ('maskable', 'apple'):
        img = Image.new('RGBA', (size, size), INK)
        # keep the glyph inside the maskable safe zone (center ~66%)
        glyph = 0.40 if kind == 'maskable' else 0.52
    else:
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        ImageDraw.Draw(img).rounded_rectangle(
            [0, 0, size - 1, size - 1], radius=int(size * 0.215), fill=INK)
        glyph = 0.52
    ImageDraw.Draw(img).text(
        (size / 2, size * 0.49), 'N', font=font(int(size * glyph)),
        fill=PAPER, anchor='mm')
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, size, kind in [
        ('icon-192.png', 192, 'plain'),
        ('icon-512.png', 512, 'plain'),
        ('icon-maskable-512.png', 512, 'maskable'),
        ('apple-touch-icon.png', 180, 'apple'),
    ]:
        make(size, kind).save(OUT / name)
    print(f'icons written to {OUT}')


if __name__ == '__main__':
    main()
