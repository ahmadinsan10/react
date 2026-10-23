import { useEffect, useRef, useState } from 'react'
import { Note, Segmented } from './common'
import { useLang } from '../i18n/lang'

const T = {
  en: {
    strategy: 'Fetch strategy', naive: 'Naive fetch in effect', abort: 'With cleanup (abort / ignore)', reset: 'Reset',
    placeholder: 'Type "apple" quickly, then try "pea"…', search: 'Search fruits', showing: 'Showing results for:',
    stale: (q: string) => `⚠ stale: input is "${q}"`, matches: '✓ matches input', none: 'No fruits match.', timeline: 'Request timeline',
    status: { pending: 'pending', applied: 'applied', ignored: 'ignored', aborted: 'aborted' } as Record<Req['status'], string>,
    inFlight: 'in flight', applied: 'response applied to UI', aborted: 'aborted / ignored',
    nNaive: 'Every response is applied when it arrives. Short queries are slower here, so the response for "a" can land AFTER "apple" and overwrite it, leaving the UI showing results for text you no longer have. Look for the red **stale** badge.',
    nAbort: 'The effect cleanup aborts the previous request whenever the query changes, so only the latest request can ever update the UI. This is exactly what libraries like TanStack Query do for you.',
  },
  id: {
    strategy: 'Strategi fetch', naive: 'Fetch polos di effect', abort: 'Dengan cleanup (abort / ignore)', reset: 'Reset',
    placeholder: 'Ketik "apple" dengan cepat, lalu coba "pea"…', search: 'Cari buah', showing: 'Menampilkan hasil untuk:',
    stale: (q: string) => `⚠ stale: input-nya "${q}"`, matches: '✓ sesuai input', none: 'Tidak ada buah yang cocok.', timeline: 'Timeline request',
    status: { pending: 'pending', applied: 'dipakai', ignored: 'diabaikan', aborted: 'di-abort' } as Record<Req['status'], string>,
    inFlight: 'sedang berjalan', applied: 'response diterapkan ke UI', aborted: 'di-abort / diabaikan',
    nNaive: 'Setiap response langsung diterapkan begitu tiba. Di sini query pendek sengaja lebih lambat, jadi response untuk "a" bisa datang SETELAH "apple" dan menimpanya, sehingga UI menampilkan hasil untuk teks yang sudah tidak ada di input. Perhatikan badge merah **stale**.',
    nAbort: 'Cleanup effect meng-abort request sebelumnya setiap kali query berubah, jadi hanya request terakhir yang bisa meng-update UI. Persis inilah yang dikerjakan library seperti TanStack Query untukmu.',
  },
}

type Req = { id: number; q: string; start: number; end: number; status: 'pending' | 'applied' | 'ignored' | 'aborted' }

const FRUITS = ['apple', 'apricot', 'avocado', 'banana', 'blackberry', 'blueberry', 'cherry', 'coconut', 'grape', 'grapefruit', 'guava', 'kiwi', 'lemon', 'lime', 'mango', 'melon', 'orange', 'papaya', 'peach', 'pear', 'pineapple', 'plum', 'raspberry', 'strawberry']

