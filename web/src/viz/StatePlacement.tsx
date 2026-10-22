import { useState } from 'react'
import { Note } from './common'

type Node = { q: string; yes: string; no: string } | { answer: string; tool: string; why: string; example: string }

const TREE: Record<string, Node> = {
  start: { q: 'Can the value be calculated from props or other state?', yes: 'derived', no: 'server' },
  derived: { answer: 'Not state at all', tool: 'Compute during render', why: 'Storing derived data creates two sources of truth that drift apart.', example: 'const total = items.reduce(...) — right in the component body.' },
  server: { q: 'Does the data come from (and belong to) a server?', yes: 'serverState', no: 'url' },
  serverState: { answer: 'Server state', tool: 'TanStack Query / RTK Query / Server Components', why: 'It is a cache of remote data: it needs fetching, caching, deduping, refetching and invalidation.', example: "useQuery({ queryKey: ['products', filters], queryFn })" },
  url: { q: 'Should it survive a refresh, be shareable, or work with the back button?', yes: 'urlState', no: 'many' },
  urlState: { answer: 'URL state', tool: 'Search params / route params', why: 'The URL is the one piece of state the browser persists, shares and navigates for free.', example: '/products?category=shoes&sort=price&page=2' },
  many: { q: 'Is it used by only one component (and its children)?', yes: 'local', no: 'siblings' },
  local: { answer: 'Local state', tool: 'useState / useReducer', why: 'The closest possible home. Nothing else re-renders and it is easy to delete.', example: 'const [isOpen, setIsOpen] = useState(false)' },
  siblings: { q: 'Is it shared by a few nearby components?', yes: 'lift', no: 'often' },
  lift: { answer: 'Lifted state', tool: 'Lift to the closest common parent', why: 'Pass values and setters down a level or two. Simple and explicit.', example: 'Parent owns selectedId; List and Details receive it as props.' },
  often: { q: 'Does it change frequently (e.g. on every keystroke or many times a second)?', yes: 'store', no: 'context' },
  store: { answer: 'External store', tool: 'Zustand / Redux Toolkit / Jotai', why: 'Selectors let each component subscribe to just the slice it uses, avoiding app-wide re-renders.', example: 'const count = useCart(s => s.items.length)' },
  context: { answer: 'Context', tool: 'createContext + Provider', why: 'Great for rarely-changing, widely-read values. Every consumer re-renders on change.', example: 'Theme, locale, current user, feature flags.' },
}

export default function StatePlacement() {
  const [path, setPath] = useState<string[]>(['start'])
  const cur = TREE[path[path.length - 1]!]!

  return (
    <div>
      <div className="viz-stage">
        <div className="row" style={{ marginBottom: 14 }}>
          {path.map((p, i) => {
            const n = TREE[p]!
            return (
              <span key={i} className="row" style={{ gap: 4 }}>
                {i > 0 && <span className="subtle">→</span>}
                <button className="btn sm ghost" onClick={() => setPath(path.slice(0, i + 1))} disabled={i === path.length - 1}>
                  {'q' in n ? `Q${i + 1}` : n.answer}
                </button>
              </span>
            )
          })}
        </div>
        {'q' in cur ? (
          <div className="card flat" style={{ textAlign: 'center' }}>
            <div className="eyebrow">Question {path.length}</div>
            <h2>{cur.q}</h2>
            <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
              <button className="btn primary" onClick={() => setPath([...path, cur.yes])}>Yes</button>
              <button className="btn" onClick={() => setPath([...path, cur.no])}>No</button>
            </div>
          </div>
        ) : (
          <div className="card flat" style={{ borderColor: 'var(--ok)' }}>
            <div className="eyebrow" style={{ color: 'var(--ok)' }}>Recommendation</div>
            <h2>{cur.answer}</h2>
            <p>
              <strong>Use:</strong> {cur.tool}
            </p>
            <p className="muted">{cur.why}</p>
            <pre>
              <code>{cur.example}</code>
            </pre>
            <button className="btn" onClick={() => setPath(['start'])}>Classify another piece of state</button>
          </div>
        )}
      </div>
      <Note>
        Order matters: the questions go from the **closest** home to the **widest**. Most state-management pain comes from state living higher than it needs to. Try classifying real examples: a modal's open flag, the cart, search filters, the logged-in user, form input text.
      </Note>
    </div>
  )
}
