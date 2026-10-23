import { useState } from 'react'
import { Note, Toggle } from './common'
import { useLang } from '../i18n/lang'

const T = {
  en: {
    putIf: 'Put a hook inside an', putIf2: '(breaks the Rules of Hooks)', rerender: "Re-render with name = ''", reset: 'Reset',
    listTitle: "Fiber's hook list (from mount)", callsTitle: 'Calls during the re-render', gets: 'gets', dataOf: (k: string) => `${k}'s data!`,
    expected: (n: string) => ` (expected ${n})`, noCall: '(no call) — React: "Rendered fewer hooks than expected"', hint: 'Click "Re-render" to replay the hook calls.',
    n1: "React stores each component's hooks as a linked list on its fiber, in the order they were called during mount. Hooks have no names — only positions.",
    n2: "The skipped useState shifted every later call by one position: the effect slot receives surname's state, age receives the effect, and the list ends early. React detects this and throws. That is why hooks must be called unconditionally, at the top level, in the same order every render.",
    n3: 'Same order as mount, so every call is matched to its own stored state. Put conditions INSIDE hooks (e.g. inside the effect), never around them.',
  },
  id: {
    putIf: 'Taruh hook di dalam', putIf2: '(melanggar Rules of Hooks)', rerender: "Re-render dengan name = ''", reset: 'Reset',
    listTitle: 'Daftar hook di fiber (dari mount)', callsTitle: 'Pemanggilan saat re-render', gets: 'menerima', dataOf: (k: string) => `data milik ${k}!`,
    expected: (n: string) => ` (seharusnya ${n})`, noCall: '(tidak dipanggil) — React: "Rendered fewer hooks than expected"', hint: 'Klik "Re-render" untuk memutar ulang pemanggilan hook.',
    n1: 'React menyimpan hook setiap component sebagai linked list di fiber-nya, sesuai urutan pemanggilan saat mount. Hook tidak punya nama, hanya posisi.',
    n2: 'useState yang dilewati menggeser semua pemanggilan sesudahnya satu posisi: slot effect menerima state milik surname, age menerima effect, dan list berakhir lebih cepat. React mendeteksinya lalu melempar error. Karena itulah hook harus dipanggil tanpa kondisi, di top level, dengan urutan yang sama di setiap render.',
    n3: 'Urutannya sama seperti saat mount, jadi setiap pemanggilan cocok dengan state miliknya sendiri. Taruh kondisi DI DALAM hook (misalnya di dalam effect), jangan pernah membungkus hook-nya.',
  },
} as const

type Hook = { kind: string; name: string; value: string }

const FIRST: Hook[] = [
  { kind: 'useState', name: 'name', value: '"Ana"' },
  { kind: 'useState', name: 'surname', value: '"Putri"' },
  { kind: 'useEffect', name: 'persistForm', value: 'effect' },
  { kind: 'useState', name: 'age', value: '30' },
]

export default function HooksList() {
  const t = T[useLang()]
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
          {t.putIf} <code>if</code> {t.putIf2}
        </Toggle>
        <button className="btn sm primary" onClick={() => setRendered(true)} disabled={rendered}>
          {t.rerender}
        </button>
        <button className="btn sm ghost" onClick={() => setRendered(false)}>
          {t.reset}
        </button>
      </div>
      <div className="viz-stage">
        <pre>
          <code>{code.join('\n')}</code>
        </pre>
        <div className="grid cols-2">
          <div>
            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-3)' }}>{t.listTitle}</h4>
            <ListView hooks={FIRST} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-3)' }}>{t.callsTitle}</h4>
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
                          {call.kind}({call.name}) ← {t.gets} {stored.kind === call.kind ? stored.value : t.dataOf(stored.kind)}
                          {!ok && t.expected(stored.name)}
                        </div>
                      ) : (
                        <div className="chip r" style={{ flex: 1, marginBottom: 0 }}>
                          {t.noCall}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="subtle">{t.hint}</p>
            )}
          </div>
        </div>
      </div>
      <Note>
        {!rendered
          ? t.n1
          : conditional
            ? t.n2
            : t.n3}
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
