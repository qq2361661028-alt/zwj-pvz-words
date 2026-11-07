import { describe, expect, it } from 'vitest'
import { NoopProvider, createSpeechProvider } from '../../src/platform/speechRecognition'

describe('语音 Provider 降级', () => {
  it('Node/无识别能力环境创建 Noop，四态报 unsupported', () => {
    const provider = createSpeechProvider()
    expect(provider).toBeInstanceOf(NoopProvider)
    expect(provider.available()).toBe('unsupported')
  })

  it('Noop recognize 返回 error，不抛异常', async () => {
    const r = await new NoopProvider().recognize('sunflower', { timeoutMs: 8000 })
    expect(r).toEqual({ verdict: 'error', transcript: '', confidence: 0, candidates: [] })
  })
})
