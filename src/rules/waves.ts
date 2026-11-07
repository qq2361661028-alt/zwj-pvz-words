import { BOARD } from './constants'
import type { Event, WaveDef, Zombie } from './types'

/** 出怪点固定，不加随机抖动（§6.2 可重放） */
export function spawnDue(
  waves: readonly WaveDef[],
  spawned: number,
  t: number,
  uidStart: number
): { zombies: Zombie[]; spawned: number; uid: number; events: Event[] } {
  const zombies: Zombie[] = []
  const events: Event[] = []
  let uid = uidStart
  let count = spawned
  while (count < waves.length && t >= waves[count].t) {
    const w = waves[count]
    for (const lane of w.lanes) {
      zombies.push({ uid: uid++, zombieId: w.zombie, lane, x: BOARD.spawn_x, hp: 0, maxhp: 0, flag: !!w.flag })
      events.push({ type: 'zombie_spawned', zombieId: w.zombie, lane })
    }
    count += 1
  }
  return { zombies, spawned: count, uid, events }
}
