import { describe, expect, it } from 'vitest'
import { CTX as ctx, M0_LEVEL_ID } from '../../src/content/index'
import { focusCard } from '../../src/rules/cards'
import { SPEECH_BUFF } from '../../src/rules/constants'
import { onCellClick, onTileClick } from '../../src/rules/play'
import { newGame } from '../../src/rules/sim'
import { expireVoiceBuffs, grantVoicePass, isVoiceBuffed, voiceBuffFields } from '../../src/rules/voice'
import type { GameState } from '../../src/rules/types'

function armFocus(state: GameState): GameState {
  let s = state
  for (;;) {
    const card = focusCard(s.cards)
    if (!card || card.status !== 'filling') return s
    const need = card.slots[card.filled]
    const tile = card.tiles.find((t) => !t.used && t.letter === need)!
    s = onTileClick(s, tile.tileId, ctx).state
  }
}

const withSun = (s: GameState): GameState => ({ ...s, sun: 9990 })

describe('卡片通过标记', () => {
  it('grantVoicePass 只标记目标卡，且不可重复标记', () => {
    const s0 = newGame(M0_LEVEL_ID, ctx)
    const id = focusCard(s0.cards)!.instanceId
    const s1 = grantVoicePass(s0, id)
    expect(focusCard(s1.cards)!.voiceBuffed).toBe(true)
    expect(grantVoicePass(s1, id)).toBe(s1)
    expect(grantVoicePass(s0, 9999)).toBe(s0)
  })
})

describe('§8.4 种植时挂 buff', () => {
  it('通过过的卡种下后携带 10s buff 与 30s 冷却，并发 voice_buff', () => {
    const s0 = withSun(armFocus(newGame(M0_LEVEL_ID, ctx)))
    const id = focusCard(s0.cards)!.instanceId
    const s1 = grantVoicePass(s0, id)
    const r = onCellClick(s1, 2, 3, ctx)
    const plant = r.state.plants[0]
    expect(plant.buffUntil).toBe(SPEECH_BUFF.duration_s)
    expect(plant.voiceReadyAt).toBe(SPEECH_BUFF.cooldown_s)
    expect(isVoiceBuffed(plant, 0)).toBe(true)
    expect(isVoiceBuffed(plant, SPEECH_BUFF.duration_s)).toBe(false)
    expect(r.events).toContainEqual({ type: 'voice_buff', plantId: 'sprout', lane: 2, col: 3 })
  })

  it('未通过的卡种下不带 buff', () => {
    const r = onCellClick(withSun(armFocus(newGame(M0_LEVEL_ID, ctx))), 0, 0, ctx)
    expect(r.state.plants[0].buffUntil).toBeUndefined()
    expect(r.events.some((e) => e.type === 'voice_buff')).toBe(false)
  })

  it('全局同时最多 1 个 buff：新加成让旧加成立即到期', () => {
    let s = withSun(armFocus(newGame(M0_LEVEL_ID, ctx)))
    s = onCellClick(grantVoicePass(s, focusCard(s.cards)!.instanceId), 0, 0, ctx).state
    s = { ...withSun(armFocus({ ...s, t: 5 })), t: 5 }
    s = onCellClick(grantVoicePass(s, focusCard(s.cards)!.instanceId), 1, 0, ctx).state
    expect(s.plants[0].buffUntil).toBe(5)
    expect(isVoiceBuffed(s.plants[0], 5)).toBe(false)
    expect(s.plants[1].buffUntil).toBe(15)
  })

  it('种下未通过语音的植物不会打断现有 buff', () => {
    let s = withSun(armFocus(newGame(M0_LEVEL_ID, ctx)))
    s = onCellClick(grantVoicePass(s, focusCard(s.cards)!.instanceId), 0, 0, ctx).state
    const firstUntil = s.plants[0].buffUntil
    s = { ...withSun(armFocus({ ...s, t: 5 })), t: 5 }
    s = onCellClick(s, 1, 0, ctx).state
    expect(s.plants[0].buffUntil).toBe(firstUntil)
  })

  it('expireVoiceBuffs 只改未到期的 buff，其余保持引用', () => {
    const fields = voiceBuffFields(0)
    const plants = [
      { uid: 1, plantId: 'slinger', lane: 0, col: 0, hp: 1, maxhp: 1, nextProduceAt: 0, ...fields },
      { uid: 2, plantId: 'slinger', lane: 1, col: 0, hp: 1, maxhp: 1, nextProduceAt: 0 }
    ]
    const out = expireVoiceBuffs(plants, 3)
    expect(out[0].buffUntil).toBe(3)
    expect(out[1]).toBe(plants[1])
  })
})
