import { useCallback, useEffect, useRef, useState } from 'react'
import { PLANT_ART } from '../art/PlantArt'
import { ZombieArt, type ZombieVariant } from '../art/ZombieArt'
import { CTX } from '../content'
import { cellRect, laneToPx, xToPx } from './layout'
import { createAccumulator, newGame, tick } from '../rules/sim'
import { focusCard } from '../rules/cards'
import { onCellClick, onExit, onTileClick, plantingReject, setPanelOpen } from '../rules/play'
import { AVAILABILITY_REASON, type SpeechAvailability } from '../rules/speechJudge'
import { grantVoicePass } from '../rules/voice'
import { createSpeechProvider } from '../platform/speechRecognition'
import { speakWord } from '../platform/speech'
import { loadSave, persistSave, todayString } from '../platform/save'
import { recordWordResult, type SaveData } from '../rules/stats'
import type { Event, GameState } from '../rules/types'
import { Button } from './Button'
import { HandCard } from './HandCard'
import { Hud } from './Hud'
import { ResultOverlay } from './ResultOverlay'
import { WordPanel } from './WordPanel'
import { House, Sky } from './scenery/Scenery'
import './game.css'

type Props = { levelId: string; onHome: () => void; onRetry: () => void }
type Toast = { id: number; text: string; bad: boolean }

const ZOMBIE_VARIANT: Record<string, ZombieVariant> = {
  z_basic: 'basic',
  z_cone: 'cone',
  z_bucket: 'bucket',
  z_flag: 'flag'
}

