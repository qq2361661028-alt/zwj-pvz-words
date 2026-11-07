#!/usr/bin/env python3
"""白底角色图 -> 透明 PNG + 三档尺寸 + 可选接触表。

用法：
  python scripts/matting.py --src art-source/plants --out public/assets/plants --sheet art-source/plants-sheet.png
"""
import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

TIERS = {'l': 256, 'c': 128, 's': 96}
MARGIN = 0.06
WHITE_TOL = 28
HOLE_TOL = 12
HOLE_MIN_AREA = 300
HOLE_MIN_ASPECT = 3.0
SOFT_RADIUS = 2
SOFT_LOW = 16
SOFT_HIGH = 40
FRINGE_MIN_LIGHT = 205
# 暖金光晕（浅黄、sat≈45-55）也要算作描边外的 fringe；纯黄装饰光点 sat≈85 保留。
FRINGE_MAX_SAT = 70


def _near_white(px, x: int, y: int, tol: int) -> bool:
    r, g, b = px[x, y][:3]
    return 255 - r <= tol and 255 - g <= tol and 255 - b <= tol


def _background_mask(px, w: int, h: int) -> tuple[bytearray, bytearray]:
    near = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            if _near_white(px, x, y, WHITE_TOL):
                near[y * w + x] = 1

    bg = bytearray(w * h)
    queue: deque[int] = deque()

    def seed(x: int, y: int) -> None:
        i = y * w + x
        if near[i] and not bg[i]:
            bg[i] = 1
            queue.append(i)

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)

    while queue:
        i = queue.popleft()
        x, y = i % w, i // w
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                j = ny * w + nx
                if near[j] and not bg[j]:
                    bg[j] = 1
                    queue.append(j)
    return near, bg


