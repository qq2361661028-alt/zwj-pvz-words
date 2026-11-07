import { RULES } from './constants'
import { mulberry32, seedHash } from './rng'
import { buildTiles } from './wordgen'
import type { Card, CardStatus, Ctx, DeckDef, Event, Tile } from './types'

export const TRANSITIONS: Record<CardStatus, CardStatus[]> = {
  locked: ['filling', 'dormant'],
  filling: ['armed', 'dormant'],
  armed: ['placed', 'locked', 'dormant'],
  placed: [],
  dormant: []
}

export function assertTransition(from: CardStatus, to: CardStatus, where: string): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new Error(`§4.5 非法状态转移 ${from} → ${to}（${where}）`)
  }
}

export function makeCard(deck: DeckDef, ctx: Ctx, instanceId: number): Card {
  const word = ctx.words[deck.wordId]
  if (!word) throw new Error(`makeCard: 词不存在 ${deck.wordId}`)
  if (!ctx.plants[deck.plantId]) throw new Error(`makeCard: 植物不存在 ${deck.plantId}`)
  const slots = word.word.split('')
  // §6.2 种子 = hash(wordId, deckId)，不含日期
  const rand = mulberry32(seedHash(deck.wordId, deck.id))
  return {
    instanceId,
    wordId: deck.wordId,
    plantId: deck.plantId,
    theme: deck.theme,
    slots,
    filled: 0,
    status: 'locked',
    assisted: false,
    tiles: buildTiles(word, rand, instanceId * 32, Object.values(ctx.words)),   // tileId 跨卡唯一：D7 才能按 id 拒绝非焦点卡
    wrongStreak: 0,
    wrongTotal: 0,
    ladderLevel: 0
  }
}

export function findTile(cards: readonly Card[], tileId: number): { cardIndex: number; tile: Tile } | undefined {
  for (let i = 0; i < cards.length; i++) {
    const tile = cards[i].tiles.find((t) => t.tileId === tileId)
    if (tile) return { cardIndex: i, tile }
  }
  return undefined
}

export function submit(cards: readonly Card[], tileId: number, now: number): { cards: Card[]; events: Event[] } {
  const hit = findTile(cards, tileId)
  const out = cards.map((c) => ({ ...c, tiles: c.tiles.map((t) => ({ ...t })) }))
  if (!hit) return { cards: out, events: [] }
  if (hit.cardIndex !== 0) return { cards: out, events: [] }   // D7：非焦点卡不可填

  const card = out[0]
  if (card.status !== 'filling') return { cards: out, events: [] }
  const tile = card.tiles.find((t) => t.tileId === tileId)
  if (!tile || tile.used) return { cards: out, events: [] }
  if (tile.disabledUntil > now) return { cards: out, events: [] } // §6.3 禁用期内不计入

  const events: Event[] = []
  const target = card.slots[card.filled]
  if (tile.letter === target) {
    tile.used = true
    card.filled += 1
    card.wrongStreak = 0
    events.push({ type: 'filled', slot: card.filled - 1 })
    if (card.filled === card.slots.length) {
      assertTransition(card.status, 'armed', card.wordId)
      card.status = 'armed'
      events.push({ type: 'armed', plantId: card.plantId })
    }
  } else {
    tile.disabledUntil = now + RULES.penalty_disable_ms / 1000   // O2
    card.wrongTotal += 1
    card.wrongStreak += 1
    events.push({ type: 'wrong', tileId })
    const ladder = card.wrongStreak >= RULES.hint_ladder_2
      ? 2
      : card.wrongStreak >= RULES.hint_ladder_1
        ? 1
        : 0
    if (ladder > card.ladderLevel) {
      card.ladderLevel = ladder
      if (ladder === 2) {
        card.assisted = true
        events.push({ type: 'hint_ladder', level: 2 })
      } else {
        events.push({ type: 'hint_ladder', level: 1 })
      }
    }
  }
  return { cards: out, events }
}

export type HandView = { cards: Card[]; deckCursor: number; seq: number }

export function createHand(deckIds: readonly string[], ctx: Ctx, seqStart = 0): HandView {
  let seq = seqStart
  const cards: Card[] = []
  for (let i = 0; i < RULES.hand_size && i < deckIds.length; i++) {
    const deck = ctx.decks[deckIds[i]]
    if (!deck) throw new Error(`createHand: 配对不存在 ${deckIds[i]}`)
    cards.push(makeCard(deck, ctx, seq++))
  }
  if (cards.length && cards[0].status === 'locked') {
    assertTransition('locked', 'filling', '首张焦点卡')
    cards[0] = { ...cards[0], status: 'filling' }
  }
  return { cards, deckCursor: cards.length, seq }
}

export function focusCard(cards: readonly Card[]): Card | undefined {
  return cards.length ? cards[0] : undefined
}

/** §6.4 level 2：高亮当前待填字母的所有未用块 */
export function hintedTileIds(card: Card): number[] {
  if (card.status !== 'filling' || card.ladderLevel < 2) return []
  const target = card.slots[card.filled]
  return card.tiles
    .filter((tile) => !tile.used && tile.letter === target)
    .map((tile) => tile.tileId)
}

export function advanceHand(
  view: HandView,
  deckIds: readonly string[],
  ctx: Ctx
): { view: HandView; events: Event[] } {
  const cards = view.cards.slice(1)          // 已种植的焦点卡离开手牌（§4.5）
  let { deckCursor, seq } = view
  const events: Event[] = []
  if (deckCursor < deckIds.length) {
    const deck = ctx.decks[deckIds[deckCursor]]
    if (!deck) throw new Error(`advanceHand: 配对不存在 ${deckIds[deckCursor]}`)
    cards.push(makeCard(deck, ctx, seq))
    deckCursor += 1
    seq += 1
  }
  if (cards.length && cards[0].status === 'locked') {
    assertTransition('locked', 'filling', '手牌补位后新焦点卡')
    cards[0] = { ...cards[0], status: 'filling' }
    events.push({ type: 'focus_advanced' })
  }
  return { view: { cards, deckCursor, seq }, events }
}
