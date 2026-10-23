import { Component, Suspense, use, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { levelDetails } from '../data/details'
import type { Level, TopicDetail } from '../data/types'
import { LessonBody, SECTION_TITLES } from '../components/DeepTopic'
import { Md } from '../components/Md'
import { Icon, toast } from '../components/ui'
import { toggleFlag, topicKey } from '../store/logic'
import { setProgress, useProgress } from '../store/progress'
import { VIZ, vizTitle } from '../viz/registry'
import { NotFound } from './NotFound'
import { defineStrings, getLang, useLang, useLevels, useStrings, useT } from '../i18n'

const S = defineStrings({
  en: {
    loadFailed: "The lesson content couldn't be loaded.",
    loadFailedWhy: "The app may have been updated since this tab was opened, or you're offline.",
    reload: 'Reload',
    lessonOf: 'Lesson {a} of {b}',
    minRead: '📖 {n} min read',
    stretch: 'stretch (optional)',
    understood: '✓ understood',
    keyIdea: 'Key idea.',
    comingSoon: 'The detailed lesson for this topic is coming soon.',
    doneTitle: 'You marked this lesson as understood.',
    notDoneTitle: 'Can you explain this to someone else?',
    doneSub: 'Review it any time.',
    notDoneSub: 'Mark it when you can, without looking back at the text.',
    markedToast: 'Lesson marked as understood ✓',
    unmark: 'Mark as not done',
    mark: 'Mark as understood',
    nav: 'Lesson navigation',
    next: 'Next: {x} →',
    takeQuiz: 'Take the Level {n} quiz →',
    onPage: 'On this page',
    inLevel: 'Lessons in this level',
    inAction: 'See it in action',
    loading: 'Loading lesson…',
  },
  id: {
    loadFailed: 'Isi materi gagal dimuat.',
    loadFailedWhy: 'Mungkin aplikasinya sudah diperbarui sejak tab ini dibuka, atau kamu sedang offline.',
    reload: 'Muat ulang',
    lessonOf: 'Materi {a} dari {b}',
    minRead: '📖 {n} menit baca',
    stretch: 'opsional',
    understood: '✓ sudah dipahami',
    keyIdea: 'Inti materi.',
    comingSoon: 'Materi lengkap untuk topik ini akan segera tersedia.',
    doneTitle: 'Kamu sudah menandai materi ini sebagai dipahami.',
    notDoneTitle: 'Sudah bisa menjelaskan ini ke orang lain?',
    doneSub: 'Kamu bisa mengulasnya kapan saja.',
    notDoneSub: 'Tandai kalau kamu sudah bisa menjelaskannya tanpa melihat teks lagi.',
    markedToast: 'Materi ditandai sudah dipahami ✓',
    unmark: 'Tandai belum selesai',
    mark: 'Tandai sudah paham',
    nav: 'Navigasi materi',
    next: 'Berikutnya: {x} →',
    takeQuiz: 'Kerjakan kuis Level {n} →',
    onPage: 'Di halaman ini',
    inLevel: 'Materi di level ini',
    inAction: 'Lihat langsung',
    loading: 'Memuat materi…',
  },
})

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
    const t = S[getLang()]
    return (
      <div className="explain bad">
        <strong>{t.loadFailed}</strong> {t.loadFailedWhy}
        <div style={{ marginTop: 8 }}>
          <button className="btn sm" onClick={() => location.reload()}>
            {t.reload}
          </button>
        </div>
      </div>
    )
  }
}

const SECTION_IDS = ['explanation', 'examples', 'real-case', 'pitfalls', 'exercise', 'interview'] as const

function Lesson({ level, topicId }: { level: Level; topicId: string }) {
  const lang = useLang()
  const s = useStrings(S)
  const t = useT()
  const details = use(levelDetails(level.id, lang))
  const p = useProgress()
  const idx = level.topics.findIndex(x => x.id === topicId)
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
            {t('levelN', { n: level.id })}: {level.title}
          </Link>
          <span>/</span>
          <span>{s('lessonOf', { a: idx + 1, b: level.topics.length })}</span>
        </div>
        <h1>{topic.title}</h1>
        <div className="row" style={{ marginBottom: 18 }}>
          {mins && <span className="pill">{s('minRead', { n: mins })}</span>}
          {topic.stretch && <span className="pill warn">{s('stretch')}</span>}
          {done && <span className="pill ok">{s('understood')}</span>}
        </div>

        <div className="explain" style={{ marginTop: 0 }}>
          <strong>{s('keyIdea')} </strong>
          <Md text={topic.body} />
        </div>

        {detail ? <LessonBody detail={detail} /> : <p className="muted">{s('comingSoon')}</p>}

        <div className="card flat lesson-finish">
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>{done ? s('doneTitle') : s('notDoneTitle')}</strong>
            <div className="subtle">{done ? s('doneSub') : s('notDoneSub')}</div>
          </div>
          <button
            className={`btn${done ? '' : ' primary'}`}
            onClick={() => {
              setProgress(x => toggleFlag(x, 'topics', key))
              if (!done) toast(s('markedToast'))
            }}
          >
            <Icon name="check" size={15} /> {done ? s('unmark') : s('mark')}
          </button>
        </div>

        <nav className="row lesson-nav" aria-label={s('nav')}>
          {prev ? (
            <Link className="btn" to={lessonUrl(prev.id)}>
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link className="btn primary" to={lessonUrl(next.id)}>
              {s('next', { x: next.title })}
            </Link>
          ) : (
            <Link className="btn primary" to={`/level/${level.slug}?tab=quiz`}>
              {s('takeQuiz', { n: level.id })}
            </Link>
          )}
        </nav>
      </article>

      <aside className="lesson-aside" aria-label={s('onPage')}>
        <div className="lesson-toc">
          <div className="nav-section" style={{ padding: '0 0 6px' }}>
            {s('onPage')}
          </div>
          {SECTION_IDS.filter(id => detail || id === 'explanation').map(id => (
            <a key={id} href={`#${id}`} onClick={e => (e.preventDefault(), document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))}>
              {SECTION_TITLES[lang][id]}
            </a>
          ))}
          <div className="nav-section" style={{ padding: '14px 0 6px' }}>
            {s('inLevel')}
          </div>
          {level.topics.map((x, i) => (
            <Link key={x.id} to={lessonUrl(x.id)} className={x.id === topicId ? 'current' : undefined}>
              <span className={`done-dot${p.topics[topicKey(level.id, x.id)] ? ' on' : ''}`} style={{ width: 16, height: 16, fontSize: 9 }}>
                {p.topics[topicKey(level.id, x.id)] ? '✓' : ''}
              </span>
              {i + 1}. {x.title}
            </Link>
          ))}
          {related.length > 0 && (
            <>
              <div className="nav-section" style={{ padding: '14px 0 6px' }}>
                {s('inAction')}
              </div>
              {related.map(v => (
                <Link key={v.id} to={`/lab/${v.id}`}>
                  🧪 {vizTitle(v, lang)}
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
  const LEVELS = useLevels()
  const s = useStrings(S)
  const level = LEVELS.find(l => l.slug === slug)
  if (!level || !level.topics.some(x => x.id === topicId)) return <NotFound />
  return (
    <ChunkBoundary key={`${slug}/${topicId}`}>
      <Suspense fallback={<p className="subtle">{s('loading')}</p>}>
        <Lesson level={level} topicId={topicId} />
      </Suspense>
    </ChunkBoundary>
  )
}
