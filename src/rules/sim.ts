import { RULES, SUN } from './constants'
import { advanceZombies, fireShooters } from './combat'
import { spawnDue } from './waves'
import { sunEvents, tickProducers } from './economy'
import { createHand } from './cards'
import type { Ctx, Event, GameState, StepResult, Zombie } from './types'

export function newGame(levelId: string, ctx: Ctx): GameState {
  const level = ctx.levels[levelId]
  if (!level) throw new Error(`newGame: 关卡不存在 ${levelId}`)
  const hand = createHand(level.deckIds, ctx)
  return {
    levelId,
    t: 0,
    sun: SUN.start,
    cards: hand.cards,
    deckCursor: hand.deckCursor,
    seq: hand.seq,
    plants: [],
    zombies: [],
    spawned: 0,
    panelOpen: false,
    outcome: null
  }
}

function fillStats(zombies: readonly Zombie[], ctx: Ctx): Zombie[] {
  return zombies.map((z) => {
    const def = ctx.zombies[z.zombieId]
    if (!def) throw new Error(`sim: 僵尸数值不存在 ${z.zombieId}（G1：zombies.json 缺条目）`)
    return { ...z, hp: def.hp, maxhp: def.hp }
  })
}
/** 单帧顺序：出怪 → 推进/啃食 → 开火 → 产光 → 结算。调序会改变可达性（T12 因此变红） */
export function tick(state: GameState, dt: number, ctx: Ctx): StepResult {
  if (state.outcome) return { state, events: [] }
  const level = ctx.levels[state.levelId]
  if (!level) throw new Error(`tick: 关卡不存在 ${state.levelId}`)
  const t = state.t + dt
  const events: Event[] = []

  const sp = spawnDue(level.waves, state.spawned, t, state.seq)
  const zombies = [...state.zombies, ...fillStats(sp.zombies, ctx)]   // 只初始化新怪，已有 HP 不能被重置
  events.push(...sp.events)

  const slow = state.panelOpen ? RULES.panel_slowdown : 1   // D17：不暂停，只减速
  const adv = advanceZombies(zombies, state.plants, ctx.zombies, dt, slow)
  events.push(...adv.events)

  const shot = fireShooters(adv.plants, adv.zombies, ctx.plants, dt, t)
  events.push(...shot.events)

  const eco = tickProducers(adv.plants, ctx.plants, t, state.sun)
  events.push(...sunEvents(eco.gained))

  let outcome: GameState['outcome'] = state.outcome
  if (adv.breached) outcome = 'death'
  else if (sp.spawned >= level.waves.length && shot.zombies.length === 0) outcome = 'cleared'
  if (outcome && !state.outcome) events.push({ type: 'outcome', kind: outcome })

  return {
    state: {
      ...state,
      t,
      sun: eco.sun,
      zombies: shot.zombies,
      plants: eco.plants,
      spawned: sp.spawned,
      seq: sp.uid,
      outcome
    },
    events
  }
}

// D18：逻辑与帧率解耦；MAX_STEPS 兜住「切回标签页一次性补 30 分钟」
const MAX_STEPS = 240

export function createAccumulator(step_s: number = RULES.tick_s) {
  let acc = 0
  let steps = 0
  return {
    push(elapsed: number, cb: (dt: number) => void): number {
      acc += Math.max(0, Math.min(elapsed, MAX_STEPS * step_s))
      steps = 0
      while (acc >= step_s) {
        acc -= step_s
        cb(step_s)
        steps++
      }
      return steps
    },
    alpha(): number { return acc / step_s },
    steps(): number { return steps }
  }
}

export function runUntil(
  state: GameState,
  ctx: Ctx,
  until: (s: GameState) => boolean,
  maxT = 600
): StepResult {
  const all: Event[] = []
  let cur = state
  while (!cur.outcome && !until(cur) && cur.t < maxT) {
    const r = tick(cur, RULES.tick_s, ctx)
    cur = r.state
    all.push(...r.events)
  }
  return { state: cur, events: all }
}
