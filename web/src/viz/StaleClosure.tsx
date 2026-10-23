import { useEffect, useRef, useState } from 'react'
import { Note, Segmented } from './common'
import { getLang, useLang } from '../i18n/lang'

const T = {
  en: {
    saw: (c: number, r: number) => `Closure saw ${c} · ref saw ${r}`, d1: '1 · Delayed read', d1hint: 'Click "Read in 3s", then click +1 several times before it fires.',
    read: 'Read in 3s', pending: (n: number) => `${n} pending…`, results: 'Results appear here', d2: '2 · Interval with empty-ish deps', intervalCode: 'Interval code',
    stop: 'Stop', start: 'Start', reset: 'Reset',
    note: "Every render creates new functions that **close over that render's values**. A timeout started when count was 2 will always see 2: that is not a bug in React, it is how closures work. To read the *latest* value later, use a ref; to compute from the previous state, use an updater function. In demo 2, the stale version gets stuck at 1 because the interval keeps computing `0 + 1`.",
  },
  id: {
    saw: (c: number, r: number) => `Closure melihat ${c} · ref melihat ${r}`, d1: '1 · Pembacaan tertunda', d1hint: 'Klik "Baca dalam 3 dtk", lalu klik +1 beberapa kali sebelum timer-nya jalan.',
    read: 'Baca dalam 3 dtk', pending: (n: number) => `${n} menunggu…`, results: 'Hasilnya muncul di sini', d2: '2 · Interval dengan deps (nyaris) kosong', intervalCode: 'Kode interval',
    stop: 'Berhenti', start: 'Mulai', reset: 'Reset',
    note: 'Setiap render membuat fungsi baru yang **menangkap (close over) nilai-nilai dari render itu**. Timeout yang dimulai saat count bernilai 2 akan selalu melihat 2: itu bukan bug di React, memang begitulah cara kerja closure. Untuk membaca nilai *terbaru* belakangan, pakai ref; untuk menghitung dari state sebelumnya, pakai fungsi updater. Di demo 2, versi yang stale macet di angka 1 karena interval-nya terus menghitung `0 + 1`.',
  },
} as const

function DelayedAlert() {
  const t = T[useLang()]
  const [count, setCount] = useState(0)
  const latest = useRef(count)
  const [results, setResults] = useState<string[]>([])
  const [pending, setPending] = useState(0)

  useEffect(() => {
    latest.current = count
  }, [count])

  const schedule = () => {
    const captured = count // this render's snapshot
    setPending(p => p + 1)
    setTimeout(() => {
      setResults(r => [T[getLang()].saw(captured, latest.current), ...r].slice(0, 5))
      setPending(p => p - 1)
    }, 3000)
  }

  return (
    <div className="viz-stage">
      <h4 style={{ marginTop: 0 }}>{t.d1}</h4>
      <p className="subtle">{t.d1hint}</p>
      <div className="row">
        <button className="btn sm" onClick={() => setCount(c => c + 1)}>+1</button>
        <span className="stat"><span className="value" style={{ fontSize: '1.4rem' }}>{count}</span></span>
        <button className="btn sm primary" onClick={schedule}>{t.read}</button>
        {pending > 0 && <span className="pill warn">{t.pending(pending)}</span>}
      </div>
      <div className="log" style={{ marginTop: 10, minHeight: 60 }}>
        {results.length === 0 ? <div className="subtle">{t.results}</div> : results.map((r, i) => <div key={i}>{r}</div>)}
      </div>
    </div>
  )
}

function IntervalDemo() {
  const [mode, setMode] = useState<'stale' | 'updater'>('stale')
  const [count, setCount] = useState(0)
  const [running, setRunning] = useState(false)
  const t = T[useLang()]

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      if (mode === 'stale') {
        // Bug: `count` is captured once, when this effect ran.
        setCount(count + 1)
      } else {
        setCount(c => c + 1)
      }
    }, 500)
    return () => clearInterval(id)
    // Deliberately omitting `count` to demonstrate the bug.
  }, [running, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="viz-stage">
      <h4 style={{ marginTop: 0 }}>{t.d2}</h4>
      <Segmented
        label={t.intervalCode}
        value={mode}
        onChange={m => {
          setMode(m)
          setCount(0)
        }}
        options={[
          { value: 'stale', label: 'setCount(count + 1)' },
          { value: 'updater', label: 'setCount(c => c + 1)' },
        ]}
      />
      <pre style={{ marginTop: 10 }}>
        <code>{`useEffect(() => {
  const id = setInterval(() => ${mode === 'stale' ? 'setCount(count + 1)' : 'setCount(c => c + 1)'}, 500)
  return () => clearInterval(id)
}, [])`}</code>
      </pre>
      <div className="row">
        <button className="btn sm primary" onClick={() => setRunning(r => !r)}>{running ? t.stop : t.start}</button>
        <button className="btn sm ghost" onClick={() => setCount(0)}>{t.reset}</button>
        <span className="stat"><span className="value" style={{ fontSize: '1.4rem' }}>{count}</span></span>
      </div>
    </div>
  )
}

export default function StaleClosure() {
  const t = T[useLang()]
  return (
    <div>
      <div className="grid cols-2">
        <DelayedAlert />
        <IntervalDemo />
      </div>
      <Note>{t.note}</Note>
    </div>
  )
}
