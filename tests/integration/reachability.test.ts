import { describe, expect, it } from 'vitest'
import { CTX, M0_LEVEL_ID } from '../../src/content/index'
import { focusCard } from '../../src/rules/cards'
import { RULES, SUN } from '../../src/rules/constants'
import { onCellClick, onExit, onTileClick, plantingReject, setPanelOpen } from '../../src/rules/play'
import { newGame, runUntil, tick } from '../../src/rules/sim'
import type { Event, GameState } from '../../src/rules/types'

/**
 * 剧本玩家的固定落点（按牌序）：
 * 1 阳光苗 → lane2 后排；2 矮树丛 → lane2 第 3 列；3 阳光苗 → lane0 后排；
 * 4 弹丸藤 → lane2 第 2 列；5 矮树丛 → lane0 第 3 列；6 弹丸藤 → lane0 第 2 列；
 * 7 阳光苗 → lane4 后排；8 弹丸藤 → lane4 第 2 列。
 */
const PLAN: ReadonlyArray<readonly [number, number]> = [
  [2, 0], [2, 2], [0, 0], [2, 1], [0, 2], [0, 1], [4, 0], [4, 1]
]

function fillAll(state: GameState): GameState {
  let s = state
  for (;;) {
    const card = focusCard(s.cards)
    if (!card || card.status !== 'filling') return s
    const need = card.slots[card.filled]
    const tile = card.tiles.find((t) => !t.used && t.letter === need)!
    const r = onTileClick(s, tile.tileId, CTX)
    if (!r.events.length) throw new Error(`剧本玩家填不动 ${card.wordId}#${card.filled}`)
    s = r.state
  }
}

type Run = {
  state: GameState
  events: Event[]
  placed: number
  minSun: number
  maxSun: number
}

function scriptedRun(): Run {
  let s = fillAll(newGame(M0_LEVEL_ID, CTX))
  const events: Event[] = []
  let placed = 0
  let minSun = s.sun
  let maxSun = s.sun

  while (!s.outcome && s.t < 420) {
    minSun = Math.min(minSun, s.sun)
    maxSun = Math.max(maxSun, s.sun)

    const card = focusCard(s.cards)
    if (card?.status === 'armed' && placed < PLAN.length) {
      const [lane, col] = PLAN[placed]
      if (plantingReject(s, lane, col, CTX) === null) {
        const r = onCellClick(s, lane, col, CTX)
        events.push(...r.events)
        placed += 1
        s = fillAll(r.state)
        continue
      }
    }

    const r = tick(s, RULES.tick_s, CTX)
    events.push(...r.events)
    s = r.state
  }

  return { state: s, events, placed, minSun, maxSun }
}

describe('G4 可达性：剧本玩家必须真的能通关', () => {
  it('全部填对 + 按计划种植 → cleared，阳光始终在 0..9990', () => {
    const run = scriptedRun()
    expect(run.state.outcome).toBe('cleared')
    expect(run.state.t).toBeGreaterThan(190)
    expect(run.state.t).toBeLessThan(420)
    expect(run.placed).toBe(8)
    expect(run.state.zombies).toHaveLength(0)
    expect(run.state.sun).toBeGreaterThanOrEqual(0)
    expect(run.state.sun).toBeLessThanOrEqual(SUN.cap)
    expect(run.minSun).toBeGreaterThanOrEqual(0)
    expect(run.maxSun).toBeLessThanOrEqual(SUN.cap)
    expect(run.events.filter((e) => e.type === 'outcome')).toEqual([
      { type: 'outcome', kind: 'cleared' }
    ])
  })

  it('同一剧本两次运行结果一致（D10 可重放）', () => {
    const a = scriptedRun()
    const b = scriptedRun()
    expect(a.state).toEqual(b.state)
    expect(a.events).toEqual(b.events)
  })

  it('一次都不填 → death', () => {
    const r = runUntil(newGame(M0_LEVEL_ID, CTX), CTX, (s) => s.outcome !== null, 300)
    expect(r.state.outcome).toBe('death')
  })

  it('死磕同一个错块：>50% 点击被 2 秒禁用吞掉', () => {
    let s = newGame(M0_LEVEL_ID, CTX)
    const card = focusCard(s.cards)!
    const bad = card.tiles.find((t) => t.letter !== card.slots[0])!
    let attempts = 0
    let accepted = 0
    for (let i = 0; i < 200; i++) {
      attempts += 1
      const r = onTileClick(s, bad.tileId, CTX)
      if (r.events.length) {
        accepted += 1
        s = r.state
      }
      s = tick(s, 0.05, CTX).state
    }
    expect(attempts).toBe(200)
    expect(accepted / attempts).toBeLessThan(0.5)
    expect(accepted).toBeGreaterThanOrEqual(3)
    expect(focusCard(s.cards)!.wrongTotal).toBe(accepted)
  })

  it('D17：面板打开只减速 15%，10 秒位移差 ≈ 0.135 格', () => {
    const base = runUntil(newGame(M0_LEVEL_ID, CTX), CTX, (s) => s.t >= 40).state
    const slowed = runUntil(
      setPanelOpen(newGame(M0_LEVEL_ID, CTX), true),
      CTX,
      (s) => s.t >= 40
    ).state
    const a = base.zombies[0]
    const b = slowed.zombies[0]
    expect(a.lane).toBe(b.lane)
    const gap = b.x - a.x
    expect(gap).toBeGreaterThan(0.1)
    expect(gap).toBeLessThan(0.17)
  })

  it('D20：退出返回 abandoned，且不覆盖既有结局', () => {
    const quit = onExit(newGame(M0_LEVEL_ID, CTX))
    expect(quit.state.outcome).toBe('abandoned')
    expect(quit.events).toEqual([{ type: 'outcome', kind: 'abandoned' }])
    expect(onExit(quit.state).state).toBe(quit.state)

    const dead = runUntil(newGame(M0_LEVEL_ID, CTX), CTX, (s) => s.outcome !== null, 300).state
    const after = onExit(dead)
    expect(after.state.outcome).toBe('death')
    expect(after.events).toEqual([])
  })
})
