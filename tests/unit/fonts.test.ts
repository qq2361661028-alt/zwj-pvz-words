import { afterEach, describe, expect, it, vi } from 'vitest'
import { waitForFonts } from '../../src/platform/fonts'

type FakeFonts = { load: (font: string) => Promise<unknown>; ready: Promise<unknown> }
const doc = (fonts: FakeFonts) => ({ fonts } as unknown as Document)

describe('字体就绪门禁', () => {
  afterEach(() => vi.useRealTimers())

  it('三款字重加载完成后返回 true', async () => {
    const loaded: string[] = []
    const fake = {
      load: (font: string) => {
        loaded.push(font)
        return Promise.resolve([])
      },
      ready: Promise.resolve()
    }
    await expect(waitForFonts(doc(fake), 1000)).resolves.toBe(true)
    expect(loaded).toHaveLength(3)
  })

  it('超时返回 false 且不抛错', async () => {
    vi.useFakeTimers()
    const fake = { load: () => new Promise<never>(() => {}), ready: new Promise<never>(() => {}) }
    const pending = waitForFonts(doc(fake), 50)
    await vi.advanceTimersByTimeAsync(50)
    await expect(pending).resolves.toBe(false)
  })

  it('加载失败返回 false', async () => {
    const fake = { load: () => Promise.reject(new Error('font')), ready: Promise.resolve() }
    await expect(waitForFonts(doc(fake), 1000)).resolves.toBe(false)
  })
})
