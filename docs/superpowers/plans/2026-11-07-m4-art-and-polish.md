# 拼词小院 M4 素材与打磨实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 12 个角色换成原创 PNG、补齐 CC0 音效与自托管字体、新增图鉴/复习页，并加上性能预算与可调惩罚，让 M0–M3 的玩法达到可交付给孩子试玩的状态。

**Architecture:** 素材走 `art-source/`（本地 1024 原图）→ Pillow 抠图 → `public/assets/**`（96/128/256 三档）；运行时用统一 `<CharacterArt>` 输出 `<img>`，现有 SVG 只保留给 UI 图标和选关场景。音效为 6 个 Kenney CC0 MP3，经 `platform/audio.ts` 在首次用户手势后解锁。字体改为同源 woff2 并在启动时等待就绪。图鉴/复习是一个四页签浮层，复习数据由纯函数从存档派生。

**Tech Stack:** React 18.3.1、Vite 6.4.5、TypeScript 5.7.3、vitest 2.1.9、Pillow 12.2.0、ffmpeg 2025-07、Kenney CC0 音频、Fontsource 5.3.0。

**Spec:** `docs/superpowers/specs/2026-11-07-m4-art-and-polish-design.md`

## Global Constraints

- Node.js ≥ 20（本机 v24.22.1）；Python ≥ 3.12 + Pillow；ffmpeg 在 PATH。
- 对外名称与 UI 文案一律不出现原版游戏名称、角色名或任何 PopCap/EA 素材；提示词与生成图不得影射既有游戏角色。
- `src/rules/**` 必须保持纯函数：禁止 React/DOM/`window`/`document`/`localStorage`/`Math.random`/`Date.now`，ESLint 已锁。
- 固定画幅 1280×720（`VIEW.w/h`）；现有内容规模：8 植物 / 13 词 / 13 配对 / 4 僵尸 / 1 关。
- 存档键 `pvzwords.save.v1` 不变，版本升到 2，必须兼容 v1 迁移。
- 角色图三档严格为 96/128/256 正方形 PNG；单文件 ≤200KB，合计 ≤2MB。
- 首屏资源预算 3MB；单个 JS chunk ≤500KB。
- 每次提交前跑：`npm run lint && npm test && npm run build`；素材相关任务再跑 `npm run validate`。
- 提交信息用中文 `feat:` / `fix:` / `docs:`，与现有历史一致。

---

## 文件结构

```text
public/assets/
  plants/{id}_{s,c,l}.png       8 株植物 × 3 档
  zombies/{id}_{s,c,l}.png      4 只僵尸 × 3 档
  audio/{fill_ok,fill_wrong,arm,plant,sun_drop,zombie_die}.mp3
  CREDITS.md                    Kenney CC0 + 字体许可
assets/
  ART_PROMPTS.md                ImageGen 提示词存档
art-source/                     1024 原图（gitignore，不推送）
scripts/
  matting.py                    白底抠图 + 三档尺寸 + 接触表
  validate-assets.ts            资产存在性/尺寸/体积门禁
  check-budget.mjs              dist 体积预算门禁
src/art/
  CharacterArt.tsx              artSrc + <img> 组件
  character.css                 角色图样式
src/platform/
  audio.ts                      Kenney MP3 播放器
  fonts.ts                      document.fonts 就绪门禁
src/rules/
  review.ts                     复习行纯函数
src/ui/
  sfx.ts                        事件 → 音效名映射
  CodexOverlay.tsx              图鉴/复习浮层
  codex.css                     浮层与表格样式
  PerfOverlay.tsx               FPS/帧时面板
tests/unit/
  stats.test.ts / save.test.ts  存档 v2 与迁移
  cards-submit.test.ts / sim.test.ts  可调冻结
  sfx.test.ts                  事件映射与播放器
  fonts.test.ts                字体门禁
  character-art.test.ts        路径与 tier
  validate-assets.test.ts      PNG 头与三档路径
  review.test.ts               复习行过滤/排序
  perf.test.ts                 帧统计
```

---

### Task 1: 存档 v2 与音效设置字段

**Files:**
- Modify: `src/rules/stats.ts:3-42`, `src/rules/stats.ts:104-116`
- Test: `tests/unit/stats.test.ts:6-10`, `tests/unit/save.test.ts:31-48`

**Interfaces:**
- Consumes: 现有 `SaveData`、`migrateSave`、`emptySave`
- Produces: `SAVE_VERSION = 2`；`SaveData['settings']` 为 `{ speech_enabled: boolean; sound_enabled: boolean; penalty_disable_ms: number }`

- [ ] **Step 1: 写失败测试**

在 `tests/unit/stats.test.ts` 把首个用例改为：

```ts
it('初始存档为空且包含默认设置', () => {
  const save = emptySave('2026-11-07')
  expect(save).toMatchObject({ v: 2, last_played: '2026-11-07', word_stats: {}, levels: {} })
  expect(save.settings).toEqual({
    speech_enabled: true,
    sound_enabled: true,
    penalty_disable_ms: 2000
  })
})
```

在 `tests/unit/save.test.ts` 的 `describe` 内追加：

```ts
it('v1 迁移到 v2：保留统计并补 sound_enabled', () => {
  const save = migrateSave({
    v: 1,
    last_played: '2026-11-01',
    word_stats: {
      w_milk: { correct: 2, wrong: 1, assisted: 0, streak: 1, ease: 2.5, last_seen_ts: 42 }
    },
    levels: { u3_w1: { best_stars: 3 } },
    settings: { speech_enabled: false, penalty_disable_ms: 0 }
  })
  expect(save.v).toBe(2)
  expect(save.settings).toEqual({
    speech_enabled: false,
    sound_enabled: true,
    penalty_disable_ms: 0
  })
  expect(save.word_stats.w_milk.correct).toBe(2)
  expect(save.levels.u3_w1).toEqual({ best_stars: 3 })
})

it('v2 保留 sound_enabled=false，非法值回落 true', () => {
  const off = migrateSave({
    v: 2,
    settings: { speech_enabled: true, sound_enabled: false, penalty_disable_ms: 2000 }
  })
  expect(off.settings.sound_enabled).toBe(false)
  const bad = migrateSave({
    v: 2,
    settings: { speech_enabled: true, sound_enabled: 'no', penalty_disable_ms: 2000 }
  })
  expect(bad.settings.sound_enabled).toBe(true)
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npx vitest run tests/unit/stats.test.ts tests/unit/save.test.ts
```

Expected: FAIL，`v` 仍为 1 且 `settings` 不含 `sound_enabled`。

- [ ] **Step 3: 实现**

`src/rules/stats.ts`：

```ts
export const SAVE_VERSION = 2
```

```ts
export type SaveData = {
  v: typeof SAVE_VERSION
  last_played: string
  word_stats: Record<string, WordStat>
  levels: Record<string, LevelStat>
  settings: { speech_enabled: boolean; sound_enabled: boolean; penalty_disable_ms: number }
}
```

```ts
export function emptySave(lastPlayed = ''): SaveData {
  return {
    v: SAVE_VERSION,
    last_played: lastPlayed,
    word_stats: {},
    levels: {},
    settings: {
      speech_enabled: true,
      sound_enabled: true,
      penalty_disable_ms: RULES.penalty_disable_ms
    }
  }
}
```

`migrateSave` 开头改为（同时把上方 `/** 只认识 v1；… */` 注释改成 `/** 只认识 v1/v2；… */`）：

```ts
export function migrateSave(raw: unknown): SaveData {
  if (!isObject(raw)) return emptySave()
  if (raw.v !== 1 && raw.v !== SAVE_VERSION) return emptySave()
  const base = emptySave(typeof raw.last_played === 'string' ? raw.last_played : '')
```

settings 分支改为：

```ts
  if (isObject(raw.settings)) {
    base.settings = {
      speech_enabled:
        typeof raw.settings.speech_enabled === 'boolean' ? raw.settings.speech_enabled : true,
      sound_enabled:
        typeof raw.settings.sound_enabled === 'boolean' ? raw.settings.sound_enabled : true,
      penalty_disable_ms:
        typeof raw.settings.penalty_disable_ms === 'number' &&
        Number.isFinite(raw.settings.penalty_disable_ms) &&
        raw.settings.penalty_disable_ms >= 0
          ? raw.settings.penalty_disable_ms
          : RULES.penalty_disable_ms
    }
  }
```

- [ ] **Step 4: 跑测试确认通过**

```bash
npx vitest run tests/unit/stats.test.ts tests/unit/save.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/rules/stats.ts tests/unit/stats.test.ts tests/unit/save.test.ts
git commit -m "feat: 存档升到 v2 并加入音效开关字段"
```

---

### Task 2: 可调冻结时长（规则层）

**Files:**
- Modify: `src/rules/types.ts:133-148`, `src/rules/sim.ts:8-25`, `src/rules/cards.ts:52-77`, `src/rules/play.ts:23-28`
- Modify: `src/ui/GameScreen.tsx:34-47`
- Test: `tests/unit/cards-submit.test.ts`, `tests/unit/sim.test.ts`

**Interfaces:**
- Consumes: `RULES.penalty_disable_ms`、`SaveData['settings']['penalty_disable_ms']`
- Produces: `GameState.penaltyMs: number`；`newGame(levelId, ctx, penaltyMs?)`；`submit(cards, tileId, now, penaltyMs?)`

- [ ] **Step 1: 写失败测试**

`tests/unit/cards-submit.test.ts` 的 `O2 错词惩罚` 追加：

```ts
it('O2 可配置：冻结时长来自调用方', () => {
  const s = game()
  const card = focusCard(s.cards)!
  const bad = card.tiles.find((t) => t.letter !== card.slots[0])!
  const oneSecond = submit(s.cards, bad.tileId, 10, 1000)
  expect(oneSecond.cards[0].tiles.find((t) => t.tileId === bad.tileId)!.disabledUntil).toBe(11)
  const zero = submit(s.cards, bad.tileId, 10, 0)
  expect(zero.cards[0].tiles.find((t) => t.tileId === bad.tileId)!.disabledUntil).toBe(10)
})
```

