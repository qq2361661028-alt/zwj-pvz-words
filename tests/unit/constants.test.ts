import { describe, expect, it } from 'vitest'
import { BOARD, RULES, SPEECH_BUFF, SUN } from '../../src/rules/constants'

describe('数值 token', () => {
  it('tick 与减速系数按文档原值，改动必须显式经过这里', () => {
    expect(RULES.tick_s).toBeCloseTo(1 / 30, 12)
    expect(RULES.panel_slowdown).toBe(0.85)
    expect(RULES.penalty_disable_ms).toBe(2000)
    expect(RULES.hand_size).toBe(5)
    expect(RULES.hint_ladder_1).toBe(2)
    expect(RULES.hint_ladder_2).toBe(4)
  })

  it('阳光经济：起始 100 / 上限 9990 / 每 12s 产 25（§7，2026-11-07 提速 ×2）', () => {
    expect(SUN).toEqual({ start: 100, cap: 9990, produce_amount: 25, produce_interval_s: 12 })
  })

  it('§8.4 语音加成数值固定', () => {
    expect(SPEECH_BUFF).toEqual({ duration_s: 10, cooldown_s: 30, dps_multiplier: 1.25 })
  })

  it('棋盘 5×9，出怪点在网格外右侧、失败线在左侧', () => {
    expect(BOARD.lanes).toBe(5)
    expect(BOARD.cols).toBe(9)
    expect(BOARD.spawn_x).toBeGreaterThan(BOARD.cols)
    expect(BOARD.house_x).toBeGreaterThanOrEqual(0)
    expect(BOARD.house_x).toBeLessThan(1)
  })
})
