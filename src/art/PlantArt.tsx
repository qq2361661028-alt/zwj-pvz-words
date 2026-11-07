import { useId, type ReactNode } from 'react'

/** 统一描边色，所有插画共用，保证轮廓一致性 */
export const INK = '#2b1a0b'

export type ArtProps = { size?: number; className?: string }

function Art({ size = 96, className, children }: ArtProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

function useUid() {
  return useId().replace(/:/g, '')
}

/** 地面投影 */
function Shadow() {
  return <ellipse cx="60" cy="112" rx="34" ry="7" fill="rgba(30, 60, 10, 0.22)" />
}

/* ------------------------------------------------------------------ */
/*  阳光苗：一株会发光的小芽（producer）                                */
/* ------------------------------------------------------------------ */
export function SproutArt(props: ArtProps) {
  const u = useUid()
  return (
    <Art {...props}>
      <defs>
        <radialGradient id={`${u}bud`} cx="36%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#fff8c4" />
          <stop offset="52%" stopColor="#ffd647" />
          <stop offset="100%" stopColor="#e09a0d" />
        </radialGradient>
      </defs>
      <Shadow />
      <g stroke={INK} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M60 112 C 58 94 58 78 60 64" fill="none" strokeWidth="9" stroke="#4f8a24" />
        <path d="M60 112 C 58 94 58 78 60 64" fill="none" strokeWidth="4" stroke={INK} />
        <path
          d="M60 88 C 42 86 30 74 28 60 C 44 58 58 70 60 88 Z"
          fill="#7dc63f"
        />
        <path
          d="M60 94 C 78 92 90 80 92 66 C 76 64 62 76 60 94 Z"
          fill="#8fd84e"
        />
        <path d="M34 64 C 42 72 50 80 56 84" fill="none" stroke="#4f8a24" strokeWidth="2.6" />
        <path d="M86 70 C 78 78 70 86 64 90" fill="none" stroke="#4f8a24" strokeWidth="2.6" />
      </g>
      <g>
        <g stroke="#e8a800" strokeWidth="4" strokeLinecap="round">
          <path d="M60 12 v8 M42 20 l6 6 M78 20 l-6 6 M34 38 h8 M86 38 h-8" />
        </g>
        <circle cx="60" cy="44" r="20" fill={`url(#${u}bud)`} stroke={INK} strokeWidth="4" />
        <path
          d="M52 38 A 12 12 0 0 1 65 30"
          fill="none"
          stroke="rgba(255,255,255,.6)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="55" cy="47" r="2.6" fill="#b87700" />
        <circle cx="65" cy="43" r="2.2" fill="#b87700" />
      </g>
    </Art>
  )
}

/* ------------------------------------------------------------------ */
/*  弹丸藤：卷须托着的喇叭果，朝右发射（shooter）                        */
/* ------------------------------------------------------------------ */
export function SlingerArt(props: ArtProps) {
  const u = useUid()
  return (
    <Art {...props}>
      <defs>
        <linearGradient id={`${u}pod`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4f8a24" />
          <stop offset="55%" stopColor="#82c93f" />
          <stop offset="100%" stopColor="#b9e86a" />
        </linearGradient>
      </defs>
      <Shadow />
      <g stroke={INK} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M52 112 C 40 104 34 90 38 76 C 42 62 58 60 60 72 C 62 84 50 86 48 78" fill="none" strokeWidth="8" stroke="#5aa832" />
        <path d="M52 112 C 40 104 34 90 38 76 C 42 62 58 60 60 72 C 62 84 50 86 48 78" fill="none" strokeWidth="4" stroke={INK} />
        <path d="M56 104 C 70 98 80 88 82 74 C 68 74 58 84 56 104 Z" fill="#7dc63f" />
        <path d="M66 68 C 80 62 88 52 90 42 C 76 42 66 52 66 68 Z" fill="#8fd84e" />
      </g>
      <g>
        <path
          d="M44 54 C 58 48 76 46 96 48 C 108 49 112 60 108 68 C 104 76 92 76 86 70 C 80 64 84 54 94 54"
          fill={`url(#${u}pod)`}
          stroke={INK}
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
        <ellipse cx="108" cy="60" rx="7" ry="12" fill="#2f4a16" stroke={INK} strokeWidth="3.5" />
        <ellipse cx="108" cy="60" rx="3.4" ry="7.5" fill="#16260a" stroke="none" />
        <circle cx="76" cy="58" r="7" fill="#d7f3a0" stroke={INK} strokeWidth="3" />
        <circle cx="72" cy="56" r="2.4" fill="#fffce0" />
        <path d="M52 54 C 60 50 70 49 78 50" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M66 78 l 4 10 M78 76 l 2 12" stroke="#4f8a24" strokeWidth="3.4" strokeLinecap="round" />
      </g>
    </Art>
  )
}

/* ------------------------------------------------------------------ */
/*  矮树丛：三团低矮灌木（defense）                                     */
/* ------------------------------------------------------------------ */
export function BushArt(props: ArtProps) {
  const u = useUid()
  return (
    <Art {...props}>
      <defs>
        <linearGradient id={`${u}leaf`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a7e05c" />
          <stop offset="60%" stopColor="#78bd38" />
          <stop offset="100%" stopColor="#4d8a20" />
        </linearGradient>
      </defs>
      <Shadow />
      <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
        <path
          d="M20 104 C 14 88 20 74 32 70 C 34 56 48 48 60 54 C 72 44 90 50 92 64 C 106 66 112 82 104 96 C 110 106 102 112 92 112 L 30 112 C 22 112 18 108 20 104 Z"
          fill={`url(#${u}leaf)`}
        />
        <path d="M38 104 C 40 90 48 82 58 80" fill="none" stroke="#3f7d1f" strokeWidth="2.8" opacity="0.6" />
        <path d="M72 104 C 70 92 66 86 58 82" fill="none" stroke="#3f7d1f" strokeWidth="2.8" opacity="0.6" />
      </g>
      <g stroke={INK} strokeWidth="3">
        <circle cx="44" cy="80" r="6.5" fill="#e0533a" />
        <circle cx="76" cy="72" r="6.5" fill="#e0533a" />
        <circle cx="60" cy="92" r="5.5" fill="#d8452f" />
      </g>
      <g fill="#fff6c4" opacity="0.75">
        <circle cx="40" cy="72" r="2.2" />
        <circle cx="80" cy="64" r="2" />
      </g>
    </Art>
  )
}

export const PLANT_ART = {
  sprout: SproutArt,
  slinger: SlingerArt,
  bush: BushArt
} as const
