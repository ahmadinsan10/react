import { useLayoutEffect, useRef, useState } from 'react'
import { Note, Segmented } from './common'
import { useLang, type Lang } from '../i18n/lang'

const T = {
  en: {
    order: 'Order', mode: 'Rendering mode', every: 'Render every row', virtual: 'Virtualized', rows: 'Rows', nodes: 'DOM nodes in list', last: 'last render + commit',
    note: (o: number) => `A virtualized list renders only the rows inside the viewport plus a small overscan (${o} rows), positioned absolutely inside a spacer as tall as the full list. Scroll both versions and compare DOM nodes: thousands vs a few dozen. Production apps use TanStack Virtual, which also handles variable row heights.`,
  },
  id: {
    order: 'Pesanan', mode: 'Mode rendering', every: 'Render semua baris', virtual: 'Divirtualisasi', rows: 'Baris', nodes: 'Node DOM di list', last: 'render + commit terakhir',
    note: (o: number) => `List yang divirtualisasi hanya me-render baris yang ada di dalam viewport ditambah sedikit overscan (${o} baris), diposisikan absolute di dalam spacer setinggi list penuh. Scroll kedua versi dan bandingkan jumlah node DOM-nya: ribuan vs beberapa puluh. Aplikasi production memakai TanStack Virtual, yang juga menangani tinggi baris yang bervariasi.`,
  },
} as const

const ROW = 32
const HEIGHT = 320
const OVERSCAN = 4

const row = (i: number, lang: Lang) => (
  <>
    <span style={{ width: 70, color: 'var(--text-3)' }}>#{i + 1}</span>
    <span style={{ flex: 1 }}>{T[lang].order} {(i * 7919) % 100000}</span>
    <span style={{ width: 90, textAlign: 'right' }}>Rp {((i * 104729) % 9_000_000).toLocaleString('id-ID')}</span>
  </>
)

const rowStyle = { height: ROW, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderBottom: '1px solid var(--border)', fontSize: '0.82rem', fontFamily: 'var(--mono)' } as const

function Naive({ count }: { count: number }) {
  const lang = useLang()
  return (
    <div style={{ height: HEIGHT, overflowY: 'auto' }} data-list>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={rowStyle}>
          {row(i, lang)}
        </div>
      ))}
    </div>
  )
}

function Virtual({ count }: { count: number }) {
  const [scrollTop, setScrollTop] = useState(0)
  const lang = useLang()
  const start = Math.max(0, Math.floor(scrollTop / ROW) - OVERSCAN)
  const end = Math.min(count, Math.ceil((scrollTop + HEIGHT) / ROW) + OVERSCAN)
  return (
    <div style={{ height: HEIGHT, overflowY: 'auto' }} onScroll={e => setScrollTop(e.currentTarget.scrollTop)} data-list>
      <div style={{ height: count * ROW, position: 'relative' }}>
        {Array.from({ length: end - start }, (_, k) => {
          const i = start + k
          return (
            <div key={i} style={{ ...rowStyle, position: 'absolute', top: i * ROW, left: 0, right: 0, background: 'var(--bg-elev)' }}>
              {row(i, lang)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function VirtualList() {
  const [mode, setMode] = useState<'naive' | 'virtual'>('virtual')
  const [count, setCount] = useState(10000)
  const [stats, setStats] = useState({ ms: 0, nodes: 0 })
  const tr = T[useLang()]
  const wrap = useRef<HTMLDivElement>(null)
  const t = useRef(0)
  t.current = performance.now()

  // Measure after the DOM is updated.
  useLayoutEffect(() => {
    const ms = performance.now() - t.current
    const nodes = wrap.current?.querySelectorAll('*').length ?? 0
    setStats(s => (s.nodes === nodes ? s : { ms, nodes }))
  })

  return (
    <div>
      <div className="viz-controls">
        <Segmented
          label={tr.mode}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'naive', label: tr.every },
            { value: 'virtual', label: tr.virtual },
          ]}
        />
        <label className="row" style={{ gap: 6 }}>
          {tr.rows}
          <select value={count} onChange={e => setCount(Number(e.target.value))}>
            <option value={1000}>1,000</option>
            <option value={10000}>10,000</option>
            <option value={30000}>30,000</option>
          </select>
        </label>
      </div>
      <div className="grid cols-2" style={{ marginBottom: 12 }}>
        <div className="stat card flat">
          <div className="label">{tr.nodes}</div>
          <div className="value" style={{ color: stats.nodes > 5000 ? 'var(--bad)' : 'var(--ok)' }}>{stats.nodes.toLocaleString()}</div>
        </div>
        <div className="stat card flat">
          <div className="label">{tr.last}</div>
          <div className="value" style={{ color: stats.ms > 100 ? 'var(--bad)' : 'var(--ok)' }}>{stats.ms.toFixed(1)} ms</div>
        </div>
      </div>
      <div className="viz-stage" ref={wrap} style={{ padding: 0, overflow: 'hidden' }}>
        {mode === 'naive' ? <Naive key={count} count={count} /> : <Virtual key={count} count={count} />}
      </div>
      <Note>{tr.note(OVERSCAN)}</Note>
    </div>
  )
}
