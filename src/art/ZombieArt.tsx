import { useId, type ReactNode } from 'react'
import { INK } from './PlantArt'

export type ZombieVariant = 'basic' | 'cone' | 'bucket' | 'flag'

type Props = { size?: number; className?: string; variant?: ZombieVariant }

function ZArt({ size = 104, className, children }: { size?: number; className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 120 140"
      width={size}
      height={(size * 140) / 120}
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

export function ZombieArt({ size, className, variant = 'basic' }: Props) {
  const u = useUid()
  return (
    <ZArt size={size} className={className}>
      <defs>
        <radialGradient id={`${u}skin`} cx="38%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#cfe6a4" />
          <stop offset="55%" stopColor="#93b45a" />
          <stop offset="100%" stopColor="#5f7a2f" />
        </radialGradient>
        <linearGradient id={`${u}hood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6b8190" />
          <stop offset="100%" stopColor="#40525e" />
        </linearGradient>
      </defs>

      {/* 后臂 */}
      <path d="M84 82 C 96 86 102 94 104 104" fill="none" stroke={INK} strokeWidth="11" strokeLinecap="round" opacity="0.9" />
      <path d="M84 82 C 96 86 102 94 104 104" fill="none" stroke="#7f9a4a" strokeWidth="6" strokeLinecap="round" />

      {/* 腿 */}
      <g stroke={INK} strokeWidth="4.5" strokeLinejoin="round">
        <path d="M46 112 h14 v22 h-14 z" fill="#3f4d6b" />
        <path d="M66 112 h14 v22 h-14 z" fill="#37445f" />
        <path d="M40 130 h24 v9 h-24 z" fill="#2a1c12" />
        <path d="M62 130 h24 v9 h-24 z" fill="#2a1c12" />
        <path d="M52 116 l -4 10 M72 116 l 4 10" stroke="#2c3852" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* 连帽衫躯干 */}
      <g stroke={INK} strokeWidth="4.5" strokeLinejoin="round">
        <path d="M44 74 h38 v40 h-38 z" fill={`url(#${u}hood)`} />
        <path d="M44 106 h38 v8 h-38 z" fill="#33434e" />
        <path d="M58 74 l 4 10 l -4 6 M72 74 l -4 10 l 4 6" fill="none" stroke="#2b3a44" strokeWidth="3" />
        <path d="M54 84 v 14 M66 84 v 14" stroke="#d9d2bd" strokeWidth="3" strokeLinecap="round" />
        <circle cx="56" cy="99" r="2.4" fill="#d9d2bd" stroke="none" />
        <circle cx="68" cy="99" r="2.4" fill="#d9d2bd" stroke="none" />
      </g>

      {/* 前伸的胳膊（朝左，走向房子） */}
      <path d="M48 82 C 36 84 24 92 18 102" fill="none" stroke={INK} strokeWidth="12" strokeLinecap="round" />
      <path d="M48 82 C 36 84 24 92 18 102" fill="none" stroke="#93b45a" strokeWidth="7" strokeLinecap="round" />
      <g stroke={INK} strokeWidth="3.4" strokeLinejoin="round" fill="#a8c96a">
        <path d="M12 98 c -5 6 -3 13 3 15 c 6 2 10 -2 10 -8 z" />
        <path d="M10 104 l -4 -4 M14 100 l -1 -6" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      </g>

      {/* 头 */}
      <g>
        <path
          d="M38 36 C 38 18 50 8 62 8 C 78 8 88 20 88 38 C 88 54 78 68 62 70 C 46 70 38 54 38 36 Z"
          fill={`url(#${u}skin)`}
          stroke={INK}
          strokeWidth="4.5"
        />
        {/* 耳朵 */}
        <path d="M87 38 c 7 1 8 9 2 12 c -3 1 -6 -1 -6 -4 z" fill="#93b45a" stroke={INK} strokeWidth="3.4" />
        {/* 眼窝 */}
        <ellipse cx="52" cy="34" rx="9" ry="10" fill="#46592a" />
        <ellipse cx="73" cy="33" rx="9" ry="10" fill="#46592a" />
        <circle cx="49" cy="35" r="4.2" fill="#fffbe8" />
        <circle cx="70" cy="34" r="4.2" fill="#fffbe8" />
        <circle cx="48" cy="35.5" r="2.1" fill={INK} />
        <circle cx="69" cy="34.5" r="2.1" fill={INK} />
        {/* 眉骨 */}
        <path d="M43 22 l 12 4" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M82 21 l -12 4" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
        {/* 缝合的嘴 */}
        <path d="M47 53 C 54 59 67 59 75 52" fill="#3b1f14" stroke={INK} strokeWidth="3.6" strokeLinejoin="round" />
        <path d="M52 55 v 4 M60 57 v 4 M68 55 v 4" stroke="#e8e0c8" strokeWidth="2.8" strokeLinecap="round" />
        {/* 鼻子 */}
        <path d="M60 40 l -3 7 l 8 0 z" fill="#7d9c45" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        {/* 乱发 */}
        <path
          d="M40 27 C 42 16 52 8 63 8 C 75 8 85 16 87 27 C 80 21 72 18 64 20 C 56 22 47 22 40 27 Z"
          fill="#2f2418"
          stroke={INK}
          strokeWidth="3.4"
        />
      </g>

      {/* 装扮 */}
      {variant === 'cone' && (
        <g>
          <path d="M62 0 L 38 32 h 46 z" fill="#f08a2b" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
          <path d="M44 26 h 36" stroke="#c25f12" strokeWidth="4" />
          <path d="M51 15 h 20" stroke="#c25f12" strokeWidth="4" />
          <path d="M49 24 L 58 8" stroke="rgba(255,220,180,.55)" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
      {variant === 'bucket' && (
        <g>
          <path d="M36 32 L 40 2 h 44 l 4 30 z" fill="#b9c2c9" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
          <path d="M36 32 h 52" stroke="#8a949c" strokeWidth="4" />
          <path d="M47 7 L 44 28" stroke="rgba(255,255,255,.6)" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="60" cy="3" rx="23" ry="4" fill="#8a949c" stroke={INK} strokeWidth="3" />
        </g>
      )}
      {variant === 'flag' && (
        <g>
          <path d="M104 108 V 44" stroke="#7a5a34" strokeWidth="5" strokeLinecap="round" />
          <path d="M104 46 l 22 7 l -22 8 z" fill="#d8452f" stroke={INK} strokeWidth="3.4" strokeLinejoin="round" />
          <circle cx="104" cy="42" r="4" fill="#d8452f" stroke={INK} strokeWidth="3" />
        </g>
      )}
    </ZArt>
  )
}
