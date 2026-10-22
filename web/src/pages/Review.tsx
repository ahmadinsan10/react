import { useState } from 'react'
import { Link } from 'react-router'
import { LEVELS } from '../data/levels'
import { QUESTIONS } from '../data/quizzes'
import type { Question } from '../data/types'
import { QuizRunner } from '../components/QuizRunner'
import { BOX_INTERVAL_DAYS, dueCards } from '../store/logic'
import { useProgress } from '../store/progress'

export function Review() {
  const p = useProgress()
  // Freeze the session's deck when it starts, so answering doesn't reshuffle it mid-review.
  const [session, setSession] = useState<Question[] | null>(null)
  const due = dueCards(p)
  const cards = Object.values(p.cards)
  const boxes = [1, 2, 3, 4, 5].map(b => cards.filter(c => c.box === b).length)
  const maxBox = Math.max(1, ...boxes)
  const upcoming = cards.filter(c => c.due > Date.now()).sort((a, b) => a.due - b.due)[0]

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Spaced repetition</div>
        <h1>Review</h1>
        <p>
          Every question you answer becomes a card in a <strong>Leitner system</strong>. Correct answers move a card up a box and push its next review further away (1, 3, 7, 16, then 35
          days). A wrong answer sends it back to box 1. Reviewing a little every day beats cramming.
        </p>
      </div>

      {session ? (
        <div className="card">
          <QuizRunner questions={session} title="Review session" />
          <button className="btn ghost sm" style={{ marginTop: 12 }} onClick={() => setSession(null)}>
            End session
          </button>
        </div>
      ) : (
        <div className="grid cols-2" style={{ alignItems: 'start' }}>
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <div className="stat">
              <div className="label">Due now</div>
              <div className="value" style={{ fontSize: '3rem', color: due.length ? 'var(--bad)' : 'var(--ok)' }}>{due.length}</div>
            </div>
            {due.length > 0 ? (
              <button className="btn primary" style={{ marginTop: 12 }} onClick={() => setSession(due)}>
                Start review ({due.length})
              </button>
            ) : cards.length === 0 ? (
              <p className="muted" style={{ marginTop: 12 }}>
                No cards yet. Take a level quiz to start: <Link to={`/level/${LEVELS[0]!.slug}?tab=quiz`}>Level 0 quiz</Link>.
              </p>
            ) : (
              <p className="muted" style={{ marginTop: 12 }}>
                All caught up!{upcoming && <> Next card due {new Date(upcoming.due).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}.</>}
              </p>
            )}
          </div>
          <div className="card">
            <h3>Cards by box</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 160, padding: '0 8px' }}>
              {boxes.map((n, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontWeight: 700 }}>{n}</span>
                  <div style={{ width: '100%', height: `${(n / maxBox) * 100}%`, minHeight: 4, borderRadius: '6px 6px 0 0', background: `color-mix(in srgb, var(--ok) ${20 + i * 20}%, var(--bg-sunk))` }} />
                  <span className="subtle">Box {i + 1}</span>
                  <span className="subtle" style={{ fontSize: '0.7rem' }}>{BOX_INTERVAL_DAYS[i + 1]}d</span>
                </div>
              ))}
            </div>
            <p className="subtle" style={{ marginTop: 12 }}>
              {cards.length} of {QUESTIONS.length} questions seen. Cards in box 2+ count as mastered.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function Exam() {
  const [levels, setLevels] = useState<Set<number>>(() => new Set(LEVELS.map(l => l.id)))
  const [count, setCount] = useState(15)
  const [deck, setDeck] = useState<Question[] | null>(null)
  const [runId, setRunId] = useState(0)
  const pool = QUESTIONS.filter(q => levels.has(q.level))

  const start = () => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count)
    setDeck(shuffled)
    setRunId(r => r + 1)
  }

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Exam mode</div>
        <h1>Mixed practice exam</h1>
        <p>Random questions across the levels you choose, in random order, like a real interview screen. Results feed your spaced-repetition review.</p>
      </div>
      {deck ? (
        <div className="card">
          <QuizRunner key={runId} questions={deck} title="Exam" shuffle={false} />
          <button className="btn ghost sm" style={{ marginTop: 12 }} onClick={() => setDeck(null)}>
            Back to exam setup
          </button>
        </div>
      ) : (
        <div className="card">
          <h3>Levels</h3>
          <div className="row" style={{ marginBottom: 12 }}>
            <button className="btn sm ghost" onClick={() => setLevels(new Set(LEVELS.map(l => l.id)))}>All</button>
            <button className="btn sm ghost" onClick={() => setLevels(new Set())}>None</button>
          </div>
          <div className="grid cols-3" style={{ gap: 4 }}>
            {LEVELS.map(l => (
              <label key={l.id} className="check" style={{ padding: '6px 10px' }}>
                <input
                  type="checkbox"
                  checked={levels.has(l.id)}
                  onChange={() =>
                    setLevels(s => {
                      const n = new Set(s)
                      if (n.has(l.id)) n.delete(l.id)
                      else n.add(l.id)
                      return n
                    })
                  }
                />
                <span>
                  {l.id}. {l.title}
                </span>
              </label>
            ))}
          </div>
          <div className="row" style={{ marginTop: 16 }}>
            <label className="row" style={{ gap: 8 }}>
              Questions
              <input type="range" min={5} max={Math.max(5, pool.length)} value={Math.min(count, Math.max(5, pool.length))} onChange={e => setCount(Number(e.target.value))} />
              <strong>{Math.min(count, pool.length)}</strong>
            </label>
            <span className="subtle">from a pool of {pool.length}</span>
            <span className="spacer" />
            <button className="btn primary" onClick={start} disabled={pool.length === 0}>
              Start exam
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
