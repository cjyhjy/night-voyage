"""
把俯视小舟原图拆成「船身」和「船橹」两张图（船橹单独摇动），并生成「相逢」里第二条船的墨蓝配色。

  python3 tools/build_boat.py

输入：tools/src-img/boat-top.webp（透明背景，船头朝右）
输出：dist/assets/img/boat.webp  boat-blue.webp  oar.webp
依赖：pillow numpy
"""
from pathlib import Path
import colorsys
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools/src-img/boat-top.webp"
OUT = ROOT / "dist/assets/img"
CUT = 452          # 船尾与船橹的分界（原图像素 x）
SCALE = 0.62       # 输出缩放（够 2 倍屏使用）


def bbox(alpha, thr=8):
    ys, xs = np.where(alpha > thr)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def save(arr, name):
    im = Image.fromarray(arr)
    im = im.resize((round(im.width * SCALE), round(im.height * SCALE)), Image.LANCZOS)
    im.save(OUT / name, "WEBP", quality=88, method=6)
    print("wrote", name, im.size, (OUT / name).stat().st_size // 1024, "KB")


def recolor_blue(a):
    """船身的墨绿 → 墨蓝；金色等其他颜色不动。"""
    rgb = a[..., :3].astype(np.float32) / 255
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn + 1e-6
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = np.where(mx > 0, d / (mx + 1e-6), 0)
    lum = r * 0.299 + g * 0.587 + b * 0.114
    sm = lambda e0, e1, v: np.clip((v - e0) / (e1 - e0), 0, 1) ** 2 * (3 - 2 * np.clip((v - e0) / (e1 - e0), 0, 1))
    hd = np.minimum(np.abs(h - 42), 360 - np.abs(h - 42))
    w_gold = np.exp(-(hd / 24) ** 2) * sm(0.12, 0.35, s)   # 金色 / 灯光：保留
    w = (1 - w_gold) * (1 - sm(0.5, 0.75, lum))            # 亮部（灯芯）：保留
    tint = np.array([0.55, 0.78, 1.35], dtype=np.float32)   # 墨蓝，亮度不变
    blue = np.clip(lum[..., None] * tint, 0, 1)
    out = rgb * (1 - w[..., None]) + blue * w[..., None]
    res = a.copy()
    res[..., :3] = (out * 255 + 0.5).astype(np.uint8)
    return res


def main():
    a = np.asarray(Image.open(SRC).convert("RGBA")).copy()
    H, W = a.shape[:2]
    x = np.arange(W)[None, :]
    feather = np.clip((x - CUT + 2) / 4, 0, 1)  # 4px 柔和过渡

    hull = a.copy()
    hull[..., 3] = (hull[..., 3] * feather).astype(np.uint8)
    oar = a.copy()
    oar[..., 3] = (oar[..., 3] * (1 - feather)).astype(np.uint8)

    hb = bbox(hull[..., 3])
    ob = bbox(oar[..., 3])
    # 船身中心：船身包围盒的中点（y 用整船的中线）
    cx = (hb[0] + hb[2]) / 2
    cy = (hb[1] + hb[3]) / 2
    pivot = (CUT, int(np.mean(np.where(a[:, CUT - 6, 3] > 60)[0])))

    save(hull[hb[1]:hb[3], hb[0]:hb[2]], "boat.webp")
    save(recolor_blue(hull)[hb[1]:hb[3], hb[0]:hb[2]], "boat-blue.webp")
    save(oar[ob[1]:ob[3], ob[0]:ob[2]], "oar.webp")

    # 船头小灯的位置
    lum = a[..., :3].astype(int).sum(-1) * (a[..., 3] > 200)
    ly, lx = np.unravel_index(lum.argmax(), lum.shape)

    geo = {"hull": [int(v) for v in hb], "oar": [int(v) for v in ob], "pivot": [int(v) for v in pivot],
           "lamp": [int(lx), int(ly)], "center": [cx, cy]}
    print(json.dumps(geo))


if __name__ == "__main__":
    main()
