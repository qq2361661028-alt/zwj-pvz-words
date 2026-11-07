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

/* ------------------------------------------------------------------ */
/*  三叶草：三片心形叶 + 顶部小黄花（producer，产光加倍）                */
/* ------------------------------------------------------------------ */
export function CloverArt(props: ArtProps) {
  const u = useUid()
  return (
    <Art {...props}>
      <defs>
        <radialGradient id={`${u}leaf`} cx="45%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#b9ec72" />
          <stop offset="65%" stopColor="#6fbe34" />
          <stop offset="100%" stopColor="#3f7d1f" />
        </radialGradient>
      </defs>
      <Shadow />
      <g stroke={INK} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M60 112 C 58 96 58 82 60 68" fill="none" strokeWidth="8" stroke="#4f8a24" />
        <path d="M60 112 C 58 96 58 82 60 68" fill="none" strokeWidth="4" stroke={INK} />
        <path d="M60 40 C 58 60 58 58 60 66" fill="none" strokeWidth="3.4" stroke="#4f8a24" />
      </g>
      <g stroke={INK} strokeWidth="4" strokeLinejoin="round" fill={`url(#${u}leaf)`}>
        {[0, 120, 240].map((deg) => (
          <path
            key={deg}
            transform={`rotate(${deg} 60 64)`}
            d="M60 64 C 54 56 46 50 38 52 C 30 54 28 64 34 72 C 40 80 52 88 60 96 C 68 88 80 80 86 72 C 92 64 90 54 82 52 C 74 50 66 56 60 64 Z"
          />
        ))}
        <circle cx="60" cy="64" r="4.5" fill="#2f5c14" strokeWidth="3" />
      </g>
      <g stroke={INK} strokeWidth="3">
        <circle cx="60" cy="22" r="7" fill="#ffd647" />
        <circle cx="49" cy="28" r="5" fill="#ffe37a" />
        <circle cx="71" cy="28" r="5" fill="#ffe37a" />
      </g>
      <circle cx="58" cy="20" r="2" fill="#fff8c4" stroke="none" />
    </Art>
  )
}

