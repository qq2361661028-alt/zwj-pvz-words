import { describe, expect, it } from 'vitest'
import { emptyFx, SHOT_STYLES, stepFx } from '../../src/ui/attackFx'
import { colToPx, xToPx } from '../../src/ui/layout'
import type { Plant, Zombie } from '../../src/rules/types'

const plant = (over: Partial<Plant> = {}): Plant => ({
  uid: 1,
  plantId: 'slinger',
  lane: 0,
  col: 1,
  hp: 300,
  maxhp: 300,
  nextProduceAt: 12,
  ...over
})

const zombie = (over: Partial<Zombie> = {}): Zombie => ({
  uid: 100,
  zombieId: 'z_basic',
  lane: 0,
  x: 5,
  hp: 100,
  maxhp: 100,
  flag: false,
  ...over
})

describe('攻击特效', () => {
  it('同路前方有目标才开火，落点取最近的僵尸', () => {
    const far = zombie({ uid: 101, x: 7 })
    const near = zombie({ uid: 102, x: 4 })
    const r = stepFx(emptyFx(), [plant()], [far, near], 0)
    expect(r.shots).toHaveLength(1)
    expect(r.shots[0].kind).toBe('pea')
    expect(r.shots[0].lane).toBe(0)
    expect(r.shots[0].fromX).toBe(colToPx(1))
    expect(r.shots[0].toX).toBe(xToPx(4))
  })

  it('没有同路前方目标、目标在身后或非射手植物都不开火', () => {
    expect(stepFx(emptyFx(), [plant()], [zombie({ lane: 1 })], 0).shots).toEqual([])
    expect(stepFx(emptyFx(), [plant()], [zombie({ x: 1 })], 0).shots).toEqual([])
    expect(stepFx(emptyFx(), [plant({ plantId: 'sprout' })], [zombie()], 0).shots).toEqual([])
  })

  it('三种射手各有独立弹型', () => {
    const plants = [
      plant({ uid: 1, plantId: 'slinger', lane: 0 }),
      plant({ uid: 2, plantId: 'thorn', lane: 1 }),
      plant({ uid: 3, plantId: 'thistle', lane: 2 })
    ]
    const zombies = [
      zombie({ uid: 11, lane: 0 }),
      zombie({ uid: 12, lane: 1 }),
      zombie({ uid: 13, lane: 2 })
    ]
    expect(stepFx(emptyFx(), plants, zombies, 0).shots.map((s) => s.kind)).toEqual([
      'pea',
      'spike',
      'seed'
    ])
  })

  it('按各植物射速冷却，不会每帧连发', () => {
    const plants = [plant()]
    const zombies = [zombie()]
    const t0 = stepFx(emptyFx(), plants, zombies, 0)
    expect(t0.shots).toHaveLength(1)
    const t1 = stepFx(t0, plants, zombies, 100)
    expect(t1.shots.filter((s) => s.bornAt === 100)).toEqual([])
    const t2 = stepFx(t1, plants, zombies, 600)
    expect(t2.shots.filter((s) => s.bornAt === 600)).toHaveLength(1)
  })

  it('光束在飞行 + 命中展示结束后清理', () => {
    const plants = [plant()]
    const zombies = [zombie()]
    const t0 = stepFx(emptyFx(), plants, zombies, 0)
    const first = t0.shots[0]
    const life = first.flightMs + first.impactMs
    expect(stepFx(t0, plants, zombies, life - 1).shots.some((s) => s.id === first.id)).toBe(true)
    expect(stepFx(t0, plants, zombies, life).shots.some((s) => s.id === first.id)).toBe(false)
  })

  it('三种弹丸保持更慢的飞行：飞行时长再次翻倍，射速不变', () => {
    expect(SHOT_STYLES.slinger.flightMs).toBe(1920)
    expect(SHOT_STYLES.thorn.flightMs).toBe(1520)
    expect(SHOT_STYLES.thistle.flightMs).toBe(3200)
    expect(SHOT_STYLES.slinger.intervalMs).toBe(600)
    expect(SHOT_STYLES.thorn.intervalMs).toBe(380)
    expect(SHOT_STYLES.thistle.intervalMs).toBe(850)
  })
})
