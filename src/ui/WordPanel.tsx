import { hintedTileIds } from '../rules/cards'
import { AVAILABILITY_REASON, type SpeechAvailability } from '../rules/speechJudge'
import type { Card, WordDef } from '../rules/types'

type Props = {
  card: Card
  word: WordDef
  now: number
  plantName: string
  shakeKey: number
  voice: {
    availability: SpeechAvailability
    listening: boolean
    onVoice: () => void
  }
  onTile: (tileId: number) => void
  onCollapse: () => void
  onReopen: () => void
  open: boolean
}

export function WordPanel({
  card,
  word,
  now,
  plantName,
  shakeKey,
  voice,
  onTile,
  onCollapse,
  onReopen,
  open
}: Props) {
  if (!open) {
    return (
      <div className="wordpanel wordpanel--closed">
        <div>
          <div className="wordpanel__closed-title">{word.zh} · 填词面板已收起</div>
          <div className="wordpanel__closed-hint">收起来时僵尸走得更快，点下面的卡继续拼</div>
        </div>
        <button type="button" className="pvz-btn pvz-btn--sm pvz-btn--leaf" onClick={onReopen}>
          <span className="pvz-btn__face">
            <span className="pvz-btn__label">继续拼词</span>
          </span>
        </button>
      </div>
    )
  }

  const armed = card.status === 'armed'
  const target = card.slots[card.filled]
  const hinted = new Set(hintedTileIds(card))
  const { availability, listening, onVoice } = voice
  const voiceBlocked = availability !== 'ok'
  const voiceNote = voiceBlocked
    ? AVAILABILITY_REASON[availability]
    : card.voiceBuffed
      ? '语音加成已备好，种下就生效'
      : ''

  return (
    <div key={shakeKey} className={`wordpanel ${shakeKey ? 'is-shaking' : ''}`}>
      <div className="wordpanel__head">
        <span className="wordpanel__title">
          {armed ? '拼好啦！' : '拼出这个单词'}
        </span>
        <span className="wordpanel__zh">{word.zh}</span>
        <span className={`wordpanel__ipa ${card.ladderLevel >= 1 ? 'is-hint' : ''}`}>{word.ipa}</span>
        <span className="wordpanel__voice">
          <button
            type="button"
            className={[
              'wordpanel__mic',
              listening ? 'is-listening' : '',
              card.voiceBuffed ? 'is-done' : ''
            ].join(' ')}
            disabled={voiceBlocked || listening || card.voiceBuffed || card.status === 'dormant'}
            title={
              voiceBlocked
                ? AVAILABILITY_REASON[availability]
                : card.voiceBuffed
                  ? '这株植物的加成已经备好了'
                  : '读出这个单词，种下后 10 秒攻击 ×1.25'
            }
            onClick={onVoice}
          >
            {listening ? '正在听…' : card.voiceBuffed ? '加成已备' : '跟读加成'}
          </button>
        </span>
        <button type="button" className="wordpanel__hint" onClick={onCollapse} style={{ cursor: 'pointer' }}>
          收起 ▾
        </button>
      </div>

      <div className="wordpanel__slots">
        {card.slots.map((ch, i) => (
          <span
            key={i}
            className={[
              'wslot',
              i < card.filled ? 'is-filled' : '',
              i === card.filled && !armed ? 'is-active' : ''
            ].join(' ')}
          >
            {i < card.filled ? ch : ''}
          </span>
        ))}
      </div>

      <div className="wordpanel__tiles">
        {card.tiles.map((tile) => {
          const cooling = tile.disabledUntil > now
          return (
            <button
              key={tile.tileId}
              type="button"
              className={[
                'wtile',
                tile.used ? 'is-used' : '',
                cooling ? 'is-disabled' : '',
                hinted.has(tile.tileId) ? 'is-hint' : ''
              ].join(' ')}
              disabled={tile.used || cooling || armed}
              onClick={() => onTile(tile.tileId)}
              aria-label={`字母 ${tile.letter}`}
            >
              {tile.letter}
              {cooling && <span className="wtile__cool">{Math.ceil(tile.disabledUntil - now)}</span>}
            </button>
          )
        })}
      </div>

      <div className="wordpanel__foot">
        <span>
          {armed
            ? `点草坪种下一株${plantName}`
            : `第 ${Math.min(card.filled + 1, card.slots.length)} / ${card.slots.length} 个字母`}
        </span>
        <span className={voiceBlocked || card.wrongStreak > 0 ? 'bad' : ''}>
          {voiceNote ||
            (card.assisted
              ? '已用提示'
              : card.wrongStreak > 0
                ? `连错 ${card.wrongStreak} 次，别急`
                : target ? '按顺序点字母块' : '')}
        </span>
      </div>
    </div>
  )
}
