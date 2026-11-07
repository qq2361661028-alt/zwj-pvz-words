# M1 词表与填词 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 M1：词表清洗门禁可独立运行，干扰字母按四级优先级生成并有黄金快照，连错求助阶梯可用，`assisted` 通过 v1 存档真实记账。

**Architecture:** 继续沿用「纯规则层 + React 渲染层 + 启动内容校验」：`src/rules/wordgen.ts` 负责确定性干扰块，`src/rules/cards.ts` 负责填词与阶梯状态，新增 `src/rules/stats.ts` 纯统计函数；`src/platform/` 只放朗读与 localStorage 适配。UI 订阅事件显示提示并把统计写入存档。

**Tech Stack:** React 18.3、Vite 6、TypeScript 5.7、vitest 2.1、ESLint 9、Node 24、npm。

**Spec:** `docs/superpowers/specs/2026-11-07-pvz-word-spelling-tower-defense-design.md`（§4.4 词表清洗、§4.6 存档、§6.2 干扰字母、§6.4 求助阶梯、§15 M1）

**状态（2026-11-07）：已实施完成。** 19 个测试文件 / 122 个用例全绿；四道门禁通过。浏览器自测记录见 [scripts/smoke-checklist.md](../../../scripts/smoke-checklist.md)，实现偏差见文末。

## Global Constraints

- 对外名称与 UI 文案一律不出现「植物大战僵尸 / Plants vs. Zombies」；不复刻、不使用任何 PopCap/EA 美术、音乐、名称、角色形象（§2 红线）。
- `src/rules/**` 必须是纯函数：禁止 import React/DOM、禁止 `Math.random()`、`Date.now()`、`localStorage`；种子只用 FNV-1a + mulberry32。
- 内容 JSON 必须通过 D21 校验才能进入游戏；词只允许小写 `a-z`，长度 3–10，`letters === word.length`。
- 阳光只由已激活的 `producer` 产出：起始 75、上限 9990、每 **12 s** 产 25；填词不产出阳光（D16；2026-11-07 已从 24 s 提速 ×2）。
- D7：手牌 5 张，只能填最左侧焦点卡；D8：按顺序点字母块；D9：牌面按多重集合生成；O2：点错禁用 2000 ms；D10：同一 `(wordId, deckId)` 牌面完全一致。
- 每张卡的 `hint_ladder` 事件每级只发一次；level 2 必须置 `assisted = true`。
- 执行前先跑 `npm test` 确认基线全绿；所有命令在项目根目录 `H:\qorder_code\pvz-words` 下执行。

## File Structure

**Create**

- `scripts/validate-content.ts` — 独立内容门禁，错误退出码 1
- `src/platform/speech.ts` — `speakWord`，无 SpeechSynthesis 时静默降级
- `src/rules/stats.ts` — `WordStat` / `SaveData` / 纯统计与 migrate
- `src/platform/save.ts` — localStorage 读写与本地日期
- `tests/unit/hints.test.ts` — 阶梯、`assisted`、`hintedTileIds`
- `tests/unit/stats.test.ts` — 记账纯函数
- `tests/unit/save.test.ts` — 存档读写/migrate
- `tests/golden/tiles.test.ts` — 8 个配对的牌面快照
- `tests/golden/__snapshots__/tiles.test.ts.snap` — 快照产物

**Modify**

- `src/content/validate.ts` — grade/unit、大小写去重
- `src/rules/wordgen.ts` — 四级干扰算法
- `src/rules/cards.ts` — 阶梯状态、`hintedTileIds`
- `src/rules/types.ts` — `hint_ladder` 事件
- `src/rules/constants.ts` — 阶梯阈值
- `src/ui/WordPanel.tsx` — 音标强调、正确字母高亮、已用提示
- `src/ui/GameScreen.tsx` — 朗读、统计记账、结果页计数
- `src/ui/ResultOverlay.tsx` — 「用了提示」统计
- `src/ui/game.css` — 提示样式
- `tests/unit/content-validation.test.ts` — 清洗规则测试
- `tests/unit/wordgen.test.ts` — 四级算法测试
- `tests/unit/constants.test.ts` — 阶梯阈值
- `package.json` — `validate:content` / `validate`
- `docs/启动说明.md`、`scripts/smoke-checklist.md` — M1 操作与验收

---

### Task 1: 内容清洗门禁与独立脚本

**Files:**
- Modify: `src/content/validate.ts`
- Create: `scripts/validate-content.ts`
- Modify: `package.json`
- Test: `tests/unit/content-validation.test.ts`

**Interfaces:**
- Consumes: `validateContent(raw): { errors: string[]; warnings: string[] }`（已有）
- Produces: npm scripts `validate:content`（脚本）与 `validate`（脚本 + 内容测试）

- [x] **Step 1: 写失败测试**

在 `tests/unit/content-validation.test.ts` 的 `describe` 内追加：

```ts
  it('词表清洗：空格/连字符/撇号/数字/大写一律拒绝', () => {
    const raw = clone()
    const bad = ['ice cream', "don't", 'a.m.', 'TV', 'three3']
    raw.words = [
      ...raw.words,
      ...bad.map((word, i) => ({
        id: `w_bad_${i}`,
        word,
        zh: '坏词',
        ipa: '/x/',
        grade: 4,
        unit: 'Unit 3',
        letters: word.length
      }))
    ]
    const text = errorsOf(raw)
    bad.forEach((word) => expect(text).toContain(`只允许 a-z（实际 ${word}）`))
  })

  it('词表清洗：拼写去重按小写口径', () => {
    const raw = clone()
    raw.words[1] = { ...raw.words[1], word: 'Sunflower', letters: 9 }
    const text = errorsOf(raw)
    expect(text).toMatch(/只允许 a-z/)
    expect(text).toMatch(/同一拼写/)
  })

  it('词表清洗：grade 必须为正整数，unit 不能为空', () => {
    const raw = clone()
    raw.words[0].grade = 0
    raw.words[1].unit = '  '
    const text = errorsOf(raw)
    expect(text).toMatch(/grade 必须是正整数/)
    expect(text).toMatch(/unit 不能为空/)
  })
```

