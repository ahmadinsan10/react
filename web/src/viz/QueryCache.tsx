import { useEffect, useRef, useState } from 'react'
import { Note } from './common'

type Key = (string | number)[]
type Entry = {
  key: Key
  hash: string
  data: string | null
  updatedAt: number
  fetching: boolean
  fetchEndsAt: number
  observers: number
  inactiveSince: number | null
  invalidated: boolean
  gced: boolean
  fetches: number
}
type Comp = { id: string; name: string; key: Key }

const LATENCY = 1500
const COMPS: Comp[] = [
  { id: 'list', name: '<ProductList />', key: ['products'] },
  { id: 'count', name: '<CartBadge />', key: ['products'] },
  { id: 'detail', name: '<ProductDetail id={2} />', key: ['products', 2] },
  { id: 'user', name: '<UserMenu />', key: ['user'] },
]

const hashKey = (k: Key) => JSON.stringify(k)
const startsWith = (k: Key, prefix: Key) => prefix.every((p, i) => k[i] === p)
const secs = (ms: number) => `${Math.max(0, ms / 1000).toFixed(1)}s`

export default function QueryCache() {
  const [staleTime, setStaleTime] = useState(5)
  const [gcTime, setGcTime] = useState(8)
  const [mounted, setMounted] = useState<Record<string, boolean>>({})
  const [now, setNow] = useState(() => Date.now())
  const [log, setLog] = useState<string[]>([])
  const cache = useRef(new Map<string, Entry>())
  const server = useRef({ productName: 'Lamp', version: 1, requests: 0 })
  const cfg = useRef({ staleTime, gcTime })
  cfg.current = { staleTime, gcTime }

  const addLog = (msg: string) => {
    const t = new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })
    setLog(l => [`${t}  ${msg}`, ...l].slice(0, 12))
  }

  const isStale = (e: Entry, t: number) => e.invalidated || e.data === null || t - e.updatedAt >= cfg.current.staleTime * 1000

  const fetchEntry = (e: Entry, reason: string) => {
    if (e.fetching) {
      addLog(`dedupe: ${e.hash} already in flight, no new request`)
      return
    }
    e.fetching = true
    e.fetchEndsAt = Date.now() + LATENCY
    e.fetches++
    server.current.requests++
    addLog(`GET ${e.hash} (${reason})`)
  }

  // The single clock: resolves fake fetches and garbage-collects inactive entries.
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now()
      for (const e of cache.current.values()) {
        if (e.fetching && t >= e.fetchEndsAt) {
          const s = server.current
          e.fetching = false
          e.invalidated = false
          e.updatedAt = t
          e.data = e.key[0] === 'user' ? 'Ada (admin)' : e.key.length > 1 ? `#${e.key[1]} ${s.productName} v${s.version}` : `3 items: ${s.productName} v${s.version}, Desk, Chair`
          setLog(l => [`${new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}  ✓ ${e.hash} resolved`, ...l].slice(0, 12))
        }
        if (!e.gced && e.observers === 0 && e.inactiveSince !== null && !e.fetching && t - e.inactiveSince >= cfg.current.gcTime * 1000) {
          e.gced = true
          e.data = null
          setLog(l => [`${new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}  🗑 ${e.hash} garbage-collected`, ...l].slice(0, 12))
        }
      }
      setNow(t)
    }, 250)
    return () => clearInterval(id)
  }, [])

  const getEntry = (key: Key) => {
    const hash = hashKey(key)
    let e = cache.current.get(hash)
    if (!e || e.gced) {
      e = { key, hash, data: null, updatedAt: 0, fetching: false, fetchEndsAt: 0, observers: 0, inactiveSince: null, invalidated: false, gced: false, fetches: e?.fetches ?? 0 }
      cache.current.set(hash, e)
    }
    return e
  }

  const mount = (c: Comp) => {
    const e = getEntry(c.key)
    e.observers++
    e.inactiveSince = null
    if (e.data === null) fetchEntry(e, `${c.name} mounted, no data`)
    else if (isStale(e, Date.now())) fetchEntry(e, `${c.name} mounted, data stale → background refetch`)
    else addLog(`${c.name} mounted, served fresh from cache`)
  }

  const unmount = (c: Comp) => {
    const e = cache.current.get(hashKey(c.key))
    if (!e) return
    e.observers = Math.max(0, e.observers - 1)
    if (e.observers === 0) {
      e.inactiveSince = Date.now()
      addLog(`${e.hash} has no observers → inactive, GC in ${cfg.current.gcTime}s`)
    }
  }

  const setMount = (ids: string[], on: boolean) => {
    const changed = ids.filter(id => !!mounted[id] !== on)
    for (const id of changed) {
      const c = COMPS.find(x => x.id === id)!
      if (on) mount(c)
      else unmount(c)
    }
    setMounted(m => ({ ...m, ...Object.fromEntries(changed.map(id => [id, on])) }))
    setNow(Date.now())
  }

  const focus = () => {
    const t = Date.now()
    let n = 0
    for (const e of cache.current.values()) {
      if (!e.gced && e.observers > 0 && isStale(e, t)) {
        fetchEntry(e, 'window focus, stale')
        n++
      }
    }
    if (!n) addLog('window focus: nothing stale & active, no requests')
    setNow(t)
  }

  const rename = () => {
    const s = server.current
    s.version++
    addLog(`mutation: renamed product → v${s.version}; invalidateQueries(['products'])`)
    for (const e of cache.current.values()) {
      if (e.gced || !startsWith(e.key, ['products'])) continue
      e.invalidated = true
      if (e.observers > 0) fetchEntry(e, 'invalidated, active')
    }
    setNow(Date.now())
  }

  const reset = () => {
    cache.current.clear()
    server.current = { productName: 'Lamp', version: 1, requests: 0 }
    setMounted({})
    setLog([])
  }

  const entries = [...cache.current.values()]
  const statusOf = (e: Entry) =>
    e.gced ? 'garbage-collected' : e.fetching ? (e.data === null ? 'fetching' : 'refetching') : e.observers === 0 ? 'inactive' : isStale(e, now) ? 'stale' : 'fresh'
  const color: Record<string, string> = {
    fetching: 'var(--accent)',
    refetching: 'var(--accent)',
    fresh: 'var(--ok)',
    stale: 'var(--warn)',
    inactive: 'var(--violet)',
    'garbage-collected': 'var(--text-3)',
  }

  const anyStaleActive = entries.some(e => statusOf(e) === 'stale')
  const anyInactive = entries.some(e => statusOf(e) === 'inactive')
  const listAndCount = mounted.list && mounted.count
  const note = anyInactive
    ? `An entry with **no observers** is *inactive*: its data stays in memory for **gcTime** (${gcTime}s) so a remount is instant. Mount it again before the GC countdown hits zero and you get cached data without a spinner.`
    : anyStaleActive
      ? `Some active data is **stale** (older than staleTime = ${staleTime}s). Stale data is still shown, but the next trigger (mount, window focus, invalidation) refetches it in the background. Try **Simulate window focus**.`
      : listAndCount
        ? `Two components share \`['products']\` but the server only got **one** request per fetch: the cache dedupes by key. **Rename product** invalidates every key starting with \`['products']\`, including \`['products', 2]\`.`
        : `Mount components to subscribe them to query keys. Try **Mount both** to see two subscribers share one request, then watch entries turn stale after ${staleTime}s.`

  return (
    <div>
      <div className="viz-controls">
        <label className="row" style={{ gap: 6, fontSize: '0.85rem' }}>
          staleTime <input type="range" min={0} max={15} value={staleTime} onChange={e => setStaleTime(Number(e.target.value))} aria-label="staleTime in seconds" style={{ width: 90 }} />
          <code>{staleTime}s</code>
        </label>
        <label className="row" style={{ gap: 6, fontSize: '0.85rem' }}>
          gcTime <input type="range" min={0} max={15} value={gcTime} onChange={e => setGcTime(Number(e.target.value))} aria-label="gcTime in seconds" style={{ width: 90 }} />
          <code>{gcTime}s</code>
        </label>
        <button className="btn sm ghost" onClick={reset}>Reset</button>
      </div>
      <div className="viz-stage">
        <div className="viz-controls" style={{ marginBottom: 10 }}>
          <button className="btn sm" onClick={() => setMount(['list', 'count'], true)}>Mount both ['products'] users</button>
          <button className="btn sm" onClick={focus}>Simulate window focus</button>
          <button className="btn sm primary" onClick={rename}>Rename product (mutation)</button>
          <span className="stat subtle" style={{ fontSize: '0.85rem' }}>
            server requests: <strong>{server.current.requests}</strong>
          </span>
        </div>
        <div className="grid cols-2" style={{ gap: 8 }}>
          {COMPS.map(c => {
            const e = cache.current.get(hashKey(c.key))
            const on = !!mounted[c.id]
            const st = e ? statusOf(e) : ''
            return (
              <div key={c.id} className="lane" style={{ opacity: on ? 1 : 0.6, minWidth: 0 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <code style={{ fontSize: '0.8rem', overflowWrap: 'anywhere' }}>{c.name}</code>
                  <button className="btn sm" onClick={() => setMount([c.id], !on)} aria-pressed={on}>
                    {on ? 'Unmount' : 'Mount'}
                  </button>
                </div>
                <div className="subtle" style={{ fontSize: '0.75rem', fontFamily: 'var(--mono)' }}>useQuery({hashKey(c.key)})</div>
                <div style={{ minHeight: 24, marginTop: 4, fontSize: '0.85rem' }}>
                  {!on ? (
                    <span className="subtle">not mounted</span>
                  ) : e?.data ? (
                    <>
                      {e.data} {e.fetching && <span className="pill accent">updating…</span>}
                    </>
                  ) : (
                    <span className="pill accent">loading…</span>
                  )}
                  {on && st === 'stale' && <span className="pill warn" style={{ marginLeft: 4 }}>stale</span>}
                </div>
              </div>
            )
          })}
        </div>

        <h4 style={{ margin: '14px 0 6px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-3)' }}>Query cache</h4>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ fontSize: '0.78rem', width: '100%' }}>
            <thead>
              <tr>
                <th>key</th>
                <th>status</th>
                <th>observers</th>
                <th>age</th>
                <th>stale in</th>
                <th>GC in</th>
                <th>fetches</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td colSpan={7} className="subtle">Empty. Mount a component.</td>
                </tr>
              )}
              {entries.map(e => {
                const st = statusOf(e)
                const age = e.data !== null ? now - e.updatedAt : null
                const staleIn = e.data !== null && !e.invalidated ? e.updatedAt + staleTime * 1000 - now : null
                const gcIn = e.inactiveSince !== null && !e.gced && e.observers === 0 ? e.inactiveSince + gcTime * 1000 - now : null
                return (
                  <tr key={e.hash} style={{ opacity: e.gced ? 0.5 : 1 }}>
                    <td style={{ fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>{e.hash}</td>
                    <td style={{ color: color[st], fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {st}
                      {e.invalidated && !e.gced ? ' (invalidated)' : ''}
                    </td>
                    <td>{e.gced ? '–' : e.observers}</td>
                    <td>{age === null ? '–' : secs(age)}</td>
                    <td>{staleIn === null ? '–' : staleIn <= 0 ? 'stale' : secs(staleIn)}</td>
                    <td>{gcIn === null ? '–' : secs(gcIn)}</td>
                    <td>{e.fetches}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="viz-legend" style={{ marginTop: 8 }}>
          {Object.entries(color)
            .filter(([k]) => k !== 'refetching')
            .map(([k, c]) => (
              <span key={k} style={{ ['--c' as string]: c }}>{k}</span>
            ))}
        </div>
        <div className="log" aria-live="polite" style={{ marginTop: 10 }}>
          {log.length === 0 ? <div className="subtle">Cache events appear here.</div> : log.map((l, i) => <div key={log.length - i}>{l}</div>)}
        </div>
      </div>
      <Note>{note}</Note>
    </div>
  )
}
