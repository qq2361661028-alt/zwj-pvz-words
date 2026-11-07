import { BOARD, SUN } from '../rules/constants'
import { startReachable } from '../rules/reachability'
import { mulberry32, seedHash } from '../rules/rng'
import { buildTiles, multisetSelfCheck } from '../rules/wordgen'
import type { Ctx, PlantSlot, Theme, WaveDef } from '../rules/types'
import type { RawContent } from './index'

export type ValidationReport = { errors: string[]; warnings: string[] }

/** §2 红线：对外文案不得出现的名字 */
export const BANNED = ['植物大战僵尸', 'Plants vs', 'PvZ', '僵尸博士', '坚果墙', '豌豆射手']
const SLOTS: PlantSlot[] = ['producer', 'shooter', 'defense']
const THEMES: Theme[] = ['plant', 'unit', 'review']
const ART_RE = /^assets\/(plants|zombies)\/[a-z0-9_]+\.png$/

export function validateContent(raw: RawContent): ValidationReport {
  const errors: string[] = []
  const warnings: string[] = []

  const dup = (label: string, ids: readonly string[]) => {
    const seen = new Set<string>()
    ids.forEach((id) => {
      if (seen.has(id)) errors.push(`${label}：id 重复 ${id}`)
      seen.add(id)
    })
  }

  dup('plants', raw.plants.map((p) => p.id))
  dup('words', raw.words.map((w) => w.id))
  dup('decks', raw.decks.map((d) => d.id))
  dup('zombies', raw.zombies.map((z) => z.id))
  dup('levels', raw.levels.map((l) => l.id))

  const texts: string[] = [
    ...raw.plants.map((p) => p.name),
    ...raw.zombies.map((z) => z.name),
    ...raw.levels.map((l) => l.name),
    ...raw.words.map((w) => w.zh)
  ]
  texts.forEach((text) => {
    for (const banned of BANNED) {
      if (text.includes(banned)) errors.push(`§2 红线：文案含禁用名「${banned}」→ ${text}`)
    }
  })

  // §4.4 词表清洗
  raw.words.forEach((w) => {
    if (!/^[a-z]+$/.test(w.word)) errors.push(`词 ${w.id}：只允许 a-z（实际 ${w.word}）`)
    if (w.word.length < 3 || w.word.length > 10) errors.push(`词 ${w.id}：长度必须 3–10（实际 ${w.word.length}）`)
    if (w.letters !== w.word.length) errors.push(`词 ${w.id}：letters(${w.letters}) 必须等于 word.length(${w.word.length})`)
    if (w.word !== w.word.toLowerCase()) errors.push(`词 ${w.id}：必须小写`)
    if (!Number.isInteger(w.grade) || w.grade <= 0) errors.push(`词 ${w.id}：grade 必须是正整数（实际 ${w.grade}）`)
    if (!w.unit.trim()) errors.push(`词 ${w.id}：unit 不能为空`)
    for (const over of w.distractor_overrides ?? []) {
      if (!/^[a-z]$/.test(over)) errors.push(`词 ${w.id}：干扰字母必须是单个 a-z → ${over}`)
    }
  })
  const wordSeen = new Set<string>()
  raw.words.forEach((w) => {
    const key = w.word.toLowerCase()
    if (wordSeen.has(key)) errors.push(`词表：同一拼写出现多次「${key}」`)
    wordSeen.add(key)
  })

  raw.plants.forEach((p) => {
    if (!SLOTS.includes(p.slot)) errors.push(`植物 ${p.id}：非法 slot ${p.slot}`)
    if (p.cost <= 0) errors.push(`植物 ${p.id}：cost 必须 > 0`)
    if (p.hp <= 0) errors.push(`植物 ${p.id}：hp 必须 > 0`)
    if (p.dps < 0) errors.push(`植物 ${p.id}：dps 不能为负`)
    if (p.slot === 'shooter' && p.dps <= 0) errors.push(`植物 ${p.id}：shooter 的 dps 必须 > 0`)
    if (p.slot !== 'shooter' && p.dps !== 0) warnings.push(`植物 ${p.id}：非 shooter 的 dps 应为 0`)
    if (!ART_RE.test(p.art)) errors.push(`植物 ${p.id}：art 路径格式不合法 ${p.art}`)
    if (p.produce_amount !== undefined) {
      if (p.slot !== 'producer') errors.push(`植物 ${p.id}：只有 producer 能配置 produce_amount`)
      if (!(p.produce_amount > 0)) errors.push(`植物 ${p.id}：produce_amount 必须 > 0`)
    }
  })

  const ctx: Ctx = {
    plants: Object.fromEntries(raw.plants.map((p) => [p.id, p])),
    words: Object.fromEntries(raw.words.map((w) => [w.id, w])),
    decks: Object.fromEntries(raw.decks.map((d) => [d.id, d])),
    zombies: Object.fromEntries(raw.zombies.map((z) => [z.id, z])),
    levels: Object.fromEntries(raw.levels.map((l) => [l.id, l]))
  }

  raw.decks.forEach((d) => {
    const word = ctx.words[d.wordId]
    const plant = ctx.plants[d.plantId]
    if (!word) errors.push(`配对 ${d.id}：词不存在 ${d.wordId}`)
    if (!plant) errors.push(`配对 ${d.id}：植物不存在 ${d.plantId}`)
    if (!THEMES.includes(d.theme)) errors.push(`配对 ${d.id}：非法 theme ${d.theme}`)
    if (word && plant) {
      // §4.1.1：theme=plant 只召唤同名植物；generic 苗木可承载任意词
      if (d.theme === 'plant' && plant.generic) {
        errors.push(`配对 ${d.id}：theme=plant 不能指向 generic 植物 ${plant.id}`)
      }
      if (d.theme === 'plant' && !plant.generic && word.word !== plant.id) {
        errors.push(`配对 ${d.id}：theme=plant 的拼写「${word.word}」必须与植物 id「${plant.id}」同名`)
      }
      if (d.theme !== 'plant' && !plant.generic) {
        errors.push(`配对 ${d.id}：非 generic 植物 ${plant.id} 只能由 theme=plant 召唤`)
      }
      const rand = mulberry32(seedHash(word.id, d.id))
      if (!multisetSelfCheck(buildTiles(word, rand, 0, raw.words), word.word)) {
        errors.push(`配对 ${d.id}：牌面多重集合拼不出 ${word.word}（D9）`)
      }
    }
  })

  const usedWords = new Set(raw.decks.map((d) => d.wordId))
  raw.words.forEach((w) => {
    if (!usedWords.has(w.id)) warnings.push(`孤立词：${w.id}（${w.word}）没有被任何配对引用`)
  })
  const usedPlants = new Set(raw.decks.map((d) => d.plantId))
  raw.plants.forEach((p) => {
    if (!usedPlants.has(p.id)) warnings.push(`孤立植物：${p.id} 没有被任何配对引用`)
  })

  raw.zombies.forEach((z) => {
    if (!ART_RE.test(z.art)) errors.push(`僵尸 ${z.id}：art 路径格式不合法 ${z.art}`)
    if (z.hp <= 0) errors.push(`僵尸 ${z.id}：hp 必须 > 0`)
    if (!(z.speed > 0)) errors.push(`僵尸 ${z.id}：speed 必须 > 0`)
    if (z.dps <= 0) errors.push(`僵尸 ${z.id}：dps 必须 > 0`)
    if (z.speed > 1) warnings.push(`僵尸 ${z.id}：speed ${z.speed} 格/秒 快于 1 格/秒，检查单位`)
  })
  const usedZombies = new Set(raw.levels.flatMap((l) => l.waves.map((w) => w.zombie)))
  raw.zombies.forEach((z) => {
    if (!usedZombies.has(z.id)) warnings.push(`孤立僵尸：${z.id} 没有进入任何波次`)
  })

  const waveIssues = (waves: readonly WaveDef[], levelId: string) => {
    let prev = -Infinity
    waves.forEach((w, i) => {
      if (!(w.t >= 0)) errors.push(`关卡 ${levelId} 波次 ${i}：t 必须 >= 0`)
      if (w.t <= prev) errors.push(`关卡 ${levelId} 波次 ${i}：t 必须严格递增`)
      prev = w.t
      if (!w.lanes.length) errors.push(`关卡 ${levelId} 波次 ${i}：lanes 不能为空`)
      if (new Set(w.lanes).size !== w.lanes.length) errors.push(`关卡 ${levelId} 波次 ${i}：lanes 有重复`)
      w.lanes.forEach((lane) => {
        if (!Number.isInteger(lane) || lane < 0 || lane >= BOARD.lanes) {
          errors.push(`关卡 ${levelId} 波次 ${i}：lane ${lane} 越界（0..${BOARD.lanes - 1}）`)
        }
      })
      if (!ctx.zombies[w.zombie]) errors.push(`关卡 ${levelId} 波次 ${i}：僵尸不存在 ${w.zombie}`)
    })
  }

  raw.levels.forEach((l) => {
    if (!l.deckIds.length) errors.push(`关卡 ${l.id}：deckIds 为空`)
    l.deckIds.forEach((id) => {
      if (!ctx.decks[id]) errors.push(`关卡 ${l.id}：配对不存在 ${id}`)
    })
    if (new Set(l.deckIds).size !== l.deckIds.length) {
      warnings.push(`关卡 ${l.id}：deckIds 有重复项`)
    }
    waveIssues(l.waves, l.id)
    if (ctx.decks && l.deckIds.every((id) => ctx.decks[id])) {
      startReachable(l.deckIds, ctx).forEach((issue) => errors.push(`关卡 ${l.id}：${issue}（G4）`))
    }
    const cards = l.deckIds.length
    if (cards > 20) warnings.push(`关卡 ${l.id}：${cards} 张卡，手牌轮转会偏长`)
  })

  const longWords = raw.words.filter((w) => w.word.length >= 8).length
  if (raw.words.length && longWords / raw.words.length > 0.4) {
    warnings.push(`词长分布：${longWords}/${raw.words.length} 个词 ≥8 字母（>40%，抽屉压力偏大）`)
  }

  if (SUN.start <= 0) errors.push('SUN.start 必须 > 0')
  if (SUN.cap < SUN.start) errors.push('SUN.cap 不能小于起始阳光')

  return { errors, warnings }
}

export function assertContent(raw: RawContent): void {
  const { errors } = validateContent(raw)
  if (errors.length) {
    throw new Error(`D21 内容校验失败（${errors.length} 项）：\n- ${errors.join('\n- ')}`)
  }
}
