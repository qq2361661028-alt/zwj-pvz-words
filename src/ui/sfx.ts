import type { Event } from '../rules/types'
import type { SfxName } from '../platform/audio'

export function sfxForEvent(event: Event): SfxName | null {
  switch (event.type) {
    case 'filled':
      return 'fill_ok'
    case 'wrong':
      return 'fill_wrong'
    case 'armed':
      return 'arm'
    case 'placed':
      return 'plant'
    case 'sun_gained':
      return 'sun_drop'
    case 'zombie_died':
      return 'zombie_die'
    default:
      return null
  }
}
