import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { LEVELS } from '../data/levels'
import { QUESTIONS } from '../data/quizzes'
import { VIZ } from '../viz/registry'

type Item = { kind: string; title: string; hint: string; to: string; haystack: string }

const ITEMS: Item[] = [
  { kind: 'Page', title: 'Dashboard', hint: 'Progress overview', to: '/', haystack: 'dashboard home progress' },
  { kind: 'Page', title: 'Roadmap', hint: 'All levels on a map', to: '/roadmap', haystack: 'roadmap map levels' },
  { kind: 'Page', title: 'Visualization Lab', hint: 'All interactive visualizations', to: '/lab', haystack: 'lab visualizations demos' },
  { kind: 'Page', title: 'Review', hint: 'Spaced-repetition review', to: '/review', haystack: 'review spaced repetition due flashcards' },
  { kind: 'Page', title: 'Exam mode', hint: 'Mixed quiz across levels', to: '/exam', haystack: 'exam test practice quiz mixed' },
  { kind: 'Page', title: 'Expert checklist', hint: 'Self-assessment & common mistakes', to: '/checklist', haystack: 'checklist self assessment mistakes capstone' },
  { kind: 'Page', title: 'Settings', hint: 'Theme, export, import, reset', to: '/settings', haystack: 'settings export import backup reset theme' },
  ...LEVELS.map(l => ({ kind: `Level ${l.id}`, title: l.title, hint: l.tagline, to: `/level/${l.slug}`, haystack: `${l.title} ${l.tagline}`.toLowerCase() })),
  ...LEVELS.flatMap(l =>
    l.topics.map(t => ({ kind: 'Lesson', title: t.title, hint: `Level ${l.id} · ${l.title}`, to: `/level/${l.slug}?tab=learn#${t.id}`, haystack: `${t.title} ${t.body}`.toLowerCase() })),
  ),
  ...VIZ.map(v => ({ kind: 'Viz', title: v.title, hint: v.summary, to: `/lab/${v.id}`, haystack: `${v.title} ${v.summary}`.toLowerCase() })),
  ...QUESTIONS.map(q => {
    const l = LEVELS.find(x => x.id === q.level)!
    return { kind: 'Quiz', title: q.prompt, hint: `Level ${q.level} quiz`, to: `/level/${l.slug}?tab=quiz`, haystack: `${q.prompt} ${q.explanation}`.toLowerCase() }
  }),
]

function score(item: Item, terms: string[]) {
  let s = 0
  const title = item.title.toLowerCase()
  for (const t of terms) {
    if (title.startsWith(t)) s += 6
    else if (title.includes(t)) s += 4
    else if (item.haystack.includes(t)) s += 1
    else return -1
  }
  return s + (item.kind === 'Page' ? 1 : 0)
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const navigate = useNavigate()
  const listRef = useRef<HTMLUListElement>(null)

  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (terms.length === 0) return ITEMS.filter(i => i.kind === 'Page' || i.kind.startsWith('Level'))
    return ITEMS.map(i => [i, score(i, terms)] as const)
      .filter(([, s]) => s >= 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([i]) => i)
  }, [q])

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  if (!open) return null

  const go = (item: Item | undefined) => {
    if (!item) return
    onClose()
    setQ('')
    navigate(item.to)
  }

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Search" onMouseDown={e => e.stopPropagation()}>
        <input
          autoFocus
          value={q}
          placeholder="Search lessons, visualizations, quiz questions…"
          aria-label="Search"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={`pal-${sel}`}
          onChange={e => {
            setQ(e.target.value)
            setSel(0)
          }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setSel(s => Math.min(s + 1, results.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setSel(s => Math.max(s - 1, 0))
            } else if (e.key === 'Enter') {
              go(results[sel])
            } else if (e.key === 'Escape') {
              onClose()
            }
          }}
        />
        <ul id="palette-list" role="listbox" ref={listRef}>
          {results.length === 0 && <li className="subtle">No results for "{q}"</li>}
          {results.map((r, i) => (
            <li key={`${r.kind}-${r.to}-${r.title}`} id={`pal-${i}`} role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => go(r)}>
              <span className="kind">{r.kind}</span>
              <span style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                <div className="subtle" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.hint}
                </div>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
