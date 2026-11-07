import { RULES } from './constants'
import { pickWeighted, shuffle } from './rng'
import type { Tile, WordDef } from './types'

/** 英语字母频率序（ETAOIN…），权重 1/(i+1)^2：越常见越容易当干扰项 */
export const ENG_FREQ = 'etaoinshrdlcumwfgypbvkjxqz'.split('')

export function distractorCount(len: number): number {
  const raw = Math.round(len * RULES.distractor_ratio)
  return Math.max(RULES.distractor_min, Math.min(RULES.distractor_max, raw))
}

export function chooseDistractors(word: WordDef, rand: () => number): string[] {
  const n = distractorCount(word.word.length)
  const out: string[] = []
  const seen = new Set<string>()

  for (const letter of word.distractor_overrides ?? []) {
    if (!/^[a-z]$/.test(letter) || seen.has(letter) || out.length >= n) continue
    seen.add(letter)
    out.push(letter)
  }

  const pool = ENG_FREQ.map((v, i) => ({ v, w: 1 / (i + 1) / (i + 1) })).filter((it) => !seen.has(it.v))
  while (out.length < n && pool.length) {
    // 不放回抽样：抽中就移出池子
    const letter = pickWeighted(pool, rand)
    pool.splice(pool.findIndex((it) => it.v === letter), 1)
    if (seen.has(letter)) continue
    seen.add(letter)
    out.push(letter)
  }
  return out
}

export function buildTiles(word: WordDef, rand: () => number, idBase = 0): Tile[] {
  const letters = shuffle([...word.word.split(''), ...chooseDistractors(word, rand)], rand)
  return letters.map((letter, i) => ({ tileId: idBase + i, letter, used: false, disabledUntil: 0 }))
}

/** D9 多重集合自检：牌面必须能拼出目标词 */
export function multisetSelfCheck(tiles: readonly Tile[], word: string): boolean {
  const avail: Record<string, number> = {}
  tiles.forEach((t) => { avail[t.letter] = (avail[t.letter] ?? 0) + 1 })
  for (const ch of word) {
    if (!avail[ch]) return false
    avail[ch] -= 1
  }
  return true
}
