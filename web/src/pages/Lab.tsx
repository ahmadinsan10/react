import { Component, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { LEVELS } from '../data/levels'
import { VizGuidePanel } from '../components/DeepTopic'
import { Icon } from '../components/ui'
import { toggleFlag } from '../store/logic'
import { getProgress, setProgress, useProgress } from '../store/progress'
import { VIZ, vizById } from '../viz/registry'
import { NotFound } from './NotFound'

export function Lab() {
  const p = useProgress()
  const [filter, setFilter] = useState<'all' | string>('all')
  const kinds = ['all', 'Live React', 'Animated', 'Interactive']
  const shown = VIZ.filter(v => filter === 'all' || v.kind === filter)

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Visualization Lab</div>
        <h1>See React work</h1>
        <p>
          {VIZ.length} interactive visualizations. <strong>Live React</strong> demos run real React code in your browser, so you can break them on purpose. <strong>Animated</strong>{' '}
          ones step through what happens inside the engine.
        </p>
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        {kinds.map(k => (
          <button key={k} className={`btn sm${filter === k ? ' primary' : ''}`} onClick={() => setFilter(k)}>
            {k === 'all' ? 'All' : k}
          </button>
        ))}
        <span className="spacer" />
        <span className="subtle">
          {Object.keys(p.vizSeen).length}/{VIZ.length} explored
        </span>
      </div>
      <div className="grid cols-3">
        {shown.map(v => (
          <Link key={v.id} to={`/lab/${v.id}`} className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
            <div className="row" style={{ gap: 6 }}>
              <span className="pill">Level {v.level}</span>
              <span className="pill violet">{v.kind}</span>
              {p.vizSeen[v.id] && <span className="pill ok">✓</span>}
            </div>
            <h3 style={{ marginTop: 10 }}>{v.title}</h3>
            <p className="subtle" style={{ margin: 0 }}>{v.summary}</p>
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
    if (this.state.error)
      return (
        <div className="explain bad">
          <strong>This visualization crashed.</strong> {this.state.error.message}
          <div style={{ marginTop: 8 }}>
            <button className="btn sm" onClick={() => this.setState({ error: null })}>Try again</button>
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
          <Link to={`/level/${level.slug}`}>Level {level.id}: {level.title}</Link>
        </div>
        <div className="row">
          <h1 style={{ margin: 0 }}>{v.title}</h1>
          <span className="pill violet">{v.kind}</span>
          {seen && <span className="pill ok">explored</span>}
        </div>
        <p style={{ marginTop: 8 }}>{v.summary}</p>
      </div>
      <div className="viz">
        <VizBoundary key={v.id}>
          <Suspense fallback={<p className="subtle">Loading visualization…</p>}>
            <Comp />
          </Suspense>
        </VizBoundary>
      </div>
      <VizGuidePanel key={v.id} id={v.id} />
      <div className="row" style={{ marginTop: 24, justifyContent: 'space-between' }}>
        {prev ? (
          <Link className="btn" to={`/lab/${prev.id}`}>
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        <Link className="btn ghost" to={`/level/${level.slug}?tab=quiz`}>
          <Icon name="target" size={16} /> Test yourself: Level {level.id} quiz
        </Link>
        {next ? (
          <Link className="btn" to={`/lab/${next.id}`}>
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}
