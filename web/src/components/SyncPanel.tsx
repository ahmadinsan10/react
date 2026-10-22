import { useState } from 'react'
import { Link } from 'react-router'
import { connect, disconnect, generateSyncKey, normalizeKey, syncNow, useSyncState, type SyncStatus } from '../sync/client'
import { Icon, toast } from './ui'

const LABEL: Record<SyncStatus, string> = {
  off: 'Not syncing',
  syncing: 'Syncing…',
  synced: 'Synced',
  error: 'Sync problem',
  offline: 'Offline: will sync when back online',
}
const COLOR: Record<SyncStatus, string> = { off: 'var(--text-3)', syncing: 'var(--warn)', synced: 'var(--ok)', error: 'var(--bad)', offline: 'var(--warn)' }

function ago(t: number | null) {
  if (!t) return 'never'
  const s = Math.round((Date.now() - t) / 1000)
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  return new Date(t).toLocaleString()
}

/** Compact indicator for the top bar. */
export function SyncBadge() {
  const s = useSyncState()
  if (s.status === 'off') return null
  return (
    <Link to="/settings#sync" className="btn ghost sm" title={s.error ?? `${LABEL[s.status]} · last sync ${ago(s.lastSyncedAt)}`} aria-label={`Sync status: ${LABEL[s.status]}`}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: COLOR[s.status], display: 'inline-block', animation: s.status === 'syncing' ? 'pop 0.8s infinite alternate' : undefined }} />
      <span className="sync-label">{s.status === 'synced' ? 'Synced' : LABEL[s.status]}</span>
    </Link>
  )
}

export function SyncPanel() {
  const s = useSyncState()
  const [mode, setMode] = useState<'idle' | 'join'>('idle')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const run = async (key: string) => {
    setBusy(true)
    setErr(null)
    try {
      await connect(key)
      setMode('idle')
      setInput('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!s.key) return
    try {
      await navigator.clipboard.writeText(s.key)
      toast('Sync key copied')
    } catch {
      setReveal(true)
    }
  }

  return (
    <div className="card" id="sync" style={{ scrollMarginTop: 80 }}>
      <div className="row" style={{ marginBottom: 6 }}>
        <h3 style={{ margin: 0 }}>Sync across devices</h3>
        <span className="spacer" />
        <span className="pill" style={{ color: COLOR[s.status] }}>
          ● {LABEL[s.status]}
        </span>
      </div>

      {s.key ? (
        <>
          <p className="subtle">
            Last synced {ago(s.lastSyncedAt)}. Progress syncs automatically about 2 seconds after each change, when you return to this tab, and every minute.
          </p>
          <label className="subtle" htmlFor="sync-key">Your sync key</label>
          <div className="row" style={{ flexWrap: 'nowrap', margin: '4px 0 12px' }}>
            <code id="sync-key" style={{ flex: 1, minWidth: 0, padding: '8px 10px', fontSize: '0.95rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
              {reveal ? s.key : s.key.replace(/[A-Z2-7]/g, '•').replace(/^.{4}/, s.key.slice(0, 4))}
            </code>
            <button className="btn sm" onClick={() => setReveal(r => !r)}>{reveal ? 'Hide' : 'Show'}</button>
            <button className="btn sm" onClick={copy}>Copy</button>
          </div>
          {s.error && <div className="explain bad">{s.error}</div>}
          <div className="row">
            <button className="btn primary" onClick={() => void syncNow()} disabled={s.status === 'syncing'}>
              <Icon name="reset" size={15} /> Sync now
            </button>
            <button
              className="btn ghost"
              onClick={() => {
                disconnect()
                toast('This device stopped syncing')
              }}
            >
              Stop syncing on this device
            </button>
          </div>
          <p className="subtle" style={{ marginTop: 12 }}>
            On another device, open Settings → Sync → <strong>I have a sync key</strong> and paste this key. Treat it like a password: anyone with the key can read and change your progress.
          </p>
        </>
      ) : mode === 'join' ? (
        <>
          <p className="subtle">Paste the key from your other device. Progress on this device will be merged with it, so nothing is lost.</p>
          <input
            type="text"
            value={input}
            onChange={e => setInput(normalizeKey(e.target.value))}
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
            aria-label="Sync key"
            autoComplete="off"
            spellCheck={false}
            style={{ width: '100%', fontFamily: 'var(--mono)', letterSpacing: '0.05em', marginBottom: 10 }}
          />
          {err && <div className="explain bad">{err}</div>}
          <div className="row">
            <button className="btn primary" disabled={busy || input.length < 29} onClick={() => void run(input)}>
              {busy ? 'Connecting…' : 'Connect'}
            </button>
            <button className="btn ghost" onClick={() => setMode('idle')}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <p className="subtle">
            Progress is stored in this browser. Turn on sync to keep your phone, laptop and work computer in step. There's no account: a private random key identifies your progress, and only a hash of it is stored on the server.
          </p>
          {err && <div className="explain bad">{err}</div>}
          <div className="row">
            <button className="btn primary" disabled={busy} onClick={() => void run(generateSyncKey())}>
              {busy ? 'Setting up…' : 'Turn on sync (new key)'}
            </button>
            <button className="btn" onClick={() => setMode('join')}>I have a sync key</button>
          </div>
        </>
      )}
    </div>
  )
}
