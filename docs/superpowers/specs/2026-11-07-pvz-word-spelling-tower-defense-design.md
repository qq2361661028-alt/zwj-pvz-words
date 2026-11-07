# 拼词塔防教学版 — 设计文档

- 日期：2026-11-07
- 状态：五段设计已逐段获批；本文档含自审修订，待用户复核；未进入实施计划
- 代号：`pvz-words`（**内部代号**。对外名称与 UI 文案不得出现"植物大战僵尸 / Plants vs. Zombies"，见 §2）
- 用途：自用（自家孩子），无后端，填词主玩法可完全离线运行

## 1. 目标与非目标

**目标**：网页端塔防游戏。僵尸沿草坪推进，学生**拼对一个英文单词即激活一株植物上阵**；朗读单词可获得临时战斗加成。把英语拼写练习绑进塔防的资源循环里，让"练词"成为唯一的输出手段。

**成功标准**

- 一局 3–5 分钟，能练 8–20 个词
- 语音环节识别失败**永不阻断**游戏进度
- 加一个新词不需要新美术（只改 JSON）
- iPad Safari 上仍能完整玩（仅朗读加成不可用，发音提示仍可用）
- M0 垂直切片可在 3 天内让小孩实际点一轮

**非目标**

- 不使用、不复刻 PopCap/EA 的原版美术、音乐、名称与角色形象
- 无账号、无服务端、无学习数据上报
- 不做竖屏布局（见 D14）
- 不做发音评分（准确度打分需 Azure/讯飞，明确排除）
- 不做多人、排行榜、关卡编辑器
- 原版的"僵尸博士"与小游戏模式不做

## 2. 合规与素材红线

