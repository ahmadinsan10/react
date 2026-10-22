import { useEffect, useState } from 'react'
import type { Question } from '../data/types'
import { recordAnswer } from '../store/logic'
import { setProgress } from '../store/progress'
import { Md } from './Md'
import { Bar, Icon } from './ui'

type Props = {
  questions: Question[]
  title?: string
  onFinish?: (score: number, total: number) => void
  shuffle?: boolean
}

function shuffled<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** Answer options are shuffled per question so you learn the content, not the letter. */
function prepare(qs: Question[], shuffleQs: boolean) {
  return (shuffleQs ? shuffled(qs) : qs).map(q => ({ q, order: shuffled(q.options.map((_, i) => i)) }))
}

export function QuizRunner({ questions, title, onFinish, shuffle = true }: Props) {
  const [deck, setDeck] = useState(() => prepare(questions, shuffle))
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [results, setResults] = useState<boolean[]>([])

  const done = idx >= deck.length
  const current = deck[idx]

  const choose = (original: number) => {
    if (picked !== null || !current) return
    const ok = original === current.q.answer
    setPicked(original)
    setResults(r => [...r, ok])
    setProgress(p => recordAnswer(p, current.q.id, ok))
  }

  const next = () => {
    const nextIdx = idx + 1
    setIdx(nextIdx)
    setPicked(null)
    if (nextIdx >= deck.length) onFinish?.(results.filter(Boolean).length, deck.length)
  }

  // Keyboard: 1-4 to answer, Enter to continue.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (!current) return
      if (picked === null) {
        const n = Number(e.key)
        if (n >= 1 && n <= current.order.length) choose(current.order[n - 1]!)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (deck.length === 0) {
    return <p className="muted">No questions here yet.</p>
  }

  if (done || !current) {
    const score = results.filter(Boolean).length
    const pct = score / deck.length
    return (
      <div className="card flat" style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ color: pct >= 0.8 ? 'var(--ok)' : 'var(--warn)' }}>
          <Icon name="trophy" size={40} />
        </div>
        <h2 style={{ marginTop: 8 }}>
          {score} / {deck.length} correct
        </h2>
        <p className="muted">
          {pct === 1
            ? 'Perfect. These cards move up a box and come back later for review.'
            : pct >= 0.8
              ? 'Strong result. Missed questions are now due in your Review queue.'
              : 'Re-read the lessons for this level, then try again. Missed questions are in your Review queue.'}
        </p>
        <button
          className="btn primary"
          onClick={() => {
            setDeck(prepare(questions, shuffle))
            setIdx(0)
            setResults([])
            setPicked(null)
          }}
        >
          <Icon name="reset" /> Try again
        </button>
      </div>
    )
  }

  const { q, order } = current
  const correct = picked !== null && picked === q.answer

  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        {title && <strong>{title}</strong>}
        <span className="subtle">
          Question {idx + 1} of {deck.length} · <span className="pill">Level {q.level}</span>
        </span>
        <span className="spacer" />
        <span className="subtle">
          Press <kbd>1</kbd>–<kbd>{order.length}</kbd> to answer, <kbd>Enter</kbd> for next
        </span>
      </div>
      <Bar value={idx / deck.length} />
      <h3 style={{ marginTop: 18 }}>{q.prompt}</h3>
      {q.code && (
        <pre>
          <code>{q.code}</code>
        </pre>
      )}
      <div role="group" aria-label="Answer options">
        {order.map((orig, i) => {
          const state = picked === null ? '' : orig === q.answer ? 'correct' : orig === picked ? 'wrong' : ''
          return (
            <button key={orig} className={`quiz-option ${state}`} disabled={picked !== null} onClick={() => choose(orig)}>
              <span className="key">{i + 1}</span>
              <span>
                <Md text={q.options[orig]!} />
              </span>
            </button>
          )
        })}
      </div>
      {picked !== null && (
        <>
          <div className={`explain ${correct ? 'good' : 'bad'}`} role="status">
            <strong>{correct ? 'Correct. ' : 'Not quite. '}</strong>
            <Md text={q.explanation} />
          </div>
          <button className="btn primary" onClick={next} autoFocus>
            {idx + 1 === deck.length ? 'See results' : 'Next question'} <Icon name="chevron" />
          </button>
        </>
      )}
    </div>
  )
}