- [x] **Step 2: 运行测试确认红**

Run: `npx vitest run tests/unit/content-validation.test.ts`
Expected: 第 2 条因 `/同一拼写/` 红，第 3 条因 grade/unit 红；第 1 条应绿（现有 a-z 规则已覆盖）。

- [x] **Step 3: 补强校验**

在 `src/content/validate.ts` 的 `raw.words.forEach` 中追加：

```ts
    if (!Number.isInteger(w.grade) || w.grade <= 0) errors.push(`词 ${w.id}：grade 必须是正整数（实际 ${w.grade}）`)
    if (!w.unit.trim()) errors.push(`词 ${w.id}：unit 不能为空`)
```

把原有拼写去重循环改成小写口径：

```ts
  const wordSeen = new Set<string>()
  raw.words.forEach((w) => {
    const key = w.word.toLowerCase()
    if (wordSeen.has(key)) errors.push(`词表：同一拼写出现多次「${key}」`)
    wordSeen.add(key)
  })
```

- [x] **Step 4: 新增独立校验脚本**

创建 `scripts/validate-content.ts`：

```ts
import { RAW } from '../src/content/index'
import { validateContent } from '../src/content/validate'

const report = validateContent(RAW)
report.warnings.forEach((warning) => console.warn(`warning: ${warning}`))

if (report.errors.length) {
  console.error(`D21 内容校验失败（${report.errors.length} 项）：`)
  report.errors.forEach((error) => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log(
    `内容校验通过：${RAW.words.length} 词 / ${RAW.decks.length} 配对 / ${RAW.levels.length} 关`
  )
}
```

在 `package.json` scripts 中加入：

```json
    "validate:content": "vite-node scripts/validate-content.ts",
    "validate": "npm run validate:content && vitest run tests/unit/content-validation.test.ts",
```

`vite-node` 目前是 vitest 的传递依赖；显式声明它，执行：

```bash
npm install -D vite-node@^2.1.8
```

- [x] **Step 5: 运行验证**

Run: `npm run validate:content`
Expected: `内容校验通过：8 词 / 8 配对 / 1 关`

Run: `npx vitest run tests/unit/content-validation.test.ts`
Expected: 全部通过（含新增 3 条）。

---

### Task 2: 四级干扰字母生成

**Files:**
- Modify: `src/rules/wordgen.ts`
- Modify: `src/rules/cards.ts`
- Modify: `src/content/validate.ts`
- Test: `tests/unit/wordgen.test.ts`

**Interfaces:**
- Consumes: `WordDef`、`pickWeighted`、`shuffle`、`RULES.distractor_*`
- Produces: `CONFUSION_GROUPS`、`confusionPartners(letter)`、`chooseDistractors(word, rand, vocabulary?)`、`buildTiles(word, rand, idBase?, vocabulary?)`

- [x] **Step 1: 写失败测试**

在 `tests/unit/wordgen.test.ts` 追加：

```ts
  it('易混字母表优先：coffee 的干扰项先取 k 与 v', () => {
    const word: WordDef = { ...of('w_coffee'), distractor_overrides: [] }
    const picked = chooseDistractors(word, randOf(word.id), Object.values(CTX.words))
    expect(picked.slice(0, 2)).toEqual(['k', 'v'])
  })

  it('自动干扰项不重复本题字母（手工 override 除外）', () => {
    for (const word of Object.values(CTX.words)) {
      const auto: WordDef = { ...word, distractor_overrides: [] }
      const picked = chooseDistractors(auto, randOf(auto.id), Object.values(CTX.words))
      for (const ch of picked) expect(auto.word).not.toContain(ch)
    }
  })

  it('同 grade/unit 高频字母优先于英语频率兜底', () => {
    const mk = (id: string, word: string): WordDef => ({
      id,
      word,
      zh: '',
      ipa: '',
      grade: 4,
      unit: 'Unit 3',
      letters: word.length,
      distractor_overrides: []
    })
    const word = mk('w_yyy', 'yyy')
    const vocab = [mk('w_q1', 'qqq'), mk('w_q2', 'qqq'), mk('w_x1', 'xxx')]
    const picked = chooseDistractors(word, randOf('w_yyy'), vocab)
    expect(new Set(picked)).toEqual(new Set(['q', 'x']))
  })

  it('数量达标、互不重复，且带 vocab 时多重集合仍可拼出目标词', () => {
    const vocab = Object.values(CTX.words)
    for (const word of vocab) {
      const picked = chooseDistractors(word, randOf(word.id), vocab)
      expect(picked).toHaveLength(distractorCount(word.word.length))
      expect(new Set(picked).size).toBe(picked.length)
      expect(multisetSelfCheck(buildTiles(word, randOf(word.id), 0, vocab), word.word)).toBe(true)
    }
  })

  it('同一配对 + 同一词库两次生成完全一致', () => {
    const vocab = Object.values(CTX.words)
    const a = buildTiles(of('w_broccoli'), randOf('w_broccoli'), 0, vocab)
    const b = buildTiles(of('w_broccoli'), randOf('w_broccoli'), 0, vocab)
    expect(a).toEqual(b)
  })
```

- [x] **Step 2: 运行测试确认红**

Run: `npx vitest run tests/unit/wordgen.test.ts`
Expected: 第 1 条因新算法缺失红；第 2 条至少对 `sunflower`/`broccoli` 等词红；第 3 条红；后两条应绿。

- [x] **Step 3: 实现四级算法**

用以下实现替换 `src/rules/wordgen.ts` 的 `ENG_FREQ` 到 `buildTiles` 段：

