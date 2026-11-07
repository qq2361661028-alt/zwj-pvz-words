# 拼词小院 M4 素材与打磨设计

- 日期：2026-11-07
- 状态：已与产品方逐节确认，待实施
- 上游总设计：[2026-11-07-pvz-word-spelling-tower-defense-design.md](./2026-11-07-pvz-word-spelling-tower-defense-design.md)
- 前置里程碑：M0–M3 已完成并推送（`cbd8324`）

## 1. 目标

把 M0–M3 的「玩法可用」升级为「可以拿给孩子玩」：

1. 12 个原创角色从 SVG 占位换成风格统一的正式 PNG（场上 96 / 手牌 128 / 图鉴 256）。
2. 加入 6 个 CC0 短音效，可在设置中关闭。
3. 字体从 Google Fonts 外链改为自托管，消除首屏网络依赖与字母块宽度跳动。
4. 新增图鉴与只读复习表，让家长看得到学习记录。
5. 性能与打磨：首屏预算门禁、FPS 观测面板、冻结时长可调、减少动态效果偏好。

非目标：动态复习词池（O3）、竖屏布局（O4）、正式关卡编辑器、商业化字体子集化工具链。

## 2. 决策摘要

| 主题 | 决策 | 放弃的方案与原因 |
| --- | --- | --- |
| 角色美术 | ImageGen 生成原创卡通 PNG，白底出图 + Pillow 抠图，三档尺寸 | 继续手绘 SVG：上限低；混合背景图：本次不做场景插画 |
| 音效 | Kenney CC0（Interface Sounds + UI Audio），转 MP3 兼容 Safari | WebAudio 合成：音色单薄；在线音频：引入网络依赖 |
| 字体 | `@fontsource-variable/nunito` + `@fontsource/luckiest-guy` 自托管拉丁字体，中文系统栈 | 打包中文 WebFont：体积数 MB，违背首屏预算；继续 CDN：离线不可用 |
| 图鉴/复习 | 一个图鉴浮层四个页签（植物/僵尸/单词/复习），复习只读 | 动态错词关卡：超出 O3；独立路由：当前应用没有路由库 |
| 性能 | 构建期预算门禁 + `?perf=1` 面板 + 人工平板核验 | 只靠人工目测：无法回归 |

## 3. 美术

### 3.1 风格与红线

- 统一风格：温暖手绘绘本感、粗深棕描边（沿用 `INK = #2b1a0b`）、柔和赛璐璐阴影、微纸纹；角色 3/4 侧身朝右、全身居中、纯白背景、无投影/文字/水印。
- 红线：提示词与生成图不得出现、模仿或影射任何既有游戏角色/名称；不引用任何原版素材。角色设定以现有 SVG 为准（见 3.2）。
- 不生成原版「红领带绿皮僵尸」等标志性组合；慢步者保持本项目既有的「鼠尾草绿皮肤 + 乱发 + 石板蓝连帽衫」设定。

### 3.2 角色清单

| id | 名称 | 视觉锚点 |
| --- | --- | --- |
| sprout | 阳光苗 | 两片宽叶、顶端金色发光圆芽、短茎、微笑 |
| slinger | 弹丸藤 | 盘曲藤蔓、卷须托着朝右的喇叭果、叶片手臂 |
| bush | 矮树丛 | 三团低矮灌木、小石子眼睛、敦实站姿 |
| clover | 三叶草 | 三片心形叶、顶部小黄花 |
| thorn | 荆棘藤 | 带刺藤鞭、顶端红色花苞朝右 |
| thistle | 蓟刺花 | 紫色球状花冠、锯齿叶、朝右 |
| fern | 蕨叶盾 | 层叠羽状叶组成盾形、宽矮防守姿态 |
| moss | 苔藓毯 | 低矮苔藓团、小石子与孢蒴 |
| z_basic | 慢步者 | 鼠尾草绿皮肤、乱发、补丁连帽衫、前伸双臂 |
| z_cone | 路障者 | 慢步者 + 橙色交通锥帽 |
| z_bucket | 铁桶者 | 慢步者 + 凹陷金属桶头盔 |
| z_flag | 旗帜者 | 慢步者 + 木杆红色小旗 |

### 3.3 生成与评审流程

