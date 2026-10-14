#!/usr/bin/env python3
"""把桌面图标里的白色 Z 字形替换为同风格的 M 字形，并把 DMG 背景的 ZCODE 字样改为 MCODE。

做法：识别图标中的高亮字形像素 → 按行取背景中位色覆盖 → 在原字形包围盒内绘制几何 M。
可重复执行（以 git 上游原图为输入源时结果一致）。
"""
from __future__ import annotations

import statistics
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SS = 4  # 超采样倍数

# 几何 M：归一化到字形包围盒（x, y ∈ [0, 1]）
M_POLY = [
    (0.0, 1.0), (0.0, 0.0), (0.24, 0.0), (0.5, 0.46), (0.76, 0.0), (1.0, 0.0),
    (1.0, 1.0), (0.79, 1.0), (0.79, 0.4), (0.57, 0.8), (0.43, 0.8), (0.21, 0.4), (0.21, 1.0),
]


def glyph_mask(im: Image.Image, threshold: int) -> Image.Image:
    px = im.load()
    w, h = im.size
    mask = Image.new("L", im.size, 0)
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 200 and (r + g + b) / 3 > threshold:
                mp[x, y] = 255
    return mask


def recolor_icon(path: Path, threshold: int = 70, color=(255, 255, 255, 255)) -> None:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    raw = glyph_mask(im, threshold)
    # 只保留中心区域的字形（排除图标边缘高光等）
    cx0, cy0, cx1, cy1 = int(w * 0.12), int(h * 0.12), int(w * 0.88), int(h * 0.88)
    central = Image.new("L", im.size, 0)
    central.paste(raw.crop((cx0, cy0, cx1, cy1)), (cx0, cy0))
    bbox = central.getbbox()
    if not bbox:
        raise SystemExit(f"no glyph found in {path}")
    cover = central.filter(ImageFilter.MaxFilter(max(3, (w // 128) | 1)))
    px = im.load()
    cp = cover.load()
    x0, y0, x1, y1 = bbox
    band = range(max(0, x0 - w // 10), min(w, x1 + w // 10))
    sampled_color = None
    for y in range(max(0, y0 - 8), min(h, y1 + 8)):
        samples = [px[x, y] for x in band if cp[x, y] == 0 and px[x, y][3] > 200]
        if samples:
            sampled_color = tuple(int(statistics.median(c[i] for c in samples)) for i in range(4))
        if sampled_color is None:
            continue
        for x in band:
            if cp[x, y]:
                px[x, y] = sampled_color
    # 在原字形包围盒内绘制 M（超采样抗锯齿）
    gw, gh = x1 - x0, y1 - y0
    big = Image.new("L", (gw * SS, gh * SS), 0)
    ImageDraw.Draw(big).polygon([(x * gw * SS, y * gh * SS) for x, y in M_POLY], fill=255)
    alpha = big.resize((gw, gh), Image.LANCZOS)
    layer = Image.new("RGBA", (gw, gh), color)
    im.paste(layer, (x0, y0), alpha)
    im.save(path)


def write_derivatives(master: Path, png_dir: Path | None, ico: Path | None, icns: Path | None) -> None:
    im = Image.open(master).convert("RGBA")
    if png_dir:
        for size in (16, 24, 32, 48, 64, 128, 256, 512, 1024):
            target = png_dir / f"{size}x{size}.png"
            if target.exists():
                im.resize((size, size), Image.LANCZOS).save(target)
    if ico:
        im.save(ico, sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    if icns:
        im.save(icns, format="ICNS")


def rebrand_dmg_background(path: Path) -> None:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    scale = w / 540
    # 原 ZCODE 字样位于 (170..365, 72..122) @1x
    box = tuple(int(v * scale) for v in (160, 64, 380, 130))
    bg = im.getpixel((int(270 * scale), int(150 * scale)))
    ImageDraw.Draw(im).rectangle(box, fill=bg)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(54 * scale))
    draw = ImageDraw.Draw(im)
    text = "MCODE"
    tb = draw.textbbox((0, 0), text, font=font)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    cx, cy = int(268 * scale), int(97 * scale)
    draw.text((cx - tw / 2 - tb[0], cy - th / 2 - tb[1]), text, font=font, fill=(45, 45, 48, 255))
    im.save(path)


def main() -> None:
    build = ROOT / "packages/desktop/build"
    recolor_icon(build / "icon.png")
    recolor_icon(build / "icon_windows.png")
    recolor_icon(build / "icon_installer.png", threshold=150, color=(240, 240, 240, 255))
    recolor_icon(ROOT / "public/logo/icons/1024x1024.png")
    write_derivatives(build / "icon.png", None, None, build / "icon.icns")
    write_derivatives(build / "icon_windows.png", build / "icons", build / "icon.ico", None)
    write_derivatives(build / "icon_installer.png", None, build / "icon_installer.ico", build / "icon_installer.icns")
    write_derivatives(ROOT / "public/logo/icons/1024x1024.png", ROOT / "public/logo/icons",
                      ROOT / "public/logo/icons/icon.ico", ROOT / "public/logo/icons/icon.icns")
    rebrand_dmg_background(build / "dmg_background.png")
    rebrand_dmg_background(build / "dmg_background@2x.png")


if __name__ == "__main__":
    main()
