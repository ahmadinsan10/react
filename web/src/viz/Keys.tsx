import { useState } from 'react'
import { Note, Segmented } from './common'

type Item = { id: number; name: string; color: string }
const COLORS = ['#61dafb', '#a78bfa', '#3ccf8e', '#ffb547', '#ff6b6b', '#f472b6']
const NAMES = ['Ana', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fajar', 'Gita', 'Hadi']
let nextId = 4

const initial = (): Item[] => [
  { id: 1, name: 'Ana', color: COLORS[0]! },
  { id: 2, name: 'Budi', color: COLORS[1]! },
  { id: 3, name: 'Citra', color: COLORS[2]! },
]

/** A row with its own uncontrolled input state — exactly what gets mixed up with bad keys. */
function Row({ item }: { item: Item }) {
  const [note, setNote] = useState('')
  const [mountedAt] = useState(() => new Date().toLocaleTimeString())
  return (
    <div className="row" style={{ padding: '8px 10px', borderRadius: 10, background: 'var(--bg-elev)', border: '1px solid var(--border)', marginBottom: 6, flexWrap: 'nowrap' }}>
      <span style={{ width: 12, height: 12, borderRadius: 4, background: item.color, flexShrink: 0 }} />
      <strong style={{ width: 60 }}>{item.name}</strong>
      <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder={`Note for ${item.name}`} aria-label={`Note for ${item.name}`} style={{ flex: 1, minWidth: 0 }} />
      <span className="subtle" title="When this component instance was mounted">
        mounted {mountedAt}
      </span>
    </div>
  )
}

export default function Keys() {
  const [mode, setMode] = useState<'index' | 'id'>('index')
  const [items, setItems] = useState(initial)

  const addTop = () => {
    const name = NAMES[nextId % NAMES.length]!
    setItems(list => [{ id: nextId, name, color: COLORS[nextId++ % COLORS.length]! }, ...list])
  }
  const shuffle = () => setItems(list => [...list].sort(() => Math.random() - 0.5))
  const removeFirst = () => setItems(list => list.slice(1))
  const reverse = () => setItems(list => [...list].reverse())

  return (
    <div>
      <ol className="muted" style={{ fontSize: '0.9rem' }}>
        <li>Type a different note into each row (e.g. "Ana's note").</li>
        <li>Click <strong>Add to top</strong> or <strong>Shuffle</strong>.</li>
        <li>Watch whether each note stays with its person.</li>
      </ol>
      <div className="viz-controls">
        <Segmented
          label="Key strategy"
          value={mode}
          onChange={m => {
            setMode(m)
            setItems(initial())
          }}
          options={[
            { value: 'index', label: 'key={index}' },
            { value: 'id', label: 'key={item.id}' },
          ]}
        />
        <button className="btn sm" onClick={addTop}>Add to top</button>
        <button className="btn sm" onClick={shuffle}>Shuffle</button>
        <button className="btn sm" onClick={reverse}>Reverse</button>
        <button className="btn sm" onClick={removeFirst} disabled={items.length === 0}>Remove first</button>
        <button className="btn sm ghost" onClick={() => setItems(initial())}>Reset</button>
      </div>
      {/* Remount the whole list when switching mode so the demo starts clean. */}
      <div className="viz-stage" key={mode}>
        {items.map((item, index) => (
          <Row key={mode === 'index' ? index : item.id} item={item} />
        ))}
      </div>
      <Note>
        {mode === 'index'
          ? 'With index keys, React matches rows by POSITION. After adding to the top, the component at position 0 keeps its old note and mount time, but now displays a different person. The props moved; the state did not. Bugs like this corrupt forms, focus and animations.'
          : 'With stable ID keys, React matches rows by IDENTITY. Each note and mount time travels with its person through inserts, shuffles and removals. New items get fresh state.'}
      </Note>
    </div>
  )
}
