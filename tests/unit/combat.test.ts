import { describe, expect, it } from 'vitest'
import { CTX } from '../../src/content/index'
import { advanceZombies, fireShooters, nearestZombie, preyAt } from '../../src/rules/combat'
import { BOARD } from '../../src/rules/constants'
import type { Plant, Zombie } from '../../src/rules/types'

const plant = (over: Partial<Plant> = {}): Plant => ({
  uid: 1,
  plantId: 'bush',
  lane: 0,
  col: 3,
  hp: 4000,
  maxhp: 4000,
  nextProduceAt: 0,
  ...over
})

const zombie = (over: Partial<Zombie> = {}): Zombie => ({
  uid: 10,
  zombieId: 'z_basic',
  lane: 0,
  x: 3.5,
  hp: 100,
  maxhp: 100,
  flag: false,
  ...over
})

const slinger = (over: Partial<Plant> = {}): Plant =>
  plant({ uid: 2, plantId: 'slinger', col: 1, hp: 300, maxhp: 300, ...over })

describe('一维啃食窗口', () => {
  it('同 lane 且落在嘴部窗口才啃', () => {
    expect(preyAt([], [plant()], zombie())?.uid).toBe(1)
    expect(preyAt([], [plant({ col: 2 })], zombie())).toBeUndefined()
    expect(preyAt([], [plant({ col: 4 })], zombie())).toBeUndefined()
    expect(preyAt([], [plant({ lane: 1 })], zombie())).toBeUndefined()
  })

  it('窗口边界含端点', () => {
    expect(preyAt([], [plant({ col: 3 })], zombie({ x: 3.62 }))).toBeDefined()
    expect(preyAt([], [plant({ col: 3 })], zombie({ x: 2.88 }))).toBeDefined()
    expect(preyAt([], [plant({ col: 3 })], zombie({ x: 3.63 }))).toBeUndefined()
  })

  it('啃食时僵尸不前进，植物按 dps*dt 掉血', () => {
    const r = advanceZombies([zombie()], [plant()], CTX.zombies, 1, 1)
    expect(r.zombies[0].x).toBe(3.5)
    expect(r.plants[0].hp).toBe(4000 - CTX.zombies.z_basic.dps)
  })

  it('无猎物时按 speed*dt 左移；D17 的 slow 乘在位移上', () => {
    const free = advanceZombies([zombie({ x: 9 })], [], CTX.zombies, 10, 1)
    expect(free.zombies[0].x).toBeCloseTo(8.1, 9)
    const slow = advanceZombies([zombie({ x: 9 })], [], CTX.zombies, 10, 0.85)
    expect(slow.zombies[0].x).toBeCloseTo(9 - 0.9 * 0.85, 9)
  })

  it('植物血尽 → plant_died 并从场上移除', () => {
    const frail = plant({ hp: 5, maxhp: 5 })
    const r = advanceZombies([zombie()], [frail], CTX.zombies, 1, 1)
    expect(r.plants).toEqual([])
    expect(r.events).toEqual([{ type: 'plant_died', plantId: 'bush', lane: 0, col: 3 }])
  })

  it('越过 house_x → breached', () => {
    const r = advanceZombies([zombie({ x: BOARD.house_x + 0.05 })], [], CTX.zombies, 1, 1)
    expect(r.breached).toBe(true)
    expect(advanceZombies([zombie({ x: 2 })], [], CTX.zombies, 1, 1).breached).toBe(false)
  })
})

describe('射手', () => {
  it('只打同 lane、位于右侧的最近僵尸', () => {
    const far = zombie({ uid: 11, x: 6 })
    const near = zombie({ uid: 12, x: 3 })
    const r = fireShooters([slinger()], [far, near], CTX.plants, 1)
    expect(r.zombies.find((z) => z.uid === 12)!.hp).toBe(100 - 30)
    expect(r.zombies.find((z) => z.uid === 11)!.hp).toBe(100)
  })

  it('身后的僵尸不挨打；不同 lane 不挨打', () => {
    const behind = zombie({ uid: 13, x: 0.5 })
    const other = zombie({ uid: 14, lane: 3, x: 8 })
    const r = fireShooters([slinger()], [behind, other], CTX.plants, 1)
    expect(r.zombies.map((z) => z.hp)).toEqual([100, 100])
  })

  it('defense / producer 不开火', () => {
    const r = fireShooters(
      [plant({ plantId: 'bush' }), plant({ uid: 3, plantId: 'sprout' })],
      [zombie({ x: 5 })],
      CTX.plants,
      1
    )
    expect(r.zombies[0].hp).toBe(100)
  })

  it('血量归零 → 移除并发 zombie_died', () => {
    const r = fireShooters([slinger()], [zombie({ x: 5, hp: 20, maxhp: 100 })], CTX.plants, 1)
    expect(r.zombies).toEqual([])
    expect(r.events).toEqual([{ type: 'zombie_died' }])
  })

  it('nearestZombie 只认右侧', () => {
    expect(nearestZombie([zombie({ x: 0.5 })], 0, 1)).toBeUndefined()
    expect(nearestZombie([zombie({ uid: 1, x: 7 }), zombie({ uid: 2, x: 4 })], 0, 1)!.uid).toBe(2)
  })
})
