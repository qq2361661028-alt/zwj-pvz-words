import { describe, expect, it } from 'vitest'
import { CTX, M0_LEVEL_ID } from '../../src/content/index'
import { assertTransition, focusCard, submit } from '../../src/rules/cards'
import { newGame } from '../../src/rules/sim'
import type { GameState } from '../../src/rules/types'

const game = () => newGame(M0_LEVEL_ID, CTX)

function click(state: GameState, letter: string, now = state.t): GameState {
  const card = focusCard(state.cards)!
  const tile = card.tiles.find((t) => !t.used && t.letter === letter)!
  return { ...state, cards: submit(state.cards, tile.tileId, now).cards }
}

function fillWord(state: GameState): GameState {
  let s = state
  for (const ch of s.cards[0].slots) s = click(s, ch)
  return s
}

describe('D7/D8 填词', () => {
  it('按槽位顺序点对全部字母 → armed', () => {
    const s0 = game()
    expect(s0.cards[0].slots).toHaveLength(9)
    const s1 = fillWord(s0)
    expect(focusCard(s1.cards)!.filled).toBe(9)
    expect(focusCard(s1.cards)!.status).toBe('armed')
  })

  it('填对不产生阳光、不改动时间', () => {
    const s = fillWord(game())
    expect(s.sun).toBe(75)
    expect(s.t).toBe(0)
  })
})

describe('O2 错词惩罚', () => {
  it('点错：禁用 2 秒、wrongTotal+1、不推进槽位', () => {
    const s = game()
    const card = focusCard(s.cards)!
    const bad = card.tiles.find((t) => t.letter !== card.slots[0])!
    const r = submit(s.cards, bad.tileId, s.t)
    expect(r.events).toEqual([{ type: 'wrong', tileId: bad.tileId }])
    const after = focusCard(r.cards)!
    expect(after.filled).toBe(0)
    expect(after.wrongTotal).toBe(1)
    expect(after.wrongStreak).toBe(1)
    expect(after.tiles.find((t) => t.tileId === bad.tileId)!.disabledUntil).toBe(2)
  })

  it('禁用期内点击被吞掉，期满后重新响应', () => {
    const s = game()
    const card = focusCard(s.cards)!
    const bad = card.tiles.find((t) => t.letter !== card.slots[0])!
    const first = submit(s.cards, bad.tileId, 0)
    expect(submit(first.cards, bad.tileId, 1.9).events).toEqual([])
    expect(submit(first.cards, bad.tileId, 2).events).toEqual([
      { type: 'wrong', tileId: bad.tileId },
      { type: 'hint_ladder', level: 1 }
    ])
  })

  it('填对后 wrongStreak 清零，wrongTotal 保留', () => {
    const s = game()
    const card = focusCard(s.cards)!
    const bad = card.tiles.find((t) => t.letter !== card.slots[0])!
    const afterWrong = submit(s.cards, bad.tileId, 0)
    const good = afterWrong.cards[0].tiles.find((t) => !t.used && t.letter === card.slots[0])!
    const afterGood = submit(afterWrong.cards, good.tileId, 3)
    const after = focusCard(afterGood.cards)!
    expect(after.wrongStreak).toBe(0)
    expect(after.wrongTotal).toBe(1)
    expect(after.filled).toBe(1)
  })
})

describe('不可用点击', () => {
  it('已用掉的牌块不响应', () => {
    const s = game()
    const card = focusCard(s.cards)!
    const tile = card.tiles.find((t) => t.letter === card.slots[0])!
    const once = submit(s.cards, tile.tileId, 0)
    expect(once.events).toHaveLength(1)
    expect(submit(once.cards, tile.tileId, 99).events).toEqual([])
  })

  it('非焦点卡的牌块不响应（D7）', () => {
    const s = game()
    const second = s.cards[1]
    const tile = second.tiles.find((t) => t.letter === second.slots[0])!
    expect(submit(s.cards, tile.tileId, 0).events).toEqual([])
  })

  it('不存在的 tileId 不响应', () => {
    expect(submit(game().cards, 9999, 0).events).toEqual([])
  })

  it('submit 不改动入参（纯函数式拷贝）', () => {
    const s = game()
    const card = focusCard(s.cards)!
    const wrong = card.tiles.find((t) => t.letter !== card.slots[0])!
    const snapshot = JSON.stringify(s.cards)
    submit(s.cards, wrong.tileId, 0)
    expect(JSON.stringify(s.cards)).toBe(snapshot)
  })
})

describe('§4.5 转移表', () => {
  it('允许 armed → placed', () => {
    expect(() => assertTransition('armed', 'placed', 't')).not.toThrow()
  })

  it('禁止 placed → filling', () => {
    expect(() => assertTransition('placed', 'filling', 't')).toThrow(/§4\.5/)
  })

  it('禁止 filling → placed（必须先 armed）', () => {
    expect(() => assertTransition('filling', 'placed', 't')).toThrow(/§4\.5/)
  })
})
