import { useEffect, useState, type ReactNode } from 'react'
import { dayKey } from '../store/logic'
import { defineStrings, useStrings } from '../i18n'

const S = defineStrings({
  en: { complete: '{n}% complete', activity: 'Learning activity over the last six months', action: '{d}: {n} action', actions: '{d}: {n} actions' },
  id: { complete: 'selesai {n}%', activity: 'Aktivitas belajar selama enam bulan terakhir', action: '{d}: {n} aktivitas', actions: '{d}: {n} aktivitas' },
})

export function Ring({ value, size = 64, stroke = 7, label }: { value: number; size?: number; stroke?: number; label?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value))
  const s = useStrings(S)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={s('complete', { n: Math.round(pct * 100) })}>
      <defs>
        <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--violet)" />
        </linearGradient>
      </defs>
      <circle className="ring-bg" cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-sunk)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={pct > 0.9995 ? 'var(--ok)' : 'url(#ring-grad)'}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size / 4.2} fontWeight={800} fill="var(--text)">
        {label ?? `${Math.round(pct * 100)}%`}
      </text>
    </svg>
  )
}

export function Bar({ value }: { value: number }) {
  return (
    <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  )
}

export function Heatmap({ activity, weeks = 26 }: { activity: Record<string, number>; weeks?: number }) {
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - (weeks * 7 - 1) - today.getDay())
  const cells: { key: string; n: number }[] = []
  for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const key = dayKey(d)
    cells.push({ key, n: activity[key] ?? 0 })
  }
  const s = useStrings(S)
  const level = (n: number) => (n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 10 ? 3 : 4)
  return (
    <div className="heatmap" aria-label={s('activity')}>
      {cells.map(c => (
        <i key={c.key} data-l={level(c.n)} title={s(c.n === 1 ? 'action' : 'actions', { d: c.key, n: c.n })} />
      ))}
    </div>
  )
}

export function Check({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label className={`check${checked ? ' done' : ''}`}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="check-text">{children}</span>
    </label>
  )
}

let pushToast: ((msg: string) => void) | null = null
export const toast = (msg: string) => pushToast?.(msg)

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    pushToast = setMsg
    return () => {
      pushToast = null
    }
  }, [])
  useEffect(() => {
    if (!msg) return
    const id = setTimeout(() => setMsg(null), 2200)
    return () => clearTimeout(id)
  }, [msg])
  return msg ? (
    <div className="toast" role="status">
      {msg}
    </div>
  ) : null
}

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0b1220" />
      <g fill="none" stroke="#61dafb" strokeWidth="1.6">
        <ellipse cx="16" cy="16" rx="11" ry="4.2" />
        <ellipse cx="16" cy="16" rx="11" ry="4.2" transform="rotate(60 16 16)" />
        <ellipse cx="16" cy="16" rx="11" ry="4.2" transform="rotate(120 16 16)" />
      </g>
      <circle cx="16" cy="16" r="2.2" fill="#61dafb" />
    </svg>
  )
}

const paths: Record<string, string> = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6 6 18',
  search: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.3-4.3',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z',
  home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V11Z',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14',
  flask: 'M9 3h6M10 3v6L4 20a1 1 0 0 0 1 1.5h14A1 1 0 0 0 20 20l-6-11V3',
  brain: 'M12 5a3 3 0 0 0-5.9.6A3 3 0 0 0 4 11a3 3 0 0 0 2 5 3 3 0 0 0 6 1V5Zm0 0a3 3 0 0 1 5.9.6A3 3 0 0 1 20 11a3 3 0 0 1-2 5 3 3 0 0 1-6 1',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-4a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0-4a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  check: 'M20 6 9 17l-5-5',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 2h-4l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  chevron: 'm9 6 6 6-6 6',
  play: 'M6 4l14 8-14 8V4Z',
  pause: 'M7 4h4v16H7zM13 4h4v16h-4z',
  step: 'M5 4l10 8-10 8V4Zm12 0h2v16h-2z',
  reset: 'M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4',
  external: 'M14 4h6v6M20 4 10 14M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
}

export function Icon({ name, size = 18 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name] ?? ''} />
    </svg>
  )
}
