import { afterEach, describe, expect, it, vi } from 'vitest'
import { BGM_VOLUME, createMusic, type BgmElement } from '../../src/platform/music'

type FakeEl = BgmElement & { play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn> }

function harness(playImpl?: (el: FakeEl) => Promise<void>) {
  const created: FakeEl[] = []
  const make = (src: string) => {
    const el = {
      src,
      loop: false,
      volume: 1,
      preload: '',
      paused: true,
      currentTime: 9,
      play: vi.fn(),
      pause: vi.fn()
    } as unknown as FakeEl
    el.play.mockImplementation(() => {
      if (playImpl) return playImpl(el)
      el.paused = false
      return Promise.resolve()
    })
    el.pause.mockImplementation(() => {
      el.paused = true
    })
    created.push(el)
    return el
  }
  return { created, make }
}

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

afterEach(() => {
  vi.useRealTimers()
})

describe('背景音乐播放器', () => {
  it('播放时建元素、循环、重置进度并淡入到目标音量', async () => {
    vi.useFakeTimers()
    const { created, make } = harness()
    const music = createMusic(make)
    music.play('levels')
    expect(created).toHaveLength(1)
    expect(created[0].src).toBe('/assets/audio/bgm/levels.mp3')
    expect(created[0].loop).toBe(true)
    expect(created[0].preload).toBe('auto')
    expect(created[0].currentTime).toBe(0)
    expect(created[0].play).toHaveBeenCalledTimes(1)
    expect(created[0].volume).toBe(0)
    await flush()
    vi.advanceTimersByTime(400)
    expect(created[0].volume).toBeCloseTo(BGM_VOLUME, 5)
  })

  it('同一曲目重复播放不重启', () => {
    const { created, make } = harness()
    const music = createMusic(make)
    music.play('levels')
    music.play('levels')
    expect(created).toHaveLength(1)
    expect(created[0].play).toHaveBeenCalledTimes(1)
  })

  it('切歌会暂停旧曲并播放新曲', async () => {
    vi.useFakeTimers()
    const { created, make } = harness()
    const music = createMusic(make)
    music.play('levels')
    await flush()
    music.play('game')
    expect(created).toHaveLength(2)
    expect(created[0].pause).toHaveBeenCalledTimes(1)
    expect(created[0].currentTime).toBe(0)
    expect(created[1].src).toBe('/assets/audio/bgm/game.mp3')
    expect(created[1].play).toHaveBeenCalledTimes(1)
  })

  it('关闭后暂停并静音，重新开启会播放最近一次的曲目', async () => {
    vi.useFakeTimers()
    const { created, make } = harness()
    const music = createMusic(make)
    music.play('levels')
    await flush()
    music.setEnabled(false)
    expect(created[0].paused).toBe(true)
    expect(created[0].volume).toBe(0)
    music.play('game')
    expect(created).toHaveLength(1)
    music.setEnabled(true)
    expect(created).toHaveLength(2)
    expect(created[1].src).toBe('/assets/audio/bgm/game.mp3')
    expect(created[1].play).toHaveBeenCalledTimes(1)
  })

  it('自动播放被拒后静默降级，解锁时重试', async () => {
    vi.useFakeTimers()
    let blocked = true
    const { created, make } = harness((el) => {
      if (blocked) return Promise.reject(new Error('blocked'))
      el.paused = false
      return Promise.resolve()
    })
    const music = createMusic(make)
    music.play('codex')
    await flush()
    expect(created[0].play).toHaveBeenCalledTimes(1)
    expect(created[0].volume).toBe(0)
    blocked = false
    music.unlock()
    await flush()
    expect(created[0].play).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(400)
    expect(created[0].volume).toBeCloseTo(BGM_VOLUME, 5)
  })
})
