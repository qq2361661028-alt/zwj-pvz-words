import { CharacterArt } from '../art/CharacterArt'
import { SunIcon } from '../art/Icons'
import type { Card, PlantDef } from '../rules/types'

type Props = {
  card: Card
  plant: PlantDef
  index: number
  isFocus: boolean
  affordable: boolean
  onTap: () => void
}

const STATUS: Record<Card['status'], string> = {
  locked: '等待中',
  filling: '填词中',
  armed: '点草坪种下',
  placed: '已种下',
  dormant: '暂不可用'
}

export function HandCard({ card, plant, index, isFocus, affordable, onTap }: Props) {
  const mask = card.slots.map((ch, i) => (i < card.filled ? ch : '·')).join('')

  return (
    <button
      type="button"
      className={[
        'hand__card',
        isFocus ? 'is-focus' : '',
        card.status === 'armed' ? 'is-armed' : '',
        card.status === 'locked' || card.status === 'dormant' ? 'is-locked' : ''
      ].join(' ')}
      onClick={onTap}
      aria-label={`${plant.name}，${card.slots.length} 个字母，${STATUS[card.status]}`}
    >
      <span className="hand__index">{index + 1}</span>
      <span className="hand__art">
        <CharacterArt art={plant.art} tier="c" size={58} />
      </span>
      <span className="hand__name">{plant.name}</span>
      <span className="hand__zh">{plant.slot === 'producer' ? '产阳光' : plant.slot === 'shooter' ? '远程攻击' : '挡在前面'}</span>
      <span className={`hand__cost ${affordable ? '' : 'is-poor'}`}>
        <SunIcon size={15} />
        {plant.cost}
      </span>
      <span className="hand__word">{mask}</span>
      <span
        className={[
          'hand__status',
          card.status === 'armed' ? 'is-armed' : '',
          card.status === 'filling' ? 'is-focus' : '',
          card.status === 'locked' ? 'is-locked' : ''
        ].join(' ')}
      >
        {STATUS[card.status]}
      </span>
    </button>
  )
}
