import { useEffect, useState, type ReactNode } from 'react'
import { Md } from '../components/Md'
import { Icon } from '../components/ui'

export function useStepper(total: number, baseMs = 1100) {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    if (!playing) return
    if (i >= total - 1) {
      setPlaying(false)
      return
    }
    const id = setTimeout(() => setI(x => Math.min(x + 1, total - 1)), baseMs / speed)
    return () => clearTimeout(id)
  }, [playing, i, total, baseMs, speed])

  return {
    i,
    playing,
    speed,
    setSpeed,
    go: (n: number) => setI(Math.max(0, Math.min(total - 1, n))),
    next: () => setI(x => Math.min(x + 1, total - 1)),
    prev: () => setI(x => Math.max(x - 1, 0)),
    reset: () => {
      setPlaying(false)
      setI(0)
    },
    toggle: () => {
      if (i >= total - 1) setI(0)
      setPlaying(p => !p)
    },
    atEnd: i >= total - 1,
  }
}

export function StepControls({ s, total, extra }: { s: ReturnType<typeof useStepper>; total: number; extra?: ReactNode }) {
  return (
    <div className="viz-controls">
      <button className="btn primary sm" onClick={s.toggle}>
        <Icon name={s.playing ? 'pause' : 'play'} size={14} /> {s.playing ? 'Pause' : s.atEnd ? 'Replay' : 'Play'}
      </button>
      <button className="btn sm" onClick={s.prev} disabled={s.i === 0} aria-label="Previous step">
        ◀
      </button>
      <button className="btn sm" onClick={s.next} disabled={s.atEnd} aria-label="Next step">
        ▶
      </button>
      <button className="btn sm ghost" onClick={s.reset}>
        <Icon name="reset" size={14} /> Reset
      </button>
      <input
        type="range"
        min={0}
        max={total - 1}
        value={s.i}
        onChange={e => s.go(Number(e.target.value))}
        aria-label="Step"
        style={{ flex: 1, minWidth: 120 }}
      />
      <span className="subtle">
        {s.i + 1}/{total}
      </span>
      <select value={s.speed} onChange={e => s.setSpeed(Number(e.target.value))} aria-label="Speed">
        <option value={0.5}>0.5×</option>
        <option value={1}>1×</option>
        <option value={2}>2×</option>
      </select>
      {extra}
    </div>
  )
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="explain" aria-live="polite">
      {typeof children === 'string' ? <Md text={children} /> : children}
    </div>
  )
}

export function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="row" style={{ gap: 6, cursor: 'pointer', fontSize: '0.88rem' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
      {children}
    </label>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="row" style={{ gap: 0, border: '1px solid var(--border)', borderRadius: 9, overflowX: 'auto', flexWrap: 'nowrap', maxWidth: '100%' }}>
      {options.map(o => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className="btn sm"
          style={{
            borderRadius: 0,
            border: 0,
            background: value === o.value ? 'var(--accent)' : 'transparent',
            color: value === o.value ? 'var(--accent-text)' : 'var(--text-2)',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
