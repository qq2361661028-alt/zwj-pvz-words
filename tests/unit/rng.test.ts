import { describe, expect, it } from 'vitest'
import { mulberry32, pick, pickWeighted, seedHash, shuffle } from '../../src/rules/rng'

describe('确定性随机', () => {
  it('seedHash 对同一组 key 稳定，对不同 key 发散', () => {
    expect(seedHash('w_coffee', 'd_coffee_bush')).toBe(seedHash('w_coffee', 'd_coffee_bush'))
    expect(seedHash('w_coffee', 'd_coffee_bush')).not.toBe(seedHash('w_coffee', 'd_green_slinger'))
    expect(seedHash('a')).toBeGreaterThanOrEqual(0)
    expect(seedHash('a')).toBeLessThan(2 ** 32)
  })

  it('mulberry32 序列可复现，输出落在 [0,1)', () => {
    const a = mulberry32(seedHash('w_milk', 'd_milk_bush'))
    const b = mulberry32(seedHash('w_milk', 'd_milk_bush'))
    for (let i = 0; i < 20; i++) {
      const v = a()
      expect(v).toBe(b())
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('shuffle 不改变多重集合', () => {
    const src = 'sunflower'.split('')
    const out = shuffle(src, mulberry32(7))
    expect(out.slice().sort().join('')).toBe(src.slice().sort().join(''))
    expect(src.join('')).toBe('sunflower')
  })

  it('pick / pickWeighted 可复现，空数组抛错', () => {
    const rand = mulberry32(1)
    const arr = ['a', 'b', 'c']
    expect(pick(arr, mulberry32(1))).toBe(pick(arr, mulberry32(1)))
    expect(pickWeighted([{ v: 'x', w: 1 }, { v: 'y', w: 0 }], rand)).toBe('x')
    expect(() => pick([], rand)).toThrow()
    expect(() => pickWeighted([], rand)).toThrow()
  })
})
