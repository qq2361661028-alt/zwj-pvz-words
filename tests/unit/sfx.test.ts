import { describe, expect, it, vi } from 'vitest'
import { createAudio, type AudioLike } from '../../src/platform/audio'
import { sfxForEvent } from '../../src/ui/sfx'

describe('事件 → 音效', () => {
  it('六类事件映射到固定音效', () => {
    expect(sfxForEvent({ type: 'filled', slot: 0 })).toBe('fill_ok')
    expect(sfxForEvent({ type: 'wrong', tileId: 1 })).toBe('fill_wrong')
    expect(sfxForEvent({ type: 'armed', plantId: 'sprout' })).toBe('arm')
    expect(sfxForEvent({ type: 'placed', plantId: 'sprout', lane: 0, col: 0 })).toBe('plant')
    expect(sfxForEvent({ type: 'sun_gained', amount: 25 })).toBe('sun_drop')
    expect(sfxForEvent({ type: 'zombie_died' })).toBe('zombie_die')
  })

  it('无音效事件返回 null', () => {
    expect(sfxForEvent({ type: 'focus_advanced' })).toBeNull()
    expect(sfxForEvent({ type: 'outcome', kind: 'cleared' })).toBeNull()
  })
})

function harness() {
  const created: (AudioLike & { play: ReturnType<typeof vi.fn> })[] = []
  const make = (src: string) => {
    const el = {
      src,
      currentTime: 0,
      volume: 1,
      preload: '',
      play: vi.fn(() => Promise.resolve())
    }
    created.push(el)
    return el
  }
  return { created, make }
}

describe('音效播放器', () => {
  it('播放会建元素、设音量并重置进度', () => {
    const { created, make } = harness()
    const audio = createAudio(make)
    audio.play('fill_ok')
    expect(created).toHaveLength(1)
    expect(created[0].src).toBe('/assets/audio/fill_ok.mp3')
    expect(created[0].volume).toBe(0.35)
    expect(created[0].currentTime).toBe(0)
    expect(created[0].play).toHaveBeenCalledTimes(1)
  })

  it('关闭后不创建、不播放', () => {
    const { created, make } = harness()
    const audio = createAudio(make)
    audio.setEnabled(false)
    audio.play('fill_ok')
    expect(created).toHaveLength(0)
  })

  it('解锁预载 6 个音效，重复解锁不重复创建', () => {
    const { created, make } = harness()
    const audio = createAudio(make)
    audio.unlock()
    audio.unlock()
    expect(created).toHaveLength(6)
  })

  it('play 抛错被吞掉，不向上抛', () => {
    const make = () => ({
      src: '',
      currentTime: 0,
      volume: 1,
      preload: '',
      play: () => Promise.reject(new Error('blocked'))
    })
    const audio = createAudio(make)
    expect(() => audio.play('arm')).not.toThrow()
  })
})
