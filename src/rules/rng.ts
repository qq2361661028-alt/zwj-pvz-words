/** FNV-1a 32 位散列：把 (wordId, deckId, …) 映射成稳定种子 */
export function seedHash(...keys: readonly string[]): number {
  let h = 0x811c9dc5
  const s = keys.join('|')
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/** mulberry32：确定性随机流，跨平台一致 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(arr: readonly T[], rand: () => number): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

export function pick<T>(arr: readonly T[], rand: () => number): T {
  if (!arr.length) throw new Error('pick: 空数组')
  return arr[Math.floor(rand() * arr.length)]
}

export function pickWeighted<T>(items: readonly { v: T; w: number }[], rand: () => number): T {
  if (!items.length) throw new Error('pickWeighted: 空数组')
  const total = items.reduce((n, it) => n + Math.max(0, it.w), 0)
  if (total <= 0) return pick(items, rand).v
  let r = rand() * total
  for (const it of items) {
    r -= Math.max(0, it.w)
    if (r < 0) return it.v
  }
  return items[items.length - 1].v
}
