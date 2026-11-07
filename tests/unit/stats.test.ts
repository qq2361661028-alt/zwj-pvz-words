import { describe, expect, it } from 'vitest'
import { DEFAULT_EASE, MIN_EASE, emptySave, recordWordResult } from '../../src/rules/stats'

describe('词统计与 assisted 记账', () => {
  it('初始存档为空且包含默认设置', () => {
    const save = emptySave('2026-11-07')
    expect(save).toMatchObject({ v: 2, last_played: '2026-11-07', word_stats: {}, levels: {} })
    expect(save.settings).toEqual({
      speech_enabled: true,
      sound_enabled: true,
      music_enabled: true,
      penalty_disable_ms: 2000
    })
  })

  it('correct / wrong 累加，wrong 重置 streak，correct 增加 streak', () => {
    let save = emptySave()
    save = recordWordResult(save, 'w_milk', 'correct', 100)
    save = recordWordResult(save, 'w_milk', 'correct', 110)
    expect(save.word_stats.w_milk).toMatchObject({
      correct: 2,
      wrong: 0,
      assisted: 0,
      streak: 2,
      last_seen_ts: 110
    })
    save = recordWordResult(save, 'w_milk', 'wrong', 120)
    expect(save.word_stats.w_milk).toMatchObject({
      correct: 2,
      wrong: 1,
      streak: 0,
      last_seen_ts: 120
    })
  })

  it('assisted 累加、streak 归零、ease 下调且有下限', () => {
    let save = emptySave()
    save = recordWordResult(save, 'w_milk', 'correct', 1)
    for (let i = 0; i < 20; i++) save = recordWordResult(save, 'w_milk', 'assisted', 100 + i)
    const stat = save.word_stats.w_milk!
    expect(stat.assisted).toBe(20)
    expect(stat.streak).toBe(0)
    expect(stat.ease).toBeGreaterThanOrEqual(MIN_EASE)
    expect(stat.ease).toBeLessThan(DEFAULT_EASE)
  })

  it('不可变：旧存档对象不被改写', () => {
    const before = emptySave()
    const after = recordWordResult(before, 'w_milk', 'wrong', 1)
    expect(before.word_stats).toEqual({})
    expect(after).not.toBe(before)
  })
})
