import { RULES } from './constants'

export const SAVE_VERSION = 2
export const SAVE_KEY = 'pvzwords.save.v1'
export const DEFAULT_EASE = 2.5
export const MIN_EASE = 1.3

export type WordStat = {
  correct: number
  wrong: number
  assisted: number
  streak: number
  ease: number
  last_seen_ts: number
}

export type LevelStat = { best_stars: number }

export type SaveData = {
  v: typeof SAVE_VERSION
  last_played: string
  word_stats: Record<string, WordStat>
  levels: Record<string, LevelStat>
  settings: {
    speech_enabled: boolean
    sound_enabled: boolean
    music_enabled: boolean
    penalty_disable_ms: number
  }
}

const emptyStat = (): WordStat => ({
  correct: 0,
  wrong: 0,
  assisted: 0,
  streak: 0,
  ease: DEFAULT_EASE,
  last_seen_ts: 0
})

export function emptySave(lastPlayed = ''): SaveData {
  return {
    v: SAVE_VERSION,
    last_played: lastPlayed,
    word_stats: {},
    levels: {},
    settings: {
      speech_enabled: true,
      sound_enabled: true,
      music_enabled: true,
      penalty_disable_ms: RULES.penalty_disable_ms
    }
  }
}

export function recordWordResult(
  save: SaveData,
  wordId: string,
  kind: 'correct' | 'wrong' | 'assisted',
  nowSec: number
): SaveData {
  const stat = save.word_stats[wordId] ?? emptyStat()
  let next: WordStat
  if (kind === 'correct') {
    next = { ...stat, correct: stat.correct + 1, streak: stat.streak + 1, last_seen_ts: nowSec }
  } else if (kind === 'wrong') {
    next = { ...stat, wrong: stat.wrong + 1, streak: 0, last_seen_ts: nowSec }
  } else {
    next = {
      ...stat,
      assisted: stat.assisted + 1,
      streak: 0,
      ease: Math.max(MIN_EASE, Math.round(stat.ease * 0.9 * 100) / 100),
      last_seen_ts: nowSec
    }
  }
  return { ...save, word_stats: { ...save.word_stats, [wordId]: next } }
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const nonNegInt = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0

const MAX_LAST_SEEN_TS = 4_102_444_800
const PENALTY_OPTIONS = [0, 1000, 2000] as const

const lastSeenTs = (v: unknown): number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= MAX_LAST_SEEN_TS ? v : 0

/** 只认识 v1/v2；损坏或未来版本回退空存档，绝不把异常向上抛 */
export function migrateSave(raw: unknown): SaveData {
  if (!isObject(raw)) return emptySave()
  if (raw.v !== 1 && raw.v !== SAVE_VERSION) return emptySave()
  const base = emptySave(typeof raw.last_played === 'string' ? raw.last_played : '')

  if (isObject(raw.word_stats)) {
    for (const [id, value] of Object.entries(raw.word_stats)) {
      if (!isObject(value)) continue
      base.word_stats[id] = {
        correct: nonNegInt(value.correct),
        wrong: nonNegInt(value.wrong),
        assisted: nonNegInt(value.assisted),
        streak: nonNegInt(value.streak),
        ease:
          typeof value.ease === 'number' && Number.isFinite(value.ease) && value.ease >= MIN_EASE
            ? value.ease
            : DEFAULT_EASE,
        last_seen_ts: lastSeenTs(value.last_seen_ts)
      }
    }
  }

  if (isObject(raw.levels)) {
    for (const [id, value] of Object.entries(raw.levels)) {
      if (!isObject(value)) continue
      base.levels[id] = { best_stars: nonNegInt(value.best_stars) }
    }
  }

  if (isObject(raw.settings)) {
    base.settings = {
      speech_enabled:
        typeof raw.settings.speech_enabled === 'boolean' ? raw.settings.speech_enabled : true,
      sound_enabled:
        typeof raw.settings.sound_enabled === 'boolean' ? raw.settings.sound_enabled : true,
      music_enabled:
        typeof raw.settings.music_enabled === 'boolean' ? raw.settings.music_enabled : true,
      penalty_disable_ms: PENALTY_OPTIONS.includes(
        raw.settings.penalty_disable_ms as 0 | 1000 | 2000
      )
        ? (raw.settings.penalty_disable_ms as number)
        : RULES.penalty_disable_ms
    }
  }

  return base
}
