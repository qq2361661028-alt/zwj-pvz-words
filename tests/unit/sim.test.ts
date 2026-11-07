import { describe, expect, it } from 'vitest'
import { CTX, M0_LEVEL_ID } from '../../src/content/index'
import { createAccumulator, newGame, runUntil, tick } from '../../src/rules/sim'
import { RULES, SUN } from '../../src/rules/constants'
import type { GameState } from '../../src/rules/types'

const at = (s: GameState, t: number, ctx = CTX) => runUntil(s, ctx, (x) => x.t >= t).state

describe('开局', () => {
  it('75 阳光、5 张手牌、空场、无结局', () => {
    const s = newGame(M0_LEVEL_ID, CTX)
    expect(s.sun).toBe(SUN.start)
    expect(s.cards).toHaveLength(5)
    expect(s.zombies).toEqual([])
    expect(s.plants).toEqual([])
    expect(s.outcome).toBeNull()
    expect(s.t).toBe(0)
    expect(s.spawned).toBe(0)
    expect(s.panelOpen).toBe(false)
  })

  it('newGame 接受冻结时长并写入状态', () => {
    expect(newGame(M0_LEVEL_ID, CTX).penaltyMs).toBe(2000)
    expect(newGame(M0_LEVEL_ID, CTX, 0).penaltyMs).toBe(0)
  })

  it('未知关卡抛错', () => {
    expect(() => newGame('nope', CTX)).toThrow(/关卡不存在/)
  })
})

describe('出怪时间轴', () => {
  it('首怪 t=40 才出现，数值由 fillStats 补上', () => {
    expect(at(newGame(M0_LEVEL_ID, CTX), 39.9).zombies).toHaveLength(0)
    const s = at(newGame(M0_LEVEL_ID, CTX), 40.1)
    expect(s.zombies).toHaveLength(1)
    expect(s.zombies[0]).toMatchObject({ zombieId: 'z_basic', lane: 2 })
    expect(s.zombies[0].x).toBeGreaterThan(9.5)
    expect(s.zombies[0].x).toBeLessThan(9.6)
    expect(s.zombies[0].hp).toBe(CTX.zombies.z_basic.hp)
    expect(s.zombies[0].maxhp).toBe(CTX.zombies.z_basic.hp)
    expect(s.spawned).toBe(1)
  })

  it('多 lane 波次一次出多只', () => {
    const slow = { ...CTX.zombies, z_basic: { ...CTX.zombies.z_basic, speed: 0.0001 } }
    const ctx = { ...CTX, zombies: slow }
    const s = at(newGame(M0_LEVEL_ID, ctx), 170.1, ctx)
    expect(s.outcome).toBeNull()
    expect(s.spawned).toBe(5)
    expect(s.zombies).toHaveLength(6)
    expect(s.zombies.map((z) => z.lane)).toEqual([2, 0, 4, 2, 0, 4])
    expect(s.zombies.filter((z) => z.zombieId === 'z_basic').every((z) => z.x > 9.5)).toBe(true)
  })

  it('波次未出完时不判 cleared', () => {
    const s = tick(newGame(M0_LEVEL_ID, CTX), RULES.tick_s, CTX).state
    expect(s.spawned).toBe(0)
    expect(s.outcome).toBeNull()
  })
})

describe('结局', () => {
  it('放任不管 → death，只发一次 outcome 事件', () => {
    const r = runUntil(newGame(M0_LEVEL_ID, CTX), CTX, (s) => s.outcome !== null, 300)
    expect(r.state.outcome).toBe('death')
    expect(r.state.t).toBeGreaterThan(140)
    expect(r.state.t).toBeLessThan(150)
    expect(r.events.filter((e) => e.type === 'outcome')).toEqual([{ type: 'outcome', kind: 'death' }])
  })

  it('已有结局后 tick 原样返回', () => {
    const dead: GameState = { ...newGame(M0_LEVEL_ID, CTX), outcome: 'death', t: 100 }
    const r = tick(dead, RULES.tick_s, CTX)
    expect(r.state).toBe(dead)
    expect(r.events).toEqual([])
  })
})

describe('D18 累加器', () => {
  it('30fps 恰好 1 tick，60fps 交替；alpha 是渲染插值余量', () => {
    const acc = createAccumulator()
    expect(acc.push(1 / 30, () => {})).toBe(1)
    expect(acc.push(1 / 60, () => {})).toBe(0)
    expect(acc.push(1 / 60, () => {})).toBe(1)
    expect(acc.alpha()).toBeLessThan(1e-9)
    acc.push(0.01, () => {})
    expect(acc.alpha()).toBeCloseTo(0.3, 9)
  })

  it('长空档被 MAX_STEPS 截断，不补帧螺旋', () => {
    const acc = createAccumulator()
    let n = 0
    const steps = acc.push(3600, () => { n++ })
    expect(steps).toBe(240)
    expect(n).toBe(240)
    expect(acc.alpha()).toBeLessThan(1e-9)
    expect(acc.push(1 / 300, () => {})).toBe(0)
  })

  it('负的 elapsed 被忽略', () => {
    const acc = createAccumulator()
    expect(acc.push(-1, () => {})).toBe(0)
  })
})

describe('可重放', () => {
  it('同样的输入两次运行完全一致（D10）', () => {
    const run = () => runUntil(newGame(M0_LEVEL_ID, CTX), CTX, (s) => s.t >= 120, 200)
    const a = run()
    const b = run()
    expect(a.state).toEqual(b.state)
    expect(a.events).toEqual(b.events)
  })

  it('runUntil 到 maxT 停下', () => {
    const r = runUntil(newGame(M0_LEVEL_ID, CTX), CTX, () => false, 1)
    expect(r.state.t).toBeGreaterThanOrEqual(1)
    expect(r.state.t).toBeLessThan(1.05)
  })
})