/* ------------------------------------------------------------------ */
/*  荆棘藤：带刺藤鞭 + 红色花苞，朝右发射（shooter）                    */
/* ------------------------------------------------------------------ */
export function ThornArt(props: ArtProps) {
  const u = useUid()
  return (
    <Art {...props}>
      <defs>
        <linearGradient id={`${u}vine`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#3f6d1d" />
          <stop offset="100%" stopColor="#8ec94a" />
        </linearGradient>
      </defs>
      <Shadow />
      <g stroke={INK} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M34 112 C 28 92 38 74 56 64 C 74 54 86 44 92 30"
          fill="none"
          strokeWidth="10"
          stroke={`url(#${u}vine)`}
        />
        <path
          d="M34 112 C 28 92 38 74 56 64 C 74 54 86 44 92 30"
          fill="none"
          strokeWidth="4"
          stroke={INK}
        />
        <path d="M40 100 l -16 -2 l 10 -10 Z" fill="#d8e8b0" />
        <path d="M38 84 l 16 -6 l -4 12 Z" fill="#d8e8b0" />
        <path d="M52 70 l -14 -4 l 10 -8 Z" fill="#d8e8b0" />
        <path d="M66 60 l 14 -2 l -6 12 Z" fill="#d8e8b0" />
        <path d="M80 48 l -12 -8 l 14 -2 Z" fill="#d8e8b0" />
        <path d="M40 104 C 52 102 60 96 64 88 C 54 88 44 94 40 104 Z" fill="#6fbe34" />
        <path d="M60 76 C 70 72 76 64 76 56 C 66 58 60 66 60 76 Z" fill="#8ec94a" />
      </g>
      <g stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
        <path d="M92 30 C 100 22 112 24 114 34 C 116 44 106 50 98 46 C 92 42 90 34 92 30 Z" fill="#e04a35" />
        <path d="M94 38 C 98 32 106 30 110 34" fill="none" stroke="#8f2417" strokeWidth="2.6" />
      </g>
      <circle cx="103" cy="35" r="2.4" fill="#ffd1c4" stroke="none" />
    </Art>
  )
}

/* ------------------------------------------------------------------ */
/*  蕨叶盾：层叠羽状叶组成的盾形（defense）                             */
/* ------------------------------------------------------------------ */
export function FernArt(props: ArtProps) {
  const u = useUid()
  return (
    <Art {...props}>
      <defs>
        <linearGradient id={`${u}frond`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a8dd6a" />
          <stop offset="55%" stopColor="#63a92f" />
          <stop offset="100%" stopColor="#35661a" />
        </linearGradient>
      </defs>
      <Shadow />
      <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
        <path
          d="M60 112 C 38 98 24 72 30 40 C 46 50 58 74 60 112 Z"
          fill={`url(#${u}frond)`}
        />
        <path
          d="M60 112 C 82 98 96 72 90 40 C 74 50 62 74 60 112 Z"
          fill={`url(#${u}frond)`}
        />
        <path
          d="M60 112 C 50 84 50 52 60 24 C 70 52 70 84 60 112 Z"
          fill="#7cc23c"
        />
        <path d="M60 104 C 44 92 36 76 36 58" fill="none" strokeWidth="2.8" stroke="#2f5c14" />
        <path d="M60 104 C 76 92 84 76 84 58" fill="none" strokeWidth="2.8" stroke="#2f5c14" />
        <path d="M60 100 L 60 40" fill="none" strokeWidth="2.8" stroke="#2f5c14" />
      </g>
      <g fill="#2f5c14" opacity="0.65">
        {[48, 62, 76, 90].map((y) => (
          <g key={y}>
            <circle cx={60 - (y - 40) * 0.34} cy={y} r="2.2" />
            <circle cx={60 + (y - 40) * 0.34} cy={y} r="2.2" />
          </g>
        ))}
      </g>
    </Art>
  )
}

/* ------------------------------------------------------------------ */
/*  苔藓毯：低矮苔藓团 + 小石子与孢蒴（defense）                        */
/* ------------------------------------------------------------------ */
export function MossArt(props: ArtProps) {
  const u = useUid()
  return (
    <Art {...props}>
      <defs>
        <linearGradient id={`${u}moss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9ccf5a" />
          <stop offset="60%" stopColor="#5f942e" />
          <stop offset="100%" stopColor="#3c661c" />
        </linearGradient>
      </defs>
      <Shadow />
      <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
        <path
          d="M16 106 C 10 96 16 86 28 82 C 32 72 46 68 56 74 C 66 66 82 70 86 80 C 98 82 106 92 100 104 C 104 108 100 112 94 112 L 24 112 C 18 112 14 110 16 106 Z"
          fill={`url(#${u}moss)`}
        />
        <path d="M28 96 C 40 90 52 90 62 94" fill="none" strokeWidth="2.6" stroke="#2f5c14" opacity="0.6" />
        <path d="M62 94 C 74 88 86 90 94 96" fill="none" strokeWidth="2.6" stroke="#2f5c14" opacity="0.6" />
      </g>
      <g stroke={INK} strokeWidth="3">
        <ellipse cx="36" cy="98" rx="9" ry="6" fill="#a9b3a0" />
        <ellipse cx="84" cy="100" rx="7" ry="5" fill="#bcc4b2" />
        <circle cx="36" cy="96" r="1.8" fill="#e6ece0" stroke="none" />
      </g>
      <g stroke={INK} strokeWidth="2.6">
        <path d="M52 74 L 52 58 M64 72 L 66 54 M76 76 L 80 62" fill="none" stroke="#4f7a24" />
        <ellipse cx="52" cy="55" rx="4" ry="5" fill="#c9e08a" />
        <ellipse cx="66" cy="51" rx="4" ry="5" fill="#c9e08a" />
        <ellipse cx="80" cy="59" rx="3.6" ry="4.6" fill="#c9e08a" />
      </g>
    </Art>
  )
}

/* ------------------------------------------------------------------ */
/*  蓟刺花：紫色球状花冠 + 锯齿叶，朝右发射（shooter）                  */
/* ------------------------------------------------------------------ */
export function ThistleArt(props: ArtProps) {
  const u = useUid()
  return (
    <Art {...props}>
      <defs>
        <radialGradient id={`${u}bloom`} cx="40%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#c9a4f2" />
          <stop offset="60%" stopColor="#9a63d6" />
          <stop offset="100%" stopColor="#6a34a8" />
        </radialGradient>
      </defs>
      <Shadow />
      <g stroke={INK} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M56 112 C 52 96 54 78 62 64" fill="none" strokeWidth="9" stroke="#4f8a24" />
        <path d="M56 112 C 52 96 54 78 62 64" fill="none" strokeWidth="4" stroke={INK} />
        <path d="M56 96 L 34 86 L 50 82 L 30 66 L 54 74 Z" fill="#6fbe34" />
        <path d="M58 84 L 82 76 L 68 90 L 88 92 L 64 98 Z" fill="#5aa832" />
      </g>
      <g stroke={INK} strokeWidth="3.4" strokeLinejoin="round">
        <circle cx="72" cy="42" r="19" fill={`url(#${u}bloom)`} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <path
            key={deg}
            transform={`rotate(${deg} 72 42)`}
            d="M72 23 L 77 12 L 67 12 Z"
            fill="#8a55c4"
            strokeWidth="2.6"
          />
        ))}
        <path d="M54 56 C 58 66 86 66 90 56 C 86 60 58 60 54 56 Z" fill="#4f8a24" />
      </g>
      <g fill="#e6d4ff" opacity="0.8">
        <circle cx="66" cy="35" r="2.4" />
        <circle cx="78" cy="39" r="2" />
        <circle cx="70" cy="47" r="2" />
        <circle cx="80" cy="49" r="1.8" />
      </g>
    </Art>
  )
}

export const PLANT_ART = {
  sprout: SproutArt,
  slinger: SlingerArt,
  bush: BushArt,
  clover: CloverArt,
  thorn: ThornArt,
  fern: FernArt,
  moss: MossArt,
  thistle: ThistleArt
} as const
