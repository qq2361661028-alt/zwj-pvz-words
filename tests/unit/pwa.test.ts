import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const manifestPath = join(root, 'public', 'manifest.webmanifest')

type Icon = { src: string; sizes: string; type?: string; purpose?: string }

function pngSize(file: string): { w: number; h: number } {
  const buf = readFileSync(file)
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

describe('PWA 安装能力', () => {
  it('manifest.webmanifest 存在且字段完整', () => {
    expect(existsSync(manifestPath)).toBe(true)
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      name: string
      short_name: string
      start_url: string
      scope: string
      display: string
      orientation: string
      lang: string
      background_color: string
      theme_color: string
      icons: Icon[]
    }
    expect(manifest.name).toBe('拼词小院 · 单词塔防')
    expect(manifest.short_name).toBe('拼词小院')
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.orientation).toBe('landscape')
    expect(manifest.lang).toBe('zh-CN')
    expect(manifest.background_color).toBe('#1d1206')
    expect(manifest.theme_color).toBe('#1d1206')

    const sizes = manifest.icons.map((i) => i.sizes)
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
    expect(manifest.icons.some((i) => (i.purpose ?? 'any').includes('maskable'))).toBe(true)

    for (const icon of manifest.icons) {
      expect(icon.src.startsWith('/icons/')).toBe(true)
      expect(existsSync(join(root, 'public', icon.src.slice(1)))).toBe(true)
    }
  })

  it('图标尺寸正确', () => {
    const icons = join(root, 'public', 'icons')
    expect(pngSize(join(icons, 'icon-192.png'))).toEqual({ w: 192, h: 192 })
    expect(pngSize(join(icons, 'icon-512.png'))).toEqual({ w: 512, h: 512 })
    expect(pngSize(join(icons, 'icon-maskable-512.png'))).toEqual({ w: 512, h: 512 })
    expect(pngSize(join(icons, 'apple-touch-icon.png'))).toEqual({ w: 180, h: 180 })
  })

  it('index.html 引用 manifest 与 apple-touch-icon', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8')
    expect(html).toContain('rel="manifest"')
    expect(html).toContain('/manifest.webmanifest')
    expect(html).toContain('rel="apple-touch-icon"')
    expect(html).toContain('/icons/apple-touch-icon.png')
  })
})
