import type { Card, WordDef } from '../rules/types'

type Props = {
  card: Card
  word: WordDef
  now: number
  plantName: string
  shakeKey: number
  onTile: (tileId: number) => void
  onCollapse: () => void
  onReopen: () => void
  open: boolean
}

export function WordPanel({ card, word, now, plantName, shakeKey, onTile, onCollapse, onReopen, open }: Props) {
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

  return (
    <div key={shakeKey} className={`wordpanel ${shakeKey ? 'is-shaking' : ''}`}>
      <div className="wordpanel__head">
        <span className="wordpanel__title">
          {armed ? '拼好啦！' : '拼出这个单词'}
        </span>
        <span className="wordpanel__zh">{word.zh}</span>
        <span className="wordpanel__ipa">{word.ipa}</span>
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
                cooling ? 'is-disabled' : ''
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
        <span className={card.wrongStreak > 0 ? 'bad' : ''}>
          {card.wrongStreak > 0 ? `连错 ${card.wrongStreak} 次，别急` : target ? '按顺序点字母块' : ''}
        </span>
      </div>
    </div>
  )
}
