import { CharacterArt } from '../art/CharacterArt'
import { FlagIcon, SunIcon } from '../art/Icons'
import { Button } from './Button'

export type HudWave = {
  art: string
  name: string
  t: number
}

export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

type Props = {
  sun: number
  sunDelta: { v: number; k: number } | null
  levelName: string
  spawned: number
  totalWaves: number
  waves: readonly HudWave[]
  time: number
  onExit: () => void
}

export function Hud({ sun, sunDelta, levelName, spawned, totalWaves, waves, time, onExit }: Props) {
  const pct = totalWaves ? Math.min(100, (spawned / totalWaves) * 100) : 0
  const clock = formatClock(time)

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

      <div className="hud__timer" role="timer" aria-label={`本关用时 ${clock}`}>
        {clock}
      </div>

      <div className="hud__spacer" />

      <div className="progress" aria-label={`波次 ${Math.min(spawned + 1, totalWaves)} / ${totalWaves}`}>
        <FlagIcon />
        <div className="progress__track">
          <div className="progress__fill" style={{ width: `${pct}%` }} />
          {waves.map((wave, i) => (
            <span
              key={`${wave.t}-${i}`}
              className={[
                'progress__zombie',
                i < spawned ? 'is-passed' : '',
                i === spawned ? 'is-next' : ''
              ].join(' ')}
              style={{ left: `${((i + 0.5) / (totalWaves || 1)) * 100}%` }}
              title={`第 ${i + 1} 波 · ${formatClock(wave.t)} · ${wave.name}`}
            >
              <CharacterArt art={wave.art} size={20} />
            </span>
          ))}
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