`tests/unit/sim.test.ts` 追加：

```ts
it('newGame 接受冻结时长并写入状态', () => {
  expect(newGame(M0_LEVEL_ID, CTX).penaltyMs).toBe(2000)
  expect(newGame(M0_LEVEL_ID, CTX, 0).penaltyMs).toBe(0)
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npx vitest run tests/unit/cards-submit.test.ts tests/unit/sim.test.ts
```

Expected: FAIL，`penaltyMs` 不存在，`submit` 仍写死 2 秒。

- [ ] **Step 3: 实现**

`src/rules/types.ts` 的 `GameState` 追加：

```ts
  /** 错字母块禁用时长（毫秒），来自存档设置（O2） */
  penaltyMs: number
```

`src/rules/sim.ts`：

```ts
export function newGame(levelId: string, ctx: Ctx, penaltyMs: number = RULES.penalty_disable_ms): GameState {
  const level = ctx.levels[levelId]
  if (!level) throw new Error(`newGame: 关卡不存在 ${levelId}`)
  const hand = createHand(level.deckIds, ctx)
  return {
    levelId,
    t: 0,
    sun: SUN.start,
    cards: hand.cards,
    deckCursor: hand.deckCursor,
    seq: hand.seq,
    plants: [],
    zombies: [],
    spawned: 0,
    panelOpen: false,
    outcome: null,
    penaltyMs
  }
}
```

`src/rules/cards.ts`：

```ts
export function submit(
  cards: readonly Card[],
  tileId: number,
  now: number,
  penaltyMs: number = RULES.penalty_disable_ms
): { cards: Card[]; events: Event[] } {
```

```ts
    tile.disabledUntil = now + penaltyMs / 1000
```

`src/rules/play.ts`：

```ts
  const r = submit(state.cards, tileId, state.t, state.penaltyMs)
```

`src/ui/GameScreen.tsx` 先加载存档再建局：

```ts
  const level = CTX.levels[levelId]
  const [initialSave] = useState(() => loadSave())
  const [state, setState] = useState<GameState>(() =>
    newGame(levelId, CTX, initialSave.settings.penalty_disable_ms)
  )
  const stateRef = useRef(state)
```

删除原来位于第 46 行的 `const [initialSave] = useState(() => loadSave())`，其余 hooks 顺序不变。

- [ ] **Step 4: 跑测试确认通过**

```bash
npx vitest run tests/unit/cards-submit.test.ts tests/unit/sim.test.ts
```

Expected: PASS，默认 2 秒行为不变。

- [ ] **Step 5: 提交**

```bash
git add src/rules/types.ts src/rules/sim.ts src/rules/cards.ts src/rules/play.ts src/ui/GameScreen.tsx tests/unit/cards-submit.test.ts tests/unit/sim.test.ts
git commit -m "feat: 错字母冻结时长改为可配置"
```

---

### Task 3: 音效素材、播放器与事件接入

**Files:**
- Create: `public/assets/audio/*.mp3`, `public/assets/CREDITS.md`
- Create: `src/platform/audio.ts`
- Create: `src/ui/sfx.ts`
- Modify: `src/ui/GameScreen.tsx:22-118`
- Test: `tests/unit/sfx.test.ts`

**Interfaces:**
- Consumes: `Event` 联合类型
- Produces: `type SfxName = 'fill_ok' | 'fill_wrong' | 'arm' | 'plant' | 'sun_drop' | 'zombie_die'`；`createAudio(makeEl?)` → `{ unlock(); play(name); setEnabled(v); }`；`sfxForEvent(event): SfxName | null`

- [ ] **Step 1: 写失败测试**

创建 `tests/unit/sfx.test.ts`：

```ts
import { describe, expect, it, vi } from 'vitest'
import { createAudio, type AudioLike } from '../../src/platform/audio'
import { sfxForEvent } from '../../src/ui/sfx'

describe('事件 → 音效', () => {
  it('六类事件映射到固定音效', () => {
    expect(sfxForEvent({ type: 'filled', slot: 0 })).toBe('fill_ok')
    expect(sfxForEvent({ type: 'wrong', tileId: 1 })).toBe('fill_wrong')
    expect(sfxForEvent({ type: 'armed', plantId: 'sprout' })).toBe('arm')
    expect(sfxForEvent({ type: 'placed', plantId: 'sprout', lane: 0, col: 0 })).toBe('plant')
    expect(sfxForEvent({ type: 'sun_gained', amount: 25 })).toBe('sun_drop')
    expect(sfxForEvent({ type: 'zombie_died' })).toBe('zombie_die')
  })

  it('无音效事件返回 null', () => {
    expect(sfxForEvent({ type: 'focus_advanced' })).toBeNull()
    expect(sfxForEvent({ type: 'outcome', kind: 'cleared' })).toBeNull()
  })
})

function harness() {
  const created: (AudioLike & { play: ReturnType<typeof vi.fn> })[] = []
  const make = (src: string) => {
    const el = {
      src,
      currentTime: 0,
      volume: 1,
      preload: '',
      play: vi.fn(() => Promise.resolve())
    }
    created.push(el)
    return el
  }
  return { created, make }
}

describe('音效播放器', () => {
  it('播放会建元素、设音量并重置进度', () => {
    const { created, make } = harness()
    const audio = createAudio(make)
    audio.play('fill_ok')
    expect(created).toHaveLength(1)
    expect(created[0].src).toBe('/assets/audio/fill_ok.mp3')
    expect(created[0].volume).toBe(0.35)
    expect(created[0].currentTime).toBe(0)
    expect(created[0].play).toHaveBeenCalledTimes(1)
  })

  it('关闭后不创建、不播放', () => {
    const { created, make } = harness()
    const audio = createAudio(make)
    audio.setEnabled(false)
    audio.play('fill_ok')
    expect(created).toHaveLength(0)
  })

  it('解锁预载 6 个音效，重复解锁不重复创建', () => {
    const { created, make } = harness()
    const audio = createAudio(make)
    audio.unlock()
    audio.unlock()
    expect(created).toHaveLength(6)
  })

  it('play 抛错被吞掉，不向上抛', () => {
    const make = () => ({
      src: '',
      currentTime: 0,
      volume: 1,
      preload: '',
      play: () => Promise.reject(new Error('blocked'))
    })
    const audio = createAudio(make)
    expect(() => audio.play('arm')).not.toThrow()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npx vitest run tests/unit/sfx.test.ts
```

Expected: FAIL，模块不存在。

- [ ] **Step 3: 下载音效并转 MP3**

```bash
mkdir -p public/assets/audio /tmp/m4-sfx
ID=6173736574732f696e746572666163652d736f756e6473
URL=$(curl -s -H "Referer: https://kenney.nl/assets/interface-sounds" "https://kenney.nl/download-link/$ID" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).url))")
curl -s "$URL" -o /tmp/m4-sfx/interface.zip
python - <<'PY'
import os
import zipfile
from pathlib import Path

tmp = Path(os.environ['TEMP']) / 'm4-sfx'
wanted = {'confirmation_001', 'error_004', 'confirmation_002', 'drop_001', 'pluck_001', 'scratch_001'}
z = zipfile.ZipFile(tmp / 'interface.zip')
found = set()
for info in z.namelist():
    path = Path(info)
    if path.suffix == '.ogg' and path.stem in wanted:
        (tmp / f'{path.stem}.ogg').write_bytes(z.read(info))
        found.add(path.stem)
missing = wanted - found
if missing:
    raise SystemExit(f'zip 里缺少：{sorted(missing)}')
print(f'extracted {sorted(found)}')
PY
for pair in confirmation_001:fill_ok error_004:fill_wrong confirmation_002:arm drop_001:plant pluck_001:sun_drop scratch_001:zombie_die; do
  src="${pair%%:*}"; dst="${pair##*:}"
  ffmpeg -y -loglevel error -i "/tmp/m4-sfx/$src.ogg" -ac 1 -ar 44100 -b:a 96k "public/assets/audio/$dst.mp3"
done
ls -l public/assets/audio
```

Expected: 6 个 MP3，总计 <120KB。

创建 `public/assets/CREDITS.md`：

```markdown
# 素材许可

## 音效

- Kenney · Interface Sounds（CC0 1.0）
  https://kenney.nl/assets/interface-sounds
- Kenney · UI Audio（CC0 1.0，预载音色参考）
  https://kenney.nl/assets/ui-audio

已转换为单声道 96kbps MP3，用于兼容 Safari。

## 字体

- Luckiest Guy（SIL Open Font License 1.1），经 `@fontsource/luckiest-guy` 打包
- Nunito Variable（SIL Open Font License 1.1），经 `@fontsource-variable/nunito` 打包

## 角色美术

全部为项目原创 ImageGen 生成图，提示词见 `assets/ART_PROMPTS.md`。
不含任何第三方游戏素材。
```

- [ ] **Step 4: 实现播放器与映射**

创建 `src/platform/audio.ts`：

```ts
export type SfxName = 'fill_ok' | 'fill_wrong' | 'arm' | 'plant' | 'sun_drop' | 'zombie_die'

export type AudioLike = {
  src: string
  currentTime: number
  volume: number
  preload: string
  play(): Promise<void>
}

const FILES: Record<SfxName, string> = {
  fill_ok: '/assets/audio/fill_ok.mp3',
  fill_wrong: '/assets/audio/fill_wrong.mp3',
  arm: '/assets/audio/arm.mp3',
  plant: '/assets/audio/plant.mp3',
  sun_drop: '/assets/audio/sun_drop.mp3',
  zombie_die: '/assets/audio/zombie_die.mp3'
}

export function createAudio(makeEl: (src: string) => AudioLike = (src) => new Audio(src)) {
  const pool = new Map<SfxName, AudioLike>()
  let enabled = true
  let unlocked = false

  const ensure = (name: SfxName): AudioLike | null => {
    const hit = pool.get(name)
    if (hit) return hit
    try {
      const el = makeEl(FILES[name])
      el.preload = 'auto'
      el.volume = 0.35
      pool.set(name, el)
      return el
    } catch {
      return null
    }
  }

  const unlock = () => {
    if (unlocked) return
    unlocked = true
    for (const name of Object.keys(FILES) as SfxName[]) ensure(name)
  }

  const play = (name: SfxName) => {
    if (!enabled) return
    const el = ensure(name)
    if (!el) return
    try {
      el.currentTime = 0
      void el.play().catch(() => {})
    } catch {
      // 自动播放策略或解码失败：静默降级
    }
  }

  const setEnabled = (value: boolean) => {
    enabled = value
  }

  return { unlock, play, setEnabled }
}
```

