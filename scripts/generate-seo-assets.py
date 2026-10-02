"""One-off helper to generate social/SEO static assets for public/."""
from __future__ import annotations

import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, 'public')


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = [
        r'C:\Windows\Fonts\segoeuib.ttf' if bold else r'C:\Windows\Fonts\segoeui.ttf',
        r'C:\Windows\Fonts\arialbd.ttf' if bold else r'C:\Windows\Fonts\arial.ttf',
        r'C:\Windows\Fonts\calibrib.ttf' if bold else r'C:\Windows\Fonts\calibri.ttf',
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def make_og_image() -> None:
    width, height = 1200, 630
    bg = (15, 15, 23)
    accent = (121, 208, 237)
    accent2 = (139, 231, 253)
    muted = (170, 185, 210)
    white = (236, 242, 255)

    img = Image.new('RGB', (width, height), bg)
    draw = ImageDraw.Draw(img)

    for i, y in enumerate(range(80, height, 90)):
        c = (28 + i * 2, 32 + i * 2, 48 + i)
        draw.line([(0, y), (width, y + 40)], fill=c, width=2)

    cx, cy, r = 980, 315, 110
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=accent, width=8)
    draw.ellipse([cx - 42, cy - 42, cx + 42, cy + 42], fill=accent2)

    title_font = load_font(72, bold=True)
    sub_font = load_font(28)
    tag_font = load_font(22)
    domain_font = load_font(20)

    draw.text((72, 160), 'SUNDEEP', font=title_font, fill=white)
    draw.text((72, 240), 'CHAKLADAR', font=title_font, fill=accent2)
    draw.text((72, 340), 'Medicine  /  AI  /  Software', font=sub_font, fill=muted)
    draw.rectangle([72, 400, 280, 406], fill=accent)
    draw.text(
        (72, 430),
        'Identifying problems. Building solutions. Translating to care.',
        font=tag_font,
        fill=muted,
    )
    draw.text((72, 560), 'sundeepchakladar.com', font=domain_font, fill=accent)

    out = os.path.join(PUBLIC, 'og-image.png')
    img.save(out, 'PNG', optimize=True)
    print('wrote', out, os.path.getsize(out))


def make_apple_touch_icon() -> None:
    fav = os.path.join(PUBLIC, 'favicon.png')
    if not os.path.exists(fav):
        return
    source = Image.open(fav).convert('RGBA')
    size = 180
    canvas = Image.new('RGBA', (size, size), (15, 15, 23, 255))
    source.thumbnail((size - 24, size - 24), Image.Resampling.LANCZOS)
    ox = (size - source.width) // 2
    oy = (size - source.height) // 2
    canvas.paste(source, (ox, oy), source)
    out = os.path.join(PUBLIC, 'apple-touch-icon.png')
    canvas.convert('RGB').save(out, 'PNG', optimize=True)
    print('wrote', out, os.path.getsize(out))


if __name__ == '__main__':
    os.makedirs(PUBLIC, exist_ok=True)
    make_og_image()
    make_apple_touch_icon()
