import { memo, useDeferredValue, useEffect, useRef, useState, useTransition } from 'react'
import { Note, Segmented } from './common'
import { useLang } from '../i18n/lang'

const T = {
  en: {
    strategy: 'Update strategy', normal: 'Normal setState', intro: 'This demo renders a deliberately slow list (~300 ms of CPU per update).', start: 'Start demo',
    placeholder: 'Type fast, e.g. 1a2b3c…', filter: 'Filter list', avg: 'avg input lag', worst: 'worst', status: 'list status', updating: 'updating…', upToDate: 'up to date',
    nBlocking: 'Every keystroke must wait for the whole slow list to render before the input can show the character. Type quickly and watch the input lag climb past 200 ms: this is a poor INP score.',
    nTransition: 'The input update is urgent; the list update is wrapped in startTransition, so React can interrupt it when you type again. The input stays responsive and the list catches up. isPending lets you show it is stale.',
    nDeferred: 'useDeferredValue gives the list a lagging copy of the text. React first re-renders with the old value (cheap, because the list is memoized), then renders the new value in the background, interruptibly.',
  },
  id: {
    strategy: 'Strategi update', normal: 'setState biasa', intro: 'Demo ini me-render list yang sengaja dibuat lambat (~300 ms CPU per update).', start: 'Mulai demo',
    placeholder: 'Ketik cepat, misalnya 1a2b3c…', filter: 'Filter list', avg: 'rata-rata lag input', worst: 'terburuk', status: 'status list', updating: 'memperbarui…', upToDate: 'sudah terbaru',
    nBlocking: 'Setiap ketikan harus menunggu seluruh list yang lambat selesai di-render sebelum input bisa menampilkan karakternya. Ketik cepat dan lihat lag input naik melewati 200 ms: ini skor INP yang buruk.',
    nTransition: 'Update input bersifat mendesak; update list dibungkus startTransition, jadi React bisa menginterupsinya saat kamu mengetik lagi. Input tetap responsif dan list menyusul belakangan. isPending memungkinkan kamu menandai bahwa list-nya sedang stale.',
    nDeferred: 'useDeferredValue memberi list salinan teks yang tertinggal. React lebih dulu re-render dengan nilai lama (murah, karena list-nya sudah di-memo), lalu me-render nilai baru di background dan bisa diinterupsi.',
  },
} as const

const WORDS = Array.from({ length: 3000 }, (_, i) => `item-${i.toString(36)}-${((i * 2654435761) % 9973).toString(36)}`)

function SlowItem({ text, query }: { text: string; query: string }) {
  // Artificial slowness: ~0.25ms per item, so a full list costs ~ hundreds of ms.
  const end = performance.now() + 0.25
  while (performance.now() < end) {
    /* burn CPU */
  }
  const i = query ? text.indexOf(query) : -1
  return (
    <li style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', listStyle: 'none' }}>
      {i < 0 ? text : (
        <>
          {text.slice(0, i)}
          <mark>{text.slice(i, i + query.length)}</mark>
          {text.slice(i + query.length)}
        </>
      )}
    </li>
  )
}

const SlowList = memo(function SlowList({ query }: { query: string }) {
  const items = WORDS.filter(w => w.includes(query)).slice(0, 1200)
  return (
    <ul style={{ margin: 0, padding: 0, columns: 3, maxHeight: 220, overflow: 'hidden' }}>
      {items.map(w => (
        <SlowItem key={w} text={w} query={query} />
      ))}
    </ul>
  )
})

function useInputLag() {
  const [samples, setSamples] = useState<number[]>([])
  const pending = useRef<number | null>(null)
  const onInput = () => {
    pending.current = performance.now()
    requestAnimationFrame(() =>
      setTimeout(() => {
        if (pending.current !== null) {
          const lag = performance.now() - pending.current
          pending.current = null
          setSamples(s => [...s.slice(-19), lag])
        }
      }),
    )
  }
  return { samples, onInput, reset: () => setSamples([]) }
}

export default function Transition() {
  const t = T[useLang()]
  const [mode, setMode] = useState<'blocking' | 'transition' | 'deferred'>('blocking')
  const [text, setText] = useState('')
  const [listQuery, setListQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const deferred = useDeferredValue(text)
  const lag = useInputLag()
  const [enabled, setEnabled] = useState(false)

  useEffect(() => lag.reset(), [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = (v: string) => {
    lag.onInput()
    setText(v)
    if (mode === 'blocking') setListQuery(v)
    else if (mode === 'transition') startTransition(() => setListQuery(v))
  }

  const query = mode === 'deferred' ? deferred : listQuery
  const stale = mode === 'deferred' ? text !== deferred : isPending
  const avg = lag.samples.length ? lag.samples.reduce((a, b) => a + b, 0) / lag.samples.length : 0
  const max = lag.samples.length ? Math.max(...lag.samples) : 0

  return (
    <div>
      <div className="viz-controls">
        <Segmented
          label={t.strategy}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'blocking', label: t.normal },
            { value: 'transition', label: 'useTransition' },
            { value: 'deferred', label: 'useDeferredValue' },
          ]}
        />
      </div>
      <div className="viz-stage">
        {!enabled ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <p className="muted">{t.intro}</p>
            <button className="btn primary" onClick={() => setEnabled(true)}>{t.start}</button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={text}
              onChange={e => onChange(e.target.value)}
              placeholder={t.placeholder}
              aria-label={t.filter}
              style={{ width: '100%', fontSize: '1rem' }}
            />
            <div className="grid cols-3" style={{ margin: '12px 0' }}>
              <div className="stat">
                <div className="label">{t.avg}</div>
                <div className="value" style={{ color: avg > 100 ? 'var(--bad)' : 'var(--ok)', fontSize: '1.4rem' }}>{avg.toFixed(0)} ms</div>
              </div>
              <div className="stat">
                <div className="label">{t.worst}</div>
                <div className="value" style={{ color: max > 200 ? 'var(--bad)' : 'var(--ok)', fontSize: '1.4rem' }}>{max.toFixed(0)} ms</div>
              </div>
              <div className="stat">
                <div className="label">{t.status}</div>
                <div className="value" style={{ fontSize: '1.1rem', color: stale ? 'var(--warn)' : 'var(--ok)' }}>{stale ? t.updating : t.upToDate}</div>
              </div>
            </div>
            <div style={{ opacity: stale ? 0.55 : 1, transition: 'opacity .2s' }}>
              <SlowList query={query} />
            </div>
          </>
        )}
      </div>
      <Note>
        {mode === 'blocking'
          ? t.nBlocking
          : mode === 'transition'
            ? t.nTransition
            : t.nDeferred}
      </Note>
    </div>
  )
}
