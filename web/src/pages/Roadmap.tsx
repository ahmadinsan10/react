import { useNavigate } from 'react-router'
import { LEVELS } from '../data/levels'
import { Bar } from '../components/ui'
import { isComplete, overallStats } from '../store/logic'
import { useProgress } from '../store/progress'

const PHASE_COLOR = { Foundations: 'var(--accent)', Building: 'var(--violet)', Mastery: 'var(--warn)', Expert: 'var(--ok)' } as const

export function Roadmap() {
  const p = useProgress()
  const navigate = useNavigate()
  const { per, ratio, totalWeeks } = overallStats(p)

  // Snake layout: 4 nodes per row, alternating direction.
  const COLS = 4
  const W = 900
  const PAD = 120
  const gapX = (W - PAD * 2) / (COLS - 1)
  const pos = LEVELS.map((_, i) => {
    const row = Math.floor(i / COLS)
    const col = i % COLS
    const x = PAD + (row % 2 === 0 ? col : COLS - 1 - col) * gapX
    return { x, y: 80 + row * 150 }
  })
  const H = 80 + Math.ceil(LEVELS.length / COLS) * 150
  let d = `M ${pos[0]!.x} ${pos[0]!.y}`
  for (let i = 1; i < pos.length; i++) {
    const a = pos[i - 1]!
    const b = pos[i]!
    if (a.y === b.y) d += ` L ${b.x} ${b.y}`
    else {
      const dir = a.x > W / 2 ? 1 : -1
      d += ` C ${a.x + dir * 90} ${a.y}, ${b.x + dir * 90} ${b.y}, ${b.x} ${b.y}`
    }
  }

  // Pace projection: weeks elapsed vs share of the roadmap completed.
  const weeksElapsed = Math.max(0.5, (Date.now() - p.startedAt) / (7 * 86_400_000))
  const projected = ratio > 0.02 ? weeksElapsed / ratio : null
  const finish = projected ? new Date(p.startedAt + projected * 7 * 86_400_000) : null

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Roadmap</div>
        <h1>The path to React expertise</h1>
        <p>Click any level to open it. Rings fill as you complete lessons, project tasks, quiz questions and the checkpoint.</p>
      </div>
      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <div className="card stat">
          <div className="label">Overall</div>
          <div className="value">{Math.round(ratio * 100)}%</div>
          <div style={{ marginTop: 8 }}><Bar value={ratio} /></div>
        </div>
        <div className="card stat">
          <div className="label">Estimated total</div>
          <div className="value">~{totalWeeks} weeks</div>
          <div className="subtle">at ~10 hours/week</div>
        </div>
        <div className="card stat">
          <div className="label">Projected finish (your pace)</div>
          <div className="value" style={{ fontSize: '1.3rem' }}>{finish ? finish.toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '—'}</div>
          <div className="subtle">{finish ? `${Math.round(projected!)} weeks total at your current rate` : 'Complete a few items to see a projection'}</div>
        </div>
      </div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 640 }} role="list" aria-label="Roadmap of levels">
          <path d={d} fill="none" stroke="var(--border)" strokeWidth={10} strokeLinecap="round" />
          <path d={d} fill="none" stroke="url(#road-grad)" strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ratio} style={{ transition: 'stroke-dashoffset .8s' }} />
          <defs>
            <linearGradient id="road-grad" x1="0" x2="1">
              <stop offset="0" stopColor="var(--accent)" />
              <stop offset="1" stopColor="var(--violet)" />
            </linearGradient>
          </defs>
          {LEVELS.map((l, i) => {
            const { x, y } = pos[i]!
            const s = per[i]!
            const r = 30
            const c = 2 * Math.PI * r
            const done = isComplete(s.ratio)
            return (
              <g
                key={l.id}
                className="roadmap-node"
                role="listitem"
                tabIndex={0}
                aria-label={`Level ${l.id}: ${l.title}, ${Math.round(s.ratio * 100)}% complete`}
                onClick={() => navigate(`/level/${l.slug}`)}
                onKeyDown={e => e.key === 'Enter' && navigate(`/level/${l.slug}`)}
              >
                <circle className="ring-bg" cx={x} cy={y} r={r} fill="var(--bg-elev)" stroke="var(--border)" strokeWidth={6} />
                <circle cx={x} cy={y} r={r} fill="none" stroke={done ? 'var(--ok)' : PHASE_COLOR[l.phase]} strokeWidth={6} strokeDasharray={c} strokeDashoffset={c * (1 - s.ratio)} transform={`rotate(-90 ${x} ${y})`} strokeLinecap="round" />
                <text x={x} y={y + 6} textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--text)">
                  {done ? '✓' : l.id}
                </text>
                <text x={x} y={y + 52} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="var(--text)">
                  {l.title.length > 28 ? `${l.title.slice(0, 27)}…` : l.title}
                </text>
                <text x={x} y={y + 68} textAnchor="middle" fontSize="11" fill="var(--text-3)">
                  {l.phase} · ~{l.weeks}w · {Math.round(s.ratio * 100)}%
                </text>
              </g>
            )
          })}
        </svg>
        <div className="viz-legend" style={{ marginTop: 8 }}>
          {Object.entries(PHASE_COLOR).map(([k, c]) => (
            <span key={k} style={{ ['--c' as string]: c }}>{k}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