1. **锚图**：只生成 `sprout`，1024×1024；产品方确认风格后才继续。
2. **植物批次**：以锚图为参考图，生成其余 7 株（ImageGen 支持 image-to-image，参考图最多 3 张）。
3. **僵尸锚图**：生成 `z_basic`，确认后以它为参考生成 3 个变体。
4. **接触表**：植物/僵尸分别拼成 `art-source/plants-sheet.png`、`art-source/zombies-sheet.png`（各 256px），产品方整体复核；不满意单张重生成。
5. **提示词存档**：`assets/ART_PROMPTS.md` 记录风格后缀与每个角色的完整提示词。

统一风格后缀（英文，供 ImageGen）：

```text
Original children's storybook game character, hand-painted gouache texture,
clean thick dark-brown outlines, soft cel shading, warm saturated palette,
cute rounded shapes, full body, three-quarter view facing right, centered,
isolated on pure white background, no shadow, no ground, no text, no watermark,
no resemblance to any existing game character, 1024x1024
```

### 3.4 抠图与尺寸

`scripts/matting.py`（Python 3 + Pillow 12）：

1. 从四角泛洪（阈值 28）把纯白底标为透明。
2. alpha 通道最小值滤波 3×3，再高斯模糊 0.6px，去掉白边。
3. 按内容 bbox 裁切，四周留 6% 透明边距，补成正方形。
4. Lanczos 缩放到 256 / 128 / 96，输出 PNG。

产物：

```text
public/assets/plants/{id}_{l,c,s}.png   256 / 128 / 96
public/assets/zombies/{id}_{l,c,s}.png  256 / 128 / 96
```

- `art-source/` 只保存 1024 原图，加入 `.gitignore`，不推送（仓库体积）。
- 最终 256px 是最小可复用母版；96/128 由脚本从 256 生成。

### 3.5 数据模型与渲染

- `PlantDef.art` 已存在（`assets/plants/{id}_s.png`），保留字段作为路径基准。
- `ZombieDef` 新增 `art: string`，四只僵尸写入 `assets/zombies/{id}_s.png`。
- 新增 `src/art/CharacterArt.tsx`：
  - `artSrc(base, tier)`：把内容里的基准路径 `assets/.../{id}_s.png` 换成 `_s/_c/_l`，并补前导 `/`。
  - `<CharacterArt art tier size alt lazy>`：输出 `<img draggable={false}>`，`width/height` 明确，`object-fit: contain`。
- 接入点：
  - `GameScreen` 场上植物：96（`_s`），保持 `is-buffed` 金环。
  - `HandCard`：128（`_c`）。
  - `LevelSelect` 选关卡三株展示：128（`_c`）。
  - `GameScreen` 僵尸：`_s`，高度约 104。
  - `CodexOverlay`：256（`_l`），`loading="lazy"`。
- SVG 保留：UI 图标与选关页场景（Sky/House/GrassTufts）；角色位一律 PNG，不再使用 SVG 植物/僵尸。
- 不做运行时回退：资产缺失由构建期门禁拦截；开发期缺图会显示破图，属于预期。

### 3.6 资产校验

`scripts/validate-assets.ts`（Node，挂到 `npm run validate:content`）：

- 每个植物/僵尸必须存在 `_s/_c/_l` 三张。
- PNG IHDR 尺寸必须分别为 96/128/256（正方形）。
- 单文件 ≤ 200KB，全部角色图合计 ≤ 2MB。
- `public/assets/CREDITS.md` 必须存在。
- 纯函数导出 `pngSize(buf)`、`tierPaths(base)`，以及 `validateAssets(content, root)`，配单元测试。

## 4. 音效

### 4.1 素材与许可

- 来源：Kenney「Interface Sounds」与「UI Audio」，CC0 1.0，官网 `https://kenney.nl`。
- 转换：ffmpeg 转 MP3 96kbps 单声道，兼容 iPad Safari；总大小目标 < 120KB。
- 落盘：`public/assets/audio/{name}.mp3`；`public/assets/CREDITS.md` 记录包名、作者、许可、源 URL。

### 4.2 事件映射

| 事件 | 音效文件 | 原素材 |
| --- | --- | --- |
| `filled`（填对字母） | `fill_ok.mp3` | Interface Sounds `confirmation_001` |
| `wrong`（填错字母） | `fill_wrong.mp3` | Interface Sounds `error_004` |
| `armed`（拼完待种） | `arm.mp3` | Interface Sounds `confirmation_002` |
| `placed`（种下） | `plant.mp3` | Interface Sounds `drop_001` |
| `sun_gained`（产阳光） | `sun_drop.mp3` | Interface Sounds `pluck_001` |
| `zombie_died`（僵尸倒下） | `zombie_die.mp3` | Interface Sounds `scratch_001` |