创建 `src/ui/sfx.ts`：

```ts
import type { Event } from '../rules/types'
import type { SfxName } from '../platform/audio'

export function sfxForEvent(event: Event): SfxName | null {
  switch (event.type) {
    case 'filled':
      return 'fill_ok'
    case 'wrong':
      return 'fill_wrong'
    case 'armed':
      return 'arm'
    case 'placed':
      return 'plant'
    case 'sun_gained':
      return 'sun_drop'
    case 'zombie_died':
      return 'zombie_die'
    default:
      return null
  }
}
```

- [ ] **Step 5: 接入 GameScreen**

在 `src/ui/GameScreen.tsx` 顶部加入：

```ts
import { createAudio } from '../platform/audio'
import { sfxForEvent } from './sfx'
```

在组件内 `initialSave` 之后加入：

```ts
  const [audio] = useState(() => createAudio())
```

新增 effect：

```ts
  useEffect(() => {
    audio.setEnabled(initialSave.settings.sound_enabled)
    const unlock = () => audio.unlock()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [audio, initialSave])
```

在 `apply` 的循环开头加入：

```ts
    for (const e of events) {
      const sfx = sfxForEvent(e)
      if (sfx) audio.play(sfx)
```

并把 `audio` 加入 `apply` 的依赖数组。

- [ ] **Step 6: 跑测试与类型检查**

```bash
npx vitest run tests/unit/sfx.test.ts && npx tsc --noEmit
```

Expected: PASS，无类型错误。

- [ ] **Step 7: 提交**

```bash
git add public/assets/audio public/assets/CREDITS.md src/platform/audio.ts src/ui/sfx.ts src/ui/GameScreen.tsx tests/unit/sfx.test.ts
git commit -m "feat: 接入 Kenney CC0 音效与事件映射"
```

---

### Task 4: 设置页音效开关与冻结时长

**Files:**
- Modify: `src/ui/SettingsOverlay.tsx`
- Modify: `src/ui/game.css:736-780`

**Interfaces:**
- Consumes: Task 1 的 `sound_enabled`、`penalty_disable_ms`
- Produces: 设置页写入存档；无需新导出

- [ ] **Step 1: 改造 SettingsOverlay**

将 `toggleSpeech` 替换为统一 patch：

```tsx
import type { SaveData } from '../rules/stats'

  const patch = (value: Partial<SaveData['settings']>) => {
    const next = { ...save, settings: { ...save.settings, ...value } }
    setSave(next)
    persistSave(next)
  }

  const toggleSpeech = () => patch({ speech_enabled: !save.settings.speech_enabled })
  const toggleSound = () => patch({ sound_enabled: !save.settings.sound_enabled })
  const setPenalty = (ms: number) => patch({ penalty_disable_ms: ms })
```

在朗读开关后插入音效行：

```tsx
        <div className="settings__row">
          <div>
            <div className="settings__label">音效</div>
            <div className="settings__sub">填对、种植、产阳光和僵尸倒下时的短音效</div>
          </div>
          <button
            type="button"
            className={`settings__toggle ${save.settings.sound_enabled ? 'is-on' : ''}`}
            aria-pressed={save.settings.sound_enabled}
            onClick={toggleSound}
          >
            {save.settings.sound_enabled ? '已开启' : '已关闭'}
          </button>
        </div>

        <div className="settings__row">
          <div>
            <div className="settings__label">拼错字母冻结</div>
            <div className="settings__sub">点错后该字母块暂时不能点；0 秒适合已经熟练的孩子</div>
          </div>
          <span className="settings__seg" role="group" aria-label="拼错字母冻结时长">
            {[0, 1000, 2000].map((ms) => (
              <button
                key={ms}
                type="button"
                className={save.settings.penalty_disable_ms === ms ? 'is-on' : ''}
                aria-pressed={save.settings.penalty_disable_ms === ms}
                onClick={() => setPenalty(ms)}
              >
                {ms / 1000} 秒
              </button>
            ))}
          </span>
        </div>
```

- [ ] **Step 2: 补样式**

`src/ui/game.css` 的 `.settings__toggle` 后加入：

```css
.settings__seg {
  display: flex;
  gap: 6px;
}

.settings__seg button {
  border: 2px solid #6b4a1e;
  border-radius: 999px;
  background: #2a1c0e;
  color: #ffe9be;
  font-weight: 900;
  font-size: 12px;
  padding: 5px 10px;
  cursor: pointer;
}

.settings__seg button.is-on {
  background: linear-gradient(180deg, #ffe9a8, #f3c24f);
  color: #3a2410;
}
```

- [ ] **Step 3: 手工验证（浏览器）**

```bash
npm run dev
```

打开选关页 → 设置：切换音效、切换冻结时长，刷新后保持；进入关卡点错字母，按所选时长禁用。

- [ ] **Step 4: 提交**

```bash
git add src/ui/SettingsOverlay.tsx src/ui/game.css
git commit -m "feat: 设置页加入音效开关与冻结时长"
```

---

### Task 5: 字体自托管与启动门禁

**Files:**
- Modify: `package.json`, `index.html:9-14`, `src/main.tsx`, `src/styles/tokens.css:43-44`
- Create: `src/platform/fonts.ts`
- Test: `tests/unit/fonts.test.ts`

**Interfaces:**
- Produces: `waitForFonts(doc?, timeoutMs?): Promise<boolean>`

- [ ] **Step 1: 安装字体**

```bash
npm install @fontsource/luckiest-guy@5.3.0 @fontsource-variable/nunito@5.3.0
```

- [ ] **Step 2: 写失败测试**

创建 `tests/unit/fonts.test.ts`：

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { waitForFonts } from '../../src/platform/fonts'

type FakeFonts = { load: (font: string) => Promise<unknown>; ready: Promise<unknown> }
const doc = (fonts: FakeFonts) => ({ fonts } as unknown as Document)

describe('字体就绪门禁', () => {
  afterEach(() => vi.useRealTimers())

  it('三款字重加载完成后返回 true', async () => {
    const loaded: string[] = []
    const fake = {
      load: (font: string) => {
        loaded.push(font)
        return Promise.resolve([])
      },
      ready: Promise.resolve()
    }
    await expect(waitForFonts(doc(fake), 1000)).resolves.toBe(true)
    expect(loaded).toHaveLength(3)
  })

  it('超时返回 false 且不抛错', async () => {
    vi.useFakeTimers()
    const fake = { load: () => new Promise<never>(() => {}), ready: new Promise<never>(() => {}) }
    const pending = waitForFonts(doc(fake), 50)
    await vi.advanceTimersByTimeAsync(50)
    await expect(pending).resolves.toBe(false)
  })

  it('加载失败返回 false', async () => {
    const fake = { load: () => Promise.reject(new Error('font')), ready: Promise.resolve() }
    await expect(waitForFonts(doc(fake), 1000)).resolves.toBe(false)
  })
})
```

- [ ] **Step 3: 跑测试确认失败**

```bash
npx vitest run tests/unit/fonts.test.ts
```

Expected: FAIL，模块不存在。

- [ ] **Step 4: 实现**

创建 `src/platform/fonts.ts`：

```ts
export async function waitForFonts(
  doc: Pick<Document, 'fonts'> = document,
  timeoutMs = 1500
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs)
  })
  try {
    const ready = Promise.all([
      doc.fonts.load('400 16px "Luckiest Guy"'),
      doc.fonts.load('700 16px "Nunito Variable"'),
      doc.fonts.load('900 16px "Nunito Variable"')
    ])
      .then(() => doc.fonts.ready)
      .then(() => true)
    return await Promise.race([ready, timeout])
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}
```

修改 `src/main.tsx`：

```tsx
import '@fontsource/luckiest-guy'
import '@fontsource-variable/nunito'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './ui/App'
import { RAW } from './content'
import { assertContent, validateContent } from './content/validate'
import { waitForFonts } from './platform/fonts'
```

```tsx
try {
  assertContent(RAW)
  const { warnings } = validateContent(RAW)
  if (warnings.length) console.warn('[content] 报告（不阻断）：\n- ' + warnings.join('\n- '))
  void waitForFonts().finally(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  })
} catch (err) {
  root.render(<BootError message={err instanceof Error ? err.message : String(err)} />)
}
```

删除 `index.html` 中这三段：

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Nunito:wght@600;700;800;900&display=swap"
      rel="stylesheet"
    />
```

`src/styles/tokens.css` 的字体栈改成变量字体的真实族名（Fontsource 变量包声明为 `Nunito Variable`）：

```css
  --font-display: 'Luckiest Guy', 'Nunito Variable', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  --font-body: 'Nunito Variable', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
```

- [ ] **Step 5: 验证**

```bash
npx vitest run tests/unit/fonts.test.ts && npm run build
```

Expected: 测试 PASS；构建产物含 woff2；`dist/index.html` 无 Google Fonts 链接。

- [ ] **Step 6: 提交**

```bash
git add package.json package-lock.json index.html src/main.tsx src/styles/tokens.css src/platform/fonts.ts tests/unit/fonts.test.ts
git commit -m "feat: 字体改为自托管并加入启动就绪门禁"
```

---

### Task 6: 美术资产管线与 12 个角色生成

