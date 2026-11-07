import { RULES } from './constants'
import { pickWeighted, shuffle } from './rng'
import type { Tile, WordDef } from './types'

/** 易混字母表：视觉混淆 + 听觉混淆（th/sh 落到首字母 t/s） */
export const CONFUSION_GROUPS: readonly (readonly string[])[] = [
  ['b', 'd'], ['p', 'q'], ['n', 'm'], ['u', 'v'], ['i', 'l'],
  ['f', 'v'], ['s', 'z'], ['c', 'k'], ['g', 'j'], ['t', 's']
]

export function confusionPartners(letter: string): string[] {
  const out: string[] = []
  for (const group of CONFUSION_GROUPS) {
    if (!(group as readonly string[]).includes(letter)) continue
    for (const ch of group) {
      if (ch !== letter && !out.includes(ch)) out.push(ch)
    }
  }
  return out
}

/** 英语字母频率序（ETAOIN…），权重 1/(i+1)^2：越常见越容易当干扰项 */
export const ENG_FREQ = 'etaoinshrdlcumwfgypbvkjxqz'.split('')

export function distractorCount(len: number): number {
  const raw = Math.round(len * RULES.distractor_ratio)
  return Math.max(RULES.distractor_min, Math.min(RULES.distractor_max, raw))
}

/**
 * §6.2 四级优先级：override → 易混伙伴 → 同 grade/unit 频率 → 英语频率兜底。
 * override 允许与目标词字母重复；自动层排除目标词字母，避免生成无效干扰项。
 */
export function chooseDistractors(
  word: WordDef,
  rand: () => number,
  vocabulary: readonly WordDef[] = []
): string[] {
  const n = distractorCount(word.word.length)
  const out: string[] = []
  const seen = new Set<string>()
  const answer = new Set(word.word.split(''))

  const add = (ch: string, allowAnswer = false): void => {
    if (out.length >= n) return
    if (!/^[a-z]$/.test(ch) || seen.has(ch)) return
    if (!allowAnswer && answer.has(ch)) return
    seen.add(ch)
    out.push(ch)
  }

  for (const ch of word.distractor_overrides ?? []) add(ch, true)

  for (const ch of new Set(word.word)) {
    for (const partner of confusionPartners(ch)) add(partner)
  }

  const peers = vocabulary.filter(
    (w) => w.id !== word.id && w.grade === word.grade && w.unit === word.unit
  )
  const freq: Record<string, number> = {}
  for (const peer of peers) {
    for (const ch of peer.word) {
      if (answer.has(ch)) continue
      freq[ch] = (freq[ch] ?? 0) + 1
    }
  }
  const byFreq = Object.entries(freq)
    .filter(([ch]) => !seen.has(ch))
    .map(([v, w]) => ({ v, w }))
  while (out.length < n && byFreq.length) {
    const ch = pickWeighted(byFreq, rand)
    byFreq.splice(byFreq.findIndex((it) => it.v === ch), 1)
    add(ch)
  }

  const fallback = ENG_FREQ
    .filter((ch) => !seen.has(ch) && !answer.has(ch))
    .map((v, i) => ({ v, w: 1 / (i + 1) / (i + 1) }))
  while (out.length < n && fallback.length) {
    const ch = pickWeighted(fallback, rand)
    fallback.splice(fallback.findIndex((it) => it.v === ch), 1)
    add(ch)
  }

  return out
}

export function buildTiles(
  word: WordDef,
  rand: () => number,
  idBase = 0,
  vocabulary: readonly WordDef[] = []
): Tile[] {
  const letters = shuffle([...word.word.split(''), ...chooseDistractors(word, rand, vocabulary)], rand)
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