def _holes_to_background(px, w: int, h: int, near: bytearray, bg: bytearray) -> int:
    """闭合轮廓内的纯白背景（如藤圈内孔）不会与画布边界连通。

    只移除细长且接近纯白的连通域；眼睛高光等圆形小块保持不透明。
    """
    seen = bytearray(w * h)
    removed = 0
    for start in range(w * h):
        if not near[start] or bg[start] or seen[start]:
            continue
        queue: deque[int] = deque([start])
        seen[start] = 1
        comp: list[int] = []
        while queue:
            i = queue.popleft()
            comp.append(i)
            x, y = i % w, i // w
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h:
                    j = ny * w + nx
                    if near[j] and not bg[j] and not seen[j]:
                        seen[j] = 1
                        queue.append(j)
        if len(comp) < HOLE_MIN_AREA:
            continue
        xs = [i % w for i in comp]
        ys = [i // w for i in comp]
        bw = max(xs) - min(xs) + 1
        bh = max(ys) - min(ys) + 1
        if bw / bh >= HOLE_MIN_ASPECT or bh / bw >= HOLE_MIN_ASPECT:
            for i in comp:
                x, y = i % w, i // w
                if _near_white(px, x, y, HOLE_TOL):
                    bg[i] = 1
                    removed += 1
    return removed


def _clean_white_fringe(px, w: int, h: int, ap) -> None:
    """逐层清除轮廓外的低饱和亮色光晕，避免在深色背景上出现白边。

    角色轮廓为深色描边，因此这里只会吃掉描边外侧的奶白色像素；
    眼睛高光等内部亮块不与透明区域相邻，不会被误删。
    """
    candidates: set[int] = set()

    def candidate(x: int, y: int) -> bool:
        if ap[x, y] == 0:
            return False
        r, g, b = px[x, y]
        return min(r, g, b) >= FRINGE_MIN_LIGHT and max(r, g, b) - min(r, g, b) <= FRINGE_MAX_SAT

    for i in range(w * h):
        x, y = i % w, i // w
        if candidate(x, y):
            candidates.add(i)

    for _ in range(300):
        removed: list[int] = []
        for i in candidates:
            x, y = i % w, i // w
            if (
                (x > 0 and ap[x - 1, y] == 0)
                or (x + 1 < w and ap[x + 1, y] == 0)
                or (y > 0 and ap[x, y - 1] == 0)
                or (y + 1 < h and ap[x, y + 1] == 0)
            ):
                removed.append(i)
        if not removed:
            break
        for i in removed:
            x, y = i % w, i // w
            ap[x, y] = 0
            candidates.discard(i)
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h and candidate(nx, ny):
                    candidates.add(ny * w + nx)


def _bleed_edge_color(out: Image.Image, w: int, h: int, alpha) -> None:
    """半透明边缘像素继承最近不透明像素的颜色，避免白/深底色在描边外渗出。"""
    ap = alpha.load()
    px = out.load()
    for y in range(h):
        for x in range(w):
            a = ap[x, y]
            if a == 0 or a == 255:
                continue
            best = None
            best_d = 1 << 30
            for dy in range(-3, 4):
                for dx in range(-3, 4):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and ap[nx, ny] >= 200:
                        d = dx * dx + dy * dy
                        if d < best_d:
                            best_d = d
                            best = (nx, ny)
            if best is not None:
                r, g, b, _ = px[best[0], best[1]]
                px[x, y] = (r, g, b, a)


def _drop_pale_low_alpha(out: Image.Image, w: int, h: int, alpha) -> None:
    """清除残留的浅色低透明度光雾，避免在深色背景上形成白色虚线。"""
    ap = alpha.load()
    px = out.load()
    for y in range(h):
        for x in range(w):
            a = ap[x, y]
            if 0 < a < 200:
                r, g, b, _ = px[x, y]
                if min(r, g, b) >= 235:
                    ap[x, y] = 0


def _clean_resize_specks(out: Image.Image) -> None:
    """清除 LANCZOS 缩放振铃在轮廓外留下的纯白微点。

    只处理浅色（min 通道 >= 235）且低透明度的像素；若整块不与任何
    alpha >= 128 的像素相邻，则判为缩放伪影并清零。附着在角色边缘的
    软 alpha 保持不变。
    """
    w, h = out.size
    px = out.load()
    alpha = out.getchannel('A')
    ap = alpha.load()

    for i in range(w * h):
        x, y = i % w, i // w
        a = ap[x, y]
        if 0 < a <= 6:
            r, g, b, _ = px[x, y]
            if min(r, g, b) >= 235:
                ap[x, y] = 0

    seen = bytearray(w * h)
    for start in range(w * h):
        if seen[start]:
            continue
        x0, y0 = start % w, start // w
        a0 = ap[x0, y0]
        if not 0 < a0 < 200:
            continue
        r0, g0, b0, _ = px[x0, y0]
        if min(r0, g0, b0) < 235:
            continue
        queue: deque[int] = deque([start])
        seen[start] = 1
        comp: list[int] = []
        touches_body = False
        while queue:
            i = queue.popleft()
            comp.append(i)
            x, y = i % w, i // w
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < w and 0 <= ny < h):
                        continue
                    na = ap[nx, ny]
                    if na >= 128:
                        touches_body = True
                    j = ny * w + nx
                    if seen[j] or not 0 < na < 200:
                        continue
                    nr, ng, nb, _ = px[nx, ny]
                    if min(nr, ng, nb) >= 235:
                        seen[j] = 1
                        queue.append(j)
        if not touches_body:
            for i in comp:
                ap[i % w, i // w] = 0

    out.putalpha(alpha)


def matte(src: Path) -> Image.Image:
    im = Image.open(src).convert('RGBA')
    rgb = im.convert('RGB')
    w, h = rgb.size
    px = rgb.load()

    near, bg = _background_mask(px, w, h)
    _holes_to_background(px, w, h, near, bg)

    out = im.copy()
    alpha = out.getchannel('A')
    ap = alpha.load()

    fringe = bytearray(w * h)
    for i in range(w * h):
        if not bg[i]:
            continue
        x, y = i % w, i // w
        ap[x, y] = 0
        for dy in range(-SOFT_RADIUS, SOFT_RADIUS + 1):
            for dx in range(-SOFT_RADIUS, SOFT_RADIUS + 1):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and not bg[ny * w + nx]:
                    fringe[ny * w + nx] = 1

    for i in range(w * h):
        if not fringe[i]:
            continue
        x, y = i % w, i // w
        r, g, b = px[x, y]
        d = max(255 - r, 255 - g, 255 - b)
        t = (d - SOFT_LOW) / (SOFT_HIGH - SOFT_LOW)
        t = 0.0 if t < 0 else (1.0 if t > 1 else t)
        if t < 1:
            ap[x, y] = int(ap[x, y] * t)

    _clean_white_fringe(px, w, h, ap)

    alpha = alpha.filter(ImageFilter.MinFilter(3))
    ap = alpha.load()
    _clean_white_fringe(px, w, h, ap)
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.6))
    out.putalpha(alpha)
    _bleed_edge_color(out, w, h, alpha)
    _drop_pale_low_alpha(out, w, h, alpha)
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
            tier_img = master.resize((size, size), Image.LANCZOS)
            _clean_resize_specks(tier_img)
            tier_img.save(out / f'{path.stem}_{tier}.png', optimize=True)
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
