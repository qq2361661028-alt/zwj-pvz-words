#!/usr/bin/env python3
"""白底角色图 -> 透明 PNG + 三档尺寸 + 可选接触表。

用法：
  python scripts/matting.py --src art-source/plants --out public/assets/plants --sheet art-source/plants-sheet.png
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

TIERS = {'l': 256, 'c': 128, 's': 96}
MARGIN = 0.06


def matte(src: Path) -> Image.Image:
    im = Image.open(src).convert('RGBA')
    rgb = im.convert('RGB')
    w, h = rgb.size
    marker = (255, 0, 255)
    for xy in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        ImageDraw.floodfill(rgb, xy, marker, thresh=28)

    px = rgb.load()
    out = im.copy()
    alpha = out.getchannel('A')
    ap = alpha.load()
    for y in range(h):
        for x in range(w):
            if px[x, y] == marker:
                ap[x, y] = 0
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    out.putalpha(alpha)

    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
    side = max(out.size)
    pad = max(1, int(side * MARGIN))
    canvas = Image.new('RGBA', (side + pad * 2, side + pad * 2), (0, 0, 0, 0))
    canvas.paste(out, ((canvas.width - out.width) // 2, (canvas.height - out.height) // 2))
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--src', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--sheet')
    args = parser.parse_args()

    src = Path(args.src)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    names = sorted(p for p in src.glob('*.png') if not p.name.endswith('-sheet.png'))
    thumbs = []
    for path in names:
        master = matte(path)
        for tier, size in TIERS.items():
            master.resize((size, size), Image.LANCZOS).save(out / f'{path.stem}_{tier}.png', optimize=True)
        thumbs.append((path.stem, master.resize((256, 256), Image.LANCZOS)))

    if args.sheet and thumbs:
        cols = 4
        rows = (len(thumbs) + cols - 1) // cols
        sheet = Image.new('RGBA', (cols * 280, rows * 300), (245, 238, 214, 255))
        draw = ImageDraw.Draw(sheet)
        for i, (name, img) in enumerate(thumbs):
            x = (i % cols) * 280 + 12
            y = (i // cols) * 300 + 12
            sheet.alpha_composite(img, (x, y))
            draw.text((x, y + 262), name, fill=(60, 40, 20, 255))
        sheet.save(args.sheet)

    print(f'matted {len(names)} images -> {out}')


if __name__ == '__main__':
    main()
