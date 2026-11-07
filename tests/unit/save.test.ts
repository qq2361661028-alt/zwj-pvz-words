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
