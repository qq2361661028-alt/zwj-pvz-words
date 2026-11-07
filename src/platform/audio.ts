export type SfxName = 'fill_ok' | 'fill_wrong' | 'arm' | 'plant' | 'sun_drop' | 'zombie_die'

export type AudioLike = {
  src: string
  currentTime: number
  volume: number
  preload: string
  play(): Promise<void>
}

const FILES: Record<SfxName, string> = {
  fill_ok: '/assets/audio/fill_ok.mp3',
  fill_wrong: '/assets/audio/fill_wrong.mp3',
  arm: '/assets/audio/arm.mp3',
  plant: '/assets/audio/plant.mp3',
  sun_drop: '/assets/audio/sun_drop.mp3',
  zombie_die: '/assets/audio/zombie_die.mp3'
}

export function createAudio(makeEl: (src: string) => AudioLike = (src) => new Audio(src)) {
  const pool = new Map<SfxName, AudioLike>()
  let enabled = true
  let unlocked = false

  const ensure = (name: SfxName): AudioLike | null => {
    const hit = pool.get(name)
    if (hit) return hit
    try {
      const el = makeEl(FILES[name])
      el.preload = 'auto'
      el.volume = 0.35
      pool.set(name, el)
      return el
    } catch {
      return null
    }
  }

  const unlock = () => {
    if (unlocked) return
    unlocked = true
    for (const name of Object.keys(FILES) as SfxName[]) ensure(name)
  }

  const play = (name: SfxName) => {
    if (!enabled) return
    const el = ensure(name)
    if (!el) return
    try {
      el.currentTime = 0
      void el.play().catch(() => {})
    } catch {
      // 自动播放策略或解码失败：静默降级
    }
  }

  const setEnabled = (value: boolean) => {
    enabled = value
  }

  return { unlock, play, setEnabled }
}
