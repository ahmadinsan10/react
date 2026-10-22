import { useRef, useState } from 'react'
import { toast } from '../components/ui'
import { emptyProgress, parseProgress } from '../store/logic'
import { replaceProgress, useProgress } from '../store/progress'

export function Settings() {
  const p = useProgress()
  const file = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `react-mastery-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Progress exported')
  }

  const importJson = async (f: File) => {
    setError(null)
    try {
      const parsed = parseProgress(JSON.parse(await f.text()))
      if (!parsed) throw new Error('This file is not a React Mastery progress backup.')
      replaceProgress(parsed)
      toast('Progress imported')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read file')
    }
  }

  const items = Object.keys(p.topics).length + Object.keys(p.tasks).length + Object.keys(p.cards).length

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Settings</div>
        <h1>Settings & backup</h1>
        <p>
          Your progress is stored only in this browser (localStorage). Nothing is sent to a server. To learn on another device, or to keep a safe copy, export a backup and import it
          there.
        </p>
      </div>
      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h3>Backup</h3>
          <p className="subtle">{items} tracked items · {Object.keys(p.notes).length} notes · started {new Date(p.startedAt).toLocaleDateString()}</p>
          <div className="row">
            <button className="btn primary" onClick={exportJson}>Export progress (.json)</button>
            <button className="btn" onClick={() => file.current?.click()}>Import backup…</button>
            <input
              ref={file}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) void importJson(f)
                e.target.value = ''
              }}
            />
          </div>
          {error && <div className="explain bad">{error}</div>}
        </div>
        <div className="card">
          <h3>Reset</h3>
          <p className="subtle">Erase all progress, quiz history and notes in this browser. Export a backup first if you might want it back.</p>
          {confirmReset ? (
            <div className="row">
              <button
                className="btn danger"
                onClick={() => {
                  replaceProgress(emptyProgress())
                  setConfirmReset(false)
                  toast('Progress reset')
                }}
              >
                Yes, erase everything
              </button>
              <button className="btn ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn danger" onClick={() => setConfirmReset(true)}>Reset progress…</button>
          )}
        </div>
        <div className="card">
          <h3>Keyboard shortcuts</h3>
          <table className="table">
            <tbody>
              <tr><td><kbd>Ctrl</kbd> + <kbd>K</kbd> or <kbd>/</kbd></td><td>Search everything</td></tr>
              <tr><td><kbd>1</kbd>–<kbd>4</kbd></td><td>Answer a quiz question</td></tr>
              <tr><td><kbd>Enter</kbd></td><td>Next question</td></tr>
              <tr><td><kbd>↑</kbd> <kbd>↓</kbd> <kbd>Enter</kbd></td><td>Navigate search results</td></tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>About</h3>
          <p className="subtle">
            Built with React 19, TypeScript, Vite and React Router, following the roadmap in GUIDE.md. Progress logic is covered by unit tests (Vitest). Each visualization is
            code-split and loads on demand.
          </p>
        </div>
      </div>
    </div>
  )
}
