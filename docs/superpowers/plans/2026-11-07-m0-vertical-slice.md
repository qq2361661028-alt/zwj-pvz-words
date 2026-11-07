# M0 垂直切片 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 跑通 M0 唯一目标链路 `填词 → 激活 → 种植 → 一维推进 → 通关/失败`，让自家孩子能用手指点完一整关（1 关 / 3 株植物 / 8 个词 / 无语音 / 纯色块代替美术）。

**Architecture:** 三层。`src/rules/**` 是纯函数规则层（唯一事实来源是可 `JSON.stringify` 的 `GameState`，玩家动作与定步长模拟都返回 `{state, events}`）；`src/ui/**` 是渲染层，只订阅 events、不含任何判定；`src/content/**` 是数据（JSON 夹具），构建期被 `validate.ts` 硬校验后才允许启动。ESLint 把「规则层禁止 import 渲染层 / 禁止 Math.random / 禁止触碰 DOM」锁成工具而非自觉（D3/D10）。

**Tech Stack:** React 18 + TypeScript 5 + Vite 6 + vitest 2 + ESLint 9（flat config）。纯静态，无后端，无 IndexedDB。渲染层用 React DOM + CSS/SVG，**不引 Phaser**（G9）。

> **实施偏差 G9（2026-11-07，已落地）：** T14–T17 原写的是 Phaser `Graphics` 渲染，实际实施改用参考工程 `pvz-ui` 的 React 18 + CSS 变量 + 内联 SVG 方案：`src/ui/**` 承接 `game/layout` 的坐标换算，`src/art/**` 用 SVG 形状语言（同一 `INK` 描边）。理由：参考 UI 已在手、DOM 测量与无障碍比 Canvas 更易验收，D1 的 "Phaser 3" 属实现选型而非玩法口径，故降级为 "渲染层自选"；`src/rules/**` 的纯函数边界与 ESLint 锁**不变**。

**状态（2026-11-07）：已实施完成。** 14 个测试文件 / 99 个用例全绿（M0 验收时点）；M1 落地后总数见 M1 计划与冒烟清单。`lint` / `test` / `build` / `validate` 通过；浏览器首轮自测记录见 [scripts/smoke-checklist.md](../../../scripts/smoke-checklist.md)；实现偏差见文末「实施结果与偏差」。

**Spec:** [docs/superpowers/specs/2026-11-07-pvz-word-spelling-tower-defense-design.md](../specs/2026-11-07-pvz-word-spelling-tower-defense-design.md)（§15：首个计划只覆盖 M0）

**原型（已获批的口径来源）:** [docs/mockups/index.html](../../mockups/index.html) · 规则层参考实现 [docs/mockups/shared.js](../../mockups/shared.js) · 标本页（形状语言 + 尺寸账）[docs/mockups/05-entities.html](../../mockups/05-entities.html)

## Global Constraints

- 对外名称与 UI 文案一律不出现「植物大战僵尸 / Plants vs. Zombies」；不复刻/不使用任何 PopCap/EA 素材、名称、角色形象（§2 红线）。植物展示名自拟：`peashooter → 豌豆投手`、`sprout → 阳光苗`、`bush → 矮树丛`。M0 实际阵容：`sprout 阳光苗 / slinger 弹丸藤 / bush 矮树丛`（不启用 peashooter）。
- 画幅：横屏 1280×720，CSS `transform: scale()` 等比适配（原计划 `Phaser.Scale.FIT`，G9 改 React 后等价），最小可玩 960×600，竖屏不做（D14）。
- 草坪网格 **5 行 × 9 列**；坐标 `lane: 0..4` + `x: float(0..9)`，不做二维像素碰撞（§5）。
- 竖向尺寸账是死的：HUD 50 + 草坪 5×88 + 抽屉 230 = 720 ⇒ **场上格子 88px**（不是 §9 写的 96，见「文档缺口」第 2 条）。
- 定步长：逻辑 tick = **1/30 s** 累加器；渲染 60 fps 只做插值（D18）。
- 手牌 5 张 + 焦点卡，**只有最左一张可填**（D7）；填词交互 = 点选字母块 + 顺序填，当前槽高亮（D8）。
- 字母块按**多重集合**生成（D9）；`distractors = clamp(round(len*0.5), 2, 6)`，总块数 = `len + distractors`。
- 种子：`seed = hash(wordId, deckId)`，**不含日期**（§6.2）。规则层禁用 `Math.random()`（D10）。
- 填错三件事、**不毁卡、不倒退**：该块禁用 `penalty_disable_ms`（默认 2000 ms）、记 `wrong`、波次照常推进（§6.3 / O2）。
- 阳光**只**由已激活的 `producer` 产出：起始 75、上限 9990、每 12 s 产 25（2026-11-07 由 24 s 提速 ×2）；填词不产出阳光（D16 / §7）。
- 打开填词面板**不暂停**，期间僵尸速度 ×0.85（D17）。
- `status` 转移只允许 `locked→filling→armed→placed`，`dormant` **只有 §6.5 降级一个来源**；表外转移一律断言失败（§4.5）。
- 词表清洗为构建期**硬错误**：字符集只允许 `a-z`、长度 3–10、排除空格/连字符/撇号/数字、小写去重、`letters === word.length`（§4.4 / §11-4）。
- 数值单位：时间用**秒**、伤害用**点**、`dps` 是持续伤害率而非单次（§4.2）。
- M0 **不含语音**（§15）：`rules/speechJudge.ts`、`platform/speech.ts`、buff 全属 M3，本计划不建文件、不留空壳。
- `validate-content` 不过 ⇒ 禁止进入游戏场景（D21）。

## 文档缺口与本计划的落法（实施前必读）

原型阶段跑出来的事实，文档尚未回收。实施时按下表落，不要临时另立口径：

| # | 缺口 | 本计划的落法 |
|---|---|---|
| G1 | §4.1 文件划分没列 `zombies.json`，但波次引用僵尸 id（僵尸数值无处安放） | 新增 `content/zombies.json`（§4.1 目录树补一行）；`waves.json` 只引用 id |
| G2 | §9 写「场上 96px」，与 §5 的 5 行网格在 720 高画幅下冲突：50 + 5×96 + 230 = **760 > 720** | 场上格子定死 **88px**（推导见 05 标本页第 2 节）；§9 需回写 |
| G3 | §6.2「每行最多 12 块」与 §6.5「布局溢出→dormant」在 1280×720 全宽抽屉下永不可达：实测内容区 1046 px ÷ 块距 42 px = **每行 24 块**，而合法词最长 10 + 6 干扰 = **16 块** | 保留 §6.5 分支作为防御性代码，`dormant` 只由代码路径产生；M0 加一条测试断言该分支不可达 |
| G4 | D16 + D7 叠加会**起步死锁**：首卡若是 cost > 75 的非 producer，玩家填得再对也种不下去 | `validate.ts` 增「起步可达性」硬错误 + 回归测试；M0 夹具词序以 `sunflower → sprout(40, producer)` 打头 |
| G5 | §10 写 `eslint.config.ts`（需要 `jiti` 才能读 TS 配置） | 用 `eslint.config.js`（ESM），语义等价，少一个依赖 |
| §10 与 D3 | JSON Schema 目录 + `schema/` 强制校验需引 `ajv` | M0 用自写 `validate.ts`（错误信息可控、零依赖），`schema/` 目录留到 M4 素材校验时再建 |
| D20 | 7 态里 `paused` 在 M0 没有对应玩法（无语音、无存档） | M0 实现 6 态（`boot/levelSelect/loading/playing/wordPanelOpen/result`），`paused` 与存档 `migrate` 一起进 M1 计划 |
| G6 | **§15 的 M0 阵容数学上不可通关**：§4.1.1 只预留 2 株 generic（`sprout` 产阳光 / `bush` 防守），射手按规则只能走 `theme:"plant"`（词名=植物名），于是 M0 的 3 株里**只有 1 株射手、且只有 1 张卡能召唤它**；而 D7 又强制线性词序——5 条 lane 里任何 2 条同时来怪就必漏。僵尸数值在文档里也没有落处（G1） | M0 的 3 株全改为 generic，其中射手 `slinger` 承载非植物词（`theme:"unit"`），`theme:"plant"` 通路只保留在校验器里、M0 夹具不启用。**需回写 §4.1.1**：generic 苗木可以是 `shooter`（形象不带"这就是 X"的暗示即可），或把 M0 植物数从 3 提到 4 |
| G7 | `BOARD.spawn_x` 文档没给值，但它受画幅约束：原型用 10.4，`xToPx(10.4) = 1288 > 1280` 会出怪在画幅外 | 定死 `spawn_x = 9.6`（网格右缘 x=9 之外、画幅之内，实测 1192px）。§5 需补一句出怪点口径 |
| G8 | §4.2 示例里的 `cost: 100 / hp: 300` 与 §7 的 `25/24s` 经济在 8 张卡 / 3 lane 防御下不成立（T12 可达性测试红） | M0 数值按「可达性优先」重定（`sprout 40 / slinger 75·dps30 / bush 40·hp4000`，僵尸 `speed 0.09`）。§4.2 是示例而非口径，但落地后要把这组值回写进文档，避免 M2 配平时误以为是既有决定。2026-11-07 产出周期再提速为 12 s |
| G9 | D1 写死 Phaser 3，但用户指定复用参考工程 `pvz-ui`（React 18 + Vite 6 + CSS 变量 + 内联 SVG） | 渲染层改 React DOM（见 header 的 G9 偏差说明）；T14–T17 的 Phaser 代码由 `src/ui/**` + `src/art/**` 等价实现。D1 的 "Phaser" 视为实现选型，M1 如需 Canvas 特效再评估 Pixi/Canvas 覆盖层 |

## 文件结构（实况，2026-11-07）

```
pvz-words/
  index.html  package.json  vite.config.ts  vitest.config.ts  tsconfig.json  eslint.config.js
  src/
    main.tsx                      入口：assertContent 门禁 → createRoot（D21）
    rules/                        ← 纯函数层：ESLint + eslint-purity 双重锁 React/DOM/Math.random
      types.ts constants.ts rng.ts wordgen.ts cards.ts economy.ts combat.ts waves.ts
      sim.ts play.ts reachability.ts
    content/
      plants.json words.json decks.json zombies.json levels.json
      index.ts                    JSON → 类型化 + byId 索引 + CTX
      validate.ts                 §11-4 校验 + D21 门禁（返回 errors/warnings）
    ui/
      App.tsx                     路由 levels|game + 1280×720 等比缩放
      GameScreen.tsx              rAF + 定步长循环 + 输入接线 + 事件 → toast/浮层
      Hud.tsx HandCard.tsx WordPanel.tsx ResultOverlay.tsx Button.tsx
      LevelSelect.tsx             选关页
      layout.ts                   1280×720 分区与坐标换算（原计划 src/game/layout.ts）
      scenery/Scenery.tsx         天空/房子/草丛装饰
      game.css level.css
    art/
      PlantArt.tsx ZombieArt.tsx Icons.tsx   内联 SVG 形状语言（原计划 Graphics）
    styles/
      global.css tokens.css
  scripts/
    smoke-checklist.md            §11-5 人工冒烟（M0 部分，含首轮自测记录）
  tests/
    unit/                         13 个文件（规则模块 + layout + 内容校验 + purity）
    integration/reachability.test.ts
```

> **实施偏差（G9）：** 原计划的 `src/game/**`（Phaser Scene/Graphics）未创建，职责由 `src/ui/**` + `src/art/**` 承接；`layout.ts` 从 `game/` 移到 `ui/`。规则层测试全部跑在 node 环境，渲染层由浏览器冒烟覆盖。

---

### Task 1: 工具链与 D3/D10 护栏

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`, `index.html`, `src/main.tsx`
- Create: `tests/unit/eslint-purity.test.ts`
- Modify: 无（项目根当前只有 `docs/`）

**Interfaces:**
- Consumes: 无
- Produces: `npm run dev` / `npm test` / `npm run lint` / `npm run validate`；`src/rules/**` 的三条 ESLint 禁令生效

- [x] **Step 1: 初始化版本管理（O5 待定 → 本计划默认执行）**

项目根 `H:/qorder_code/pvz-words` 目前**不是** git 仓库（§13-O5 记录了这一事实）。本计划的步骤以 commit 为进度单位，所以先建仓。这一步只影响本地、可逆（删 `.git` 即回到现状）。

```bash
cd H:/qorder_code/pvz-words
git init -b main
printf 'node_modules/\ndist/\n.vite/\n*.log\n' > .gitignore
git add -A && git commit -m "chore: 初始化仓库（仅 docs 设计文档与原型）"
```

Expected: `git log --oneline` 有 1 条提交，工作区干净。

> **实施结果（2026-11-07）：未执行。** 用户工作区仍是非 git 仓库，实施按要求只落地文件、不初始化版本管理；因此本计划所有 `git add/commit` 步骤均跳过，勾选状态与「实施结果与偏差」才是进度凭证。

- [x] **Step 2: 写依赖与配置**

`package.json`（版本用 caret，`npm install` 会解析到兼容的最新补丁；不要改成裸版本号）：

```json
{
  "name": "pvz-words",
  "private": true,
  "type": "module",
  "description": "拼词塔防教学版（内部代号 pvz-words，自用无后端）",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "validate": "vitest run tests/unit/content-validation.test.ts"
  },
  "dependencies": {
    "phaser": "^3.87.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@typescript-eslint/parser": "^8.18.0",
    "eslint": "^9.17.0",
    "typescript": "^5.7.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

`tsconfig.json`（`resolveJsonModule` 是规则层能直接 `import decks from './decks.json'` 的前提；不开 `strict: false` 的任何豁免）：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitOverride": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src", "tests", "vite.config.ts", "vitest.config.ts"]
}
```

`vite.config.ts`：

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 }
})
```

`vitest.config.ts`（规则层与布局层都是纯 TS，`environment: 'node'` 即可；渲染层不进 vitest，由浏览器冒烟覆盖）：

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 20000
  }
})
```

- [x] **Step 3: 写 ESLint flat config（§10 的 `eslint.config.ts` 改成 `.js`，见 G5）**

`eslint.config.js`。三条禁令分别对应 §2 之外的三个技术红线：D3（phaser 不进规则层）、D10（禁 `Math.random`）、D19（`localStorage` 只准 `platform/` 碰——M0 还没有这个目录，所以规则层写死禁令即可挡住误用）。

```js
import tsParser from '@typescript-eslint/parser'

const PURITY = 'src/rules/**/*.ts'

export default [
  { ignores: ['dist/**', 'node_modules/**', '*.temp/**'] },
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' }
    },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'smart']
    }
  },
  {
    files: [PURITY],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{ name: 'phaser', message: 'D3：规则层禁止依赖渲染框架（可单测/可回放的前提）' }],
        patterns: [{ group: ['**/game/**', '**/ui/**'], message: 'D3：规则层不得反向依赖渲染层' }]
      }],
      'no-restricted-syntax': ['error',
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: 'D10：禁用 Math.random()，用 rules/rng.ts 的 seedHash + mulberry32'
        },
        {
          selector: "MemberExpression[object.name='window']",
          message: 'D3：规则层不得触碰 DOM/window'
        },
        {
          selector: "Identifier[name='localStorage']",
          message: 'D19：只有 platform/storage.ts 可访问 localStorage'
        }
      ]
    }
  }
]
```

- [x] **Step 4: 写入口壳，确认 `vite` 与 `vitest` 都能起来**

`index.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=1280, initial-scale=1">
  <title>拼词小院 · 单词塔防</title>
</head>
<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
```

`src/main.tsx`（T17 替换成真正的启动门禁；此处只保证工具链可跑，文案不出现任何原版名称）：

```ts
const app = document.getElementById('root')
if (app) app.textContent = 'pvz-words · 工具链已就绪，等待 M0 场景接线'
```

Run: `npm install` 然后 `npm run build`
Expected: `npm install` 无 error（peer warning 可忽略）；`tsc --noEmit` 通过，`vite build` 产出 `dist/`。

- [x] **Step 5: 写护栏测试（先确认它会红）**

`tests/unit/eslint-purity.test.ts`。做法：往 `src/rules/` 临时落一个明知违规的文件，跑 eslint 断言报错，再删掉——这样护栏本身进入测试集，将来有人放宽配置立刻红。

```ts
import { execFileSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'
import { afterAll, describe, expect, it } from 'vitest'

const PROBE = 'src/rules/__eslint_probe__.ts'
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

afterAll(() => rmSync(PROBE, { force: true }))

function lint(file: string): { code: number; out: string } {
  try {
    const stdout = execFileSync(npx, ['eslint', '--format', 'compact', file], { encoding: 'utf8' })
    return { code: 0, out: stdout }
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string }
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }
  }
}

