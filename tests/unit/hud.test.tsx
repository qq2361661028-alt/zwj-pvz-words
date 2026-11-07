import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { formatClock, Hud } from '../../src/ui/Hud'

const waves = [
  { art: 'assets/zombies/z_basic_s.png', name: '慢步者', t: 40 },
  { art: 'assets/zombies/z_bucket_s.png', name: '铁桶者', t: 70 },
  { art: 'assets/zombies/z_flag_s.png', name: '旗帜者', t: 100 }
]

function render(spawned: number, time: number) {
  return renderToStaticMarkup(
    <Hud
      sun={75}
      sunDelta={null}
      levelName="Unit 3 · 第 1 关"
      spawned={spawned}
      totalWaves={waves.length}
      waves={waves}
      time={time}
      onExit={() => {}}
    />
  )
}

describe('formatClock', () => {
  it('从 00:00 开始并按分秒补零', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(65)).toBe('01:05')
    expect(formatClock(3599)).toBe('59:59')
  })

  it('忽略小数与负数', () => {
    expect(formatClock(5.9)).toBe('00:05')
    expect(formatClock(-3)).toBe('00:00')
  })
})

describe('Hud 出怪进度', () => {
  it('每个波次在进度条上有一枚僵尸小图标', () => {
    const html = render(1, 65)
    expect((html.match(/progress__zombie/g) ?? []).length).toBe(waves.length)
  })

  it('已出和下一波图标有对应状态', () => {
    const html = render(1, 65)
    expect(html).toContain('is-passed')
    expect(html).toContain('is-next')
  })

  it('页面中间显示从 00:00 开始的本关用时', () => {
    expect(render(0, 0)).toContain('>00:00<')
    expect(render(1, 65)).toContain('>01:05<')
  })
})