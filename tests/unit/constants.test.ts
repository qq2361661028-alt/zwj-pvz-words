import { describe, expect, it } from 'vitest'
import { BOARD, RULES, SUN } from '../../src/rules/constants'

describe('数值 token', () => {
  it('tick 与减速系数按文档原值，改动必须显式经过这里', () => {
    expect(RULES.tick_s).toBeCloseTo(1 / 30, 12)
    expect(RULES.panel_slowdown).toBe(0.85)
    expect(RULES.penalty_disable_ms).toBe(2000)
    expect(RULES.hand_size).toBe(5)
  })

  it('阳光经济：起始 75 / 上限 9990 / 每 24s 产 25（§7）', () => {
    expect(SUN).toEqual({ start: 75, cap: 9990, produce_amount: 25, produce_interval_s: 24 })
  })

  it('棋盘 5×9，出怪点在网格外右侧、失败线在左侧', () => {
    expect(BOARD.lanes).toBe(5)
    expect(BOARD.cols).toBe(9)
    expect(BOARD.spawn_x).toBeGreaterThan(BOARD.cols)
    expect(BOARD.house_x).toBeGreaterThanOrEqual(0)
    expect(BOARD.house_x).toBeLessThan(1)
  })
})
