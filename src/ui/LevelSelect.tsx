import { PLANT_ART } from '../art/PlantArt'
import { LockIcon, StarIcon } from '../art/Icons'
import { CTX } from '../content'
import { GrassTufts, House, Sky } from './scenery/Scenery'
import './level.css'

type Props = { onStart: (levelId: string) => void }

const SOON = [
  { name: '夜色前院', sub: 'M1 · 夜间关卡' },
  { name: '泳池边', sub: 'M2 · 新地形' },
  { name: '屋顶', sub: 'M3 · 语音判定' }
]

export function LevelSelect({ onStart }: Props) {
  const levels = Object.values(CTX.levels)
  const first = levels[0]
  const Sprout = PLANT_ART.sprout
  const Slinger = PLANT_ART.slinger
  const Bush = PLANT_ART.bush

  return (
    <div className="levels">
      <Sky />
      <House />
      <GrassTufts count={20} />
      <div className="levels__ground" />

      <div className="levels__board wood">
        <h1 className="levels__title display stroke-text">拼词小院</h1>
        <p className="levels__sub">拼出单词 · 种下植物 · 守住小院</p>
        <div className="levels__divider" />

        <div className="levels__row">
          {first && (
            <button type="button" className="level-card is-open" onClick={() => onStart(first.id)}>
              <span className="level-card__badge">1</span>
              <span className="level-card__scene">
                <span style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                  <Bush size={54} />
                  <Slinger size={64} />
                  <Sprout size={58} />
                </span>
              </span>
              <h3 className="level-card__name">Unit 3</h3>
              <p className="level-card__sub">第 1 关 · 三株苗木</p>
              <span className="level-card__stars" aria-label="尚未获得星星">
                <StarIcon filled={false} />
                <StarIcon filled={false} />
                <StarIcon filled={false} />
              </span>
              <span className="level-card__foot">
                <span className="pvz-btn pvz-btn--leaf pvz-btn--sm level-card__cta">
                  <span className="pvz-btn__face">
                    <span className="pvz-btn__label">出发</span>
                  </span>
                </span>
              </span>
            </button>
          )}

          {SOON.map((s, i) => (
            <div key={s.name} className="level-card is-locked" aria-disabled="true">
              <span className="level-card__badge">{i + 2}</span>
              <span className="level-card__scene">
                <LockIcon size={54} />
              </span>
              <h3 className="level-card__name">{s.name}</h3>
              <p className="level-card__sub">{s.sub}</p>
              <span className="level-card__stars">
                <StarIcon filled={false} />
                <StarIcon filled={false} />
                <StarIcon filled={false} />
              </span>
              <span className="level-card__foot">
                <span className="level-card__lock">
                  <LockIcon size={22} />
                  施工中
                </span>
              </span>
            </div>
          ))}
        </div>

        <div className="levels__foot">M0 垂直切片 · 1 关 / 3 株 / 8 词</div>
      </div>
    </div>
  )
}
