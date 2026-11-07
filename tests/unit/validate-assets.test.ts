import { describe, expect, it } from 'vitest'
import { pngSize, tierPaths } from '../../scripts/validate-assets'

function pngHeader(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24)
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buf, 0)
  buf.writeUInt32BE(13, 8)
  buf.write('IHDR', 12, 'ascii')
  buf.writeUInt32BE(width, 16)
  buf.writeUInt32BE(height, 20)
  return buf
}

describe('资产门禁工具', () => {
  it('tierPaths 生成 s/c/l 三档', () => {
    expect(tierPaths('assets/plants/sprout_s.png').map((t) => t.file)).toEqual([
      'assets/plants/sprout_s.png',
      'assets/plants/sprout_c.png',
      'assets/plants/sprout_l.png'
    ])
  })

  it('pngSize 读取 IHDR 宽高', () => {
    expect(pngSize(pngHeader(96, 96))).toEqual({ width: 96, height: 96 })
    expect(pngSize(pngHeader(256, 256))).toEqual({ width: 256, height: 256 })
  })

  it('非 PNG 返回 null', () => {
    expect(pngSize(Buffer.from('nope'))).toBeNull()
  })
})
