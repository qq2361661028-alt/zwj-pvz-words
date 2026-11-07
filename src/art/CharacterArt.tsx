import './character.css'

export type ArtTier = 's' | 'c' | 'l'

type Props = {
  art: string
  tier?: ArtTier
  size: number
  alt?: string
  className?: string
  lazy?: boolean
}

export function artSrc(base: string, tier: ArtTier): string {
  if (!base.endsWith('_s.png')) throw new Error(`art 路径必须以 _s.png 结尾：${base}`)
  return `/${base.replace(/_s\.png$/, `_${tier}.png`)}`
}

export function CharacterArt({ art, tier = 's', size, alt = '', className = '', lazy = false }: Props) {
  return (
    <img
      className={`character-art ${className}`.trim()}
      src={artSrc(art, tier)}
      width={size}
      height={size}
      alt={alt}
      loading={lazy ? 'lazy' : 'eager'}
      draggable={false}
    />
  )
}
