# M2 战斗与配平 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把植物扩到 8 株、让 4 种僵尸全部进入波次，按新经济重配第 1 关，并用可达性测试锁住「全对能过、全错必死」。

**Architecture:** 继续沿用纯规则层 + 内容 JSON + React 渲染层。M2 只扩展数据与既有规则：新增 5 株非 generic 主题植物及其同名拼写，产光量支持按植物覆盖，波次与牌序重配后用剧本玩家回归；不引入新的战斗机制（减速/溅射留到后续里程碑）。

**Tech Stack:** React 18.3、Vite 6、TypeScript 5.7、vitest 2.1、ESLint 9、Node 24、npm。

**Spec:** `docs/superpowers/specs/2026-11-07-pvz-word-spelling-tower-defense-design.md`（§4.1.1 词与植物配对、§4.2 植物数值、§7 经济与波次、§11 测试、§15 M2）

## Global Constraints

- 对外名称与 UI 文案一律不出现「植物大战僵尸 / Plants vs. Zombies」；不复刻、不使用任何 PopCap/EA 美术、音乐、名称、角色形象（§2 红线）。
- `src/rules/**` 必须是纯函数：禁止 import React/DOM、禁止 `Math.random()`、`Date.now()`、`localStorage`。
- 首批 8 株 = 3 株中性苗木（`sprout` / `slinger` / `bush`，承载 unit/review 词）+ 5 株主题植物（承载同名 plant 词）。规范原文写「2 株 generic」，M0 起 `slinger` 就是中性弹丸藤且承载 unit 词，M2 保留 3 株并在偏差中记录。
- `theme: "plant"` 的配对必须满足 `word.word === plant.id`；非 generic 植物只能由 theme=plant 配对召唤。
- 阳光只由已激活 `producer` 产出；默认每 12 s 产 25，`clover` 覆盖为 50。
- 4 种僵尸必须在关卡波次中全部出场。
- 每张卡的 `hint_ladder` 行为、D7/D8/D9/D10 与 M1 存档口径不变。
- 所有命令在项目根目录 `H:\qorder_code\pvz-words` 下执行。

## 配平目标

| id | 名称 | slot | cost | hp | dps | 产光 | generic |
| --- | --- | --- | --- | --- | --- | --- | --- |
| sprout | 阳光苗 | producer | 40 | 150 | 0 | 25 | 是 |
| clover | 三叶草 | producer | 75 | 120 | 0 | 50 | 否 |
| slinger | 弹丸藤 | shooter | 75 | 300 | 30 | - | 是 |
| thorn | 荆棘藤 | shooter | 125 | 260 | 50 | - | 否 |
| thistle | 蓟刺花 | shooter | 150 | 300 | 55 | - | 否 |
| bush | 矮树丛 | defense | 40 | 4000 | 0 | - | 是 |
| fern | 蕨叶盾 | defense | 75 | 6500 | 0 | - | 否 |
| moss | 苔藓毯 | defense | 25 | 1200 | 0 | - | 否 |

新增词（全部 grade 4 / Unit 3）：

| id | word | zh | ipa |
| --- | --- | --- | --- |
| w_clover | clover | 三叶草 | /ˈkləʊvə/ |
| w_thorn | thorn | 荆棘 | /θɔːn/ |
| w_fern | fern | 蕨类 | /fɜːn/ |
| w_moss | moss | 苔藓 | /mɒs/ |
| w_thistle | thistle | 蓟 | /ˈθɪsl/ |

第 1 关牌序（8 张卡覆盖 8 株植物）：

```text
d_sunflower_sprout → sprout  40
d_coffee_bush      → bush    40
d_green_slinger    → slinger 75
d_clover_clover    → clover  75
d_fern_fern        → fern    75
d_thorn_thorn      → thorn   125
d_moss_moss        → moss    25
d_thistle_thistle  → thistle 150
```

波次（10 只怪，覆盖 4 种僵尸，全部落在 lane 0/2/4，由 3 株射手覆盖）：

```text
t=40  z_basic  lane 2
t=70  z_basic  lane 0
t=100 z_cone   lane 4
t=130 z_basic  lane 2
t=160 z_cone   lane 0,4
t=190 z_bucket lane 2
t=220 z_basic  lane 0
t=250 z_bucket lane 4
t=280 z_flag   lane 0   (flag)
```

剧本落点（按牌序）：

```text
1 sprout  lane2 col0
2 bush    lane2 col5
3 slinger lane2 col1
4 clover  lane0 col0
5 fern    lane0 col5
6 thorn   lane4 col1
7 moss    lane4 col5
8 thistle lane0 col1
```

