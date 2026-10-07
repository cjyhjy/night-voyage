# 二十 · 夜航长卷

从十九岁的夜晚，驶向二十岁的清晨。

## 预览

直接双击 `dist/index.html` 用 Chrome / Safari 打开即可。
或者在本目录运行：

```bash
python3 -m http.server 8000 --directory dist
```

然后打开 http://localhost:8000 。地址后加 `?skip` 可以跳过开场动画（调试用）。

## 改文案（最重要）

**所有文字都在 `dist/content.js`**，标了 ✏️ 的地方最好换成你自己的话：

| 位置 | 说明 |
|---|---|
| `meta.herName` | 她的名字 / 你对她的称呼（信的抬头会用到） |
| `meta.signature` | 信末落款 |
| `meta.metOn` | 认识的日期，填了会在「相逢」显示「认识你的第 N 天」 |
| `notes.items` | 二十笺：`k` 是笺面的字，`t` 是拆开后的话 |
| `letter.body` | 信的正文，一段一行。**中间那段【✏️ …】一定要换掉** |
| `wishes.lantern.items` | 四盏河灯的提示 |

改完文案后运行一次（把新出现的汉字加进网页字体）：

```bash
python3 tools/subset_fonts.py
```

需要 `pip install fonttools brotli`。不运行也能显示，只是新字会用系统字体。

## 音乐

默认是网页实时合成的水声 + 类古琴拨弦，点「入卷」后才响起，右下角 ♪ 可开关。
想换成自己的音乐：把 mp3 放进 `dist/assets/audio/`，在 `content.js` 里填 `sound.bgm: 'assets/audio/xxx.mp3'`。

## 部署

整个 `dist/` 文件夹就是网站，可以放到任何静态托管上。

- **GitHub Pages**：推送到 `main` 后，`.github/workflows/pages.yml` 会自动把 `dist/` 发布到 https://cjyhjy.github.io/night-voyage/ （一两分钟生效）。
- **Codex 托管**：`.openai/hosting.json` 指向 `dist`，在 Codex 里重新发布即可。

注意：网页上的所有文字（包括信）拿到链接的人都能看到；仓库是公开的，`content.js` 也能在 GitHub 上直接看到。

## 结构

```
dist/
  content.js        全部文案
  index.html
  css/main.css
  js/
    world.js        背景山水：随滚动从深夜到清晨、月亮、雾
    opening.js      入卷 + 小舟开卷（墨色晕开）+「二十」描金
    her.js          第三幕「她」
    twenty.js       第四幕「二十」（巨大的 20 之窗）
    notes.js        第五幕「二十笺」
    wishes.js       第六幕「愿」+ 四盏河灯
    meeting.js      第七幕「相逢」
    letter.js       第八幕「给你」
    dawn.js         第九幕「天明」+ 彩蛋
    fx.js           金色水纹、航迹、墨晕、金粉
    sound.js        声音
    boat.js         俯视小舟
  assets/           图片与裁剪后的字体
tools/
  build_assets.py   由原画生成夜 / 蓝调 / 晨三种调色与雾、宣纸纹理
  subset_fonts.py   裁剪字体
_gpt-original/      之前 GPT 版本的备份
```

字体：思源宋体、马善政楷书、霞鹜文楷，均为 SIL OFL 开源授权。动画库：GSAP（已内置在 `dist/vendor`）。
