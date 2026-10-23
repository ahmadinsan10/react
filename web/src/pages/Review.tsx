import { useState } from 'react'
import { Link } from 'react-router'
import type { Question } from '../data/types'
import { QuizRunner } from '../components/QuizRunner'
import { BOX_INTERVAL_DAYS, dueCards } from '../store/logic'
import { useProgress } from '../store/progress'
import { defineStrings, locale, useLang, useLevels, useQuestions, useStrings } from '../i18n'

const S = defineStrings({
  en: {
    eyebrow: 'Spaced repetition',
    title: 'Review',
    intro:
      'Every question you answer becomes a card in a Leitner system. Correct answers move a card up a box and push its next review further away (1, 3, 7, 16, then 35 days). A wrong answer sends it back to box 1. Reviewing a little every day beats cramming.',
    session: 'Review session',
    endSession: 'End session',
    dueNow: 'Due now',
    start: 'Start review ({n})',
    noCards: 'No cards yet. Take a level quiz to start:',
    level0Quiz: 'Level 0 quiz',
    caughtUp: 'All caught up!',
    nextDue: 'Next card due {date}.',
    byBox: 'Cards by box',
    box: 'Box {n}',
    days: '{n}d',
    seen: '{a} of {b} questions seen. Cards in box 2+ count as mastered.',
    examEyebrow: 'Exam mode',
    examTitle: 'Mixed practice exam',
    examIntro: 'Random questions across the levels you choose, in random order, like a real interview screen. Results feed your spaced-repetition review.',
    exam: 'Exam',
    backSetup: 'Back to exam setup',
    levels: 'Levels',
    all: 'All',
    none: 'None',
    questions: 'Questions',
    pool: 'from a pool of {n}',
    startExam: 'Start exam',
  },
  id: {
    eyebrow: 'Pengulangan berjarak',
    title: 'Ulang Materi',
    intro:
      'Setiap soal yang kamu jawab menjadi kartu dalam sistem Leitner. Jawaban benar menaikkan kartu ke kotak berikutnya dan menunda jadwal ulangnya lebih lama (1, 3, 7, 16, lalu 35 hari). Jawaban salah mengembalikan kartu ke kotak 1. Mengulang sedikit setiap hari jauh lebih efektif daripada belajar kebut semalam.',
    session: 'Sesi mengulang',
    endSession: 'Akhiri sesi',
    dueNow: 'Perlu diulang sekarang',
    start: 'Mulai mengulang ({n})',
    noCards: 'Belum ada kartu. Kerjakan kuis salah satu level untuk memulai:',
    level0Quiz: 'Kuis Level 0',
    caughtUp: 'Semua sudah beres!',
    nextDue: 'Kartu berikutnya dijadwalkan {date}.',
    byBox: 'Kartu per kotak',
    box: 'Kotak {n}',
    days: '{n} hr',
    seen: '{a} dari {b} soal sudah pernah dijawab. Kartu di kotak 2 ke atas dihitung sudah dikuasai.',
    examEyebrow: 'Mode Ujian',
    examTitle: 'Ujian latihan campuran',
    examIntro: 'Soal acak dari level yang kamu pilih, dengan urutan acak, mirip tahap screening interview sungguhan. Hasilnya juga masuk ke jadwal pengulangan berjarakmu.',
    exam: 'Ujian',
    backSetup: 'Kembali ke pengaturan ujian',
    levels: 'Level',
    all: 'Semua',
    none: 'Kosongkan',
    questions: 'Jumlah soal',
    pool: 'dari total {n} soal',
    startExam: 'Mulai ujian',
  },
})

