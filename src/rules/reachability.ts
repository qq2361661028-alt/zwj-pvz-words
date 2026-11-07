import { SUN } from './constants'
import type { Ctx, PlantDef } from './types'

/**
 * G4：起始阳光买不起首卡 + 阳光唯一来源是已种下的 producer ⇒ 开局无阳光来源。
 * 返回空数组表示可达。
 */
export function startReachable(deckIds: readonly string[], ctx: Ctx): string[] {
  const issues: string[] = []
  if (!deckIds.length) return ['词序为空']

  const of = (id: string): PlantDef => {
    const deck = ctx.decks[id]
    if (!deck) throw new Error(`startReachable: 配对不存在 ${id}`)
    const plant = ctx.plants[deck.plantId]
    if (!plant) throw new Error(`startReachable: 植物不存在 ${deck.plantId}`)
    return plant
  }

  const first = of(deckIds[0])
  if (first.cost > SUN.start) {
    issues.push(`起步死锁：首卡 ${deckIds[0]} → ${first.id} 需 ${first.cost} > 起始阳光 ${SUN.start}`)
  }

  const head = deckIds.slice(0, 2).map(of)
  if (!head.some((p) => p.slot === 'producer')) {
    issues.push(`起步死锁：前两张卡没有 producer，阳光无从产出`)
  }
  return issues
}