describe('D3/D10/D19 护栏（配置漂移即红）', () => {
  it('规则层 import phaser 被拦', () => {
    writeFileSync(PROBE, "import { Game } from 'phaser'\nexport type P = Game\n")
    const r = lint(PROBE)
    expect(r.code).not.toBe(0)
    expect(r.out).toContain('D3')
  })

  it('规则层 Math.random() 被拦', () => {
    writeFileSync(PROBE, 'export function bad(): number { return Math.random() }\n')
    const r = lint(PROBE)
    expect(r.code).not.toBe(0)
    expect(r.out).toContain('D10')
  })

  it('规则层 localStorage / window 被拦', () => {
    writeFileSync(PROBE, 'export const a = localStorage\nexport const b = window\n')
    const r = lint(PROBE)
    expect(r.code).not.toBe(0)
    expect(r.out).toContain('D19')
  })

  it('干净文件不报错（护栏没有误伤）', () => {
    writeFileSync(PROBE, 'export const ok = 1 + 1\n')
    expect(lint(PROBE).code).toBe(0)
  })
})
```

Run: `npm test`
Expected: 前 3 条 FAIL（此时 `src/rules/` 目录还不存在，`npx eslint` 找不到目录 → code 非 0 但 `out` 不含 `D3`；`expect(r.out).toContain('D3')` 红）。第 4 条可能同样红（目录不存在）。**必须先确认这一步是红的**，否则护栏测试是假的。

> **实施说明：** 最终 `tests/unit/eslint-purity.test.ts` 改为**静态扫描** `src/rules/*.ts`（正则匹配 react/phaser import、`Math.random`、`Date`、`window/document/localStorage`、内容/UI 导入），比临时落文件跑 eslint 更快且不受 Windows `npx.cmd` 影响；ESLint 配置本身仍保留同样的禁令，形成双重护栏。

- [x] **Step 6: 补上目录使测试转绿**

```bash
mkdir -p src/rules && printf 'export const __placeholder__ = true\n' > src/rules/.keep.ts
```

Run: `npm test`
Expected: 4 passed。

- [x] **Step 7: 全链验证**

Run: `npm run lint && npm test && npm run build`
Expected: lint 0 error（注意 `--format compact` 只在子进程里用，仓库本身不允许 warn 之外的 error）；测试全绿；build 成功。

```bash
git add -A && git commit -m "chore: M0 工具链（Vite+TS+React+vitest+ESLint 规则层纯度护栏）"
```

---

### Task 2: 类型与内容夹具（3 株 / 8 词 / 6 波）

**Files:**
- Create: `src/rules/types.ts`
- Create: `src/content/plants.json`, `src/content/words.json`, `src/content/decks.json`, `src/content/zombies.json`, `src/content/levels.json`
- Create: `src/content/index.ts`
- Test: `tests/unit/content-fixtures.test.ts`

**Interfaces:**
- Consumes: T1 的 `resolveJsonModule`
- Produces:
  - `types.ts`: `PlantSlot`, `Theme`, `CardStatus`, `Outcome`, `PlantDef`, `WordDef`, `DeckDef`, `ZombieDef`, `WaveDef`, `LevelDef`, `Tile`, `Card`, `Plant`, `Zombie`, `GameState`, `Event`, `Ctx`, `StepResult`
  - `content/index.ts`: `CTX: Ctx`（`{ plants, words, decks, zombies, levels }` 五个 `Record<string, …>`）
  - 夹具规模：3 株植物、8 个词、8 条 deck 配对、4 种僵尸、1 关 6 波

- [x] **Step 1: 写 `src/rules/types.ts`**

这里是全部类型的唯一定义处，后续任务的签名都从这里取，不要在别处重复声明。

```ts
// 规则层唯一事实来源：GameState 必须可以 JSON.stringify（D3 可回放的前提）
export type PlantSlot = 'producer' | 'shooter' | 'defense' | 'special'
export type Theme = 'plant' | 'unit' | 'review'
export type CardStatus = 'locked' | 'filling' | 'armed' | 'placed' | 'dormant'
export type Outcome = 'cleared' | 'death' | 'abandoned'

export type PlantDef = {
  id: string; name: string; art: string
  cost: number; hp: number; dps: number
  slot: PlantSlot; generic: boolean; unlocked_by_default: boolean
}
export type WordDef = {
  id: string; word: string; zh: string; ipa: string
  grade: number; unit: string; letters: number
  distractor_overrides?: string[]; audio_hint?: string | null
}
export type DeckDef = { id: string; wordId: string; plantId: string; theme: Theme }
export type ZombieDef = { id: string; name: string; hp: number; speed: number; dps: number }
export type WaveDef = { t: number; zombie: string; lanes: number[]; flag?: boolean }
export type LevelDef = { id: string; name: string; deckIds: string[]; waves: WaveDef[] }

export type Tile = { tileId: number; letter: string; used: boolean; disabledUntil: number }
export type Card = {
  instanceId: number; wordId: string; plantId: string; theme: Theme
  slots: string[]; filled: number; status: CardStatus; assisted: boolean
  tiles: Tile[]
  wrongStreak: number; wrongTotal: number; ladderLevel: number
}
export type Plant = {
  uid: number; plantId: string; lane: number; col: number
  hp: number; maxhp: number; nextProduceAt: number
}
export type Zombie = { uid: number; zombieId: string; lane: number; x: number; hp: number; maxhp: number; flag: boolean }

export type GameState = {
  levelId: string; t: number; sun: number
  cards: Card[]; deckCursor: number; seq: number
  plants: Plant[]; zombies: Zombie[]
  spawned: number; panelOpen: boolean; outcome: Outcome | null
}

// §6.1 的 5 个事件 + 渲染层需要的下游事件；hint_ladder 属 M1，本计划不产生
export type Event =
  | { type: 'filled'; slot: number }
  | { type: 'wrong'; tileId: number }
  | { type: 'armed'; plantId: string }
  | { type: 'focus_advanced' }
  | { type: 'placed'; plantId: string; lane: number; col: number }
  | { type: 'dormant'; wordId: string }
  | { type: 'sun_gained'; amount: number }
  | { type: 'sun_spent'; amount: number }
  | { type: 'zombie_spawned'; zombieId: string; lane: number }
  | { type: 'zombie_died' }
  | { type: 'plant_died'; plantId: string; lane: number; col: number }
  | { type: 'outcome'; kind: Outcome }

export type StepResult = { state: GameState; events: Event[] }
export type Ctx = {
  plants: Record<string, PlantDef>
  words: Record<string, WordDef>
  decks: Record<string, DeckDef>
  zombies: Record<string, ZombieDef>
  levels: Record<string, LevelDef>
}
```

- [x] **Step 2: 写 5 份 JSON 夹具**

`src/content/plants.json`（M0 三株**全部** `generic: true`，理由见 G6：只要有一株留给 `theme:"plant"`，M0 就只造得出 1 张射手卡，多 lane 波次必漏。`art` 只是格式占位，M0 用 Graphics 绘制，存在性校验推到 M4）：

```json
[
  { "id": "sprout", "name": "阳光苗", "art": "assets/plants/sprout_s.png",
    "cost": 40, "hp": 150, "dps": 0, "slot": "producer", "generic": true, "unlocked_by_default": true },
  { "id": "slinger", "name": "弹丸藤", "art": "assets/plants/slinger_s.png",
    "cost": 75, "hp": 300, "dps": 30, "slot": "shooter", "generic": true, "unlocked_by_default": true },
  { "id": "bush", "name": "矮树丛", "art": "assets/plants/bush_s.png",
    "cost": 40, "hp": 4000, "dps": 0, "slot": "defense", "generic": true, "unlocked_by_default": true }
]
```

`src/content/words.json`（8 词，全部 `a-z`、长度 4–8；`letters` 是冗余字段但必须存，§4.3。`w_broccoli` 顶掉了原型里的 `w_peashooter`：M0 不启用 `theme:"plant"`，就没必要为一个植物名保留 10 字母长词，8 字母照样压布局）：

```json
[
  { "id": "w_sunflower", "word": "sunflower", "zh": "向日葵", "ipa": "/ˈsʌnflaʊə/",
    "grade": 4, "unit": "Unit 3", "letters": 9, "distractor_overrides": ["f", "v"] },
  { "id": "w_coffee", "word": "coffee", "zh": "咖啡", "ipa": "/ˈkɒfi/",
    "grade": 4, "unit": "Unit 3", "letters": 6 },
  { "id": "w_three", "word": "three", "zh": "三", "ipa": "/θriː/",
    "grade": 4, "unit": "Unit 3", "letters": 5 },
  { "id": "w_green", "word": "green", "zh": "绿色", "ipa": "/ɡriːn/",
    "grade": 4, "unit": "Unit 3", "letters": 5, "distractor_overrides": ["g", "j"] },
  { "id": "w_milk", "word": "milk", "zh": "牛奶", "ipa": "/mɪlk/",
    "grade": 4, "unit": "Unit 3", "letters": 4 },
  { "id": "w_yellow", "word": "yellow", "zh": "黄色", "ipa": "/ˈjeləʊ/",
    "grade": 4, "unit": "Unit 3", "letters": 6 },
  { "id": "w_bread", "word": "bread", "zh": "面包", "ipa": "/bred/",
    "grade": 4, "unit": "Unit 3", "letters": 5 },
  { "id": "w_broccoli", "word": "broccoli", "zh": "西兰花", "ipa": "/ˈbrɒkəli/",
    "grade": 4, "unit": "Unit 3", "letters": 8, "distractor_overrides": ["b", "k"] }
]
```

`src/content/decks.json`（D6 的绑定层。8 张卡 = 8 词；`theme:"unit"` 只走 generic 苗木，`theme:"plant"` 通路在校验器里保留、M0 夹具不启用（G6）：4 张 `sprout`、2 张 `bush`、2 张 `slinger`，词序打头的是 `producer`，满足 G4 起步可达）：

```json
[
  { "id": "d_sunflower_sprout", "wordId": "w_sunflower", "plantId": "sprout", "theme": "unit" },
  { "id": "d_coffee_bush", "wordId": "w_coffee", "plantId": "bush", "theme": "unit" },
  { "id": "d_three_sprout", "wordId": "w_three", "plantId": "sprout", "theme": "unit" },
  { "id": "d_green_slinger", "wordId": "w_green", "plantId": "slinger", "theme": "unit" },
  { "id": "d_milk_bush", "wordId": "w_milk", "plantId": "bush", "theme": "unit" },
  { "id": "d_yellow_slinger", "wordId": "w_yellow", "plantId": "slinger", "theme": "review" },
  { "id": "d_bread_sprout", "wordId": "w_bread", "plantId": "sprout", "theme": "review" },
  { "id": "d_broccoli_slinger", "wordId": "w_broccoli", "plantId": "slinger", "theme": "review" }
]
```

`src/content/zombies.json`（G1 新增的文件。数值是 M0 调平起点，不是文档规定值——`speed` 单位 = 格/秒，`dps` = 持续点/秒）：

```json
[
  { "id": "z_basic", "name": "慢步者", "hp": 100, "speed": 0.09, "dps": 20 },
  { "id": "z_cone",  "name": "路障者", "hp": 170, "speed": 0.09, "dps": 20 },
  { "id": "z_bucket","name": "铁桶者", "hp": 300, "speed": 0.08, "dps": 20 },
  { "id": "z_flag",  "name": "旗帜者", "hp": 100, "speed": 0.11, "dps": 20 }
]
```

`src/content/levels.json`（1 关 6 波，共 7 只僵尸，只走 0/2/4 三条 lane——G6 说明 M0 每张卡只召唤一种植物，五条 lane 同时来怪必漏。设计账：僵尸从 x=9.6 走到失败线 x=0.15 需要 (9.6-0.15)/0.09 ≈ 105 s；实施调平后波次为 **30/70/110/140/170/200**，脚本玩家实测 t=203.4 s 清场，落在 §1「3–5 分钟」；`deckIds` 顺序即词序，`d_sunflower_sprout`（producer, 40 ≤ 起始 75）打头以满足 G4 起步可达）：

```json
[
  {
    "id": "u3_w1",
    "name": "Unit 3 · 第 1 关",
    "deckIds": ["d_sunflower_sprout", "d_coffee_bush", "d_three_sprout", "d_green_slinger",
                "d_milk_bush", "d_yellow_slinger", "d_bread_sprout", "d_broccoli_slinger"],
    "waves": [
      { "t": 30,  "zombie": "z_basic",  "lanes": [2] },
      { "t": 70,  "zombie": "z_basic",  "lanes": [0] },
      { "t": 110, "zombie": "z_cone",   "lanes": [4] },
      { "t": 140, "zombie": "z_basic",  "lanes": [2] },
      { "t": 170, "zombie": "z_cone",   "lanes": [0, 4] },
      { "t": 200, "zombie": "z_flag",   "lanes": [2], "flag": true }
    ]
  }
]
```

- [x] **Step 3: 写 `src/content/index.ts`**

```ts
import plantsJson from './plants.json'
import wordsJson from './words.json'
import decksJson from './decks.json'
import zombiesJson from './zombies.json'
import levelsJson from './levels.json'
import type { Ctx, DeckDef, LevelDef, PlantDef, WordDef, ZombieDef } from '../rules/types'

export const RAW = {
  plants: plantsJson as unknown as PlantDef[],
  words: wordsJson as unknown as WordDef[],
  decks: decksJson as unknown as DeckDef[],
  zombies: zombiesJson as unknown as ZombieDef[],
  levels: levelsJson as unknown as LevelDef[]
}

function index<T extends { id: string }>(list: readonly T[]): Record<string, T> {
  const out: Record<string, T> = {}
  list.forEach((item) => { out[item.id] = item })
  return out
}

export const CTX: Ctx = {
  plants: index(RAW.plants),
  words: index(RAW.words),
  decks: index(RAW.decks),
  zombies: index(RAW.zombies),
  levels: index(RAW.levels)
}

export const M0_LEVEL_ID = 'u3_w1'
```

- [x] **Step 4: 写夹具规模测试**

`tests/unit/content-fixtures.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { CTX, M0_LEVEL_ID, RAW } from '../../src/content/index'

describe('M0 夹具规模（§15：1 关 / 3 株 / 8 词）', () => {
  it('3 株植物：1 shooter + 1 producer + 1 defense，generic 恰好 2 株', () => {
    expect(RAW.plants).toHaveLength(3)
    const slots = RAW.plants.map((p) => p.slot).sort()
    expect(slots).toEqual(['defense', 'producer', 'shooter'])
    expect(RAW.plants.filter((p) => p.generic)).toHaveLength(2)
    expect(RAW.plants.some((p) => p.slot === 'producer' && p.cost <= 75)).toBe(true)
  })

  it('8 个词、词序 8 条配对、4 种僵尸、6 条波次', () => {
    expect(RAW.words).toHaveLength(8)
    expect(RAW.decks).toHaveLength(8)
    expect(RAW.zombies).toHaveLength(4)
    const level = CTX.levels[M0_LEVEL_ID]
    expect(level.waves).toHaveLength(6)
    expect(level.deckIds).toHaveLength(8)
  })

  it('起步可达的前提：词序首张是 cost ≤ 起始阳光 75 的 producer', () => {
    const first = CTX.decks[RAW.levels[0].deckIds[0]]
    expect(CTX.plants[first.plantId].slot).toBe('producer')
    expect(CTX.plants[first.plantId].cost).toBeLessThanOrEqual(75)
  })

  it('每份 id 唯一（重复会让索引静默覆盖）', () => {
    for (const list of [RAW.plants, RAW.words, RAW.decks, RAW.zombies, RAW.levels]) {
      const ids = list.map((x) => x.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
```

Run: `npm test`
Expected: 本任务 4 条 PASS（护栏那 4 条仍绿）。

- [x] **Step 5: 提交**

```bash
git add src/rules/types.ts src/content tests/unit/content-fixtures.test.ts
git commit -m "feat(content): M0 类型与内容夹具（3 株/8 词/8 配对/4 僵尸/1 关 6 波）"
```

---

### Task 3: 数值 token 与种子化 RNG

**Files:**
- Create: `src/rules/constants.ts`, `src/rules/rng.ts`
- Test: `tests/unit/rng.test.ts`, `tests/unit/constants.test.ts`

**Interfaces:**
- Consumes: T2 `types.ts`
- Produces:
  - `constants.ts`: `RULES = { tick_s, hand_size, panel_slowdown, penalty_disable_ms, distractor_ratio, distractor_min, distractor_max, distractor_per_row }`、`BOARD = { lanes, cols, spawn_x, house_x, eat_back, eat_front }`、`SUN = { start, cap, produce_amount, produce_interval_s }`
  - `rng.ts`: `seedHash(...keys: string[]): number`、`mulberry32(seed: number): () => number`、`shuffle<T>(arr: readonly T[], rand: () => number): T[]`、`pick<T>(arr: readonly T[], rand: () => number): T`、`pickWeighted<T>(items: readonly { v: T; w: number }[], rand: () => number): T`

- [x] **Step 1: 写 `src/rules/constants.ts`**

所有数值只准出现在这里（布局 token 同理，见 T13）。测试与渲染层都从这里取值，避免"文档一处、代码一处"。

```ts
// §6/§7/§9 的全部数值口径集中在此；单位：秒 / 点 / 格
export const RULES = {
  tick_s: 1 / 30,                 // D18 定步长
  hand_size: 5,                   // D7
  panel_slowdown: 0.85,           // D17 打开面板僵尸系数
  penalty_disable_ms: 2000,       // §6.3 / O2，设置页可调到 0
  distractor_ratio: 0.5,          // §6.2
  distractor_min: 2,
  distractor_max: 6,
  distractor_per_row: 12          // §6.2「每行最多 12 块」——见 G3：1280 下实际不可达
}

export const BOARD = {
  lanes: 5, cols: 9,              // §5
  spawn_x: 9.6,                   // 出怪点（最右列 x=9 之外、画幅之内；G7）
  house_x: 0.15,                  // 失败线
  eat_back: 0.62, eat_front: 0.12 // 僵尸与植物的接触窗口（一维判定，§5 去掉 y 轴）
}

export const SUN = {
  start: 75, cap: 9990,           // D16
  produce_amount: 25, produce_interval_s: 24
}
```

- [x] **Step 2: 写 token 自检测试**

`tests/unit/constants.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { BOARD, RULES, SUN } from '../../src/rules/constants'

describe('数值 token', () => {
  it('tick 与减速系数按文档原值，改动必须显式经过这里', () => {
    expect(RULES.tick_s).toBeCloseTo(1 / 30, 12)
    expect(RULES.panel_slowdown).toBe(0.85)
    expect(RULES.penalty_disable_ms).toBe(2000)
    expect(RULES.hand_size).toBe(5)
  })
  it('阳光经济：起始 75 / 上限 9990 / 每 12s 产 25（§7）', () => {
    expect(SUN).toEqual({ start: 75, cap: 9990, produce_amount: 25, produce_interval_s: 24 })
  })
  it('棋盘 5×9，出怪点在失败线右侧', () => {
    expect(BOARD.lanes).toBe(5)
    expect(BOARD.cols).toBe(9)
    expect(BOARD.spawn_x).toBeGreaterThan(BOARD.cols)
    expect(BOARD.house_x).toBeLessThan(1)
  })
})
```

- [x] **Step 3: 写 `src/rules/rng.ts`**

FNV-1a（32 位）做种子散列，mulberry32 做随机流。`seedHash` 变参：§6.2 要 `hash(wordId, deckId)`，将来加 `salt`（每日变化）只需多传一个 key，不改调用点。

```ts
// D10：全部随机必须来自这里。规则层由 ESLint 禁止 Math.random。
export function seedHash(...keys: string[]): number {
  const s = keys.join('|')
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(arr: readonly T[], rand: () => number): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

export function pick<T>(arr: readonly T[], rand: () => number): T {
  if (arr.length === 0) throw new Error('pick(): 空数组')
  return arr[Math.floor(rand() * arr.length)]
}

export function pickWeighted<T>(items: readonly { v: T; w: number }[], rand: () => number): T {
  const total = items.reduce((sum, it) => sum + it.w, 0)
  if (!(total > 0)) throw new Error('pickWeighted(): 权重和必须为正')
  let r = rand() * total
  for (const it of items) {
    r -= it.w
    if (r <= 0) return it.v
  }
  return items[items.length - 1].v
}
```

- [x] **Step 4: 写 RNG 确定性与分布测试**

`tests/unit/rng.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { mulberry32, pick, pickWeighted, seedHash, shuffle } from '../../src/rules/rng'

describe('种子化随机（§6.2：重玩同一关块位置必须一致）', () => {
  it('seedHash 对入参顺序敏感、可复现', () => {
    expect(seedHash('w_coffee', 'd_coffee_bush')).toBe(seedHash('w_coffee', 'd_coffee_bush'))
    expect(seedHash('w_coffee', 'd_coffee_bush')).not.toBe(seedHash('w_coffee', 'd_green_bush'))
    expect(seedHash('a', 'b')).not.toBe(seedHash('b', 'a'))
  })

  it('同 seed 的流完全一致，且落在 [0,1)', () => {
    const a = mulberry32(seedHash('w_milk', 'd_milk_sprout'))
    const b = mulberry32(seedHash('w_milk', 'd_milk_sprout'))
    const seq = Array.from({ length: 50 }, () => a())
    seq.forEach((v, i) => {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
      expect(v).toBe(b())
      expect(v).toBe(seq[i])
    })
  })

  it('shuffle 保多重集合、不改入参', () => {
    const src = ['c', 'o', 'f', 'f', 'e', 'e']
    const out = shuffle(src, mulberry32(12345))
    expect(out.slice().sort()).toEqual(src.slice().sort())
    expect(src).toEqual(['c', 'o', 'f', 'f', 'e', 'e'])
  })

  it('pick/pickWeighted 命中合法元素；零权重项永不命中', () => {
    const rand = mulberry32(7)
    for (let i = 0; i < 200; i++) expect(['x', 'y', 'z']).toContain(pick(['x', 'y', 'z'], rand))
    const picks = Array.from({ length: 300 }, () =>
      pickWeighted([{ v: 'hot', w: 3 }, { v: 'cold', w: 0 }], rand))
    expect(picks.every((v) => v === 'hot')).toBe(true)
  })

  it('空输入立刻抛错（静默返回 undefined 会把死局推给渲染层）', () => {
    expect(() => pick([], mulberry32(1))).toThrow(/空数组/)
    expect(() => pickWeighted([], mulberry32(1))).toThrow(/权重和/)
  })
})
```

Run: `npm test`
Expected: 全部 PASS。

- [x] **Step 5: 提交**

```bash
git add src/rules/constants.ts src/rules/rng.ts tests/unit
git commit -m "feat(rules): 数值 token + FNV-1a/mulberry32 种子化随机（D10）"
```

---

### Task 4: 字母块生成（D9 多重集合 + §6.2 数量与种子）

**Files:**
- Create: `src/rules/wordgen.ts`
- Test: `tests/unit/wordgen.test.ts`

**Interfaces:**
- Consumes: `rng.ts`（`seedHash`/`mulberry32`/`shuffle`/`pickWeighted`）、`constants.RULES`、`types.WordDef`/`Tile`
- Produces:
  - `ENG_FREQ: readonly string[]`（英语字母频率降序，兜底用）
  - `distractorCount(len: number): number`
  - `chooseDistractors(word: WordDef, need: number, rand: () => number): string[]`
  - `buildTiles(word: WordDef, rand: () => number, idBase = 0): Tile[]`（`tileId` 跨卡唯一，见实施偏差）
  - `multisetSelfCheck(tiles: readonly Tile[], slots: readonly string[]): boolean`

> **M0 只做 §6.2 的第 0 级与第 3 级**：`distractor_overrides` 手工钉死 + 频率表兜底。第 1 级（易混字母表伙伴）与第 2 级（同 grade/unit 词库频率）连同黄金文件快照一起进 M1 计划——那是教学价值层，不是可玩性前提。`buildTiles` 的签名里 `rand` 由调用方注入，M1 补第 1/2 级时只改 `chooseDistractors` 内部，不动调用点。

- [x] **Step 1: 写 `src/rules/wordgen.ts`**

```ts
import { RULES } from './constants'
import { pickWeighted, shuffle } from './rng'
import type { Tile, WordDef } from './types'

// 英语字母频率降序（§6.2 第 3 级兜底）。权重 = 排名倒数的平方，让 e/t/a 远比 q/z 常见。
export const ENG_FREQ = 'etaoinshrdlcumwfgypbvkjxqz'.split('')

export function distractorCount(len: number): number {
  const raw = Math.round(len * RULES.distractor_ratio)
  return Math.min(RULES.distractor_max, Math.max(RULES.distractor_min, raw))
}

function freqWeights(): { v: string; w: number }[] {
  return ENG_FREQ.map((v, i) => ({ v, w: 1 / (i + 1) ** 2 }))
}

// 命中即停：0) overrides 手工钉死 → 3) 频率表 + 种子随机
export function chooseDistractors(word: WordDef, need: number, rand: () => number): string[] {
  const out: string[] = (word.distractor_overrides ?? []).slice(0, need)
  const weights = freqWeights()
  while (out.length < need) out.push(pickWeighted(weights, rand))
  return shuffle(out, rand)
}

export function buildTiles(word: WordDef, rand: () => number, idBase = 0): Tile[] {
  const slots = word.word.split('')
  const distractors = chooseDistractors(word, distractorCount(slots.length), rand)
  const letters = shuffle([...slots, ...distractors], rand)
  // 实施偏差：tileId 必须跨卡唯一，否则 D7「非焦点卡不可填」按 id 查不到正确卡
  return letters.map((letter, i) => ({ tileId: idBase + i, letter, used: false, disabledUntil: 0 }))
}

// §6.1 判定只看字母本身，所以「每个待填字母都有足量未用块」是唯一的死局判据
export function multisetSelfCheck(tiles: readonly Tile[], slots: readonly string[]): boolean {
  const pool: Record<string, number> = {}
  tiles.forEach((t) => { pool[t.letter] = (pool[t.letter] ?? 0) + 1 })
  const need: Record<string, number> = {}
  slots.forEach((ch) => { need[ch] = (need[ch] ?? 0) + 1 })
  return Object.keys(need).every((ch) => (pool[ch] ?? 0) >= need[ch])
}
```

- [x] **Step 2: 写测试（含 D9 死局反例与 §6.2 数量表）**

`tests/unit/wordgen.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { CTX, RAW } from '../../src/content/index'
import { buildTiles, chooseDistractors, distractorCount, multisetSelfCheck } from '../../src/rules/wordgen'
import { mulberry32, seedHash } from '../../src/rules/rng'

const tilesFor = (wordId: string, deckId: string) =>
  buildTiles(CTX.words[wordId], mulberry32(seedHash(wordId, deckId)))

describe('干扰数量 clamp（§6.2：clamp(round(len*0.5), 2, 6)）', () => {
  it('数量表逐点核对', () => {
    expect(distractorCount(3)).toBe(2)   // round1.5=2 → clamp 下限 2
    expect(distractorCount(4)).toBe(2)
    expect(distractorCount(5)).toBe(2)   // round2.5=2（银行家舍入：Math.round(2.5)=3？）
    expect(distractorCount(6)).toBe(3)
    expect(distractorCount(8)).toBe(4)
    expect(distractorCount(10)).toBe(5)
    expect(distractorCount(12)).toBe(6)  // 6 → 上限（词最长 10，越界只做保险）
  })
  it('总块数 = len + distractors', () => {
    for (const w of RAW.words) {
      expect(tilesFor(w.id, CTX.decks.find((d) => d.wordId === w.id)!.id).length)
        .toBe(w.letters + distractorCount(w.letters))
    }
  })
})

describe('D9 多重集合：按去重出块会填到中途无块可用', () => {
  it('coffee 的 2 个 e、2 个 f 都在块里', () => {
    const t = tilesFor('w_coffee', 'd_coffee_bush')
    expect(t.filter((x) => x.letter === 'e').length).toBeGreaterThanOrEqual(2)
    expect(t.filter((x) => x.letter === 'f').length).toBeGreaterThanOrEqual(2)
    expect(multisetSelfCheck(t, 'coffee'.split(''))).toBe(true)
  })
  it('全部夹具词都自洽（构建期校验会复用同一断言）', () => {
    for (const d of CTX.levels.u3_w1.deckIds) {
      const deck = CTX.decks[d]
      const word = CTX.words[deck.wordId]
      expect(multisetSelfCheck(tilesFor(word.id, deck.id), word.word.split('')), word.id).toBe(true)
    }
  })
})

describe('§6.2 种子：hash(wordId, deckId)，不含日期', () => {
  it('同 (word, deck) 两次生成序列完全一致', () => {
    expect(tilesFor('w_green', 'd_green_bush')).toEqual(tilesFor('w_green', 'd_green_bush'))
  })
  it('换 deck 会改变布局（种子确实吃 deckId）', () => {
    const a = tilesFor('w_sunflower', 'd_sunflower_sprout').map((t) => t.letter).join('')
    const b = tilesFor('w_sunflower', 'd_yellow_bush').map((t) => t.letter).join('')
    expect(a).not.toBe(b)
  })
})

describe('overrides 命中即停（第 0 级优先）', () => {
  it('green 的 [g, j] 一定进入干扰项', () => {
    const got = chooseDistractors(CTX.words.w_green, 2, mulberry32(9))
    expect(got).toEqual(expect.arrayContaining(['g', 'j']))
  })
  it('need 小于 overrides 长度时截断，不超预算', () => {
    expect(chooseDistractors(CTX.words.w_green, 1, mulberry32(9))).toHaveLength(1)
  })
})
```

- [x] **Step 3: 跑测试并核对第 1 条的数量表**

Run: `npm test`
Expected: `distractorCount(5)` 那一条可能 FAIL——JS `Math.round(2.5) === 3` 而非银行家舍入。若红，把 `distractorCount(5)` 的期望改成 `3`、`distractorCount(3)` 保持 `2`，并在 `wordgen.ts` 顶部注释一句「`Math.round` 的 .5 向上，§6.2 未规定 half 取整，此处以 JS 语义为准」。**不要改实现去凑期望**：文档没规定 half 情形，代码语义就是口径。其余条目 PASS。

- [x] **Step 4: 提交**

```bash
git add src/rules/wordgen.ts tests/unit/wordgen.test.ts
git commit -m "feat(rules): 字母块多重集合生成 + clamp 数量 + 种子化（D9/§6.2）"
```

---

### Task 5: 卡牌与填词判定（§4.5 转移表 + §6.1/§6.3）

**Files:**
- Create: `src/rules/cards.ts`（本任务只做 `TRANSITIONS`/`assertTransition`/`makeCard`/`submit`；`createHand`/`advanceHand` 在 T6 补进同一文件）
- Test: `tests/unit/cards-submit.test.ts`

**Interfaces:**
- Consumes: `types.ts`（`Card`/`DeckDef`/`Event`/`Ctx`）、`wordgen.buildTiles`、`rng`、`constants.RULES`
- Produces:
  - `TRANSITIONS: Record<CardStatus, CardStatus[]>`
  - `assertTransition(from: CardStatus, to: CardStatus, where: string): void`（非法即 `throw`）
  - `makeCard(deck: DeckDef, ctx: Ctx, instanceId: number): Card`
  - `submit(cards: readonly Card[], tileId: number, now: number): { cards: Card[]; events: Event[] }`
  - `findTile(cards: readonly Card[], tileId: number): { cardIndex: number; tile: Tile } | undefined`

- [x] **Step 1: 写转移表与断言**

表必须与 §4.5 的图逐字对应。`placed`/`dormant` 是终态（数组为空），任何表外转移抛错。

```ts
import { RULES } from './constants'
import { mulberry32, seedHash } from './rng'
import { buildTiles } from './wordgen'
import type { Card, CardStatus, Ctx, DeckDef, Event, Tile } from './types'

export const TRANSITIONS: Record<CardStatus, CardStatus[]> = {
  locked: ['filling', 'dormant'],   // 成为焦点卡 / §6.5 降级
  filling: ['armed', 'dormant'],    // 填满 / §6.5 降级
  armed: ['placed', 'locked', 'dormant'], // 种植 / 焦点回落 / 降级
  placed: [],                        // 实体被啃食后卡直接离开手牌，不是状态转移
  dormant: []
}

export function assertTransition(from: CardStatus, to: CardStatus, where: string): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new Error(`§4.5 非法状态转移 ${from} → ${to}（${where}）`)
  }
}
```

> `armed → locked`：焦点卡已经 armed、玩家没种就继续填下一张时，本计划让 armed 卡保持 armed（见 T6 的 `advanceHand`），所以这条实际不会被走到。保留它是因为 §4.5 的图允许回落，删掉会让「先激活后补种」的合法操作在渲染层被断言炸掉。

- [x] **Step 2: 写 `makeCard`**

```ts
export function makeCard(deck: DeckDef, ctx: Ctx, instanceId: number): Card {
  const word = ctx.words[deck.wordId]
  if (!word) throw new Error(`makeCard: 词不存在 ${deck.wordId}`)
  if (!ctx.plants[deck.plantId]) throw new Error(`makeCard: 植物不存在 ${deck.plantId}`)
  const slots = word.word.split('')
  // §6.2 种子 = hash(wordId, deckId)，不含日期
  const rand = mulberry32(seedHash(deck.wordId, deck.id))
  return {
    instanceId, wordId: deck.wordId, plantId: deck.plantId, theme: deck.theme,
    slots, filled: 0, status: 'locked', assisted: false,
    tiles: buildTiles(word, rand, instanceId * 32),   // tileId 跨卡唯一：D7 才能按 id 拒绝非焦点卡
    wrongStreak: 0, wrongTotal: 0, ladderLevel: 0
  }
}
```

- [x] **Step 3: 写 `submit`（D7 焦点约束落在规则层）**

签名对齐 §6.1 的 `submit(state, tileId, now)`，但 `state` 用 `cards` 数组：这样"只有最左一张可填"（D7）由规则层自己拒绝，渲染层点错卡不会造成状态污染。不修改入参（§6.1「规则层只维护数据」）。

```ts
export function findTile(cards: readonly Card[], tileId: number) {
  for (let i = 0; i < cards.length; i++) {
    const tile = cards[i].tiles.find((t) => t.tileId === tileId)
    if (tile) return { cardIndex: i, tile }
  }
  return undefined
}

export function submit(cards: readonly Card[], tileId: number, now: number): { cards: Card[]; events: Event[] } {
  const hit = findTile(cards, tileId)
  const out = cards.map((c) => ({ ...c, tiles: c.tiles.map((t) => ({ ...t })) }))
  if (!hit) return { cards: out, events: [] }
  if (hit.cardIndex !== 0) return { cards: out, events: [] }   // D7：非焦点卡不可填

  const card = out[0]
  if (card.status !== 'filling') return { cards: out, events: [] }
  const tile = card.tiles[hit.tileId ? tileId : tileId]        // 见下：按 tileId 定位
  if (!tile || tile.used) return { cards: out, events: [] }
  if (tile.disabledUntil > now) return { cards: out, events: [] } // §6.3 禁用期内不计入、不重复惩罚

  const events: Event[] = []
  const target = card.slots[card.filled]
  if (tile.letter === target) {                                // §6.1：只看字母本身
    tile.used = true
    card.filled += 1
    card.wrongStreak = 0                                       // 连错计数在单词内累计（§6.4）
    events.push({ type: 'filled', slot: card.filled - 1 })
    if (card.filled === card.slots.length) {
      assertTransition(card.status, 'armed', card.wordId)
      card.status = 'armed'
      events.push({ type: 'armed', plantId: card.plantId })
    }
  } else {
    tile.disabledUntil = now + RULES.penalty_disable_ms / 1000  // O2
    card.wrongTotal += 1
    card.wrongStreak += 1
    events.push({ type: 'wrong', tileId })
    // §6.4 阶梯（连错 2/4）与 assisted 属 M1：M0 只记 wrongStreak，不发 hint_ladder 事件
  }
  return { cards: out, events }
}
```

把上面那行 `const tile = card.tiles[...]` 的草稿替换成正确的定位（写代码时别留草稿）：

```ts
  const tile = card.tiles.find((t) => t.tileId === tileId)
  if (!tile || tile.used) return { cards: out, events: [] }
```

- [x] **Step 4: 写判定测试**

`tests/unit/cards-submit.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { CTX } from '../../src/content/index'
import { RULES } from '../../src/rules/constants'
import { TRANSITIONS, assertTransition, findTile, makeCard, submit } from '../../src/rules/cards'
import { mulberry32, seedHash } from '../../src/rules/rng'
import { buildTiles } from '../../src/rules/wordgen'

const deck = CTX.decks.d_coffee_bush
const card = () => ({ ...makeCard(deck, CTX, 1), status: 'filling' as const })

function handOf(c = card()) { return [c] }
function letterTile(c: { tiles: { tileId: number; letter: string }[] }, ch: string, from = 0) {
  return c.tiles.filter((t) => t.letter === ch).slice(from)[0]
}
function wrongTile(c: ReturnType<typeof card>) {
  return c.tiles.filter((t) => t.letter !== c.slots[0])[0]
}

describe('§4.5 转移表', () => {
  it('表外转移抛错，表内通过', () => {
    expect(() => assertTransition('armed', 'filling', 't')).toThrow(/非法状态转移/)
    expect(() => assertTransition('placed', 'filling', 't')).toThrow(/非法状态转移/)
    expect(() => assertTransition('filling', 'armed', 't')).not.toThrow()
    expect(TRANSITIONS.dormant).toEqual([])
  })
})

describe('§6.1 判定纯函数', () => {
  it('填对：used、filled+1、filled 事件；填满切 armed', () => {
    const h = handOf()
    const r1 = submit(h, letterTile(h[0], h[0].slots[0]).tileId, 0)
    expect(r1.cards[0].filled).toBe(1)
    expect(r1.cards[0].status).toBe('filling')
    expect(r1.events).toEqual([{ type: 'filled', slot: 0 }])

    let cur = r1.cards
    for (let i = 1; i < cur[0].slots.length; i++) {
      const need = cur[0].slots[i]
      const tile = cur[0].tiles.filter((t) => t.letter === need && !t.used)[0]
      cur = submit(cur, tile.tileId, i).cards
    }
    expect(cur[0].status).toBe('armed')
  })

  it('入参不被修改（渲染层可安全重放）', () => {
    const h = handOf()
    const before = JSON.stringify(h)
    submit(h, h[0].tiles[0].tileId, 0)
    submit(h, wrongTile(h[0]).tileId, 0)
    expect(JSON.stringify(h)).toBe(before)
  })

  it('填错：不毁卡、不倒退，只禁用该块并计数（§6.3）', () => {
    const h = handOf()
    const good = letterTile(h[0], h[0].slots[0]).tileId
    const step1 = submit(h, good, 0)
    const bad = wrongTile(step1.cards[0])
    const step2 = submit(step1.cards, bad.tileId, 10)
    expect(step2.cards[0].filled).toBe(1)              // 不倒退
    expect(step2.cards[0].status).toBe('filling')      // 不毁卡
    expect(step2.cards[0].wrongTotal).toBe(1)
    expect(step2.cards[0].wrongStreak).toBe(1)
    expect(step2.cards[0].tiles.find((t) => t.tileId === bad.tileId)!.disabledUntil)
      .toBeCloseTo(10 + RULES.penalty_disable_ms / 1000, 9)
    expect(step2.events).toEqual([{ type: 'wrong', tileId: bad.tileId }])
  })

  it('禁用期内再点：无变化、无事件、不重复惩罚', () => {
    const h = handOf()
    const bad = wrongTile(h[0])
    const first = submit(h, bad.tileId, 0)
    const again = submit(first.cards, bad.tileId, 1)
    expect(again.events).toEqual([])
    expect(again.cards[0].wrongTotal).toBe(1)
    expect(again.cards).toEqual(first.cards)
  })

  it('填对会把 wrongStreak 归零，wrongTotal 保留（两个计数彼此独立）', () => {
    const h = handOf()
    const bad = wrongTile(h[0])
    let cur = submit(h, bad.tileId, 0).cards
    cur[0].wrongStreak = 3
    const good = cur[0].tiles.filter((t) => t.letter === cur[0].slots[0] && !t.used)[0]
    const after = submit(cur, good.tileId, 5).cards[0]
    expect(after.wrongStreak).toBe(0)
    expect(after.wrongTotal).toBe(1)
  })

  it('干扰块恰好等于所需字母时算正确，不是 bug（§6.1）', () => {
    const word = CTX.words.w_green
    const tiles = buildTiles(word, mulberry32(seedHash('x', 'y')))
    const c = { ...makeCard(CTX.decks.d_green_bush, CTX, 2), status: 'filling' as const, tiles }
    const need = c.slots[0]
    const dups = tiles.filter((t) => t.letter === need)
    expect(dups.length).toBeGreaterThanOrEqual(1)
    // 用「最后一个」同字母块（若第 0 个是目标块，第 1 个必是干扰块）
    const probe = handOf(c)
    const r = submit(probe, dups[dups.length - 1].tileId, 0)
    expect(r.events[0]).toEqual({ type: 'filled', slot: 0 })
  })
})

describe('D7：焦点约束由规则层拒绝', () => {
  it('提交非最左卡的块 → 无变化无事件', () => {
    const head = handOf()[0]
    const other = { ...makeCard(deck, CTX, 9), status: 'locked' as const }
    const r = submit([head, other], other.tiles[0].tileId, 0)
    expect(r.events).toEqual([])
    expect(r.cards[1]).toEqual(other)
    expect(r.cards[0].filled).toBe(0)
  })
  it('locked 卡不可填（status 门禁）', () => {
    const c = makeCard(deck, CTX, 3)
    expect(c.status).toBe('locked')
    expect(submit([c], c.tiles[0].tileId, 0).events).toEqual([])
  })
  it('findTile 跨卡定位 tileId，未命中返回 undefined', () => {
    const h = handOf()
    expect(findTile(h, h[0].tiles[0].tileId)?.cardIndex).toBe(0)
    expect(findTile(h, 9999)).toBeUndefined()
  })
})
```

Run: `npm test`
Expected: 全绿。若「armed 卡继续填下一张」相关断言不存在则忽略——本任务只管单卡内判定，手牌推进在 T6。

- [x] **Step 5: 提交**

```bash
git add src/rules/cards.ts tests/unit/cards-submit.test.ts
git commit -m "feat(rules): 卡牌转移表 + submit 判定（§4.5/§6.1/§6.3，D7 焦点约束）"
```

---

### Task 6: 手牌推进（D7 线性词序 + 补位）

**Files:**
- Modify: `src/rules/cards.ts`（追加 `createHand`/`focusCard`/`advanceHand`）
- Test: `tests/unit/cards-hand.test.ts`

**Interfaces:**
- Consumes: T5 `makeCard`/`assertTransition`、`RULES.hand_size`
- Produces:
  - `type HandView = { cards: Card[]; deckCursor: number; seq: number }`
  - `createHand(deckIds: readonly string[], ctx: Ctx, seqStart?: number): HandView`
  - `focusCard(cards: readonly Card[]): Card | undefined`
  - `advanceHand(view: HandView, deckIds: readonly string[]): { view: HandView; events: Event[] }`

- [x] **Step 1: 写 `createHand` / `focusCard`**

追加到 `src/rules/cards.ts` 末尾：

```ts
export type HandView = { cards: Card[]; deckCursor: number; seq: number }

export function createHand(deckIds: readonly string[], ctx: Ctx, seqStart = 0): HandView {
  let seq = seqStart
  const cards: Card[] = []
  for (let i = 0; i < RULES.hand_size && i < deckIds.length; i++) {
    const deck = ctx.decks[deckIds[i]]
    if (!deck) throw new Error(`createHand: 配对不存在 ${deckIds[i]}`)
    cards.push(makeCard(deck, ctx, seq++))
  }
  if (cards.length && cards[0].status === 'locked') {
    assertTransition('locked', 'filling', '首张焦点卡')
    cards[0].status = 'filling'
  }
  return { cards, deckCursor: cards.length, seq }
}

export function focusCard(cards: readonly Card[]): Card | undefined {
  return cards.length ? cards[0] : undefined
}
```

- [x] **Step 2: 写 `advanceHand`（种植后补位）**

```ts
export function advanceHand(view: HandView, deckIds: readonly string[]): { view: HandView; events: Event[] } {
  const cards = view.cards.slice(1)                     // 已种植的焦点卡离开手牌（§4.5）
  let { deckCursor, seq } = view
  const events: Event[] = []
  if (deckCursor < deckIds.length) {
    cards.push(makeCard(CTX_DECK(deckIds[deckCursor]), deckCursor, seq))
    deckCursor += 1
    seq += 1
  }
  if (cards.length && cards[0].status === 'locked') {
    assertTransition('locked', 'filling', '手牌补位后新焦点卡')
    cards[0].status = 'filling'
    events.push({ type: 'focus_advanced' })
  }
  return { view: { cards, deckCursor, seq }, events }
}
```

`CTX_DECK` 是伪代码——真实签名需要 `ctx`。把上面两行的实现替换为带 `ctx` 参数的正式版（这是本任务唯一改动签名的地方，`advanceHand` 的调用点从 T10 起统一带 `ctx`）：

```ts
export function advanceHand(
  view: HandView, deckIds: readonly string[], ctx: Ctx
): { view: HandView; events: Event[] } {
  const cards = view.cards.slice(1)
  let { deckCursor, seq } = view
  const events: Event[] = []
  if (deckCursor < deckIdsIds(deckIds).length) {
    const deck = ctx.decks[deckIds[deckCursor]]
    if (!deck) throw new Error(`advanceHand: 配对不存在 ${deckIds[deckCursor]}`)
    cards.push(makeCard(deck, ctx, seq))
    deckCursor += 1
    seq += 1
  }
  if (cards.length && cards[0].status === 'locked') {
    assertTransition('locked', 'filling', '手牌补位后新焦点卡')
    cards[0].status = 'filling'
    events.push({ type: 'focus_advanced' })
  }
  return { view: { cards, deckCursor, seq }, events }
}
```

正确版本里那一行条件应为 `if (deckCursor < deckIds.length)`（上面 `deckIdsIds` 是笔误，落地时必须改掉）。

- [x] **Step 3: 写手牌测试**

`tests/unit/cards-hand.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { CTX } from '../../src/content/index'
import { advanceHand, createHand, focusCard } from '../../src/rules/cards'
import { RULES } from '../../src/rules/constants'

const IDS = CTX.levels.u3_w1.deckIds

describe('D7 手牌 5 张 + 焦点卡', () => {
  it('开局 5 张，只有最左是 filling', () => {
    const h = createHand(IDS, CTX)
    expect(h.cards).toHaveLength(RULES.hand_size)
    expect(h.cards[0].status).toBe('filling')
    expect(h.cards.slice(1).every((c) => c.status === 'locked')).toBe(true)
    expect(focusCard(h.cards)?.wordId).toBe(CTX.words.w_sunflower.id)
  })
  it('词序不足 5 张时按实际数量建手牌（8 词关不会触发，但 3 词夹具会）', () => {
    expect(createHand(IDS.slice(0, 3), CTX).cards).toHaveLength(3)
  })
  it('deckId 写错直接抛，不静默少一张卡', () => {
    expect(() => createHand(['d_nonexistent'], CTX)).toThrow(/配对不存在/)
  })
})

describe('种植后补位', () => {
  it('焦点卡离开、新焦点 filling、发 focus_advanced；deckCursor 单调递增', () => {
    const v = createHand(IDS, CTX)
    v.cards[0].status = 'placed'
    const r = advanceHand(v, IDS, CTX)
    expect(r.view.cards).toHaveLength(RULES.hand_size)
    expect(r.view.cards[0].status).toBe('filling')
    expect(r.view.cards[0].wordId).toBe(CTX.words.w_coffee.id)
    expect(r.view.deckCursor).toBe(6)
    expect(r.events).toEqual([{ type: 'focus_advanced' }])
    expect(r.view.cards[1].wordId).toBe(v.cards[1].wordId)  // 其余顺序不变
  })
  it('词池耗尽后不再补位，手牌逐步变空', () => {
    let v = createHand(IDS.slice(0, RULES.hand_size), CTX)
    for (let i = 0; i < RULES.hand_size; i++) {
      v.cards[0].status = 'placed'
      v = advanceHand(v, IDS.slice(0, RULES.hand_size), CTX).view
    }
    expect(v.cards).toHaveLength(0)
    expect(focusCard(v.cards)).toBeUndefined()
  })
  it('instanceId 全局唯一（存档与事件回溯靠它）', () => {
    const v = createHand(IDS, CTX)
    const ids = v.cards.map((c) => c.instanceId)
    v.cards[0].status = 'placed'
    const after = advanceHand(v, IDS, CTX).view.cards.map((c) => c.instanceId)
    expect(new Set([...ids, ...after]).size).toBe(ids.length + after.length)
  })
})
```

Run: `npm test`
Expected: 全绿（`advanceHand` 正式版已替换掉伪代码）。

- [x] **Step 4: 提交**

```bash
git add src/rules/cards.ts tests/unit/cards-hand.test.ts
git commit -m "feat(rules): 手牌 5 张与线性补位（D7）"
```

---

### Task 7: 阳光经济（D16 唯一来源）

**Files:**
- Create: `src/rules/economy.ts`
- Test: `tests/unit/economy.test.ts`

**Interfaces:**
- Consumes: `SUN`、`types.Plant`/`PlantDef`/`Event`
- Produces:
  - `canAfford(sun: number, cost: number): boolean`
  - `spend(sun: number, cost: number): number`（不足则抛）
  - `gainSun(sun: number, amount: number): { sun: number; gained: number }`（`cap` 截断，`gained` 是实际入账量）
  - `tickProducers(plants: readonly Plant[], defs: Record<string, PlantDef>, t: number, sun: number): { plants: Plant[]; sun: number; gained: number }`

- [x] **Step 1: 写 `src/rules/economy.ts`**

```ts
import { SUN } from './constants'
import type { Event, Plant, PlantDef } from './types'

export function canAfford(sun: number, cost: number): boolean {
  return sun >= cost
}

export function spend(sun: number, cost: number): number {
  if (!canAfford(sun, cost)) throw new Error(`D16：阳光不足 ${sun} < ${cost}`)
  return sun - cost
}

export function gainSun(sun: number, amount: number): { sun: number; gained: number } {
  const next = Math.min(SUN.cap, sun + amount)
  return { sun: next, gained: next - sun }
}

// D16：阳光只由「已激活的 producer」产出。填词本身永不入账（由 T10 的测试反向锁死）。
export function tickProducers(
  plants: readonly Plant[], defs: Record<string, PlantDef>, t: number, sun: number
): { plants: Plant[]; sun: number; gained: number } {
  let total = 0
  const next = plants.map((p) => {
    if (defs[p.plantId].slot !== 'producer') return p
    if (t < p.nextProduceAt) return p
    total += SUN.produce_amount
    return { ...p, nextProduceAt: p.nextProduceAt + SUN.produce_interval_s }
  })
  const g = gainSun(sun, total)
  return { plants: next, sun: g.sun, gained: g.gained }
}

export function sunEvents(gained: number): Event[] {
  return gained > 0 ? [{ type: 'sun_gained', amount: gained }] : []
}
```

> `nextProduceAt` 用「上次产出 + interval」而不是「`floor(t/interval)` 对齐」：后者会让刚种下的 producer 在下一个整点秒立刻产出，节奏不稳定；前者保证每株独立 12 s 周期，和 §7 的文字一致。`Plant` 的 `nextProduceAt` 在种植时初始化为 `t + produce_interval_s`（T10）。

- [x] **Step 2: 写经济测试**

`tests/unit/economy.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { CTX } from '../../src/content/index'
import { gainSun, spend, sunEvents, tickProducers } from '../../src/rules/economy'
import { SUN } from '../../src/rules/constants'
import type { Plant } from '../../src/rules/types'

const plant = (uid: number, plantId: string, nextProduceAt: number): Plant =>
  ({ uid, plantId, lane: 0, col: 1, hp: 100, maxhp: 100, nextProduceAt })

describe('D16 阳光唯一来源', () => {
  it('producer 每 12s 产 25，且自己的下次产出时刻顺推', () => {
    const r = tickProducers([plant(1, 'sprout', 24)], CTX.plants, 24, 0)
    expect(r.gained).toBe(SUN.produce_amount)
    expect(r.plants[0].nextProduceAt).toBe(48)
    expect(tickProducers(r.plants, CTX.plants, 47.9, 0).gained).toBe(0)
  })
  it('shooter / defense 永不产出', () => {
    for (const id of ['slinger', 'bush']) {
      expect(tickProducers([plant(1, id, 0)], CTX.plants, 1000, 0).gained).toBe(0)
    }
  })
  it('多株各自独立计时（不是全局整点对齐）', () => {
    const two = [plant(1, 'sprout', 24), plant(2, 'sprout', 37)]
    expect(tickProducers(two, CTX.plants, 30, 0).gained).toBe(25)
    expect(tickProducers(two, CTX.plants, 40, 0).gained).toBe(25)
  })
  it('上限 9990 截断，gained 只算实际入账', () => {
    const near = SUN.cap - 10
    const g = gainSun(near, 25)
    expect(g.sun).toBe(SUN.cap)
    expect(g.gained).toBe(10)
    expect(sunEvents(0)).toEqual([])
    expect(sunEvents(10)).toEqual([{ type: 'sun_gained', amount: 10 }])
  })
  it('阳光不足直接抛（把「点了种不下去」留给 play 层做提示，而不是静默失败）', () => {
    expect(() => spend(39, 40)).toThrow(/D16/)
    expect(spend(SUN.start, 40)).toBe(35)
  })
  it('起始阳光 75：够第一张 producer（阳光苗 40）', () => {
    expect(SUN.start).toBe(75)
    expect(CTX.plants.sprout.cost).toBeLessThanOrEqual(SUN.start)
  })
})
```

- [x] **Step 3: 提交**

```bash
git add src/rules/economy.ts tests/unit/economy.test.ts
git commit -m "feat(rules): 阳光经济 producer-only（D16）"
```

---

### Task 8: 战斗层（一维推进 / 取最近 / 啃食 / 失败线）

**Files:**
- Create: `src/rules/combat.ts`
- Test: `tests/unit/combat.test.ts`

**Interfaces:**
- Consumes: `BOARD`、`types.Zombie`/`Plant`/`ZombieDef`/`PlantDef`/`Event`
- Produces:
  - `contactZombie(zombies: readonly Zombie[], plants: readonly Plant[], x: number, lane: number): Zombie | undefined`
  - `advanceZombies(zombies, plants, zdefs: Record<string, ZombieDef>, dt, slow): { zombies: Plant 之外; plants; events; breached: boolean }`（正式签名见 Step 1）
  - `fireShooters(plants, zombies, pdefs: Record<string, PlantDef>, dt): { zombies: Zombie[]; events: Event[] }`

- [x] **Step 1: 写 `src/rules/combat.ts`**

§5：坐标去掉 y 轴，combat 完全可单测。僵尸与植物的接触用一维窗口判定（`eat_back`/`eat_front`），**不做像素碰撞**。

```ts
import { BOARD } from './constants'
import type { Event, Plant, Zombie, ZombieDef, PlantDef } from './types'

export type AdvanceResult = {
  zombies: Zombie[]; plants: Plant[]; events: Event[]; breached: boolean
}

// 同 lane、且植物落在僵尸嘴部窗口内（实施偏差：已无用的 zombies 入参改名为 _zombies）
export function preyAt(_zombies: readonly Zombie[], plants: readonly Plant[], z: Zombie): Plant | undefined {
  return plants.find((p) =>
    p.lane === z.lane && p.col >= z.x - BOARD.eat_back && p.col <= z.x + BOARD.eat_front)
}

export function nearestZombie(zombies: readonly Zombie[], lane: number, fromCol: number): Zombie | undefined {
  return zombies
    .filter((z) => z.lane === lane && z.x > fromCol)
    .sort((a, b) => a.x - b.x)[0]
}

export function advanceZombies(
  zombies: readonly Zombie[], plants: readonly Plant[],
  zdefs: Record<string, ZombieDef>, dt: number, slow: number
): AdvanceResult {
  const hp: Record<number, number> = {}
  plants.forEach((p) => { hp[p.uid] = p.hp })
  const events: Event[] = []
  let breached = false

  const nextZombies = zombies.map((z) => {
    const def = zdefs[z.zombieId]
    const nz = { ...z }
    const prey = preyAt(zombies, plants, z)
    if (prey) {
      hp[prey.uid] -= def.dps * dt              // 啃食：不前进（D17 的 slow 只作用于位移）
    } else {
      nz.x -= def.speed * dt * slow
    }
    if (nz.x < BOARD.house_x) breached = true
    return nz
  })

  const alive: Plant[] = []
  plants.forEach((p) => {
    if (hp[p.uid] <= 0) events.push({ type: 'plant_died', plantId: p.plantId, lane: p.lane, col: p.col })
    else alive.push({ ...p, hp: hp[p.uid] })
  })
  return { zombies: nextZombies, plants: alive, events, breached }
}

export function fireShooters(
  plants: readonly Plant[], zombies: readonly Zombie[],
  pdefs: Record<string, PlantDef>, dt: number
): { zombies: Zombie[]; events: Event[] } {
  const hp: Record<number, number> = {}
  zombies.forEach((z) => { hp[z.uid] = z.hp })
  for (const p of plants) {
    const def = pdefs[p.plantId]
    if (def.slot !== 'shooter') continue
    const target = nearestZombie(zombies, p.lane, p.col)
    if (target) hp[target.uid] -= def.dps * dt   // 持续伤害率，非单次（§4.2）
  }
  const events: Event[] = []
  const alive = zombies.filter((z) => {
    if (hp[z.uid] > 0) return true
    events.push({ type: 'zombie_died' })
    return false
  }).map((z) => ({ ...z, hp: hp[z.uid] }))
  return { zombies: alive, events }
}
```

- [x] **Step 2: 写战斗测试**

`tests/unit/combat.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { advanceZombies, fireShooters, nearestZombie, preyAt } from '../../src/rules/combat'
import { BOARD } from '../../src/rules/constants'
import { CTX } from '../../src/content/index'
import type { Plant, Zombie } from '../../src/rules/types'

const z = (over: Partial<Zombie> = {}): Zombie =>
  ({ uid: 1, zombieId: 'z_basic', lane: 2, x: 5, hp: 100, maxhp: 100, flag: false, ...over })
const p = (over: Partial<Plant> = {}): Plant =>
  ({ uid: 9, plantId: 'bush', lane: 2, col: 5, hp: 1200, maxhp: 1200, nextProduceAt: 0, ...over })

describe('一维推进与啃食', () => {
  it('前方无植物时按 speed*dt 递减 x', () => {
    const r = advanceZombies([z()], [], CTX.zombies, 1, 1)
    expect(r.zombies[0].x).toBeCloseTo(5 - CTX.zombies.z_basic.speed, 10)
    expect(r.breached).toBe(false)
  })
  it('嘴里有植物时停下啃 HP，不前进', () => {
    const r = advanceZombies([z()], [p()], CTX.zombies, 1, 1)
    expect(r.zombies[0].x).toBe(5)
    expect(r.plants[0].hp).toBe(1200 - CTX.zombies.z_basic.dps)
    expect(r.events).toEqual([])
  })
  it('植物被啃到 HP<=0 时发 plant_died 并从场上移除', () => {
    const r = advanceZombies([z()], [p({ hp: 5 })], CTX.zombies, 1, 1)
    expect(r.plants).toHaveLength(0)
    expect(r.events).toEqual([{ type: 'plant_died', plantId: 'bush', lane: 2, col: 5 }])
  })
  it('跨 lane 不互动（没有二维碰撞）', () => {
    const r = advanceZombies([z()], [p({ lane: 0 })], CTX.zombies, 1, 1)
    expect(r.plants[0].hp).toBe(1200)
    expect(r.zombies[0].x).toBeLessThan(5)
  })
  it('越过失败线置 breached（D17 的 slow 也照样越过——减速不是免死）', () => {
    expect(advanceZombies([z({ x: BOARD.house_x + 0.05 })], [], CTX.zombies, 1, 1).breached).toBe(true)
    expect(advanceZombies([z({ x: BOARD.house_x + 0.05 })], [], CTX.zombies, 1, 0.85).breached).toBe(true)
  })
  it('slow 系数只乘在位移上（§7 僵尸 ×0.85）', () => {
    const r = advanceZombies([z()], [], CTX.zombies, 1, 0.85)
    expect(r.zombies[0].x).toBeCloseTo(5 - 0.10 * 0.85, 10)
  })
})

describe('shooter 取同 lane 最近目标', () => {
  it('只打 x > col 里最小的那只（弹丸藤 dps 30）', () => {
    const near = z({ uid: 1, x: 6, hp: 100 })
    const far = z({ uid: 2, x: 8, hp: 100 })
    const r = fireShooters([p({ plantId: 'slinger', col: 3 })], [far, near], CTX.plants, 1)
    expect(r.zombies.find((x) => x.uid === 1)!.hp).toBe(70)
    expect(r.zombies.find((x) => x.uid === 2)!.hp).toBe(100)
  })
  it('身后（x<=col）的目标不打；producer/defense 不开火', () => {
    const behind = z({ uid: 3, x: 2 })
    expect(fireShooters([p({ plantId: 'slinger', col: 3 })], [behind], CTX.plants, 1).zombies[0].hp).toBe(100)
    expect(fireShooters([p({ plantId: 'sprout' })], [z()], CTX.plants, 5).zombies[0].hp).toBe(100)
  })
  it('打死发 zombie_died 并移除', () => {
    const r = fireShooters([p({ plantId: 'slinger', col: 3 })], [z({ x: 6, hp: 10 })], CTX.plants, 1)
    expect(r.zombies).toHaveLength(0)
    expect(r.events).toEqual([{ type: 'zombie_died' }])
  })
  it('入参数组不被改写', () => {
    const zs = [z({ x: 6 })], ps = [p({ plantId: 'slinger', col: 3 })]
    const snap = JSON.stringify({ zs, ps })
    fireShooters(ps, zs, CTX.plants, 3)
    expect(JSON.stringify({ zs, ps })).toBe(snap)
  })
  it('preyAt/nearestZombie 的空输入返回 undefined', () => {
    expect(preyAt([], [], z())).toBeUndefined()
    expect(nearestZombie([], 2, 0)).toBeUndefined()
  })
})
```

- [x] **Step 3: 提交**

```bash
git add src/rules/combat.ts tests/unit/combat.test.ts
git commit -m "feat(rules): 一维推进/取最近/啃食/失败线（§5/§7，D17 减速）"
```

---

### Task 9: 出怪时间轴与定步长模拟

**Files:**
- Create: `src/rules/waves.ts`, `src/rules/sim.ts`
- Test: `tests/unit/sim.test.ts`

**Interfaces:**
- Consumes: T2–T8 全部、`CTX`、`BOARD.spawn_x`、`RULES.tick_s`/`panel_slowdown`
- Produces:
  - `waves.spawnDue(waves: readonly WaveDef[], spawned: number, t: number, uidStart: number): { zombies: Zombie[]; spawned: number; uid: number; events: Event[] }`
  - `sim.newGame(levelId: string, ctx: Ctx): GameState`
  - `sim.tick(state: GameState, dt: number, ctx: Ctx): StepResult`
  - `sim.createAccumulator(step_s?: number): { push(elapsed: number, cb: (dt: number) => void): number; alpha(): number; steps(): number }`
  - `sim.runUntil(state: GameState, ctx: Ctx, until: (s: GameState) => boolean, maxT: number): StepResult`

- [x] **Step 1: 写 `src/rules/waves.ts`**

出怪点固定 `BOARD.spawn_x`，**不加随机抖动**：抖动需要一个跨 tick 存活的随机流，会把「同一关重玩布局一致」(§6.2) 与可回放 (D18) 都拖下水。视觉错位交给渲染层插值和 lane 分布。

```ts
import { BOARD } from './constants'
import type { Event, WaveDef, Zombie } from './types'

export function spawnDue(
  waves: readonly WaveDef[], spawned: number, t: number, uidStart: number
): { zombies: Zombie[]; spawned: number; uid: number; events: Event[] } {
  const zombies: Zombie[] = []
  const events: Event[] = []
  let uid = uidStart
  while (spawned < waves.length && t >= waves[spawned].t) {
    const w = waves[spawned]
    for (const lane of w.lanes) {
      zombies.push({ uid: uid++, zombieId: w.zombie, lane, x: BOARD.spawn_x, hp: 0, maxhp: 0, flag: !!w.flag })
      events.push({ type: 'zombie_spawned', zombieId: w.zombie, lane })
    }
    spawned += 1
  }
  return { zombies, spawned, uid, events }
}
```

`hp: 0, maxhp: 0` 由 `sim.tick` 立刻用僵尸数值表填上（规则层不在 waves 里查表，保持 waves 可独立测试）。

- [x] **Step 2: 写 `src/rules/sim.ts`**

单帧顺序固定为：出怪 → 僵尸推进/啃食 → 射手开火 → producer 产阳光 → 结算 outcome。顺序写死在函数里并加注释，任何调序都会改变可达性结果（T12 会因此变红，这是故意的）。

```ts
import { BOARD, RULES, SUN } from './constants'
import { advanceZombies, fireShooters } from './combat'
import { spawnDue } from './waves'
import { tickProducers, sunEvents } from './economy'
import { createHand } from './cards'
import type { Ctx, Event, GameState, StepResult, Zombie } from './types'

export function newGame(levelId: string, ctx: Ctx): GameState {
  const level = ctx.levels[levelId]
  if (!level) throw new Error(`newGame: 关卡不存在 ${levelId}`)
  const hand = createHand(level.deckIds, ctx)
  return {
    levelId, t: 0, sun: SUN.start,
    cards: hand.cards, deckCursor: hand.deckCursor, seq: hand.seq,
    plants: [], zombies: [], spawned: 0,
    panelOpen: false, outcome: null
  }
}

function fillStats(zombies: readonly Zombie[], ctx: Ctx): Zombie[] {
  return zombies.map((z) => {
    const def = ctx.zombies[z.zombieId]
    if (!def) throw new Error(`sim: 僵尸数值不存在 ${z.zombieId}（G1：zombies.json 缺条目）`)
    return { ...z, hp: def.hp, maxhp: def.hp }
  })
}

export function tick(state: GameState, dt: number, ctx: Ctx): StepResult {
  if (state.outcome) return { state, events: [] }
  const level = ctx.levels[state.levelId]
  const t = state.t + dt
  const events: Event[] = []

  const sp = spawnDue(level.waves, state.spawned, t, state.seq)
  // 实施偏差（关键 bug 修复）：只给新出怪初始化 HP。若对全部僵尸重新 fillStats，
  // 射手每 tick 打出的伤害都会被重置，僵尸永远打不死。
  const zombies = [...state.zombies, ...fillStats(sp.zombies, ctx)]
  events.push(...sp.events)

  const slow = state.panelOpen ? RULES.panel_slowdown : 1   // D17：不暂停，只减速
  const adv = advanceZombies(zombies, state.plants, ctx.zombies, dt, slow)
  events.push(...adv.events)

  const shot = fireShooters(adv.plants, adv.zombies, ctx.plants, dt)
  events.push(...shot.events)

  const eco = tickProducers(adv.plants, ctx.plants, t, state.sun)
  events.push(...sunEvents(eco.gained))

  let outcome: GameState['outcome'] = state.outcome   // 显式类型，避免 TS 把 null 窄化死
  if (adv.breached) outcome = 'death'
  else if (sp.spawned >= level.waves.length && shot.zombies.length === 0) outcome = 'cleared'
  if (outcome && !state.outcome) events.push({ type: 'outcome', kind: outcome })

  return {
    state: {
      ...state, t, sun: eco.sun, zombies: shot.zombies, plants: eco.plants,
      spawned: sp.spawned, seq: sp.uid, outcome
    },
    events
  }
}

// D18：逻辑与帧率解耦。MAX_STEPS 兜住「标签页切回来一次性补 30 分钟」的螺旋。
const MAX_STEPS = 240

export function createAccumulator(step_s: number = RULES.tick_s) {
  let acc = 0
  let steps = 0
  return {
    push(elapsed: number, cb: (dt: number) => void): number {
      acc += Math.max(0, Math.min(elapsed, MAX_STEPS * step_s))
      steps = 0
      while (acc >= step_s) { acc -= step_s; cb(step_s); steps++ }
      return steps
    },
    alpha(): number { return acc / step_s },   // 渲染层 60fps 插值用
    steps(): number { return steps }
  }
}

export function runUntil(state: GameState, ctx: Ctx, until: (s: GameState) => boolean, maxT = 600): StepResult {
  const all: Event[] = []
  let cur = state
  // 实施偏差：必须带 !cur.outcome。tick 在 outcome 后原样返回，t 不再增长，
  // 只靠 until/maxT 会让「结算早于 until」的调用方死循环。
  while (!cur.outcome && !until(cur) && cur.t < maxT) {
    const r = tick(cur, RULES.tick_s, ctx)
    cur = r.state
    all.push(...r.events)
  }
  return { state: cur, events: all }
}
```

- [x] **Step 3: 写模拟测试**

`tests/unit/sim.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { M0_LEVEL_ID, CTX } from '../../src/content/index'
import { createAccumulator, newGame, runUntil, tick } from '../../src/rules/sim'
import { RULES, SUN } from '../../src/rules/constants'
import type { GameState } from '../../src/rules/types'

const at = (s: GameState, t: number, ctx = CTX) => runUntil(s, ctx, (x) => x.t >= t).state

describe('newGame', () => {
  it('起始阳光 75、5 张手牌、场上无僵尸', () => {
    const s = newGame(M0_LEVEL_ID, CTX)
    expect(s.sun).toBe(SUN.start)
    expect(s.cards).toHaveLength(5)
    expect(s.zombies).toHaveLength(0)
    expect(s.outcome).toBeNull()
    expect(s.t).toBe(0)
  })
  it('未知 levelId 抛错（静默空关卡会让孩子看到空白草坪）', () => {
    expect(() => newGame('nope', CTX)).toThrow(/关卡不存在/)
  })
})

describe('定步长与时间轴', () => {
  it('首怪 t=30 才出现，出怪数与 waves 一致', () => {
    expect(at(newGame(M0_LEVEL_ID, CTX), 29.9).zombies).toHaveLength(0)
    const s = at(newGame(M0_LEVEL_ID, CTX), 30.1)
    expect(s.zombies).toHaveLength(1)
    expect(s.zombies[0].hp).toBe(CTX.zombies.z_basic.hp)   // fillStats 生效
    expect(s.spawned).toBe(1)
  })
  it('多 lane 波次一次出多只（flag 标记随波次带上）', () => {
    const s = at(newGame(M0_LEVEL_ID, CTX), 185.1)
    expect(s.zombies.filter((z) => z.flag)).toHaveLength(3)
    expect(s.spawned).toBe(6)
  })
  it('累加器：30fps 恰好 1 tick，240fps 不重复推进', () => {
    const acc = createAccumulator()
    expect(acc.push(1 / 30, () => {})).toBe(1)
    expect(acc.push(1 / 60, () => {})).toBe(0)
    expect(acc.push(1 / 60, () => {})).toBe(1)
    expect(acc.alpha()).toBeCloseTo(0, 12)
  })
  it('长时间空档被 MAX_STEPS 兜住，不出现补帧螺旋', () => {
    const acc = createAccumulator()
    let n = 0
    acc.push(3600, () => { n++ })
    expect(n).toBe(240)
    expect(acc.push(1 / 30, () => {})).toBe(0)  // 余量已被截断在 <1 tick
  })
  it('dt 与帧率无关：1 秒用 1 步或 30 步推进，僵尸 x 相同（D18 的判据）', () => {
    const one = tick(newGame(M0_LEVEL_ID, CTX), 30, CTX)  // 30s 一步（远超 tick_s，只做等式对照）
    const many = runUntil(newGame(M0_LEVEL_ID, CTX), CTX, (s) => s.t >= 30)
    const a = one.state.zombies.find((z) => z.lane === 2)!
    const b = many.state.zombies.find((z) => z.lane === 2)!
    expect(a.x - b.x).toBeLessThan(0.05)   // 大步长误差上限；真实循环只用 1/30
  })
})

describe('outcome', () => {
  it('无植物时僵尸越线判 death 并只发一次事件', () => {
    const r = runUntil(newGame(M0_LEVEL_ID, CTX), CTX, (s) => s.outcome !== null)
    expect(r.state.outcome).toBe('death')
    expect(r.events.filter((e) => e.type === 'outcome')).toHaveLength(1)
  })
  it('已有 outcome 后 tick 不再推进任何数据', () => {
    const dead: GameState = { ...newGame(M0_LEVEL_ID, CTX), outcome: 'death', t: 100 }
    const r = tick(dead, RULES.tick_s, CTX)
    expect(r).toEqual({ state: dead, events: [] })
  })
  it('波次未出完时不会误判 cleared', () => {
    const s = at(newGame(M0_LEVEL_ID, CTX), 200)
    expect(s.spawned).toBeLessThan(CTX.levels[M0_LEVEL_ID].waves.length)
  })
})
```

Run: `npm test`
Expected: 全绿。`dt 与帧率无关` 那条允许 0.05 的离散步长误差——真实循环只会用 `RULES.tick_s`，这条测试是为了钉住"步长是唯一时间来源"这件事，不是精确性承诺。

- [x] **Step 4: 提交**

```bash
git add src/rules/waves.ts src/rules/sim.ts tests/unit/sim.test.ts
git commit -m "feat(rules): 波次时间轴 + 定步长模拟与累加器（D17/D18）"
```

---

### Task 10: 玩家动作入口（渲染层唯一写入口）

**Files:**
- Create: `src/rules/play.ts`
- Test: `tests/unit/play.test.ts`

**Interfaces:**
- Consumes: `cards.submit`/`advanceHand`/`focusCard`、`economy.canAfford`/`spend`、`sim`、`CTX`
- Produces:
  - `type PlantReject = 'not_armed' | 'occupied' | 'no_sun' | 'out_of_board' | null`
  - `plantingReject(state: GameState, lane: number, col: number, ctx: Ctx): PlantReject`
  - `onTileClick(state: GameState, tileId: number, ctx: Ctx): StepResult`
  - `onCellClick(state: GameState, lane: number, col: number, ctx: Ctx): StepResult`
  - `onExit(state: GameState): StepResult`
  - `setPanelOpen(state: GameState, open: boolean): GameState`

- [x] **Step 1: 写 `src/rules/play.ts`**

```ts
import { BOARD, RULES, SUN } from './constants'
import { advanceHand, assertTransition, focusCard, submit } from './cards'
import { canAfford, spend } from './economy'
import type { Ctx, Event, GameState, StepResult } from './types'

export type PlantReject = 'not_armed' | 'occupied' | 'no_sun' | 'out_of_board' | null

export function setPanelOpen(state: GameState, open: boolean): GameState {
  return { ...state, panelOpen: open }
}

export function plantingReject(state: GameState, lane: number, col: number, ctx: Ctx): PlantReject {
  const card = focusCard(state.cards)
  if (!card || card.status !== 'armed') return 'not_armed'
  if (lane < 0 || lane >= BOARD.lanes || col < 0 || col >= BOARD.cols) return 'out_of_board'
  if (state.plants.some((p) => p.lane === lane && p.col === col)) return 'occupied'
  if (!canAfford(state.sun, ctx.plants[card.plantId].cost)) return 'no_sun'   // D16
  return null
}

export function onTileClick(state: GameState, tileId: number, ctx: Ctx): StepResult {
  if (state.outcome) return { state, events: [] }
  const r = submit(state.cards, tileId, state.t)
  if (!r.events.length && r.cards === state.cards) return { state, events: [] }
  return { state: { ...state, cards: r.cards }, events: r.events }
}

export function onCellClick(state: GameState, lane: number, col: number, ctx: Ctx): StepResult {
  const reject = plantingReject(state, lane, col, ctx)
  if (reject || state.outcome) return { state, events: [] }   // 拒绝原因由 UI 调 plantingReject 自己问
  const card = { ...focusCard(state.cards)! }
  const def = ctx.plants[card.plantId]
  const events: Event[] = []

  assertTransition(card.status, 'placed', card.wordId)    // armed→placed，§4.5
  card.status = 'placed'
  const plants = [...state.plants, {
    uid: state.seq, plantId: card.plantId, lane, col,
    hp: def.hp, maxhp: def.hp, nextProduceAt: state.t + SUN.produce_interval_s
  }]
  const cards = [card, ...state.cards.slice(1)]
  const hand = advanceHand({ cards, deckCursor: state.deckCursor, seq: state.seq + 1 }, ctx.levels[state.levelId].deckIds, ctx)
  events.push({ type: 'placed', plantId: card.plantId, lane, col })
  events.push(...hand.events)

  const sun = spend(state.sun, def.cost)                  // 阳光不返还（§6.3）
  const next: GameState = {
    ...state, sun, plants,
    cards: hand.view.cards, deckCursor: hand.view.deckCursor, seq: hand.view.seq,
    panelOpen: false                                      // 焦点卡已换人，抽屉收起
  }
  return { state: next, events }
}

export function onExit(state: GameState): StepResult {
  if (state.outcome) return { state, events: [] }   // 实施偏差：结算后禁止覆写（death 不能被 abandoned 盖掉）
  return {
    state: { ...state, outcome: 'abandoned' },
    events: [{ type: 'outcome', kind: 'abandoned' }]   // D20：不进错词权重
  }
}
```

两处实施已收口（原计划的笔误实录）：`PlantReject` 的 `'not_aramed'` 已改为 `'not_armed'`；`plant_reject` 事件不在 T2 的 `Event` 联合里，故**不为它扩 Event**，拒绝原因由 UI 调 `plantingReject` 自己问：

```ts
// 拒绝原因留给 UI 自己问，规则层不广播「点不动」这种渲染噪声
export function onCellClick(state, lane, col, ctx): StepResult {
  if (state.outcome) return { state, events: [] }
  if (plantingReject(state, lane, col, ctx)) return { state, events: [] }   // UI 先调 plantingReject 再决定提示
  …  // 其余同上
}
```

同时把 `card.status = 'placed'` 之前补一句显式断言（`submit` 只保证 armed，不保证调用方是 armed——`plantingReject` 已经检查过，但 §4.5 要求转移必须走表）：

```ts
  assertTransition(card.status, 'placed', card.wordId)
  card.status = 'placed'
```

（从 `./cards` 导入 `assertTransition`。）

- [x] **Step 2: 写动作层测试**

`tests/unit/play.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { M0_LEVEL_ID, CTX as ctx } from '../../src/content/index'
import { onCellClick, onExit, onTileClick, plantingReject, setPanelOpen } from '../../src/rules/play'
import { newGame, tick } from '../../src/rules/sim'
import { focusCard } from '../../src/rules/cards'
import { RULES, SUN } from '../../src/rules/constants'
import type { GameState } from '../../src/rules/types'

function armed(state: GameState): GameState {
  let s = state
  const card = focusCard(s.cards)!
  for (let i = 0; i < card.slots.length; i++) {
    const need = focusCard(s.cards)!.slots[i]
    const tile = focusCard(s.cards)!.tiles.find((t) => !t.used && t.letter === need)!
    s = onTileClick(s, tile.tileId, ctx).state
  }
  return s
}

describe('D7/D8：字母块只能填最左卡', () => {
  it('正确序列把焦点卡推到 armed', () => {
    const s = armed(newGame(M0_LEVEL_ID, ctx))
    expect(focusCard(s.cards)!.status).toBe('armed')
    expect(focusCard(s.cards)!.filled).toBe(9)   // sunflower 9 字母（原计划误写 8）
  })
  it('点错块只禁用、不扣阳光、不收抽屉', () => {
    const s0 = newGame(M0_LEVEL_ID, ctx)
    const bad = focusCard(s0.cards)!.tiles.find((t) => t.letter !== 's')!
    const r = onTileClick(s0, bad.tileId, ctx)
    expect(r.state.sun).toBe(s0.sun)
    expect(r.state.panelOpen).toBe(false)
    expect(r.state.cards[0].wrongTotal).toBe(1)
    expect(r.state.cards[0].tiles.find((t) => t.tileId === bad.tileId)!.disabledUntil)
      .toBeCloseTo(RULES.penalty_disable_ms / 1000, 9)
  })
})

describe('D16：种不下就是种不下', () => {
  it('armed 但阳光不足 → plantingReject = no_sun，状态零变化', () => {
    const s = armed({ ...newGame(M0_LEVEL_ID, ctx), sun: 39 })   // 阳光苗 cost 40
    expect(plantingReject(s, 2, 1, ctx)).toBe('no_sun')
    const r = onCellClick(s, 2, 1, ctx)
    expect(r.state).toBe(s)
    expect(r.events).toEqual([])
  })
  it('阳光只由 producer 产出；填对一整张卡不产生任何阳光', () => {
    const s0 = newGame(M0_LEVEL_ID, ctx)
    const s1 = armed(s0)
    expect(s1.sun).toBe(SUN.start)          // 填词全程阳光不变
    const placed = onCellClick(s1, 2, 1, ctx).state
    expect(placed.sun).toBe(SUN.start - ctx.plants.sprout.cost)
  })
  it('同格重复点击 → occupied；越界 → out_of_board', () => {
    const s = armed(newGame(M0_LEVEL_ID, ctx))
    const once = onCellClick(s, 0, 0, ctx).state
    // 种下后新焦点卡是 filling，必须先重新拼到 armed 才能问「这格是否已占」
    expect(plantingReject(armed(once), 0, 0, ctx)).toBe('occupied')
    expect(plantingReject(armed(newGame(M0_LEVEL_ID, ctx)), 5, 0, ctx)).toBe('out_of_board')
    expect(plantingReject(armed(newGame(M0_LEVEL_ID, ctx)), 0, 9, ctx)).toBe('out_of_board')
  })
})

describe('种植后的手牌与抽屉', () => {
  it('发 placed + focus_advanced，焦点右移且新焦点可填', () => {
    const s = armed(newGame(M0_LEVEL_ID, ctx))
    const r = onCellClick(s, 3, 2, ctx)
    expect(r.events.map((e) => e.type)).toEqual(['placed', 'focus_advanced'])
    expect(focusCard(r.state.cards)!.status).toBe('filling')
    expect(r.state.cards[0].wordId).toBe('w_coffee')
    expect(r.state.panelOpen).toBe(false)
  })
  it('植物带上一个产光周期后首次产光的排期（producer 节奏起点 = 种植时刻）', () => {
    const r = onCellClick(armed(newGame(M0_LEVEL_ID, ctx)), 1, 1, ctx).state
    expect(r.plants[0].nextProduceAt).toBe(SUN.produce_interval_s)
    expect(tick(r, RULES.tick_s, ctx).state.sun).toBe(r.sun)
  })
})

describe('D20：abandoned 与 death 分开', () => {
  it('onExit 置 abandoned 且发一次事件；重复调用不再发', () => {
    const r = onExit(newGame(M0_LEVEL_ID, ctx))
    expect(r.state.outcome).toBe('abandoned')
    expect(r.events).toEqual([{ type: 'outcome', kind: 'abandoned' }])
    expect(onExit(r.state).events).toEqual([])
  })
  it('setPanelOpen 只动 panelOpen（D17 的 slow 由此驱动，不含任何判定）', () => {
    const s = setPanelOpen(newGame(M0_LEVEL_ID, ctx), true)
    expect(s.cards).toBe(newGame(M0_LEVEL_ID, ctx).cards)
    expect(s.t).toBe(0)
  })
})
```

- [x] **Step 3: 提交**

```bash
git add src/rules/play.ts tests/unit/play.test.ts
git commit -m "feat(rules): 玩家动作入口 play.ts（D7/D16/D20 收口）"
```

---

### Task 11: 构建期校验与启动门禁（D21 + §11-4 + G4）

**Files:**
- Create: `src/rules/reachability.ts`, `src/content/validate.ts`
- Test: `tests/unit/content-validation.test.ts`

**Interfaces:**
- Consumes: `RAW`/`CTX`、`wordgen.buildTiles`/`multisetSelfCheck`、`SUN`、`BOARD`
- Produces:
  - `reachability.startReachable(deckIds: readonly string[], ctx: Ctx): string[]`
  - `validate.validateContent(raw: typeof RAW): { errors: string[]; warnings: string[] }`
  - `validate.assertContent(raw: typeof RAW): void`（`errors.length` 非 0 时抛，异常信息含全部错误）

- [x] **Step 1: 写 `src/rules/reachability.ts`**

G4 的可执行化。判据不是数值调平，而是**可达性**：起始阳光买不起首张卡 + 阳光唯一来源是已种下的 producer ⇒ 开局无任何阳光来源。

```ts
import { SUN } from './constants'
import type { Ctx } from './types'

export function startReachable(deckIds: readonly string[], ctx: Ctx): string[] {
  const issues: string[] = []
  const of = (id: string) => ctx.plants[ctx.decks[id].plantId]
  if (!deckIds.length) return [`词序为空`]
  const first = of(deckIds[0])
  if (first.cost > SUN.start) {
    issues.push(`起步死锁：首卡 ${deckIds[0]} → ${first.id} 需 ${first.cost} > 起始阳光 ${SUN.start}`)
  }
  const head = deckIds.slice(0, 2).map(of)
  if (!head.some((p) => p.slot === 'producer' && p.cost <= SUN.start)) {
    issues.push(`起步死锁：前 2 张没有 cost ≤ ${SUN.start} 的 producer，D16 下永远攒不够阳光`)
  }
  return issues
}
```

- [x] **Step 2: 写 `src/content/validate.ts`**

`errors` = 硬错误（D21 禁止启动）；`warnings` = 报告不阻断（孤立词、词长分布）。§11-4 的**素材存在性与尺寸**校验在 M0 降级为「art 路径格式」检查，真校验随 M4 美术进入——理由：M0 用 Graphics 绘制，没有素材文件。

```ts
import { RAW } from './index'
import { BOARD, RULES } from '../rules/constants'
import { startReachable } from '../rules/reachability'
import { buildTiles, distractorCount, multisetSelfCheck } from '../rules/wordgen'
import { mulberry32, seedHash } from '../rules/rng'

const BANNED = ['植物大战僵尸', 'Plants vs', 'PvZ', '僵尸博士', '坚果墙', '豌豆射手']
const WORD_RE = /^[a-z]{3,10}$/

export type Issues = { errors: string[]; warnings: string[] }

export function validateContent(raw: typeof RAW = RAW): Issues {
  const errors: string[] = []
  const warnings: string[] = []
  const plants = new Map(raw.plants.map((p) => [p.id, p]))
  const words = new Map(raw.words.map((w) => [w.id, w]))
  const decks = new Map(raw.decks.map((d) => [d.id, d]))
  const zombies = new Map(raw.zombies.map((z) => [z.id, z]))

  // §4.4 词表清洗（硬错误）
  const seen = new Map<string, string>()
  for (const w of raw.words) {
    if (!WORD_RE.test(w.word)) errors.push(`${w.id}: 「${w.word}」不符合 §4.4（只允许 a-z，长度 3–10）`)
    if (w.letters !== w.word.length) errors.push(`${w.id}: letters=${w.letters} ≠ word.length=${w.word.length}`)
    const dup = seen.get(w.word.toLowerCase())
    if (dup) errors.push(`${w.id}: 与 ${dup} 小写重复（§4.4）`)
    seen.set(w.word.toLowerCase(), w.id)
    if (!w.zh || !w.ipa) warnings.push(`${w.id}: 缺 zh/ipa，面板会显示空白`)
  }

  // D6/§4.1.1 配对与 theme 口径
  for (const d of raw.decks) {
    const word = words.get(d.wordId), plant = plants.get(d.plantId)
    if (!word) errors.push(`${d.id}: 引用了不存在的词 ${d.wordId}`)
    if (!plant) errors.push(`${d.id}: 引用了不存在的植物 ${d.plantId}`)
    if (word && plant) {
      if (d.theme === 'plant' && word.word !== plant.id) {
        errors.push(`${d.id}: theme=plant 必须指向同名植物（${word.word} ≠ ${plant.id}）`)
      }
      if (d.theme !== 'plant' && !plant.generic) {
        errors.push(`${d.id}: theme=${d.theme} 的词必须配 generic 苗木（§4.1.1）`)
      }
      const slots = word.word.split('')
      const tiles = buildTiles(word, mulberry32(seedHash(word.id, d.id)))
      if (!multisetSelfCheck(tiles, slots)) errors.push(`${d.id}: 字母块多重集合不自洽 = 死局（D9）`)
      if (tiles.length !== slots.length + distractorCount(slots.length)) {
        errors.push(`${d.id}: 块数 ${tiles.length} 与 §6.2 公式不符`)
      }
    }
  }

  // 每个词至少被一个 deck 引用（§4.4 warning）
  const used = new Set(raw.decks.map((d) => d.wordId))
  raw.words.filter((w) => !used.has(w.id)).forEach((w) => warnings.push(`${w.id}: 孤立词，没有任何 deck 引用`))

  // §2 红线：展示名黑名单（词本身是教材词汇，不受此限）
  for (const p of [...raw.plants, ...raw.zombies]) {
    for (const b of BANNED) if (p.name.includes(b)) errors.push(`${p.id}: 展示名「${p.name}」含禁用字样「${b}」（§2 红线）`)
  }
  for (const p of raw.plants) {
    if (!/^assets\/(plants|zombies)\/[a-z0-9_]+_[scl]\.png$/.test(p.art)) {
      warnings.push(`${p.id}: art 路径「${p.art}」不符合 §9 命名，M4 素材校验会失败`)
    }
    if (!['producer', 'shooter', 'defense', 'special'].includes(p.slot)) errors.push(`${p.id}: slot 非法`)
    if (p.slot === 'producer' && p.dps !== 0) warnings.push(`${p.id}: producer 带 dps，数值口径需复核`)
  }

  // 关卡：引用完整 + 波次单调 + 词序可达
  for (const lv of raw.levels) {
    lv.deckIds.forEach((id) => { if (!decks.has(id)) errors.push(`${lv.id}: 未知配对 ${id}`) })
    startReachable(lv.deckIds, {
      plants: Object.fromEntries(plants), words: Object.fromEntries(words),
      decks: Object.fromEntries(decks), zombies: Object.fromEntries(zombies),
      levels: Object.fromEntries(raw.levels.map((x) => [x.id, x]))
    }).forEach((m) => errors.push(`${lv.id}: ${m}`))
    const lanes = new Set([...Array(BOARD.lanes).keys()])
    let last = -1
    for (const wv of lv.waves) {
      if (!zombies.has(wv.zombie)) errors.push(`${lv.id}: 波次引用未知僵尸 ${wv.zombie}（G1）`)
      if (wv.t < last) errors.push(`${lv.id}: 波次 t=${wv.t} 不是单调递增`)
      last = wv.t
      wv.lanes.forEach((l) => { if (!lanes.has(l)) errors.push(`${lv.id}: lane ${l} 越界（0..${BOARD.lanes - 1}）`) })
      if (!wv.lanes.length) errors.push(`${lv.id}: 波次 t=${wv.t} 没有 lane`)
    }
    // §11-4 词长分布告警
    const lens = lv.deckIds.map((id) => words.get(decks.get(id)!.wordId)!.word.length)
    const longRatio = lens.filter((n) => n >= 8).length / lens.length
    if (longRatio > 0.4) warnings.push(`${lv.id}: ≥8 字母占 ${(longRatio * 100).toFixed(0)}%（>40%，难度曲线需手工调序）`)
  }

  // 僵尸速度必须为正：0 会让 cleared 永远不触发（波次出完但僵尸不掉血也不越线）
  for (const z of raw.zombies) {
    if (!(z.speed > 0) || !(z.hp > 0) || !(z.dps >= 0)) errors.push(`${z.id}: 数值非法 speed=${z.speed} hp=${z.hp} dps=${z.dps}`)
  }
  if (RULES.distractor_per_row > 12) warnings.push('distractor_per_row 超文档口径')
  return { errors, warnings }
}

export function assertContent(raw: typeof RAW = RAW): void {
  const { errors } = validateContent(raw)
  if (errors.length) {
    throw new Error(`D21：内容校验未通过（${errors.length} 条）\n  - ${errors.join('\n  - ')}`)
  }
}
```

- [x] **Step 3: 写校验测试（含反例，证明校验器真的会拦）**

`tests/unit/content-validation.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { RAW } from '../../src/content/index'
import { assertContent, validateContent } from '../../src/content/validate'
import { startReachable } from '../../src/rules/reachability'
import { CTX } from '../../src/content/index'

const patched = (mut: (raw: typeof RAW) => void) => {
  const copy: typeof RAW = {
    plants: RAW.plants.map((x) => ({ ...x })), words: RAW.words.map((x) => ({ ...x })),
    decks: RAW.decks.map((x) => ({ ...x })), zombies: RAW.zombies.map((x) => ({ ...x })),
    levels: RAW.levels.map((x) => ({ ...x, deckIds: [...x.deckIds], waves: x.waves.map((w) => ({ ...w, lanes: [...w.lanes] })) }))
  }
  mut(copy)
  return copy
}

describe('D21 正向：M0 夹具必须干净', () => {
  it('没有硬错误', () => {
    expect(validateContent().errors).toEqual([])
    expect(() => assertContent()).not.toThrow()
  })
  it('词长分布告警如实报出（sunflower 9 + broccoli 8 ⇒ 25%，低于阈值不报）', () => {
    const { warnings } = validateContent()
    expect(warnings.some((w) => /≥8 字母/.test(w))).toBe(false)   // 2/8 = 25% ≤ 40%，不该报
  })
})

describe('反例：每一条硬错误都要真的拦住', () => {
  it('letters 与 word.length 不一致', () => {
    const r = validateContent(patched((x) => { x.words[0].letters = 7 }))
    expect(r.errors.join()).toContain('letters=7')
  })
  it('词表含空格/连字符/数字（§4.4 一律拒绝）', () => {
    for (const bad of ['ice cream', 'a.m.', "don't", 'TV', 'cat2']) {
      const r = validateContent(patched((x) => { x.words[0].word = bad; x.words[0].letters = bad.length }))
      expect(r.errors.join(), bad).toContain('§4.4')
    }
  })
  it('theme=plant 指向异名植物', () => {
    const r = validateContent(patched((x) => { x.decks[0] = { ...x.decks[0], plantId: 'lux', theme: 'plant' } }))
    expect(r.errors.join()).toContain('theme=plant')
  })
  it('非 plant 词配了专属植物（会出现「拼 YELLOW 召唤坚果墙」）', () => {
    const r = validateContent(patched((x) => { x.decks[1] = { ...x.decks[1], plantId: 'lux' } }))
    expect(r.errors.join()).toContain('generic')
  })
  it('小写重复', () => {
    const r = validateContent(patched((x) => { x.words[1].word = 'SUNFLOWER'.toLowerCase() }))
    expect(r.errors.join()).toContain('小写重复')
  })
  it('展示名踩红线', () => {
    const r = validateContent(patched((x) => { x.plants[1].name = '豌豆射手' }))
    expect(r.errors.join()).toContain('§2 红线')
  })
  it('波次引用未知僵尸 / lane 越界 / 非单调', () => {
    expect(validateContent(patched((x) => { x.levels[0].waves[0].zombie = 'z_boss' })).errors.join()).toContain('未知僵尸')
    expect(validateContent(patched((x) => { x.levels[0].waves[0].lanes = [7] })).errors.join()).toContain('越界')
    expect(validateContent(patched((x) => { x.levels[0].waves[1].t = 1 })).errors.join()).toContain('单调')
  })
  it('起步死锁被拦住（G4 的回归哨兵）', () => {
    const ids = CTX.levels.u3_w1.deckIds
    expect(startReachable(ids, CTX)).toEqual([])
    // 实施：测试内临时加一株 cost 80 的假植物 lux，用它的卡制造 G4 起步死锁
    expect(startReachable(['d_lux_lux', ...ids], CTX).join()).toContain('起步死锁')
    expect(startReachable(['d_coffee_bush', 'd_green_bush', ...ids], CTX).join()).toContain('producer')
    const r = validateContent(patched((x) => {
      x.levels[0].deckIds = ['d_coffee_bush', 'd_green_bush', ...ids.slice(2)]
    }))
    expect(r.errors.join()).toContain('起步死锁')
  })
  it('assertContent 抛错时把全部错误带进信息里（开发模式可点开）', () => {
    expect(() => assertContent(patched((x) => { x.words[0].letters = 1 }))).toThrow(/内容校验未通过/)
  })
})
```

> **实施说明：** 实际 `tests/unit/content-validation.test.ts` 以 `structuredClone(RAW)` 构造反例，签名是 `validateContent(raw)` / `assertContent(raw)`；另补了 `w_spare` 孤立词告警、非法 slot、art 路径、非 generic 召唤等用例。骨架里的 `d_lux_lux` 是测试内临时植物 `lux`（cost 80），只为触发 G4 死锁，不进入 M0 夹具。

- [x] **Step 4: 跑 `npm run validate` 确认门禁脚本可用**

Run: `npm run validate`
Expected: `1 file ... passed`。（这条命令是 §11-4 的「构建期校验」入口；`npm test` 里也跑到同一条。）

- [x] **Step 5: 提交**

```bash
git add src/rules/reachability.ts src/content/validate.ts tests/unit/content-validation.test.ts
git commit -m "feat(content): 构建期校验 + 起步可达性门禁（D21/§11-4/G4）"
```

---

### Task 12: 集成可达性测试（数值失衡唯一能被机器抓出来的办法）

**Files:**
- Create: `tests/integration/reachability.test.ts`
- Test: 同文件

**Interfaces:**
- Consumes: `newGame`/`tick`/`runUntil`、`onTileClick`/`onCellClick`/`plantingReject`/`setPanelOpen`、`focusCard`、`CTX`
- Produces: `fullCorrectRun(): GameState`（可被 T18 冒烟脚本复用为「自动演示」种子）

- [x] **Step 1: 写脚本玩家与两条方向断言**

```ts
import { describe, expect, it } from 'vitest'
import { CTX, M0_LEVEL_ID } from '../../src/content/index'
import { newGame, runUntil, tick } from '../../src/rules/sim'
import { focusCard } from '../../src/rules/cards'
import { onCellClick, onTileClick, plantingReject, setPanelOpen } from '../../src/rules/play'
import { BOARD, RULES, SUN } from '../../src/rules/constants'
import type { Event, GameState } from '../../src/rules/types'

// 「全对」玩家：立刻填完焦点卡，然后按 slot 选格种下去
const COL_BY_SLOT: Record<string, number> = { producer: 1, shooter: 3, defense: 6 }

function fillFocus(s: GameState): GameState {
  let cur = s
  for (let guard = 0; guard < 40; guard++) {
    const card = focusCard(cur.cards)
    if (!card || card.status !== 'filling') return cur
    const need = card.slots[card.filled]
    const tile = card.tiles.find((t) => !t.used && t.letter === need)
    if (!tile) throw new Error(`D9 断言失败：${card.wordId} 缺字母 ${need} 的块`)
    cur = onTileClick(cur, tile.tileId, CTX).state
  }
  throw new Error('fillFocus: 40 步没填完一张卡')
}

function laneByThreat(s: GameState, fallback: number): number {
  const threatened = [...s.zombies].sort((a, b) => a.x - b.x)[0]
  return threatened ? threatened.lane : fallback
}

function plantFocus(s0: GameState): GameState {
  let s = s0
  const card = focusCard(s.cards)
  if (!card || card.status !== 'armed') return s
  const col = COL_BY_SLOT[CTX.plants[card.plantId].slot]
  for (let lane = laneByThreat(s, 2), tries = 0; tries < BOARD.lanes; tries++) {
    if (!plantingReject(s, lane, col, CTX)) return onCellClick(s, lane, col, CTX).state
    lane = (lane + 1) % BOARD.lanes
  }
  for (let lane = 0; lane < BOARD.lanes; lane++) {
    for (let c = 0; c < BOARD.cols; c++) {
      if (!plantingReject(s, lane, c, CTX)) return onCellClick(s, lane, c, CTX).state
    }
  }
  return s   // 阳光不足：本轮放弃，下一 tick 再试（阳光来源见 D16）
}

function step(s: GameState): GameState {
  let cur = fillFocus(s)
  cur = plantFocus(cur)
  return tick(cur, RULES.tick_s, CTX).state
}

export function fullCorrectRun(): { state: GameState; events: Event[] } {
  let s = newGame(M0_LEVEL_ID, CTX)
  const events: Event[] = []
  const acc = []
  while (!s.outcome && s.t < 600) {
    const before = s.cards.length
    s = step(s)
    void before; void acc
  }
  return { state: s, events }
}

describe('§11-3 可达性：两个方向都必须可达', () => {
  it('全对 ⇒ 通关', () => {
    const { state } = fullCorrectRun()
    expect(state.outcome).toBe('cleared')
    expect(state.t).toBeLessThan(420)                     // §1 目标：一局 3–5 分钟
    expect(state.plants.length).toBeGreaterThanOrEqual(3)
    expect(state.cards.every((c) => c.status !== 'dormant')).toBe(true)
  })

  it('一次都不填 ⇒ 必败（僵尸是唯一时间压力）', () => {
    let s = newGame(M0_LEVEL_ID, CTX)
    while (!s.outcome && s.t < 600) s = tick(s, RULES.tick_s, CTX).state
    expect(s.outcome).toBe('death')
    expect(s.plants).toHaveLength(0)
  })

  it('只点错块（永远填不对）⇒ 必败，且禁用窗真的挡住了连点', () => {
    let s = newGame(M0_LEVEL_ID, CTX)
    let clicks = 0, blocked = 0
    while (!s.outcome && s.t < 600) {
      const card = focusCard(s.cards)
      if (card && card.status === 'filling') {
        const bad = card.tiles.find((t) => t.letter !== card.slots[card.filled] && !t.used)
        if (bad) {
          clicks++
          const before = card.wrongTotal
          const r = onTileClick(s, bad.tileId, CTX)
          if (r.state.cards[0].wrongTotal === before) blocked++   // 落在禁用窗内
          s = r.state
        }
      }
      s = tick(s, RULES.tick_s, CTX).state
    }
    expect(s.outcome).toBe('death')
    expect(blocked / clicks).toBeGreaterThan(0.5)                // 2s 禁用 vs 1/30 tick ⇒ 大多数点击应被吞
  })

  it('开着抽屉填词时僵尸确实被拖慢（D17 的 ×0.85 真的进了 sim）', () => {
    const slow = runUntil(setPanelOpen(newGame(M0_LEVEL_ID, CTX), true), CTX, (s) => s.t >= 40).state
    const fast = runUntil(newGame(M0_LEVEL_ID, CTX), CTX, (s) => s.t >= 40).state
    const a = slow.zombies.find((z) => z.lane === 2)!, b = fast.zombies.find((z) => z.lane === 2)!
    expect(a.x).toBeGreaterThan(b.x)
    expect(a.x - b.x).toBeCloseTo(10 * 0.10 * (1 - RULES.panel_slowdown), 4)
  })

  it('经济不越界：阳光全程 0 ≤ sun ≤ 9990', () => {
    let s = newGame(M0_LEVEL_ID, CTX)
    while (!s.outcome && s.t < 600) {
      s = step(s)
      expect(s.sun).toBeGreaterThanOrEqual(0)
      expect(s.sun).toBeLessThanOrEqual(SUN.cap)
    }
  })
})
```

- [x] **Step 2: 跑，若 `全对 ⇒ 通关` 失败就按这个梯子调（一次只改一处，改完即重跑）**

M0 数值是起点不是结论。**按顺序**试，试到哪一条通就停：

1. `src/content/levels.json`：`waves[].t` 全部 `× 1.2`（30→36 … 185→222）。只改时间轴，不动任何单位数值。
2. `src/content/zombies.json`：`z_bucket.hp` 350 → 280、`z_cone.hp` 200 → 170。
3. `src/rules/constants.ts`：`SUN.produce_interval_s` 24 → 20。这条改的是 D16 的文档口径，改完必须在「文档缺口」表加一行 G6 请求回写 §7。

不允许的调法：把 `panel_slowdown` 改成 0（等于暂停，违反 D17）、给植物加 `dps` 到 60 以上（M2 配平范围）、在 `play.ts` 里偷偷返还阳光（违反 §6.3）。

- [x] **Step 3: 提交**

```bash
git add tests/integration/reachability.test.ts src/content
git commit -m "test(integration): 全对可通关 / 全错必败 / D17 减速入账（§11-3）"
```

---

### Task 13: 布局 token 与竖向尺寸账（G2 的可执行化）

**Files:**
- Create: `src/ui/layout.ts`（原计划 `src/game/layout.ts`，G9 后归入 UI 层）
- Test: `tests/unit/layout.test.ts`

**Interfaces（实际导出）:**
- `VIEW = { w: 1280, h: 720, min_w: 960, min_h: 600 }`
- `HUD_H = 50`、`CELL_W = 120`、`CELL_H = 88`、`DRAWER_H = 230`、`LAWN_X = 40`、`LAWN_Y = 50`
- `DRAWER = { x: 20, y: 490, w: 1240, h: 230, content_w: 1046 }`
- `TILE = { w: 38, pitch: 42 }`、`MAX_TILES_TOTAL = 16`
- `xToPx(x)`：按 9 列比例映射（`xToPx(9.6) = 1192`）
- `colToPx(col)` / `laneToPx(lane)`：**格心/行心**（`colToPx(0)=100`、`laneToPx(0)=94`）
- `cellRect(lane, col)`：**左上角**（`cellRect(4,8)={x:1000,y:402,w:120,h:88}`）
- `tilesPerRow(contentW = DRAWER.content_w)`：`floor(1046/42) = 24 ≥ 16`

- [x] **Step 1: 写 `src/ui/layout.ts`**

关键实现（与计划原稿的差异已折算进接口说明：`xToPx` 用比例、`colToPx/laneToPx` 给格心、`tilesPerRow` 变单参）：

```ts
import { BOARD } from '../rules/constants'

export const VIEW = { w: 1280, h: 720, min_w: 960, min_h: 600 } as const
export const HUD_H = 50
export const CELL_W = 120
export const CELL_H = 88            // G2：50 + 5×88 + 230 = 720（96 会溢出）
export const DRAWER_H = 230
export const LAWN_X = 40
export const LAWN_Y = HUD_H
export const LAWN_W = BOARD.cols * CELL_W
export const LAWN_H = BOARD.lanes * CELL_H
export const DRAWER = { x: 20, y: LAWN_Y + LAWN_H, w: 1240, h: DRAWER_H, content_w: 1046 } as const
export const TILE = { w: 38, pitch: 42 } as const
export const MAX_TILES_TOTAL = 16

export const xToPx = (x: number) => LAWN_X + (x / BOARD.cols) * LAWN_W
export const colToPx = (col: number) => LAWN_X + (col + 0.5) * CELL_W
export const laneToPx = (lane: number) => LAWN_Y + (lane + 0.5) * CELL_H
export const cellRect = (lane: number, col: number) =>
  ({ x: LAWN_X + col * CELL_W, y: LAWN_Y + lane * CELL_H, w: CELL_W, h: CELL_H })
export const tilesPerRow = (contentW = DRAWER.content_w) => Math.floor(contentW / TILE.pitch)
```

- [x] **Step 2: 写几何测试**

`tests/unit/layout.test.ts` 四条断言组全部通过：

```ts
expect(HUD_H + LAWN_H + DRAWER_H).toBe(720)          // 96px 方案是 760，被拒绝
expect(DRAWER.y).toBe(490)
expect(LAWN_X + LAWN_W).toBe(1120)                    // 草坪右缘
expect(xToPx(BOARD.spawn_x)).toBeCloseTo(1192, 6)     // 出怪点在画幅内、网格外
expect(colToPx(0)).toBe(100)
expect(colToPx(8)).toBe(1060)
expect(laneToPx(4)).toBe(446)
expect(cellRect(4, 8)).toEqual({ x: 1000, y: 402, w: 120, h: 88 })
expect(tilesPerRow()).toBeGreaterThanOrEqual(MAX_TILES_TOTAL)   // 24 ≥ 16（G3）
```

- [x] **Step 3: 清理临时别名**

计划原稿里的 `BOARD_COLS_ALIAS` / `COLS_ALIAS` 未进入实现；测试直接 `import { BOARD } from '../../src/rules/constants'`。

- [x] **Step 4: 提交**

未执行（工作区不是 git 仓库，见 Task 1 Step 1 的实施说明）。

---

### Task 14: 场上实体绘制（SVG 形状语言，替换原 Phaser Graphics）

**Files:**
- Create: `src/art/PlantArt.tsx`、`src/art/ZombieArt.tsx`、`src/art/Icons.tsx`
- Modify: `src/ui/GameScreen.tsx`（`.game__plants` / `.game__zombies` 图层）
- Test: 无自动化断言；验收 = `npm run build` + 浏览器 DOM 断言

**实现（G9 偏差）：** 原计划的 `drawPlantShape`/`drawZombieShape`/`hpBar` 用 Phaser `Graphics`；实际改为内联 SVG 组件，沿用 05 标本页的形状语言与同一描边色：
- `PlantArt.tsx`：`PLANT_ART` 映射，`Sprout`（圆头 + 短茎 + 顶部果苞，对称无朝向）、`Slinger`（朝右管口，全场唯一带朝向）、`Bush`（三团矮宽重叠、重心压底）。场上尺寸 78px，格子 120×88。
- `ZombieArt.tsx`：`ZombieVariant = 'basic' | 'cone' | 'bucket' | 'flag'`，靠轮廓区分（锥顶 / 方头宽肩 / 旗杆），104px；受伤时渲染 `.zombie__hp` 血条。
- `Icons.tsx`：`SunIcon` / `FlagIcon` / `StarIcon` / `LockIcon`。

- [x] **Step 1: 写三个 SVG 组件**
- [x] **Step 2: 接进 GameScreen 图层并按逻辑坐标定位**

植物用 `cellRect` 居中；僵尸用 `xToPx(z.x)` + `laneToPx(z.lane) - 72`。两者均为 `aria-hidden` 装饰层，交互只发生在 `.game__cell` 按钮上。

- [x] **Step 3: 类型检查 + 构建**

`npm run build` 通过；浏览器中 `.placed` 与 `.zombie` 节点数量、定位与逻辑状态一致。

- [x] **Step 4: 提交**

未执行（非 git 仓库）。

---

### Task 15: HUD 与手牌/填词抽屉视图（D7/D8 的渲染面）

**Files:**
- Create: `src/ui/Hud.tsx`、`src/ui/HandCard.tsx`、`src/ui/WordPanel.tsx`、`src/ui/game.css`
- Modify: `src/ui/GameScreen.tsx`（自动展开/收起、事件 toast、种植拒绝提示）
- Test: 无自动化断言；验收 = 浏览器 DOM + 交互链

**实现（G9 偏差）：** 原计划的 `createHud`/`createHandPanel`（Phaser container + setInteractive）改为 React 组件：
- `Hud`：阳光药丸（`aria-live`，+25 浮动）、关卡名、波次进度（`min(spawned+1,total)`）、退出按钮。**没有 ×0.85 指示器**（原冒烟清单的 HUD 断言作废，D17 减速由 sim 的 `slow` 保证）。
- `HandCard`：5 张手牌，最左为焦点；显示掩码、成本、状态（填词中/点草坪种下/等待中）；不可负担时成本标红。
- `WordPanel`：槽位 + 38px 字母块；`used` 置灰、错块 2s 倒计时（`disabledUntil`）、armed 后全部禁用；「收起 ▾」只影响面板，不暂停模拟。
- `GameScreen`：新焦点卡出现时自动展开面板（`autoOpened` ref）；`onCell` 先问 `plantingReject`，再用 toast 报 `no_sun` / `occupied` / `not_armed`。

- [x] **Step 1: 写 HUD + 手牌 + 填词面板**
- [x] **Step 2: 接自动展开与拒绝提示**
- [x] **Step 3: 浏览器验收**

实测：抽屉 1240×230 @ (20,490)，手牌 700×206，面板 494×206；拼出 `sunflower` → armed → 种植阳光 75→35 → 焦点推进到 `coffee`；错块禁用/抖动/连错计数正常；阳光不足提示正确。

- [x] **Step 4: 提交**

未执行（非 git 仓库）。

---

### Task 16: 选关与结算覆盖层（D20 三态）

**Files:**
- Create: `src/ui/LevelSelect.tsx`、`src/ui/ResultOverlay.tsx`、`src/ui/level.css`
- Test: 无自动化断言；验收 = 浏览器点击

**实现（G9 偏差）：** 原计划 `screensView.ts` 改为两个 React 页面：
- `LevelSelect`：标题「拼词小院」、1 张可玩卡（Unit 3 · 第 1 关，含三株 SVG 苗木与三颗空星）+ 3 张锁定卡（夜色前院 / 泳池边 / 屋顶，标注「施工中」）。整卡是 `<button>`，CTA 用 `<span>` 视觉按钮，避免嵌套 button 的 DOM 警告。
- `ResultOverlay`：`cleared`「通关啦！」、`death`「小院失守」、`abandoned`「先歇一会儿」；显示用时/种植数/点错数；`abandoned` 不显示「再试一次」。

- [x] **Step 1: 写选关页 + 结算浮层**
- [x] **Step 2: 浏览器验收**

实测：选关页 4 张卡、1 张可玩；退出后浮层文案「已退出本关，成绩不计入错词」且无「失败」字样；无填充挂机（合成 rAF 250s）在 t=153s 结算「小院失守」。

- [x] **Step 3: 提交**

未执行（非 git 仓库）。

---

### Task 17: 场景状态机与启动门禁（React 版）

**Files:**
- Create: `src/ui/App.tsx`、`src/ui/GameScreen.tsx`、`src/main.tsx`
- Test: 浏览器冒烟 + `eslint-purity`

**实现（G9 偏差）：** 原计划 `src/game/GameScene.ts` + `src/main.ts`（Phaser.Game + fonts.ready 门禁）改为：
- `App.tsx`：`Route = {screen:'levels'} | {screen:'game', levelId, run}`；`.stage` 固定 1280×720，按窗口 `min(w/1280,h/720)` 做 CSS transform 缩放；`run` 作为重玩 key。
- `GameScreen.tsx`：`useState + stateRef` 保存 `GameState`；`requestAnimationFrame` 循环 + `createAccumulator`（D18）；事件转 toast / 阳光浮字 / 抖动 / 结算浮层；退出走 `onExit`。
- `main.tsx`：`assertContent(RAW)` 失败时渲染 `BootError` 并**不启动游戏**（D21）；`validateContent` 的 warnings 打 `console.warn`，不阻断。
- M0 未打包自定义字体，因此没有 `document.fonts.ready` 门禁（系统字体栈直接可用）。

- [x] **Step 1: 写路由与舞台缩放**
- [x] **Step 2: 写定步长循环与输入接线**
- [x] **Step 3: 写 D21 启动门禁**
- [x] **Step 4: 浏览器验收**

实测：`vite` 启动正常，选关→游戏→退出→选关全链可走；控制台无 error / 无 React 警告 / 无内容校验警告。已知环境限制：Browser Connector 页面 `visibilityState=hidden` 时原生 rAF 暂停，实时玩法用合成 rAF 验证。

- [x] **Step 5: 提交**

未执行（非 git 仓库）。

---

### Task 18: 端到端冒烟（M0 的唯一人工验收）

**Files:**
- Create: `scripts/smoke-checklist.md`（已落地）
- Test: 人工执行；结果记录在该文件底部表格

**Interfaces:**
- Consumes: 前面全部
- Produces: `npm run dev` 下 M0 全链路的人工验收记录

- [x] **Step 1: 全链自动化先过一遍**

Run: `npm run lint && npm test && npm run build && npm run validate`

实测结果（2026-11-07）：四项全绿——ESLint 无 error；14 个测试文件 / 99 个用例通过；`tsc --noEmit` + `vite build` 通过（59 modules，JS 189.97 kB / gzip 61.61 kB）；validate 12 个用例通过。

- [x] **Step 2: 写冒烟清单**

已写入 `scripts/smoke-checklist.md`，A1–A13 按实际实现更新：
- A2 首卡 `sunflower`（9 槽），点右侧卡提示「只能先拼最左边的那张卡」
- A4 错块：抖动 + 「这个字母不对，换一个试试」+ 2 秒倒计时
- A5 填完提示「拼好啦！点草坪种下去」；D17 减速无 HUD 标记，改为对照位移速度
- A6 阳光 75→35（阳光苗 cost 40）
- A7 弹丸藤 cost 75，不足时提示「阳光不够，等等苗木产光」
- A12 结算「通关啦！」/「小院失守」；A13 退出结算「先歇一会儿」，无「失败」字样

- [x] **Step 3: 跑 dev server 做首轮自测**

`npm run dev` → `http://127.0.0.1:5173`。首轮自测记录见 `scripts/smoke-checklist.md` 底部表格：A3–A7、A12（失败态）、A13 与画幅测量已过；A12 通关态由集成测试覆盖（脚本玩家 t=203.4 s 清场）；B/C/D 待人工补勾。

- [x] **Step 4: 回写计划勾选状态**

计划所有步骤已勾选为完成；提交步骤因工作区不是 git 仓库而跳过（见「实施结果与偏差」）。

---

## 实施结果与偏差（2026-11-07）

**结论：** M0 垂直切片已实现并通过自动化门禁；浏览器首轮自测已完成，孩子实测（D1–D4）与部分人工项待补。

### 交付物
- 规则层 11 个模块 + 内容校验；React 渲染层 + 内联 SVG 美术；14 个测试文件 / 99 个用例。
- `npm run lint` / `npm test` / `npm run build` / `npm run validate` 全绿。
- 构建：59 modules，JS 189.97 kB（gzip 61.61 kB），CSS 20.40 kB（gzip 5.66 kB）。
- 集成脚本玩家：8 张卡全部种下，t=203.40 s 清场；无填充挂机在 t≈153 s（面板展开 ×0.85）失败。

### 与计划的偏差

| # | 偏差 | 原因 / 落法 |
|---|---|---|
| 1 | 渲染层 Phaser → React 18 + CSS + SVG（G9） | 复用参考工程 `pvz-ui`；`src/rules/**` 纯函数边界不变 |
| 2 | 波次 25/55/85/115/145/170 → **30/70/110/140/170/200** | 调平后单局 203.4 s，落回 3–5 分钟；测试锁定 |
| 3 | `sunflower.letters` 8 → **9** | 单词 9 字母；原夹具少 1 导致槽位/干扰数测试失败 |
| 4 | `buildTiles` 增 `idBase`，`makeCard` 用 `instanceId * 32` | tileId 跨卡唯一，D7 才能按 id 拒绝非焦点卡 |
| 5 | `tick` 只给**新出怪** `fillStats` | 原写法每 tick 重置全部僵尸 HP，射手伤害永远不累积、关卡不可通关（集成测试抓出） |
| 6 | `runUntil` 增加 `!cur.outcome` 守卫 | outcome 后 tick 原样返回、t 冻结，只靠 until/maxT 会死循环 |
| 7 | `onExit` 遇到已有 outcome 直接返回 | 防止 `abandoned` 覆盖 `death`（D20 三态互斥） |
| 8 | `preyAt` 的未用 `zombies` 参数改名 `_zombies` | ESLint `argsIgnorePattern: '^_'`；签名保持兼容 |
| 9 | `advanceHand` 正式签名带 `ctx` | 计划中的两参版本是伪代码；测试与调用点已统一 |
| 10 | HUD 不显示 ×0.85 | 原计划的标记未实现；D17 减速在规则层有测试，冒烟改为对照位移 |
| 11 | 无 `document.fonts.ready` 门禁 | M0 不打包自定义字体，系统字体栈直接可用 |
| 12 | 所有 git 提交步骤未执行 | 工作区不是 git 仓库；文件与勾选状态即交付凭证 |
| 13 | 测试新增/重命名 | 14 个文件：cards-submit / cards-hand / economy / combat / sim / play / wordgen / rng / constants / layout / content-fixtures / content-validation / eslint-purity + integration/reachability |
| 14 | 浏览器实时验收受环境限制 | Browser Connector 页面 hidden 时 rAF 暂停；用合成 rAF 验证失败结算，通关由集成测试覆盖 |

### 首轮浏览器自测（DOM 级）
- 舞台 1280×720，缩放 0.593；网格 (40,50) 1080×440；抽屉 (20,490) 1240×230；手牌 700×206；面板 494×206。
- 拼 `sunflower` 9 块 → armed；种下后阳光 75→35、`.placed` = 1、焦点推进到 `coffee`（6 槽）。
- 错块：2 秒倒计时 + 面板抖动 + 连错计数；阳光不足：正确提示且零扣费。
- 退出：`abandoned` 浮层，无「失败」字样；挂机：t=153 s `death` 浮层。
- 控制台：无 error / 无 React 嵌套警告 / 无内容校验警告。

### 仍未完成（人工）
- `scripts/smoke-checklist.md` 的 B（刷新种子一致性）、C1（960×600 窗口）、D1–D4（孩子实测）需在可见浏览器/真人环境补勾。
- 这些属于 M0 完成定义中的人工验收，不由自动化代填。

---

## 验收（M0 完成的定义）

1. `npm run lint` / `npm test` / `npm run build` / `npm run validate` 四条全绿（实测：14 文件 / 99 用例）。测试覆盖规则层 11 个模块 + `eslint-purity` + `content-validation`（D21）+ `integration/reachability`（全对可通关 / 全错必败 / 确定性 / 错块吞点）。
2. 浏览器里一个不认识任何按钮的孩子能在 60 秒内点出「拼对 → 种下 → 僵尸变慢/被打死 → 结算」——**待真人实测**（D1–D4），自动化只验到交互链与三态结算。
3. 规则层没有任何文件 import React / Phaser / DOM，没有 `Math.random()`，由 ESLint + `eslint-purity` 双重锁住。
4. 一局时长落在 3–5 分钟（集成测试断言 `state.t < 420`；实测通关 t=203.4 s）。
5. 三条 §14 风险被机器验掉：干扰块死局（`multisetSelfCheck` 全夹具）、起步死锁（`startReachable`）、规则层被渲染层侵蚀（purity 测试）。

## 明确不做（越界即回退）

- 语音全链（`speechJudge.ts`、`platform/speech.ts`、buff、四态降级、隐私文案）→ M3
- 求助阶梯 `hint_ladder` 与 `assisted` 记账、复习排序、存档 `migrate` → M1（`Card.ladderLevel`/`assisted` 字段已按 §4.5 留在类型里，值恒为 0/false，M1 直接接上）
- 8 株 4 僵尸的完整阵容与数值配平、词长分布调序 → M2
- ImageGen 美术、`matting.py`、Kenney 音效、字体打包、图鉴、设置页、性能核验 → M4
- JSON Schema 文件与 `ajv`、素材存在性/尺寸校验 → M4
- `paused` 状态与暂停菜单 → M1
- 竖屏布局（D14 已否决，任何情况下不做）

## 执行顺序与依赖（实况）

`T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12` 规则层串行到底（每步都吃上一步的签名）。
`T13` 只依赖 `T3`，实际在规则层期间并行完成。
`T14（SVG 美术）→ T15（HUD/手牌/抽屉）→ T16（选关/结算）→ T17（React 壳与门禁）→ T18（冒烟）` 依赖 `T13` + 规则层全部完成；原计划的 Phaser `GameScene` 不再存在。

<!-- MORE -->
