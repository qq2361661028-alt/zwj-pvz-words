import { describe, expect, it } from 'vitest'
import { CTX, M0_LEVEL_ID } from '../../src/content/index'
import { advanceHand, createHand, focusCard } from '../../src/rules/cards'
import type { HandView } from '../../src/rules/cards'
import { RULES } from '../../src/rules/constants'

const level = CTX.levels[M0_LEVEL_ID]

describe('发手牌', () => {
  it('5 张：只有焦点卡 filling，其余 locked', () => {
    const hand = createHand(level.deckIds, CTX)
    expect(hand.cards).toHaveLength(RULES.hand_size)
    expect(hand.cards.map((c) => c.wordId)).toEqual(
      level.deckIds.slice(0, 5).map((id) => CTX.decks[id].wordId)
    )
    expect(hand.cards.map((c) => c.status)).toEqual(['filling', 'locked', 'locked', 'locked', 'locked'])
    expect(hand.cards.map((c) => c.instanceId)).toEqual([0, 1, 2, 3, 4])
    expect(hand.deckCursor).toBe(5)
    expect(hand.seq).toBe(5)
  })

  it('词序为空 → 空手牌', () => {
    expect(createHand([], CTX)).toEqual({ cards: [], deckCursor: 0, seq: 0 })
  })

  it('未知配对直接抛错（D21 的兜底）', () => {
    expect(() => createHand(['nope'], CTX)).toThrow(/配对不存在/)
  })
})

describe('补位', () => {
  it('移走焦点卡后从牌库补一张，新焦点立刻 filling 并发 focus_advanced', () => {
    const hand = createHand(level.deckIds, CTX)
    const placed = { ...hand.cards[0], status: 'placed' as const }
    const r = advanceHand(
      { cards: [placed, ...hand.cards.slice(1)], deckCursor: hand.deckCursor, seq: hand.seq },
      level.deckIds,
      CTX
    )
    expect(r.view.cards).toHaveLength(5)
    expect(r.view.cards[0].wordId).toBe('w_coffee')
    expect(r.view.cards[0].status).toBe('filling')
    expect(r.view.cards[4].wordId).toBe(CTX.decks[level.deckIds[5]].wordId)
    expect(r.view.deckCursor).toBe(6)
    expect(r.view.seq).toBe(6)
    expect(r.events).toEqual([{ type: 'focus_advanced' }])
    expect(focusCard(r.view.cards)!.status).toBe('filling')
  })

  it('牌库抽空后不再补牌，手牌缩短', () => {
    const view: HandView = {
      cards: [{ ...createHand(level.deckIds, CTX).cards[0], status: 'placed' }],
      deckCursor: level.deckIds.length,
      seq: 9
    }
    const r = advanceHand(view, level.deckIds, CTX)
    expect(r.view.cards).toHaveLength(0)
    expect(r.events).toEqual([])
    expect(r.view.deckCursor).toBe(level.deckIds.length)
  })
})
