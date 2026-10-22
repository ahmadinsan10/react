import { Link } from 'react-router'
import { LEVELS } from '../data/levels'
import { QUESTIONS } from '../data/quizzes'
import { Bar, Heatmap, Icon, Ring } from '../components/ui'
import { dueCards, isComplete, isMastered, overallStats, streak, topicKey } from '../store/logic'
import { useProgress } from '../store/progress'
import { VIZ } from '../viz/registry'
import type { Progress } from '../store/logic'
import type { Level } from '../data/types'

/** The single most useful next action inside a level. */
function nextAction(p: Progress, l: Level): { text: string; to: string } {
  const topic = l.topics.find(t => !t.stretch && !p.topics[topicKey(l.id, t.id)])
  if (topic) return { text: `Read: ${topic.title}`, to: `/level/${l.slug}/learn/${topic.id}` }
  const viz = l.vizIds.find(v => !p.vizSeen[v])
  if (viz) return { text: `Explore: ${VIZ.find(x => x.id === viz)?.title ?? viz}`, to: `/lab/${viz}` }
  const unmastered = QUESTIONS.filter(q => q.level === l.id && !isMastered(p.cards[q.id]))
  if (unmastered.length) return { text: `Take the Level ${l.id} quiz (${unmastered.length} to master)`, to: `/level/${l.slug}?tab=quiz` }
  const task = l.projects.flatMap(pr => pr.tasks).find(t => !p.tasks[t.id])
  if (task) return { text: `Build: ${task.text}`, to: `/level/${l.slug}?tab=project` }
  return { text: 'Confirm the checkpoint', to: `/level/${l.slug}?tab=checkpoint` }
}

export function Dashboard() {
  const p = useProgress()
  const { per, ratio, currentLevel } = overallStats(p)
  const due = dueCards(p).length
  const days = streak(p.activity)
  const topicsDone = Object.keys(p.topics).length
  const totalTopics = LEVELS.reduce((s, l) => s + l.topics.filter(t => !t.stretch).length, 0)
  const tasksDone = Object.keys(p.tasks).length
  const totalTasks = LEVELS.reduce((s, l) => s + l.projects.reduce((a, pr) => a + pr.tasks.length, 0), 0)
  const mastered = QUESTIONS.filter(q => isMastered(p.cards[q.id])).length
  const answered = Object.values(p.cards)
  const accuracy = answered.length
    ? answered.reduce((s, c) => s + c.correct, 0) / Math.max(1, answered.reduce((s, c) => s + c.correct + c.wrong, 0))
    : 0
  const next = nextAction(p, currentLevel)
  const fresh = Object.keys(p.activity).length === 0

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Dashboard</div>
        <h1>{fresh ? 'Welcome to your React journey' : 'Welcome back'}</h1>
        <p>
          13 levels from JavaScript foundations to React internals and production engineering. Each level has lessons, interactive visualizations, a quiz with spaced
          repetition, a hands-on project and a checkpoint.
        </p>
      </div>

      <div className="grid cols-3" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr)', marginBottom: 16 }}>
        <div className="card row" style={{ gap: 20, flexWrap: 'nowrap' }}>
          <Ring value={ratio} size={110} stroke={10} />
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">Continue · Level {currentLevel.id}</div>
            <h3 style={{ marginBottom: 4 }}>{currentLevel.title}</h3>
            <p className="subtle" style={{ marginBottom: 10 }}>{next.text}</p>
            <Link className="btn primary" to={next.to}>
              Continue <Icon name="chevron" size={16} />
            </Link>
          </div>
        </div>
        <div className="card stat">
          <div className="label">🔥 Streak</div>
          <div className="value">{days} day{days === 1 ? '' : 's'}</div>
          <p className="subtle" style={{ margin: '6px 0 0' }}>{days === 0 ? 'Complete any lesson, task or question today to start one.' : 'Keep it going: one small step a day.'}</p>
        </div>
        <Link to="/review" className="card stat" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="label">🧠 Due for review</div>
          <div className="value" style={{ color: due ? 'var(--bad)' : 'var(--ok)' }}>{due}</div>
          <p className="subtle" style={{ margin: '6px 0 0' }}>{due ? 'Review now to lock it into long-term memory.' : 'Nothing due. Take a quiz to add cards.'}</p>
        </Link>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        {[
          ['Lessons', topicsDone, totalTopics],
          ['Project tasks', tasksDone, totalTasks],
          ['Questions mastered', mastered, QUESTIONS.length],
          ['Visualizations explored', Object.keys(p.vizSeen).length, VIZ.length],
        ].map(([label, done, total]) => (
          <div key={label as string} className="card stat">
            <div className="label">{label}</div>
            <div className="value">
              {done}
              <span className="subtle" style={{ fontSize: '1rem', fontWeight: 600 }}> / {total}</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <Bar value={(done as number) / (total as number)} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid cols-2" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', marginBottom: 16 }}>
        <div className="card">
          <div className="row" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Activity</h3>
            <span className="spacer" />
            <span className="subtle">last 6 months</span>
          </div>
          <Heatmap activity={p.activity} />
          <div className="row subtle" style={{ marginTop: 10 }}>
            <span>Quiz accuracy: <strong style={{ color: 'var(--text)' }}>{answered.length ? `${Math.round(accuracy * 100)}%` : '—'}</strong></span>
            <span>· Started {new Date(p.startedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="card">
          <h3>Phases</h3>
          {(['Foundations', 'Building', 'Mastery', 'Expert'] as const).map(phase => {
            const idx = LEVELS.map((l, i) => (l.phase === phase ? i : -1)).filter(i => i >= 0)
            const r = idx.reduce((s, i) => s + (per[i]?.ratio ?? 0), 0) / idx.length
            return (
              <div key={phase} style={{ marginBottom: 12 }}>
                <div className="row" style={{ marginBottom: 4 }}>
                  <strong style={{ fontSize: '0.9rem' }}>{phase}</strong>
                  <span className="subtle">Levels {idx[0]}–{idx[idx.length - 1]}</span>
                  <span className="spacer" />
                  <span className="subtle">{Math.round(r * 100)}%</span>
                </div>
                <Bar value={r} />
              </div>
            )
          })}
        </div>
      </div>

      <h2 style={{ marginTop: 28 }}>All levels</h2>
      <div className="grid cols-3">
        {LEVELS.map((l, i) => {
          const s = per[i]!
          const done = isComplete(s.ratio)
          return (
            <Link key={l.id} to={`/level/${l.slug}`} className="card" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <Ring value={s.ratio} size={52} stroke={6} label={done ? '✓' : String(l.id)} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="row" style={{ gap: 6 }}>
                  <span className="pill">{l.phase}</span>
                  {l.id === currentLevel.id && !done && <span className="pill accent">current</span>}
                </div>
                <h3 style={{ margin: '6px 0 2px', fontSize: '0.98rem' }}>{l.title}</h3>
                <div className="subtle">
                  {s.topicsDone}/{s.topicsTotal} lessons · {s.tasksDone}/{s.tasksTotal} tasks · {s.quizMastered}/{s.quizTotal} quiz
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
