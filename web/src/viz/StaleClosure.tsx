import { useEffect, useRef, useState } from 'react'
import { Note, Segmented } from './common'

function DelayedAlert() {
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
      setResults(r => [`Closure saw ${captured} · ref saw ${latest.current}`, ...r].slice(0, 5))
      setPending(p => p - 1)
    }, 3000)
  }

  return (
    <div className="viz-stage">
      <h4 style={{ marginTop: 0 }}>1 · Delayed read</h4>
      <p className="subtle">Click "Read in 3s", then click +1 several times before it fires.</p>
      <div className="row">
        <button className="btn sm" onClick={() => setCount(c => c + 1)}>+1</button>
        <span className="stat"><span className="value" style={{ fontSize: '1.4rem' }}>{count}</span></span>
        <button className="btn sm primary" onClick={schedule}>Read in 3s</button>
        {pending > 0 && <span className="pill warn">{pending} pending…</span>}
      </div>
      <div className="log" style={{ marginTop: 10, minHeight: 60 }}>
        {results.length === 0 ? <div className="subtle">Results appear here</div> : results.map((r, i) => <div key={i}>{r}</div>)}
      </div>
    </div>
  )
}

function IntervalDemo() {
  const [mode, setMode] = useState<'stale' | 'updater'>('stale')
  const [count, setCount] = useState(0)
  const [running, setRunning] = useState(false)

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
      <h4 style={{ marginTop: 0 }}>2 · Interval with empty-ish deps</h4>
      <Segmented
        label="Interval code"
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
        <button className="btn sm primary" onClick={() => setRunning(r => !r)}>{running ? 'Stop' : 'Start'}</button>
        <button className="btn sm ghost" onClick={() => setCount(0)}>Reset</button>
        <span className="stat"><span className="value" style={{ fontSize: '1.4rem' }}>{count}</span></span>
      </div>
    </div>
  )
}

export default function StaleClosure() {
  return (
    <div>
      <div className="grid cols-2">
        <DelayedAlert />
        <IntervalDemo />
      </div>
      <Note>
        Every render creates new functions that **close over that render's values**. A timeout started when count was 2 will always see 2: that is not a bug in React, it is how closures work. To read the *latest* value later, use a ref; to compute from the previous state, use an updater function. In demo 2, the stale version gets stuck at 1 because the interval keeps computing `0 + 1`.
      </Note>
    </div>
  )
}
