import { describe, expect, it } from 'vitest'
import { gameTrack, levelsTrack } from '../../src/ui/bgm'

describe('界面 → 背景音乐', () => {
  it('关卡选择按覆盖层切换曲目', () => {
    expect(levelsTrack(false, false)).toBe('levels')
    expect(levelsTrack(true, false)).toBe('settings')
    expect(levelsTrack(false, true)).toBe('codex')
    expect(levelsTrack(true, true)).toBe('codex')
  })

  it('战斗与结算按结果切换曲目', () => {
    expect(gameTrack(null)).toBe('game')
    expect(gameTrack('cleared')).toBe('win')
    expect(gameTrack('death')).toBe('lose')
    expect(gameTrack('abandoned')).toBe('levels')
  })
})
