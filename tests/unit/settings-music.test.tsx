import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SettingsOverlay } from '../../src/ui/SettingsOverlay'

describe('设置页背景音乐开关', () => {
  it('渲染背景音乐开关并默认开启', () => {
    const html = renderToStaticMarkup(<SettingsOverlay onClose={() => {}} />)
    expect(html).toContain('背景音乐')
    expect(html).toMatch(/aria-pressed="true"[^>]*>已开启/)
  })
})