export function GameScreen({ levelId, onHome, onRetry }: Props) {
  const level = CTX.levels[levelId]
  const [state, setState] = useState<GameState>(() => newGame(levelId, CTX))
  const stateRef = useRef(state)
  const accRef = useRef(createAccumulator())
  const [toasts, setToasts] = useState<Toast[]>([])
  const [sunDelta, setSunDelta] = useState<{ v: number; k: number } | null>(null)
  const [shakeKey, setShakeKey] = useState(0)
  const wrongRef = useRef(0)
  const toastSeq = useRef(0)
  const deltaSeq = useRef(0)
  const autoOpened = useRef<number | null>(null)
  const [initialSave] = useState(() => loadSave())
  const saveRef = useRef<SaveData>(initialSave)
  const assistedRef = useRef(0)
  const voicedRef = useRef(0)
  const [provider] = useState(() => createSpeechProvider())
  const [availability, setAvailability] = useState<SpeechAvailability>(() => provider.available())
  const [listening, setListening] = useState(false)

  useEffect(() => {
    const save = { ...saveRef.current, last_played: todayString() }
    saveRef.current = save
    persistSave(save)
  }, [])

  useEffect(() => {
    let alive = true
    provider.refreshPermission?.().then((a) => {
      if (alive) setAvailability(a)
    }).catch(() => {})
    return () => { alive = false }
  }, [provider])

  const record = useCallback((kind: 'correct' | 'wrong' | 'assisted', wordId: string) => {
    const next = recordWordResult(saveRef.current, wordId, kind, stateRef.current.t)
    saveRef.current = next
    persistSave(next)
    if (kind === 'assisted') assistedRef.current += 1
  }, [])

  const pushToast = useCallback((text: string, bad = false) => {
    const id = ++toastSeq.current
    setToasts((list) => [...list.slice(-2), { id, text, bad }])
    window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id))
    }, 1900)
  }, [])

  const apply = useCallback((events: readonly Event[]) => {
    for (const e of events) {
      if (e.type === 'wrong') {
        const wordId = focusCard(stateRef.current.cards)?.wordId
        if (wordId) record('wrong', wordId)
        wrongRef.current += 1
        setShakeKey((k) => k + 1)
        pushToast('这个字母不对，换一个试试', true)
      } else if (e.type === 'hint_ladder') {
        const focus = focusCard(stateRef.current.cards)
        const focusWord = focus ? CTX.words[focus.wordId] : undefined
        if (e.level === 2 && focus) record('assisted', focus.wordId)
        if (e.level === 1 && focusWord) {
          if (saveRef.current.settings.speech_enabled) speakWord(focusWord.word)
          pushToast(`听一听：${focusWord.ipa}`)
        } else if (e.level === 2) {
          pushToast('看，亮起来的字母就是下一个')
        }
      } else if (e.type === 'sun_gained') {
        setSunDelta({ v: e.amount, k: ++deltaSeq.current })
      } else if (e.type === 'armed') {
        const wordId = focusCard(stateRef.current.cards)?.wordId
        if (wordId) record('correct', wordId)
        pushToast('拼好啦！点草坪种下去')
      } else if (e.type === 'plant_died') {
        pushToast('一株植物被啃掉了…', true)
      } else if (e.type === 'voice_buff') {
        voicedRef.current += 1
        pushToast('语音加成生效：攻击 ×1.25')
      } else if (e.type === 'outcome' && e.kind === 'cleared') {
        pushToast('僵尸清空了！')
      }
    }
  }, [pushToast, record])

  // 定步长逻辑 + 帧率无关的渲染循环（D18）
  useEffect(() => {
    let last = performance.now()
    let raf = 0
    const acc = accRef.current
    const frame = (now: number) => {
      const elapsed = Math.min(1, Math.max(0, (now - last) / 1000))
      last = now
      const prev = stateRef.current
      if (!prev.outcome) {
        let s = prev
        const events: Event[] = []
        acc.push(elapsed, (dt) => {
          const r = tick(s, dt, CTX)
          s = r.state
          events.push(...r.events)
        })
        if (s !== prev) {
          stateRef.current = s
          setState(s)
        }
        if (events.length) apply(events)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [apply])

  const commit = useCallback((next: GameState, events: readonly Event[]) => {
    if (next !== stateRef.current) {
      stateRef.current = next
      setState(next)
    }
    if (events.length) apply(events)
  }, [apply])

  const focus = focusCard(state.cards)
  const focusId = focus?.instanceId
  const focusStatus = focus?.status

  // 新焦点卡出现时自动展开面板（D17 的减速由此开关）
  useEffect(() => {
    if (focusId == null || focusStatus !== 'filling') return
    if (autoOpened.current === focusId) return
    autoOpened.current = focusId
    if (!stateRef.current.panelOpen) {
      const next = setPanelOpen(stateRef.current, true)
      stateRef.current = next
      setState(next)
    }
  }, [focusId, focusStatus])

  const openPanel = (open: boolean) => {
    const next = setPanelOpen(stateRef.current, open)
    stateRef.current = next
    setState(next)
  }

  const onTile = (tileId: number) => {
    const r = onTileClick(stateRef.current, tileId, CTX)
    commit(r.state, r.events)
  }

  const onCell = (lane: number, col: number) => {
    const s = stateRef.current
    const reject = plantingReject(s, lane, col, CTX)
    if (reject) {
      if (reject === 'no_sun') pushToast('阳光不够，等等苗木产光', true)
      else if (reject === 'occupied') pushToast('这块地已经种了', true)
      else if (reject === 'not_armed') pushToast('先把最左边的单词拼完', true)
      return
    }
    const r = onCellClick(s, lane, col, CTX)
    commit(r.state, r.events)
  }

  const onVoice = async () => {
    const card = focusCard(stateRef.current.cards)
    if (!card || card.voiceBuffed || card.status === 'placed' || card.status === 'dormant') return
    const word = CTX.words[card.wordId]
    setListening(true)
    const result = await provider.recognize(word.word, { timeoutMs: 8000 })
    setListening(false)
    const av = provider.available()
    setAvailability(av)

    const current = stateRef.current.cards.find((c) => c.instanceId === card.instanceId)
    if (!current || current.status === 'placed' || current.status === 'dormant') return

    if (result.verdict === 'pass') {
      const next = grantVoicePass(stateRef.current, card.instanceId)
      if (next !== stateRef.current) {
        stateRef.current = next
        setState(next)
      }
      pushToast('读得真好！这株植物的加成备好了')
    } else if (result.verdict === 'no_speech') {
      pushToast('没听清，再试一次')
    } else if (result.verdict === 'fail') {
      record('wrong', card.wordId)
      pushToast('再读一遍试试', true)
    } else if (av === 'denied') {
      pushToast(AVAILABILITY_REASON.denied, true)
    } else {
      pushToast('语音没连上，再试一次', true)
    }
  }

  const exit = () => {
    const r = onExit(stateRef.current)
    commit(r.state, r.events)
  }

  const occupied = new Set(state.plants.map((p) => p.lane * 9 + p.col))
  const armed = focus?.status === 'armed'
  const danger = state.zombies.some((z) => z.x < 2.4)
  const placedCount = state.deckCursor - state.cards.length
  const word = focus ? CTX.words[focus.wordId] : undefined
  const focusPlant = focus ? CTX.plants[focus.plantId] : undefined

  return (
    <div className={`game ${danger ? 'is-danger' : ''}`}>
      <Sky />
      <House />
      <div className="game__field" aria-hidden="true" />

      <div className="game__grid" role="grid" aria-label="草坪 5 行 9 列">
        {Array.from({ length: 45 }, (_, i) => {
          const lane = Math.floor(i / 9)
          const col = i % 9
          const isOccupied = occupied.has(i)
          const hot = armed && !isOccupied
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              className={[
                'game__cell',
                (lane + col) % 2 === 0 ? 'game__cell--a' : 'game__cell--b',
                hot ? 'is-hot' : '',
                armed && isOccupied ? 'is-blocked' : ''
              ].join(' ')}
              aria-label={`第 ${lane + 1} 行第 ${col + 1} 列${isOccupied ? '，已种植' : ''}`}
              onClick={() => onCell(lane, col)}
            />
          )
        })}
      </div>

      <div className="game__plants" aria-hidden="true">
        {state.plants.map((p) => {
          const Art = PLANT_ART[p.plantId as keyof typeof PLANT_ART]
          const r = cellRect(p.lane, p.col)
          const buffed = p.buffUntil !== undefined && p.buffUntil > state.t
          return (
            <span
              key={p.uid}
              className={['placed', buffed ? 'is-buffed' : ''].join(' ')}
              style={{ left: r.x + (r.w - 78) / 2, top: r.y + (r.h - 78) / 2 }}
            >
              {Art ? <Art size={78} /> : null}
            </span>
          )
        })}
      </div>

      <div className="game__zombies" aria-hidden="true">
        {state.zombies.map((z) => (
          <span
            key={z.uid}
            className="zombie"
            style={{ left: xToPx(z.x), top: laneToPx(z.lane) - 72 }}
          >
            <ZombieArt size={104} variant={ZOMBIE_VARIANT[z.zombieId] ?? 'basic'} />
            {z.hp < z.maxhp && (
              <span className="zombie__hp">
                <span style={{ width: `${Math.max(0, (z.hp / z.maxhp) * 100)}%` }} />
              </span>
            )}
          </span>
        ))}
      </div>

      <Hud
        sun={state.sun}
        sunDelta={sunDelta}
        levelName={level.name}
        spawned={state.spawned}
        totalWaves={level.waves.length}
        onExit={exit}
      />

      <div className="toasts">
        {toasts.map((t) => (
          <span key={t.id} className={`toast ${t.bad ? 'toast--bad' : ''}`}>
            {t.text}
          </span>
        ))}
      </div>

      <div className="drawer wood">
        <div className="drawer__inner">
          <div className="hand">
            {state.cards.length === 0 && (
              <div style={{ color: '#ffe9be', fontWeight: 900, padding: '60px 20px', fontSize: 15 }}>
                手牌用完啦 —— 守住这几秒就通关！
              </div>
            )}
            {state.cards.map((card, i) => {
              const plant = CTX.plants[card.plantId]
              return (
                <HandCard
                  key={card.instanceId}
                  card={card}
                  plant={plant}
                  index={i}
                  isFocus={i === 0}
                  affordable={state.sun >= plant.cost}
                  onTap={() => {
                    if (i > 0) {
                      pushToast('只能先拼最左边的那张卡', true)
                      return
                    }
                    if (card.status === 'armed') pushToast('点草坪，把这株种下去')
                    else openPanel(true)
                  }}
                />
              )
            })}
          </div>

          {focus && word && focusPlant ? (
            <WordPanel
              card={focus}
              word={word}
              now={state.t}
              plantName={focusPlant.name}
              shakeKey={shakeKey}
              voice={{ availability, listening, onVoice }}
              onTile={onTile}
              onCollapse={() => openPanel(false)}
              onReopen={() => openPanel(true)}
              open={state.panelOpen}
            />
          ) : (
            <div className="wordpanel wordpanel--closed">
              <div>
                <div className="wordpanel__closed-title">没有待拼的单词了</div>
                <div className="wordpanel__closed-hint">植物会自动攻击，等最后一波结束</div>
              </div>
              <Button variant="ghost" size="sm" onClick={onHome}>
                回到小院
              </Button>
            </div>
          )}
        </div>
      </div>

      {state.outcome && (
        <ResultOverlay
          outcome={state.outcome}
          time={state.t}
          placed={placedCount}
          wrong={wrongRef.current}
          assisted={assistedRef.current}
          voiced={voicedRef.current}
          onRetry={onRetry}
          onHome={onHome}
        />
      )}
    </div>
  )
}
