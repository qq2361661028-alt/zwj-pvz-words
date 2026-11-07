import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RotateHint } from '../../src/ui/RotateHint'

const css = readFileSync(join(process.cwd(), 'src', 'styles', 'global.css'), 'utf8')

function blockAfter(source: string, marker: string): string {
  const start = source.indexOf(marker)
  if (start < 0) return ''
  const open = source.indexOf('{', start)
  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth += 1
    else if (source[i] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(open + 1, i)
    }
  }
  return ''
}

const portraitMedia = blockAfter(css, '@media (pointer: coarse) and (orientation: portrait)')
const landscapeMedia = blockAfter(css, '@media (pointer: coarse) and (orientation: landscape)')

describe('手机端横屏引导', () => {
  it('旋转提示默认隐藏，竖屏触摸设备显示', () => {
    expect(blockAfter(css, '.rotate-hint')).toContain('display: none')
    expect(portraitMedia).toContain('.rotate-hint')
    expect(portraitMedia).toContain('display: grid')
  })

  it('提示包含标题与说明', () => {
    const html = renderToStaticMarkup(<RotateHint />)
    expect(html).toContain('请横屏游玩')
    expect(html).toContain('铺满屏幕')
  })
})

describe('横屏场景背景延续', () => {
  it('选关页与游戏页在横屏触摸设备上使用场景渐变', () => {
    expect(landscapeMedia).toContain('.viewport--levels')
    expect(landscapeMedia).toContain('.viewport--game')
    expect(landscapeMedia).toContain('#7fc4e8')
  })

  it('场景层按 --bleed 向两侧延伸，接缝处与舞台连续', () => {
    expect(landscapeMedia).toContain('--bleed')
    expect(landscapeMedia).toContain('.sky')
    expect(landscapeMedia).toContain('.levels__ground')
    expect(landscapeMedia).toContain('overflow: visible')
  })
})
