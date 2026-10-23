import { useEffect, useState } from 'react'
import type { Question } from '../data/types'
import { recordAnswer } from '../store/logic'
import { setProgress } from '../store/progress'
import { Md } from './Md'
import { Bar, Icon } from './ui'
import { defineStrings, useStrings } from '../i18n'

const S = defineStrings({
  en: {
    empty: 'No questions here yet.',
    score: '{a} / {b} correct',
    perfect: 'Perfect. These cards move up a box and come back later for review.',
    strong: 'Strong result. Missed questions are now due in your Review queue.',
    weak: 'Re-read the lessons for this level, then try again. Missed questions are in your Review queue.',
    again: 'Try again',
    progress: 'Question {a} of {b} ·',
    level: 'Level {n}',
    keysA: 'Press',
    keysB: 'to answer,',
    keysC: 'for next',
    options: 'Answer options',
    correct: 'Correct.',
    wrong: 'Not quite.',
    results: 'See results',
    next: 'Next question',
  },
  id: {
    empty: 'Belum ada soal di sini.',
    score: '{a} / {b} benar',
    perfect: 'Sempurna. Kartu-kartu ini naik ke kotak berikutnya dan akan muncul lagi nanti untuk diulang.',
    strong: 'Hasil yang bagus. Soal yang salah sekarang masuk ke antrean Ulang Materi.',
    weak: 'Baca lagi materi level ini, lalu coba lagi. Soal yang salah sudah masuk ke antrean Ulang Materi.',
    again: 'Coba lagi',
    progress: 'Soal {a} dari {b} ·',
    level: 'Level {n}',
    keysA: 'Tekan',
    keysB: 'untuk menjawab,',
    keysC: 'untuk lanjut',
    options: 'Pilihan jawaban',
    correct: 'Benar.',
    wrong: 'Belum tepat.',
    results: 'Lihat hasil',
    next: 'Soal berikutnya',
  },
})

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
  const s = useStrings(S)
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
    return <p className="muted">{s('empty')}</p>
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
          {s('score', { a: score, b: deck.length })}
        </h2>
        <p className="muted">
          {pct === 1 ? s('perfect') : pct >= 0.8 ? s('strong') : s('weak')}
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
          <Icon name="reset" /> {s('again')}
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
          {s('progress', { a: idx + 1, b: deck.length })} <span className="pill">{s('level', { n: q.level })}</span>
        </span>
        <span className="spacer" />
        <span className="subtle">
          {s('keysA')} <kbd>1</kbd>–<kbd>{order.length}</kbd> {s('keysB')} <kbd>Enter</kbd> {s('keysC')}
        </span>
      </div>
      <Bar value={idx / deck.length} />
      <h3 style={{ marginTop: 18 }}>{q.prompt}</h3>
      {q.code && (
        <pre>
          <code>{q.code}</code>
        </pre>
      )}
      <div role="group" aria-label={s('options')}>
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
            <strong>{correct ? s('correct') : s('wrong')} </strong>
            <Md text={q.explanation} />
          </div>
          <button className="btn primary" onClick={next} autoFocus>
            {idx + 1 === deck.length ? s('results') : s('next')} <Icon name="chevron" />
          </button>
        </>
      )}
    </div>
  )
}
