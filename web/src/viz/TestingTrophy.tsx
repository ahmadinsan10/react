import { useState } from 'react'
import { Note } from './common'
import { useLang } from '../i18n/lang'

const LAYERS_ID: Record<string, { speed: string; confidence: string; text: string }> = {
  e2e: { speed: 'Lambat', confidence: 'Paling tinggi', text: 'Browser sungguhan menjalankan seluruh aplikasi, termasuk backend. Cukup cover alur pengguna yang kritis (sign up, checkout): test ini lambat dan bisa flaky.' },
  int: { speed: 'Cepat', confidence: 'Tinggi', text: 'Render satu fitur (beberapa component sekaligus), berinteraksi seperti pengguna, dan mock hanya bagian network. Tingkat kepercayaan per menit yang paling bagus: sebagian besar test kamu sebaiknya ada di sini.' },
  unit: { speed: 'Paling cepat', confidence: 'Sempit', text: 'Fungsi murni dan logika yang terisolasi: reducer, formatter, validasi, custom hook dengan logika rumit. Cepat dan presisi, tapi tidak banyak memberi tahu apakah aplikasinya benar-benar jalan.' },
  static: { speed: 'Instan', confidence: 'Typo & tipe', text: 'Menangkap typo, tipe yang salah, pelanggaran aturan hook, dan error lint aksesibilitas selagi kamu mengetik, sebelum test apa pun dijalankan.' },
}

const T = {
  en: {
    aria: 'The testing trophy', tools: 'Tools', speed: 'Speed', confidence: 'Confidence', share: 'Rough share', effort: (n: number) => `~${n}% of effort`,
    note: 'Tests that resemble how real users use your software give the most confidence. Click each layer of the trophy. Note how the integration layer is the widest.',
  },
  id: {
    aria: 'Testing trophy', tools: 'Tools', speed: 'Kecepatan', confidence: 'Tingkat kepercayaan', share: 'Porsi kira-kira', effort: (n: number) => `~${n}% dari usaha`,
    note: 'Test yang menyerupai cara pengguna sungguhan memakai software kamu memberi tingkat kepercayaan paling tinggi. Klik setiap lapisan trophy. Perhatikan bahwa lapisan integration adalah yang paling lebar.',
  },
} as const

const LAYERS = [
  { id: 'e2e', name: 'End-to-end', tools: 'Playwright', share: 10, speed: 'Slow', confidence: 'Highest', color: 'var(--bad)', text: 'A real browser drives the whole app, backend included. Cover only critical user journeys (sign up, checkout): they are slow and can be flaky.' },
  { id: 'int', name: 'Integration', tools: 'Vitest + Testing Library + MSW', share: 50, speed: 'Fast', confidence: 'High', color: 'var(--accent)', text: 'Render a feature (several components together), interact like a user, mock only the network. The best confidence per minute: this is where most of your tests belong.' },
  { id: 'unit', name: 'Unit', tools: 'Vitest', share: 20, speed: 'Fastest', confidence: 'Narrow', color: 'var(--violet)', text: 'Pure functions and isolated logic: reducers, formatters, validation, custom hooks with tricky logic. Fast and precise, but they say little about whether the app works.' },
  { id: 'static', name: 'Static', tools: 'TypeScript + ESLint', share: 20, speed: 'Instant', confidence: 'Typos & types', color: 'var(--ok)', text: 'Catches typos, wrong types, hook rule violations and accessibility lint errors while you type, before any test runs.' },
]

export default function TestingTrophy() {
  const [sel, setSel] = useState('int')
  const lang = useLang()
  const t = T[lang]
  const base = LAYERS.find(l => l.id === sel)!
  const cur = lang === 'id' ? { ...base, ...LAYERS_ID[base.id]! } : base
  // Trophy silhouette: widths per layer (top → bottom).
  const shapes = [
    { id: 'e2e', d: 'M210 20 h100 v50 h-100z' },
    { id: 'int', d: 'M140 75 h240 q10 0 8 10 l-20 110 q-2 10 -12 10 h-192 q-10 0 -12 -10 l-20 -110 q-2 -10 8 -10z' },
    { id: 'unit', d: 'M230 210 h60 v55 h-60z' },
    { id: 'static', d: 'M170 270 h180 q10 0 10 10 v20 q0 10 -10 10 h-180 q-10 0 -10 -10 v-20 q0 -10 10 -10z' },
  ]
  return (
    <div>
      <div className="grid cols-2">
        <div className="viz-stage">
          <svg viewBox="0 0 520 320" width="100%" role="img" aria-label={t.aria}>
            <path d="M140 95 q-60 0 -60 45 q0 40 70 50" fill="none" stroke="var(--border)" strokeWidth="8" />
            <path d="M380 95 q60 0 60 45 q0 40 -70 50" fill="none" stroke="var(--border)" strokeWidth="8" />
            {shapes.map(s => {
              const l = LAYERS.find(x => x.id === s.id)!
              return (
                <g key={s.id} className="roadmap-node" onClick={() => setSel(s.id)} role="button" tabIndex={0} aria-label={l.name} onKeyDown={e => e.key === 'Enter' && setSel(s.id)}>
                  <path d={s.d} fill={l.color} opacity={sel === s.id ? 1 : 0.35} stroke={sel === s.id ? 'var(--text)' : 'none'} strokeWidth={2} />
                </g>
              )
            })}
            {[['End-to-end', 45], ['Integration', 140], ['Unit', 240], ['Static', 293]].map(([lb, y]) => (
              <text key={lb as string} x={260} y={y as number} textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" pointerEvents="none">
                {lb}
              </text>
            ))}
          </svg>
        </div>
        <div className="viz-stage">
          <div className="eyebrow" style={{ color: cur.color }}>{cur.name}</div>
          <p>{cur.text}</p>
          <table className="table">
            <tbody>
              <tr><th>{t.tools}</th><td>{cur.tools}</td></tr>
              <tr><th>{t.speed}</th><td>{cur.speed}</td></tr>
              <tr><th>{t.confidence}</th><td>{cur.confidence}</td></tr>
              <tr><th>{t.share}</th><td>{t.effort(cur.share)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <Note>{t.note}</Note>
    </div>
  )
}
