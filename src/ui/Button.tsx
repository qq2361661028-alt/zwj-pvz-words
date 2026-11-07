import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'wood' | 'leaf' | 'sun' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  children: ReactNode
}

export function Button({ variant = 'wood', size = 'md', icon, children, className = '', ...rest }: Props) {
  return (
    <button type="button" className={`pvz-btn pvz-btn--${variant} pvz-btn--${size} ${className}`} {...rest}>
      <span className="pvz-btn__face">
        {icon && <span className="pvz-btn__icon">{icon}</span>}
        <span className="pvz-btn__label">{children}</span>
      </span>
    </button>
  )
}
