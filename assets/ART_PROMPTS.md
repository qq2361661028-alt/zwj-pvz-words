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
- `slinger.png`：保留了暖金色花苞头作为植物家族的统一特征，脸部在花苞上而非初始提示词所说的“主藤上的脸”；喇叭果与盘藤仍构成明确的发射者轮廓，按已确认的家族风格保留。

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

## 抠图管线

`scripts/matting.py` 的处理顺序：

1. 从画布四边所有近白像素出发做连通域泛洪，去掉与边界相连的白色背景。
2. 检测闭合轮廓内的细长纯白区域（例如 `slinger` 盘藤圈内孔），将其并回背景；圆形小块（眼睛高光）保持不透明。
3. 对背景边缘 2px 内的浅色像素按“离白色的距离”计算软 alpha，避免硬切边。
4. 从透明边界向内逐层清除描边外的低饱和亮色光晕（`min ≥ 205` 且饱和度 ≤ 70，覆盖奶白与暖金光晕环），只作用于深色描边外侧，不触碰角色内部高光；饱和度 >70 的纯黄装饰光点保留。
5. alpha 经 3×3 最小值滤波后再清一次边缘，然后做 0.6px 高斯羽化。
6. 半透明边缘像素继承最近不透明像素的颜色，并清除残留的浅色低透明度光雾，避免在深色或绿色底上渗出白边。
7. 裁切、居中、留 6% 边距，用 LANCZOS 生成 `s=96 / c=128 / l=256` 三档。
8. 每档缩放后清除 LANCZOS 振铃产生的漂浮浅色微点（alpha ≤ 6 的纯白像素，以及不与本体相连的浅色低透明度连通域），避免深底上出现白色虚线。

## 接触表复核结论

复核对象：`art-source/plants-sheet.png`、`art-source/zombies-sheet.png`；另在草坪绿底上检查 12 个角色的 `s` 档，并对 `sprout_l`、`slinger_l` 做 8 倍放大复查。

- 白边：白色背景已清除；`sprout` 锚图曾在绿底上出现奶白硬边与光晕虚线，当前管线已移除暖金光晕环与缩放振铃微点，8 倍绿底复查无漂浮白色残留（角色自身的白色高光与纯黄装饰光点保留）；`slinger` 盘藤闭环内的白底块已并入透明区域。
- 比例：12 个角色统一为正方形画布，最长边约占 91–94%，短边 57–88%（`thorn` 最窄），底部留白逐档一致。
- 朝向：均朝右或右侧三分之四视角；所有角色源图统一朝右生成。僵尸在场上是向左推进的，因此只对场上僵尸美术做水平镜像（`.zombie .character-art { transform: scaleX(-1) }`，见 `src/ui/game.css`）；图鉴有意展示未镜像的源图。重新生成时必须保持僵尸源图朝右，否则会双重镜像。
- 轮廓区分度：8 株植物在 96px 缩略下仍可凭轮廓区分（花苞、喇叭藤、三叶、盾状蕨、绒苔、蓟球、荆棘藤、灌木）；4 个漫游者在 96px 下可凭帽子/旗帜区分。`bush` 的眼睛在 96px 下对比度偏低，属可接受损失。
- 影射检查：未发现与任何既有游戏角色相似的形象；无血迹、伤口、文字或水印。锥帽/铁桶/旗帜仅为通用道具语义，形象、配色与构图均为原创。
- 三档尺寸由同一母版 LANCZOS 缩放：`s=96`、`c=128`、`l=256`。
