import { describe, expect, it } from 'vitest'
import { PLANT_ART } from '../../src/art/PlantArt'
import { RAW } from '../../src/content/index'

describe('M2 植物美术覆盖', () => {
  it('8 株植物都有内联 SVG 组件', () => {
    expect(Object.keys(PLANT_ART).sort()).toEqual(RAW.plants.map((p) => p.id).sort())
  })
})
