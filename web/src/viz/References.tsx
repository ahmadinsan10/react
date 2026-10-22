import { Note, StepControls, useStepper } from './common'

type Obj = { id: string; label: string; color: string }
type Step = { code: string; vars: [string, string][]; objs: Obj[]; checks: string[]; note: string }

const STEPS: Step[] = [
  { code: 'const a = { n: 1 }', vars: [['a', 'o1']], objs: [{ id: 'o1', label: '{ n: 1 }', color: 'var(--accent)' }], checks: [], note: 'A new object is created in memory. `a` holds a reference (an arrow) to it.' },
  { code: 'const b = a', vars: [['a', 'o1'], ['b', 'o1']], objs: [{ id: 'o1', label: '{ n: 1 }', color: 'var(--accent)' }], checks: ['a === b → true'], note: 'Assigning copies the REFERENCE, not the object. Both arrows point to the same box.' },
  { code: 'b.n = 2', vars: [['a', 'o1'], ['b', 'o1']], objs: [{ id: 'o1', label: '{ n: 2 }', color: 'var(--warn)' }], checks: ['a.n → 2 (!)', 'a === b → true'], note: 'Mutating through b changes the object a sees too. In React, mutating state like this keeps the same reference, so React may skip the re-render.' },
  { code: 'const c = { ...a }', vars: [['a', 'o1'], ['b', 'o1'], ['c', 'o2']], objs: [{ id: 'o1', label: '{ n: 2 }', color: 'var(--warn)' }, { id: 'o2', label: '{ n: 2 }', color: 'var(--ok)' }], checks: ['a === c → false', 'a.n === c.n → true'], note: 'Spread creates a NEW object with the same contents. Different reference → React sees a change.' },
  { code: 'c.n = 3', vars: [['a', 'o1'], ['b', 'o1'], ['c', 'o2']], objs: [{ id: 'o1', label: '{ n: 2 }', color: 'var(--warn)' }, { id: 'o2', label: '{ n: 3 }', color: 'var(--ok)' }], checks: ['a.n → 2', 'c.n → 3'], note: 'Changing the copy leaves the original untouched. This is how you update state immutably: copy, then change the copy.' },
  { code: '{ n: 3 } === { n: 3 }', vars: [['a', 'o1'], ['b', 'o1'], ['c', 'o2']], objs: [{ id: 'o1', label: '{ n: 2 }', color: 'var(--warn)' }, { id: 'o2', label: '{ n: 3 }', color: 'var(--ok)' }], checks: ['→ false'], note: 'Two separately created objects are never equal, even with identical contents. That is why an object or arrow function created during render is "new" every render.' },
]

export default function References() {
  const s = useStepper(STEPS.length, 1800)
  const st = STEPS[s.i]!
  const W = 560
  const varY = (i: number) => 40 + i * 70
  const objY = (i: number) => 60 + i * 110

  return (
    <div>
      <StepControls s={s} total={STEPS.length} />
      <div className="viz-stage">
        <pre style={{ marginBottom: 12 }}>
          <code>{STEPS.slice(0, s.i + 1).map(x => x.code).join('\n')}</code>
        </pre>
        <svg viewBox={`0 0 ${W} 260`} width="100%" role="img" aria-label="Variables pointing to objects in memory">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 10 5 0 10z" fill="var(--text-2)" />
            </marker>
          </defs>
          <text x="20" y="18" fontSize="12" fill="var(--text-3)" fontWeight="700">VARIABLES</text>
          <text x="330" y="18" fontSize="12" fill="var(--text-3)" fontWeight="700">HEAP (objects)</text>
          {st.objs.map((o, i) => (
            <g key={o.id} style={{ transition: 'all .3s' }}>
              <rect x={330} y={objY(i)} width={190} height={56} rx={10} fill="var(--bg-elev)" stroke={o.color} strokeWidth={2.5} />
              <text x={425} y={objY(i) + 33} textAnchor="middle" fontFamily="var(--mono)" fontSize="16" fill="var(--text)">
                {o.label}
              </text>
              <text x={512} y={objY(i) + 14} textAnchor="end" fontSize="10" fill="var(--text-3)">
                #{o.id}
              </text>
            </g>
          ))}
          {st.vars.map(([name, target], i) => {
            const oi = st.objs.findIndex(o => o.id === target)
            return (
              <g key={name}>
                <rect x={20} y={varY(i)} width={80} height={44} rx={8} fill="var(--accent-soft)" />
                <text x={60} y={varY(i) + 28} textAnchor="middle" fontFamily="var(--mono)" fontSize="16" fontWeight="700" fill="var(--text)">
                  {name}
                </text>
                <path
                  d={`M100 ${varY(i) + 22} C 220 ${varY(i) + 22}, 220 ${objY(oi) + 28}, 326 ${objY(oi) + 28}`}
                  fill="none"
                  stroke="var(--text-2)"
                  strokeWidth={2}
                  markerEnd="url(#arrow)"
                />
              </g>
            )
          })}
        </svg>
        {st.checks.length > 0 && (
          <div className="row">
            {st.checks.map(c => (
              <span key={c} className="chip a" style={{ marginBottom: 0 }}>
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
      <Note>{st.note}</Note>
    </div>
  )
}