| 事实 | 后果 |
|---|---|
| PvZ 本体不开源；IP、代码、美术、音乐均专有 | 不可复用任何原版资产 |
| 社区复刻全部基于盗用素材：[PvZ-Portable](https://github.com/wszqkzqk/PvZ-Portable)（LGPL-3.0，README 明确"不含任何 PopCap/EA 素材，须自备正版 `main.pak`"）、[pypvz](https://github.com/wszqkzqk/pypvz)（**未声明许可**且 README 写"仅供个人学习研究，不得用于商业用途"）、[PVZ-rs](https://github.com/TC999/PVZ-rs)（GPL-3.0，WIP）、[PvZ-Godot](https://github.com/game-a11y/PvZ-Godot)（许可 NOASSERTION） | 不以任何复刻为底座；自己写玩法层 |
| "Plants vs. Zombies / 植物大战僵尸"是商标 | 项目对外名称与 UI 文案一律不出现这些字样 |
| 游戏机制本身不受版权保护 | 网格推进、阳光经济、lane 战斗可自由实现 |

结论：**基于现有开源复刻改（方案 C）被排除**——剥离侵权素材的工作量大于自写，且它们不含卡牌/填词/语音任何一层。

## 3. 决策记录

| # | 决定 | 理由 |
|---|---|---|
| D1 | 技术栈：Phaser 3 + TypeScript + Vite + vitest，纯静态部署 | 用户选定网页端 |
| D2 | 语音用 Web Speech API `SpeechRecognition`（单次识别，非 continuous） | 零成本零后端；continuous 会长时间挂麦克风，家长敏感 |
| D3 | **架构 A：数据驱动 + 规则层纯函数**，规则模块禁止 import `phaser`（lint 硬锁） | 加内容 = 改 JSON；规则可单测可回放 |
| D4 | 不选 ECS/适配器分层 | 单人自用，不为未出现的平台写驱动 |
| D5 | 核心机制：**单词=卡牌，拼对字母激活植物**（非"合成大西瓜式升阶"、非"拼词即子弹"） | 用户选定，最贴近原版节奏且一局练词量最大 |
| D6 | **植物与单词三层解耦**：`plants.json` / `words.json` / `decks.json` | 素材复用，语言内容可无限扩；词表才是教学瓶颈。配对口径见 §4.1.1（否则会出现"拼 YELLOW 召唤坚果墙"） |
| D7 | 卡牌形态：**底部手牌 5 张 + 焦点卡**（一次只能填最左一张） | 种植是战术决策、填词是学习节奏，两者不互相绑架；强制线性推进词表 |
| D8 | 填词交互：**点选字母块 + 顺序填**（当前槽高亮） | 平板无键盘依赖；不考验打字速度；避免拖拽误操作 |
| D9 | 字母块按**多重集合**生成（`coffee` 需 2 个 `e`、2 个 `f`） | 只按去重集合出块会导致填到中途无块可用 |
| D10 | 干扰字母 **4 级优先级生成 + 种子化随机**，禁用 `Math.random()` | 干扰项必须来自易混字母才有教学价值；可单测、可复现、重玩布局一致 |
| D11 | 语音=**可选加成，不卡进度**；`no_speech`/`error` 不计失败不消耗冷却 | 一次识别失败卡住学生 = 放弃感 |
| D12 | 语音判定：**≥5 字母允许编辑距离 1，≤4 字母要求完全一致**，多候选任一命中即通过 | 短词放宽会奖励错误读音，把错误固化 |
| D13 | 求助阶梯终态是**直接高亮正确字母块**，但记 `assisted`：streak 归零、ease 下调、该关三星不可达 | 给答案可以，但要让"要答案"在数据里留痕，否则错词本被污染 |
| D14 | **横屏 1280×720**（`Scale.FIT`，最小可玩 960×600），竖屏不做 | 5×9 网格 + 字母块在 9:16 里不可读；竖屏变体需重排整套 UI |
| D15 | 发音用运行时 `SpeechSynthesis`，**不预生成词表音频文件** | 零素材零体积；且 iPad 识别不可用时朗读仍可用，分层降级 |
| D16 | 填词**不产出阳光**，阳光只由已激活的 `producer` 植物产出 | 否则会出现"故意拼错"或"拼对无资源"的经济失衡 |
| D17 | 打开填词面板**不暂停游戏**，期间僵尸速度 ×0.85（可配） | 一暂停塔防就退化成"填词软件 + 静止画面"；补偿系数避免被追着打无法思考 |
| D18 | 定步长 tick（1/30 s 累加器），渲染 60 fps 插值 | 逻辑与帧率解耦，才能单测/回放，才不会慢机器上僵尸跑得快 |
| D19 | 存档 localStorage，带 `v` 版本号 + `migrate()`；不上 IndexedDB | 自用规模不需要 |
| D20 | 单 scene 7 态状态机；`result` 区分 `death` 与 `abandoned`，后者不进错词权重 | 混在一起会把整批词误标成错词 |
| D21 | 启动即校验：`validate-content` 不过则**禁止启动游戏**（开发模式给出可点击的错误详情） | 词表/素材错误必须在开局前暴露，不能让孩子在关卡里遇到 |
| D22 | 素材：ImageGen 生成原创卡通 + 抠图脚本 + 三档尺寸；音效 Kenney CC0 | 风格一致且可分享时不必整体换皮 |

## 4. 数据模型

### 4.1 文件划分

```
content/
  plants.json    战斗数值 + 美术资源引用（不含任何语言内容）
  words.json     语言内容（拼写/音标/中文/年级/单元）
  decks.json     绑定关系：哪个植物在这场用哪个词激活 + theme（口径见 §4.1.1）
  waves.json     关卡：僵尸波次 + 词池 id + 植物池 id
  schema/        前三份的 JSON Schema，构建期强制校验
```

### 4.1.1 词与植物的语义配对口径（D6 的必要补充）

解耦带来的副作用必须在这里堵住：`sunflower` 配向日葵理所当然，但词表里绝大多数是颜色、数字、食物、动作词，它们**没有对应的植物形象**。若不立规矩，孩子会看到"拼 `YELLOW` 召唤坚果墙"这种莫名其妙的映射，教学语义就散了。

口径：`decks.json` 的每条配对带 `theme`，构建期校验并按下面三条放行——

```
theme = "plant"    词就是植物名（sunflower / peashooter）→ 只准配同名植物
theme = "unit"     本单元生词（yellow / three / bread）  → 配 generic 植物
theme = "review"   错词复习                          → 配 generic 植物
```

`generic` 是首批 8 株里预留的 2 株**中性苗木**（`sprout` 产阳光 / `bush` 防守），形象不带任何"这就是 X"的暗示，专门承载非植物词。这样做的代价是放弃了"每个词一张专属图"的表现力，换来的是：**300 个词只需要 8 套图**，且映射永远不会自相矛盾。想给某个重点词配专属形象时，走 `theme: "plant"` 新增一株即可，不动其他结构。

### 4.2 `plants.json`

```json
{ "id": "peashooter", "name": "豌豆射手", "art": "assets/plants/peashooter_c.png",
  "cost": 100, "hp": 300, "dps": 20, "range": "front_lane",
  "slot": "shooter", "unlocked_by_default": true }
```

数值单位统一约定：时间以**秒**、伤害以**点**、`dps` 为持续伤害率而非单次。
首批 8 株 = 6 株主题植物 + 2 株 `generic` 中性苗木（`sprout` 产阳光、`bush` 防守），后者专门承载非植物词，见 §4.1.1。
`slot` 枚举：`producer`（产阳光）/ `shooter` / `defense` / `special`。行为由 slot 决定，新增植物不破坏已有平衡判定。

### 4.3 `words.json`

```json
{ "id": "w_sunflower", "word": "sunflower", "zh": "向日葵",
  "ipa": "/ˈsʌnflaʊə/", "grade": 4, "unit": "Unit 3",
  "letters": 8, "distractor_overrides": ["f", "v"],
  "audio_hint": null }
```

- `letters` 是**冗余派生字段但必须存**：布局按它算格宽。构建期断言 `letters === word.length`。
- `distractor_overrides` 可选，用于手工钉死重点易混对（f/v、b/d）；留空则由 §6.2 算法生成。
- `audio_hint` 可选，仅在需要非 TTS 的真人发音时填路径（D15）。

### 4.4 词表清洗规则（构建期**硬错误**，不过即终止）

- 字符集只允许 `a-z`，长度 3–10
- **一律排除含空格、连字符、撇号、数字的词**：`ice cream`、`a.m.`、`don't`、`TV` 直接拒绝（用户拍板；不在运行时想办法拆段——低年级会把两段空格误认为两个词，困惑大于收益）
- 判定一律小写比较，首字母大写只做渲染装饰
- 小写去重：`Sunflower` 与 `sunflower` 不许并存
- 每个词必须被至少一个 deck 引用，孤立词报 warning

### 4.5 运行时卡牌状态（唯一事实来源，可 `JSON.stringify`）

```ts
type CardState = {
  instanceId: number, plantId: string, wordId: string,
  slots: string[],        // 目标字母序列
  filled: number,         // 已填对数量；== slots.length 即激活
  status: "locked" | "filling" | "armed" | "placed" | "dormant",
  assisted: boolean,      // 是否用过 §6.4 阶梯第 3 级
  tiles: { tileId: number, letter: string, used: boolean, disabledUntil: number }[]
}
type HandState = { cards: CardState[], focusIndex: number }   // D7
```

**`status` 的转移只允许这一条链**（渲染层与规则层共用同一张表，任何未列出的转移视为非法并断言失败）：

```
locked ──成为焦点卡──▶ filling ──filled==slots.length──▶ armed ──点格子且阳光足够──▶ placed
  ▲                        │                                  │
  └────手牌补位◀───────────┘                                  └─被啃食 HP=0─▶（实体销毁，卡离开手牌）
filling ──§6.5 降级（布局溢出无法修复）──▶ dormant（终态：本关内不再激活，波次继续）
```

`dormant` **只有 §6.5 降级这一个来源**，不表示"休眠不攻击"之类语义，避免与 `placed` 后被啃食的状态混淆。

### 4.6 存档 `pvzwords.save.v1`

```json
{ "v": 1, "last_played": "2026-11-07",
  "word_stats": { "w_sunflower": { "correct": 7, "wrong": 3, "assisted": 1,
                                    "streak": 4, "ease": 0.62,
                                    "last_seen_ts": 1730000000 } },
  "levels": { "u3_w1": { "best_stars": 3 } },
  "settings": { "speech_enabled": true, "penalty_disable_ms": 2000 } }
```

`v` 递增时走 `migrate(v, data)`。`word_stats` 的三个计数字段（correct/wrong/assisted）彼此独立，三星与复习排序都要用。

## 5. 场景与状态机

```
boot → levelSelect →[loading]→ playing ⇄ paused
                                    ├→ wordPanelOpen   (不暂停，僵尸 ×0.85)
                                    └→ result(death | cleared | abandoned)
```

`boot` 必须 `await document.fonts.ready` 才允许进场景（字体未就绪 → 首帧字形回退 → 字母块宽度全错、布局抖动）。

草坪网格 **5 行 × 9 列**。坐标用 `lane: 0..4` + `x: float (0..9)`，**不做二维像素碰撞**——原版本质是一维推进，去掉 y 轴让 combat 层完全可单测。

## 6. 填词判定与干扰字母

### 6.1 判定纯函数

```ts
submit(state, tileId, now) -> { state', events: Event[] }
// Event = {type:'filled',slot} | {type:'wrong',tileId} | {type:'armed',plantId}
//        | {type:'hint_ladder',level} | {type:'focus_advanced'}
```

规则层只维护数据；动画、音效、震动由渲染层订阅事件执行。

**判定只看 `tile.letter === 下一个待填字母`**，因此若干扰块恰好等于当前所需字母，点它算正确（无害，不是 bug）。

### 6.2 干扰字母生成（命中即停）

```
0) word.distractor_overrides             手工钉死
1) 易混字母表的伙伴字母                  取本词已含字母的混淆对象
2) 同 grade/unit 词库的字母频率          近期常见但非本题的字母
3) 英语字母频率表 + 种子化随机            兜底
```

易混字母表分两类并列：视觉混淆 `b/d p/q n/m u/v i/l`，听觉混淆 `f/v s/z c/k g/j th/sh`。
**从易混表出干扰项才有教学价值**；随机抓个 `q` 塞进 `sunflower` 只是把题目变长。

数量：`distractors = clamp(round(len*0.5), 2, 6)`；总块数 = `len + distractors`；每行最多 12 块，超出换行（数字进布局 token）。

种子：`seed = hash(wordId, deckId)`。**不含日期**——孩子重玩同一关时字母块位置应当完全一致，隔天变化会被感知成"题目偷偷改了"；要做每日变化需显式加 `salt` 并另开决定。要求：单元测试可断言 `(word, deck) → 确定块集合`。

### 6.3 错误反馈

填错时三件事，**不毁卡、不倒退**：该字母块禁用 `settings.penalty_disable_ms`（默认 2000 ms，防连点）；记 `wrong`；波次照常推进（时间压力即惩罚）。阳光不返还。

默认保留 2 秒禁用；设 0 即为纯提示不冻结（家长可关）。

### 6.4 求助阶梯（连错计数在单词内累计）

```
连错 2 次 → 播一次 SpeechSynthesis 标准发音 + 显示音标        (level 1)
连错 4 次 → 高亮下一个正确字母块，并置 card.assisted = true   (level 2)
```

阶梯不消耗任何资源。**自用场景下这是最重要的机制**：孩子独自玩时卡死 5 次就是弃玩，优先级高于任何数值平衡。
`assisted` 后果：streak 归零、`ease` 下调、本关三星评价不可达。

### 6.5 降级链（永不向上传播异常）

`props`/生成失败 → 重试 1 次 → 词过长致布局溢出 → 缩小块字号到下限 → 仍溢出 → 该卡改判为 `dormant` 并跳过，波次继续。**任何情况下不得出现"填不下去"的死局。**

## 7. 规则层模块

```
rules/
  cards.ts      手牌队列 + 焦点卡 + 激活→可放置→已种植（§4.5）
  wordgen.ts    字母块生成（§6.2），种子化 RNG 注入
  economy.ts    阳光产出/消耗/上限：producer 每 12 s 产 25，起始 75，上限 9990
  combat.ts     lane 内 x 递减、取同 lane 最近目标、啃食与碰撞
  waves.ts      时间轴调度 {t, zombie, count, lanes[], flag}，支持大波标记
  speechJudge.ts 语音文本匹配（§8）
```

首批僵尸 4 种：普通 / 路障 / 铁桶 / 旗帜（不带 Boss）。

填词不产生阳光（D16）。

## 8. 语音模块

### 8.1 接口

```ts
interface SpeechProvider {
  available(): "ok" | "insecure" | "unsupported" | "denied";
  recognize(expect: string, opts: {timeoutMs: 8000}): Promise<SpeechResult>;
}
// SpeechResult = { verdict:"pass"|"fail"|"no_speech"|"error",
//                  transcript, confidence, candidates: string[] }
```

实现：`WebSpeechProvider`（`webkitSpeechRecognition`，`continuous=false`、`interimResults=false`、`lang="en-US"`）、`NoopProvider`。将来要发音评分只换实现。

### 8.2 平台硬约束（不可配置）

- 识别仅在 Chrome/Edge 桌面 + Android Chrome 可用；**iPad Safari 不支持 `SpeechRecognition`**
- 必须 HTTPS 或 localhost
- 触发需用户手势；8 秒硬超时自动停
- `SpeechSynthesis`（朗读）在 Safari 可用 → 与识别分开降级（D15）

### 8.3 判定算法

```
1) 归一化：trim + 小写 + 去标点
2) candidates[0..4] 任一命中 → pass            // ASR 常把正确读法排第二
3) len ≥ 5：允许编辑距离 ≤ 1
   len ≤ 4：要求完全一致                        // "sun" vs "fun" 不可容忍
4) transcript 空 或 confidence < 0.40 → no_speech（免费重试一次）
5) 其余 → fail
```

### 8.4 buff 与防刷

通过后该株植物 10 秒内 `dps × 1.25`；全局同时最多 1 个 buff（不叠加）；同一株 30 秒冷却。`no_speech`/`error` 不计入错词统计、不消耗冷却，UI 提示"没听清，再试一次"；只有 `fail` 记一次尝试。

### 8.5 降级可见性（不静默）

`available()` 四态 → UI：`ok` 显示麦克风按钮；`insecure` 置灰 +"请用 https 打开"；`unsupported` 置灰 +"此浏览器不支持语音，请用 Chrome/Edge"；`denied` 置灰 +"麦克风权限被拒，请点地址栏左侧图标开启"。**按钮不隐藏**，隐藏只会让解释多一次。

### 8.6 隐私声明（写进设置页，措辞须准确）

本游戏无服务端、不保存音频。但启用朗读加成时，浏览器会将音频送往其语音识别服务（Chrome 走 Google 服务）。**不得写"完全离线"**——只有主玩法（填词）是离线的。

## 9. 素材

| 类别 | 方案 | 备注 |
|---|---|---|
| 植物/僵尸 | ImageGen 生成原创卡通，固定 style 后缀 + 图生图迭代保持批次一致 | 绝不参考原版形象；`scripts/matting.py` 纯色底抠透明 |
| 尺寸 | 场上 96px / 卡牌 128px / 图鉴 256px，命名 `plant_{id}_{s,c,l}.png` | 构建期校验存在性与尺寸 |
| 发音 | 运行时 `SpeechSynthesis` | 零素材零体积，见 D15 |
| 音效 | Kenney CC0（`fill_ok`/`fill_wrong`/`arm`/`sun_drop`），来源记录在 `assets/CREDITS.md` | 不借植物形状 |
| 字体 | 打包可商用字体（拉丁+中文，或两字体回退栈） | 与 §5 `fonts.ready` 门禁配套 |

## 10. 工程结构

```
pvz-words/
  src/
    rules/        cards wordgen combat economy waves speechJudge   ← 禁止 import phaser
    game/         Scene、实体、动画、输入（只消费 rules 的 events）
    content/      plants.json words.json decks.json waves.json schema/
    ui/           HUD、手牌、焦点卡面板、设置页、结果页
    platform/     speech.ts storage.ts tts.ts
  scripts/        validate-content.ts  matting.py  smoke-checklist.md
  tests/          unit/ integration/ golden/
  vite.config.ts  eslint.config.ts（rules/ 目录 no-restricted-imports: phaser）
```

D3 的纪律**用工具锁住而不是靠自觉**：ESLint 对 `src/rules/**` 禁用 `phaser` 导入。

## 11. 测试

1. **单元**（毫秒级，无浏览器）：填词状态机含 `assisted` 分支、求助阶梯触发计数、干扰块生成、阳光经济、命中判定、语音判定（编辑距离边界 / 短词严格 / 多候选 / `no_speech` 分类）、存档 `migrate`、词表清洗
2. **黄金文件**：`(word, seed) → 字母块布局` 快照；改生成算法立刻看出影响面
3. **集成/可达性**：`rules/` 无渲染跑完整关 fixture，断言「全对可通关」与「全错必失败」两个方向都可达——数值失衡唯一能被机器抓出来的办法
4. **构建期校验**：JSON Schema、`letters === word.length`、字母多重集合自洽、`decks.theme` 与植物 slot 一致（`theme:"plant"` 只准指向同名植物，非植物词必须走 `generic`）、素材存在性与尺寸、孤立词告警、**词长分布报告**（某 unit 中 8 字母以上词占比 > 40% 则告警，难度曲线需手工调序）
5. **人工冒烟清单**：识别质量五种环境（安静 / 有人说话 / 离麦 30 cm / 孩子小声 / 家长代读）+ 手感 + 挫败感观察

**明确不可自动化**：识别真实质量、美术风格一致性、孩子是否觉得好玩。

## 12. 性能预算

2020 年款平板稳定 60 fps · 内存 < 150 MB · 首屏包 < 3 MB · 加载 < 5 s · 单局 3–5 分钟。

## 13. 开放项（均有默认值，不阻塞实施计划）

| # | 项 | 默认（未表态即按此实现） |
|---|---|---|
| O1 | `fill_mode: "free"`（自选槽）要不要做 | 不实现，只保留字段与配置位；默认 `ordered` |
| O2 | 错字母块禁用时长 | 2000 ms，设置页可调至 0 |
| O3 | `dynamic` 复习词池（从 `word_stats` 按"错得多+好久没见"抽词） | **不进 M0–M4**；数据结构（`ease`/`last_seen_ts`）已预留，未来独立立项 |
| O4 | 横屏画幅（D14） | 按 1280×720 实施；若要竖屏变体需另出设计 |
| O5 | 项目根目录与版本管理 | 暂定 `H:\qorder_code\pvz-words`；该目录非 git 仓库，本文档无法提交，是否 `git init` 待定 |

## 14. 风险登记

| 风险 | 影响 | 缓解 |
|---|---|---|
| 干扰块按去重集合生成 | 填到中途无块可用（死局） | §6.1 多重集合断言 + 构建期校验 |
| 词表难度曲线过陡 | 孩子挫败弃玩 | §11-4 词长分布报告 + §6.4 阶梯 |
| 浏览器差异（iPad 无识别） | 语音功能"看起来坏了" | §8.5 置灰 + 明示原因；填词主环不受影响 |
| 误识别给孩子错误奖励 | 错误读音被固化 | §8.3 短词严格 + 多候选；M3 冒烟清单验证 |
| 字体未就绪即渲染 | 字母块宽度全错、布局抖 | `boot` 阶段 `fonts.ready` 门禁 |
| 规则层被 Phaser 侵蚀 | 不可单测、不可回放 | ESLint `no-restricted-imports` 硬锁 |
| 暂停填词退化成打字练习 | 塔防失去意义 | D17 不暂停 + 减速补偿 |
| 词与植物语义错配 | 教学映射失效，孩子觉得莫名其妙 | §4.1.1 `theme` 口径 + §11-4 构建期校验 |
| 无意中用了原版素材 | 侵权 | §2 红线；构建期校验只允许 `assets/` 内生成物 |
| **孩子不玩** | 项目终止 | M0 垂直切片三天内见真手 |

## 15. 交付顺序

**首个实施计划只覆盖 M0**，M1–M4 各自另出计划。

- **M0 垂直切片**：1 关、3 株植物、8 个词、纯色块代替美术、**无语音**。跑通 `填词 → 激活 → 种植 → 一维推进 → 通关/失败`。目的是用孩子的手而不是我们的判断决定要不要继续。
- **M1 词表与填词**：词表清洗校验、干扰块生成与黄金测试、求助阶梯、`assisted` 记账
- **M2 战斗与配平**：8 植物 4 僵尸、波次、经济、可达性测试
- **M3 语音**：Provider 抽象、判定、buff、四态降级、隐私文案
- **M4 素材与打磨**：ImageGen 美术、音效、字体、图鉴与复习入口、性能核验

## 16. 环境事实

已确认：Node v24.22.1、Python 3.12.10、ffmpeg（与本项目无关）。待安装：项目依赖经 npm 安装（Vite、Phaser、vitest、TypeScript），无需系统级依赖。识别与朗读需在 Chrome/Edge 下测试；HTTPS 或 localhost 才可用麦克风。
