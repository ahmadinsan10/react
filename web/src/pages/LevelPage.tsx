import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { LEVELS, levelBySlug } from '../data/levels'
import { questionsForLevel } from '../data/quizzes'
import { Md } from '../components/Md'
import { QuizRunner } from '../components/QuizRunner'
import { Bar, Check, Icon, Ring, toast } from '../components/ui'
import { isComplete, isMastered, levelStats, toggleFlag, topicKey } from '../store/logic'
import { setProgress, useProgress } from '../store/progress'
import { VIZ } from '../viz/registry'
import { NotFound } from './NotFound'

const TABS = ['learn', 'visualize', 'quiz', 'project', 'checkpoint'] as const
type Tab = (typeof TABS)[number]

export function LevelPage() {
  const { slug = '' } = useParams()
  const level = levelBySlug(slug)
  const [params, setParams] = useSearchParams()
  const p = useProgress()
  if (!level) return <NotFound />

  const raw = params.get('tab')
  const tab: Tab = (TABS as readonly string[]).includes(raw ?? '') ? (raw as Tab) : 'learn'
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true })
  const s = levelStats(p, level)
  const prev = LEVELS[level.id - 1]
  const next = LEVELS[level.id + 1]
  const qs = questionsForLevel(level.id)
  const vizzes = level.vizIds.map(id => VIZ.find(v => v.id === id)).filter(v => v !== undefined)

  const counts: Record<Tab, string> = {
    learn: `${s.topicsDone}/${s.topicsTotal}`,
    visualize: `${vizzes.filter(v => p.vizSeen[v.id]).length}/${vizzes.length}`,
    quiz: `${s.quizMastered}/${s.quizTotal}`,
    project: `${s.tasksDone}/${s.tasksTotal}`,
    checkpoint: s.checkpoint ? '✓' : '',
  }

  return (
    <div>
      <div className="page-head row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', gap: 20 }}>
        <Ring value={s.ratio} size={84} stroke={8} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow">
            Level {level.id} · {level.phase} · ~{level.weeks} weeks
          </div>
          <h1>{level.title}</h1>
          <p>{level.tagline}</p>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Level sections">
        {TABS.map(t => (
          <button key={t} role="tab" className="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t[0]!.toUpperCase() + t.slice(1)}
            {counts[t] && <span className="count">{counts[t]}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'learn' && <Learn key={level.id} levelId={level.id} />}
        {tab === 'visualize' &&
          (vizzes.length === 0 ? (
            <div className="card flat">
              <p className="muted">This level is about practice and judgment rather than mechanics, so it has no visualization. Explore the full <Link to="/lab">Lab</Link> instead.</p>
            </div>
          ) : (
            <div className="grid cols-2">
              {vizzes.map(v => (
                <Link key={v.id} to={`/lab/${v.id}`} className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
                  <div className="row">
                    <span className="pill violet">{v.kind}</span>
                    {p.vizSeen[v.id] && <span className="pill ok">explored</span>}
                  </div>
                  <h3 style={{ marginTop: 10 }}>{v.title}</h3>
                  <p className="subtle" style={{ margin: 0 }}>{v.summary}</p>
                </Link>
              ))}
            </div>
          ))}
        {tab === 'quiz' && (
          <div className="card">
            <QuizRunner key={level.id} questions={qs} onFinish={(sc, total) => sc === total && toast('Perfect score! 🎉')} />
            <div className="row" style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <span className="subtle">Mastery (answered correctly twice in a row): </span>
              {qs.map(q => (
                <span key={q.id} title={q.prompt} style={{ width: 14, height: 14, borderRadius: 4, background: isMastered(p.cards[q.id]) ? 'var(--ok)' : p.cards[q.id] ? 'var(--warn)' : 'var(--bg-sunk)', border: '1px solid var(--border)' }} />
              ))}
            </div>
          </div>
        )}
        {tab === 'project' && (
          <div className="stack">
            {level.projects.map(pr => {
              const done = pr.tasks.filter(t => p.tasks[t.id]).length
              return (
                <div key={pr.title} className="card">
                  <div className="row" style={{ marginBottom: 6 }}>
                    <h3 style={{ margin: 0 }}>{pr.title}</h3>
                    <span className="spacer" />
                    <span className="subtle">{done}/{pr.tasks.length}</span>
                  </div>
                  <p className="muted">{pr.summary}</p>
                  <Bar value={done / pr.tasks.length} />
                  <div style={{ marginTop: 10 }}>
                    {pr.tasks.map(t => (
                      <Check key={t.id} checked={!!p.tasks[t.id]} onChange={() => setProgress(x => toggleFlag(x, 'tasks', t.id))}>
                        {t.text}
                      </Check>
                    ))}
                  </div>
                </div>
              )
            })}
            <p className="subtle">
              Build each project in its own folder of your repo (e.g. <code>{String(level.id).padStart(2, '0')}-{level.slug}/</code>) and write a short NOTES.md when you finish.
            </p>
          </div>
        )}
        {tab === 'checkpoint' && <CheckpointTab key={level.id} levelId={level.id} />}
      </div>

      <div className="row" style={{ marginTop: 32, justifyContent: 'space-between' }}>
        {prev ? (
          <Link className="btn" to={`/level/${prev.slug}`}>
            ← Level {prev.id}: {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link className="btn" to={`/level/${next.slug}`}>
            Level {next.id}: {next.title} →
          </Link>
        )}
      </div>
    </div>
  )
}

function Learn({ levelId }: { levelId: number }) {
  const level = LEVELS[levelId]!
  const p = useProgress()
  const [open, setOpen] = useState<Set<string>>(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
    const first = level.topics.find(t => !p.topics[topicKey(levelId, t.id)])
    return new Set([hash || first?.id || ''].filter(Boolean))
  })
  const toggleOpen = (id: string) =>
    setOpen(o => {
      const n = new Set(o)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <span className="subtle">Read each lesson, then mark it done. Stretch topics are optional and don't count toward progress.</span>
        <span className="spacer" />
        <button className="btn sm ghost" onClick={() => setOpen(new Set(level.topics.map(t => t.id)))}>Expand all</button>
        <button className="btn sm ghost" onClick={() => setOpen(new Set())}>Collapse all</button>
      </div>
      {level.topics.map(t => {
        const key = topicKey(levelId, t.id)
        const done = !!p.topics[key]
        const isOpen = open.has(t.id)
        return (
          <section key={t.id} id={t.id} className="topic" style={{ scrollMarginTop: 80 }}>
            <button className="topic-head" onClick={() => toggleOpen(t.id)} aria-expanded={isOpen}>
              <span className={`done-dot${done ? ' on' : ''}`}>{done ? '✓' : ''}</span>
              <h3>{t.title}</h3>
              {t.stretch && <span className="pill warn">stretch</span>}
              <span className={`chev${isOpen ? ' open' : ''}`}>
                <Icon name="chevron" />
              </span>
            </button>
            {isOpen && (
              <div className="topic-body">
                <Md text={t.body} />
                <button
                  className={`btn sm${done ? '' : ' primary'}`}
                  onClick={() => {
                    setProgress(x => toggleFlag(x, 'topics', key))
                    if (!done) {
                      const nextTopic = level.topics[level.topics.indexOf(t) + 1]
                      setOpen(o => {
                        const n = new Set(o)
                        n.delete(t.id)
                        if (nextTopic) n.add(nextTopic.id)
                        return n
                      })
                    }
                  }}
                >
                  <Icon name="check" size={14} /> {done ? 'Mark as not done' : 'Mark as understood'}
                </button>
              </div>
            )}
          </section>
        )
      })}
      <div className="card flat" style={{ marginTop: 16 }}>
        <h3>Resources</h3>
        <ul>
          {level.resources.map(r => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noreferrer">
                {r.label} <Icon name="external" size={12} />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function CheckpointTab({ levelId }: { levelId: number }) {
  const level = LEVELS[levelId]!
  const p = useProgress()
  const s = levelStats(p, level)
  const saved = p.notes[String(levelId)] ?? ''
  const [draft, setDraft] = useState(saved)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [status, setStatus] = useState<'saved' | 'typing'>('saved')

  // Debounced autosave of notes.
  useEffect(() => {
    if (draft === saved) return
    setStatus('typing')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setProgress(x => ({ ...x, notes: { ...x.notes, [String(levelId)]: draft } }))
      setStatus('saved')
    }, 600)
    return () => clearTimeout(timer.current)
  }, [draft, saved, levelId])

  const ready = s.topicsDone === s.topicsTotal && s.tasksDone === s.tasksTotal

  return (
    <div className="grid cols-2" style={{ alignItems: 'start' }}>
      <div className="card">
        <div className="eyebrow">Checkpoint</div>
        <h3>{level.checkpoint}</h3>
        <ul className="muted" style={{ fontSize: '0.9rem' }}>
          <li>{s.topicsDone === s.topicsTotal ? '✅' : '⬜'} All lessons understood ({s.topicsDone}/{s.topicsTotal})</li>
          <li>{s.tasksDone === s.tasksTotal ? '✅' : '⬜'} Project tasks done ({s.tasksDone}/{s.tasksTotal})</li>
          <li>{s.quizMastered === s.quizTotal ? '✅' : '⬜'} Quiz mastered ({s.quizMastered}/{s.quizTotal})</li>
        </ul>
        {!ready && !s.checkpoint && <p className="subtle">Finish the lessons and project first. Be honest with yourself: the checkpoint is the real test.</p>}
        <button
          className={`btn${s.checkpoint ? '' : ' primary'}`}
          onClick={() => {
            setProgress(x => toggleFlag(x, 'checkpoints', String(levelId)))
            if (!s.checkpoint) toast(`Level ${levelId} checkpoint reached! 🎉`)
          }}
        >
          <Icon name="check" size={16} /> {s.checkpoint ? 'Checkpoint reached (undo)' : 'I can do this: mark checkpoint'}
        </button>
        {isComplete(s.ratio) && <p style={{ color: 'var(--ok)', fontWeight: 700, marginTop: 12 }}>Level complete. Great work!</p>}
      </div>
      <div className="card">
        <div className="row" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>My notes</h3>
          <span className="spacer" />
          <span className="subtle">{status === 'saved' ? 'Saved' : 'Saving…'}</span>
        </div>
        <p className="subtle">What was hard? What would you do differently? Explaining in your own words is the best test of understanding.</p>
        <textarea value={draft} onChange={e => setDraft(e.target.value)} aria-label={`Notes for level ${levelId}`} placeholder="Write your NOTES.md here…" rows={10} />
      </div>
    </div>
  )
}
