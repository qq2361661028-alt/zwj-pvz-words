import { describe, expect, it } from 'vitest'
import { CTX, M0_LEVEL_ID, RAW } from '../../src/content/index'
import { makeCard } from '../../src/rules/cards'
import { BOARD } from '../../src/rules/constants'
import { startReachable } from '../../src/rules/reachability'
import { multisetSelfCheck } from '../../src/rules/wordgen'

describe('M0 内容夹具', () => {
  it('规模：3 植物 / 8 词 / 8 配对 / 4 僵尸 / 1 关', () => {
    expect(RAW.plants).toHaveLength(3)
    expect(RAW.words).toHaveLength(8)
    expect(RAW.decks).toHaveLength(8)
    expect(RAW.zombies).toHaveLength(4)
    expect(RAW.levels).toHaveLength(1)
    expect(CTX.levels[M0_LEVEL_ID]).toBeDefined()
  })

  it('词表：a-z、3–10 字母、letters 与拼写一致、拼写不重复', () => {
    const seen = new Set<string>()
    for (const w of RAW.words) {
      expect(w.word, w.id).toMatch(/^[a-z]{3,10}$/)
      expect(w.letters).toBe(w.word.length)
      expect(seen.has(w.word)).toBe(false)
      seen.add(w.word)
    }
  })

  it('配对：词/植物都存在，牌面能拼出词，种子可重放', () => {
    for (const deck of RAW.decks) {
      const word = CTX.words[deck.wordId]
      const plant = CTX.plants[deck.plantId]
      expect(word, deck.id).toBeDefined()
      expect(plant, deck.id).toBeDefined()
      const a = makeCard(deck, CTX, 0)
      const b = makeCard(deck, CTX, 0)
      expect(a.tiles).toEqual(b.tiles)
      expect(multisetSelfCheck(a.tiles, word.word), deck.id).toBe(true)
    }
  })

  it('关卡牌序覆盖 3 类植物，且开局可达（G4）', () => {
    const level = CTX.levels[M0_LEVEL_ID]
    const slots = level.deckIds.map((id) => CTX.plants[CTX.decks[id].plantId].slot)
    expect(new Set(slots)).toEqual(new Set(['producer', 'shooter', 'defense']))
    expect(level.deckIds).toHaveLength(8)
    expect(startReachable(level.deckIds, CTX)).toEqual([])
  })

  it('波次：6 波、t 递增、lane 合法、僵尸存在，总出怪 7', () => {
    const level = CTX.levels[M0_LEVEL_ID]
    expect(level.waves).toHaveLength(6)
    let prev = -1
    let total = 0
    for (const w of level.waves) {
      expect(w.t).toBeGreaterThan(prev)
      prev = w.t
      expect(CTX.zombies[w.zombie], w.zombie).toBeDefined()
      for (const lane of w.lanes) {
        expect(Number.isInteger(lane)).toBe(true)
        expect(lane).toBeGreaterThanOrEqual(0)
        expect(lane).toBeLessThan(BOARD.lanes)
      }
      total += w.lanes.length
    }
    expect(total).toBe(7)
    expect(level.waves[0].t).toBe(30)
    expect(level.waves.at(-1)!.flag).toBe(true)
  })

  it('§2 红线：夹具文案不含任何禁用名', () => {
    const texts = [
      ...RAW.plants.map((p) => p.name),
      ...RAW.zombies.map((z) => z.name),
      ...RAW.levels.map((l) => l.name),
      ...RAW.words.map((w) => w.zh)
    ].join('|')
    for (const banned of ['植物大战僵尸', 'Plants vs', 'PvZ']) {
      expect(texts).not.toContain(banned)
    }
  })
})
