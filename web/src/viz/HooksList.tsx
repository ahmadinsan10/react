import { useState } from 'react'
import { Note, Toggle } from './common'

type Hook = { kind: string; name: string; value: string }

const FIRST: Hook[] = [
  { kind: 'useState', name: 'name', value: '"Ana"' },
  { kind: 'useState', name: 'surname', value: '"Putri"' },
  { kind: 'useEffect', name: 'persistForm', value: 'effect' },
  { kind: 'useState', name: 'age', value: '30' },
]

export default function HooksList() {
  const [conditional, setConditional] = useState(false)
  const [rendered, setRendered] = useState(false)

  // On the second render, the name is empty, so a conditional hook is skipped.
  const secondCalls = conditional ? FIRST.filter(h => h.name !== 'surname') : FIRST
  const code = [
    'function Form() {',
    "  const [name, setName] = useState('Ana')",
    conditional ? "  if (name !== '') {" : null,
    `  ${conditional ? '  ' : ''}const [surname] = useState('Putri')`,
    conditional ? '  }' : null,
    '  useEffect(function persistForm() { … })',
    '  const [age] = useState(30)',
    '}',
  ].filter((l): l is string => l !== null)

  return (
    <div>
      <div className="viz-controls">
        <Toggle
          checked={conditional}
          onChange={v => {
            setConditional(v)
            setRendered(false)
          }}
        >
          Put a hook inside an <code>if</code> (breaks the Rules of Hooks)
        </Toggle>
        <button className="btn sm primary" onClick={() => setRendered(true)} disabled={rendered}>
          Re-render with name = ''
        </button>
        <button className="btn sm ghost" onClick={() => setRendered(false)}>
          Reset
        </button>
      </div>
      <div className="viz-stage">
        <pre>
          <code>{code.join('\n')}</code>
        </pre>
        <div className="grid cols-2">
          <div>
            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-3)' }}>Fiber's hook list (from mount)</h4>
            <ListView hooks={FIRST} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-3)' }}>Calls during the re-render</h4>
            {rendered ? (
              <div>
                {FIRST.map((stored, i) => {
                  const call = secondCalls[i]
                  const ok = call && call.kind === stored.kind && call.name === stored.name
                  return (
                    <div key={i} className="row" style={{ gap: 6, flexWrap: 'nowrap', marginBottom: 6 }}>
                      <span className="subtle" style={{ width: 20 }}>#{i + 1}</span>
                      {call ? (
                        <div className={`chip ${ok ? 'o' : 'r'}`} style={{ flex: 1, marginBottom: 0 }}>
                          {call.kind}({call.name}) ← gets {stored.kind === call.kind ? stored.value : `${stored.kind}'s data!`}
                          {!ok && ` (expected ${stored.name})`}
                        </div>
                      ) : (
                        <div className="chip r" style={{ flex: 1, marginBottom: 0 }}>
                          (no call) — React: "Rendered fewer hooks than expected"
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="subtle">Click "Re-render" to replay the hook calls.</p>
            )}
          </div>
        </div>
      </div>
      <Note>
        {!rendered
          ? 'React stores each component\'s hooks as a linked list on its fiber, in the order they were called during mount. Hooks have no names — only positions.'
          : conditional
            ? 'The skipped useState shifted every later call by one position: the effect slot receives surname\'s state, age receives the effect, and the list ends early. React detects this and throws. That is why hooks must be called unconditionally, at the top level, in the same order every render.'
            : 'Same order as mount, so every call is matched to its own stored state. Put conditions INSIDE hooks (e.g. inside the effect), never around them.'}
      </Note>
    </div>
  )
}

function ListView({ hooks }: { hooks: Hook[] }) {
  return (
    <div>
      {hooks.map((h, i) => (
        <div key={i} className="row" style={{ gap: 6, flexWrap: 'nowrap', marginBottom: 6 }}>
          <span className="subtle" style={{ width: 20 }}>#{i + 1}</span>
          <div className="chip a" style={{ flex: 1, marginBottom: 0 }}>
            {h.kind}: {h.value} <span className="subtle">({h.name})</span>
          </div>
          {i < hooks.length - 1 && <span className="subtle">→</span>}
        </div>
      ))}
    </div>
  )
}