纯函数 `sfxForEvent(event): SfxName | null` 放在 `src/ui/sfx.ts`，不在规则层，便于单测。

### 4.3 播放实现

`src/platform/audio.ts`：

- 懒加载：首次 `unlock()`（用户 `pointerdown`）时创建 6 个 `Audio` 元素并 `preload = 'auto'`。
- `volume = 0.35`；`play(name)` 先 `currentTime = 0`，`play().catch(() => {})`。
- `setEnabled(false)` 立即静音；不销毁实例。
- 浏览器不支持/播放失败：静默，不弹错、不影响游戏。
- iOS 解锁：必须在真实用户手势内调用；`GameScreen` 挂一次性 `pointerdown` 监听。

### 4.4 存档 v2

```ts
SAVE_VERSION = 2
settings: {
  speech_enabled: boolean
  sound_enabled: boolean   // 新增，默认 true
  penalty_disable_ms: number
}
```

- `migrateSave` 接受 `v === 1 || v === 2`；v1 补 `sound_enabled: true`，其余字段原样迁移。
- 损坏、未知版本、未来版本仍回退空存档，不抛异常。
- 测试覆盖：v1 迁移保留 `word_stats`、v2 往返、布尔字段容错。

## 5. 字体

- 依赖：`@fontsource/luckiest-guy@5.3.0`、`@fontsource-variable/nunito@5.3.0`。
- 导入：`main.tsx` 顶部默认导入两个包（Luckiest Guy 400 与 Nunito Variable wght，变量字体一个文件覆盖 200–1000）。
- 移除 `index.html` 中 Google Fonts 的 3 个 `<link>`；首屏不再有第三方请求。
- Fontsource 变量包的族名是 `'Nunito Variable'`，同步更新 `src/styles/tokens.css` 的 `--font-display` / `--font-body`。
- 中文字体继续走 `--font-body` 的系统栈（PingFang SC / Microsoft YaHei）。
- 启动门禁 `src/platform/fonts.ts`：

```ts
waitForFonts(doc = document, timeoutMs = 1500): Promise<boolean>
```

  依次 `doc.fonts.load('400 16px "Luckiest Guy"')`、`doc.fonts.load('700 16px "Nunito Variable"')`、`doc.fonts.load('900 16px "Nunito Variable"')`，再等 `fonts.ready`；超时 1.5s 后照常渲染（不阻断）。
- `main.tsx` 改为 `waitForFonts().finally(() => root.render(...))`；内容校验仍在渲染前执行。
- 验收：Network 面板无 `fonts.googleapis.com` / `fonts.gstatic.com` 请求；字母块宽度稳定。

## 6. 图鉴与复习

### 6.1 入口与结构

- 选关页底部按钮组：`图鉴`、`复习`、`设置`。
- 两个入口打开同一个 `CodexOverlay`，初始页签分别为 `plants` / `review`。
- 页签：植物（8）/ 僵尸（4）/ 单词（13）/ 复习。
- 关闭：右上角按钮、Esc、点击遮罩。

### 6.2 内容规格

- 植物卡：256px 图、名称、定位（产光/射手/防御）、阳光/HP/DPS/产光量、可被哪些词召唤（来自 `decks`）。
- 僵尸卡：256px 图、名称、HP/速度/DPS、首次出现波次时间（来自 `levels.waves`）。
- 单词卡：单词、中文、音标、字母数、年级/单元、朗读按钮（复用 `speakWord`，受 `speech_enabled` 控制）、学习统计摘要。
- 复习表列：单词 / 正确 / 错误 / 提示 / 连对 / 最近（本地时间 `YYYY-MM-DD HH:mm`）。
  - 只显示有任一计数或 `last_seen_ts > 0` 的词。
  - 按 `last_seen_ts` 降序，同时间按单词升序。
  - 空态：「还没有学习记录，去拼几个单词吧」。

### 6.3 纯函数

`src/rules/review.ts`：

```ts
export type ReviewRow = {
  wordId: string
  word: string
  zh: string
  correct: number
  wrong: number
  assisted: number
  streak: number
  lastSeen: number
}
export function reviewRows(save: SaveData, words: readonly WordDef[]): ReviewRow[]
```

- 忽略词表中不存在的存档 id（防旧档脏数据）。
- 不做抽词、不写存档。

## 7. 性能与打磨

### 7.1 预算

