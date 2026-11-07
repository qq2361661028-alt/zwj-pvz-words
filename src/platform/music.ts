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

type AudioGraph = {
  attach(el: BgmElement): boolean
  setVolume(value: number): void
  resume(): void
}

/** iOS Safari 忽略 HTMLMediaElement.volume，改用增益节点控制响度 */
function createAudioGraph(): AudioGraph | null {
  try {
    const Ctor =
      typeof AudioContext !== 'undefined'
        ? AudioContext
        : (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    const ctx = new Ctor()
    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.connect(ctx.destination)
    const routed = new WeakSet<BgmElement>()
    return {
      attach(el) {
        if (routed.has(el)) return true
        try {
          ctx.createMediaElementSource(el as unknown as HTMLMediaElement).connect(gain)
          routed.add(el)
          return true
        } catch {
          return false
        }
      },
      setVolume(value) {
        gain.gain.value = value
      },
      resume() {
        try {
          void ctx.resume()
        } catch {
          // 非手势上下文可能拒绝恢复：等下一次手势
        }
      }
    }
  } catch {
    return null
  }
}

export function createMusic(
  makeEl: (src: string) => BgmElement = (src) => new Audio(src),
  makeGraph: () => AudioGraph | null = createAudioGraph
) {
  const pool = new Map<BgmName, BgmElement>()
  const routed = new WeakSet<BgmElement>()
  let graph: AudioGraph | null | undefined
  let enabled = true
  let want: BgmName | null = null
  let current: BgmName | null = null
  let fade: ReturnType<typeof setInterval> | null = null

  const getGraph = (): AudioGraph | null => {
    if (graph === undefined) graph = makeGraph()
    return graph
  }

  const setLevel = (el: BgmElement, value: number) => {
    if (routed.has(el)) {
      getGraph()?.setVolume(value)
      return
    }
    el.volume = value
  }

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
      const g = getGraph()
      if (g && g.attach(el)) {
        routed.add(el)
        el.volume = 1
      } else {
        el.volume = 0
      }
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
        setLevel(el, Math.min(BGM_VOLUME, (BGM_VOLUME * step) / steps))
      } catch {
        // 元素被浏览器回收：放弃淡入
      }
      if (step >= steps) clearFade()
    }, FADE_STEP_MS)
  }

  const begin = (el: BgmElement) => {
    clearFade()
    getGraph()?.resume()
    try {
      el.currentTime = 0
    } catch {
      // 尚未就绪时归零可能抛错：忽略
    }
    setLevel(el, 0)
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
    getGraph()?.resume()
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
          if (!routed.has(el)) el.volume = 0
        } catch {
          // 忽略未就绪或被回收的元素
        }
      }
      graph?.setVolume(0)
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
