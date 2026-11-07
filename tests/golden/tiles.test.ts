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