- `dist/` 总计预算（js + css + 字体 + 全部图片 + 音频 + 其他，不含 sourcemap）≤ 3MB；按整个产物统计，不按首屏请求切分。
- 单个 JS chunk 原始体积 ≤500KB（比 gzip 口径更严）。
- 目标：2020 款平板 60fps；单局 3–5 分钟；内存 < 150MB。

### 7.2 观测

- `?perf=1` 时 `GameScreen` 右上角显示 FPS、p95 帧时、植物/僵尸数量，每 500ms 刷新。
- 纯函数 `summarizeFrames(samples, elapsedMs)` 输出 `{fps, p95}`，配单测。
- 正式验收用 CDP 跑 30 秒采样 + 人工 iPad/Android 各一局。

### 7.3 构建门禁

`scripts/check-budget.mjs`：

- 遍历 `dist/`，按类型汇总大小；输出表格。
- 总预算 > 3MB 或最大 JS chunk 原始体积 > 500KB 时退出码 1。
- 新增 `npm run check:budget`，并加入 `npm run build` 之后的手工验收步骤（不改变 build 脚本本身）。

### 7.4 设置页

- 音效开关：`sound_enabled`，默认开，落盘。
- 拼错冻结：`0 / 1000 / 2000 ms` 三档，默认 2000，落盘；写入 `GameState.penaltyMs`，规则层 `submit(..., penaltyMs)` 使用该值。
- 保留朗读开关与隐私说明。

### 7.5 减少动态效果

`@media (prefers-reduced-motion: reduce)`：

- 关闭金色 buff 脉冲、面板抖动、toast 滑入。
- 保留颜色变化与静态金环，确保状态仍可辨认。

## 8. 测试与验收

### 8.1 自动化

| 层 | 用例 |
| --- | --- |
| 单测 | 存档 v1→v2 迁移、v2 往返、`sfxForEvent` 映射、`reviewRows` 过滤/排序、`pngSize`/资产路径、`summarizeFrames`、`waitForFonts` 超时 |
| 规则 | 自定义冻结时长写入 `disabledUntil`；`newGame` 保存 `penaltyMs` |
| 门禁 | `lint`、`tsc --noEmit`、`npm test`、`npm run build`、`npm run validate`（含资产）、`node scripts/check-budget.mjs` |

### 8.2 浏览器验收

1. 12 个角色在场上/手牌/图鉴分别加载 96/128/256，无破图，控制台无 404。
2. 音效：点击字母有反馈；设置关闭后无声；刷新后保持关闭。
3. 字体：无 Google Fonts 请求；首屏字母块宽度与刷新后一致。
4. 图鉴：四页签切换、朗读按钮、植物/僵尸数值与内容 JSON 一致。
5. 复习：无记录空态；拼词后出现一行，计数与结算页一致。
6. 冻结时长：设为 0 后错字母块不再禁用；设为 2s 恢复。
7. `?perf=1`：面板出现且数值变化；正常模式不显示。
8. 减少动态效果：模拟 `prefers-reduced-motion` 后无脉冲/抖动。

### 8.3 人工

- iPad Safari / Android Chrome 横屏各一局，记录 FPS 与手感。
- M3 五环境语音清单继续有效，不受 M4 影响。
- 孩子实测 D1–D4（若条件允许）。

## 9. 风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| ImageGen 12 张风格漂移 | 画面不统一 | 锚图确认 + 参考图生成 + 接触表复核；单张重生成 |
| 抠图白边/毛刺 | 角色脏边 | 深色描边天然遮边 + alpha 腐蚀/羽化；256 母版人工抽查 |
| 角色图和原版撞形象 | IP 风险 | 提示词明确禁止影射；沿用本项目既有设定；接触表人工过红线 |
| 包体超 3MB | 首屏变慢 | PNG 尺寸与单文件上限、字体只取拉丁、codex 大图懒加载、门禁脚本 |
| 音频被浏览器自动播放策略拦截 | 首次无声 | 首次 pointerdown 解锁；失败静默；设置可关 |
| 存档升 v2 丢旧档 | 学习记录丢失 | v1 迁移单测 + 浏览器旧档实测 |
| 冻结时长可调破坏平衡 | 孩子可关惩罚 | 默认 2s；设置入口在选关页，家长可调 |

## 10. 明确不做

- 动态复习词池与错词关卡（O3）。
- 竖屏布局（O4）。
- 背景/场景 ImageGen 插画（本次只做角色）。
- 中文 WebFont 打包。
- 音乐、配音、环境音。
- 图鉴解锁进度/收集系统（图鉴全量可见）。
