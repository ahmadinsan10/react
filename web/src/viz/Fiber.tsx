import { useMemo, useState } from 'react'
import { Note, StepControls, Toggle, useStepper } from './common'

type F = { id: string; label: string; x: number; y: number; parent?: string }
const FIBERS: F[] = [
  { id: 'root', label: 'HostRoot', x: 300, y: 30 },
  { id: 'app', label: 'App', x: 300, y: 90, parent: 'root' },
  { id: 'header', label: 'Header', x: 140, y: 160, parent: 'app' },
  { id: 'main', label: 'Main', x: 420, y: 160, parent: 'app' },
  { id: 'logo', label: 'Logo', x: 80, y: 230, parent: 'header' },
  { id: 'nav', label: 'Nav', x: 200, y: 230, parent: 'header' },
  { id: 'list', label: 'List', x: 360, y: 230, parent: 'main' },
  { id: 'side', label: 'Sidebar', x: 490, y: 230, parent: 'main' },
  { id: 'i1', label: 'Item', x: 320, y: 300, parent: 'list' },
  { id: 'i2', label: 'Item', x: 410, y: 300, parent: 'list' },
]
const kids = (id: string) => FIBERS.filter(f => f.parent === id)

type Step = { phase: 'begin' | 'complete' | 'commit' | 'yield' | 'urgent' | 'restart' | 'done'; id?: string; text: string; lane: string }

function workLoop(lane: string): Step[] {
  const out: Step[] = []
  const walk = (f: F) => {
    out.push({ phase: 'begin', id: f.id, text: `beginWork(${f.label}): call the component / diff its children`, lane })
    for (const c of kids(f.id)) walk(c)
    out.push({ phase: 'complete', id: f.id, text: `completeWork(${f.label}): prepare DOM changes, bubble effects up to parent`, lane })
  }
  walk(FIBERS[0]!)
  return out
}

function buildSteps(interrupt: boolean): Step[] {
  const render = workLoop('TransitionLane')
  const commit: Step[] = [
    { phase: 'commit', text: 'COMMIT (synchronous, not interruptible): apply DOM mutations', lane: 'TransitionLane' },
    { phase: 'commit', text: 'Run layout effects, then schedule passive effects (useEffect)', lane: 'TransitionLane' },
    { phase: 'done', text: 'Browser paints. Done.', lane: '—' },
  ]
  if (!interrupt) return [...render, ...commit]
  const cut = 9
  return [
    ...render.slice(0, cut),
    { phase: 'yield', text: 'Time slice (~5ms) used up: shouldYield() → true. Return control to the browser.', lane: 'TransitionLane' },
    { phase: 'urgent', text: 'User clicks! A SyncLane update arrives: higher priority than the transition.', lane: 'SyncLane' },
    { phase: 'urgent', text: 'React renders and commits the urgent update first (fast, small).', lane: 'SyncLane' },
    { phase: 'restart', text: 'The half-built transition tree is stale; React throws it away and restarts from the root.', lane: 'TransitionLane' },
    ...render,
    ...commit,
  ]
}

export default function Fiber() {
  const [interrupt, setInterrupt] = useState(false)
  const steps = useMemo(() => buildSteps(interrupt), [interrupt])
  const s = useStepper(steps.length, 700)
  const st = steps[s.i]!

  // Derive which fibers are begun / completed in the current pass (since the last restart).
  const lastRestart = steps.slice(0, s.i + 1).map(x => x.phase).lastIndexOf('restart')
  const pass = steps.slice(lastRestart + 1, s.i + 1)
  const begun = new Set(pass.filter(x => x.phase === 'begin').map(x => x.id))
  const completed = new Set(pass.filter(x => x.phase === 'complete').map(x => x.id))
  const committed = pass.some(x => x.phase === 'commit')

  const fill = (id: string) =>
    committed ? 'var(--ok-soft)' : completed.has(id) ? 'var(--violet-soft)' : begun.has(id) ? 'var(--accent-soft)' : 'var(--bg-elev)'
  const stroke = (id: string) =>
    st.id === id ? (st.phase === 'begin' ? 'var(--accent)' : 'var(--violet)') : committed ? 'var(--ok)' : 'var(--border)'

  return (
    <div>
      <StepControls
        s={s}
        total={steps.length}
        extra={
          <Toggle
            checked={interrupt}
            onChange={v => {
              setInterrupt(v)
              s.reset()
            }}
          >
            Interrupt with an urgent update
          </Toggle>
        }
      />
      <div className="viz-stage">
        <div className="row" style={{ marginBottom: 8 }}>
          <span className={`pill ${st.phase === 'commit' || st.phase === 'done' ? 'ok' : st.phase === 'urgent' ? 'warn' : 'accent'}`}>
            {st.phase === 'commit' || st.phase === 'done' ? 'Commit phase' : st.phase === 'urgent' ? 'Urgent work' : 'Render phase (interruptible)'}
          </span>
          <span className="pill violet">lane: {st.lane}</span>
        </div>
        <svg viewBox="0 0 580 330" width="100%" role="img" aria-label="Fiber tree work loop">
          {FIBERS.filter(f => f.parent).map(f => {
            const p = FIBERS.find(x => x.id === f.parent)!
            return <line key={f.id} x1={p.x} y1={p.y + 15} x2={f.x} y2={f.y - 15} stroke="var(--border)" strokeWidth={2} />
          })}
          {FIBERS.map(f => (
            <g key={f.id}>
              <rect x={f.x - 42} y={f.y - 15} width={84} height={30} rx={8} fill={fill(f.id)} stroke={stroke(f.id)} strokeWidth={st.id === f.id ? 3 : 1.5} />
              <text x={f.x} y={f.y + 4} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--text)">
                {f.label}
              </text>
              {st.id === f.id && (
                <text x={f.x} y={f.y - 21} textAnchor="middle" fontSize="11" fontWeight="800" fill={st.phase === 'begin' ? 'var(--accent)' : 'var(--violet)'}>
                  {st.phase === 'begin' ? '↓ begin' : '↑ complete'}
                </text>
              )}
            </g>
          ))}
        </svg>
        <div className="viz-legend">
          <span style={{ ['--c' as string]: 'var(--accent)' }}>beginWork (going down)</span>
          <span style={{ ['--c' as string]: 'var(--violet)' }}>completeWork (going up)</span>
          <span style={{ ['--c' as string]: 'var(--ok)' }}>committed to DOM</span>
        </div>
      </div>
      <Note>{st.text}</Note>
    </div>
  )
}
