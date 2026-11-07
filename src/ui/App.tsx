import { useEffect, useState } from 'react'
import { GameScreen } from './GameScreen'
import { LevelSelect } from './LevelSelect'
import { VIEW } from './layout'

type Route =
  | { screen: 'levels' }
  | { screen: 'game'; levelId: string; run: number }

function calcScale(): number {
  const w = window.innerWidth
  const h = window.innerHeight
  return Math.min(w / VIEW.w, h / VIEW.h)
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
  const scale = useStageScale()

  return (
    <div className="viewport">
      <div className="stage" style={{ transform: `scale(${scale})` }} data-scale={scale.toFixed(3)}>
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
    </div>
  )
}