```ts
/** 易混字母表：视觉混淆 + 听觉混淆（th/sh 落到首字母 t/s） */
export const CONFUSION_GROUPS: readonly (readonly string[])[] = [
  ['b', 'd'], ['p', 'q'], ['n', 'm'], ['u', 'v'], ['i', 'l'],
  ['f', 'v'], ['s', 'z'], ['c', 'k'], ['g', 'j'], ['t', 's']
]

export function confusionPartners(letter: string): string[] {
  const out: string[] = []
  for (const group of CONFUSION_GROUPS) {
    if (!(group as readonly string[]).includes(letter)) continue
    for (const ch of group) {
      if (ch !== letter && !out.includes(ch)) out.push(ch)
    }
  }
  return out
}

export const ENG_FREQ = 'etaoinshrdlcumwfgypbvkjxqz'.split('')

export function distractorCount(len: number): number {
  const raw = Math.round(len * RULES.distractor_ratio)
  return Math.max(RULES.distractor_min, Math.min(RULES.distractor_max, raw))
}

/**
 * §6.2 四级优先级：override → 易混伙伴 → 同 grade/unit 频率 → 英语频率兜底。
 * override 允许与目标词字母重复；自动层排除目标词字母，避免生成无效干扰项。
 */
export function chooseDistractors(
  word: WordDef,
  rand: () => number,
  vocabulary: readonly WordDef[] = []
): string[] {
  const n = distractorCount(word.word.length)
  const out: string[] = []
  const seen = new Set<string>()
  const answer = new Set(word.word.split(''))

  const add = (ch: string, allowAnswer = false): void => {
    if (out.length >= n) return
    if (!/^[a-z]$/.test(ch) || seen.has(ch)) return
    if (!allowAnswer && answer.has(ch)) return
    seen.add(ch)
    out.push(ch)
  }

  for (const ch of word.distractor_overrides ?? []) add(ch, true)

  for (const ch of new Set(word.word)) {
    for (const partner of confusionPartners(ch)) add(partner)
  }

  const peers = vocabulary.filter(
    (w) => w.id !== word.id && w.grade === word.grade && w.unit === word.unit
  )
  const freq: Record<string, number> = {}
  for (const peer of peers) {
    for (const ch of peer.word) {
      if (answer.has(ch)) continue
      freq[ch] = (freq[ch] ?? 0) + 1
    }
  }
  const byFreq = Object.entries(freq)
    .filter(([ch]) => !seen.has(ch))
    .map(([v, w]) => ({ v, w }))
  while (out.length < n && byFreq.length) {
    const ch = pickWeighted(byFreq, rand)
    byFreq.splice(byFreq.findIndex((it) => it.v === ch), 1)
    add(ch)
  }

  const fallback = ENG_FREQ
    .filter((ch) => !seen.has(ch) && !answer.has(ch))
    .map((v, i) => ({ v, w: 1 / (i + 1) / (i + 1) }))
  while (out.length < n && fallback.length) {
    const ch = pickWeighted(fallback, rand)
    fallback.splice(fallback.findIndex((it) => it.v === ch), 1)
    add(ch)
  }

  return out
}

export function buildTiles(
  word: WordDef,
  rand: () => number,
  idBase = 0,
  vocabulary: readonly WordDef[] = []
): Tile[] {
  const letters = shuffle([...word.word.split(''), ...chooseDistractors(word, rand, vocabulary)], rand)
  return letters.map((letter, i) => ({ tileId: idBase + i, letter, used: false, disabledUntil: 0 }))
}
```

- [x] **Step 4: 更新调用点传入词库**

`src/rules/cards.ts`：

```ts
    tiles: buildTiles(word, rand, instanceId * 32, Object.values(ctx.words)),
```

`src/content/validate.ts`：

```ts
      if (!multisetSelfCheck(buildTiles(word, rand, 0, raw.words), word.word)) {
```

- [x] **Step 5: 运行验证**

Run: `npx vitest run tests/unit/wordgen.test.ts tests/unit/cards-submit.test.ts tests/unit/cards-hand.test.ts`
Expected: 全部通过。

---

### Task 3: 黄金牌面快照

**Files:**
- Create: `tests/golden/tiles.test.ts`
- Create: `tests/golden/__snapshots__/tiles.test.ts.snap`（由 vitest 生成）
- Modify: `vitest.config.ts`（仅当 `include` 未覆盖 `tests/golden` 时需要）

**Interfaces:**
- Consumes: `makeCard(deck, ctx, instanceId)`
- Produces: 每个配对的 `{ deck, letters, tileIds }` 快照

- [x] **Step 1: 写快照测试**

创建 `tests/golden/tiles.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { CTX } from '../../src/content/index'
import { makeCard } from '../../src/rules/cards'

describe('D10 黄金：(word, deck) → 牌面布局', () => {
  it('8 个配对的牌面在算法变更时必须显式更新快照', () => {
    for (const deck of Object.values(CTX.decks)) {
      const card = makeCard(deck, CTX, 0)
      expect({
        deck: deck.id,
        letters: card.tiles.map((t) => t.letter),
        tileIds: card.tiles.map((t) => t.tileId)
      }).toMatchSnapshot()
    }
  })
})
```

- [x] **Step 2: 生成并人工检查快照**

Run: `npx vitest run tests/golden/tiles.test.ts -u`
Expected: 生成 `tests/golden/__snapshots__/tiles.test.ts.snap`；逐条确认每个 `letters` 的前两个 override（如有）符合预期、`tileIds` 从 0 开始连续。

- [x] **Step 3: 运行快照测试**

Run: `npx vitest run tests/golden/tiles.test.ts`
Expected: 8 条快照全部通过；若失败，说明 Task 2 的生成过程不确定。

---

### Task 4: 求助阶梯规则与提示目标

