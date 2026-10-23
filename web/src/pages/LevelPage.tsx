import { Suspense, use, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { QuizRunner } from '../components/QuizRunner'
import { Bar, Check, Icon, Ring, toast } from '../components/ui'
import { isComplete, isMastered, levelStats, toggleFlag, topicKey, type Progress } from '../store/logic'
import { setProgress, useProgress } from '../store/progress'
import { VIZ, vizSummary, vizTitle } from '../viz/registry'
import { NotFound } from './NotFound'
import { ChunkBoundary, readingMinutes } from './LessonPage'
import { levelDetails } from '../data/details'
import type { Level } from '../data/types'
import { defineStrings, useLang, useLevels, useQuestions, useStrings, useT } from '../i18n'

const TABS = ['learn', 'visualize', 'quiz', 'project', 'checkpoint'] as const
type Tab = (typeof TABS)[number]

const S = defineStrings({
  en: {
    header: 'Level {n} · {phase} · ~{w} weeks',
    sections: 'Level sections',
    tab_learn: 'Learn',
    tab_visualize: 'Visualize',
    tab_quiz: 'Quiz',
    tab_project: 'Project',
    tab_checkpoint: 'Checkpoint',
    noViz: 'This level is about practice and judgment rather than mechanics, so it has no visualization. Explore the full Lab instead:',
    openLab: 'open the Lab',
    perfect: 'Perfect score! 🎉',
    mastery: 'Mastery (answered correctly twice in a row):',
    projectHint: 'Build each project in its own folder of your repo (e.g. {folder}) and write a short NOTES.md when you finish.',
    min: '📖 {n} min',
    learnIntro: 'Each lesson has a full explanation, code examples, a real-world case, pitfalls, an exercise with solution and interview questions. Stretch lessons are optional.',
    start: 'Start',
    continue: 'Continue',
    upNext: 'up next',
    review: 'Review',
    read: 'Read lesson',
    resources: 'Resources',
    checkpoint: 'Checkpoint',
    ckLessons: 'All lessons understood ({a}/{b})',
    ckTasks: 'Project tasks done ({a}/{b})',
    ckQuiz: 'Quiz mastered ({a}/{b})',
    ckFirst: 'Finish the lessons and project first. Be honest with yourself: the checkpoint is the real test.',
    ckReached: 'Level {n} checkpoint reached! 🎉',
    ckUndo: 'Checkpoint reached (undo)',
    ckMark: 'I can do this: mark checkpoint',
    complete: 'Level complete. Great work!',
    notes: 'My notes',
    saved: 'Saved',
    saving: 'Saving…',
    notesHint: 'What was hard? What would you do differently? Explaining in your own words is the best test of understanding.',
    notesAria: 'Notes for level {n}',
    notesPh: 'Write your NOTES.md here…',
  },
  id: {
    header: 'Level {n} · {phase} · ~{w} minggu',
    sections: 'Bagian level',
    tab_learn: 'Belajar',
    tab_visualize: 'Visualisasi',
    tab_quiz: 'Kuis',
    tab_project: 'Proyek',
    tab_checkpoint: 'Checkpoint',
    noViz: 'Level ini lebih banyak soal latihan dan penilaian, bukan mekanisme teknis, jadi tidak ada visualisasinya. Silakan jelajahi Lab lengkapnya:',
    openLab: 'buka Lab',
    perfect: 'Nilai sempurna! 🎉',
    mastery: 'Penguasaan (dijawab benar dua kali berturut-turut):',
    projectHint: 'Buat setiap proyek di folder tersendiri dalam repo-mu (misalnya {folder}) dan tulis NOTES.md singkat setelah selesai.',
    min: '📖 {n} menit',
    learnIntro: 'Setiap materi berisi penjelasan lengkap, contoh kode, kasus nyata, jebakan umum, latihan beserta solusinya, dan pertanyaan interview. Materi opsional boleh dilewati.',
    start: 'Mulai',
    continue: 'Lanjutkan',
    upNext: 'berikutnya',
    review: 'Ulas lagi',
    read: 'Baca materi',
    resources: 'Referensi',
    checkpoint: 'Checkpoint',
    ckLessons: 'Semua materi sudah dipahami ({a}/{b})',
    ckTasks: 'Tugas proyek selesai ({a}/{b})',
    ckQuiz: 'Kuis dikuasai ({a}/{b})',
    ckFirst: 'Selesaikan dulu materi dan proyeknya. Jujurlah pada dirimu sendiri: checkpoint inilah ujian yang sebenarnya.',
    ckReached: 'Checkpoint Level {n} tercapai! 🎉',
    ckUndo: 'Checkpoint tercapai (batalkan)',
    ckMark: 'Aku sudah bisa: tandai checkpoint',
    complete: 'Level selesai. Kerja bagus!',
    notes: 'Catatanku',
    saved: 'Tersimpan',
    saving: 'Menyimpan…',
    notesHint: 'Bagian mana yang sulit? Apa yang akan kamu lakukan dengan cara berbeda? Menjelaskan dengan kata-katamu sendiri adalah tes pemahaman terbaik.',
    notesAria: 'Catatan untuk level {n}',
    notesPh: 'Tulis NOTES.md-mu di sini…',
  },
})

export function LevelPage() {
  const { slug = '' } = useParams()
  const LEVELS = useLevels()
  const QUESTIONS = useQuestions()
  const lang = useLang()
  const s = useStrings(S)
  const t = useT()
  const level = LEVELS.find(l => l.slug === slug)
  const [params, setParams] = useSearchParams()
  const p = useProgress()
  if (!level) return <NotFound />

  const raw = params.get('tab')
  const tab: Tab = (TABS as readonly string[]).includes(raw ?? '') ? (raw as Tab) : 'learn'
  const setTab = (x: Tab) => setParams({ tab: x }, { replace: true })
  const st = levelStats(p, level)
  const prev = LEVELS[level.id - 1]
  const next = LEVELS[level.id + 1]
  const qs = QUESTIONS.filter(q => q.level === level.id)
  const vizzes = level.vizIds.map(id => VIZ.find(v => v.id === id)).filter(v => v !== undefined)

  const counts: Record<Tab, string> = {
    learn: `${st.topicsDone}/${st.topicsTotal}`,
    visualize: `${vizzes.filter(v => p.vizSeen[v.id]).length}/${vizzes.length}`,
    quiz: `${st.quizMastered}/${st.quizTotal}`,
    project: `${st.tasksDone}/${st.tasksTotal}`,
    checkpoint: st.checkpoint ? '✓' : '',
  }

  return (
    <div>
      <div className="page-head row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', gap: 20 }}>
        <Ring value={st.ratio} size={84} stroke={8} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow">{s('header', { n: level.id, phase: t(`phase_${level.phase}`), w: level.weeks })}</div>
          <h1>{level.title}</h1>
          <p>{level.tagline}</p>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label={s('sections')}>
        {TABS.map(x => (
          <button key={x} role="tab" className="tab" aria-selected={tab === x} onClick={() => setTab(x)}>
            {s(`tab_${x}`)}
            {counts[x] && <span className="count">{counts[x]}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'learn' && <Learn key={level.id} level={level} />}
        {tab === 'visualize' &&
          (vizzes.length === 0 ? (
            <div className="card flat">
              <p className="muted">
                {s('noViz')} <Link to="/lab">{s('openLab')}</Link>.
              </p>
            </div>
          ) : (
            <div className="grid cols-2">
              {vizzes.map(v => (
                <Link key={v.id} to={`/lab/${v.id}`} className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
                  <div className="row">
                    <span className="pill violet">{t(`kind_${v.kind}`)}</span>
                    {p.vizSeen[v.id] && <span className="pill ok">{t('explored')}</span>}
                  </div>
                  <h3 style={{ marginTop: 10 }}>{vizTitle(v, lang)}</h3>
                  <p className="subtle" style={{ margin: 0 }}>
                    {vizSummary(v, lang)}
                  </p>
                </Link>
              ))}
            </div>
          ))}
        {tab === 'quiz' && (
          <div className="card">
            {/* Keyed by language so switching restarts the quiz with translated questions. */}
            <QuizRunner key={`${level.id}-${lang}`} questions={qs} onFinish={(sc, total) => sc === total && toast(s('perfect'))} />
            <div className="row" style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <span className="subtle">{s('mastery')} </span>
              {qs.map(q => (
                <span
                  key={q.id}
                  title={q.prompt}
                  style={{ width: 14, height: 14, borderRadius: 4, background: isMastered(p.cards[q.id]) ? 'var(--ok)' : p.cards[q.id] ? 'var(--warn)' : 'var(--bg-sunk)', border: '1px solid var(--border)' }}
                />
              ))}
            </div>
          </div>
        )}
        {tab === 'project' && (
          <div className="stack">
            {level.projects.map(pr => {
              const done = pr.tasks.filter(x => p.tasks[x.id]).length
              return (
                <div key={pr.tasks[0]?.id ?? pr.title} className="card">
                  <div className="row" style={{ marginBottom: 6 }}>
                    <h3 style={{ margin: 0 }}>{pr.title}</h3>
                    <span className="spacer" />
                    <span className="subtle">
                      {done}/{pr.tasks.length}
                    </span>
                  </div>
                  <p className="muted">{pr.summary}</p>
                  <Bar value={done / pr.tasks.length} />
                  <div style={{ marginTop: 10 }}>
                    {pr.tasks.map(x => (
                      <Check key={x.id} checked={!!p.tasks[x.id]} onChange={() => setProgress(y => toggleFlag(y, 'tasks', x.id))}>
                        {x.text}
                      </Check>
                    ))}
                  </div>
                </div>
              )
            })}
            <p className="subtle">{s('projectHint', { folder: `${String(level.id).padStart(2, '0')}-${level.slug}/` })}</p>
          </div>
        )}
        {tab === 'checkpoint' && <CheckpointTab key={level.id} level={level} />}
      </div>

      <div className="row" style={{ marginTop: 32, justifyContent: 'space-between' }}>
        {prev ? (
          <Link className="btn" to={`/level/${prev.slug}`}>
            ← {t('levelN', { n: prev.id })}: {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link className="btn" to={`/level/${next.slug}`}>
            {t('levelN', { n: next.id })}: {next.title} →
          </Link>
        )}
      </div>
    </div>
  )
}

function Minutes({ levelId, topicId }: { levelId: number; topicId: string }) {
  const s = useStrings(S)
  const lang = useLang()
  const mins = readingMinutes(use(levelDetails(levelId, lang))[topicId])
  return mins ? <span className="pill">{s('min', { n: mins })}</span> : null
}

const nothingDone = (level: Level, p: Progress) => !level.topics.some(x => p.topics[topicKey(level.id, x.id)])

function Learn({ level }: { level: Level }) {
  const p = useProgress()
  const s = useStrings(S)
  const t = useT()
  const nextUp = level.topics.find(x => !x.stretch && !p.topics[topicKey(level.id, x.id)])

  return (
    <div>
      <div className="row" style={{ marginBottom: 14 }}>
        <span className="subtle">{s('learnIntro')}</span>
        <span className="spacer" />
        {nextUp && (
          <Link className="btn primary" to={`/level/${level.slug}/learn/${nextUp.id}`}>
            {nothingDone(level, p) ? s('start') : s('continue')}: {nextUp.title} →
          </Link>
        )}
      </div>
      <ol className="lesson-list">
        {level.topics.map((x, i) => {
          const done = !!p.topics[topicKey(level.id, x.id)]
          return (
            <li key={x.id} id={x.id}>
              <Link to={`/level/${level.slug}/learn/${x.id}`} className={`lesson-card${done ? ' done' : ''}${nextUp?.id === x.id ? ' next' : ''}`}>
                <span className={`lesson-num${done ? ' on' : ''}`}>{done ? '✓' : i + 1}</span>
                <span className="lesson-card-body">
                  <span className="row" style={{ gap: 6 }}>
                    <strong className="lesson-card-title">{x.title}</strong>
                    {x.stretch && <span className="pill warn">{t('stretch')}</span>}
                    {nextUp?.id === x.id && <span className="pill accent">{s('upNext')}</span>}
                    <ChunkBoundary>
                      <Suspense fallback={null}>
                        <Minutes levelId={level.id} topicId={x.id} />
                      </Suspense>
                    </ChunkBoundary>
                  </span>
                  <span className="lesson-card-summary">{x.body.split('\n')[0]!.replace(/[`*]/g, '')}</span>
                </span>
                <span className="lesson-card-cta">
                  {done ? s('review') : s('read')} <Icon name="chevron" size={16} />
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
      <div className="card flat" style={{ marginTop: 16 }}>
        <h3>{s('resources')}</h3>
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

function CheckpointTab({ level }: { level: Level }) {
  const p = useProgress()
  const s = useStrings(S)
  const levelId = level.id
  const st = levelStats(p, level)
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

  const ready = st.topicsDone === st.topicsTotal && st.tasksDone === st.tasksTotal

  return (
    <div className="grid cols-2" style={{ alignItems: 'start' }}>
      <div className="card">
        <div className="eyebrow">{s('checkpoint')}</div>
        <h3>{level.checkpoint}</h3>
        <ul className="muted" style={{ fontSize: '0.9rem' }}>
          <li>
            {st.topicsDone === st.topicsTotal ? '✅' : '⬜'} {s('ckLessons', { a: st.topicsDone, b: st.topicsTotal })}
          </li>
          <li>
            {st.tasksDone === st.tasksTotal ? '✅' : '⬜'} {s('ckTasks', { a: st.tasksDone, b: st.tasksTotal })}
          </li>
          <li>
            {st.quizMastered === st.quizTotal ? '✅' : '⬜'} {s('ckQuiz', { a: st.quizMastered, b: st.quizTotal })}
          </li>
        </ul>
        {!ready && !st.checkpoint && <p className="subtle">{s('ckFirst')}</p>}
        <button
          className={`btn${st.checkpoint ? '' : ' primary'}`}
          onClick={() => {
            setProgress(x => toggleFlag(x, 'checkpoints', String(levelId)))
            if (!st.checkpoint) toast(s('ckReached', { n: levelId }))
          }}
        >
          <Icon name="check" size={16} /> {st.checkpoint ? s('ckUndo') : s('ckMark')}
        </button>
        {isComplete(st.ratio) && <p style={{ color: 'var(--ok)', fontWeight: 700, marginTop: 12 }}>{s('complete')}</p>}
      </div>
      <div className="card">
        <div className="row" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>{s('notes')}</h3>
          <span className="spacer" />
          <span className="subtle">{status === 'saved' ? s('saved') : s('saving')}</span>
        </div>
        <p className="subtle">{s('notesHint')}</p>
        <textarea value={draft} onChange={e => setDraft(e.target.value)} aria-label={s('notesAria', { n: levelId })} placeholder={s('notesPh')} rows={10} />
      </div>
    </div>
  )
}
