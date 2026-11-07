# 角色美术提示词与复核记录

生成日期：2026-11-07
工具：ImageGen（1024×1024），抠图与三档缩放：`scripts/matting.py`（Pillow）

全部角色均为本项目原创生成，不含任何第三方游戏素材，也不以任何既有游戏角色为原型。

## 统一样式段

以下所有提示词均追加同一段样式：

```text
Style: hand-painted gouache texture, clean thick dark-brown outlines, soft cel shading, warm saturated palette, cute rounded shapes, full body, three-quarter view facing right, centered, isolated on pure white background, no shadow, no ground, no text, no watermark, no resemblance to any existing game character, 1024x1024.
```

## 植物锚图：sprout

```text
Original children's storybook game character: a tiny sprout creature with two broad rounded green leaves at the base, a short sturdy stem, and a glowing golden round bud on top with a gentle smiling face. Warm yellow glow around the bud, cute and friendly.

Style: hand-painted gouache texture, clean thick dark-brown outlines, soft cel shading, warm saturated palette, cute rounded shapes, full body, three-quarter view facing right, centered, isolated on pure white background, no shadow, no ground, no text, no watermark, no resemblance to any existing game character, 1024x1024.
```

## 其余植物（以 sprout.png 为参考图）

| 文件 | 提示词主体 |
| --- | --- |
| `slinger.png` | A coiled green vine creature with two leaf arms; a curly tendril holds a trumpet-shaped berry pod pointing to the right like a natural launcher. Small determined face on the main vine. No projectiles. |
| `bush.png` | A low, wide defensive bush made of three rounded leafy clumps, with two small pebble-like eyes and a sturdy stance. Calm and dependable. |
| `clover.png` | A cheerful three-leaf clover creature with heart-shaped leaves and a tiny yellow flower on top; short stem and small roots. |
| `thorn.png` | A thorny vine creature with a segmented stem, small sharp thorns, and a red flower bud at the tip pointing right; cute but prickly. |
| `thistle.png` | A purple globe thistle creature with a round spiky flower head, jagged leaves, and a short stem; the flower head aims to the right. |
| `fern.png` | A shield-shaped cluster of layered fern fronds, wide and low, with a protective stance; fresh green fronds with visible veins. |
| `moss.png` | A low fluffy moss carpet creature with a rounded mossy body, tiny pebbles and spore capsules on top, and two small sleepy eyes. |

复核重生成记录：

- `bush.png`：第一、二版受参考图影响带金色花苞，改为纯文生图并强调“全绿叶、无金色花苞、无发光花、无果实”后通过。
- `clover.png`：第一版头部为圆形、丢失三叶特征，重生成并强调“三片心形叶组成头部”后通过。

## 僵尸锚图：z_basic

```text
Original children's storybook game character: a gentle clumsy wanderer with sage-green skin, messy dark hair, a patched slate-blue hoodie, dark trousers, and one arm outstretched, shambling forward. Friendly-spooky, not scary, no blood, no wounds.

Style: hand-painted gouache texture, clean thick dark-brown outlines, soft cel shading, warm saturated palette, cute rounded shapes, full body, three-quarter view facing right, centered, isolated on pure white background, no shadow, no ground, no text, no watermark, no resemblance to any existing game character, 1024x1024.
```

## 僵尸变体（以 z_basic.png 为参考图）

| 文件 | 追加描述 |
| --- | --- |
| `z_cone.png` | The same wanderer wearing a bright orange traffic cone as a hat. |
| `z_bucket.png` | The same wanderer wearing a dented silver metal bucket as a helmet. |
| `z_flag.png` | The same wanderer holding a small tattered red pennant on a wooden stick. |

## 接触表复核结论

复核对象：`art-source/plants-sheet.png`、`art-source/zombies-sheet.png`。

- 白边：抠图后白色背景全部清除，边缘保留 1px 内缩与轻微羽化，未见明显白边。
- 比例：12 个角色统一为正方形画布，角色占画面约 88%，底部留白一致。
- 朝向：均朝右或右侧三分之四视角，与子弹/前进方向一致。
- 轮廓区分度：8 株植物在 96px 缩略下仍可凭轮廓区分（花苞、喇叭藤、三叶、盾状蕨、绒苔、蓟球、荆棘藤、灌木）。
- 影射检查：未发现与任何既有游戏角色相似的形象；无血迹、伤口、文字或水印。
- 三档尺寸由同一母版 LANCZOS 缩放：`s=96`、`c=128`、`l=256`。
