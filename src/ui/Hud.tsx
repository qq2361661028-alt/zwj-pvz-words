import { FlagIcon, SunIcon } from '../art/Icons'
import { Button } from './Button'

type Props = {
  sun: number
  sunDelta: { v: number; k: number } | null
  levelName: string
  spawned: number
  totalWaves: number
  onExit: () => void
}

export function Hud({ sun, sunDelta, levelName, spawned, totalWaves, onExit }: Props) {
  const pct = totalWaves ? Math.min(100, (spawned / totalWaves) * 100) : 0

  return (
    <div className="hud">
      <div className="sun-pill" aria-live="polite" aria-label={`阳光 ${sun}`}>
        <SunIcon size={28} />
        <span className="sun-pill__num">{sun}</span>
        {sunDelta && (
          <span key={sunDelta.k} className="sun-pill__float">
            +{sunDelta.v}
          </span>
        )}
      </div>

      <span className="hud__level">{levelName}</span>
      <div className="hud__spacer" />

      <div className="progress" aria-label={`波次 ${Math.min(spawned + 1, totalWaves)} / ${totalWaves}`}>
        <FlagIcon />
        <div className="progress__track">
          <div className="progress__fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="progress__wave">
          {Math.min(spawned + 1, totalWaves)} / {totalWaves}
        </span>
      </div>

      <Button variant="ghost" size="sm" className="hud__exit" onClick={onExit}>
        退出
      </Button>
    </div>
  )
}