**Files:**
- Create: `.gitignore` 追加 `art-source/`
- Create: `scripts/matting.py`
- Create: `assets/ART_PROMPTS.md`
- Create: `art-source/plants/*.png`, `art-source/zombies/*.png`（本地，不提交）
- Create: `public/assets/plants/*.png`, `public/assets/zombies/*.png`

**Interfaces:**
- Produces: 12×3 张透明 PNG，命名 `{id}_{s,c,l}.png`

- [ ] **Step 1: 目录与忽略**

```bash
mkdir -p art-source/plants art-source/zombies public/assets/plants public/assets/zombies
printf '\nart-source/\n' >> .gitignore
```

- [ ] **Step 2: 写抠图脚本**

创建 `scripts/matting.py`：

```python
#!/usr/bin/env python3
"""白底角色图 -> 透明 PNG + 三档尺寸 + 可选接触表。

用法：
  python scripts/matting.py --src art-source/plants --out public/assets/plants --sheet art-source/plants-sheet.png
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

TIERS = {'l': 256, 'c': 128, 's': 96}
MARGIN = 0.06


def matte(src: Path) -> Image.Image:
    im = Image.open(src).convert('RGBA')
    rgb = im.convert('RGB')
    w, h = rgb.size
    marker = (255, 0, 255)
    for xy in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        ImageDraw.floodfill(rgb, xy, marker, thresh=28)

    px = rgb.load()
    out = im.copy()
    alpha = out.getchannel('A')
    ap = alpha.load()
    for y in range(h):
        for x in range(w):
            if px[x, y] == marker:
                ap[x, y] = 0
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    out.putalpha(alpha)

    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
    side = max(out.size)
    pad = max(1, int(side * MARGIN))
    canvas = Image.new('RGBA', (side + pad * 2, side + pad * 2), (0, 0, 0, 0))
    canvas.paste(out, ((canvas.width - out.width) // 2, (canvas.height - out.height) // 2))
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--src', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--sheet')
    args = parser.parse_args()

    src = Path(args.src)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    names = sorted(p for p in src.glob('*.png') if not p.name.endswith('-sheet.png'))
    thumbs = []
    for path in names:
        master = matte(path)
        for tier, size in TIERS.items():
            master.resize((size, size), Image.LANCZOS).save(out / f'{path.stem}_{tier}.png', optimize=True)
        thumbs.append((path.stem, master.resize((256, 256), Image.LANCZOS)))

    if args.sheet and thumbs:
        cols = 4
        rows = (len(thumbs) + cols - 1) // cols
        sheet = Image.new('RGBA', (cols * 280, rows * 300), (245, 238, 214, 255))
        draw = ImageDraw.Draw(sheet)
        for i, (name, img) in enumerate(thumbs):
            x = (i % cols) * 280 + 12
            y = (i // cols) * 300 + 12
            sheet.alpha_composite(img, (x, y))
            draw.text((x, y + 262), name, fill=(60, 40, 20, 255))
        sheet.save(args.sheet)

    print(f'matted {len(names)} images -> {out}')


if __name__ == '__main__':
    main()
```

- [ ] **Step 3: 生成风格锚图（植物）**

用 ImageGen 生成 `sprout`，尺寸 1024×1024：

```text
Original children's storybook game character: a tiny sprout creature with two broad rounded green leaves at the base, a short sturdy stem, and a glowing golden round bud on top with a gentle smiling face. Warm yellow glow around the bud, cute and friendly.

Style: hand-painted gouache texture, clean thick dark-brown outlines, soft cel shading, warm saturated palette, cute rounded shapes, full body, three-quarter view facing right, centered, isolated on pure white background, no shadow, no ground, no text, no watermark, no resemblance to any existing game character, 1024x1024.
```

把返回图片复制为 `art-source/plants/sprout.png`，用 Read 查看，确认无原版影射后**暂停等待产品方确认锚图**。

- [ ] **Step 4: 生成其余 7 株植物**

以 `art-source/plants/sprout.png` 作为参考图（`images: ["art-source/plants/sprout.png"]`），逐个生成并保存：

| 文件 | 提示词主体（追加 Step 3 的 Style 段） |
| --- | --- |
| `slinger.png` | A coiled green vine creature with two leaf arms; a curly tendril holds a trumpet-shaped berry pod pointing to the right like a natural launcher. Small determined face on the main vine. No projectiles. |
| `bush.png` | A low, wide defensive bush made of three rounded leafy clumps, with two small pebble-like eyes and a sturdy stance. Calm and dependable. |
| `clover.png` | A cheerful three-leaf clover creature with heart-shaped leaves and a tiny yellow flower on top; short stem and small roots. |
| `thorn.png` | A thorny vine creature with a segmented stem, small sharp thorns, and a red flower bud at the tip pointing right; cute but prickly. |
| `thistle.png` | A purple globe thistle creature with a round spiky flower head, jagged leaves, and a short stem; the flower head aims to the right. |
| `fern.png` | A shield-shaped cluster of layered fern fronds, wide and low, with a protective stance; fresh green fronds with visible veins. |
| `moss.png` | A low fluffy moss carpet creature with a rounded mossy body, tiny pebbles and spore capsules on top, and two small sleepy eyes. |

- [ ] **Step 5: 生成僵尸锚图与 3 个变体**

生成 `z_basic`：

```text
Original children's storybook game character: a gentle clumsy wanderer with sage-green skin, messy dark hair, a patched slate-blue hoodie, dark trousers, and one arm outstretched, shambling forward. Friendly-spooky, not scary, no blood, no wounds.

Style: hand-painted gouache texture, clean thick dark-brown outlines, soft cel shading, warm saturated palette, cute rounded shapes, full body, three-quarter view facing right, centered, isolated on pure white background, no shadow, no ground, no text, no watermark, no resemblance to any existing game character, 1024x1024.
```

保存为 `art-source/zombies/z_basic.png` 并**暂停确认**。确认后以它为参考图生成：

| 文件 | 追加描述 |
| --- | --- |
| `z_cone.png` | The same wanderer wearing a bright orange traffic cone as a hat. |
| `z_bucket.png` | The same wanderer wearing a dented silver metal bucket as a helmet. |
| `z_flag.png` | The same wanderer holding a small tattered red pennant on a wooden stick. |

- [ ] **Step 6: 抠图与接触表**

```bash
python scripts/matting.py --src art-source/plants --out public/assets/plants --sheet art-source/plants-sheet.png
python scripts/matting.py --src art-source/zombies --out public/assets/zombies --sheet art-source/zombies-sheet.png
ls public/assets/plants public/assets/zombies
```

Expected: 每类 8/4 个源图 × 3 档 = 24/12 个 PNG。

- [ ] **Step 7: 整体复核**

用 Read 查看两张接触表，逐张检查：白边、比例、朝向、轮廓区分度、是否影射既有角色。把复核对齐结果记录到 `assets/ART_PROMPTS.md`；不满意的单张重新生成并重跑抠图。

创建 `assets/ART_PROMPTS.md`，写入 Step 3–5 的三段完整提示词、每张图的文件名、生成日期与复核结论。

- [ ] **Step 8: 提交素材**

```bash
git add .gitignore scripts/matting.py assets/ART_PROMPTS.md public/assets/plants public/assets/zombies
git commit -m "feat: 加入 12 个原创角色三档美术资产与抠图脚本"
```

---

### Task 7: 角色图接入与资产门禁

**Files:**
- Create: `src/art/CharacterArt.tsx`, `src/art/character.css`
- Modify: `src/rules/types.ts:38-44`, `src/content/zombies.json`, `src/content/validate.ts:120-125`
- Modify: `src/ui/GameScreen.tsx:269-301`, `src/ui/HandCard.tsx:1-40`, `src/ui/LevelSelect.tsx:1-46`
- Modify: `tsconfig.json:20`（include 加入 `scripts`，让新脚本进入 `tsc --noEmit`）
- Create: `scripts/validate-assets.ts`
- Modify: `scripts/validate-content.ts`
- Test: `tests/unit/character-art.test.ts`, `tests/unit/validate-assets.test.ts`, `tests/unit/content-validation.test.ts`

**Interfaces:**
- Produces: `artSrc(base, tier)`；`<CharacterArt art tier size alt lazy>`；`pngSize(buf)`；`tierPaths(base)`；`validateAssets(raw, root?)`

- [ ] **Step 1: 写失败测试**

创建 `tests/unit/character-art.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { artSrc } from '../../src/art/CharacterArt'

describe('角色图路径', () => {
  it('把 _s 基准换成三档', () => {
    expect(artSrc('assets/plants/sprout_s.png', 's')).toBe('/assets/plants/sprout_s.png')
    expect(artSrc('assets/plants/sprout_s.png', 'c')).toBe('/assets/plants/sprout_c.png')
    expect(artSrc('assets/plants/sprout_s.png', 'l')).toBe('/assets/plants/sprout_l.png')
  })

  it('非法基准路径直接抛错', () => {
    expect(() => artSrc('assets/plants/sprout.png', 'l')).toThrow(/_s\.png/)
  })
})
```

创建 `tests/unit/validate-assets.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { pngSize, tierPaths } from '../../scripts/validate-assets'

function pngHeader(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24)
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buf, 0)
  buf.writeUInt32BE(13, 8)
  buf.write('IHDR', 12, 'ascii')
  buf.writeUInt32BE(width, 16)
  buf.writeUInt32BE(height, 20)
  return buf
}

describe('资产门禁工具', () => {
  it('tierPaths 生成 s/c/l 三档', () => {
    expect(tierPaths('assets/plants/sprout_s.png').map((t) => t.file)).toEqual([
      'assets/plants/sprout_s.png',
      'assets/plants/sprout_c.png',
      'assets/plants/sprout_l.png'
    ])
  })

  it('pngSize 读取 IHDR 宽高', () => {
    expect(pngSize(pngHeader(96, 96))).toEqual({ width: 96, height: 96 })
    expect(pngSize(pngHeader(256, 256))).toEqual({ width: 256, height: 256 })
  })

  it('非 PNG 返回 null', () => {
    expect(pngSize(Buffer.from('nope'))).toBeNull()
  })
})
```

