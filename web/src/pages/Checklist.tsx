import { Bar, Check } from '../components/ui'
import { toggleFlag } from '../store/logic'
import { setProgress, useProgress } from '../store/progress'
import { defineStrings, useChecklist, useStrings } from '../i18n'

const CAPSTONES_EN: [string, string][] = [
  ['Real-time collaborative board', 'Multiplayer presence and cursors (WebSockets, Liveblocks or Yjs), offline support, undo/redo.'],
  ['SaaS analytics dashboard', 'Multi-tenant auth, role-based access, large tables and charts, CSV export, billing page (Stripe test mode).'],
  ['Learning platform', 'Courses, video player, progress tracking, quizzes, admin CMS, i18n. (Like this app, but bigger!)'],
]

const S = defineStrings({
  en: {
    eyebrow: 'Self-assessment',
    title: 'Expert checklist',
    intro: 'You are a React expert when you can do all of these confidently, without looking anything up. Tick them only when you have actually done them.',
    iCan: 'I can…',
    capstone: 'Capstone project',
    capstoneIntro:
      'Pick one and build it to production quality: strict TypeScript, your own design system, WCAG 2.2 AA, tests in CI, Lighthouse ≥ 90 on mobile, error monitoring, ADRs, deployed publicly.',
    mistakes: 'Common mistakes',
    mistake: 'Mistake',
    better: 'Better',
  },
  id: {
    eyebrow: 'Evaluasi diri',
    title: 'Checklist Ahli',
    intro: 'Kamu sudah jadi ahli React kalau bisa melakukan semua ini dengan yakin, tanpa perlu mencari referensi. Centang hanya kalau kamu benar-benar sudah pernah melakukannya.',
    iCan: 'Aku bisa…',
    capstone: 'Proyek akhir (capstone)',
    capstoneIntro:
      'Pilih salah satu dan bangun dengan kualitas production: TypeScript strict, design system buatanmu sendiri, WCAG 2.2 AA, test yang berjalan di CI, Lighthouse ≥ 90 di mobile, error monitoring, ADR, dan di-deploy secara publik.',
    mistakes: 'Kesalahan umum',
    mistake: 'Kesalahan',
    better: 'Lebih baik',
  },
})

export function Checklist() {
  const p = useProgress()
  const s = useStrings(S)
  const { checklist, mistakes, capstones } = useChecklist()
  const done = checklist.filter(c => p.checklist[c.id]).length

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">{s('eyebrow')}</div>
        <h1>{s('title')}</h1>
        <p>{s('intro')}</p>
      </div>
      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="row" style={{ marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>{s('iCan')}</h3>
            <span className="spacer" />
            <span className="subtle">
              {done}/{checklist.length}
            </span>
          </div>
          <Bar value={done / checklist.length} />
          <div style={{ marginTop: 10 }}>
            {checklist.map(c => (
              <Check key={c.id} checked={!!p.checklist[c.id]} onChange={() => setProgress(x => toggleFlag(x, 'checklist', c.id))}>
                {c.text}
              </Check>
            ))}
          </div>
        </div>
        <div className="stack">
          <div className="card">
            <h3>{s('capstone')}</h3>
            <p className="muted">{s('capstoneIntro')}</p>
            {CAPSTONES_EN.map(([title, desc], i) => {
              const [t, d] = capstones?.[i] ?? [title, desc]
              return (
                <div key={title} style={{ borderLeft: '3px solid var(--violet)', padding: '4px 12px', marginBottom: 10 }}>
                  <strong>{t}</strong>
                  <div className="subtle">{d}</div>
                </div>
              )
            })}
          </div>
          <div className="card">
            <h3>{s('mistakes')}</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>{s('mistake')}</th>
                  <th>{s('better')}</th>
                </tr>
              </thead>
              <tbody>
                {mistakes.map(([m, b]) => (
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
