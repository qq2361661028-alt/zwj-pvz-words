import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { pngSize, tierPaths, validateAssets } from '../../scripts/validate-assets'
import type { RawContent } from '../../src/content/index'

const TIER_SIZE = { s: 96, c: 128, l: 256 } as const
const roots: string[] = []

function tempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pvz-assets-'))
  roots.push(root)
  fs.mkdirSync(path.join(root, 'public/assets/plants'), { recursive: true })
  fs.mkdirSync(path.join(root, 'public/assets/zombies'), { recursive: true })
  return root
}

afterEach(() => {
  roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true }))
})

function pngHeader(width: number, height: number, colorType = 6, extraBytes = 0): Buffer {
  const buf = Buffer.alloc(26 + extraBytes)
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buf, 0)
  buf.writeUInt32BE(13, 8)
  buf.write('IHDR', 12, 'ascii')
  buf.writeUInt32BE(width, 16)
  buf.writeUInt32BE(height, 20)
  buf[24] = 8
  buf[25] = colorType
  return buf
}

function writeTiers(
  root: string,
  base: string,
  options: { colorType?: number; extraBytes?: number } = {}
): void {
  for (const [suffix, size] of Object.entries(TIER_SIZE)) {
    const file = path.join(root, 'public', base.replace(/_s\.png$/, `_${suffix}.png`))
    fs.writeFileSync(file, pngHeader(size, size, options.colorType ?? 6, options.extraBytes ?? 0))
  }
}

function writeCredits(root: string): void {
  fs.writeFileSync(path.join(root, 'public/assets/CREDITS.md'), '# 素材许可\n')
}

function rawWith(
  plants: { id: string; art: string }[],
  zombies: { id: string; art: string }[] = []
): RawContent {
  return { plants, zombies, words: [], decks: [], levels: [] } as unknown as RawContent
}

const sprout = { id: 'sprout', art: 'assets/plants/sprout_s.png' }

describe('资产门禁工具', () => {
  it('tierPaths 生成 s/c/l 三档', () => {
    expect(tierPaths('assets/plants/sprout_s.png').map((t) => t.file)).toEqual([
      'assets/plants/sprout_s.png',
      'assets/plants/sprout_c.png',
      'assets/plants/sprout_l.png'
    ])
  })

  it('tierPaths 直接误用仍会抛出', () => {
    expect(() => tierPaths('assets/plants/sprout.png')).toThrow(/必须以 _s\.png 结尾/)
  })

  it('pngSize 读取 IHDR 宽高与 color type', () => {
    expect(pngSize(pngHeader(96, 96))).toEqual({ width: 96, height: 96, colorType: 6 })
    expect(pngSize(pngHeader(256, 256, 2))).toEqual({ width: 256, height: 256, colorType: 2 })
  })

  it('pngSize 拒绝短于 26 字节的 IHDR', () => {
    expect(pngSize(pngHeader(96, 96).subarray(0, 25))).toBeNull()
  })

  it('非 PNG 返回 null', () => {
    expect(pngSize(Buffer.from('nope'))).toBeNull()
  })
})

describe('validateAssets 资产门禁', () => {
  it('合法资产集零问题', () => {
    const root = tempRoot()
    writeTiers(root, sprout.art)
    writeCredits(root)
    expect(validateAssets(rawWith([sprout]), root)).toEqual([])
  })

  it('缺文件逐一报告', () => {
    const root = tempRoot()
    writeCredits(root)
    const issues = validateAssets(rawWith([sprout]), root)
    expect(issues).toHaveLength(3)
    expect(issues[0]).toContain('缺少 assets/plants/sprout_s.png')
    expect(issues[1]).toContain('缺少 assets/plants/sprout_c.png')
    expect(issues[2]).toContain('缺少 assets/plants/sprout_l.png')
  })

  it('尺寸不符报告实际尺寸', () => {
    const root = tempRoot()
    writeTiers(root, sprout.art)
    fs.writeFileSync(path.join(root, 'public/assets/plants/sprout_c.png'), pngHeader(64, 64))
    writeCredits(root)
    const issues = validateAssets(rawWith([sprout]), root)
    expect(issues.join('\n')).toContain('assets/plants/sprout_c.png 尺寸应为 128×128（实际 64×64）')
  })

  it('非 RGBA（color type 2）报告问题', () => {
    const root = tempRoot()
    writeTiers(root, sprout.art, { colorType: 2 })
    writeCredits(root)
    const issues = validateAssets(rawWith([sprout]), root)
    expect(issues).toHaveLength(3)
    expect(issues[0]).toContain(
      '植物 sprout：assets/plants/sprout_s.png 必须是 RGBA（color type 6，实际 2）'
    )
  })

  it('art 基名不以 _s.png 结尾时报告问题并继续', () => {
    const root = tempRoot()
    const bad = { id: 'thorn', art: 'assets/plants/thorn.png' }
    const zombie = { id: 'z_basic', art: 'assets/zombies/z_basic_s.png' }
    writeCredits(root)
    let issues: string[] = []
    expect(() => {
      issues = validateAssets(rawWith([bad], [zombie]), root)
    }).not.toThrow()
    expect(issues.join('\n')).toContain(
      '植物 thorn：art 路径必须以 _s.png 结尾（assets/plants/thorn.png）'
    )
    expect(issues.join('\n')).toContain('缺少 assets/zombies/z_basic_s.png')
  })

  it('缺少 CREDITS.md 报告问题', () => {
    const root = tempRoot()
    writeTiers(root, sprout.art)
    expect(validateAssets(rawWith([sprout]), root)).toContain('缺少 public/assets/CREDITS.md')
  })

  it('单文件超过 200KB 报告问题', () => {
    const root = tempRoot()
    writeTiers(root, sprout.art, { extraBytes: 200 * 1024 })
    writeCredits(root)
    const issues = validateAssets(rawWith([sprout]), root)
    expect(issues).toHaveLength(3)
    expect(issues[0]).toContain('assets/plants/sprout_s.png 超过 200KB')
  })
})
