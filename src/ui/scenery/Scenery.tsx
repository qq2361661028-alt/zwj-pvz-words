import { useId } from 'react'
import './Scenery.css'

/** 天空：渐变 + 太阳光晕 + 云 */
export function Sky({ variant = 'day' }: { variant?: 'day' | 'dusk' | 'night' }) {
  return (
    <div className={`sky sky--${variant}`} aria-hidden="true">
      <div className="sky__glow" />
      <Cloud className="sky__cloud sky__cloud--a" />
      <Cloud className="sky__cloud sky__cloud--b" />
      <Cloud className="sky__cloud sky__cloud--c" />
      <Cloud className="sky__cloud sky__cloud--d" />
    </div>
  )
}

function Cloud({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 80" className={`cloud ${className}`} aria-hidden="true">
      <g fill="#ffffff" opacity="0.92">
        <ellipse cx="60" cy="52" rx="46" ry="26" />
        <ellipse cx="104" cy="40" rx="38" ry="30" />
        <ellipse cx="146" cy="54" rx="40" ry="22" />
        <ellipse cx="92" cy="60" rx="56" ry="18" />
      </g>
      <g fill="#dbe9f5" opacity="0.55">
        <ellipse cx="104" cy="62" rx="52" ry="12" />
      </g>
    </svg>
  )
}

/** 远处的小屋：只作背景，不参与任何判定 */
export function House({ className = '' }: { className?: string }) {
  const u = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 460 340" className={`house ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={`${u}wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3e3c4" />
          <stop offset="100%" stopColor="#d6bd94" />
        </linearGradient>
        <linearGradient id={`${u}roof`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a8462f" />
          <stop offset="100%" stopColor="#7a2c1c" />
        </linearGradient>
        <linearGradient id={`${u}glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#bfe6f7" />
          <stop offset="100%" stopColor="#7fb8d8" />
        </linearGradient>
      </defs>

      <g>
        <rect x="352" y="36" width="42" height="70" fill="#8a4a35" stroke="#4a2415" strokeWidth="4" />
        <rect x="346" y="26" width="54" height="16" rx="3" fill="#9c5340" stroke="#4a2415" strokeWidth="4" />
        <g fill="#e8e2d4" opacity="0.55">
          <circle cx="376" cy="14" r="9" />
          <circle cx="392" cy="2" r="7" />
        </g>
      </g>

      <path d="M20 132 L230 22 L440 132 Z" fill={`url(#${u}roof)`} stroke="#4a2415" strokeWidth="5" strokeLinejoin="round" />
      <path d="M20 132 L230 22 L440 132" fill="none" stroke="#c05a3e" strokeWidth="4" opacity="0.5" />
      <g stroke="#5e2113" strokeWidth="2.5" opacity="0.5">
        <path d="M120 96 L188 132 M180 66 L262 108 M250 44 L330 92 M320 30 L396 118" />
      </g>

      <rect x="46" y="132" width="368" height="196" fill={`url(#${u}wall)`} stroke="#4a2415" strokeWidth="5" />
      <g stroke="#c4a97e" strokeWidth="2" opacity="0.8">
        <path d="M46 178 h368 M46 226 h368 M46 274 h368" />
      </g>

      <g>
        <rect x="196" y="196" width="76" height="132" rx="4" fill="#8d5a2f" stroke="#4a2415" strokeWidth="5" />
        <rect x="206" y="208" width="56" height="48" rx="3" fill="#a9713f" stroke="#5a3315" strokeWidth="3" />
        <rect x="206" y="264" width="56" height="52" rx="3" fill="#a9713f" stroke="#5a3315" strokeWidth="3" />
        <circle cx="260" cy="266" r="5" fill="#f0c250" stroke="#5a3315" strokeWidth="2.5" />
        <path d="M196 190 h76 l -8 -14 h -60 z" fill="#6f4523" stroke="#4a2415" strokeWidth="4" />
      </g>

      {[96, 320].map((x) => (
        <g key={x}>
          <rect x={x} y="180" width="64" height="62" rx="3" fill={`url(#${u}glass)`} stroke="#4a2415" strokeWidth="5" />
          <path d={`M${x + 32} 180 v62 M${x} 211 h64`} stroke="#4a2415" strokeWidth="4" />
          <rect x={x - 6} y="238" width="76" height="10" rx="3" fill="#c9a877" stroke="#4a2415" strokeWidth="4" />
          <path d={`M${x + 8} 186 l 16 0 l -16 24 z`} fill="#ffffff" opacity="0.45" />
        </g>
      ))}

      <path d="M180 328 h108 l 14 12 h -136 z" fill="#b9a488" stroke="#4a2415" strokeWidth="4" />
    </svg>
  )
}

/** 草地上的小草簇 */
export function GrassTufts({ count = 22 }: { count?: number }) {
  return (
    <div className="tufts" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const left = (i * 37.5) % 100
        const top = 12 + ((i * 53) % 82)
        const scale = 0.6 + ((i * 17) % 60) / 100
        return (
          <svg
            key={i}
            viewBox="0 0 40 24"
            className="tuft"
            style={{ left: `${left}%`, top: `${top}%`, transform: `scale(${scale})`, animationDelay: `${(i % 7) * 0.4}s` }}
          >
            <g fill="none" stroke="#4f8a24" strokeWidth="2.6" strokeLinecap="round">
              <path d="M8 24 C 6 16 8 10 12 6" />
              <path d="M16 24 C 16 14 18 8 20 4" />
              <path d="M24 24 C 26 16 24 10 22 6" />
              <path d="M30 24 C 32 18 34 14 34 8" />
            </g>
          </svg>
        )
      })}
    </div>
  )
}
