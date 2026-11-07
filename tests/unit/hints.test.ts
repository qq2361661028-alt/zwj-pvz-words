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
