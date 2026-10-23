import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { VIZ, vizSummary, vizTitle } from '../viz/registry'
import { defineStrings, levelsFor, questionsFor, useLang, useStrings, type Lang } from '../i18n'

type Item = { kind: string; page?: boolean; title: string; hint: string; to: string; haystack: string }

const S = defineStrings({
  en: {
    page: 'Page', level: 'Level {n}', lesson: 'Lesson', viz: 'Viz', quiz: 'Quiz', quizOf: 'Level {n} quiz',
    p_dash: 'Dashboard', p_dash_h: 'Progress overview',
    p_road: 'Roadmap', p_road_h: 'All levels on a map',
    p_lab: 'Visualization Lab', p_lab_h: 'All interactive visualizations',
    p_rev: 'Review', p_rev_h: 'Spaced-repetition review',
    p_exam: 'Exam mode', p_exam_h: 'Mixed quiz across levels',
    p_check: 'Expert checklist', p_check_h: 'Self-assessment & common mistakes',
    p_set: 'Settings', p_set_h: 'Language, sync, export, import, reset',
    placeholder: 'Search lessons, visualizations, quiz questions…',
    search: 'Search',
    none: 'No results for "{q}"',
  },
  id: {
    page: 'Halaman', level: 'Level {n}', lesson: 'Materi', viz: 'Viz', quiz: 'Kuis', quizOf: 'Kuis Level {n}',
    p_dash: 'Dashboard', p_dash_h: 'Ringkasan progres',
    p_road: 'Roadmap', p_road_h: 'Semua level dalam satu peta',
    p_lab: 'Lab Visualisasi', p_lab_h: 'Semua visualisasi interaktif',
    p_rev: 'Ulang Materi', p_rev_h: 'Pengulangan berjarak',
    p_exam: 'Mode Ujian', p_exam_h: 'Kuis campuran lintas level',
    p_check: 'Checklist Ahli', p_check_h: 'Evaluasi diri & kesalahan umum',
    p_set: 'Pengaturan', p_set_h: 'Bahasa, sinkronisasi, ekspor, impor, reset',
    placeholder: 'Cari materi, visualisasi, soal kuis…',
    search: 'Cari',
    none: 'Tidak ada hasil untuk "{q}"',
  },
})

// English page keywords stay searchable in both languages.
const PAGES = [
  ['p_dash', '/', 'dashboard home progress beranda'],
  ['p_road', '/roadmap', 'roadmap map levels peta'],
  ['p_lab', '/lab', 'lab visualizations demos visualisasi'],
  ['p_rev', '/review', 'review spaced repetition due flashcards ulang kartu'],
  ['p_exam', '/exam', 'exam test practice quiz mixed ujian latihan'],
  ['p_check', '/checklist', 'checklist self assessment mistakes capstone evaluasi kesalahan'],
  ['p_set', '/settings', 'settings export import backup reset theme language sync pengaturan bahasa sinkronisasi'],
] as const

const itemCache: Partial<Record<Lang, Item[]>> = {}
function itemsFor(lang: Lang, s: ReturnType<typeof useStrings<typeof S.en>>): Item[] {
  if (itemCache[lang]) return itemCache[lang]
  const LEVELS = levelsFor(lang)
  const items: Item[] = [
    ...PAGES.map(([k, to, kw]) => ({ kind: s('page'), page: true, title: s(k), hint: s(`${k}_h`), to, haystack: `${s(k)} ${s(`${k}_h`)} ${kw}`.toLowerCase() })),
    ...LEVELS.map(l => ({ kind: s('level', { n: l.id }), title: l.title, hint: l.tagline, to: `/level/${l.slug}`, haystack: `${l.title} ${l.tagline}`.toLowerCase() })),
    ...LEVELS.flatMap(l =>
      l.topics.map(t => ({ kind: s('lesson'), title: t.title, hint: `${s('level', { n: l.id })} · ${l.title}`, to: `/level/${l.slug}/learn/${t.id}`, haystack: `${t.title} ${t.body}`.toLowerCase() })),
    ),
    ...VIZ.map(v => ({ kind: s('viz'), title: vizTitle(v, lang), hint: vizSummary(v, lang), to: `/lab/${v.id}`, haystack: `${vizTitle(v, lang)} ${vizSummary(v, lang)} ${v.title}`.toLowerCase() })),
    ...questionsFor(lang).map(q => {
      const l = LEVELS.find(x => x.id === q.level)!
      return { kind: s('quiz'), title: q.prompt, hint: s('quizOf', { n: q.level }), to: `/level/${l.slug}?tab=quiz`, haystack: `${q.prompt} ${q.explanation}`.toLowerCase() }
    }),
  ]
  return (itemCache[lang] = items)
}

function score(item: Item, terms: string[]) {
  let s = 0
  const title = item.title.toLowerCase()
  for (const t of terms) {
    if (title.startsWith(t)) s += 6
    else if (title.includes(t)) s += 4
    else if (item.haystack.includes(t)) s += 1
    else return -1
  }
  return s + (item.page ? 1 : 0)
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const navigate = useNavigate()
  const lang = useLang()
  const str = useStrings(S)
  const ITEMS = itemsFor(lang, str)
  const listRef = useRef<HTMLUListElement>(null)

  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (terms.length === 0) return ITEMS.filter(i => i.page || i.to.startsWith('/level/') && !i.to.includes('/learn/') && !i.to.includes('?'))
    return ITEMS.map(i => [i, score(i, terms)] as const)
      .filter(([, s]) => s >= 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([i]) => i)
  }, [q, ITEMS])

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
      <div className="palette" role="dialog" aria-modal="true" aria-label={str('search')} onMouseDown={e => e.stopPropagation()}>
        <input
          autoFocus
          value={q}
          placeholder={str('placeholder')}
          aria-label={str('search')}
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
          {results.length === 0 && <li className="subtle">{str('none', { q })}</li>}
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
