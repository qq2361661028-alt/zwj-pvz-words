import type { SaveData } from './stats'
import type { WordDef } from './types'

export type ReviewRow = {
  wordId: string
  word: string
  zh: string
  correct: number
  wrong: number
  assisted: number
  streak: number
  lastSeen: number
}

export function reviewRows(save: SaveData, words: readonly WordDef[]): ReviewRow[] {
  const byId = new Map(words.map((word) => [word.id, word]))
  const rows: ReviewRow[] = []

  for (const [wordId, stat] of Object.entries(save.word_stats)) {
    const word = byId.get(wordId)
    if (!word) continue
    if (stat.correct + stat.wrong + stat.assisted === 0 && stat.last_seen_ts === 0) continue
    rows.push({
      wordId,
      word: word.word,
      zh: word.zh,
      correct: stat.correct,
      wrong: stat.wrong,
      assisted: stat.assisted,
      streak: stat.streak,
      lastSeen: stat.last_seen_ts
    })
  }

  return rows.sort(
    (a, b) => b.lastSeen - a.lastSeen || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0)
  )
}
