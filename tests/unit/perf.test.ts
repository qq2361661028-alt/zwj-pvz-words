import { describe, expect, it } from 'vitest'
import { summarizeFrames } from '../../src/ui/perf'

describe('帧统计', () => {
  it('按样本数与耗时算 FPS，p95 取排序后的 95 分位', () => {
    expect(summarizeFrames([16, 17, 16, 50], 1000)).toEqual({ fps: 4, p95: 50 })
  })

  it('空样本返回 0', () => {
    expect(summarizeFrames([], 1000)).toEqual({ fps: 0, p95: 0 })
    expect(summarizeFrames([16], 0)).toEqual({ fps: 0, p95: 0 })
  })
})