在 `tests/unit/content-validation.test.ts` 追加：

```ts
it('僵尸 art 路径必须合法', () => {
  const raw = clone()
  raw.zombies[0] = { ...raw.zombies[0], art: 'assets/zombies/bad.gif' }
  expect(errorsOf(raw)).toContain('僵尸 z_basic：art 路径格式不合法 assets/zombies/bad.gif')
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npx vitest run tests/unit/character-art.test.ts tests/unit/validate-assets.test.ts tests/unit/content-validation.test.ts
```

Expected: FAIL，模块不存在 / 僵尸没有 art 字段。

- [ ] **Step 3: 更新内容模型**

`src/rules/types.ts` 的 `ZombieDef`：

```ts
export type ZombieDef = {
  id: string
  name: string
  art: string
  hp: number
  speed: number
  dps: number
}
```

`src/content/zombies.json`：

```json
[
  { "id": "z_basic", "name": "慢步者", "art": "assets/zombies/z_basic_s.png", "hp": 100, "speed": 0.09, "dps": 20 },
  { "id": "z_cone", "name": "路障者", "art": "assets/zombies/z_cone_s.png", "hp": 170, "speed": 0.09, "dps": 20 },
  { "id": "z_bucket", "name": "铁桶者", "art": "assets/zombies/z_bucket_s.png", "hp": 300, "speed": 0.08, "dps": 20 },
  { "id": "z_flag", "name": "旗帜者", "art": "assets/zombies/z_flag_s.png", "hp": 100, "speed": 0.11, "dps": 20 }
]
```

以现有文件数值为准，只补 `art`；不要改动 hp/speed/dps。

`src/content/validate.ts` 的僵尸校验追加：

```ts
    if (!ART_RE.test(z.art)) errors.push(`僵尸 ${z.id}：art 路径格式不合法 ${z.art}`)
```

- [ ] **Step 4: 实现组件**

创建 `src/art/CharacterArt.tsx`：

```tsx
import './character.css'

export type ArtTier = 's' | 'c' | 'l'

type Props = {
  art: string
  tier?: ArtTier
  size: number
  alt?: string
  className?: string
  lazy?: boolean
}

export function artSrc(base: string, tier: ArtTier): string {
  if (!base.endsWith('_s.png')) throw new Error(`art 路径必须以 _s.png 结尾：${base}`)
  return `/${base.replace(/_s\.png$/, `_${tier}.png`)}`
}

export function CharacterArt({ art, tier = 's', size, alt = '', className = '', lazy = false }: Props) {
  return (
    <img
      className={`character-art ${className}`.trim()}
      src={artSrc(art, tier)}
      width={size}
      height={size}
      alt={alt}
      loading={lazy ? 'lazy' : 'eager'}
      draggable={false}
    />
  )
}
```

创建 `src/art/character.css`：

```css
.character-art {
  display: block;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  filter: drop-shadow(0 3px 2px rgba(40, 25, 8, 0.18));
}
```

- [ ] **Step 5: 接入 GameScreen 与 HandCard**

`src/ui/GameScreen.tsx` 删除 `PLANT_ART`、`ZombieArt`、`ZombieVariant` 导入与 `ZOMBIE_VARIANT` 常量，加入：

```ts
import { CharacterArt } from '../art/CharacterArt'
```

场上植物改为：

```tsx
        {state.plants.map((p) => {
          const def = CTX.plants[p.plantId]
          if (!def) return null
          const r = cellRect(p.lane, p.col)
          const buffed = p.buffUntil !== undefined && p.buffUntil > state.t
          return (
            <span
              key={p.uid}
              className={['placed', buffed ? 'is-buffed' : ''].join(' ')}
              style={{ left: r.x + (r.w - 78) / 2, top: r.y + (r.h - 78) / 2 }}
            >
              <CharacterArt art={def.art} tier="s" size={78} />
            </span>
          )
        })}
```

僵尸改为：

```tsx
        {state.zombies.map((z) => {
          const def = CTX.zombies[z.zombieId]
          if (!def) return null
          return (
            <span
              key={z.uid}
              className="zombie"
              style={{ left: xToPx(z.x), top: laneToPx(z.lane) - 72 }}
            >
              <CharacterArt art={def.art} tier="s" size={104} />
              {z.hp < z.maxhp && (
                <span className="zombie__hp">
                  <span style={{ width: `${Math.max(0, (z.hp / z.maxhp) * 100)}%` }} />
                </span>
              )}
            </span>
          )
        })}
```

`src/ui/HandCard.tsx`：

- 删除第 1 行 `import { PLANT_ART } from '../art/PlantArt'`。
- 删除第 23 行 `const Art = PLANT_ART[plant.id as keyof typeof PLANT_ART]`。
- 加入 `import { CharacterArt } from '../art/CharacterArt'`。
- 把第 39 行 `<span className="hand__art">{Art ? <Art size={58} /> : null}</span>` 换成：

```tsx
      <span className="hand__art">
        <CharacterArt art={plant.art} tier="c" size={58} />
      </span>
```

`src/ui/LevelSelect.tsx` 把选关卡上的三株 SVG 也换成 PNG（场景 Sky/House/GrassTufts 保持）：

- 删除 `PLANT_ART` 导入与 `const Sprout / Slinger / Bush` 三行，加入 `import { CharacterArt } from '../art/CharacterArt'`。
- 第 42–46 行改为：

```tsx
                <span style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                  <CharacterArt art={CTX.plants.bush.art} tier="c" size={54} />
                  <CharacterArt art={CTX.plants.slinger.art} tier="c" size={64} />
                  <CharacterArt art={CTX.plants.sprout.art} tier="c" size={58} />
                </span>
```

- [ ] **Step 6: 资产门禁**

`tsconfig.json` 的 `include` 改为：

```json
  "include": ["src", "tests", "scripts", "vite.config.ts", "vitest.config.ts"]
```

创建 `scripts/validate-assets.ts`：

```ts
import fs from 'node:fs'
import path from 'node:path'
import type { RawContent } from '../src/content/index'

const TIERS = [
  { suffix: 's', size: 96 },
  { suffix: 'c', size: 128 },
  { suffix: 'l', size: 256 }
] as const

export function pngSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24) return null
  if (buf.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return null
  if (buf.subarray(12, 16).toString('ascii') !== 'IHDR') return null
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

export function tierPaths(base: string): { suffix: 's' | 'c' | 'l'; size: number; file: string }[] {
  if (!base.endsWith('_s.png')) throw new Error(`art 路径必须以 _s.png 结尾：${base}`)
  return TIERS.map((tier) => ({
    ...tier,
    file: base.replace(/_s\.png$/, `_${tier.suffix}.png`)
  }))
}

export function validateAssets(raw: RawContent, root = process.cwd()): string[] {
  const issues: string[] = []
  const entries = [
    ...raw.plants.map((p) => ({ label: `植物 ${p.id}`, base: p.art })),
    ...raw.zombies.map((z) => ({ label: `僵尸 ${z.id}`, base: z.art }))
  ]
  let total = 0

  for (const entry of entries) {
    for (const tier of tierPaths(entry.base)) {
      const file = path.join(root, 'public', tier.file)
      if (!fs.existsSync(file)) {
        issues.push(`${entry.label}：缺少 ${tier.file}`)
        continue
      }
      const buf = fs.readFileSync(file)
      const size = pngSize(buf)
      if (!size || size.width !== tier.size || size.height !== tier.size) {
        issues.push(
          `${entry.label}：${tier.file} 尺寸应为 ${tier.size}×${tier.size}（实际 ${
            size ? `${size.width}×${size.height}` : '非 PNG'
          }）`
        )
      }
      if (buf.length > 200 * 1024) issues.push(`${entry.label}：${tier.file} 超过 200KB`)
      total += buf.length
    }
  }

  if (total > 2 * 1024 * 1024) {
    issues.push(`角色图合计 ${(total / 1024 / 1024).toFixed(2)}MB，超过 2MB`)
  }
  if (!fs.existsSync(path.join(root, 'public/assets/CREDITS.md'))) {
    issues.push('缺少 public/assets/CREDITS.md')
  }
  return issues
}
```

修改 `scripts/validate-content.ts`：

```ts
import { validateAssets } from './validate-assets'
```

在内容错误输出之后追加：

```ts
const assetIssues = validateAssets(RAW)
assetIssues.forEach((issue) => console.error(`- ${issue}`))
if (assetIssues.length) {
  process.exitCode = 1
} else {
  console.log(`资产校验通过：${(RAW.plants.length + RAW.zombies.length) * 3} 张角色图`)
}
```

- [ ] **Step 7: 跑测试与门禁**

```bash
npx vitest run tests/unit/character-art.test.ts tests/unit/validate-assets.test.ts tests/unit/content-validation.test.ts
npm run validate
```

Expected: 测试 PASS；内容校验与资产校验都通过。

- [ ] **Step 8: 提交**

```bash
git add tsconfig.json src/rules/types.ts src/content/zombies.json src/content/validate.ts src/art/CharacterArt.tsx src/art/character.css src/ui/GameScreen.tsx src/ui/HandCard.tsx src/ui/LevelSelect.tsx scripts/validate-assets.ts scripts/validate-content.ts tests/unit/character-art.test.ts tests/unit/validate-assets.test.ts tests/unit/content-validation.test.ts
git commit -m "feat: 角色图接入运行时并加入资产门禁"
```

---

### Task 8: 图鉴与只读复习表

**Files:**
- Create: `src/rules/review.ts`, `tests/unit/review.test.ts`
- Create: `src/ui/CodexOverlay.tsx`, `src/ui/codex.css`
- Modify: `src/ui/LevelSelect.tsx:1-8`, `src/ui/LevelSelect.tsx:88-96`, `src/ui/level.css`
- Modify: `src/ui/GameScreen.tsx` 的 `record` 时间源

**Interfaces:**
- Produces: `reviewRows(save, words): ReviewRow[]`；`CodexOverlay({ initialTab, onClose })`

