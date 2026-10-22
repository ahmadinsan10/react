import { useState } from 'react'
import { Note } from './common'

type Node = {
  id: string
  label: string
  parent?: string
  /** How the parent includes it: imported & rendered directly, or passed in as children (a slot). */
  via?: 'import' | 'slot'
  needs?: 'state' | 'db'
  kb: number
  x: number
  y: number
}

const NODES: Node[] = [
  { id: 'page', label: 'ProductPage', kb: 2, x: 300, y: 40, needs: 'db' },
  { id: 'gallery', label: 'Gallery', parent: 'page', via: 'import', kb: 18, x: 110, y: 130, needs: 'state' },
  { id: 'details', label: 'Details', parent: 'page', via: 'import', kb: 6, x: 300, y: 130 },
  { id: 'tabs', label: 'Tabs', parent: 'page', via: 'import', kb: 9, x: 490, y: 130, needs: 'state' },
  { id: 'price', label: 'Price', parent: 'details', via: 'import', kb: 3, x: 230, y: 220 },
  { id: 'cart', label: 'AddToCart', parent: 'details', via: 'import', kb: 7, x: 370, y: 220, needs: 'state' },
  { id: 'reviews', label: 'Reviews', parent: 'tabs', via: 'slot', kb: 25, x: 440, y: 220, needs: 'db' },
  { id: 'specs', label: 'Specs', parent: 'tabs', via: 'import', kb: 12, x: 545, y: 220 },
  { id: 'md', label: 'Markdown (lib)', parent: 'reviews', via: 'import', kb: 70, x: 440, y: 305 },
]

export default function RscBoundary() {
  const [marked, setMarked] = useState<Set<string>>(new Set(['gallery', 'tabs']))
  const [slotMode, setSlotMode] = useState(true)

  // A component is client if marked 'use client' OR imported (not slotted) by a client component.
  const isClient = (n: Node): boolean => {
    if (marked.has(n.id)) return true
    if (!n.parent) return false
    const p = NODES.find(x => x.id === n.parent)!
    const via = n.id === 'reviews' && !slotMode ? 'import' : n.via
    return via === 'import' && isClient(p)
  }

  const errors = NODES.flatMap(n => {
    const c = isClient(n)
    if (c && n.needs === 'db') return [`${n.label} reads the database but became a Client Component: server-only code can't run in the browser.`]
    if (!c && n.needs === 'state') return [`${n.label} uses useState/onClick but is a Server Component: add 'use client'.`]
    return []
  })
  const bundle = NODES.filter(isClient).reduce((s, n) => s + n.kb, 0)
  const toggle = (id: string) =>
    setMarked(m => {
      const next = new Set(m)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div>
      <div className="viz-controls">
        <span className="subtle">Puzzle: fix every build error with the smallest client bundle. Click a component to toggle <code>'use client'</code>.</span>
        <label className="row" style={{ gap: 6, fontSize: '0.88rem' }}>
          <input type="checkbox" checked={slotMode} onChange={e => setSlotMode(e.target.checked)} />
          Pass &lt;Reviews&gt; to Tabs as <code>children</code> (instead of importing it inside Tabs)
        </label>
      </div>
      <div className="grid cols-2" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)' }}>
        <div className="viz-stage">
          <svg viewBox="0 0 620 340" width="100%" role="img" aria-label="Server and client component tree">
            {NODES.filter(n => n.parent).map(n => {
              const p = NODES.find(x => x.id === n.parent)!
              const slot = n.id === 'reviews' ? slotMode : n.via === 'slot'
              return <line key={n.id} x1={p.x} y1={p.y + 18} x2={n.x} y2={n.y - 18} stroke="var(--text-3)" strokeWidth={1.5} strokeDasharray={slot ? '5 4' : undefined} />
            })}
            {NODES.map(n => {
              const c = isClient(n)
              const err = (c && n.needs === 'db') || (!c && n.needs === 'state')
              return (
                <g key={n.id} className="roadmap-node" onClick={() => toggle(n.id)} role="button" tabIndex={0} aria-label={`${n.label}: ${c ? 'client' : 'server'} component`} onKeyDown={e => e.key === 'Enter' && toggle(n.id)}>
                  <rect x={n.x - 58} y={n.y - 18} width={116} height={36} rx={9} fill={c ? 'var(--warn-soft)' : 'var(--violet-soft)'} stroke={err ? 'var(--bad)' : marked.has(n.id) ? 'var(--warn)' : 'transparent'} strokeWidth={err ? 3 : 2} />
                  <text x={n.x} y={n.y - 1} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text)">
                    {n.label}
                  </text>
                  <text x={n.x} y={n.y + 12} textAnchor="middle" fontSize="9.5" fill="var(--text-2)">
                    {c ? `client · ${n.kb}kb` : 'server · 0kb JS'}
                    {n.needs === 'db' ? ' · db' : n.needs === 'state' ? ' · state' : ''}
                  </text>
                  {marked.has(n.id) && (
                    <text x={n.x - 54} y={n.y - 22} fontSize="9" fontWeight="800" fill="var(--warn)">
                      'use client'
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
          <div className="viz-legend">
            <span style={{ ['--c' as string]: 'var(--violet)' }}>Server Component</span>
            <span style={{ ['--c' as string]: 'var(--warn)' }}>Client Component</span>
            <span style={{ ['--c' as string]: 'var(--text-3)' }}>dashed = passed as children</span>
          </div>
        </div>
        <div className="viz-stage">
          <div className="stat">
            <div className="label">Client JS shipped</div>
            <div className="value" style={{ color: bundle > 60 ? 'var(--bad)' : 'var(--ok)' }}>{bundle} kb</div>
          </div>
          <h4 style={{ margin: '14px 0 6px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-3)' }}>Build errors</h4>
          {errors.length === 0 ? (
            <span className="pill ok">✓ No errors</span>
          ) : (
            errors.map(e => (
              <div key={e} className="chip r" style={{ fontFamily: 'var(--sans)' }}>
                {e}
              </div>
            ))
          )}
        </div>
      </div>
      <Note>
        `'use client'` marks a **boundary**: that component and everything it *imports* becomes client code. Untick "Pass Reviews as children": Reviews (and its 70kb Markdown library) gets pulled into the client bundle and can no longer read the database. Passing server components *as children* keeps them on the server even inside a client component. Aim to push `'use client'` down to the leaves.
      </Note>
    </div>
  )
}
