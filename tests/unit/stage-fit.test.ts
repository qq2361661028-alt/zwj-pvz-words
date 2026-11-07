import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { VIEW, fitScale, stageBleed, stageTransform } from '../../src/ui/layout'

describe('舞台缩放与居中（小视口回归）', () => {
  it('fitScale 取宽高缩放比的较小值', () => {
    expect(fitScale(1920, 1080)).toBe(1.5)
    expect(fitScale(2560, 1440)).toBe(2)
    expect(fitScale(390, 844)).toBe(390 / VIEW.w)
    expect(fitScale(844, 390)).toBe(390 / VIEW.h)
  })

  it('stageTransform 以中心锚定缩放', () => {
    expect(stageTransform(0.5)).toBe('translate(-50%, -50%) scale(0.5)')
  })

  it('stageBleed 只在高度受限时向两侧延伸', () => {
    expect(stageBleed(844, fitScale(844, 390))).toBeCloseTo(139.08, 1)
    expect(stageBleed(1920, fitScale(1920, 1080))).toBe(0)
    expect(stageBleed(1280, fitScale(1280, 720))).toBe(0)
    expect(stageBleed(390, fitScale(390, 844))).toBe(0)
  })

  it('.stage 绝对定位到容器中心', () => {
    const css = readFileSync(join(process.cwd(), 'src', 'styles', 'global.css'), 'utf8')
    const block = css.match(/\.stage\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(block).toContain('position: absolute')
    expect(block).toContain('left: 50%')
    expect(block).toContain('top: 50%')
  })
})