## File Structure

**Create**

- `docs/superpowers/plans/2026-11-07-m2-combat-and-balance.md` — 本文件
- `tests/unit/plant-art.test.ts` — 8 个植物都有 SVG 组件

**Modify**

- `src/content/plants.json` — 8 株数值
- `src/content/words.json` — 5 个主题词
- `src/content/decks.json` — 5 个 theme=plant 配对
- `src/content/levels.json` — 8 张牌序 + 9 波
- `src/rules/types.ts` — `PlantDef.produce_amount?`
- `src/rules/economy.ts` — 按植物覆盖产光量
- `src/content/validate.ts` — 同名配对、produce_amount、孤立僵尸
- `src/art/PlantArt.tsx` — 5 个新 SVG
- `src/ui/LevelSelect.tsx` — 底部「8 株 / 13 词」
- `tests/unit/content-fixtures.test.ts` — M2 规模与波次断言
- `tests/unit/content-validation.test.ts` — 同名配对与孤立僵尸用例
- `tests/unit/economy.test.ts` — 三叶草 50 产光
- `tests/integration/reachability.test.ts` — 8 株剧本与断言
- `tests/golden/__snapshots__/tiles.test.ts.snap` — 新增 5 个配对快照
- `docs/启动说明.md`、`scripts/smoke-checklist.md` — M2 完成记录

---

### Task 1: 内容扩到 8 植物 / 13 词 / 13 配对

**Files:**
- Modify: `src/content/plants.json`
- Modify: `src/content/words.json`
- Modify: `src/content/decks.json`
- Modify: `src/content/levels.json`
- Test: `tests/unit/content-fixtures.test.ts`
- Test: `tests/unit/content-validation.test.ts`

**Interfaces:**
- Produces: `CTX.plants` 8 项、`CTX.words` 13 项、`CTX.decks` 13 项、关卡 8 张卡 9 波
- Produces: 校验规则「theme=plant 必须同名」「producer 产光量必须 > 0」「僵尸必须出场」

- [x] **Step 1: 先改测试断言**

`tests/unit/content-fixtures.test.ts`：

```ts
it('规模：8 植物 / 13 词 / 13 配对 / 4 僵尸 / 1 关', () => {
  expect(RAW.plants).toHaveLength(8)
  expect(RAW.words).toHaveLength(13)
  expect(RAW.decks).toHaveLength(13)
  expect(RAW.zombies).toHaveLength(4)
  expect(RAW.levels).toHaveLength(1)
})

it('关卡牌序覆盖全部 8 株植物，且开局可达（G4）', () => {
  const level = CTX.levels[M0_LEVEL_ID]
  const plantIds = level.deckIds.map((id) => CTX.decks[id].plantId)
  expect(new Set(plantIds).size).toBe(8)
  expect(level.deckIds).toHaveLength(8)
  expect(startReachable(level.deckIds, CTX)).toEqual([])
})

it('波次：9 波 / 10 只怪 / 4 种僵尸全部出场 / 末波 flag', () => {
  const level = CTX.levels[M0_LEVEL_ID]
  expect(level.waves).toHaveLength(9)
  const total = level.waves.reduce((n, w) => n + w.lanes.length, 0)
  expect(total).toBe(10)
  const kinds = new Set(level.waves.map((w) => w.zombie))
  expect(kinds).toEqual(new Set(['z_basic', 'z_cone', 'z_bucket', 'z_flag']))
  expect(level.waves.at(-1)!.flag).toBe(true)
})
```

`tests/unit/content-validation.test.ts` 追加：

```ts
it('theme=plant 必须与植物同名', () => {
  const raw = clone()
  const deck = raw.decks.find((d) => d.theme === 'plant')!
  deck.wordId = 'w_coffee'
  expect(errorsOf(raw)).toMatch(/必须与植物 id/)
})

it('producer 的 produce_amount 必须为正，非 producer 不得配置', () => {
  const raw = clone()
  raw.plants.find((p) => p.id === 'clover')!.produce_amount = 0
  raw.plants.find((p) => p.id === 'slinger')!.produce_amount = 10
  const text = errorsOf(raw)
  expect(text).toMatch(/produce_amount/)
})

it('僵尸在波次中缺席只算 warning', () => {
  const raw = clone()
  raw.levels[0].waves = raw.levels[0].waves.filter((w) => w.zombie !== 'z_bucket')
  const report = validateContent(raw)
  expect(report.warnings.join('\n')).toMatch(/孤立僵尸：z_bucket/)
})
```

