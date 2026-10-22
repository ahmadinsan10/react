import { useState } from 'react'
import { Note } from './common'

const LAYERS = [
  { id: 'e2e', name: 'End-to-end', tools: 'Playwright', share: 10, speed: 'Slow', confidence: 'Highest', color: 'var(--bad)', text: 'A real browser drives the whole app, backend included. Cover only critical user journeys (sign up, checkout): they are slow and can be flaky.' },
  { id: 'int', name: 'Integration', tools: 'Vitest + Testing Library + MSW', share: 50, speed: 'Fast', confidence: 'High', color: 'var(--accent)', text: 'Render a feature (several components together), interact like a user, mock only the network. The best confidence per minute: this is where most of your tests belong.' },
  { id: 'unit', name: 'Unit', tools: 'Vitest', share: 20, speed: 'Fastest', confidence: 'Narrow', color: 'var(--violet)', text: 'Pure functions and isolated logic: reducers, formatters, validation, custom hooks with tricky logic. Fast and precise, but they say little about whether the app works.' },
  { id: 'static', name: 'Static', tools: 'TypeScript + ESLint', share: 20, speed: 'Instant', confidence: 'Typos & types', color: 'var(--ok)', text: 'Catches typos, wrong types, hook rule violations and accessibility lint errors while you type, before any test runs.' },
]

export default function TestingTrophy() {
  const [sel, setSel] = useState('int')
  const cur = LAYERS.find(l => l.id === sel)!
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
          <svg viewBox="0 0 520 320" width="100%" role="img" aria-label="The testing trophy">
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
            {[['End-to-end', 45], ['Integration', 140], ['Unit', 240], ['Static', 293]].map(([t, y]) => (
              <text key={t as string} x={260} y={y as number} textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" pointerEvents="none">
                {t}
              </text>
            ))}
          </svg>
        </div>
        <div className="viz-stage">
          <div className="eyebrow" style={{ color: cur.color }}>{cur.name}</div>
          <p>{cur.text}</p>
          <table className="table">
            <tbody>
              <tr><th>Tools</th><td>{cur.tools}</td></tr>
              <tr><th>Speed</th><td>{cur.speed}</td></tr>
              <tr><th>Confidence</th><td>{cur.confidence}</td></tr>
              <tr><th>Rough share</th><td>~{cur.share}% of effort</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <Note>Tests that resemble how real users use your software give the most confidence. Click each layer of the trophy. Note how the integration layer is the widest.</Note>
    </div>
  )
}
