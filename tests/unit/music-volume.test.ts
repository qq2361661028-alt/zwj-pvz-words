import { afterEach, describe, expect, it, vi } from 'vitest'
import { BGM_VOLUME, createMusic, type BgmElement } from '../../src/platform/music'

function fakeEl(): BgmElement {
  return {
    src: '',
    loop: false,
    volume: 1,
    preload: '',
    paused: true,
    currentTime: 0,
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn()
  }
}

class FakeGain {
  gain = { value: 0 }
  connect = vi.fn()
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  destination = {}
  state = 'suspended'
  gain = new FakeGain()
  sources: unknown[] = []
  resume = vi.fn(() => {
    this.state = 'running'
    return Promise.resolve()
  })

  constructor() {
    FakeAudioContext.instances.push(this)
  }

  createGain() {
    return this.gain
  }

  createMediaElementSource(el: unknown) {
    this.sources.push(el)
    return { connect: vi.fn() }
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  FakeAudioContext.instances = []
})

describe('BGM 音量（iOS 忽略元素 volume）', () => {
  it('支持 Web Audio 时用增益节点控制音量，元素保持满音量', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('AudioContext', FakeAudioContext)
    const el = fakeEl()
    const music = createMusic(() => el)

    music.play('levels')
    await vi.advanceTimersByTimeAsync(400)

    const ctx = FakeAudioContext.instances[0]
    expect(ctx).toBeTruthy()
    expect(ctx.gain.gain.value).toBeCloseTo(BGM_VOLUME, 5)
    expect(el.volume).toBe(1)
  })

  it('没有 Web Audio 时回退到元素音量', async () => {
    vi.useFakeTimers()
    const el = fakeEl()
    const music = createMusic(() => el)

    music.play('levels')
    await vi.advanceTimersByTimeAsync(400)

    expect(el.volume).toBeCloseTo(BGM_VOLUME, 5)
  })

  it('unlock 会恢复被挂起的 AudioContext', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext)
    const music = createMusic(() => fakeEl())

    music.play('levels')
    const ctx = FakeAudioContext.instances[0]
    ctx.resume.mockClear()
    music.unlock()

    expect(ctx.resume).toHaveBeenCalled()
  })
})
