import { BOARD, SUN } from './constants'
import { advanceHand, assertTransition, focusCard, submit } from './cards'
import { canAfford, spend } from './economy'
import { expireVoiceBuffs, voiceBuffFields } from './voice'
import type { Ctx, Event, GameState, StepResult } from './types'

export type PlantReject = 'not_armed' | 'occupied' | 'no_sun' | 'out_of_board' | null

export function setPanelOpen(state: GameState, open: boolean): GameState {
  return { ...state, panelOpen: open }
}

export function plantingReject(state: GameState, lane: number, col: number, ctx: Ctx): PlantReject {
  if (state.outcome) return 'not_armed'
  const card = focusCard(state.cards)
  if (!card || card.status !== 'armed') return 'not_armed'
  if (lane < 0 || lane >= BOARD.lanes || col < 0 || col >= BOARD.cols) return 'out_of_board'
  if (state.plants.some((p) => p.lane === lane && p.col === col)) return 'occupied'
  if (!canAfford(state.sun, ctx.plants[card.plantId].cost)) return 'no_sun'   // D16
  return null
}

export function onTileClick(state: GameState, tileId: number, _ctx: Ctx): StepResult {
  if (state.outcome) return { state, events: [] }
  const r = submit(state.cards, tileId, state.t)
  if (!r.events.length) return { state, events: [] }
  return { state: { ...state, cards: r.cards }, events: r.events }
}

export function onCellClick(state: GameState, lane: number, col: number, ctx: Ctx): StepResult {
  if (state.outcome) return { state, events: [] }
  if (plantingReject(state, lane, col, ctx)) return { state, events: [] }

  const focus = focusCard(state.cards)!
  const def = ctx.plants[focus.plantId]
  const events: Event[] = []
  const now = state.t
  const basePlants = focus.voiceBuffed ? expireVoiceBuffs(state.plants, now) : state.plants

  const card = { ...focus }
  assertTransition(card.status, 'placed', card.wordId)
  card.status = 'placed'
  const cards = [card, ...state.cards.slice(1)]

  const plants = [...basePlants, {
    uid: state.seq,
    plantId: card.plantId,
    lane,
    col,
    hp: def.hp,
    maxhp: def.hp,
    nextProduceAt: state.t + SUN.produce_interval_s,
    ...(card.voiceBuffed ? voiceBuffFields(now) : {})
  }]
  const hand = advanceHand(
    { cards, deckCursor: state.deckCursor, seq: state.seq + 1 },
    ctx.levels[state.levelId].deckIds,
    ctx
  )
  events.push({ type: 'placed', plantId: card.plantId, lane, col })
  if (card.voiceBuffed) {
    events.push({ type: 'voice_buff', plantId: card.plantId, lane, col })
  }
  events.push(...hand.events)

  const sun = spend(state.sun, def.cost)     // 阳光不返还（§6.3）
  const next: GameState = {
    ...state,
    sun,
    plants,
    cards: hand.view.cards,
    deckCursor: hand.view.deckCursor,
    seq: hand.view.seq,
    panelOpen: false
  }
  return { state: next, events }
}

export function onExit(state: GameState): StepResult {
  if (state.outcome) return { state, events: [] }
  return {
    state: { ...state, outcome: 'abandoned' },
    events: [{ type: 'outcome', kind: 'abandoned' }]   // D20：不进错词权重
  }
}
