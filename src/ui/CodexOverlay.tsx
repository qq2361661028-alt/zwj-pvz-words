import { useEffect, useState } from 'react'
import { CharacterArt } from '../art/CharacterArt'
import { CTX, RAW } from '../content'
import { loadSave } from '../platform/save'
import { speakWord } from '../platform/speech'
import { SUN } from '../rules/constants'
import { reviewRows } from '../rules/review'
import { Button } from './Button'
import './codex.css'

export type CodexTab = 'plants' | 'zombies' | 'words' | 'review'

type Props = { initialTab: CodexTab; onClose: () => void }

const TABS: { id: CodexTab; label: string }[] = [
  { id: 'plants', label: '植物' },
  { id: 'zombies', label: '僵尸' },
  { id: 'words', label: '单词' },
  { id: 'review', label: '复习' }
]

const SLOT_LABEL = { producer: '产阳光', shooter: '远程攻击', defense: '挡在前面' } as const

const pad = (n: number) => String(n).padStart(2, '0')

function formatTime(ts: number): string {
  if (!ts || ts < 1_000_000_000) return '—'
  const d = new Date(ts * 1000)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function CodexOverlay({ initialTab, onClose }: Props) {
  const [tab, setTab] = useState<CodexTab>(initialTab)
  const [save] = useState(() => loadSave())

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const firstWave = (zombieId: string): number | null => {
    const times = Object.values(CTX.levels).flatMap((level) =>
      level.waves.filter((wave) => wave.zombie === zombieId).map((wave) => wave.t)
    )
    return times.length ? Math.min(...times) : null
  }

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label="图鉴与复习"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="codex wood">
        <div className="codex__head">
          <h2 className="codex__title display">图鉴与复习</h2>
          <div className="codex__tabs" role="tablist" aria-label="图鉴分类">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`codex__tab ${tab === item.id ? 'is-on' : ''}`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>关闭</Button>
        </div>

        <div className="codex__body">
          {tab === 'plants' && (
            <div className="codex__grid">
              {RAW.plants.map((plant) => {
                const words = Object.values(CTX.decks)
                  .filter((deck) => deck.plantId === plant.id)
                  .map((deck) => CTX.words[deck.wordId]?.word)
                  .filter((word): word is string => Boolean(word))
                return (
                  <article key={plant.id} className="codex-card">
                    <CharacterArt art={plant.art} tier="l" size={112} alt={plant.name} lazy />
                    <h3>{plant.name}</h3>
                    <p className="codex-card__sub">
                      {SLOT_LABEL[plant.slot]} · {plant.cost} 阳光
                    </p>
                    <dl className="codex-card__stats">
                      <div><dt>HP</dt><dd>{plant.hp}</dd></div>
                      <div><dt>DPS</dt><dd>{plant.dps}</dd></div>
                      {plant.slot === 'producer' && (
                        <div><dt>产光</dt><dd>+{plant.produce_amount ?? SUN.produce_amount}</dd></div>
                      )}
                    </dl>
                    <p className="codex-card__words">
                      登场词：{words.length ? words.join(' / ') : '—'}
                    </p>
                  </article>
                )
              })}
            </div>
          )}

          {tab === 'zombies' && (
            <div className="codex__grid">
              {RAW.zombies.map((zombie) => {
                const wave = firstWave(zombie.id)
                return (
                  <article key={zombie.id} className="codex-card">
                    <CharacterArt art={zombie.art} tier="l" size={112} alt={zombie.name} lazy />
                    <h3>{zombie.name}</h3>
                    <p className="codex-card__sub">首次出现：{wave === null ? '—' : `${wave}s`}</p>
                    <dl className="codex-card__stats">
                      <div><dt>HP</dt><dd>{zombie.hp}</dd></div>
                      <div><dt>速度</dt><dd>{zombie.speed.toFixed(2)}</dd></div>
                      <div><dt>DPS</dt><dd>{zombie.dps}</dd></div>
                    </dl>
                    <p className="codex-card__words">每 {zombie.speed.toFixed(2)} 格/秒向左推进</p>
                  </article>
                )
              })}
            </div>
          )}

          {tab === 'words' && (
            <div className="codex__grid">
              {RAW.words.map((word) => {
                const stat = save.word_stats[word.id]
                return (
                  <article key={word.id} className="codex-card codex-card--word">
                    <h3>{word.word}</h3>
                    <p className="codex-card__sub">{word.zh} · {word.ipa}</p>
                    <p className="codex-card__words">
                      {word.grade} 年级 · {word.unit} · {word.letters} 字母
                    </p>
                    <p className="codex-card__words">
                      {stat
                        ? `正确 ${stat.correct} · 错误 ${stat.wrong} · 提示 ${stat.assisted}`
                        : '还没练过'}
                    </p>
                    <button
                      type="button"
                      className="codex__speak"
                      disabled={!save.settings.speech_enabled}
                      title={save.settings.speech_enabled ? '朗读单词' : '在设置里打开朗读'}
                      onClick={() => {
                        speakWord(word.word)
                      }}
                    >
                      朗读
                    </button>
                  </article>
                )
              })}
            </div>
          )}

          {tab === 'review' && (
            <div className="codex__review">
              {reviewRows(save, RAW.words).length === 0 ? (
                <p className="codex__empty">还没有学习记录，去拼几个单词吧</p>
              ) : (
                <table className="codex-table">
                  <thead>
                    <tr>
                      <th>单词</th><th>正确</th><th>错误</th><th>提示</th><th>连对</th><th>最近</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewRows(save, RAW.words).map((row) => (
                      <tr key={row.wordId}>
                        <td>{row.word}<span>{row.zh}</span></td>
                        <td>{row.correct}</td>
                        <td>{row.wrong}</td>
                        <td>{row.assisted}</td>
                        <td>{row.streak}</td>
                        <td>{formatTime(row.lastSeen)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
