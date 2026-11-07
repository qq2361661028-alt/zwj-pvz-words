import { useState } from 'react'
import { CharacterArt } from '../art/CharacterArt'
import { LockIcon, StarIcon } from '../art/Icons'
import { CTX } from '../content'
import { levelsTrack } from './bgm'
import { CodexOverlay, type CodexTab } from './CodexOverlay'
import { GrassTufts, House, Sky } from './scenery/Scenery'
import { SettingsOverlay } from './SettingsOverlay'
import { useBgm } from './useBgm'
import './level.css'

type Props = { onStart: (levelId: string) => void }

const SOON = [
  { name: '夜色前院', sub: '夜间关卡' },
  { name: '泳池边', sub: '新地形' },
  { name: '屋顶', sub: '语音判定' }
]

export function LevelSelect({ onStart }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [codexTab, setCodexTab] = useState<CodexTab | null>(null)
  useBgm(levelsTrack(settingsOpen, codexTab !== null))
  const levels = Object.values(CTX.levels)
  const first = levels[0]

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
                  <CharacterArt art={CTX.plants.bush.art} tier="c" size={54} />
                  <CharacterArt art={CTX.plants.slinger.art} tier="c" size={64} />
                  <CharacterArt art={CTX.plants.sprout.art} tier="c" size={58} />
                </span>
              </span>
              <h3 className="level-card__name">Unit 3</h3>
              <p className="level-card__sub">第 1 关 · 八株苗木</p>
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

        <div className="levels__foot">
          <span>当前可玩 · 1 关 / 8 株 / 13 词</span>
          <span className="levels__actions">
            <button type="button" className="levels__settings" onClick={() => setCodexTab('plants')}>
              图鉴
            </button>
            <button type="button" className="levels__settings" onClick={() => setCodexTab('review')}>
              复习
            </button>
            <button type="button" className="levels__settings" onClick={() => setSettingsOpen(true)}>
              设置
            </button>
          </span>
        </div>
      </div>
      {settingsOpen && <SettingsOverlay onClose={() => setSettingsOpen(false)} />}
      {codexTab && <CodexOverlay initialTab={codexTab} onClose={() => setCodexTab(null)} />}
    </div>
  )
}