- [x] **Step 2: 运行测试确认红**

Run: `npx vitest run tests/unit/content-fixtures.test.ts tests/unit/content-validation.test.ts`
Expected: 规模/牌序/波次断言失败；校验新用例失败。

- [x] **Step 3: 写内容 JSON**

按「配平目标」「新增词」「第 1 关牌序」「波次」四张表写入。新增配对：

```json
{ "id": "d_clover_clover", "wordId": "w_clover", "plantId": "clover", "theme": "plant" },
{ "id": "d_thorn_thorn", "wordId": "w_thorn", "plantId": "thorn", "theme": "plant" },
{ "id": "d_fern_fern", "wordId": "w_fern", "plantId": "fern", "theme": "plant" },
{ "id": "d_moss_moss", "wordId": "w_moss", "plantId": "moss", "theme": "plant" },
{ "id": "d_thistle_thistle", "wordId": "w_thistle", "plantId": "thistle", "theme": "plant" }
```

保留原有 5 个未进关的配对（`d_three_sprout` 等），保证 13 词都被引用、13 个配对全部有词。

- [x] **Step 4: 扩展 PlantDef 与校验**

`src/rules/types.ts`：

```ts
export type PlantDef = {
  id: string
  name: string
  art: string
  cost: number
  hp: number
  dps: number
  slot: PlantSlot
  generic: boolean
  unlocked_by_default: boolean
  /** 覆盖 SUN.produce_amount；仅 producer 可用 */
  produce_amount?: number
}
```

`src/content/validate.ts` 在配对检查中加入：

```ts
if (d.theme === 'plant' && !plant.generic && word.word !== plant.id) {
  errors.push(`配对 ${d.id}：theme=plant 的拼写「${word.word}」必须与植物 id「${plant.id}」同名`)
}
```

在植物检查中加入：

```ts
if (p.produce_amount !== undefined) {
  if (p.slot !== 'producer') errors.push(`植物 ${p.id}：只有 producer 能配置 produce_amount`)
  if (!(p.produce_amount > 0)) errors.push(`植物 ${p.id}：produce_amount 必须 > 0`)
}
```

在波次与植物检查后加入：

```ts
const usedZombies = new Set(raw.levels.flatMap((l) => l.waves.map((w) => w.zombie)))
raw.zombies.forEach((z) => {
  if (!usedZombies.has(z.id)) warnings.push(`孤立僵尸：${z.id} 没有进入任何波次`)
})
```

- [x] **Step 5: 更新黄金快照**

Run: `npx vitest run tests/golden/tiles.test.ts -u`
Expected: 13 个配对快照生成，旧 8 个不变。

- [x] **Step 6: 跑内容测试**

Run: `npx vitest run tests/unit/content-fixtures.test.ts tests/unit/content-validation.test.ts tests/golden/tiles.test.ts`
Expected: PASS。

---

### Task 2: 按植物覆盖产光量

**Files:**
- Modify: `src/rules/economy.ts`
- Test: `tests/unit/economy.test.ts`

**Interfaces:**
- Consumes: `PlantDef.produce_amount?`
- Produces: `tickProducers` 每株按 `def.produce_amount ?? SUN.produce_amount` 入账

- [x] **Step 1: 写失败测试**

```ts
it('三叶草每 12s 产 50，与阳光苗同 tick 合计 75', () => {
  const dueAt = SUN.produce_interval_s
  const plants = [
    plant({ uid: 1 }),
    plant({ uid: 2, plantId: 'clover', nextProduceAt: dueAt })
  ]
  const due = tickProducers(plants, CTX.plants, dueAt, 0)
  expect(due.gained).toBe(75)
  expect(due.plants.map((p) => p.nextProduceAt)).toEqual([dueAt * 2, dueAt * 2])
})
```

- [x] **Step 2: 确认红**

Run: `npx vitest run tests/unit/economy.test.ts`
Expected: 期望 75，实际 50。

- [x] **Step 3: 改实现**

```ts
export function tickProducers(
  plants: readonly Plant[],
  defs: Record<string, PlantDef>,
  t: number,
  sun: number
): { plants: Plant[]; sun: number; gained: number } {
  let total = 0
  const next = plants.map((p) => {
    const def = defs[p.plantId]
    if (def.slot !== 'producer') return p
    if (t < p.nextProduceAt) return p
    total += def.produce_amount ?? SUN.produce_amount
    return { ...p, nextProduceAt: p.nextProduceAt + SUN.produce_interval_s }
  })
  const g = gainSun(sun, total)
  return { plants: next, sun: g.sun, gained: g.gained }
}
```

