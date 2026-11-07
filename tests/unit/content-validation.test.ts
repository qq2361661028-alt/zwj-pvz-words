import { describe, expect, it } from 'vitest'
import { RAW, type RawContent } from '../../src/content/index'
import { assertContent, validateContent } from '../../src/content/validate'
import type { PlantSlot } from '../../src/rules/types'

const clone = (): RawContent => structuredClone(RAW) as RawContent
const errorsOf = (raw: RawContent) => validateContent(raw).errors.join('\n')

describe('D21 启动门禁', () => {
  it('M0 夹具零错误零警告，assertContent 放行', () => {
    expect(validateContent(RAW)).toEqual({ errors: [], warnings: [] })
    expect(() => assertContent(RAW)).not.toThrow()
  })

  it('词表清洗：空格/连字符/撇号/数字/大写一律拒绝', () => {
    const raw = clone()
    const bad = ['ice cream', "don't", 'a.m.', 'TV', 'three3']
    raw.words = [
      ...raw.words,
      ...bad.map((word, i) => ({
        id: `w_bad_${i}`,
        word,
        zh: '坏词',
        ipa: '/x/',
        grade: 4,
        unit: 'Unit 3',
        letters: word.length
      }))
    ]
    const text = errorsOf(raw)
    bad.forEach((word) => expect(text).toContain(`只允许 a-z（实际 ${word}）`))
  })

  it('词表清洗：拼写去重按小写口径', () => {
    const raw = clone()
    raw.words[1] = { ...raw.words[1], word: 'Sunflower', letters: 9 }
    const text = errorsOf(raw)
    expect(text).toMatch(/只允许 a-z/)
    expect(text).toMatch(/同一拼写/)
  })

  it('词表清洗：grade 必须为正整数，unit 不能为空', () => {
    const raw = clone()
    raw.words[0].grade = 0
    raw.words[1].unit = '  '
    const text = errorsOf(raw)
    expect(text).toMatch(/grade 必须是正整数/)
    expect(text).toMatch(/unit 不能为空/)
  })

  it('id 重复会被拦下', () => {
    const raw = clone()
    raw.plants.push({ ...raw.plants[0] })
    expect(errorsOf(raw)).toMatch(/id 重复 sprout/)
  })

  it('§2 红线：文案含禁用名即报错', () => {
    const raw = clone()
    raw.plants[0].name = '豌豆射手'
    expect(errorsOf(raw)).toMatch(/§2 红线/)
  })

  it('词表：letters 必须等于长度，干扰字母必须是单个 a-z', () => {
    const raw = clone()
    raw.words[0].letters = 99
    raw.words[3].distractor_overrides = ['G']
    const text = errorsOf(raw)
    expect(text).toMatch(/letters/)
    expect(text).toMatch(/干扰字母/)
  })

  it('词表：只允许小写 a-z', () => {
    const raw = clone()
    raw.words[1].word = 'Coffee'
    expect(errorsOf(raw)).toMatch(/只允许 a-z/)
  })

  it('同一拼写出现多次会报错', () => {
    const raw = clone()
    raw.words[1] = { ...raw.words[1], word: 'sunflower', letters: 9 }
    expect(errorsOf(raw)).toMatch(/同一拼写/)
  })

  it('shooter dps=0 / art 路径非法 / 非法 slot', () => {
    const raw = clone()
    raw.plants[1].dps = 0
    raw.plants[2].art = 'plants/bush.png'
    raw.plants[0].slot = 'tank' as unknown as PlantSlot
    const text = errorsOf(raw)
    expect(text).toMatch(/shooter 的 dps 必须 > 0/)
    expect(text).toMatch(/art 路径格式不合法/)
    expect(text).toMatch(/非法 slot/)
  })

  it('非 generic 植物只能由 theme=plant 召唤', () => {
    const raw = clone()
    raw.plants[0].generic = false
    raw.decks[0].theme = 'unit'
    expect(errorsOf(raw)).toMatch(/非 generic/)
  })

  it('起步死锁会被拦下（G4）', () => {
    const raw = clone()
    raw.plants.push({
      id: 'lux',
      name: '试验苗',
      art: 'assets/plants/lux_s.png',
      cost: 80,
      hp: 100,
      dps: 0,
      slot: 'producer',
      generic: true,
      unlocked_by_default: true
    })
    raw.decks[0].plantId = 'lux'
    const text = errorsOf(raw)
    expect(text).toMatch(/起步死锁/)
    expect(text).toMatch(/G4/)
  })

  it('波次必须严格递增、lane 不越界、僵尸存在', () => {
    const raw = clone()
    raw.levels[0].waves[1].t = 30
    raw.levels[0].waves[2].lanes = [5]
    raw.levels[0].waves[3].zombie = 'z_ghost'
    const text = errorsOf(raw)
    expect(text).toMatch(/严格递增/)
    expect(text).toMatch(/越界/)
    expect(text).toMatch(/僵尸不存在/)
  })

  it('孤立词只算 warning，不阻断启动', () => {
    const raw = clone()
    raw.words.push({
      id: 'w_spare',
      word: 'spare',
      zh: '备用',
      ipa: '/speə/',
      grade: 4,
      unit: 'Unit 3',
      letters: 5
    })
    const report = validateContent(raw)
    expect(report.errors).toEqual([])
    expect(report.warnings.join('\n')).toMatch(/孤立词：w_spare/)
    expect(() => assertContent(raw)).not.toThrow()
  })

  it('assertContent 把全部错误一次性抛出', () => {
    const raw = clone()
    raw.words[0].letters = 1
    raw.plants[0].cost = 0
    expect(() => assertContent(raw)).toThrow(/D21 内容校验失败（2 项）/)
  })

  it('theme=plant 必须与植物同名', () => {
    const raw = clone()
    const deck = raw.decks.find((d) => d.theme === 'plant')!
    deck.wordId = 'w_coffee'
    expect(errorsOf(raw)).toMatch(/必须与植物 id/)
  })

  it('producer 的 produce_amount 必须为正，非 producer 不得配置', () => {
    const raw = clone()
    raw.plants.find((p) => p.id === 'clover')!.produce_amount = 0
    raw.plants.find((p) => p.id === 'slinger')!.produce_amount = 10
    const text = errorsOf(raw)
    expect(text).toMatch(/produce_amount/)
  })

  it('僵尸 art 路径必须合法', () => {
    const raw = clone()
    raw.zombies[0] = { ...raw.zombies[0], art: 'assets/zombies/bad.gif' }
    expect(errorsOf(raw)).toContain('僵尸 z_basic：art 路径格式不合法 assets/zombies/bad.gif')
  })

  it('art 路径必须以 _s.png 结尾', () => {
    const raw = clone()
    raw.plants[0].art = 'assets/plants/sprout.png'
    raw.zombies[0] = { ...raw.zombies[0], art: 'assets/zombies/z_basic_c.png' }
    const text = errorsOf(raw)
    expect(text).toContain('植物 sprout：art 路径格式不合法 assets/plants/sprout.png')
    expect(text).toContain('僵尸 z_basic：art 路径格式不合法 assets/zombies/z_basic_c.png')
  })

  it('僵尸在波次中缺席只算 warning', () => {
    const raw = clone()
    raw.levels[0].waves = raw.levels[0].waves.filter((w) => w.zombie !== 'z_bucket')
    const report = validateContent(raw)
    expect(report.warnings.join('\n')).toMatch(/孤立僵尸：z_bucket/)
  })
})
