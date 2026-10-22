import { Component, Suspense, use, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { levelBySlug } from '../data/levels'
import { levelDetails } from '../data/details'
import type { Level, TopicDetail } from '../data/types'
import { LessonBody } from '../components/DeepTopic'
import { Md } from '../components/Md'
import { Icon, toast } from '../components/ui'
import { toggleFlag, topicKey } from '../store/logic'
import { setProgress, useProgress } from '../store/progress'
import { VIZ } from '../viz/registry'
import { NotFound } from './NotFound'

const words = (d: TopicDetail) =>
  [d.explanation, ...d.examples.flatMap(e => [e.code, e.note]), d.realCase.story, ...d.pitfalls, d.exercise.task, ...d.interview].join(' ').split(/\s+/).length

export const readingMinutes = (d: TopicDetail | undefined) => (d ? Math.max(3, Math.round(words(d) / 180)) : null)

/** Catches a failed lazy chunk (e.g. a tab left open across a redeploy) instead of blanking the page. */
export class ChunkBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="explain bad">
        <strong>The lesson content couldn't be loaded.</strong> The app may have been updated since this tab was opened, or you're offline.
        <div style={{ marginTop: 8 }}>
          <button className="btn sm" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      </div>
    )
  }
}

const SECTIONS = [
  ['explanation', 'Explanation'],
  ['examples', 'Examples'],
  ['real-case', 'Real-world case'],
  ['pitfalls', 'Pitfalls'],
  ['exercise', 'Exercise'],
  ['interview', 'Interview questions'],
] as const

function Lesson({ level, topicId }: { level: Level; topicId: string }) {
  const details = use(levelDetails(level.id))
  const p = useProgress()
  const idx = level.topics.findIndex(t => t.id === topicId)
  const topic = level.topics[idx]!
  const detail = details[topicId]
  const prev = level.topics[idx - 1]
  const next = level.topics[idx + 1]
  const key = topicKey(level.id, topic.id)
  const done = !!p.topics[key]
  const mins = readingMinutes(detail)
  const related = VIZ.filter(v => level.vizIds.includes(v.id))
  const lessonUrl = (id: string) => `/level/${level.slug}/learn/${id}`

  return (
    <div className="lesson-layout">
      <article className="lesson">
        <div className="row subtle" style={{ marginBottom: 8 }}>
          <Link to={`/level/${level.slug}?tab=learn`}>
            Level {level.id}: {level.title}
          </Link>
          <span>/</span>
          <span>
            Lesson {idx + 1} of {level.topics.length}
          </span>
        </div>
        <h1>{topic.title}</h1>
        <div className="row" style={{ marginBottom: 18 }}>
          {mins && <span className="pill">📖 {mins} min read</span>}
          {topic.stretch && <span className="pill warn">stretch (optional)</span>}
          {done && <span className="pill ok">✓ understood</span>}
        </div>

        <div className="explain" style={{ marginTop: 0 }}>
          <strong>Key idea. </strong>
          <Md text={topic.body} />
        </div>

        {detail ? <LessonBody detail={detail} /> : <p className="muted">The detailed lesson for this topic is coming soon.</p>}

        <div className="card flat lesson-finish">
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>{done ? 'You marked this lesson as understood.' : 'Can you explain this to someone else?'}</strong>
            <div className="subtle">{done ? 'Review it any time.' : 'Mark it when you can, without looking back at the text.'}</div>
          </div>
          <button
            className={`btn${done ? '' : ' primary'}`}
            onClick={() => {
              setProgress(x => toggleFlag(x, 'topics', key))
              if (!done) toast('Lesson marked as understood ✓')
            }}
          >
            <Icon name="check" size={15} /> {done ? 'Mark as not done' : 'Mark as understood'}
          </button>
        </div>

        <nav className="row lesson-nav" aria-label="Lesson navigation">
          {prev ? (
            <Link className="btn" to={lessonUrl(prev.id)}>
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link className="btn primary" to={lessonUrl(next.id)}>
              Next: {next.title} →
            </Link>
          ) : (
            <Link className="btn primary" to={`/level/${level.slug}?tab=quiz`}>
              Take the Level {level.id} quiz →
            </Link>
          )}
        </nav>
      </article>

      <aside className="lesson-aside" aria-label="On this page">
        <div className="lesson-toc">
          <div className="nav-section" style={{ padding: '0 0 6px' }}>On this page</div>
          {SECTIONS.filter(([id]) => detail || id === 'explanation').map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={e => (e.preventDefault(), document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))}>
              {label}
            </a>
          ))}
          <div className="nav-section" style={{ padding: '14px 0 6px' }}>Lessons in this level</div>
          {level.topics.map((t, i) => (
            <Link key={t.id} to={lessonUrl(t.id)} className={t.id === topicId ? 'current' : undefined}>
              <span className={`done-dot${p.topics[topicKey(level.id, t.id)] ? ' on' : ''}`} style={{ width: 16, height: 16, fontSize: 9 }}>
                {p.topics[topicKey(level.id, t.id)] ? '✓' : ''}
              </span>
              {i + 1}. {t.title}
            </Link>
          ))}
          {related.length > 0 && (
            <>
              <div className="nav-section" style={{ padding: '14px 0 6px' }}>See it in action</div>
              {related.map(v => (
                <Link key={v.id} to={`/lab/${v.id}`}>
                  🧪 {v.title}
                </Link>
              ))}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

export function LessonPage() {
  const { slug = '', topicId = '' } = useParams()
  const level = levelBySlug(slug)
  if (!level || !level.topics.some(t => t.id === topicId)) return <NotFound />
  return (
    <ChunkBoundary key={`${slug}/${topicId}`}>
      <Suspense fallback={<p className="subtle">Loading lesson…</p>}>
        <Lesson level={level} topicId={topicId} />
      </Suspense>
    </ChunkBoundary>
  )
}
