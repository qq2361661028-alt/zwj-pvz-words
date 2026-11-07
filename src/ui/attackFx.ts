import { nearestZombie } from '../rules/combat'
import type { Plant, Zombie } from '../rules/types'
import { colToPx, laneToPx, xToPx } from './layout'

export type ShotKind = 'pea' | 'spike' | 'seed'

type ShotStyle = {
  kind: ShotKind
  intervalMs: number
  flightMs: number
  impactMs: number
  /** 相对行中心的发射高度 */
  yOffset: number
}

/** 纯装饰：射速与伤害无关，只负责让持续 DPS 看起来像在开火 */
export const SHOT_STYLES: Record<string, ShotStyle> = {
  slinger: { kind: 'pea', intervalMs: 600, flightMs: 1920, impactMs: 180, yOffset: -16 },
  thorn: { kind: 'spike', intervalMs: 380, flightMs: 1520, impactMs: 150, yOffset: -8 },
  thistle: { kind: 'seed', intervalMs: 850, flightMs: 3200, impactMs: 220, yOffset: -22 }
}

export type FxShot = {
  id: number
  kind: ShotKind
  lane: number
  fromX: number
  toX: number
  y: number
  bornAt: number
  flightMs: number
  impactMs: number
}

export type FxState = {
  shots: FxShot[]
  /** 植物 uid → 下次可开火的毫秒时刻 */
  nextFireAt: Record<number, number>
  nextId: number
}

export function emptyFx(): FxState {
  return { shots: [], nextFireAt: {}, nextId: 1 }
}

export function stepFx(
  prev: FxState,
  plants: readonly Plant[],
  zombies: readonly Zombie[],
  nowMs: number
): FxState {
  const shots = prev.shots.filter((s) => nowMs - s.bornAt < s.flightMs + s.impactMs)
  const nextFireAt = { ...prev.nextFireAt }
  let nextId = prev.nextId

  for (const p of plants) {
    const style = SHOT_STYLES[p.plantId]
    if (!style) continue
    const target = nearestZombie(zombies, p.lane, p.col)
    if (!target) continue
    if (nowMs < (nextFireAt[p.uid] ?? 0)) continue
    nextFireAt[p.uid] = nowMs + style.intervalMs
    shots.push({
      id: nextId++,
      kind: style.kind,
      lane: p.lane,
      fromX: colToPx(p.col),
      toX: xToPx(target.x),
      y: laneToPx(p.lane) + style.yOffset,
      bornAt: nowMs,
      flightMs: style.flightMs,
      impactMs: style.impactMs
    })
  }

  return { shots, nextFireAt, nextId }
}
