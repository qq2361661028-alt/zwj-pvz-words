import { describe, expect, it } from 'vitest'
import { CTX } from '../../src/content/index'
import { mulberry32, seedHash } from '../../src/rules/rng'
import { buildTiles, chooseDistractors, distractorCount, multisetSelfCheck } from '../../src/rules/wordgen'
import type { WordDef } from '../../src/rules/types'

const of = (id: string): WordDef => CTX.words[id]
const randOf = (wordId: string, deckId = 'probe') => mulberry32(seedHash(wordId, deckId))

describe('D9 干扰字母', () => {
  it('数量 = round(len*0.5)，夹在 2..6', () => {
    expect([3, 4, 5, 6, 8, 10, 12].map(distractorCount)).toEqual([2, 2, 3, 3, 4, 5, 6])
  })

  it('distractor_overrides 优先且不重复', () => {
    const word = of('w_sunflower')
    const picked = chooseDistractors(word, randOf(word.id))
    expect(picked.slice(0, 2)).toEqual(['f', 'v'])
    expect(new Set(picked).size).toBe(picked.length)
    expect(picked).toHaveLength(distractorCount(word.word.length))
  })

  it('同一配对两次生成完全一致（D10 种子）', () => {
    const a = buildTiles(of('w_broccoli'), randOf('w_broccoli'))
    const b = buildTiles(of('w_broccoli'), randOf('w_broccoli'))
    expect(a).toEqual(b)
  })

  it('牌面多重集合一定能拼出目标词', () => {
    for (const word of Object.values(CTX.words)) {
      const tiles = buildTiles(word, randOf(word.id))
      expect(multisetSelfCheck(tiles, word.word), word.id).toBe(true)
      expect(tiles).toHaveLength(word.word.length + distractorCount(word.word.length))
      expect(tiles.map((t) => t.tileId)).toEqual(tiles.map((_, i) => i))
      expect(tiles.every((t) => !t.used && t.disabledUntil === 0)).toBe(true)
    }
  })

  it('缺一张必需字母时自检失败', () => {
    const tiles = buildTiles(of('w_milk'), randOf('w_milk'))
    const idx = tiles.findIndex((t) => t.letter === 'm')
    expect(multisetSelfCheck(tiles.filter((_, i) => i !== idx), 'milk')).toBe(false)
  })
})