**Files:**
- Modify: `src/rules/constants.ts`
- Modify: `src/rules/types.ts`
- Modify: `src/rules/cards.ts`
- Test: `tests/unit/constants.test.ts`
- Test: `tests/unit/hints.test.ts`

**Interfaces:**
- Consumes: `submit(cards, tileId, now)`、`RULES.penalty_disable_ms`
- Produces:
  - `RULES.hint_ladder_1 = 2`、`RULES.hint_ladder_2 = 4`
  - `Event` 新增 `{ type: 'hint_ladder'; level: 1 | 2 }`
  - `hintedTileIds(card): number[]`
  - level 2 时 `card.assisted === true`

- [x] **Step 1: 写失败测试**

在 `tests/unit/constants.test.ts` 的第一条测试中追加：

```ts
    expect(RULES.hint_ladder_1).toBe(2)
    expect(RULES.hint_ladder_2).toBe(4)
```

创建 `tests/unit/hints.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { CTX } from '../../src/content/index'
import { hintedTileIds, makeCard, submit } from '../../src/rules/cards'
import type { Card, Event } from '../../src/rules/types'

function fresh(): Card {
  return { ...makeCard(CTX.decks.d_sunflower_sprout, CTX, 0), status: 'filling' }
}

function badTileId(card: Card): number {
  const target = card.slots[card.filled]
  return card.tiles.find((t) => !t.used && t.letter !== target)!.tileId
}

function wrongAt(cards: Card[], t: number) {
  return submit(cards, badTileId(cards[0]), t)
}

function ladderLevels(events: readonly Event[]): number[] {
  return events
    .filter((e): e is Extract<Event, { type: 'hint_ladder' }> => e.type === 'hint_ladder')
    .map((e) => e.level)
}

describe('§6.4 求助阶梯', () => {
  it('连错 2 次发 level 1，不置 assisted', () => {
    let cards = [fresh()]
    let t = 2.1
    let r = wrongAt(cards, t)
    cards = r.cards
    expect(ladderLevels(r.events)).toEqual([])
    t += 2.1
    r = wrongAt(cards, t)
    cards = r.cards
    expect(ladderLevels(r.events)).toEqual([1])
    expect(cards[0].assisted).toBe(false)
    expect(cards[0].ladderLevel).toBe(1)
  })

  it('连错 4 次发 level 2 并置 assisted，之后不再重复发', () => {
    let cards = [fresh()]
    const levels: number[] = []
    let t = 0
    for (let i = 0; i < 5; i++) {
      t += 2.1
      const r = wrongAt(cards, t)
      cards = r.cards
      levels.push(...ladderLevels(r.events))
    }
    expect(levels).toEqual([1, 2])
    expect(cards[0].assisted).toBe(true)
    expect(cards[0].ladderLevel).toBe(2)
  })

  it('答对后 wrongStreak 归零，但 ladderLevel / assisted 保留', () => {
    let cards = [fresh()]
    let t = 2.1
    cards = wrongAt(cards, t).cards
    t += 2.1
    cards = wrongAt(cards, t).cards
    const card = cards[0]
    const target = card.slots[card.filled]
    const tile = card.tiles.find((x) => !x.used && x.letter === target)!
    const r = submit(cards, tile.tileId, t + 0.1)
    expect(r.cards[0].wrongStreak).toBe(0)
    expect(r.cards[0].ladderLevel).toBe(1)
    expect(r.cards[0].assisted).toBe(false)
  })

  it('hintedTileIds 只在 level 2 且未完成时返回当前目标字母的未用块', () => {
    const base = fresh()
    const target = base.slots[base.filled]
    const level2: Card = { ...base, ladderLevel: 2 }
    const ids = hintedTileIds(level2)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.every((id) => level2.tiles.find((t) => t.tileId === id)!.letter === target)).toBe(true)
    expect(hintedTileIds({ ...base, ladderLevel: 1 })).toEqual([])
    expect(hintedTileIds({ ...base, ladderLevel: 2, status: 'armed' })).toEqual([])
  })
})
```

- [x] **Step 2: 运行测试确认红**

Run: `npx vitest run tests/unit/hints.test.ts tests/unit/constants.test.ts`
Expected: constants 因阈值缺失红；hints 因 `hintedTileIds` 不存在 / 无阶梯事件红。

- [x] **Step 3: 加常量与事件类型**

`src/rules/constants.ts` 的 `RULES` 中加入：

```ts
  hint_ladder_1: 2,               // §6.4：连错 2 次显示音标并朗读
  hint_ladder_2: 4,               // §6.4：连错 4 次高亮正确块并记 assisted
```

`src/rules/types.ts` 的 `Event` 联合中加入：

```ts
  | { type: 'hint_ladder'; level: 1 | 2 }
```

- [x] **Step 4: 实现阶梯与提示目标**

在 `src/rules/cards.ts` 的 `submit` 错误分支中，把：

```ts
    card.wrongTotal += 1
    card.wrongStreak += 1
    events.push({ type: 'wrong', tileId })
```

改为：

```ts
    card.wrongTotal += 1
    card.wrongStreak += 1
    events.push({ type: 'wrong', tileId })
    const ladder = card.wrongStreak >= RULES.hint_ladder_2
      ? 2
      : card.wrongStreak >= RULES.hint_ladder_1
        ? 1
        : 0
    if (ladder > card.ladderLevel) {
      card.ladderLevel = ladder
      if (ladder === 2) card.assisted = true
      events.push({ type: 'hint_ladder', level: ladder })
    }
```

在 `src/rules/cards.ts` 末尾加入：

```ts
/** §6.4 level 2：高亮当前待填字母的所有未用块 */
export function hintedTileIds(card: Card): number[] {
  if (card.status !== 'filling' || card.ladderLevel < 2) return []
  const target = card.slots[card.filled]
  return card.tiles
    .filter((tile) => !tile.used && tile.letter === target)
    .map((tile) => tile.tileId)
}
```

- [x] **Step 5: 运行验证**

