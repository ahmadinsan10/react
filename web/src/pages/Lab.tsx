import { Component, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { VizGuidePanel } from '../components/DeepTopic'
import { Icon } from '../components/ui'
import { toggleFlag } from '../store/logic'
import { getProgress, setProgress, useProgress } from '../store/progress'
import { VIZ, vizById, vizSummary, vizTitle } from '../viz/registry'
import { NotFound } from './NotFound'
import { defineStrings, getLang, useLang, useLevels, useStrings, useT } from '../i18n'

const S = defineStrings({
  en: {
    eyebrow: 'Visualization Lab',
    title: 'See React work',
    intro: '{n} interactive visualizations. Live React demos run real React code in your browser, so you can break them on purpose. Animated ones step through what happens inside the engine.',
    all: 'All',
    explored: '{a}/{b} explored',
    crashed: 'This visualization crashed.',
    tryAgain: 'Try again',
    loading: 'Loading visualization…',
    testYourself: 'Test yourself: Level {n} quiz',
  },
  id: {
    eyebrow: 'Lab Visualisasi',
    title: 'Lihat React bekerja',
    intro: '{n} visualisasi interaktif. Demo React Langsung menjalankan kode React sungguhan di browser-mu, jadi kamu bisa sengaja merusaknya untuk melihat apa yang terjadi. Demo Animasi menjelaskan langkah demi langkah apa yang terjadi di dalam React.',
    all: 'Semua',
    explored: '{a}/{b} sudah dicoba',
    crashed: 'Visualisasi ini error.',
    tryAgain: 'Coba lagi',
    loading: 'Memuat visualisasi…',
    testYourself: 'Uji pemahamanmu: kuis Level {n}',
  },
})

export function Lab() {
  const p = useProgress()
  const s = useStrings(S)
  const t = useT()
  const lang = useLang()
  const [filter, setFilter] = useState<'all' | string>('all')
  const kinds = ['all', 'Live React', 'Animated', 'Interactive'] as const
  const shown = VIZ.filter(v => filter === 'all' || v.kind === filter)

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">{s('eyebrow')}</div>
        <h1>{s('title')}</h1>
        <p>{s('intro', { n: VIZ.length })}</p>
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        {kinds.map(k => (
          <button key={k} className={`btn sm${filter === k ? ' primary' : ''}`} onClick={() => setFilter(k)}>
            {k === 'all' ? s('all') : t(`kind_${k}`)}
          </button>
        ))}
        <span className="spacer" />
        <span className="subtle">{s('explored', { a: Object.keys(p.vizSeen).length, b: VIZ.length })}</span>
      </div>
      <div className="grid cols-3">
        {shown.map(v => (
          <Link key={v.id} to={`/lab/${v.id}`} className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
            <div className="row" style={{ gap: 6 }}>
              <span className="pill">{t('levelN', { n: v.level })}</span>
              <span className="pill violet">{t(`kind_${v.kind}`)}</span>
              {p.vizSeen[v.id] && <span className="pill ok">✓</span>}
            </div>
            <h3 style={{ marginTop: 10 }}>{vizTitle(v, lang)}</h3>
            <p className="subtle" style={{ margin: 0 }}>
              {vizSummary(v, lang)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}

class VizBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    const t = S[getLang()]
    if (this.state.error)
      return (
        <div className="explain bad">
          <strong>{t.crashed}</strong> {this.state.error.message}
          <div style={{ marginTop: 8 }}>
            <button className="btn sm" onClick={() => this.setState({ error: null })}>
              {t.tryAgain}
            </button>
          </div>
        </div>
      )
    return this.props.children
  }
}

export function VizPage() {
  const { id = '' } = useParams()
  const v = vizById(id)
  const seen = useProgress(p => !!p.vizSeen[id])
  const s = useStrings(S)
  const t = useT()
  const lang = useLang()
  const LEVELS = useLevels()

  // Opening a visualization counts as exploring it (once).
  useEffect(() => {
    if (v && !getProgress().vizSeen[v.id]) setProgress(p => toggleFlag(p, 'vizSeen', v.id))
  }, [v])

  if (!v) return <NotFound />
  const idx = VIZ.indexOf(v)
  const prev = VIZ[idx - 1]
  const next = VIZ[idx + 1]
  const level = LEVELS[v.level]!
  const Comp = v.Component

  return (
    <div>
      <div className="page-head">
        <div className="row subtle" style={{ marginBottom: 6 }}>
          <Link to="/lab">Lab</Link> <span>/</span>
          <Link to={`/level/${level.slug}`}>
            {t('levelN', { n: level.id })}: {level.title}
          </Link>
        </div>
        <div className="row">
          <h1 style={{ margin: 0 }}>{vizTitle(v, lang)}</h1>
          <span className="pill violet">{t(`kind_${v.kind}`)}</span>
          {seen && <span className="pill ok">{t('explored')}</span>}
        </div>
        <p style={{ marginTop: 8 }}>{vizSummary(v, lang)}</p>
      </div>
      <div className="viz">
        <VizBoundary key={v.id}>
          <Suspense fallback={<p className="subtle">{s('loading')}</p>}>
            <Comp />
          </Suspense>
        </VizBoundary>
      </div>
      <VizGuidePanel key={`${v.id}-${lang}`} id={v.id} />
      <div className="row" style={{ marginTop: 24, justifyContent: 'space-between' }}>
        {prev ? (
          <Link className="btn" to={`/lab/${prev.id}`}>
            ← {vizTitle(prev, lang)}
          </Link>
        ) : (
          <span />
        )}
        <Link className="btn ghost" to={`/level/${level.slug}?tab=quiz`}>
          <Icon name="target" size={16} /> {s('testYourself', { n: level.id })}
        </Link>
        {next ? (
          <Link className="btn" to={`/lab/${next.id}`}>
            {vizTitle(next, lang)} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}
