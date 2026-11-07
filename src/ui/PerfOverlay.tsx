import { useEffect, useState } from 'react'
import { summarizeFrames } from './perf'

type Props = { plants: number; zombies: number }

export function PerfOverlay({ plants, zombies }: Props) {
  const [stats, setStats] = useState({ fps: 0, p95: 0 })

  useEffect(() => {
    let raf = 0
    let start = performance.now()
    let last = start
    let frames: number[] = []

    const loop = (now: number) => {
      frames.push(now - last)
      last = now
      if (now - start >= 500) {
        setStats(summarizeFrames(frames, now - start))
        frames = []
        start = now
      }
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="perf" aria-live="off">
      <span>FPS {stats.fps}</span>
      <span>p95 {stats.p95}ms</span>
      <span>植物 {plants} / 僵尸 {zombies}</span>
    </div>
  )
}
