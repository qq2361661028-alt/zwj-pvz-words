import fs from 'node:fs'
import path from 'node:path'
import type { RawContent } from '../src/content/index'

const TIERS = [
  { suffix: 's', size: 96 },
  { suffix: 'c', size: 128 },
  { suffix: 'l', size: 256 }
] as const

export function pngSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24) return null
  if (buf.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return null
  if (buf.subarray(12, 16).toString('ascii') !== 'IHDR') return null
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

export function tierPaths(base: string): { suffix: 's' | 'c' | 'l'; size: number; file: string }[] {
  if (!base.endsWith('_s.png')) throw new Error(`art 路径必须以 _s.png 结尾：${base}`)
  return TIERS.map((tier) => ({
    ...tier,
    file: base.replace(/_s\.png$/, `_${tier.suffix}.png`)
  }))
}

export function validateAssets(raw: RawContent, root = process.cwd()): string[] {
  const issues: string[] = []
  const entries = [
    ...raw.plants.map((p) => ({ label: `植物 ${p.id}`, base: p.art })),
    ...raw.zombies.map((z) => ({ label: `僵尸 ${z.id}`, base: z.art }))
  ]
  let total = 0

  for (const entry of entries) {
    for (const tier of tierPaths(entry.base)) {
      const file = path.join(root, 'public', tier.file)
      if (!fs.existsSync(file)) {
        issues.push(`${entry.label}：缺少 ${tier.file}`)
        continue
      }
      const buf = fs.readFileSync(file)
      const size = pngSize(buf)
      if (!size || size.width !== tier.size || size.height !== tier.size) {
        issues.push(
          `${entry.label}：${tier.file} 尺寸应为 ${tier.size}×${tier.size}（实际 ${
            size ? `${size.width}×${size.height}` : '非 PNG'
          }）`
        )
      }
      if (buf.length > 200 * 1024) issues.push(`${entry.label}：${tier.file} 超过 200KB`)
      total += buf.length
    }
  }

  if (total > 2 * 1024 * 1024) {
    issues.push(`角色图合计 ${(total / 1024 / 1024).toFixed(2)}MB，超过 2MB`)
  }
  if (!fs.existsSync(path.join(root, 'public/assets/CREDITS.md'))) {
    issues.push('缺少 public/assets/CREDITS.md')
  }
  return issues
}
