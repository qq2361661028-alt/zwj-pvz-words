import { describe, expect, it } from 'vitest'
import { SAVE_KEY, emptySave, migrateSave, recordWordResult } from '../../src/rules/stats'
import { loadSave, persistSave, todayString } from '../../src/platform/save'

function memory() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    }
  }
}

describe('D19 存档 v1', () => {
  it('round-trip：写入后读回同一条统计', () => {
    const storage = memory()
    const save = recordWordResult(emptySave('2026-11-07'), 'w_milk', 'assisted', 42)
    persistSave(save, storage)
    expect(loadSave(storage)).toEqual(save)
  })

  it('损坏 JSON / 未知版本回退空存档', () => {
    const storage = memory()
    storage.setItem(SAVE_KEY, '{oops')
    expect(loadSave(storage)).toEqual(emptySave())
    storage.setItem(SAVE_KEY, JSON.stringify({ v: 99, word_stats: { x: 1 } }))
    expect(loadSave(storage)).toEqual(emptySave())
  })

  it('migrate 容忍缺字段并夹紧非法数字', () => {
    const save = migrateSave({
      v: 1,
      word_stats: {
        w_milk: { correct: -3, wrong: 'x', assisted: 2, streak: 1, ease: 'bad', last_seen_ts: 5 }
      },
      levels: { u3_w1: { best_stars: 3 } }
    })
    expect(save.word_stats.w_milk).toEqual({
      correct: 0,
      wrong: 0,
      assisted: 2,
      streak: 1,
      ease: 2.5,
      last_seen_ts: 5
    })
    expect(save.levels.u3_w1).toEqual({ best_stars: 3 })
  })

  it('v1 迁移到 v2：保留统计并补 sound_enabled', () => {
    const save = migrateSave({
      v: 1,
      last_played: '2026-11-01',
      word_stats: {
        w_milk: { correct: 2, wrong: 1, assisted: 0, streak: 1, ease: 2.5, last_seen_ts: 42 }
      },
      levels: { u3_w1: { best_stars: 3 } },
      settings: { speech_enabled: false, penalty_disable_ms: 0 }
    })
    expect(save.v).toBe(2)
    expect(save.settings).toEqual({
      speech_enabled: false,
      sound_enabled: true,
      music_enabled: true,
      penalty_disable_ms: 0
    })
    expect(save.word_stats.w_milk.correct).toBe(2)
    expect(save.levels.u3_w1).toEqual({ best_stars: 3 })
  })

  it('v2 保留 sound_enabled=false，非法值回落 true', () => {
    const off = migrateSave({
      v: 2,
      settings: { speech_enabled: true, sound_enabled: false, music_enabled: false, penalty_disable_ms: 2000 }
    })
    expect(off.settings.sound_enabled).toBe(false)
    expect(off.settings.music_enabled).toBe(false)
    const bad = migrateSave({
      v: 2,
      settings: { speech_enabled: true, sound_enabled: 'no', music_enabled: 'no', penalty_disable_ms: 2000 }
    })
    expect(bad.settings.sound_enabled).toBe(true)
    expect(bad.settings.music_enabled).toBe(true)
  })

  it('penalty_disable_ms 只接受 0 / 1000 / 2000，越界回落 2000', () => {
    const at = (value: unknown) =>
      migrateSave({ v: 2, settings: { penalty_disable_ms: value } }).settings.penalty_disable_ms
    expect(at(500)).toBe(2000)
    expect(at(1000)).toBe(1000)
    expect(at(0)).toBe(0)
    expect(at(Number.POSITIVE_INFINITY)).toBe(2000)
  })

  it('last_seen_ts 超出 2100 年上限回落 0，合法值保留', () => {
    const at = (value: unknown) =>
      migrateSave({ v: 2, word_stats: { w_milk: { last_seen_ts: value } } }).word_stats.w_milk
        .last_seen_ts
    expect(at(9_999_999_999)).toBe(0)
    expect(at(4_102_444_800)).toBe(4_102_444_800)
    expect(at(1_700_000_000)).toBe(1_700_000_000)
  })

  it('localStorage 抛错时不影响游戏', () => {
    const storage = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('quota')
      }
    }
    expect(loadSave(storage)).toEqual(emptySave())
    expect(() => persistSave(emptySave(), storage)).not.toThrow()
  })

  it('todayString 用本地日期', () => {
    expect(todayString(new Date(2026, 10, 7))).toBe('2026-11-07')
  })
})
