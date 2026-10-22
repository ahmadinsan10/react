import { useEffect, useRef, useState } from 'react'
import { Note } from './common'

const VARIANTS = [
  {
    id: 'snapshot',
    title: 'Snapshot value ×3',
    code: 'setCount(count + 1)\nsetCount(count + 1)\nsetCount(count + 1)',
    note: '`count` is a snapshot for this render. All three calls compute the same value, so the count only goes up by 1.',
  },
  {
    id: 'updater',
    title: 'Updater function ×3',
    code: 'setCount(c => c + 1)\nsetCount(c => c + 1)\nsetCount(c => c + 1)',
    note: 'Updater functions are queued and each receives the result of the previous one: +3.',
  },
  {
    id: 'mixed',
    title: 'Mixed',
    code: 'setCount(count + 5)\nsetCount(c => c + 1)\nsetCount(42)',
    note: 'React processes the queue in order: replace with count+5, then +1, then replace with 42. The last replacement wins.',
  },
  {
    id: 'async',
    title: 'Inside setTimeout',
    code: 'setTimeout(() => {\n  setCount(c => c + 1)\n  setFlag(f => !f)\n}, 0)',
    note: 'Since React 18, updates are batched everywhere — even in timeouts and promises. Two state updates, still one render.',
  },
] as const

export default function Batching() {
  const [count, setCount] = useState(0)
  const [flag, setFlag] = useState(false)
  const [active, setActive] = useState<string>('snapshot')
  const commits = useRef(0)
  const commitsEl = useRef<HTMLDivElement>(null)

  // Count commits in an effect (not during render) and write them straight to the DOM,
  // so measuring renders doesn't itself cause renders.
  useEffect(() => {
    commits.current++
    if (commitsEl.current) commitsEl.current.textContent = String(commits.current)
  })

  const run = (id: string) => {
    setActive(id)
    if (id === 'snapshot') {
      setCount(count + 1)
      setCount(count + 1)
      setCount(count + 1)
    } else if (id === 'updater') {
      setCount(c => c + 1)
      setCount(c => c + 1)
      setCount(c => c + 1)
    } else if (id === 'mixed') {
      setCount(count + 5)
      setCount(c => c + 1)
      setCount(42)
    } else {
      setTimeout(() => {
        setCount(c => c + 1)
        setFlag(f => !f)
      }, 0)
    }
  }

  const v = VARIANTS.find(x => x.id === active)!

  return (
    <div>
      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        {VARIANTS.map(x => (
          <button key={x.id} className={`btn${active === x.id ? ' primary' : ''}`} onClick={() => run(x.id)} style={{ flexDirection: 'column', alignItems: 'stretch', padding: 10, whiteSpace: 'normal' }}>
            <span>{x.title}</span>
            <pre style={{ margin: '6px 0 0', fontSize: '0.72rem', textAlign: 'left', background: 'transparent', border: 0, padding: 0, color: 'inherit' }}>
              <code>{x.code}</code>
            </pre>
          </button>
        ))}
      </div>
      <div className="viz-stage">
        <div className="grid cols-3">
          <div className="stat">
            <div className="label">count</div>
            <div className="value" key={count} style={{ animation: 'pop .3s' }}>{count}</div>
          </div>
          <div className="stat">
            <div className="label">flag</div>
            <div className="value">{String(flag)}</div>
          </div>
          <div className="stat">
            <div className="label">commits so far</div>
            <div className="value" ref={commitsEl}>0</div>
          </div>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn sm ghost" onClick={() => { setCount(0); setFlag(false) }}>
            Reset values
          </button>
        </div>
      </div>
      <Note>{`${v.note} Each click adds exactly one commit (watch **commits so far**): several updates, one render. That is batching.`}</Note>
    </div>
  )
}
