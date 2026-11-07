/** 竖屏触摸设备上的旋转引导；横屏后由 CSS 自动隐藏 */
export function RotateHint() {
  return (
    <div className="rotate-hint" role="status">
      <div className="rotate-hint__panel wood">
        <svg className="rotate-hint__phone" viewBox="0 0 64 64" aria-hidden="true">
          <rect x="23" y="7" width="24" height="44" rx="6" fill="#f3e3c4" stroke="#3b2310" strokeWidth="3" />
          <rect x="28" y="12" width="14" height="32" rx="2" fill="#7fc4e8" />
          <circle cx="35" cy="46" r="2" fill="#3b2310" />
          <path d="M14 38a22 22 0 0 1 10-19" fill="none" stroke="#ffe14d" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M12 29v10h10" fill="none" stroke="#ffe14d" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h2 className="rotate-hint__title display">请横屏游玩</h2>
        <p className="rotate-hint__text">旋转手机后，游戏会铺满屏幕</p>
      </div>
    </div>
  )
}