Run: `npx vitest run tests/unit/hints.test.ts tests/unit/constants.test.ts tests/unit/play.test.ts tests/unit/cards-submit.test.ts`
Expected: 全部通过。

---

### Task 5: 提示 UI 与朗读

**Files:**
- Create: `src/platform/speech.ts`
- Modify: `src/ui/WordPanel.tsx`
- Modify: `src/ui/GameScreen.tsx`
- Modify: `src/ui/game.css`
- Test: `tests/unit/speech.test.ts`

**Interfaces:**
- Consumes: `hintedTileIds(card)`、`hint_ladder` 事件、`saveRef.current.settings.speech_enabled`
- Produces: `speakWord(word: string): boolean`；level 1 朗读 + 音标强调；level 2 字母块高亮

- [x] **Step 1: 写朗读降级测试**

创建 `tests/unit/speech.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { speakWord } from '../../src/platform/speech'

describe('D15 朗读降级', () => {
  it('无 SpeechSynthesis 环境返回 false 且不抛错', () => {
    expect(speakWord('sunflower')).toBe(false)
  })
})
```

Run: `npx vitest run tests/unit/speech.test.ts`
Expected: FAIL（模块不存在）。

- [x] **Step 2: 实现朗读适配**

创建 `src/platform/speech.ts`：

```ts
/** D15：只用运行时 SpeechSynthesis，不预生成音频；不可用时静默降级 */
export function speakWord(word: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    utterance.rate = 0.85
    window.speechSynthesis.speak(utterance)
    return true
  } catch {
    return false
  }
}
```

Run: `npx vitest run tests/unit/speech.test.ts`
Expected: PASS（node 环境返回 false）。

- [x] **Step 3: WordPanel 显示音标强调与高亮块**

`src/ui/WordPanel.tsx`：

```tsx
import { hintedTileIds } from '../rules/cards'
```

在 `const target = card.slots[card.filled]` 后加：

```tsx
  const hinted = new Set(hintedTileIds(card))
```

把音标改为：

```tsx
        <span className={`wordpanel__ipa ${card.ladderLevel >= 1 ? 'is-hint' : ''}`}>{word.ipa}</span>
```

把字母块 className 改为：

```tsx
              className={[
                'wtile',
                tile.used ? 'is-used' : '',
                cooling ? 'is-disabled' : '',
                hinted.has(tile.tileId) ? 'is-hint' : ''
              ].join(' ')}
```

把底部右侧文案改为：

```tsx
        <span className={card.wrongStreak > 0 ? 'bad' : ''}>
          {card.assisted
            ? '已用提示'
            : card.wrongStreak > 0
              ? `连错 ${card.wrongStreak} 次，别急`
              : target ? '按顺序点字母块' : ''}
        </span>
```

- [x] **Step 4: GameScreen 处理朗读与提示事件**

`src/ui/GameScreen.tsx` 顶部加入：

```ts
import { speakWord } from '../platform/speech'
```

在 `apply` 的 `wrong` 分支之后加入：

```ts
      } else if (e.type === 'hint_ladder') {
        const focus = focusCard(stateRef.current.cards)
        const focusWord = focus ? CTX.words[focus.wordId] : undefined
        if (e.level === 1 && focusWord) {
          speakWord(focusWord.word)
          pushToast(`听一听：${focusWord.ipa}`)
        } else if (e.level === 2) {
          pushToast('看，亮起来的字母就是下一个')
        }
      }
```

（任务 6 会给朗读加上存档里的 `speech_enabled` 开关。）

- [x] **Step 5: 加提示样式**

`src/ui/game.css` 追加：

```css
.wordpanel__ipa.is-hint {
  color: #ffe066;
  text-shadow: 0 0 12px rgba(255, 224, 102, 0.55);
  animation: ipa-pulse 1.2s ease-in-out infinite;
}

.wtile.is-hint {
  outline: 3px solid #ffd34d;
  outline-offset: 2px;
  box-shadow: 0 0 0 5px rgba(255, 211, 77, 0.28), 0 6px 0 #9a6b1a;
}

@keyframes ipa-pulse {
  50% { opacity: 0.55; }
}
```

- [x] **Step 6: 运行验证**

Run: `npx vitest run tests/unit/speech.test.ts tests/unit/hints.test.ts`
Expected: PASS。

Run: `npm run build`
Expected: TypeScript 通过；浏览器里连错 2 次音标闪烁并朗读，连错 4 次正确块出现金色描边。

---

### Task 6: v1 存档与 assisted 记账

**Files:**
- Create: `src/rules/stats.ts`
- Create: `src/platform/save.ts`
- Modify: `src/ui/GameScreen.tsx`
- Modify: `src/ui/ResultOverlay.tsx`
- Test: `tests/unit/stats.test.ts`
- Test: `tests/unit/save.test.ts`

**Interfaces:**
- Consumes: `RULES.penalty_disable_ms`
- Produces:
  - `WordStat`、`SaveData`、`emptySave(lastPlayed?)`、`recordWordResult(save, wordId, kind, nowSec)`、`migrateSave(raw)`
  - `loadSave(storage?)`、`persistSave(save, storage?)`、`todayString(date?)`
  - 结果页 `assisted` 统计

- [x] **Step 1: 写失败测试**

