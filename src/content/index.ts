import plantsJson from './plants.json'
import wordsJson from './words.json'
import decksJson from './decks.json'
import zombiesJson from './zombies.json'
import levelsJson from './levels.json'
import type { Ctx, DeckDef, LevelDef, PlantDef, WordDef, ZombieDef } from '../rules/types'

export const RAW = {
  plants: plantsJson as unknown as PlantDef[],
  words: wordsJson as unknown as WordDef[],
  decks: decksJson as unknown as DeckDef[],
  zombies: zombiesJson as unknown as ZombieDef[],
  levels: levelsJson as unknown as LevelDef[]
}

export type RawContent = typeof RAW

function index<T extends { id: string }>(list: readonly T[]): Record<string, T> {
  const out: Record<string, T> = {}
  list.forEach((item) => { out[item.id] = item })
  return out
}

export const CTX: Ctx = {
  plants: index(RAW.plants),
  words: index(RAW.words),
  decks: index(RAW.decks),
  zombies: index(RAW.zombies),
  levels: index(RAW.levels)
}

export const M0_LEVEL_ID = 'u3_w1'
