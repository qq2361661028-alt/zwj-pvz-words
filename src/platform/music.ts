export type BgmName = 'levels' | 'game' | 'codex' | 'settings' | 'win' | 'lose'

export const BGM_VOLUME = 0.16

export type BgmElement = {
  src: string
  loop: boolean
  volume: number
  preload: string
  paused: boolean
  currentTime: number
  play(): Promise<void>
  pause(): void
}

const FILES: Record<BgmName, string> = {
  levels: '/assets/audio/bgm/levels.mp3',
  game: '/assets/audio/bgm/game.mp3',
  codex: '/assets/audio/bgm/codex.mp3',
  settings: '/assets/audio/bgm/settings.mp3',
  win: '/assets/audio/bgm/win.mp3',
  lose: '/assets/audio/bgm/lose.mp3'
}

const FADE_MS = 300
const FADE_STEP_MS = 30

export function createMusic(makeEl: (src: string) => BgmElement = (src) => new Audio(src)) {
  const pool = new Map<BgmName, BgmElement>()
  let enabled = true
  let want: BgmName | null = null
  let current: BgmName | null = null
  let fade: ReturnType<typeof setInterval> | null = null

  const clearFade = () => {
    if (fade !== null) {
      clearInterval(fade)
      fade = null
    }
  }

  const ensure = (name: BgmName): BgmElement | null => {
    const hit = pool.get(name)
    if (hit) return hit
    try {
      const el = makeEl(FILES[name])
      el.preload = 'auto'
      el.loop = true
      el.volume = 0
      pool.set(name, el)
      return el
    } catch {
      return null
    }
  }

  const fadeIn = (el: BgmElement) => {
    clearFade()
    const steps = Math.ceil(FADE_MS / FADE_STEP_MS)
    let step = 0
    fade = setInterval(() => {
      step += 1
      try {
        el.volume = Math.min(BGM_VOLUME, (BGM_VOLUME * step) / steps)
      } catch {
        // 元素被浏览器回收：放弃淡入
      }
      if (step >= steps) clearFade()
    }, FADE_STEP_MS)
  }

  const begin = (el: BgmElement) => {
    clearFade()
    try {
      el.currentTime = 0
    } catch {
      // 尚未就绪时归零可能抛错：忽略
    }
    el.volume = 0
    try {
      void Promise.resolve(el.play()).then(
        () => fadeIn(el),
        () => {
          // 自动播放被拒：保留意图，首次用户手势后由 unlock 重试
        }
      )
    } catch {
      // 同步拒绝同样留给 unlock
    }
  }

  const play = (name: BgmName) => {
    want = name
    if (!enabled) return
    if (current === name) {
      const hit = ensure(name)
      if (hit && hit.paused) begin(hit)
      return
    }
    if (current) {
      const old = pool.get(current)
      if (old) {
        try {
          old.pause()
          old.currentTime = 0
        } catch {
          // 未就绪或被回收：忽略
        }
      }
    }
    current = name
    const el = ensure(name)
    if (el) begin(el)
  }

  const unlock = () => {
    if (!enabled || !want) return
    const el = ensure(want)
    if (el && el.paused) {
      current = want
      begin(el)
    }
  }

  const setEnabled = (value: boolean) => {
    enabled = value
    if (!value) {
      clearFade()
      for (const el of pool.values()) {
        try {
          el.pause()
          el.currentTime = 0
          el.volume = 0
        } catch {
          // 忽略未就绪或被回收的元素
        }
      }
      return
    }
    if (!want) return
    const el = ensure(want)
    if (el && el.paused) {
      current = want
      begin(el)
    }
  }

  return { play, unlock, setEnabled }
}

export const music = createMusic()