创建 `tests/unit/stats.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { DEFAULT_EASE, MIN_EASE, emptySave, recordWordResult } from '../../src/rules/stats'

describe('词统计与 assisted 记账', () => {
  it('初始存档为空且包含默认设置', () => {
    const save = emptySave('2026-11-07')
    expect(save).toMatchObject({ v: 1, last_played: '2026-11-07', word_stats: {}, levels: {} })
    expect(save.settings).toEqual({ speech_enabled: true, penalty_disable_ms: 2000 })
  })

  it('correct / wrong 累加，wrong 重置 streak，correct 增加 streak', () => {
    let save = emptySave()
    save = recordWordResult(save, 'w_milk', 'correct', 100)
    save = recordWordResult(save, 'w_milk', 'correct', 110)
    expect(save.word_stats.w_milk).toMatchObject({
      correct: 2,
      wrong: 0,
      assisted: 0,
      streak: 2,
      last_seen_ts: 110
    })
    save = recordWordResult(save, 'w_milk', 'wrong', 120)
    expect(save.word_stats.w_milk).toMatchObject({ correct: 2, wrong: 1, streak: 0, last_seen_ts: 120 })
  })

  it('assisted 累加、streak 归零、ease 下调且有下限', () => {
    let save = emptySave()
    save = recordWordResult(save, 'w_milk', 'correct', 1)
    for (let i = 0; i < 20; i++) save = recordWordResult(save, 'w_milk', 'assisted', 100 + i)
    const stat = save.word_stats.w_milk!
    expect(stat.assisted).toBe(20)
    expect(stat.streak).toBe(0)
    expect(stat.ease).toBeGreaterThanOrEqual(MIN_EASE)
    expect(stat.ease).toBeLessThan(DEFAULT_EASE)
  })

  it('不可变：旧存档对象不被改写', () => {
    const before = emptySave()
    const after = recordWordResult(before, 'w_milk', 'wrong', 1)
    expect(before.word_stats).toEqual({})
    expect(after).not.toBe(before)
  })
})
```

创建 `tests/unit/save.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { SAVE_KEY, emptySave, migrateSave, recordWordResult } from '../../src/rules/stats'
import { loadSave, persistSave, todayString } from '../../src/platform/save'

function memory() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value) }
  }
}

describe('D19 存档 v1', () => {
  it('round-trip：写入后读回同一条统计', () => {
    const storage = memory()
    const save = recordWordResult(emptySave('2026-11-07'), 'w_milk', 'assisted', 42)
    persistSave(save, storage)
    expect(loadSave(storage)).toEqual(save)
  })

  it('损坏 JSON / 未知版本回退空存档', () => {
    const storage = memory()
    storage.setItem(SAVE_KEY, '{oops')
    expect(loadSave(storage)).toEqual(emptySave())
    storage.setItem(SAVE_KEY, JSON.stringify({ v: 99, word_stats: { x: 1 } }))
    expect(loadSave(storage)).toEqual(emptySave())
  })

  it('migrate 容忍缺字段并夹紧非法数字', () => {
    const save = migrateSave({
      v: 1,
      word_stats: {
        w_milk: { correct: -3, wrong: 'x', assisted: 2, streak: 1, ease: 'bad', last_seen_ts: 5 }
      },
      levels: { u3_w1: { best_stars: 3 } }
    })
    expect(save.word_stats.w_milk).toEqual({
      correct: 0,
      wrong: 0,
      assisted: 2,
      streak: 1,
      ease: 2.5,
      last_seen_ts: 5
    })
    expect(save.levels.u3_w1).toEqual({ best_stars: 3 })
  })

  it('localStorage 抛错时不影响游戏', () => {
    const storage = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('quota') }
    }
    expect(loadSave(storage)).toEqual(emptySave())
    expect(() => persistSave(emptySave(), storage)).not.toThrow()
  })

  it('todayString 用本地日期', () => {
    expect(todayString(new Date(2026, 10, 7))).toBe('2026-11-07')
  })
})
```

Run: `npx vitest run tests/unit/stats.test.ts tests/unit/save.test.ts`
Expected: FAIL（模块不存在）。

- [x] **Step 2: 实现纯统计模块**

创建 `src/rules/stats.ts`：

```ts
import { RULES } from './constants'

export const SAVE_VERSION = 1
export const SAVE_KEY = 'pvzwords.save.v1'
export const DEFAULT_EASE = 2.5
export const MIN_EASE = 1.3

export type WordStat = {
  correct: number
  wrong: number
  assisted: number
  streak: number
  ease: number
  last_seen_ts: number
}

export type LevelStat = { best_stars: number }

export type SaveData = {
  v: typeof SAVE_VERSION
  last_played: string
  word_stats: Record<string, WordStat>
  levels: Record<string, LevelStat>
  settings: { speech_enabled: boolean; penalty_disable_ms: number }
}

const emptyStat = (): WordStat => ({
  correct: 0,
  wrong: 0,
  assisted: 0,
  streak: 0,
  ease: DEFAULT_EASE,
  last_seen_ts: 0
})

export function emptySave(lastPlayed = ''): SaveData {
  return {
    v: SAVE_VERSION,
    last_played: lastPlayed,
    word_stats: {},
    levels: {},
    settings: { speech_enabled: true, penalty_disable_ms: RULES.penalty_disable_ms }
  }
}

export function recordWordResult(
  save: SaveData,
  wordId: string,
  kind: 'correct' | 'wrong' | 'assisted',
  nowSec: number
): SaveData {
  const stat = save.word_stats[wordId] ?? emptyStat()
  let next: WordStat
  if (kind === 'correct') {
    next = { ...stat, correct: stat.correct + 1, streak: stat.streak + 1, last_seen_ts: nowSec }
  } else if (kind === 'wrong') {
    next = { ...stat, wrong: stat.wrong + 1, streak: 0, last_seen_ts: nowSec }
  } else {
    next = {
      ...stat,
      assisted: stat.assisted + 1,
      streak: 0,
      ease: Math.max(MIN_EASE, Math.round(stat.ease * 0.9 * 100) / 100),
      last_seen_ts: nowSec
    }
  }
  return { ...save, word_stats: { ...save.word_stats, [wordId]: next } }
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const nonNegInt = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0

/** 只认识 v1；损坏或未来版本回退空存档，绝不把异常向上抛 */
export function migrateSave(raw: unknown): SaveData {
  if (!isObject(raw) || raw.v !== SAVE_VERSION) return emptySave()
  const base = emptySave(typeof raw.last_played === 'string' ? raw.last_played : '')

  if (isObject(raw.word_stats)) {
    for (const [id, value] of Object.entries(raw.word_stats)) {
      if (!isObject(value)) continue
      base.word_stats[id] = {
        correct: nonNegInt(value.correct),
        wrong: nonNegInt(value.wrong),
        assisted: nonNegInt(value.assisted),
        streak: nonNegInt(value.streak),
        ease: typeof value.ease === 'number' && Number.isFinite(value.ease) && value.ease >= MIN_EASE
          ? value.ease
          : DEFAULT_EASE,
        last_seen_ts: nonNegInt(value.last_seen_ts)
      }
    }
  }

  if (isObject(raw.levels)) {
    for (const [id, value] of Object.entries(raw.levels)) {
      if (!isObject(value)) continue
      base.levels[id] = { best_stars: nonNegInt(value.best_stars) }
    }
  }

  if (isObject(raw.settings)) {
    base.settings = {
      speech_enabled: typeof raw.settings.speech_enabled === 'boolean' ? raw.settings.speech_enabled : true,
      penalty_disable_ms:
        typeof raw.settings.penalty_disable_ms === 'number' &&
        Number.isFinite(raw.settings.penalty_disable_ms) &&
        raw.settings.penalty_disable_ms >= 0
          ? raw.settings.penalty_disable_ms
          : RULES.penalty_disable_ms
    }
  }

  return base
}
```

