import type { BgmName } from '../platform/music'
import type { Outcome } from '../rules/types'

export function levelsTrack(settingsOpen: boolean, codexOpen: boolean): BgmName {
  if (codexOpen) return 'codex'
  if (settingsOpen) return 'settings'
  return 'levels'
}

export function gameTrack(outcome: Outcome | null): BgmName {
  if (outcome === 'cleared') return 'win'
  if (outcome === 'death') return 'lose'
  if (outcome === 'abandoned') return 'levels'
  return 'game'
}