export function Review() {
  const p = useProgress()
  const s = useStrings(S)
  const lang = useLang()
  const LEVELS = useLevels()
  const QUESTIONS = useQuestions()
  // Freeze the session's deck (by id) when it starts, so answering doesn't reshuffle it mid-review.
  const [sessionIds, setSessionIds] = useState<string[] | null>(null)
  const due = dueCards(p)
  const cards = Object.values(p.cards)
  const boxes = [1, 2, 3, 4, 5].map(b => cards.filter(c => c.box === b).length)
  const maxBox = Math.max(1, ...boxes)
  const upcoming = cards.filter(c => c.due > Date.now()).sort((a, b) => a.due - b.due)[0]
  const session = sessionIds?.map(id => QUESTIONS.find(q => q.id === id)).filter((q): q is Question => !!q) ?? null

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">{s('eyebrow')}</div>
        <h1>{s('title')}</h1>
        <p>{s('intro')}</p>
      </div>

      {session ? (
        <div className="card">
          <QuizRunner key={lang} questions={session} title={s('session')} />
          <button className="btn ghost sm" style={{ marginTop: 12 }} onClick={() => setSessionIds(null)}>
            {s('endSession')}
          </button>
        </div>
      ) : (
        <div className="grid cols-2" style={{ alignItems: 'start' }}>
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <div className="stat">
              <div className="label">{s('dueNow')}</div>
              <div className="value" style={{ fontSize: '3rem', color: due.length ? 'var(--bad)' : 'var(--ok)' }}>
                {due.length}
              </div>
            </div>
            {due.length > 0 ? (
              <button className="btn primary" style={{ marginTop: 12 }} onClick={() => setSessionIds(due.map(q => q.id))}>
                {s('start', { n: due.length })}
              </button>
            ) : cards.length === 0 ? (
              <p className="muted" style={{ marginTop: 12 }}>
                {s('noCards')} <Link to={`/level/${LEVELS[0]!.slug}?tab=quiz`}>{s('level0Quiz')}</Link>.
              </p>
            ) : (
              <p className="muted" style={{ marginTop: 12 }}>
                {s('caughtUp')}{' '}
                {upcoming && s('nextDue', { date: new Date(upcoming.due).toLocaleDateString(locale(lang), { weekday: 'long', month: 'short', day: 'numeric' }) })}
              </p>
            )}
          </div>
          <div className="card">
            <h3>{s('byBox')}</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 160, padding: '0 8px' }}>
              {boxes.map((n, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontWeight: 700 }}>{n}</span>
                  <div style={{ width: '100%', height: `${(n / maxBox) * 100}%`, minHeight: 4, borderRadius: '6px 6px 0 0', background: `color-mix(in srgb, var(--ok) ${20 + i * 20}%, var(--bg-sunk))` }} />
                  <span className="subtle">{s('box', { n: i + 1 })}</span>
                  <span className="subtle" style={{ fontSize: '0.7rem' }}>
                    {s('days', { n: BOX_INTERVAL_DAYS[i + 1] ?? 0 })}
                  </span>
                </div>
              ))}
            </div>
            <p className="subtle" style={{ marginTop: 12 }}>
              {s('seen', { a: cards.length, b: QUESTIONS.length })}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function Exam() {
  const s = useStrings(S)
  const lang = useLang()
  const LEVELS = useLevels()
  const QUESTIONS = useQuestions()
  const [levels, setLevels] = useState<Set<number>>(() => new Set(LEVELS.map(l => l.id)))
  const [count, setCount] = useState(15)
  const [deckIds, setDeckIds] = useState<string[] | null>(null)
  const [runId, setRunId] = useState(0)
  const pool = QUESTIONS.filter(q => levels.has(q.level))
  const deck = deckIds?.map(id => QUESTIONS.find(q => q.id === id)).filter((q): q is Question => !!q) ?? null

  const start = () => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count)
    setDeckIds(shuffled.map(q => q.id))
    setRunId(r => r + 1)
  }

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">{s('examEyebrow')}</div>
        <h1>{s('examTitle')}</h1>
        <p>{s('examIntro')}</p>
      </div>
      {deck ? (
        <div className="card">
          <QuizRunner key={`${runId}-${lang}`} questions={deck} title={s('exam')} shuffle={false} />
          <button className="btn ghost sm" style={{ marginTop: 12 }} onClick={() => setDeckIds(null)}>
            {s('backSetup')}
          </button>
        </div>
      ) : (
        <div className="card">
          <h3>{s('levels')}</h3>
          <div className="row" style={{ marginBottom: 12 }}>
            <button className="btn sm ghost" onClick={() => setLevels(new Set(LEVELS.map(l => l.id)))}>
              {s('all')}
            </button>
            <button className="btn sm ghost" onClick={() => setLevels(new Set())}>
              {s('none')}
            </button>
          </div>
          <div className="grid cols-3" style={{ gap: 4 }}>
            {LEVELS.map(l => (
              <label key={l.id} className="check" style={{ padding: '6px 10px' }}>
                <input
                  type="checkbox"
                  checked={levels.has(l.id)}
                  onChange={() =>
                    setLevels(set => {
                      const n = new Set(set)
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
              {s('questions')}
              <input type="range" min={5} max={Math.max(5, pool.length)} value={Math.min(count, Math.max(5, pool.length))} onChange={e => setCount(Number(e.target.value))} />
              <strong>{Math.min(count, pool.length)}</strong>
            </label>
            <span className="subtle">{s('pool', { n: pool.length })}</span>
            <span className="spacer" />
            <button className="btn primary" onClick={start} disabled={pool.length === 0}>
              {s('startExam')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