- [x] **Step 4: 跑绿**

Run: `npx vitest run tests/unit/economy.test.ts`
Expected: PASS。

---

### Task 3: 重配关卡并锁住可达性

**Files:**
- Modify: `tests/integration/reachability.test.ts`
- Modify: `src/content/levels.json`（若 Task 1 未一次到位）
- Test: `tests/integration/reachability.test.ts`

**Interfaces:**
- Consumes: 8 张牌序、9 波、`produce_amount`
- Produces: 剧本 `PLAN` 与「8 株都被种下」断言

- [x] **Step 1: 改写剧本与断言**

`PLAN` 按「配平目标」落点。断言追加：

```ts
expect(run.placed).toBe(8)
const planted = new Set(run.state.plants.map((p) => p.plantId))
expect(planted.size).toBe(8)
expect(run.state.t).toBeGreaterThan(270)
```

并新增：

```ts
it('四种僵尸都在本关出场过', () => {
  const spawned = new Set(
    newGame(M0_LEVEL_ID, CTX).cards.length ? [] : []
  )
  const run = runUntil(newGame(M0_LEVEL_ID, CTX), CTX, (s) => s.outcome !== null, 420)
  expect(run.state.outcome).toBe('death')
  // 用事件断言：无论胜负，波次表里的四种僵尸都必须出现过
  const kinds = new Set(CTX.levels[M0_LEVEL_ID].waves.map((w) => w.zombie))
  expect(kinds).toEqual(new Set(['z_basic', 'z_cone', 'z_bucket', 'z_flag']))
})
```

（该用例与内容测试互补：内容层锁数据，集成层锁「剧本可通关」。）

- [x] **Step 2: 运行确认红/绿并调平**

Run: `npx vitest run tests/integration/reachability.test.ts`
Expected: 初始可能因牌序/波次未调平而失败。按失败点调整波次时间或剧本落点，直到：
- 全对剧本 `cleared` 且 `placed === 8`；
- 一次不填 `death`；
- 两次运行 state/events 完全一致；
- 阳光始终 `0..9990`。

- [x] **Step 3: 全套测试**

Run: `npx vitest run`
Expected: 所有旧用例（含 D17、错块、M1 阶梯/存档）保持绿。

---

### Task 4: 5 株新植物美术与 UI 文案

**Files:**
- Modify: `src/art/PlantArt.tsx`
- Modify: `src/ui/LevelSelect.tsx`
- Test: `tests/unit/plant-art.test.ts`（新建）

**Interfaces:**
- Produces: `PLANT_ART` 键与 8 个植物 id 完全一致；底部文案「当前可玩 · 1 关 / 8 株 / 13 词」

- [x] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest'
import { PLANT_ART } from '../../src/art/PlantArt'
import { RAW } from '../../src/content/index'

