import { describe, expect, it } from 'vitest'
import { CTX as ctx, M0_LEVEL_ID } from '../../src/content/index'
import { focusCard } from '../../src/rules/cards'
import { RULES, SUN } from '../../src/rules/constants'
import { onCellClick, onExit, onTileClick, plantingReject, setPanelOpen } from '../../src/rules/play'
import { newGame, tick } from '../../src/rules/sim'
import type { GameState } from '../../src/rules/types'

function armed(state: GameState): GameState {
  let s = state
  for (;;) {
    const card = focusCard(s.cards)
    if (!card || card.status !== 'filling') return s
    const need = card.slots[card.filled]
    const tile = card.tiles.find((t) => !t.used && t.letter === need)!
    s = onTileClick(s, tile.tileId, ctx).state
  }
}

const ready = () => armed(newGame(M0_LEVEL_ID, ctx))

describe('D7/D8：字母块只能填最左卡', () => {
  it('正确序列把焦点卡推到 armed，阳光不变', () => {
    const s = ready()
    expect(focusCard(s.cards)!.status).toBe('armed')
    expect(focusCard(s.cards)!.filled).toBe(9)
    expect(s.sun).toBe(100)
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
  it('armed 但阳光不足 → no_sun，状态零变化', () => {
    const s = armed({ ...newGame(M0_LEVEL_ID, ctx), sun: 39 })
    expect(plantingReject(s, 2, 1, ctx)).toBe('no_sun')
    const r = onCellClick(s, 2, 1, ctx)
    expect(r.state).toBe(s)
    expect(r.events).toEqual([])
  })

  it('填对一整张卡不产生任何阳光，种植才扣费', () => {
    const s1 = ready()
    expect(s1.sun).toBe(100)
    const placed = onCellClick(s1, 2, 1, ctx).state
    expect(placed.sun).toBe(100 - ctx.plants.sprout.cost)
  })

  it('同格重复点击 → occupied；越界 → out_of_board', () => {
    const once = onCellClick(ready(), 0, 0, ctx).state
    expect(plantingReject(armed(once), 0, 0, ctx)).toBe('occupied')
    expect(plantingReject(ready(), 5, 0, ctx)).toBe('out_of_board')
    expect(plantingReject(ready(), 0, 9, ctx)).toBe('out_of_board')
  })
})

describe('种植后的手牌与抽屉', () => {
  it('发 placed + focus_advanced，焦点右移且新焦点可填', () => {
    const s = ready()
    const r = onCellClick(s, 3, 2, ctx)
    expect(r.events.map((e) => e.type)).toEqual(['placed', 'focus_advanced'])
    expect(focusCard(r.state.cards)!.status).toBe('filling')
    expect(r.state.cards[0].wordId).toBe('w_coffee')
    expect(r.state.panelOpen).toBe(false)
  })

  it('植物带上一个产光周期后首次产光的排期', () => {
    const r = onCellClick(ready(), 1, 1, ctx).state
    expect(r.plants[0].nextProduceAt).toBe(SUN.produce_interval_s)
    expect(tick(r, RULES.tick_s, ctx).state.sun).toBe(r.sun)
  })

  it('超过 8 张后牌库循环，手牌始终 5 张，整局都能拼词', () => {
    let s: GameState = { ...newGame(M0_LEVEL_ID, ctx), sun: 9990 }
    const cells: Array<[number, number]> = [
      [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
      [0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
      [0, 2], [1, 2]
    ]
    const eventTypes: string[][] = []
    for (const [lane, col] of cells) {
      s = { ...armed(s), sun: 9990 }
      const r = onCellClick(s, lane, col, ctx)
      eventTypes.push(r.events.map((e) => e.type))
      s = r.state
    }
    const deckIds = ctx.levels[M0_LEVEL_ID].deckIds
    expect(s.plants).toHaveLength(12)
    expect(s.cards).toHaveLength(5)
    expect(s.deckCursor).toBe(5 + 12)
    expect(eventTypes.every((types) => types.includes('focus_advanced'))).toBe(true)
    expect(focusCard(s.cards)!.status).toBe('filling')
    expect(s.cards[4].wordId).toBe(ctx.decks[deckIds[16 % deckIds.length]].wordId)
  })
})

describe('D20：abandoned 与 death 分开', () => {
  it('onExit 置 abandoned 且只发一次事件；重复调用原样返回', () => {
    const r = onExit(newGame(M0_LEVEL_ID, ctx))
    expect(r.state.outcome).toBe('abandoned')
    expect(r.events).toEqual([{ type: 'outcome', kind: 'abandoned' }])
    expect(onExit(r.state).state).toBe(r.state)
    expect(onExit(r.state).events).toEqual([])
  })

  it('setPanelOpen 只动 panelOpen，不含任何判定', () => {
    const s0 = newGame(M0_LEVEL_ID, ctx)
    const s = setPanelOpen(s0, true)
    expect(s.cards).toBe(s0.cards)
    expect(s.t).toBe(0)
    expect(s.sun).toBe(s0.sun)
    expect(s.panelOpen).toBe(true)
  })
})

describe('结束后动作入口关闭', () => {
  it('outcome 已定后点牌块/点格子都是 no-op', () => {
    const dead = { ...newGame(M0_LEVEL_ID, ctx), outcome: 'death' as const }
    const tileId = dead.cards[0].tiles[0].tileId
    expect(onTileClick(dead, tileId, ctx)).toEqual({ state: dead, events: [] })
    expect(onCellClick(dead, 0, 0, ctx)).toEqual({ state: dead, events: [] })
  })

  it('未 armed 时点格子是 no-op', () => {
    const s = newGame(M0_LEVEL_ID, ctx)
    expect(plantingReject(s, 0, 0, ctx)).toBe('not_armed')
    expect(onCellClick(s, 0, 0, ctx)).toEqual({ state: s, events: [] })
  })
})
