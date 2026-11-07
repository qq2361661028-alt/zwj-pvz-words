import { SPEECH_BUFF } from './constants'
import type { GameState, Plant } from './types'

/** 读音通过：只标记，不直接改植物（植物还没种下） */
export function grantVoicePass(state: GameState, instanceId: number): GameState {
  const card = state.cards.find((c) => c.instanceId === instanceId)
  if (!card || card.voiceBuffed || card.status === 'placed' || card.status === 'dormant') return state
  return {
    ...state,
    cards: state.cards.map((c) => (c.instanceId === instanceId ? { ...c, voiceBuffed: true } : c))
  }
}

/** §8.4 全局至多 1 个：新加成开始时让旧的立即到期 */
export function expireVoiceBuffs(plants: readonly Plant[], now: number): Plant[] {
  return plants.map((p) =>
    p.buffUntil !== undefined && p.buffUntil > now ? { ...p, buffUntil: now } : p
  )
}

export function isVoiceBuffed(plant: Plant, now: number): boolean {
  return plant.buffUntil !== undefined && plant.buffUntil > now
}

export function voiceBuffFields(now: number): Pick<Plant, 'buffUntil' | 'voiceReadyAt'> {
  return {
    buffUntil: now + SPEECH_BUFF.duration_s,
    voiceReadyAt: now + SPEECH_BUFF.cooldown_s
  }
}