function fakeSearch(q: string, signal: AbortSignal): Promise<string[]> {
  // Shorter queries are "slower" so out-of-order responses happen often.
  const delay = 400 + Math.random() * 600 + Math.max(0, 6 - q.length) * 350
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => resolve(FRUITS.filter(f => f.includes(q.toLowerCase()))), delay)
    signal.addEventListener('abort', () => {
      clearTimeout(id)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

export default function RaceCondition() {
  const t = T[useLang()]
  const [mode, setMode] = useState<'naive' | 'abort'>('naive')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ q: string; items: string[] } | null>(null)
  const [reqs, setReqs] = useState<Req[]>([])
  const seq = useRef(0)
  const [now, setNow] = useState(() => performance.now())
  const t0 = useRef(performance.now())

  useEffect(() => {
    if (!query) return
    const id = ++seq.current
    const controller = new AbortController()
    const start = performance.now()
    setReqs(r => [...r, { id, q: query, start, end: 0, status: 'pending' }])
    let ignore = false
    fakeSearch(query, controller.signal)
      .then(items => {
        const end = performance.now()
        if (mode === 'abort' && ignore) return
        setResults({ q: query, items })
        setReqs(r => r.map(x => (x.id === id ? { ...x, end, status: 'applied' } : x)))
      })
      .catch(() => {
        setReqs(r => r.map(x => (x.id === id ? { ...x, end: performance.now(), status: 'aborted' } : x)))
      })
    return () => {
      if (mode === 'abort') {
        ignore = true
        controller.abort()
      }
    }
  }, [query, mode])

  // Animate the timeline while requests are pending.
  const anyPending = reqs.some(r => r.status === 'pending')
  useEffect(() => {
    if (!anyPending) return
    let raf = requestAnimationFrame(function tick() {
      setNow(performance.now())
      raf = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [anyPending])

  const stale = results && results.q !== query
  const span = Math.max(3000, (anyPending ? now : Math.max(...reqs.map(r => r.end), 0)) - t0.current + 300)
  const x = (t: number) => ((t - t0.current) / span) * 100

  const reset = () => {
    setQuery('')
    setResults(null)
    setReqs([])
    t0.current = performance.now()
  }

  return (
    <div>
      <div className="viz-controls">
        <Segmented
          label={t.strategy}
          value={mode}
          onChange={m => {
            setMode(m)
            reset()
          }}
          options={[
            { value: 'naive', label: t.naive },
            { value: 'abort', label: t.abort },
          ]}
        />
        <button className="btn sm ghost" onClick={reset}>{t.reset}</button>
      </div>
      <div className="viz-stage">
        <input
          type="text"
          value={query}
          onChange={e => {
            if (reqs.length === 0) t0.current = performance.now()
            setQuery(e.target.value)
          }}
          placeholder={t.placeholder}
          aria-label={t.search}
          style={{ width: '100%', fontSize: '1rem' }}
        />
        <div className="row" style={{ margin: '10px 0' }}>
          <span className="subtle">{t.showing}</span>
          <strong>{results ? `"${results.q}"` : '—'}</strong>
          {stale && <span className="pill" style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}>{t.stale(query)}</span>}
          {results && !stale && <span className="pill ok">{t.matches}</span>}
        </div>
        <div className="row" style={{ minHeight: 30 }}>
          {results?.items.slice(0, 10).map(f => (
            <span key={f} className="chip o" style={{ marginBottom: 0 }}>{f}</span>
          ))}
          {results && results.items.length === 0 && <span className="subtle">{t.none}</span>}
        </div>
        <h4 style={{ margin: '14px 0 6px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-3)' }}>{t.timeline}</h4>
        <div style={{ position: 'relative' }}>
          {reqs.slice(-10).map(r => {
            const end = r.status === 'pending' ? now : r.end
            const color = r.status === 'applied' ? 'var(--ok)' : r.status === 'aborted' ? 'var(--text-3)' : 'var(--warn)'
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 22, fontSize: '0.75rem', fontFamily: 'var(--mono)' }}>
                <span style={{ width: 90, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>"{r.q}"</span>
                <div style={{ position: 'relative', flex: 1, height: 10 }}>
                  <div style={{ position: 'absolute', left: `${x(r.start)}%`, width: `${Math.max(0.5, x(end) - x(r.start))}%`, height: '100%', borderRadius: 5, background: color, opacity: r.status === 'aborted' ? 0.4 : 1 }} />
                </div>
                <span style={{ width: 64, color }}>{t.status[r.status]}</span>
              </div>
            )
          })}
        </div>
        <div className="viz-legend" style={{ marginTop: 8 }}>
          <span style={{ ['--c' as string]: 'var(--warn)' }}>{t.inFlight}</span>
          <span style={{ ['--c' as string]: 'var(--ok)' }}>{t.applied}</span>
          <span style={{ ['--c' as string]: 'var(--text-3)' }}>{t.aborted}</span>
        </div>
      </div>
      <Note>
        {mode === 'naive'
          ? t.nNaive
          : t.nAbort}
      </Note>
    </div>
  )
}
