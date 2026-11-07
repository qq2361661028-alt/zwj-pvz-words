import { useEffect } from 'react'
import { music, type BgmName } from '../platform/music'

export function useBgm(track: BgmName) {
  useEffect(() => {
    music.play(track)
  }, [track])
}