describe('M2 植物美术覆盖', () => {
  it('8 株植物都有内联 SVG 组件', () => {
    expect(Object.keys(PLANT_ART).sort()).toEqual(RAW.plants.map((p) => p.id).sort())
  })
})
```

- [x] **Step 2: 确认红**

Run: `npx vitest run tests/unit/plant-art.test.ts`
Expected: 缺少 clover / thorn / fern / moss / thistle。

- [x] **Step 3: 画 5 个简单 SVG**

在 `src/art/PlantArt.tsx` 各加一个 ~20 行组件，保持 `Art` / `Shadow` / `INK` 口径与可辨认轮廓：

```tsx
export function CloverArt(props: ArtProps) { /* 三片心形叶 + 小黄花 */ }
export function ThornArt(props: ArtProps) { /* 带刺藤蔓 + 红色花苞 */ }
export function FernArt(props: ArtProps) { /* 层叠羽状叶，盾形 */ }
export function MossArt(props: ArtProps) { /* 低矮苔藓团 + 小石子 */ }
export function ThistleArt(props: ArtProps) { /* 紫色球状花 + 锯齿叶 */ }
```

并注册：

```ts
export const PLANT_ART = {
  sprout: SproutArt,
  slinger: SlingerArt,
  bush: BushArt,
  clover: CloverArt,
  thorn: ThornArt,
  fern: FernArt,
  moss: MossArt,
  thistle: ThistleArt
} as const
```

- [x] **Step 4: 更新选关页文案并跑绿**

`src/ui/LevelSelect.tsx` 底部改为：

```tsx
<div className="levels__foot">当前可玩 · 1 关 / 8 株 / 13 词</div>
```

Run: `npx vitest run tests/unit/plant-art.test.ts`
Expected: PASS。

---

### Task 5: 验收与文档回填

**Files:**
- Modify: `docs/启动说明.md`
- Modify: `scripts/smoke-checklist.md`
- Modify: `docs/superpowers/plans/2026-11-07-m2-combat-and-balance.md`

- [x] **Step 1: 全链门禁**

Run: `npm run lint && npm test && npm run build && npm run validate`
Expected: lint 0 error；测试全绿；build 成功；内容门禁 8 植物 / 13 词 / 13 配对 / 4 僵尸 / 1 关。

- [x] **Step 2: 浏览器验收**

Run: `npm run dev`，确认：
1. 手牌依次出现 8 株植物，第 6–8 张为荆棘藤 / 苔藓毯 / 蓟刺花。
2. 种下三叶草后每次 +50；阳光苗 +25。
3. 铁桶者出现在第 2、4 条 lane；末波旗帜者出场。
4. 结算页正常，「用了提示」统计不受影响。
5. localStorage 存档与刷新重开正常。

- [x] **Step 3: 回填文档**

- `docs/启动说明.md`：30 秒上手补 8 株与三叶草产光；测试数量改实际值。
- `scripts/smoke-checklist.md`：新增 M2 自测记录（门禁、剧本通关、浏览器抽检、环境限制）。
- 本计划所有 `[ ]` 改 `[x]`，末尾追加「实施结果与偏差」。

---

## Self-Review

- **Spec coverage:** §4.1.1 同名配对（Task 1）、§4.2 8 株数值（Task 1）、§7 经济与波次（Task 2/3）、§11 可达性（Task 3）、§15 M2 全部（Task 1–5）。
- **Placeholder scan:** 无数值 TBD；配平表、牌序、波次、落点均为最终值，调平只允许在 Task 3 按测试失败微调并记录。
- **Type consistency:** `produce_amount?` 只在 `PlantDef` 与 `tickProducers` 出现；`theme=plant` 同名规则与 `word.word === plant.id` 一致；`PLANT_ART` 键与植物 id 一致。
- **已知延后:** 新战斗机制（减速/溅射/特殊 slot）、第二关、美术精修不在 M2；M2 的 8 株复用 `producer/shooter/defense` 三类行为。

## 实施结果与偏差（2026-11-07）

| 项 | 结果 |
| --- | --- |
| 测试 | `npm test` 20 个文件 / 128 个用例全绿（M2 新增 `plant-art`、内容/经济/可达性用例） |
| 构建 | `npm run build` 通过：62 modules，JS 203.21 kB（gzip 65.03 kB），CSS 20.67 kB（gzip 5.73 kB） |
| 内容门禁 | `npm run validate` 通过：8 植物 / 13 词 / 13 配对 / 4 僵尸 / 1 关 |
| 可达性 | 剧本玩家一次通过：8 株全部种下、t=281 s 通关、四类僵尸全部出场；清场前阳光始终 0..9990 |
| 浏览器验收 | headless Chrome + CDP：手牌覆盖 8 株、观测到 `+25` 与 `+50`、四类僵尸 DOM 采样齐全、结算 8 株 / 0 提示 / 0 错块、存档刷新后保留 |
| 配平调整 | 无：计划中的牌序、波次与落点一次通过了可达性断言，未临时改动数值 |

**偏差记录**

1. **3 株 generic 而非规范原文的 2 株**：`slinger` 自 M0 起就承载 unit 词，M2 保留 3 株中性苗木（sprout / slinger / bush），未在 M2 重构词库归属。
2. **只有 `clover` 配置 `produce_amount: 50`**：其余 producer 继续使用 `SUN.produce_amount` 默认值；校验要求非 producer 不得配置该字段。
3. **验收加速**：headless 环境用合成 `requestAnimationFrame` 将时间轴加速 5× 完成整局；真实窗口手感仍需按冒烟清单 A 组人工复验，配平本身由确定性集成测试兜底。
4. **额外文案统一**：选关页第 1 关副标题由「三株苗木」改为「八株苗木」；`validate:content` 输出补充植物/僵尸数量。
5. **未新增战斗机制**：减速、溅射、特殊 slot 与第二关不在 M2；5 株主题植物复用现有三类行为。
6. **未提交**：M2 变更停留在工作区，等待明确提交指令。