注意：`nonNegInt` 对 `5` 返回 5，对 `-3` 返回 0，对 `'x'` 返回 0；`best_stars` 的 `3` 保留。`emptySave()` 默认 `last_played` 是 `''`，测试中 `loadSave` 返回的空档与 `emptySave()` 深相等。

- [x] **Step 3: 实现平台存档适配**

创建 `src/platform/save.ts`：

```ts
import { SAVE_KEY, emptySave, migrateSave, type SaveData } from '../rules/stats'

type ReadStorage = Pick<Storage, 'getItem'>
type WriteStorage = Pick<Storage, 'setItem'>
type StorageLike = ReadStorage & WriteStorage

function getStorage(): StorageLike | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

export function loadSave(storage: ReadStorage | undefined = getStorage()): SaveData {
  if (!storage) return emptySave()
  try {
    const raw = storage.getItem(SAVE_KEY)
    return raw ? migrateSave(JSON.parse(raw)) : emptySave()
  } catch {
    return emptySave()
  }
}

export function persistSave(save: SaveData, storage: WriteStorage | undefined = getStorage()): void {
  if (!storage) return
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch {
    // 隐私模式 / 配额满：存档失败不阻断游戏
  }
}

export function todayString(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
```

- [x] **Step 4: 接入 GameScreen 与结果页**

`src/ui/GameScreen.tsx` 顶部加入：

```ts
import { loadSave, persistSave, todayString } from '../platform/save'
import { recordWordResult, type SaveData } from '../rules/stats'
```

在 refs 区域加入：

```ts
  const [initialSave] = useState(() => loadSave())
  const saveRef = useRef<SaveData>(initialSave)
  const assistedRef = useRef(0)

  useEffect(() => {
    const save = { ...saveRef.current, last_played: todayString() }
    saveRef.current = save
    persistSave(save)
  }, [])

  const record = useCallback((kind: 'correct' | 'wrong' | 'assisted', wordId: string) => {
    const next = recordWordResult(saveRef.current, wordId, kind, stateRef.current.t)
    saveRef.current = next
    persistSave(next)
    if (kind === 'assisted') assistedRef.current += 1
  }, [])
```

在 `apply` 的 `wrong` 分支中追加（放在 toast 之前）：

```ts
        const wordId = focusCard(stateRef.current.cards)?.wordId
        if (wordId) record('wrong', wordId)
```

把 Task 5 的 `hint_ladder` 分支改成：

```ts
      } else if (e.type === 'hint_ladder') {
        const focus = focusCard(stateRef.current.cards)
        const focusWord = focus ? CTX.words[focus.wordId] : undefined
        if (e.level === 2 && focus) record('assisted', focus.wordId)
        if (e.level === 1 && focusWord) {
          if (saveRef.current?.settings.speech_enabled) speakWord(focusWord.word)
          pushToast(`听一听：${focusWord.ipa}`)
        } else if (e.level === 2) {
          pushToast('看，亮起来的字母就是下一个')
        }
      }
```

在 `apply` 的 `armed` 分支中追加：

```ts
        const wordId = focusCard(stateRef.current.cards)?.wordId
        if (wordId) record('correct', wordId)
```

把 `apply` 的依赖数组改为 `[pushToast, record]`。

把结算处改为：

```tsx
          assisted={assistedRef.current}
```

`src/ui/ResultOverlay.tsx` 的 Props 加：

```ts
  assisted: number
```

解构参数加 `assisted`，在「点错字母」统计前加入：

```tsx
          <span className="result__stat">
            <b>{assisted}</b>
            <span>用了提示</span>
          </span>
```

- [x] **Step 5: 运行测试与类型检查**

Run: `npx vitest run tests/unit/stats.test.ts tests/unit/save.test.ts`
Expected: PASS。

Run: `npm run build`
Expected: TypeScript 通过。

---

### Task 7: 全链验证与文档回填

**Files:**
- Modify: `docs/启动说明.md`
- Modify: `scripts/smoke-checklist.md`
- Modify: `docs/superpowers/plans/2026-11-07-m1-word-list-and-spelling.md`（本文件）
- Modify: `docs/superpowers/plans/2026-11-07-m0-vertical-slice.md`（测试数量注明 M0 时点）

**Interfaces:**
- Consumes: 全部 M1 产物
- Produces: 可复现的门禁结果、人工验收步骤、计划完成状态

- [x] **Step 1: 跑全链门禁**

