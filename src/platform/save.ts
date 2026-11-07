import { SAVE_KEY, emptySave, migrateSave, type SaveData } from '../rules/stats'

type ReadStorage = Pick<Storage, 'getItem'>
type WriteStorage = Pick<Storage, 'setItem'>
type StorageLike = ReadStorage & WriteStorage

function getStorage(): StorageLike | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

export function loadSave(storage: ReadStorage | undefined = getStorage()): SaveData {
  if (!storage) return emptySave()
  try {
    const raw = storage.getItem(SAVE_KEY)
    return raw ? migrateSave(JSON.parse(raw)) : emptySave()
  } catch {
    return emptySave()
  }
}

export function persistSave(save: SaveData, storage: WriteStorage | undefined = getStorage()): void {
  if (!storage) return
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch {
    // 隐私模式 / 配额满：存档失败不阻断游戏
  }
}

export function todayString(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
