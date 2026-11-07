export type SfxName = 'fill_ok' | 'fill_wrong' | 'arm' | 'plant' | 'sun_drop' | 'zombie_die'

export type AudioLike = {
  src: string
  currentTime: number
  volume: number
  preload: string
  muted: boolean
  play(): Promise<void>
  pause(): void
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

  // iPad Safari 只把真实用户手势内成功发起的 play() 视为解锁；
  // 因此逐个静音试播，成功或被拒绝后都暂停、归零进度并恢复非静音状态。
  const trial = (el: AudioLike) => {
    el.muted = true
    const settle = () => {
      try {
        el.pause()
        el.currentTime = 0
      } catch {
        // 元素尚未就绪时暂停/归零可能抛错：忽略
      }
      el.muted = false
    }
    try {
      el.currentTime = 0
      void Promise.resolve(el.play()).then(settle, settle)
    } catch {
      settle()
    }
  }

  const unlock = () => {
    if (unlocked) return
    unlocked = true
    for (const name of Object.keys(FILES) as SfxName[]) {
      const el = ensure(name)
      if (el) trial(el)
    }
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
    if (value) return
    // 关闭音效立即静音：停掉在播元素并归零进度（不销毁实例）
    for (const el of pool.values()) {
      try {
        el.pause()
        el.currentTime = 0
      } catch {
        // 未就绪或被回收：忽略
      }
    }
  }

  return { unlock, play, setEnabled }
}
