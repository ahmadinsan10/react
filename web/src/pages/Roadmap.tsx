import { useNavigate } from 'react-router'
import { Bar } from '../components/ui'
import { isComplete, overallStats } from '../store/logic'
import { useProgress } from '../store/progress'
import { defineStrings, locale, useLang, useLevels, useStrings, useT } from '../i18n'

const S = defineStrings({
  en: {
    eyebrow: 'Roadmap',
    title: 'The path to React expertise',
    intro: 'Click any level to open it. Rings fill as you complete lessons, project tasks, quiz questions and the checkpoint.',
    overall: 'Overall',
    estimated: 'Estimated total',
    weeks: '~{n} weeks',
    perWeek: 'at ~10 hours/week',
    projected: 'Projected finish (your pace)',
    projectedSub: '{n} weeks total at your current rate',
    projectedNone: 'Complete a few items to see a projection',
    aria: 'Roadmap of levels',
    nodeAria: 'Level {n}: {title}, {p}% complete',
  },
  id: {
    eyebrow: 'Roadmap',
    title: 'Jalan menuju keahlian React',
    intro: 'Klik level mana pun untuk membukanya. Lingkaran akan terisi seiring kamu menyelesaikan materi, tugas proyek, soal kuis, dan checkpoint.',
    overall: 'Keseluruhan',
    estimated: 'Perkiraan total',
    weeks: '~{n} minggu',
    perWeek: 'dengan ~10 jam/minggu',
    projected: 'Perkiraan selesai (sesuai ritmemu)',
    projectedSub: 'Total {n} minggu dengan kecepatanmu sekarang',
    projectedNone: 'Selesaikan beberapa item untuk melihat perkiraan',
    aria: 'Roadmap level',
    nodeAria: 'Level {n}: {title}, selesai {p}%',
  },
})

const PHASE_COLOR = { Foundations: 'var(--accent)', Building: 'var(--violet)', Mastery: 'var(--warn)', Expert: 'var(--ok)' } as const

export function Roadmap() {
  const p = useProgress()
  const s = useStrings(S)
  const t = useT()
  const lang = useLang()
  const LEVELS = useLevels()
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
        <div className="eyebrow">{s('eyebrow')}</div>
        <h1>{s('title')}</h1>
        <p>{s('intro')}</p>
      </div>
      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <div className="card stat">
          <div className="label">{s('overall')}</div>
          <div className="value">{Math.round(ratio * 100)}%</div>
          <div style={{ marginTop: 8 }}><Bar value={ratio} /></div>
        </div>
        <div className="card stat">
          <div className="label">{s('estimated')}</div>
          <div className="value">{s('weeks', { n: totalWeeks })}</div>
          <div className="subtle">{s('perWeek')}</div>
        </div>
        <div className="card stat">
          <div className="label">{s('projected')}</div>
          <div className="value" style={{ fontSize: '1.3rem' }}>{finish ? finish.toLocaleDateString(locale(lang), { year: 'numeric', month: 'short' }) : '—'}</div>
          <div className="subtle">{finish ? s('projectedSub', { n: Math.round(projected!) }) : s('projectedNone')}</div>
        </div>
      </div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 640 }} role="list" aria-label={s('aria')}>
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
            const st = per[i]!
            const r = 30
            const c = 2 * Math.PI * r
            const done = isComplete(st.ratio)
            return (
              <g
                key={l.id}
                className="roadmap-node"
                role="listitem"
                tabIndex={0}
                aria-label={s('nodeAria', { n: l.id, title: l.title, p: Math.round(st.ratio * 100) })}
                onClick={() => navigate(`/level/${l.slug}`)}
                onKeyDown={e => e.key === 'Enter' && navigate(`/level/${l.slug}`)}
              >
                <circle className="ring-bg" cx={x} cy={y} r={r} fill="var(--bg-elev)" stroke="var(--border)" strokeWidth={6} />
                <circle cx={x} cy={y} r={r} fill="none" stroke={done ? 'var(--ok)' : PHASE_COLOR[l.phase]} strokeWidth={6} strokeDasharray={c} strokeDashoffset={c * (1 - st.ratio)} transform={`rotate(-90 ${x} ${y})`} strokeLinecap="round" />
                <text x={x} y={y + 6} textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--text)">
                  {done ? '✓' : l.id}
                </text>
                <text x={x} y={y + 52} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="var(--text)">
                  {l.title.length > 28 ? `${l.title.slice(0, 27)}…` : l.title}
                </text>
                <text x={x} y={y + 68} textAnchor="middle" fontSize="11" fill="var(--text-3)">
                  {t(`phase_${l.phase}`)} · {t('weeksShort', { n: l.weeks })} · {Math.round(st.ratio * 100)}%
                </text>
              </g>
            )
          })}
        </svg>
        <div className="viz-legend" style={{ marginTop: 8 }}>
          {Object.entries(PHASE_COLOR).map(([k, c]) => (
            <span key={k} style={{ ['--c' as string]: c }}>{t(`phase_${k as keyof typeof PHASE_COLOR}`)}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
