import { type CSSProperties, useEffect, useState } from 'react'
import { music } from '../platform/music'
import { loadSave } from '../platform/save'
import { GameScreen } from './GameScreen'
import { LevelSelect } from './LevelSelect'
import { RotateHint } from './RotateHint'
import { fitScale, stageBleed, stageTransform } from './layout'

type Route =
  | { screen: 'levels' }
  | { screen: 'game'; levelId: string; run: number }

function calcScale(): number {
  return fitScale(window.innerWidth, window.innerHeight)
}

function useStageScale(): number {
  const [scale, setScale] = useState(calcScale)
  useEffect(() => {
    const onResize = () => setScale(calcScale())
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])
  return scale
}

export default function App() {
  const [route, setRoute] = useState<Route>({ screen: 'levels' })
  useState(() => {
    const save = loadSave()
    music.setEnabled(save.settings.music_enabled)
    return save
  })
  const scale = useStageScale()
  const bleed = stageBleed(window.innerWidth, scale)
  const viewportStyle = { '--bleed': `${bleed}px` } as CSSProperties

  useEffect(() => {
    const unlock = () => music.unlock()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  return (
    <div className={`viewport viewport--${route.screen}`} style={viewportStyle}>
      <div className="stage" style={{ transform: stageTransform(scale) }} data-scale={scale.toFixed(3)}>
        {route.screen === 'levels' ? (
          <LevelSelect
            onStart={(levelId) => setRoute({ screen: 'game', levelId, run: 0 })}
          />
        ) : (
          <GameScreen
            key={`${route.levelId}:${route.run}`}
            levelId={route.levelId}
            onHome={() => setRoute({ screen: 'levels' })}
            onRetry={() => setRoute({ screen: 'game', levelId: route.levelId, run: route.run + 1 })}
          />
        )}
      </div>
      <RotateHint />
    </div>
  )
}
