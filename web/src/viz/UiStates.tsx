import { useState } from 'react'
import { Note } from './common'
import { useLang } from '../i18n/lang'

const T = {
  en: {
    three: 'Three booleans → 8 combinations', valid: 'valid?', impossible: '✗ impossible', nonsense: '4 of 8 combinations are nonsense, yet the type allows them, so your UI has to defend against them.',
    union: 'Discriminated union → only real states', aria: (s: string) => `State machine, current state ${s}`, idle: 'Search for a city to begin.', loading: 'Loading…', error: 'Error:',
    note: 'With a union, `error` only exists when `status === \'error\'` and `data` only when `status === \'success\'`. TypeScript narrows automatically inside each branch, and invalid transitions (like RESOLVE while idle) are simply unavailable. That is "making impossible states unrepresentable".',
  },
  id: {
    three: 'Tiga boolean → 8 kombinasi', valid: 'valid?', impossible: '✗ mustahil', nonsense: '4 dari 8 kombinasi tidak masuk akal, tapi tipenya tetap mengizinkan, jadi UI kamu harus berjaga-jaga terhadap kombinasi itu.',
    union: 'Discriminated union → hanya state yang nyata', aria: (s: string) => `State machine, state saat ini ${s}`, idle: 'Cari sebuah kota untuk memulai.', loading: 'Memuat…', error: 'Error:',
    note: 'Dengan union, `error` hanya ada saat `status === \'error\'` dan `data` hanya ada saat `status === \'success\'`. TypeScript otomatis melakukan narrowing di setiap cabang, dan transisi yang tidak valid (misalnya RESOLVE saat idle) memang tidak tersedia. Inilah yang disebut "membuat state mustahil tidak bisa direpresentasikan".',
  },
} as const

type State = { status: 'idle' } | { status: 'loading' } | { status: 'error'; error: string } | { status: 'success'; data: string[] }
type Event = 'FETCH' | 'RESOLVE' | 'REJECT' | 'RETRY' | 'RESET'

const transitions: Record<State['status'], Partial<Record<Event, (s: State) => State>>> = {
  idle: { FETCH: () => ({ status: 'loading' }) },
  loading: {
    RESOLVE: () => ({ status: 'success', data: ['Bandung', 'Jakarta', 'Surabaya'] }),
    REJECT: () => ({ status: 'error', error: 'Network timeout' }),
  },
  error: { RETRY: () => ({ status: 'loading' }), RESET: () => ({ status: 'idle' }) },
  success: { FETCH: () => ({ status: 'loading' }), RESET: () => ({ status: 'idle' }) },
}

const POS: Record<State['status'], [number, number]> = { idle: [70, 90], loading: [250, 90], success: [450, 40], error: [450, 140] }
const EDGES: [State['status'], State['status'], Event][] = [
  ['idle', 'loading', 'FETCH'],
  ['loading', 'success', 'RESOLVE'],
  ['loading', 'error', 'REJECT'],
  ['error', 'loading', 'RETRY'],
  ['success', 'loading', 'FETCH'],
]

export default function UiStates() {
  const tr = T[useLang()]
  const [s, setS] = useState<State>({ status: 'idle' })
  const send = (e: Event) => {
    const t = transitions[s.status][e]
    if (t) setS(t(s))
  }
  const combos = Array.from({ length: 8 }, (_, i) => ({ loading: !!(i & 4), error: !!(i & 2), data: !!(i & 1) }))
  const valid = (c: { loading: boolean; error: boolean; data: boolean }) => [c.loading, c.error, c.data].filter(Boolean).length <= 1

  return (
    <div>
      <div className="grid cols-2">
        <div className="viz-stage">
          <h4 style={{ marginTop: 0 }}>{tr.three}</h4>
          <pre style={{ fontSize: '0.75rem' }}>
            <code>{'{ isLoading: boolean; isError: boolean; data?: City[] }'}</code>
          </pre>
          <table className="table" style={{ fontSize: '0.8rem' }}>
            <thead>
              <tr>
                <th>loading</th>
                <th>error</th>
                <th>data</th>
                <th>{tr.valid}</th>
              </tr>
            </thead>
            <tbody>
              {combos.map((c, i) => (
                <tr key={i} style={{ background: valid(c) ? undefined : 'var(--bad-soft)' }}>
                  <td>{String(c.loading)}</td>
                  <td>{String(c.error)}</td>
                  <td>{c.data ? '[…]' : '—'}</td>
                  <td>{valid(c) ? '✓' : tr.impossible}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="subtle">{tr.nonsense}</p>
        </div>
        <div className="viz-stage">
          <h4 style={{ marginTop: 0 }}>{tr.union}</h4>
          <svg viewBox="0 0 520 190" width="100%" role="img" aria-label={tr.aria(s.status)}>
            <defs>
              <marker id="ui-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0 0 10 5 0 10z" fill="var(--text-3)" />
              </marker>
            </defs>
            {EDGES.map(([a, b, e], i) => {
              const [x1, y1] = POS[a]
              const [x2, y2] = POS[b]
              const back = a === 'error' || a === 'success'
              const mx = (x1 + x2) / 2
              const my = (y1 + y2) / 2 + (back ? 18 : -10)
              const enabled = s.status === a
              return (
                <g key={i}>
                  <path d={`M${x1 + (x2 > x1 ? 44 : -44)} ${y1} Q ${mx} ${my} ${x2 + (x2 > x1 ? -44 : 44)} ${y2}`} fill="none" stroke={enabled ? 'var(--accent)' : 'var(--border)'} strokeWidth={enabled ? 2 : 1.5} markerEnd="url(#ui-arrow)" />
                  <text x={mx} y={my - 4} fontSize="10" textAnchor="middle" fill={enabled ? 'var(--accent)' : 'var(--text-3)'} fontWeight="700">
                    {e}
                  </text>
                </g>
              )
            })}
            {Object.entries(POS).map(([k, [x, y]]) => (
              <g key={k}>
                <rect x={x - 44} y={y - 18} width={88} height={36} rx={18} fill={s.status === k ? 'var(--accent)' : 'var(--bg-elev)'} stroke={s.status === k ? 'var(--accent)' : 'var(--border)'} strokeWidth={2} />
                <text x={x} y={y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill={s.status === k ? 'var(--accent-text)' : 'var(--text)'}>
                  {k}
                </text>
              </g>
            ))}
          </svg>
          <div className="row">
            {(['FETCH', 'RESOLVE', 'REJECT', 'RETRY', 'RESET'] as Event[]).map(e => (
              <button key={e} className="btn sm" disabled={!transitions[s.status][e]} onClick={() => send(e)}>
                {e}
              </button>
            ))}
          </div>
          <pre style={{ marginTop: 10, fontSize: '0.75rem' }}>
            <code>{JSON.stringify(s)}</code>
          </pre>
          <div style={{ minHeight: 40 }}>
            {s.status === 'idle' && <span className="subtle">{tr.idle}</span>}
            {s.status === 'loading' && <span className="pill warn">{tr.loading}</span>}
            {s.status === 'error' && <span className="pill" style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}>{tr.error} {s.error}</span>}
            {s.status === 'success' && s.data.map(d => <span key={d} className="chip o" style={{ display: 'inline-block', marginRight: 6 }}>{d}</span>)}
          </div>
        </div>
      </div>
      <Note>{tr.note}</Note>
    </div>
  )
}
