function MouseIcon() {
  return (
    <svg className="controls__mouse" viewBox="0 0 14 22" aria-hidden="true">
      <rect x="0.75" y="0.75" width="12.5" height="20.5" rx="6.25" />
      <line x1="7" y1="4" x2="7" y2="8" />
    </svg>
  )
}

function Key({ label, className }: { label: string; className?: string }) {
  return (
    <span className={`controls__key${className ? ` ${className}` : ''}`} aria-hidden="true">
      {label}
    </span>
  )
}

export function ControlsOverlay() {
  return (
    <aside className="controls" aria-label="Controls">
      <div className="controls__row">
        <div className="controls__icon">
          <MouseIcon />
        </div>
        <p className="controls__text">
          Click a station
          <br />
          to explore
        </p>
      </div>
      <div className="controls__row">
        <div className="controls__icon controls__keys">
          <Key label="↑" className="controls__key--up" />
          <Key label="←" className="controls__key--left" />
          <Key label="↓" className="controls__key--down" />
          <Key label="→" className="controls__key--right" />
        </div>
        <p className="controls__text">
          Use arrow keys
          <br />
          to move
        </p>
      </div>
    </aside>
  )
}
