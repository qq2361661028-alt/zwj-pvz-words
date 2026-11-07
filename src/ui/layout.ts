import { BOARD } from '../rules/constants'

/** D14：逻辑画幅固定 1280×720，整体缩放适配；最小可玩 960×600 */
export const VIEW = { w: 1280, h: 720, min_w: 960, min_h: 600 } as const

export function fitScale(vw: number, vh: number): number {
  return Math.min(vw / VIEW.w, vh / VIEW.h)
}

/** 先按自身尺寸回移半个身位，再缩放：容器小于舞台时也能保持居中 */
export function stageTransform(scale: number): string {
  return `translate(-50%, -50%) scale(${scale})`
}

/** 高度受限（横屏手机）时，舞台左右两侧各需向外延伸的逻辑像素 */
export function stageBleed(vw: number, scale: number): number {
  return Math.max(0, (vw / scale - VIEW.w) / 2)
}

export const HUD_H = 50
export const CELL_W = 120
export const CELL_H = 88            // G2：50 + 5×88 + 230 = 720（96 会溢出）
export const DRAWER_H = 230
export const LAWN_X = 40
export const LAWN_Y = HUD_H
export const LAWN_W = BOARD.cols * CELL_W
export const LAWN_H = BOARD.lanes * CELL_H

export const DRAWER = { x: 20, y: LAWN_Y + LAWN_H, w: 1240, h: DRAWER_H, content_w: 1046 } as const
export const TILE = { w: 38, pitch: 42 } as const
export const MAX_TILES_TOTAL = 16

export function xToPx(x: number): number {
  return LAWN_X + (x / BOARD.cols) * LAWN_W
}

export function colToPx(col: number): number {
  return LAWN_X + (col + 0.5) * CELL_W
}

export function laneToPx(lane: number): number {
  return LAWN_Y + (lane + 0.5) * CELL_H
}

export function cellRect(lane: number, col: number) {
  return { x: LAWN_X + col * CELL_W, y: LAWN_Y + lane * CELL_H, w: CELL_W, h: CELL_H }
}

/** G3：1280 下每行可放 25 块，合法词最多 16 块 ⇒ 布局溢出分支不可达 */
export function tilesPerRow(contentW: number = DRAWER.content_w): number {
  return Math.floor(contentW / TILE.pitch)
}
