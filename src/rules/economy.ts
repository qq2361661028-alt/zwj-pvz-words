import { SUN } from './constants'
import type { Event, Plant, PlantDef } from './types'

export function canAfford(sun: number, cost: number): boolean {
  return sun >= cost
}

export function spend(sun: number, cost: number): number {
  if (!canAfford(sun, cost)) throw new Error(`D16：阳光不足 ${sun} < ${cost}`)
  return sun - cost
}

export function gainSun(sun: number, amount: number): { sun: number; gained: number } {
  const next = Math.min(SUN.cap, sun + amount)
  return { sun: next, gained: next - sun }
}

// D16：阳光只由「已激活的 producer」产出；填词本身永不入账。
export function tickProducers(
  plants: readonly Plant[],
  defs: Record<string, PlantDef>,
  t: number,
  sun: number
): { plants: Plant[]; sun: number; gained: number } {
  let total = 0
  const next = plants.map((p) => {
    const def = defs[p.plantId]
    if (def.slot !== 'producer') return p
    if (t < p.nextProduceAt) return p
    total += def.produce_amount ?? SUN.produce_amount
    return { ...p, nextProduceAt: p.nextProduceAt + SUN.produce_interval_s }
  })
  const g = gainSun(sun, total)
  return { plants: next, sun: g.sun, gained: g.gained }
}

export function sunEvents(gained: number): Event[] {
  return gained > 0 ? [{ type: 'sun_gained', amount: gained }] : []
}