Run: `npm run lint && npm test && npm run build && npm run validate`
Expected: lint 0 error；测试全绿（M0 99 + M1 新增）；build 成功；内容门禁通过。

- [x] **Step 2: 浏览器人工验收**

Run: `npm run dev`
在浏览器中依次确认：

1. 连续点错 2 次：音标闪烁，听到英文发音（浏览器支持时），无弹窗阻塞。
2. 连续点错 4 次：下一个正确字母块出现金色描边，底部显示「已用提示」。
3. 继续答对并种植：结果页「用了提示」为 1。
4. 刷新页面后重开一局，`localStorage.getItem('pvzwords.save.v1')` 中存在 `word_stats` 计数；localStorage 不可用时游戏仍可玩。
5. 点错期间阳光不增加、僵尸继续前进；阳光苗每 12 秒产 25。

- [x] **Step 3: 更新启动说明**

把测试数量改为实际值；在「测试与质量检查」加入：

```bash
npm run validate:content   # 独立内容门禁，错误时退出码 1
```

在「30 秒上手」补：

```text
拼错 2 次会强调音标并朗读；拼错 4 次会高亮下一个正确字母，并记为「已用提示」。
```

在「目录速览」补 `src/platform/`（朗读与存档）与 `src/rules/stats.ts`（词统计）。

- [x] **Step 4: 更新冒烟清单**

在 `scripts/smoke-checklist.md` 的 B 组后追加：

```md
- [x] B3 连错 2 次：音标强调 + 英文朗读（无语音合成时静默）
- [x] B4 连错 4 次：正确字母块金色描边，底部「已用提示」
- [x] B5 结果页「用了提示」与实际 assisted 次数一致
- [x] B6 刷新后 `pvzwords.save.v1` 保留 correct/wrong/assisted/streak/ease
```

- [x] **Step 5: 回填计划状态**

把本文件所有 `[ ]` 改成 `[x]`，在文件末尾追加「实施结果与偏差」：

- 实际测试文件 / 用例数；
- 视觉验收结果；
- 与计划的偏差（例如快照生成方式、TTS 最小实现、三星延期到 M4）；
- 未完成的人工项（噪声环境朗读、Safari/iPad、真实孩子试玩）。

同时把 M0 计划头部「14 个测试文件 / 99 个用例」标注为「M0 验收时点」，避免与 M1 后的总数混淆。

---

## Self-Review

- **Spec coverage:** §4.4 清洗（Task 1）、§6.2 四级干扰（Task 2）、§11 黄金文件（Task 3）、§6.4 阶梯与 `assisted`（Task 4/5）、§4.6/D19 存档（Task 6）、§15 M1 交付（全部）。
- **Placeholder scan:** 无 TBD/TODO；每个测试与实现步骤都给出可执行代码或命令。
- **Type consistency:** `chooseDistractors(word, rand, vocabulary?)` 与 `buildTiles(word, rand, idBase?, vocabulary?)` 在 Task 2 定义，调用点同步；`hintedTileIds(card)` 在 Task 4 定义、Task 5 消费；`SaveData`/`WordStat` 在 Task 6 定义并被 GameScreen 使用；`hint_ladder` 事件类型与 UI 分支一致。
- **已知延后:** 三星评价、错词本/图鉴、语音识别与 buff 不在 M1；`assisted` 只落 `word_stats`，星级在 M4 接入。

---

## 实施结果与偏差（2026-11-07）

**状态：已实施完成。** 19 个测试文件 / 122 个用例全绿；`lint` / `test` / `build` / `validate` 通过；vite build 62 modules，JS 194.39 kB（gzip 63.15 kB），CSS 20.67 kB（gzip 5.73 kB）。

### 实测结果

| 项 | 结果 |
| --- | --- |
| 内容门禁 | `npm run validate:content` 通过：8 词 / 8 配对 / 1 关；非法字符、大小写重复、grade/unit 缺失均被拦截 |
| 干扰块 | 四级优先级 + 去重 + 答案字母排除；`sunflower` 的 `f,v` 覆盖项保留；8 个配对快照全部生成 |
| 求助阶梯 | 连错 2 次音标加 `is-hint` 脉动并朗读；连错 4 次正确块金色描边、脚注「已用提示」、`assisted = true` |
| 存档 | `pvzwords.save.v1` 写入 wrong=4 / assisted=1 / correct=1 / ease=2.25，刷新后可读回 |
| 结算页 | 「用了提示 1」与存档一致 |
| 阳光提速 | 种植后 75→35，12.5 s 后 35→60（每 12 s +25） |

浏览器验收方法：本轮 Browser Connector 不可用，改用本机 Chrome 156 headless + CDP 完成点击与断言；可见窗口手感仍需按 `scripts/smoke-checklist.md` A 组人工复验。

### 与计划的偏差

- **快照生成方式**：黄金快照由 `vitest run` 首次生成后提交，未手写 `.snap`；快照只记录 `letters` 与 `tileIds`，不记录禁用时间等易变字段。
- **TTS 最小实现**：只调用 `speechSynthesis`，固定 `en-US` 与 0.85 语速；无音色选择、无音量/语速设置 UI，不支持时静默。`speech_enabled` 设置已入存档但暂无设置入口。
- **assisted 计数**：结果页使用组件内 `assistedRef` 会话计数，按 `hint_ladder` level 2 事件累加；不与存档做二次对账。
- **ease 已记账未消费**：`recordWordResult` 会下调 ease（下限 1.3），当前没有复习调度或星级使用它，留待 M4。
- **M0 计划测试数**：已在 M0 计划状态行标注「M0 验收时点」，避免与 M1 后的 122 个用例混淆。

### 未完成的人工项

- 真实噪声环境下的朗读可懂度与音量。
- Safari / iPad 的 `speechSynthesis` 与触摸手感。
- 孩子实测（`scripts/smoke-checklist.md` D1–D4）。
