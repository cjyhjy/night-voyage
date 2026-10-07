"""
生成网站用到的图片素材（只需在修改素材时运行一次）。

  python3 tools/build_assets.py

输入：tools/src-img/landscape.png
输出：dist/assets/img/
  scene-night.webp   深夜 · 青绿（更明丽的夜色）
  scene-blue.webp    蓝调时分
  scene-dawn.webp    清晨 · 暖色
  fog.webp           可横向平铺的雾
  paper.webp         宣纸纹理（可平铺）
依赖：pillow numpy
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools/src-img/landscape.png"
OUT = ROOT / "dist/assets/img"
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(20)


def hex2rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255


def gradient_map(L, stops):
    """L: HxW in 0..1, stops: [(pos, '#hex'), ...] → HxWx3"""
    pos = np.array([s[0] for s in stops], dtype=np.float32)
    cols = np.stack([hex2rgb(s[1]) for s in stops])
    out = np.empty(L.shape + (3,), dtype=np.float32)
    for c in range(3):
        out[..., c] = np.interp(L, pos, cols[:, c])
    return out


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def vgrad(h, w, stops):
    y = np.linspace(0, 1, h, dtype=np.float32)
    g = gradient_map(y, stops)  # h x 3
    return np.broadcast_to(g[:, None, :], (h, w, 3))


def radial(h, w, cx, cy, rx, ry):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((x / w - cx) / rx) ** 2 + ((y / h - cy) / ry) ** 2)
    return np.clip(1 - d, 0, 1) ** 2


def remove_moon(img):
    """把原画里画死的月亮抹掉，改由网页里的 CSS 月亮代替（可以移动、渐隐）。"""
    a = np.asarray(img, dtype=np.float32)
    h, w, _ = a.shape
    cx, cy, r = 1165, 268, 62
    # 用左侧同高度的天空补丁覆盖
    patch = a[cy - 90:cy + 90, cx - 330:cx - 150].copy()
    patch = np.asarray(Image.fromarray(patch.astype(np.uint8)).filter(ImageFilter.GaussianBlur(3)), dtype=np.float32)
    y, x = np.mgrid[cy - 90:cy + 90, cx - 90:cx + 90]
    d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    m = (1 - smoothstep(r * 0.6, r * 1.45, d))[..., None]
    region = a[cy - 90:cy + 90, cx - 90:cx + 90]
    a[cy - 90:cy + 90, cx - 90:cx + 90] = region * (1 - m) + patch * m
    return a / 255


HORIZON = 0.69  # 水天交界（相对高度）


def sky_mask(L, thr=0.078, soft=None):
    """从画面顶端向下“漫水”找出天空区域，返回柔和的 0..1 蒙版。
    soft=(hi, lo)：区域内再按亮度做柔和过渡，用于把云也算进天空。"""
    h, w = L.shape
    sw, sh = w // 4, h // 4
    small = np.asarray(Image.fromarray((L * 255).astype(np.uint8)).resize((sw, sh), Image.BILINEAR)
                       .filter(ImageFilter.GaussianBlur(2.5)), dtype=np.float32) / 255
    cand = small < thr
    cand[int(sh * HORIZON):] = False
    seed = np.zeros_like(cand)
    seed[0] = cand[0]
    while True:
        grown = np.asarray(Image.fromarray(seed.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(3))) > 0
        grown &= cand
        if (grown == seed).all():
            break
        seed = grown
    m = Image.fromarray(seed.astype(np.uint8) * 255).resize((w, h), Image.BILINEAR).filter(ImageFilter.GaussianBlur(6))
    m = np.asarray(m, dtype=np.float32) / 255
    if soft:
        lb = np.asarray(Image.fromarray((L * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4)), dtype=np.float32) / 255
        m = m * smoothstep(soft[0], soft[1], lb)
    return m


def compose(a, land_stops, sky_stops, gamma=0.8, chroma=1.5, water_mix=0.3, extra=None, mask=None, cloud=3.0):
    h, w, _ = a.shape
    L = (a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722)
    land = gradient_map(np.clip(L, 0, 1) ** gamma, land_stops)
    land += (a - L[..., None]) * chroma  # 保留原画的金色笔触
    sky = vgrad(h, w, sky_stops).copy()
    Ls = np.asarray(Image.fromarray((L * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), dtype=np.float32) / 255
    sky *= (1 + (Ls - 0.058)[..., None] * cloud)  # 保留云纹（亮度越高越亮）
    m = (SKY if mask is None else mask)[..., None]
    out = land * (1 - m) + sky * m
    # 水面映出天色
    yy = np.linspace(0, 1, h)[:, None, None]
    water = smoothstep(HORIZON - 0.005, HORIZON + 0.02, yy)
    hz = gradient_map(np.array([HORIZON - 0.03]), sky_stops)[0]
    depth = np.clip((yy - HORIZON) / (1 - HORIZON), 0, 1)
    out = out * (1 - water * water_mix) + water * water_mix * (hz * (1 - depth * 0.45))
    if extra is not None:
        out = extra(out, L)
    return np.clip(out, 0, 1)


def save(arr, name, q=84):
    Image.fromarray((arr * 255 + 0.5).astype(np.uint8)).save(OUT / name, "WEBP", quality=q, method=6)
    print("wrote", name, (OUT / name).stat().st_size // 1024, "KB")


def scenes():
    global SKY, CLOUDY
    a = remove_moon(Image.open(SRC).convert("RGB"))
    h, w, _ = a.shape
    L = (a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722)
    SKY = sky_mask(L)
    # 云：只取紧挨着天空的那一圈，避免把山体也当成天空
    near = Image.fromarray((SKY > 0.5).astype(np.uint8) * 255).resize((w // 4, h // 4)).filter(ImageFilter.MaxFilter(25))
    near = np.asarray(near.resize((w, h), Image.BILINEAR).filter(ImageFilter.GaussianBlur(20)), dtype=np.float32) / 255
    CLOUDY = np.maximum(SKY, sky_mask(L, thr=0.17, soft=(0.2, 0.09)) * near)
    glow = lambda cx, cy, rx, ry, col: radial(h, w, cx, cy, rx, ry)[..., None] * np.array(col)

    night = compose(
        a,
        [(0, "#08161f"), (0.14, "#143543"), (0.3, "#275a62"), (0.5, "#5a9087"),
         (0.7, "#a6c6b5"), (0.88, "#e2eadb"), (1, "#fbf4e2")],
        [(0, "#0a1431"), (0.3, "#142a52"), (0.55, "#24506e"), (0.69, "#3a7184")],
        extra=lambda o, L: o + glow(0.758, 0.262, 0.3, 0.42, [0.10, 0.13, 0.13]),
    )
    save(night, "scene-night.webp")

    blue = compose(
        a,
        [(0, "#111b2e"), (0.25, "#2b4163"), (0.5, "#5f7d9c"), (0.75, "#b2c3d2"), (1, "#f2f3ef")],
        [(0, "#1f3566"), (0.35, "#3d5d92"), (0.6, "#8296b8"), (0.69, "#c0b6bf")],
        mask=CLOUDY, cloud=2.2,
    )
    save(blue, "scene-blue.webp")

    def dawn_extra(o, L):
        o = o + glow(0.8, 0.66, 0.5, 0.42, [0.30, 0.18, 0.06]) * (CLOUDY[..., None] * 0.6 + 0.4)
        yy = np.linspace(0, 1, h)[:, None, None]
        water = smoothstep(HORIZON, HORIZON + 0.02, yy)
        o = o + water * glow(0.78, 0.8, 0.09, 0.5, [0.45, 0.32, 0.12])
        return o

    dawn = compose(
        a,
        [(0, "#3d3546"), (0.18, "#594e5f"), (0.4, "#7a6669"), (0.62, "#b8978a"),
         (0.82, "#ead0b8"), (1, "#fff4e4")],
        [(0, "#8ea6c6"), (0.3, "#cfc4cc"), (0.52, "#f1caa9"), (0.69, "#fbe2b8")],
        gamma=0.9, water_mix=0.42, extra=dawn_extra, mask=CLOUDY, cloud=2.6,
    )
    save(dawn, "scene-dawn.webp")


def tile_noise(w, h, scale, seed):
    r = np.random.default_rng(seed)
    sw, sh = max(2, w // scale), max(2, h // scale)
    small = r.random((sh, sw)).astype(np.float32)
    # 包一圈以保证横向可平铺
    small = np.concatenate([small, small[:, :1]], axis=1)
    im = Image.fromarray((small * 255).astype(np.uint8)).resize((w + scale, h), Image.BICUBIC)
    return np.asarray(im, dtype=np.float32)[:, :w] / 255


def fog():
    w, h = 2048, 512
    n = sum(tile_noise(w, h, s, 7 + i) * wt for i, (s, wt) in enumerate([(256, 0.5), (128, 0.28), (64, 0.14), (32, 0.08)]))
    n = smoothstep(0.42, 0.78, n)
    y = np.linspace(0, 1, h)[:, None]
    band = np.exp(-((y - 0.55) / 0.22) ** 2)
    alpha = np.clip(n * band * 1.15, 0, 1)
    img = np.zeros((h, w, 4), dtype=np.uint8)
    img[..., :3] = 255
    img[..., 3] = (alpha * 255).astype(np.uint8)
    Image.fromarray(img).save(OUT / "fog.webp", "WEBP", quality=80, method=6)
    print("wrote fog.webp", (OUT / "fog.webp").stat().st_size // 1024, "KB")


def paper():
    s = 512
    base = rng.normal(0.94, 0.035, (s, s)).astype(np.float32)
    im = Image.fromarray((np.clip(base, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    a = np.asarray(im, dtype=np.float32) / 255
    # 纤维：随机细短线
    fib = Image.new("L", (s, s), 0)
    from PIL import ImageDraw
    d = ImageDraw.Draw(fib)
    for _ in range(900):
        x, y = rng.random(2) * s
        ang = rng.random() * np.pi
        ln = rng.uniform(6, 30)
        for ox in (-s, 0, s):
            for oy in (-s, 0, s):
                d.line([(x + ox, y + oy), (x + ox + np.cos(ang) * ln, y + oy + np.sin(ang) * ln)], fill=int(rng.uniform(30, 90)), width=1)
    fib = np.asarray(fib.filter(ImageFilter.GaussianBlur(0.6)), dtype=np.float32) / 255
    out = np.clip(a - fib * 0.16, 0, 1)
    Image.fromarray((out * 255).astype(np.uint8)).save(OUT / "paper.webp", "WEBP", quality=80, method=6)
    print("wrote paper.webp", (OUT / "paper.webp").stat().st_size // 1024, "KB")


if __name__ == "__main__":
    scenes()
    fog()
    paper()
