import type { Outcome } from '../rules/types'
import { Button } from './Button'

type Props = {
  outcome: Exclude<Outcome, never>
  time: number
  placed: number
  wrong: number
  onRetry: () => void
  onHome: () => void
}

const COPY = {
  cleared: { title: '通关啦！', sub: '小院守住了，单词也全拼对了', bad: false },
  death: { title: '小院失守', sub: '僵尸走进了屋里。再试一次吧', bad: true },
  abandoned: { title: '先歇一会儿', sub: '已退出本关，成绩不计入错词', bad: false }
} as const

export function ResultOverlay({ outcome, time, placed, wrong, onRetry, onHome }: Props) {
  const copy = COPY[outcome]
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={copy.title}>
      <div className="result wood">
        <h2 className={`result__title display stroke-text ${copy.bad ? 'is-bad' : ''}`}>{copy.title}</h2>
        <p className="result__sub">{copy.sub}</p>

        <div className="result__stats">
          <span className="result__stat">
            <b>{Math.floor(time)}s</b>
            <span>用了多久</span>
          </span>
          <span className="result__stat">
            <b>{placed}</b>
            <span>种下植物</span>
          </span>
          <span className="result__stat">
            <b>{wrong}</b>
            <span>点错字母</span>
          </span>
        </div>

        <div className="result__actions">
          {outcome !== 'abandoned' && (
            <Button variant="leaf" onClick={onRetry}>
              再试一次
            </Button>
          )}
          <Button variant={outcome === 'abandoned' ? 'leaf' : 'wood'} onClick={onHome}>
            回到小院
          </Button>
        </div>
      </div>
    </div>
  )
}
