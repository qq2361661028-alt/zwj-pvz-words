import { describe, expect, it } from 'vitest'
import { emptySave, recordWordResult } from '../../src/rules/stats'
import { reviewRows } from '../../src/rules/review'
import type { WordDef } from '../../src/rules/types'

const words: WordDef[] = [
  { id: 'w_apple', word: 'apple', zh: '苹果', ipa: '/x/', grade: 4, unit: 'U', letters: 5 },
  { id: 'w_banana', word: 'banana', zh: '香蕉', ipa: '/x/', grade: 4, unit: 'U', letters: 6 },
  { id: 'w_quiet', word: 'quiet', zh: '安静', ipa: '/x/', grade: 4, unit: 'U', letters: 5 }
]

describe('复习表派生', () => {
  it('只保留有学习记录的词，并按最近时间降序', () => {
    let save = emptySave()
    save = recordWordResult(save, 'w_apple', 'correct', 1_700_000_100)
    save = recordWordResult(save, 'w_banana', 'wrong', 1_700_000_200)
    save.word_stats.w_ghost = {
      correct: 9,
      wrong: 0,
      assisted: 0,
      streak: 9,
      ease: 2.5,
      last_seen_ts: 1_700_000_300
    }
    expect(reviewRows(save, words).map((r) => r.word)).toEqual(['banana', 'apple'])
  })

  it('计数完整带出，未学过的词不出现', () => {
    let save = emptySave()
    save = recordWordResult(save, 'w_quiet', 'assisted', 1_700_000_400)
    const rows = reviewRows(save, words)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      wordId: 'w_quiet',
      word: 'quiet',
      zh: '安静',
      correct: 0,
      wrong: 0,
      assisted: 1,
      streak: 0,
      lastSeen: 1_700_000_400
    })
  })

  it('最近时间相同时按单词升序排列', () => {
    let save = emptySave()
    save = recordWordResult(save, 'w_quiet', 'correct', 1_700_000_500)
    save = recordWordResult(save, 'w_apple', 'correct', 1_700_000_500)
    save = recordWordResult(save, 'w_banana', 'correct', 1_700_000_500)
    expect(reviewRows(save, words).map((r) => r.word)).toEqual(['apple', 'banana', 'quiet'])
  })

  it('零计数但有 last_seen_ts 的行仍会保留（现行行为）', () => {
    const save = emptySave()
    save.word_stats.w_banana = {
      correct: 0,
      wrong: 0,
      assisted: 0,
      streak: 0,
      ease: 2.5,
      last_seen_ts: 1_700_000_600
    }
    const rows = reviewRows(save, words)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ word: 'banana', correct: 0, lastSeen: 1_700_000_600 })
  })
})
