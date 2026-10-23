import { Link } from 'react-router'
import { Bar, Heatmap, Icon, Ring } from '../components/ui'
import { dueCards, isComplete, isMastered, overallStats, streak, topicKey } from '../store/logic'
import { useProgress } from '../store/progress'
import { VIZ, vizTitle } from '../viz/registry'
import type { Progress } from '../store/logic'
import type { Level, Question } from '../data/types'
import { defineStrings, locale, useLang, useLevels, useQuestions, useStrings, useT, type Lang } from '../i18n'

const S = defineStrings({
  en: {
    eyebrow: 'Dashboard',
    welcome: 'Welcome to your React journey',
    welcomeBack: 'Welcome back',
    intro:
      '13 levels from JavaScript foundations to React internals and production engineering. Each level has lessons, interactive visualizations, a quiz with spaced repetition, a hands-on project and a checkpoint.',
    continueLevel: 'Continue · Level {n}',
    continue: 'Continue',
    streak: '🔥 Streak',
    days: '{n} days',
    day: '{n} day',
    streakStart: 'Complete any lesson, task or question today to start one.',
    streakKeep: 'Keep it going: one small step a day.',
    due: '🧠 Due for review',
    dueYes: 'Review now to lock it into long-term memory.',
    dueNo: 'Nothing due. Take a quiz to add cards.',
    statLessons: 'Lessons',
    statTasks: 'Project tasks',
    statMastered: 'Questions mastered',
    statViz: 'Visualizations explored',
    activity: 'Activity',
    last6: 'last 6 months',
    accuracy: 'Quiz accuracy:',
    started: '· Started {date}',
    phases: 'Phases',
    levelsRange: 'Levels {a}–{b}',
    allLevels: 'All levels',
    levelSummary: '{a}/{b} lessons · {c}/{d} tasks · {e}/{f} quiz',
    nextRead: 'Read: {x}',
    nextExplore: 'Explore: {x}',
    nextQuiz: 'Take the Level {n} quiz ({m} to master)',
    nextBuild: 'Build: {x}',
    nextCheckpoint: 'Confirm the checkpoint',
  },
  id: {
    eyebrow: 'Dashboard',
    welcome: 'Selamat datang di perjalanan React-mu',
    welcomeBack: 'Selamat datang kembali',
    intro:
      '13 level, dari fondasi JavaScript sampai cara kerja internal React dan engineering untuk production. Setiap level berisi materi, visualisasi interaktif, kuis dengan pengulangan berjarak (spaced repetition), proyek praktik, dan checkpoint.',
    continueLevel: 'Lanjutkan · Level {n}',
    continue: 'Lanjutkan',
    streak: '🔥 Streak',
    days: '{n} hari',
    day: '{n} hari',
    streakStart: 'Selesaikan satu materi, tugas, atau soal hari ini untuk memulai streak.',
    streakKeep: 'Pertahankan: satu langkah kecil setiap hari.',
    due: '🧠 Waktunya diulang',
    dueYes: 'Ulangi sekarang supaya menempel di ingatan jangka panjang.',
    dueNo: 'Belum ada yang perlu diulang. Kerjakan kuis untuk menambah kartu.',
    statLessons: 'Materi',
    statTasks: 'Tugas proyek',
    statMastered: 'Soal dikuasai',
    statViz: 'Visualisasi dicoba',
    activity: 'Aktivitas',
    last6: '6 bulan terakhir',
    accuracy: 'Akurasi kuis:',
    started: '· Mulai {date}',
    phases: 'Tahapan',
    levelsRange: 'Level {a}–{b}',
    allLevels: 'Semua level',
    levelSummary: '{a}/{b} materi · {c}/{d} tugas · {e}/{f} kuis',
    nextRead: 'Baca: {x}',
    nextExplore: 'Coba: {x}',
    nextQuiz: 'Kerjakan kuis Level {n} ({m} soal belum dikuasai)',
    nextBuild: 'Kerjakan: {x}',
    nextCheckpoint: 'Konfirmasi checkpoint',
  },
})

/** The single most useful next action inside a level. */
function nextAction(p: Progress, l: Level, qs: Question[], lang: Lang, s: ReturnType<typeof useStrings<typeof S.en>>): { text: string; to: string } {
  const topic = l.topics.find(t => !t.stretch && !p.topics[topicKey(l.id, t.id)])
  if (topic) return { text: s('nextRead', { x: topic.title }), to: `/level/${l.slug}/learn/${topic.id}` }
  const viz = l.vizIds.find(v => !p.vizSeen[v])
  if (viz) {
    const v = VIZ.find(x => x.id === viz)
    return { text: s('nextExplore', { x: v ? vizTitle(v, lang) : viz }), to: `/lab/${viz}` }
  }
  const unmastered = qs.filter(q => q.level === l.id && !isMastered(p.cards[q.id]))
  if (unmastered.length) return { text: s('nextQuiz', { n: l.id, m: unmastered.length }), to: `/level/${l.slug}?tab=quiz` }
  const task = l.projects.flatMap(pr => pr.tasks).find(t => !p.tasks[t.id])
  if (task) return { text: s('nextBuild', { x: task.text }), to: `/level/${l.slug}?tab=project` }
  return { text: s('nextCheckpoint'), to: `/level/${l.slug}?tab=checkpoint` }
}

