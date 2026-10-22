import { CHECKLIST, MISTAKES } from '../data/checklist'
import { Bar, Check } from '../components/ui'
import { toggleFlag } from '../store/logic'
import { setProgress, useProgress } from '../store/progress'

const CAPSTONES = [
  ['Real-time collaborative board', 'Multiplayer presence and cursors (WebSockets, Liveblocks or Yjs), offline support, undo/redo.'],
  ['SaaS analytics dashboard', 'Multi-tenant auth, role-based access, large tables and charts, CSV export, billing page (Stripe test mode).'],
  ['Learning platform', 'Courses, video player, progress tracking, quizzes, admin CMS, i18n. (Like this app, but bigger!)'],
]

export function Checklist() {
  const p = useProgress()
  const done = CHECKLIST.filter(c => p.checklist[c.id]).length

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Self-assessment</div>
        <h1>Expert checklist</h1>
        <p>You are a React expert when you can do all of these confidently, without looking anything up. Tick them only when you have actually done them.</p>
      </div>
      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="row" style={{ marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>I can…</h3>
            <span className="spacer" />
            <span className="subtle">{done}/{CHECKLIST.length}</span>
          </div>
          <Bar value={done / CHECKLIST.length} />
          <div style={{ marginTop: 10 }}>
            {CHECKLIST.map(c => (
              <Check key={c.id} checked={!!p.checklist[c.id]} onChange={() => setProgress(x => toggleFlag(x, 'checklist', c.id))}>
                {c.text}
              </Check>
            ))}
          </div>
        </div>
        <div className="stack">
          <div className="card">
            <h3>Capstone project</h3>
            <p className="muted">Pick one and build it to production quality: strict TypeScript, your own design system, WCAG 2.2 AA, tests in CI, Lighthouse ≥ 90 on mobile, error monitoring, ADRs, deployed publicly.</p>
            {CAPSTONES.map(([t, d]) => (
              <div key={t} style={{ borderLeft: '3px solid var(--violet)', padding: '4px 12px', marginBottom: 10 }}>
                <strong>{t}</strong>
                <div className="subtle">{d}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <h3>Common mistakes</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Mistake</th>
                  <th>Better</th>
                </tr>
              </thead>
              <tbody>
                {MISTAKES.map(([m, b]) => (
                  <tr key={m}>
                    <td style={{ color: 'var(--bad)' }}>{m}</td>
                    <td>{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
