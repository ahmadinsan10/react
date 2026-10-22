import { useState } from 'react'
import { Note, Segmented, Toggle } from './common'

type N = { id: string; parent: string | null; label: string; x: number; y: number; consumer?: boolean; slot?: boolean }

const NODES: N[] = [
  { id: 'app', parent: null, label: 'App', x: 300, y: 40 },
  { id: 'theme', parent: 'app', label: 'ThemeProvider', x: 300, y: 110 },
  { id: 'header', parent: 'theme', label: 'Header', x: 120, y: 190 },
  { id: 'page', parent: 'theme', label: 'Page', x: 340, y: 190 },
  { id: 'footer', parent: 'theme', label: 'Footer', x: 520, y: 190, consumer: true },
  { id: 'logo', parent: 'header', label: 'Logo', x: 60, y: 270 },
  { id: 'toggle', parent: 'header', label: 'ThemeToggle', x: 180, y: 270, consumer: true },
  { id: 'search', parent: 'page', label: 'SearchBox', x: 290, y: 270 },
  { id: 'list', parent: 'page', label: 'ResultList', x: 410, y: 270, slot: true },
  { id: 'row1', parent: 'list', label: 'Row', x: 360, y: 350 },
  { id: 'row2', parent: 'list', label: 'Row', x: 460, y: 350 },
]

const children = (id: string) => NODES.filter(n => n.parent === id)

/**
 * Simplified React rules:
 * - the component whose state changed re-renders
 * - its children re-render too, unless memoized (compiler on) AND their props didn't change
 * - with "lift content up", ResultList is passed as children from App, so Page re-rendering doesn't re-create it
 * - context consumers re-render whenever the context value changes
 */
function simulate(origin: string, kind: 'state' | 'context', memo: boolean, liftUp: boolean) {
  const rendered = new Set<string>()
  const visit = (id: string, forced: boolean) => {
    if (forced) rendered.add(id)
    for (const c of children(id)) {
      const parentRendered = rendered.has(id)
      const createdHere = !(liftUp && c.slot) // slot content was created by App, not Page
      let r = false
      if (parentRendered && createdHere && !memo) r = true
      if (kind === 'context' && c.consumer) r = true
      visit(c.id, r)
    }
  }
  if (kind === 'context') {
    // The provider's value changed: the provider re-renders; consumers below re-render.
    visit('theme', true)
  } else {
    visit(origin, true)
  }
  return rendered
}

export default function RenderTree() {
  const [memo, setMemo] = useState(false)
  const [liftUp, setLiftUp] = useState(false)
  const [mode, setMode] = useState<'state' | 'context'>('state')
  const [origin, setOrigin] = useState('page')
  const [tick, setTick] = useState(0)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [last, setLast] = useState<Set<string>>(new Set())

  const trigger = (id: string) => {
    const r = simulate(id, mode, memo, liftUp)
    setOrigin(id)
    setLast(r)
    setTick(t => t + 1)
    setCounts(c => {
      const next = { ...c }
      r.forEach(n => (next[n] = (next[n] ?? 0) + 1))
      return next
    })
  }

  const byId = Object.fromEntries(NODES.map(n => [n.id, n]))

  return (
    <div>
      <div className="viz-controls">
        <Segmented
          label="Update type"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'state', label: 'setState in a component' },
            { value: 'context', label: 'Change context value' },
          ]}
        />
        <Toggle checked={memo} onChange={setMemo}>
          React Compiler / memo
        </Toggle>
        <Toggle checked={liftUp} onChange={setLiftUp}>
          Lift ResultList up (pass as children)
        </Toggle>
        <button className="btn sm ghost" onClick={() => { setCounts({}); setLast(new Set()) }}>
          Reset counts
        </button>
      </div>
      <div className="viz-stage">
        <svg viewBox="0 0 620 390" width="100%" role="img" aria-label="Component tree showing which components re-render">
          {NODES.filter(n => n.parent).map(n => {
            const p = byId[n.parent!]!
            return <line key={n.id} x1={p.x} y1={p.y + 16} x2={n.x} y2={n.y - 16} stroke="var(--border)" strokeWidth={2} />
          })}
          {NODES.map(n => {
            const hit = last.has(n.id)
            const isOrigin = mode === 'state' && n.id === origin && last.size > 0
            return (
              <g
                key={`${n.id}-${hit ? tick : 0}`}
                className="roadmap-node"
                onClick={() => (mode === 'state' ? trigger(n.id) : trigger('theme'))}
                role="button"
                tabIndex={0}
                aria-label={`${n.label}${hit ? ', re-rendered' : ''}. Rendered ${counts[n.id] ?? 0} times`}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && trigger(mode === 'state' ? n.id : 'theme')}
              >
                <rect
                  x={n.x - 52}
                  y={n.y - 16}
                  width={104}
                  height={32}
                  rx={8}
                  fill={hit ? (isOrigin ? 'var(--bad-soft)' : 'var(--warn-soft)') : 'var(--bg-elev)'}
                  stroke={isOrigin ? 'var(--bad)' : hit ? 'var(--warn)' : n.consumer ? 'var(--violet)' : 'var(--border)'}
                  strokeWidth={hit || n.consumer ? 2 : 1.5}
                  style={hit ? { animation: 'pop .35s ease' } : undefined}
                />
                <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--text)">
                  {n.label}
                </text>
                <circle cx={n.x + 48} cy={n.y - 14} r={10} fill={counts[n.id] ? 'var(--accent)' : 'var(--bg-sunk)'} />
                <text x={n.x + 48} y={n.y - 10} textAnchor="middle" fontSize="10" fontWeight="700" fill={counts[n.id] ? 'var(--accent-text)' : 'var(--text-3)'}>
                  {counts[n.id] ?? 0}
                </text>
              </g>
            )
          })}
        </svg>
        <div className="viz-legend">
          <span style={{ ['--c' as string]: 'var(--bad)' }}>state changed here</span>
          <span style={{ ['--c' as string]: 'var(--warn)' }}>re-rendered</span>
          <span style={{ ['--c' as string]: 'var(--violet)' }}>reads ThemeContext</span>
          <span style={{ ['--c' as string]: 'var(--accent)' }}>render count</span>
        </div>
      </div>
      <Note>
        {mode === 'state'
          ? memo
            ? 'With memoization, children whose props did not change are skipped — only the component that owns the state re-renders. This is what the React Compiler does for you automatically.'
            : liftUp
              ? 'Click Page: ResultList and its rows no longer re-render, because App created that element and passed it as children. Page re-rendering reuses the same element. No memo needed!'
              : 'Click any component to call setState inside it. Without memoization, the whole subtree below it re-renders — even components whose props did not change.'
          : 'Changing a context value re-renders every consumer, wherever it is, even through memoized parents. Split contexts so components only subscribe to what they use.'}
      </Note>
    </div>
  )
}
