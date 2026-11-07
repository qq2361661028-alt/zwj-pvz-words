import { describe, expect, it } from 'vitest'
import { BOARD } from '../../src/rules/constants'
import {
  CELL_H,
  CELL_W,
  DRAWER,
  DRAWER_H,
  HUD_H,
  LAWN_H,
  LAWN_W,
  LAWN_X,
  LAWN_Y,
  MAX_TILES_TOTAL,
  TILE,
  VIEW,
  cellRect,
  colToPx,
  laneToPx,
  tilesPerRow,
  xToPx
} from '../../src/ui/layout'

describe('D14 1280×720 画幅', () => {
  it('50 + 5×88 + 230 = 720，抽屉贴底', () => {
    expect(VIEW).toEqual({ w: 1280, h: 720, min_w: 960, min_h: 600 })
    expect(HUD_H).toBe(50)
    expect(CELL_H).toBe(88)
    expect(LAWN_H).toBe(5 * 88)
    expect(HUD_H + LAWN_H + DRAWER_H).toBe(VIEW.h)
    expect(DRAWER.y).toBe(490)
    expect(DRAWER.y + DRAWER.h).toBe(VIEW.h)
  })

  it('草坪 9×120 = 1080 宽', () => {
    expect(LAWN_X).toBe(40)
    expect(LAWN_Y).toBe(50)
    expect(CELL_W).toBe(120)
    expect(LAWN_W).toBe(1080)
    expect(LAWN_X + LAWN_W).toBe(1120)
  })

  it('逻辑坐标 → 像素', () => {
    expect(xToPx(0)).toBe(40)
    expect(xToPx(BOARD.cols)).toBe(1120)
    expect(xToPx(BOARD.spawn_x)).toBeCloseTo(1192, 6)
    expect(colToPx(0)).toBe(100)
    expect(colToPx(8)).toBe(1060)
    expect(laneToPx(0)).toBe(94)
    expect(laneToPx(4)).toBe(446)
    expect(cellRect(4, 8)).toEqual({ x: 1000, y: 402, w: 120, h: 88 })
  })

  it('抽屉容得下最长牌面（G3）', () => {
    expect(MAX_TILES_TOTAL).toBe(16)
    expect(tilesPerRow()).toBeGreaterThanOrEqual(MAX_TILES_TOTAL)
    expect(tilesPerRow() * TILE.pitch).toBeLessThanOrEqual(DRAWER.content_w)
    expect(tilesPerRow()).toBe(Math.floor(DRAWER.content_w / TILE.pitch))
  })
})
