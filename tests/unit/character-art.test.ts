import { describe, expect, it } from 'vitest'
import { artSrc } from '../../src/art/CharacterArt'

describe('角色图路径', () => {
  it('把 _s 基准换成三档', () => {
    expect(artSrc('assets/plants/sprout_s.png', 's')).toBe('/assets/plants/sprout_s.png')
    expect(artSrc('assets/plants/sprout_s.png', 'c')).toBe('/assets/plants/sprout_c.png')
    expect(artSrc('assets/plants/sprout_s.png', 'l')).toBe('/assets/plants/sprout_l.png')
  })

  it('非法基准路径直接抛错', () => {
    expect(() => artSrc('assets/plants/sprout.png', 'l')).toThrow(/_s\.png/)
  })
})