- [ ] **Step 1: 写失败测试**

创建 `tests/unit/review.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { emptySave, recordWordResult } from '../../src/rules/stats'
import { reviewRows } from '../../src/rules/review'
import type { WordDef } from '../../src/rules/types'

const words: WordDef[] = [
  { id: 'w_apple', word: 'apple', zh: '苹果', ipa: '/x/', grade: 4, unit: 'U', letters: 5 },
  { id: 'w_banana', word: 'banana', zh: '香蕉', ipa: '/x/', grade: 4, unit: 'U', letters: 6 },
  { id: 'w_quiet', word: 'quiet', zh: '安静', ipa: '/x/', grade: 4, unit: 'U', letters: 5 }
]

describe('复习表派生', () => {
  it('只保留有学习记录的词，并按最近时间降序', () => {
    let save = emptySave()
    save = recordWordResult(save, 'w_apple', 'correct', 1_700_000_100)
    save = recordWordResult(save, 'w_banana', 'wrong', 1_700_000_200)
    save.word_stats.w_ghost = {
      correct: 9,
      wrong: 0,
      assisted: 0,
      streak: 9,
      ease: 2.5,
      last_seen_ts: 1_700_000_300
    }
    expect(reviewRows(save, words).map((r) => r.word)).toEqual(['banana', 'apple'])
  })

  it('计数完整带出，未学过的词不出现', () => {
    let save = emptySave()
    save = recordWordResult(save, 'w_quiet', 'assisted', 1_700_000_400)
    const rows = reviewRows(save, words)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      wordId: 'w_quiet',
      word: 'quiet',
      zh: '安静',
      correct: 0,
      wrong: 0,
      assisted: 1,
      streak: 0,
      lastSeen: 1_700_000_400
    })
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npx vitest run tests/unit/review.test.ts
```

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现纯函数**

创建 `src/rules/review.ts`：

```ts
import type { SaveData } from './stats'
import type { WordDef } from './types'

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

export function reviewRows(save: SaveData, words: readonly WordDef[]): ReviewRow[] {
  const byId = new Map(words.map((word) => [word.id, word]))
  const rows: ReviewRow[] = []

  for (const [wordId, stat] of Object.entries(save.word_stats)) {
    const word = byId.get(wordId)
    if (!word) continue
    if (stat.correct + stat.wrong + stat.assisted === 0 && stat.last_seen_ts === 0) continue
    rows.push({
      wordId,
      word: word.word,
      zh: word.zh,
      correct: stat.correct,
      wrong: stat.wrong,
      assisted: stat.assisted,
      streak: stat.streak,
      lastSeen: stat.last_seen_ts
    })
  }

  return rows.sort((a, b) => b.lastSeen - a.lastSeen || a.word.localeCompare(b.word))
}
```

- [ ] **Step 4: 实现图鉴浮层**

创建 `src/ui/CodexOverlay.tsx`：

```tsx
import { useEffect, useState } from 'react'
import { CharacterArt } from '../art/CharacterArt'
import { CTX, RAW } from '../content'
import { loadSave } from '../platform/save'
import { speakWord } from '../platform/speech'
import { SUN } from '../rules/constants'
import { reviewRows } from '../rules/review'
import { Button } from './Button'
import './codex.css'

export type CodexTab = 'plants' | 'zombies' | 'words' | 'review'

type Props = { initialTab: CodexTab; onClose: () => void }

const TABS: { id: CodexTab; label: string }[] = [
  { id: 'plants', label: '植物' },
  { id: 'zombies', label: '僵尸' },
  { id: 'words', label: '单词' },
  { id: 'review', label: '复习' }
]

const SLOT_LABEL = { producer: '产阳光', shooter: '远程攻击', defense: '挡在前面' } as const

const pad = (n: number) => String(n).padStart(2, '0')

function formatTime(ts: number): string {
  if (!ts || ts < 1_000_000_000) return '—'
  const d = new Date(ts * 1000)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function CodexOverlay({ initialTab, onClose }: Props) {
  const [tab, setTab] = useState<CodexTab>(initialTab)
  const [save] = useState(() => loadSave())

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const firstWave = (zombieId: string): number | null => {
    const times = Object.values(CTX.levels).flatMap((level) =>
      level.waves.filter((wave) => wave.zombie === zombieId).map((wave) => wave.t)
    )
    return times.length ? Math.min(...times) : null
  }

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label="图鉴与复习"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="codex wood">
        <div className="codex__head">
          <h2 className="codex__title display">图鉴与复习</h2>
          <div className="codex__tabs" role="tablist" aria-label="图鉴分类">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`codex__tab ${tab === item.id ? 'is-on' : ''}`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>关闭</Button>
        </div>

        <div className="codex__body">
          {tab === 'plants' && (
            <div className="codex__grid">
              {RAW.plants.map((plant) => {
                const words = Object.values(CTX.decks)
                  .filter((deck) => deck.plantId === plant.id)
                  .map((deck) => CTX.words[deck.wordId]?.word)
                  .filter((word): word is string => Boolean(word))
                return (
                  <article key={plant.id} className="codex-card">
                    <CharacterArt art={plant.art} tier="l" size={112} alt={plant.name} lazy />
                    <h3>{plant.name}</h3>
                    <p className="codex-card__sub">
                      {SLOT_LABEL[plant.slot]} · {plant.cost} 阳光
                    </p>
                    <dl className="codex-card__stats">
                      <div><dt>HP</dt><dd>{plant.hp}</dd></div>
                      <div><dt>DPS</dt><dd>{plant.dps}</dd></div>
                      {plant.slot === 'producer' && (
                        <div><dt>产光</dt><dd>+{plant.produce_amount ?? SUN.produce_amount}</dd></div>
                      )}
                    </dl>
                    <p className="codex-card__words">
                      登场词：{words.length ? words.join(' / ') : '—'}
                    </p>
                  </article>
                )
              })}
            </div>
          )}

          {tab === 'zombies' && (
            <div className="codex__grid">
              {RAW.zombies.map((zombie) => {
                const wave = firstWave(zombie.id)
                return (
                  <article key={zombie.id} className="codex-card">
                    <CharacterArt art={zombie.art} tier="l" size={112} alt={zombie.name} lazy />
                    <h3>{zombie.name}</h3>
                    <p className="codex-card__sub">首次出现：{wave === null ? '—' : `${wave}s`}</p>
                    <dl className="codex-card__stats">
                      <div><dt>HP</dt><dd>{zombie.hp}</dd></div>
                      <div><dt>速度</dt><dd>{zombie.speed.toFixed(2)}</dd></div>
                      <div><dt>DPS</dt><dd>{zombie.dps}</dd></div>
                    </dl>
                    <p className="codex-card__words">每 {zombie.speed.toFixed(2)} 格/秒向左推进</p>
                  </article>
                )
              })}
            </div>
          )}

          {tab === 'words' && (
            <div className="codex__grid">
              {RAW.words.map((word) => {
                const stat = save.word_stats[word.id]
                return (
                  <article key={word.id} className="codex-card codex-card--word">
                    <h3>{word.word}</h3>
                    <p className="codex-card__sub">{word.zh} · {word.ipa}</p>
                    <p className="codex-card__words">
                      {word.grade} 年级 · {word.unit} · {word.letters} 字母
                    </p>
                    <p className="codex-card__words">
                      {stat
                        ? `正确 ${stat.correct} · 错误 ${stat.wrong} · 提示 ${stat.assisted}`
                        : '还没练过'}
                    </p>
                    <button
                      type="button"
                      className="codex__speak"
                      disabled={!save.settings.speech_enabled}
                      title={save.settings.speech_enabled ? '朗读单词' : '在设置里打开朗读'}
                      onClick={() => speakWord(word.word)}
                    >
                      朗读
                    </button>
                  </article>
                )
              })}
            </div>
          )}

          {tab === 'review' && (
            <div className="codex__review">
              {reviewRows(save, RAW.words).length === 0 ? (
                <p className="codex__empty">还没有学习记录，去拼几个单词吧</p>
              ) : (
                <table className="codex-table">
                  <thead>
                    <tr>
                      <th>单词</th><th>正确</th><th>错误</th><th>提示</th><th>连对</th><th>最近</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewRows(save, RAW.words).map((row) => (
                      <tr key={row.wordId}>
                        <td>{row.word}<span>{row.zh}</span></td>
                        <td>{row.correct}</td>
                        <td>{row.wrong}</td>
                        <td>{row.assisted}</td>
                        <td>{row.streak}</td>
                        <td>{formatTime(row.lastSeen)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

创建 `src/ui/codex.css`：

```css
.codex {
  width: 1120px;
  max-height: 640px;
  display: flex;
  flex-direction: column;
  padding: 18px 22px 20px;
  animation: card-in 0.25s cubic-bezier(0.2, 1.4, 0.4, 1) both;
}

