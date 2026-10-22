import { useLayoutEffect, useRef, useState } from 'react'
import { Note, Segmented } from './common'

const ROW = 32
const HEIGHT = 320
const OVERSCAN = 4

const row = (i: number) => (
  <>
    <span style={{ width: 70, color: 'var(--text-3)' }}>#{i + 1}</span>
    <span style={{ flex: 1 }}>Order {(i * 7919) % 100000}</span>
    <span style={{ width: 90, textAlign: 'right' }}>Rp {((i * 104729) % 9_000_000).toLocaleString('id-ID')}</span>
  </>
)

const rowStyle = { height: ROW, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderBottom: '1px solid var(--border)', fontSize: '0.82rem', fontFamily: 'var(--mono)' } as const

function Naive({ count }: { count: number }) {
  return (
    <div style={{ height: HEIGHT, overflowY: 'auto' }} data-list>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={rowStyle}>
          {row(i)}
        </div>
      ))}
    </div>
  )
}

function Virtual({ count }: { count: number }) {
  const [scrollTop, setScrollTop] = useState(0)
  const start = Math.max(0, Math.floor(scrollTop / ROW) - OVERSCAN)
  const end = Math.min(count, Math.ceil((scrollTop + HEIGHT) / ROW) + OVERSCAN)
  return (
    <div style={{ height: HEIGHT, overflowY: 'auto' }} onScroll={e => setScrollTop(e.currentTarget.scrollTop)} data-list>
      <div style={{ height: count * ROW, position: 'relative' }}>
        {Array.from({ length: end - start }, (_, k) => {
          const i = start + k
          return (
            <div key={i} style={{ ...rowStyle, position: 'absolute', top: i * ROW, left: 0, right: 0, background: 'var(--bg-elev)' }}>
              {row(i)}
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
          label="Rendering mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'naive', label: 'Render every row' },
            { value: 'virtual', label: 'Virtualized' },
          ]}
        />
        <label className="row" style={{ gap: 6 }}>
          Rows
          <select value={count} onChange={e => setCount(Number(e.target.value))}>
            <option value={1000}>1,000</option>
            <option value={10000}>10,000</option>
            <option value={30000}>30,000</option>
          </select>
        </label>
      </div>
      <div className="grid cols-2" style={{ marginBottom: 12 }}>
        <div className="stat card flat">
          <div className="label">DOM nodes in list</div>
          <div className="value" style={{ color: stats.nodes > 5000 ? 'var(--bad)' : 'var(--ok)' }}>{stats.nodes.toLocaleString()}</div>
        </div>
        <div className="stat card flat">
          <div className="label">last render + commit</div>
          <div className="value" style={{ color: stats.ms > 100 ? 'var(--bad)' : 'var(--ok)' }}>{stats.ms.toFixed(1)} ms</div>
        </div>
      </div>
      <div className="viz-stage" ref={wrap} style={{ padding: 0, overflow: 'hidden' }}>
        {mode === 'naive' ? <Naive key={count} count={count} /> : <Virtual key={count} count={count} />}
      </div>
      <Note>
        A virtualized list renders only the rows inside the viewport plus a small overscan ({OVERSCAN} rows), positioned absolutely inside a spacer as tall as the full list. Scroll both versions and compare DOM nodes: thousands vs a few dozen. Production apps use TanStack Virtual, which also handles variable row heights.
      </Note>
    </div>
  )
}
