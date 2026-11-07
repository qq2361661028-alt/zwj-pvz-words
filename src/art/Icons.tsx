type IconProps = { size?: number; className?: string }

export function SunIcon({ size = 26, className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden="true">
      <g stroke="#b87700" strokeWidth="2.6" strokeLinecap="round">
        <path d="M20 2v5 M20 33v5 M2 20h5 M33 20h5 M7 7l4 4 M29 29l4 4 M33 7l-4 4 M11 29l-4 4" />
      </g>
      <circle cx="20" cy="20" r="11" fill="#ffd647" stroke="#6b3a00" strokeWidth="2.6" />
      <path d="M14 16 A 8 8 0 0 1 23 11" fill="none" stroke="#fff8c4" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function StarIcon({ size = 20, filled = true, className }: IconProps & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path
        d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4 6.2 20.5l1.1-6.5L2.6 9.4l6.5-.9z"
        fill={filled ? '#ffd23a' : 'rgba(60, 40, 20, .22)'}
        stroke={filled ? '#7a4a00' : 'rgba(60, 40, 20, .3)'}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LockIcon({ size = 30, className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden="true">
      <path d="M13 18v-4a7 7 0 0 1 14 0v4" fill="none" stroke="#5b3a1e" strokeWidth="4" strokeLinecap="round" />
      <rect x="8" y="18" width="24" height="18" rx="5" fill="#d9ab74" stroke="#5b3a1e" strokeWidth="3.4" />
      <circle cx="20" cy="26" r="3.2" fill="#5b3a1e" />
      <path d="M20 28v4" stroke="#5b3a1e" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function FlagIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path d="M5 22V3" stroke="#2b1a0b" strokeWidth="3" strokeLinecap="round" />
      <path d="M6 3h13l-4 5 4 5H6z" fill="#e0533a" stroke="#2b1a0b" strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  )
}

export function SpeechIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path d="M4 5h16v11H9l-5 4z" fill="#fff4d6" stroke="#2b1a0b" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M8 10h8M8 13h5" stroke="#2b1a0b" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}