.codex__head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.codex__title { margin: 0; font-size: 30px; color: #fff4d6; }
.codex__tabs { display: flex; gap: 6px; margin-left: auto; }

.codex__tab {
  border: 2px solid #6b4a1e;
  border-radius: 999px;
  background: #2a1c0e;
  color: #ffe9be;
  font-weight: 900;
  font-size: 13px;
  padding: 6px 14px;
  cursor: pointer;
}

.codex__tab.is-on {
  background: linear-gradient(180deg, #ffe9a8, #f3c24f);
  color: #3a2410;
}

.codex__body { overflow: auto; padding-right: 4px; }
.codex__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.codex-card {
  background: rgba(255, 249, 226, 0.94);
  border: 3px solid #5a3c17;
  border-radius: 14px;
  padding: 12px;
  text-align: center;
  box-shadow: inset 0 -4px 0 rgba(140, 110, 60, 0.2);
}

.codex-card h3 { margin: 6px 0 2px; font-size: 16px; color: #3a2410; }
.codex-card__sub { margin: 0; font-size: 12px; font-weight: 800; color: #6b4a1e; }
.codex-card__stats {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 8px 0 6px;
}
.codex-card__stats div { display: flex; flex-direction: column; }
.codex-card__stats dt { font-size: 10px; color: #8a6a3a; font-weight: 800; }
.codex-card__stats dd { margin: 0; font-size: 14px; font-weight: 900; color: #3a2410; }
.codex-card__words { margin: 0; font-size: 11px; color: #6b4a1e; }

.codex-card--word .codex__speak {
  margin-top: 8px;
  border: 2px solid #6b4a1e;
  border-radius: 999px;
  background: linear-gradient(180deg, #ffe9a8, #f3c24f);
  color: #3a2410;
  font-weight: 900;
  font-size: 12px;
  padding: 4px 12px;
  cursor: pointer;
}

.codex-card--word .codex__speak:disabled { filter: grayscale(0.9); opacity: 0.6; cursor: not-allowed; }

.codex__review { padding: 4px 8px 8px; }
.codex__empty {
  margin: 60px 0;
  text-align: center;
  font-size: 16px;
  font-weight: 900;
  color: #ffe9be;
}

.codex-table { width: 100%; border-collapse: collapse; color: #3a2410; }
.codex-table th {
  position: sticky;
  top: 0;
  background: #e8d7ab;
  font-size: 12px;
  padding: 8px;
  text-align: left;
}
.codex-table td {
  padding: 8px;
  font-size: 13px;
  font-weight: 800;
  border-top: 1px solid rgba(107, 74, 30, 0.25);
}
.codex-table td span { margin-left: 8px; font-size: 11px; color: #8a6a3a; }
```

- [ ] **Step 5: 接入选关页**

`src/ui/LevelSelect.tsx`：

```tsx
import { CodexOverlay, type CodexTab } from './CodexOverlay'
```

```tsx
  const [codexTab, setCodexTab] = useState<CodexTab | null>(null)
```

底部按钮改为：

```tsx
        <div className="levels__foot">
          <span>当前可玩 · 1 关 / 8 株 / 13 词</span>
          <span className="levels__actions">
            <button type="button" className="levels__settings" onClick={() => setCodexTab('plants')}>
              图鉴
            </button>
            <button type="button" className="levels__settings" onClick={() => setCodexTab('review')}>
              复习
            </button>
            <button type="button" className="levels__settings" onClick={() => setSettingsOpen(true)}>
              设置
            </button>
          </span>
        </div>
```

在 `settingsOpen` 之后渲染：

```tsx
      {codexTab && <CodexOverlay initialTab={codexTab} onClose={() => setCodexTab(null)} />}
```

`src/ui/level.css` 追加：

```css
.levels__actions { display: flex; gap: 8px; }
```

- [ ] **Step 6: 复习时间改为真实时间**

`src/ui/GameScreen.tsx` 的 `record` 里把 `stateRef.current.t` 换成：

```ts
    const next = recordWordResult(saveRef.current, wordId, kind, Math.floor(Date.now() / 1000))
```

旧存档里的 `last_seen_ts` 是游戏内秒数，`formatTime` 对 `< 1e9` 的值显示「—」，不会出现 1970 年。

- [ ] **Step 7: 跑测试**

```bash
npx vitest run tests/unit/review.test.ts && npx tsc --noEmit
```

Expected: PASS。

- [ ] **Step 8: 提交**

```bash
git add src/rules/review.ts src/ui/CodexOverlay.tsx src/ui/codex.css src/ui/LevelSelect.tsx src/ui/level.css src/ui/GameScreen.tsx tests/unit/review.test.ts
git commit -m "feat: 加入图鉴与只读复习表"
```

---

### Task 9: 性能面板、预算门禁与减少动态效果

**Files:**
- Create: `src/ui/PerfOverlay.tsx`, `src/ui/perf.ts`, `tests/unit/perf.test.ts`
- Create: `scripts/check-budget.mjs`
- Modify: `src/ui/GameScreen.tsx`, `src/ui/game.css`, `src/styles/global.css`, `package.json`

**Interfaces:**
- Produces: `summarizeFrames(frames, elapsedMs): { fps: number; p95: number }`；`?perf=1` 面板；`npm run check:budget`

- [ ] **Step 1: 写失败测试**

创建 `tests/unit/perf.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { summarizeFrames } from '../../src/ui/perf'

describe('帧统计', () => {
  it('按样本数与耗时算 FPS，p95 取排序后的 95 分位', () => {
    expect(summarizeFrames([16, 17, 16, 50], 1000)).toEqual({ fps: 4, p95: 50 })
  })

  it('空样本返回 0', () => {
    expect(summarizeFrames([], 1000)).toEqual({ fps: 0, p95: 0 })
    expect(summarizeFrames([16], 0)).toEqual({ fps: 0, p95: 0 })
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npx vitest run tests/unit/perf.test.ts
```

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现统计与面板**

创建 `src/ui/perf.ts`：

```ts
export function summarizeFrames(
  frames: readonly number[],
  elapsedMs: number
): { fps: number; p95: number } {
  if (frames.length === 0 || elapsedMs <= 0) return { fps: 0, p95: 0 }
  const sorted = [...frames].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))
  return {
    fps: Math.round((frames.length / elapsedMs) * 1000),
    p95: Math.round(sorted[index] * 10) / 10
  }
}
```

创建 `src/ui/PerfOverlay.tsx`：

```tsx
import { useEffect, useState } from 'react'
import { summarizeFrames } from './perf'

type Props = { plants: number; zombies: number }

export function PerfOverlay({ plants, zombies }: Props) {
  const [stats, setStats] = useState({ fps: 0, p95: 0 })

  useEffect(() => {
    let raf = 0
    let start = performance.now()
    let last = start
    let frames: number[] = []

    const loop = (now: number) => {
      frames.push(now - last)
      last = now
      if (now - start >= 500) {
        setStats(summarizeFrames(frames, now - start))
        frames = []
        start = now
      }
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="perf" aria-live="off">
      <span>FPS {stats.fps}</span>
      <span>p95 {stats.p95}ms</span>
      <span>植物 {plants} / 僵尸 {zombies}</span>
    </div>
  )
}
```

`src/ui/game.css` 追加：

```css
.perf {
  position: absolute;
  top: 62px;
  right: 16px;
  z-index: 80;
  display: flex;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(12, 8, 3, 0.78);
  color: #9dff7a;
  font-size: 11px;
  font-weight: 800;
  pointer-events: none;
}
```

`src/ui/GameScreen.tsx`：

```tsx
import { PerfOverlay } from './PerfOverlay'
```

组件内：

```tsx
  const perfOn =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('perf') === '1'
```

在 `ResultOverlay` 之前渲染：

```tsx
      {perfOn && <PerfOverlay plants={state.plants.length} zombies={state.zombies.length} />}
```

- [ ] **Step 4: 预算脚本**

创建 `scripts/check-budget.mjs`：

```js
import { readdirSync, statSync } from 'node:fs'
import { join, extname, relative } from 'node:path'

const ROOT = 'dist'
const LIMIT = 3 * 1024 * 1024
const JS_LIMIT = 500 * 1024

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

const files = walk(ROOT).filter((file) => !file.endsWith('.map'))
const groups = { js: [], css: [], font: [], image: [], audio: [], other: [] }

for (const file of files) {
  const ext = extname(file)
  const size = statSync(file).size
  const row = { file: relative(ROOT, file), size }
  if (['.js', '.mjs'].includes(ext)) groups.js.push(row)
  else if (ext === '.css') groups.css.push(row)
  else if (['.woff2', '.woff'].includes(ext)) groups.font.push(row)
  else if (['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext)) groups.image.push(row)
  else if (['.mp3', '.ogg'].includes(ext)) groups.audio.push(row)
  else groups.other.push(row)
}

const sum = (rows) => rows.reduce((total, row) => total + row.size, 0)
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`

for (const [name, rows] of Object.entries(groups)) {
  console.log(`${name.padEnd(6)} ${String(rows.length).padStart(3)} 个  ${kb(sum(rows))}`)
}

const total = sum(files.map((file) => ({ size: statSync(file).size })))
const largestJs = groups.js.reduce((max, row) => Math.max(max, row.size), 0)
console.log(`total  ${kb(total)} / 3.0 MB`)
console.log(`largest js  ${kb(largestJs)} / 500 KB`)

if (total > LIMIT) {
  console.error('首屏预算超限：dist 总计超过 3MB')
  process.exit(1)
}
if (largestJs > JS_LIMIT) {
  console.error('单个 JS chunk 超过 500KB')
  process.exit(1)
}
```

`package.json` 的 scripts 增加：

```json
    "check:budget": "node scripts/check-budget.mjs"
```

- [ ] **Step 5: 减少动态效果**

`src/styles/global.css` 末尾追加：

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 6: 验证**

```bash
npx vitest run tests/unit/perf.test.ts && npm run build && npm run check:budget
```

Expected: 测试 PASS；预算脚本输出各类体积且不退出 1。

- [ ] **Step 7: 提交**

```bash
git add src/ui/perf.ts src/ui/PerfOverlay.tsx src/ui/GameScreen.tsx src/ui/game.css src/styles/global.css scripts/check-budget.mjs package.json tests/unit/perf.test.ts
git commit -m "feat: 加入性能面板与构建预算门禁"
```

---

### Task 10: 全链验收与文档回填

**Files:**
- Modify: `package.json`（description）
- Modify: `docs/启动说明.md`
- Modify: `scripts/smoke-checklist.md`
- Modify: `docs/superpowers/plans/2026-11-07-m4-art-and-polish.md`（追加实施结果）

- [ ] **Step 1: 全量门禁**

```bash
npm run lint && npx tsc --noEmit && npm test && npm run validate && npm run build && npm run check:budget
```

Expected: 全绿；记录测试文件数/用例数、dist 体积、角色图合计体积。

- [ ] **Step 2: 浏览器验收**

启动 dev server（默认 5173），用无头 Chrome + CDP 完成：

1. 12 个角色在选关卡/场上/手牌/图鉴分别加载 96/128/256，Network 无 404。
2. 点击字母有音效；设置关闭音效后无声，刷新后仍关闭。
3. Network 无 `fonts.googleapis.com` / `fonts.gstatic.com`；首屏字母块宽度稳定。
4. 图鉴四页签切换；植物/僵尸数值与 JSON 一致；单词卡显示学习统计，朗读可用/禁用态正确。
5. 复习页无记录显示空态；拼错一个词后出现一行，计数正确；旧存档（`last_seen_ts < 1e9`）显示「—」。
6. 冻结时长设为 0 后错字母块立刻可点；恢复 2 秒后按 2 秒禁用。
7. `?perf=1` 显示面板，普通模式隐藏；用 CDP 在 `?perf=1` 下采样 30 秒，记录 FPS 与 p95。
8. DevTools 模拟 `prefers-reduced-motion: reduce` 后无脉冲、抖动、toast 滑入。
9. 控制台无错误/React 警告。

截图存 `%TEMP%\pvz-m4-shots\`，至少包含：图鉴植物页、复习空态、复习有数据、设置页、`?perf=1`。

- [ ] **Step 3: 更新文档**

`package.json` description：

```json
  "description": "拼词塔防 M0–M4：填词 → 种植 → 战斗 → 跟读加成 → 美术与打磨",
```

`docs/启动说明.md`：

- 环境要求增加 Python 3.12 + Pillow（仅重新生成素材时需要）、ffmpeg（仅转换音效时需要）。
- 测试数量改为实测值。
- 目录速览加入 `public/assets`、`art-source/`、`scripts/matting.py`、`scripts/check-budget.mjs`。
- 30 秒上手补充：图鉴/复习入口、音效与冻结时长设置、`?perf=1`。
- 常见问题补充：角色图缺失时 `npm run validate` 的报错含义；音效被浏览器拦截时先点一下页面；重新生成素材的命令。
- 构建章节加入 `npm run check:budget`。

`scripts/smoke-checklist.md` 增加 F 组：

```markdown
## F. M4 素材与打磨

- [ ] F1 12 个角色在场上/手牌/图鉴分别为 96/128/256，无破图、无 404
- [ ] F2 角色轮廓可区分 8 植物 + 4 僵尸，铁桶 vs 普通不只靠颜色
- [ ] F3 填对/填错/拼好/种植/产光/僵尸倒下六种音效可辨
- [ ] F4 设置关闭音效后立即无声，刷新后保持
- [ ] F5 网络面板无 Google Fonts 请求，首屏字母块不跳动
- [ ] F6 图鉴四页签内容与 JSON 一致，单词朗读可用
- [ ] F7 复习表空态/有数据/旧档时间显示「—」
- [ ] F8 冻结时长 0/1/2 秒生效并持久化
- [ ] F9 `?perf=1` 面板出现，普通模式不出现
- [ ] F10 系统开启「减少动态效果」后无脉冲/抖动
- [ ] F11 iPad Safari / Android Chrome 横屏各一局，记录 FPS 与手感
- [ ] F12 M3 的 E11 五环境语音复测仍通过
```

- [ ] **Step 4: 回填计划**

在计划末尾追加「实施结果与偏差（2026-11-07）」，记录：

- 门禁命令与结果（测试数、构建体积、预算）。
- 浏览器验收条目与截图路径。
- 实际生成/重生成的图片数量，与计划的偏差。
- 未完成的人工项：iPad 实机 FPS、孩子实测。

- [ ] **Step 5: 提交**

```bash
git add package.json docs/启动说明.md scripts/smoke-checklist.md docs/superpowers/plans/2026-11-07-m4-art-and-polish.md docs/superpowers/specs/2026-11-07-m4-art-and-polish-design.md
git commit -m "docs: 回填 M4 素材与打磨验收结果"
```

---

## 验收矩阵

| 需求 | 对应任务 | 证据 |
| --- | --- | --- |
| 12 角色三档 PNG | Task 6/7 | `npm run validate`、图鉴截图 |
| 原创/红线 | Task 6 | `assets/ART_PROMPTS.md`、接触表人工复核 |
| 6 个 CC0 音效 + 开关 | Task 3/4 | `tests/unit/sfx.test.ts`、浏览器无声验证 |
| 字体自托管 + 就绪门禁 | Task 5 | `tests/unit/fonts.test.ts`、Network 面板 |
| 存档 v2 迁移 | Task 1 | `tests/unit/save.test.ts` |
| 图鉴四页签（含复习表） | Task 8 | `tests/unit/review.test.ts`、浏览器验收 |
| 冻结时长可调 | Task 2/4 | `tests/unit/cards-submit.test.ts`、设置页 |
| 性能预算/面板/减动效 | Task 9 | `check:budget`、`?perf=1` 截图、CSS 媒体查询 |
| 文档同步 | Task 10 | 启动说明、冒烟清单、计划回填 |

---

## 实施结果与偏差（2026-11-07）

### 门禁

```bash
npm run lint && npm test && npm run validate && npm run build && npm run check:budget
```

| 项 | 结果 |
| --- | --- |
| ESLint | 通过（`.superpowers` 与 `art-source` 加入忽略，见偏差 4） |
| vitest | 28 文件 / 173 用例全过 |
| 内容与资产门禁 | 8 植物 / 13 词 / 13 配对 / 4 僵尸 / 1 关；36 张角色图通过 |
| 构建 | 76 modules；JS 203.89 kB（gzip 67.07 kB），CSS 28.21 kB（gzip 7.35 kB） |
| 预算 | 总计 1481.5 KB / 3.0 MB；最大 JS 199.1 KB / 500 KB；角色图 36 张 1044.9 KB；字体 9 个 188.7 KB；音效 6 个 20.2 KB |

### 浏览器验收（headless Chrome 156 + CDP，19/19）

脚本：`.superpowers/sdd/2026-11-07-m4-art-and-polish/acceptance.mjs`（git-ignored）；结果：同目录 `acceptance-result.json`。控制台 issue 0，失败网络请求 0。

| # | 验收项 | 结果 |
| --- | --- | --- |
| 1 | 字体就绪与自托管 | Luckiest Guy + Nunito 700/900 loaded；134 个请求中无 Google Fonts |
| 2 | 36 档角色图 | 96/128/256 全部加载；选关 c / 手牌 c / 场上 s / 图鉴 l |
| 3 | 图鉴三页签 | 植物 8 / 僵尸 4 / 单词 13，数值与 JSON 一致；朗读按钮可用/禁用态正确 |
| 4 | 复习表 | 空态 → 1 行（正确 1 / 错误 1 / 提示 0 / 连对 1 / 真实日期）→ 旧档时间「—」 |
| 5 | 设置 | 音效/TTS 开关、冻结 0/1/2 秒；关闭音效刷新后仍关闭 |
| 6 | 冻结时长 | 0 秒错块立即点；2 秒禁用约 2 秒；音效事件 fill_wrong / fill_ok / arm / plant 触发 |
| 7 | 性能面板 | `?perf=1` 30 秒采样 60 FPS / p95 16.7ms；普通模式隐藏 |
| 8 | 减少动态效果 | `prefers-reduced-motion: reduce` 下动画折叠到 1e-06s |
| 9 | 僵尸出场 | 96px `z_basic_s.png` 出场并朝左推进（场上镜像，见偏差 1） |

截图（`%TEMP%\pvz-m4-shots\`）：`codex-plants.png`、`review-empty.png`、`review-data.png`、`settings.png`、`perf.png`、`gameplay-zombie.png`。

限制：headless 只能验证 `play()` 调用与事件映射，无法确认实际可听的音量/音色；真实听感与 iPad 解锁仍需人工。

### 素材生成

- ImageGen 生成 12 个角色（8 植物 + 4 僵尸），每张 1024×1024；`sprout`、`z_basic` 两个锚图经人工确认后生成其余 10 个。
- `scripts/matting.py` 抠图并输出 96/128/256 三档，共 36 张 RGBA PNG；修复轮 1/2 各重出全部 36 张，最终 1044.9 KB。
- 6 个 Kenney CC0 音效（Interface Sounds）转单声道 96kbps MP3，共 20.2 KB；来源与许可见 `public/assets/CREDITS.md`。
- Fontsource 自托管 Luckiest Guy + Nunito Variable，构建产物含 9 个 woff/woff2，共 188.7 KB。

### 偏差与裁定

1. 僵尸朝向：Task 7 控制器裁定「不镜像（美术侧已朝左）」有误；验收截图显示角色面朝右而家在最左，改为 `.zombie .character-art { transform: scaleX(-1) }`，只镜像场上角色，血条与图鉴不受影响。
2. 复习表可读性：初版 tbody 无底色，深棕文字叠深色木纹几乎不可读；补浅色表底与偶数行条纹后复查通过。
3. favicon 404：新增 `<link rel="icon" href="/assets/plants/sprout_s.png">`，控制台零错误。
4. ESLint 忽略：`.superpowers`（SDD 工作区与 CDP 验收脚本）与 `art-source`（源图）加入 ignores，避免脚手架脚本被项目规则误判。
5. 死代码清理：M0–M2 的内联 SVG 占位 `PlantArt.tsx` / `ZombieArt.tsx` 已无生产引用，连同 `tests/unit/plant-art.test.ts` 删除；测试数由 174 降为 173。
6. Task 9 的 `?perf=1` 浏览器烟测按裁决顺延到本任务，已纳入上方 19/19。
7. Task 9 的 `global.css` 原地修改与 `/* global console, process */` 注释保留，均经复审接受。

### 未完成的人工项

- iPad Safari / Android Chrome 横屏各一局，记录 FPS 与手感（F11）。
- 孩子实测 D1–D4：首次上手 60 秒内能否种下第一株、2 秒冻结是否困惑、是否要求再来一局、是否故意点错。
- M3 的 E11 五环境语音识别复测（安静 / 有人说话 / 离麦 30 cm / 孩子小声 / 家长代读）。
- 真实 iPad Safari 的音效解锁与可听性（headless 只能验证 `play()` 调用）。
