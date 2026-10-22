import { memo, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Note, Toggle } from './common'

// A tiny external log store, so the child's effects can log without re-rendering the parent mid-effect.
type Entry = { t: number; kind: 'render' | 'setup' | 'cleanup' | 'layout'; text: string }
let entries: Entry[] = []
const subs = new Set<() => void>()
const push = (kind: Entry['kind'], text: string) => {
  entries = [...entries, { t: performance.now(), kind, text }].slice(-40)
  queueMicrotask(() => subs.forEach(s => s()))
}
const clear = () => {
  entries = []
  subs.forEach(s => s())
}
const useEntries = () =>
  useSyncExternalStore(
    cb => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => entries,
  )

// memo: the parent re-renders whenever the log changes; without memo, Chat's per-commit
// log entry would trigger another parent render, forever.
const Chat = memo(function Chat({ roomId, theme, simulateStrict }: { roomId: string; theme: string; simulateStrict: boolean }) {
  const renders = useRef(0)
  // Logging a render from an effect without deps = once per commit.
  useEffect(() => {
    renders.current++
    push('render', `Chat committed (render #${renders.current}) room=${roomId} theme=${theme}`)
  })

  useEffect(() => {
    const run = () => {
      push('setup', `connect("${roomId}")`)
      return () => push('cleanup', `disconnect("${roomId}")`)
    }
    if (simulateStrict && renders.current <= 1) {
      // What StrictMode does in development on mount: setup → cleanup → setup.
      const c = run()
      c()
    }
    return run()
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps -- simulateStrict only affects the very first mount

  return (
    <div className="chip a" style={{ display: 'inline-block' }}>
      💬 Connected to <strong>#{roomId}</strong> · theme: {theme}
    </div>
  )
})

const COLORS: Record<Entry['kind'], string> = { render: 'var(--text-3)', setup: 'var(--ok)', cleanup: 'var(--bad)', layout: 'var(--violet)' }

export default function EffectTimeline() {
  const [mounted, setMounted] = useState(true)
  const [room, setRoom] = useState('general')
  const [theme, setTheme] = useState('dark')
  const [strict, setStrict] = useState(false)
  const [mountKey, setMountKey] = useState(0)
  const log = useEntries()
  const t0 = log[0]?.t ?? 0

  return (
    <div>
      <pre>
        <code>{`useEffect(() => {
  const conn = connect(roomId)     // setup
  return () => conn.disconnect()   // cleanup
}, [roomId])                       // re-run only when roomId changes`}</code>
      </pre>
      <div className="viz-controls">
        <button className="btn sm" onClick={() => setMounted(m => !m)}>
          {mounted ? 'Unmount <Chat>' : 'Mount <Chat>'}
        </button>
        <label className="row" style={{ gap: 6 }}>
          roomId
          <select value={room} onChange={e => setRoom(e.target.value)}>
            <option>general</option>
            <option>react</option>
            <option>rust</option>
          </select>
        </label>
        <button className="btn sm" onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}>
          Toggle theme (not a dependency)
        </button>
        <Toggle
          checked={strict}
          onChange={v => {
            setStrict(v)
            clear()
            setMountKey(k => k + 1)
          }}
        >
          Simulate StrictMode mount
        </Toggle>
        <button className="btn sm ghost" onClick={clear}>
          Clear log
        </button>
      </div>
      <div className="viz-stage">
        <div style={{ minHeight: 36, marginBottom: 10 }}>{mounted ? <Chat key={mountKey} roomId={room} theme={theme} simulateStrict={strict} /> : <span className="subtle">&lt;Chat&gt; is unmounted</span>}</div>
        <div className="log" aria-live="polite">
          {log.length === 0 && <div className="subtle">Interact with the controls to see the effect lifecycle…</div>}
          {log.map((e, i) => (
            <div key={i} style={{ color: COLORS[e.kind] }}>
              <span style={{ color: 'var(--text-3)' }}>+{Math.round(e.t - t0).toString().padStart(5, ' ')}ms </span>
              {e.kind === 'setup' ? '▶ setup   ' : e.kind === 'cleanup' ? '■ cleanup ' : '· '}
              {e.text}
            </div>
          ))}
        </div>
        <div className="viz-legend" style={{ marginTop: 8 }}>
          <span style={{ ['--c' as string]: 'var(--ok)' }}>effect setup</span>
          <span style={{ ['--c' as string]: 'var(--bad)' }}>effect cleanup</span>
          <span style={{ ['--c' as string]: 'var(--text-3)' }}>commit</span>
        </div>
      </div>
      <Note>
        Try each control. **Changing roomId** runs cleanup for the old room *then* setup for the new one. **Toggling theme** re-renders but the effect does not re-run (theme is not a dependency). **Unmounting** runs the final cleanup. **StrictMode** in development mounts → cleans up → mounts again to prove your cleanup works.
      </Note>
    </div>
  )
}