export function Dashboard() {
  const p = useProgress()
  const lang = useLang()
  const s = useStrings(S)
  const t = useT()
  const LEVELS = useLevels()
  const QUESTIONS = useQuestions()
  const { per, ratio, currentLevel: cur } = overallStats(p)
  const currentLevel = LEVELS[cur.id]!
  const due = dueCards(p).length
  const days = streak(p.activity)
  const topicsDone = Object.keys(p.topics).length
  const totalTopics = LEVELS.reduce((n, l) => n + l.topics.filter(x => !x.stretch).length, 0)
  const tasksDone = Object.keys(p.tasks).length
  const totalTasks = LEVELS.reduce((n, l) => n + l.projects.reduce((a, pr) => a + pr.tasks.length, 0), 0)
  const mastered = QUESTIONS.filter(q => isMastered(p.cards[q.id])).length
  const answered = Object.values(p.cards)
  const accuracy = answered.length
    ? answered.reduce((n, c) => n + c.correct, 0) / Math.max(1, answered.reduce((n, c) => n + c.correct + c.wrong, 0))
    : 0
  const next = nextAction(p, currentLevel, QUESTIONS, lang, s)
  const fresh = Object.keys(p.activity).length === 0

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">{s('eyebrow')}</div>
        <h1>{fresh ? s('welcome') : s('welcomeBack')}</h1>
        <p>{s('intro')}</p>
      </div>

      <div className="grid cols-3" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr)', marginBottom: 16 }}>
        <div className="card row" style={{ gap: 20, flexWrap: 'nowrap' }}>
          <Ring value={ratio} size={110} stroke={10} />
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">{s('continueLevel', { n: currentLevel.id })}</div>
            <h3 style={{ marginBottom: 4 }}>{currentLevel.title}</h3>
            <p className="subtle" style={{ marginBottom: 10 }}>{next.text}</p>
            <Link className="btn primary" to={next.to}>
              {s('continue')} <Icon name="chevron" size={16} />
            </Link>
          </div>
        </div>
        <div className="card stat">
          <div className="label">{s('streak')}</div>
          <div className="value">{s(days === 1 ? 'day' : 'days', { n: days })}</div>
          <p className="subtle" style={{ margin: '6px 0 0' }}>{days === 0 ? s('streakStart') : s('streakKeep')}</p>
        </div>
        <Link to="/review" className="card stat" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="label">{s('due')}</div>
          <div className="value" style={{ color: due ? 'var(--bad)' : 'var(--ok)' }}>{due}</div>
          <p className="subtle" style={{ margin: '6px 0 0' }}>{due ? s('dueYes') : s('dueNo')}</p>
        </Link>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        {(
          [
            [s('statLessons'), topicsDone, totalTopics],
            [s('statTasks'), tasksDone, totalTasks],
            [s('statMastered'), mastered, QUESTIONS.length],
            [s('statViz'), Object.keys(p.vizSeen).length, VIZ.length],
          ] as const
        ).map(([label, done, total]) => (
          <div key={label} className="card stat">
            <div className="label">{label}</div>
            <div className="value">
              {done}
              <span className="subtle" style={{ fontSize: '1rem', fontWeight: 600 }}> / {total}</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <Bar value={done / total} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid cols-2" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', marginBottom: 16 }}>
        <div className="card">
          <div className="row" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{s('activity')}</h3>
            <span className="spacer" />
            <span className="subtle">{s('last6')}</span>
          </div>
          <Heatmap activity={p.activity} />
          <div className="row subtle" style={{ marginTop: 10 }}>
            <span>
              {s('accuracy')} <strong style={{ color: 'var(--text)' }}>{answered.length ? `${Math.round(accuracy * 100)}%` : '—'}</strong>
            </span>
            <span>{s('started', { date: new Date(p.startedAt).toLocaleDateString(locale(lang)) })}</span>
          </div>
        </div>
        <div className="card">
          <h3>{s('phases')}</h3>
          {(['Foundations', 'Building', 'Mastery', 'Expert'] as const).map(phase => {
            const idx = LEVELS.map((l, i) => (l.phase === phase ? i : -1)).filter(i => i >= 0)
            const r = idx.reduce((n, i) => n + (per[i]?.ratio ?? 0), 0) / idx.length
            return (
              <div key={phase} style={{ marginBottom: 12 }}>
                <div className="row" style={{ marginBottom: 4 }}>
                  <strong style={{ fontSize: '0.9rem' }}>{t(`phase_${phase}`)}</strong>
                  <span className="subtle">{s('levelsRange', { a: idx[0]!, b: idx[idx.length - 1]! })}</span>
                  <span className="spacer" />
                  <span className="subtle">{Math.round(r * 100)}%</span>
                </div>
                <Bar value={r} />
              </div>
            )
          })}
        </div>
      </div>

      <h2 style={{ marginTop: 28 }}>{s('allLevels')}</h2>
      <div className="grid cols-3">
        {LEVELS.map((l, i) => {
          const st = per[i]!
          const done = isComplete(st.ratio)
          return (
            <Link key={l.id} to={`/level/${l.slug}`} className="card" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <Ring value={st.ratio} size={52} stroke={6} label={done ? '✓' : String(l.id)} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="row" style={{ gap: 6 }}>
                  <span className="pill">{t(`phase_${l.phase}`)}</span>
                  {l.id === currentLevel.id && !done && <span className="pill accent">{t('current')}</span>}
                </div>
                <h3 style={{ margin: '6px 0 2px', fontSize: '0.98rem' }}>{l.title}</h3>
                <div className="subtle">
                  {s('levelSummary', { a: st.topicsDone, b: st.topicsTotal, c: st.tasksDone, d: st.tasksTotal, e: st.quizMastered, f: st.quizTotal })}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
