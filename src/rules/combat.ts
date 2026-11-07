import { BOARD, SPEECH_BUFF } from './constants'
import { isVoiceBuffed } from './voice'
import type { Event, Plant, PlantDef, Zombie, ZombieDef } from './types'

export type AdvanceResult = {
  zombies: Zombie[]
  plants: Plant[]
  events: Event[]
  breached: boolean
}

/** 同 lane、且植物落在僵尸嘴部窗口内（一维，无像素碰撞） */
export function preyAt(_zombies: readonly Zombie[], plants: readonly Plant[], z: Zombie): Plant | undefined {
  return plants.find(
    (p) => p.lane === z.lane && p.col >= z.x - BOARD.eat_back && p.col <= z.x + BOARD.eat_front
  )
}

export function nearestZombie(zombies: readonly Zombie[], lane: number, fromCol: number): Zombie | undefined {
  return zombies
    .filter((z) => z.lane === lane && z.x > fromCol)
    .sort((a, b) => a.x - b.x)[0]
}

export function advanceZombies(
  zombies: readonly Zombie[],
  plants: readonly Plant[],
  zdefs: Record<string, ZombieDef>,
  dt: number,
  slow: number
): AdvanceResult {
  const hp: Record<number, number> = {}
  plants.forEach((p) => { hp[p.uid] = p.hp })
  const events: Event[] = []
  let breached = false

  const nextZombies = zombies.map((z) => {
    const def = zdefs[z.zombieId]
    if (!def) throw new Error(`advanceZombies: 僵尸数值不存在 ${z.zombieId}`)
    const nz = { ...z }
    const prey = preyAt(zombies, plants, z)
    if (prey) {
      hp[prey.uid] -= def.dps * dt        // 啃食：不前进（D17 的 slow 只作用于位移）
    } else {
      nz.x -= def.speed * dt * slow
    }
    if (nz.x < BOARD.house_x) breached = true
    return nz
  })

  const alive: Plant[] = []
  plants.forEach((p) => {
    if (hp[p.uid] <= 0) events.push({ type: 'plant_died', plantId: p.plantId, lane: p.lane, col: p.col })
    else alive.push({ ...p, hp: hp[p.uid] })
  })
  return { zombies: nextZombies, plants: alive, events, breached }
}

export function fireShooters(
  plants: readonly Plant[],
  zombies: readonly Zombie[],
  pdefs: Record<string, PlantDef>,
  dt: number,
  now = 0
): { zombies: Zombie[]; events: Event[] } {
  const hp: Record<number, number> = {}
  zombies.forEach((z) => { hp[z.uid] = z.hp })
  for (const p of plants) {
    const def = pdefs[p.plantId]
    if (def.slot !== 'shooter') continue
    const target = nearestZombie(zombies, p.lane, p.col)
    if (target) {
      const multiplier = isVoiceBuffed(p, now) ? SPEECH_BUFF.dps_multiplier : 1
      hp[target.uid] -= def.dps * dt * multiplier   // 持续伤害率，非单次（§4.2）
    }
  }
  const events: Event[] = []
  const alive = zombies
    .filter((z) => {
      if (hp[z.uid] > 0) return true
      events.push({ type: 'zombie_died' })
      return false
    })
    .map((z) => ({ ...z, hp: hp[z.uid] }))
  return { zombies: alive, events }
}
