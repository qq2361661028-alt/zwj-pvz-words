import { describe, expect, it } from 'vitest'
import { CTX } from '../../src/content/index'
import { canAfford, gainSun, spend, sunEvents, tickProducers } from '../../src/rules/economy'
import { SUN } from '../../src/rules/constants'
import type { Plant } from '../../src/rules/types'

const plant = (over: Partial<Plant> = {}): Plant => ({
  uid: 0,
  plantId: 'sprout',
  lane: 0,
  col: 0,
  hp: 150,
  maxhp: 150,
  nextProduceAt: SUN.produce_interval_s,
  ...over
})

describe('D16 阳光收支', () => {
  it('canAfford 含等号；spend 不足时抛错', () => {
    expect(canAfford(40, 40)).toBe(true)
    expect(canAfford(39, 40)).toBe(false)
    expect(spend(75, 40)).toBe(35)
    expect(() => spend(39, 40)).toThrow(/D16/)
  })

  it('gainSun 封顶 9990，gained 是实际增量', () => {
    expect(gainSun(0, 25)).toEqual({ sun: 25, gained: 25 })
    expect(gainSun(SUN.cap - 10, 25)).toEqual({ sun: SUN.cap, gained: 10 })
    expect(gainSun(SUN.cap, 25)).toEqual({ sun: SUN.cap, gained: 0 })
  })

  it('只有 producer 产光，且严格到点才产出', () => {
    const plants = [
      plant({ uid: 1 }),
      plant({ uid: 2, plantId: 'bush', nextProduceAt: 0 }),
      plant({ uid: 3, plantId: 'slinger', nextProduceAt: 0 })
    ]
    const dueAt = SUN.produce_interval_s
    const early = tickProducers(plants, CTX.plants, dueAt - 0.1, 0)
    expect(early.gained).toBe(0)
    expect(early.sun).toBe(0)
    const due = tickProducers(plants, CTX.plants, dueAt, 0)
    expect(due.gained).toBe(SUN.produce_amount)
    expect(due.plants[0].nextProduceAt).toBe(dueAt * 2)
    expect(due.plants[1]).toBe(plants[1])
    expect(due.plants[2]).toBe(plants[2])
  })

  it('多个 producer 同时到点各产一次；长步长也不会一 tick 补多次', () => {
    const dueAt = SUN.produce_interval_s
    const plants = [plant({ uid: 1 }), plant({ uid: 2, nextProduceAt: dueAt })]
    const due = tickProducers(plants, CTX.plants, dueAt, 0)
    expect(due.gained).toBe(50)
    expect(due.plants.map((p) => p.nextProduceAt)).toEqual([dueAt * 2, dueAt * 2])
    const jump = tickProducers([plant({ uid: 1 })], CTX.plants, 1000, 0)
    expect(jump.gained).toBe(25)
  })

  it('满仓时 gained 为 0，不溢出', () => {
    const r = tickProducers([plant({ uid: 1 })], CTX.plants, SUN.produce_interval_s, SUN.cap)
    expect(r.gained).toBe(0)
    expect(r.sun).toBe(SUN.cap)
  })

  it('sunEvents 只在有进账时发事件', () => {
    expect(sunEvents(0)).toEqual([])
    expect(sunEvents(25)).toEqual([{ type: 'sun_gained', amount: 25 }])
  })
})
