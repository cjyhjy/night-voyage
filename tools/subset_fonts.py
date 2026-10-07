"""
把网页里实际用到的字从三套开源字体中“裁”出来，做成很小的网页字体。
改完 dist/content.js 之后运行一次：

  python3 tools/subset_fonts.py

依赖：pip install fonttools brotli
字体源文件放在 tools/font-src/（缺失时会自动下载）：
  NotoSerifSC.ttf   思源宋体（正文）        SIL OFL
  MaShanZheng.ttf   马善政楷书（毛笔标题）  SIL OFL
  LXGWWenKai.ttf    霞鹜文楷（信与纸笺）    SIL OFL
"""
import re
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools/font-src"
OUT = ROOT / "dist/assets/fonts"
URLS = {
    "NotoSerifSC.ttf": "https://github.com/google/fonts/raw/main/ofl/notoserifsc/NotoSerifSC%5Bwght%5D.ttf",
    "MaShanZheng.ttf": "https://github.com/google/fonts/raw/main/ofl/mashanzheng/MaShanZheng-Regular.ttf",
    "LXGWWenKai.ttf": "https://github.com/lxgw/LxgwWenKai/releases/download/v1.520/LXGWWenKai-Regular.ttf",
}


def collect_text():
    text = ""
    for p in [ROOT / "dist/content.js", ROOT / "dist/index.html", *sorted((ROOT / "dist/js").glob("*.js"))]:
        if p.name == "glyphs.js":
            continue
        text += p.read_text(encoding="utf-8")
    chars = set(ch for ch in text if ord(ch) > 0x2000)
    chars |= set(chr(c) for c in range(0x20, 0x7F))
    chars |= set("，。、；：？！…—「」『』（）《》·“”‘’零一二三四五六七八九十百千万年月日天")
    return "".join(sorted(chars))


def ensure(name):
    path = SRC / name
    if not path.exists():
        SRC.mkdir(parents=True, exist_ok=True)
        print("downloading", name)
        urllib.request.urlretrieve(URLS[name], path)
    return path


def make(name, out, chars, wght=None):
    font = TTFont(ensure(name))
    if wght and "fvar" in font:
        font = instancer.instantiateVariableFont(font, {"wght": wght})
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(text=chars)
    sub.subset(font)
    font.flavor = "woff2"
    OUT.mkdir(parents=True, exist_ok=True)
    font.save(OUT / out)
    print(f"{out}: {len(chars)} chars, {(OUT / out).stat().st_size // 1024} KB")


if __name__ == "__main__":
    chars = collect_text()
    make("NotoSerifSC.ttf", "serif.woff2", chars, wght=400)
    make("MaShanZheng.ttf", "brush.woff2", chars)
    make("LXGWWenKai.ttf", "kai.woff2", chars)
