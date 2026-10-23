import { useState } from 'react'
import { Note } from './common'
import { useLang } from '../i18n/lang'

const T = {
  en: {
    dbErr: (l: string) => `${l} reads the database but became a Client Component: server-only code can't run in the browser.`,
    stateErr: (l: string) => `${l} uses useState/onClick but is a Server Component: add 'use client'.`,
    puzzle: 'Puzzle: fix every build error with the smallest client bundle. Click a component to toggle', pass1: 'Pass <Reviews> to Tabs as', pass2: '(instead of importing it inside Tabs)',
    aria: 'Server and client component tree', dashed: 'dashed = passed as children', shipped: 'Client JS shipped', errors: 'Build errors', noErrors: '✓ No errors',
    note: "`'use client'` marks a **boundary**: that component and everything it *imports* becomes client code. Untick \"Pass Reviews as children\": Reviews (and its 70kb Markdown library) gets pulled into the client bundle and can no longer read the database. Passing server components *as children* keeps them on the server even inside a client component. Aim to push `'use client'` down to the leaves.",
  },
  id: {
    dbErr: (l: string) => `${l} membaca database tapi berubah jadi Client Component: kode khusus server tidak bisa jalan di browser.`,
    stateErr: (l: string) => `${l} memakai useState/onClick tapi masih Server Component: tambahkan 'use client'.`,
    puzzle: 'Teka-teki: bereskan semua error build dengan client bundle sekecil mungkin. Klik sebuah component untuk menyalakan/mematikan', pass1: 'Kirim <Reviews> ke Tabs sebagai', pass2: '(bukan meng-import-nya di dalam Tabs)',
    aria: 'Pohon Server dan Client Component', dashed: 'garis putus-putus = dikirim sebagai children', shipped: 'JS yang dikirim ke client', errors: 'Error build', noErrors: '✓ Tidak ada error',
    note: "`'use client'` menandai sebuah **batas (boundary)**: component itu beserta semua yang di-*import*-nya menjadi kode client. Hapus centang \"Kirim Reviews sebagai children\": Reviews (beserta library Markdown 70kb-nya) ikut tertarik ke client bundle dan tidak bisa lagi membaca database. Mengirim Server Component *sebagai children* membuatnya tetap di server, walaupun berada di dalam Client Component. Usahakan `'use client'` didorong sejauh mungkin ke komponen paling ujung (leaf).",
  },
} as const

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
  const t = T[useLang()]
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
    if (c && n.needs === 'db') return [t.dbErr(n.label)]
    if (!c && n.needs === 'state') return [t.stateErr(n.label)]
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
        <span className="subtle">{t.puzzle} <code>'use client'</code>.</span>
        <label className="row" style={{ gap: 6, fontSize: '0.88rem' }}>
          <input type="checkbox" checked={slotMode} onChange={e => setSlotMode(e.target.checked)} />
          {t.pass1} <code>children</code> {t.pass2}
        </label>
      </div>
      <div className="grid cols-2" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)' }}>
        <div className="viz-stage">
          <svg viewBox="0 0 620 340" width="100%" role="img" aria-label={t.aria}>
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
            <span style={{ ['--c' as string]: 'var(--text-3)' }}>{t.dashed}</span>
          </div>
        </div>
        <div className="viz-stage">
          <div className="stat">
            <div className="label">{t.shipped}</div>
            <div className="value" style={{ color: bundle > 60 ? 'var(--bad)' : 'var(--ok)' }}>{bundle} kb</div>
          </div>
          <h4 style={{ margin: '14px 0 6px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-3)' }}>{t.errors}</h4>
          {errors.length === 0 ? (
            <span className="pill ok">{t.noErrors}</span>
          ) : (
            errors.map(e => (
              <div key={e} className="chip r" style={{ fontFamily: 'var(--sans)' }}>
                {e}
              </div>
            ))
          )}
        </div>
      </div>
      <Note>{t.note}</Note>
    </div>
  )
}
