import { describe, expect, it } from 'vitest'
import { speakWord } from '../../src/platform/speech'

describe('D15 朗读降级', () => {
  it('无 SpeechSynthesis 环境返回 false 且不抛错', () => {
    expect(speakWord('sunflower')).toBe(false)
  })
})
