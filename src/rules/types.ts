export type PlantSlot = 'producer' | 'shooter' | 'defense'
export type Theme = 'plant' | 'unit' | 'review'
export type CardStatus = 'locked' | 'filling' | 'armed' | 'placed' | 'dormant'
export type Outcome = 'death' | 'cleared' | 'abandoned'

export type PlantDef = {
  id: string
  name: string
  art: string
  cost: number
  hp: number
  dps: number
  slot: PlantSlot
  generic: boolean
  unlocked_by_default: boolean
  /** 覆盖 SUN.produce_amount；仅 producer 可用 */
  produce_amount?: number
}

export type WordDef = {
  id: string
  word: string
  zh: string
  ipa: string
  grade: number
  unit: string
  letters: number
  distractor_overrides?: string[]
}

export type DeckDef = {
  id: string
  wordId: string
  plantId: string
  theme: Theme
}

export type ZombieDef = {
  id: string
  name: string
  hp: number
  speed: number
  dps: number
}

export type WaveDef = {
  t: number
  zombie: string
  lanes: number[]
  flag?: boolean
}

export type LevelDef = {
  id: string
  name: string
  deckIds: string[]
  waves: WaveDef[]
}

export type Ctx = {
  plants: Record<string, PlantDef>
  words: Record<string, WordDef>
  decks: Record<string, DeckDef>
  zombies: Record<string, ZombieDef>
  levels: Record<string, LevelDef>
}

export type Tile = {
  tileId: number
  letter: string
  used: boolean
  /** 秒；填错过则该时刻之前不再响应 */
  disabledUntil: number
}

export type Card = {
  instanceId: number
  wordId: string
  plantId: string
  theme: Theme
  slots: string[]
  filled: number
  status: CardStatus
  assisted: boolean
  tiles: Tile[]
  wrongStreak: number
  wrongTotal: number
  ladderLevel: number
  /** 跟读通过：种下时挂 10 秒攻击加成 */
  voiceBuffed: boolean
}

export type Plant = {
  uid: number
  plantId: string
  lane: number
  col: number
  hp: number
  maxhp: number
  /** 秒：下一次产阳光时刻；非 producer 无意义 */
  nextProduceAt: number
  /** 秒：语音加成到期时刻；undefined = 从未加成 */
  buffUntil?: number
  /** 秒：同一株下次可加成的时刻（30s 冷却） */
  voiceReadyAt?: number
}

export type Zombie = {
  uid: number
  zombieId: string
  lane: number
  /** 格坐标：0 = 草坪最左列左缘，9 = 最右列右缘 */
  x: number
  hp: number
  maxhp: number
  flag: boolean
}

export type Event =
  | { type: 'filled'; slot: number }
  | { type: 'armed'; plantId: string }
  | { type: 'wrong'; tileId: number }
  | { type: 'hint_ladder'; level: 1 | 2 }
  | { type: 'placed'; plantId: string; lane: number; col: number }
  | { type: 'focus_advanced' }
  | { type: 'sun_gained'; amount: number }
  | { type: 'zombie_spawned'; zombieId: string; lane: number }
  | { type: 'zombie_died' }
  | { type: 'plant_died'; plantId: string; lane: number; col: number }
  | { type: 'voice_buff'; plantId: string; lane: number; col: number }
  | { type: 'outcome'; kind: Outcome }

export type GameState = {
  levelId: string
  t: number
  sun: number
  cards: Card[]
  /** 下一张待发牌在 deckIds 里的下标 */
  deckCursor: number
  /** uid 发号器：植物与僵尸共用，保证实例唯一 */
  seq: number
  plants: Plant[]
  zombies: Zombie[]
  /** 已结算的波次数 */
  spawned: number
  panelOpen: boolean
  outcome: Outcome | null
}

export type StepResult = {
  state: GameState
  events: Event[]
}
