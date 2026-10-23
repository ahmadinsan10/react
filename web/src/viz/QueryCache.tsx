import { useEffect, useRef, useState } from 'react'
import { Note } from './common'
import { getLang, useLang } from '../i18n/lang'

const T = {
  en: {
    dedupe: (h: string) => `dedupe: ${h} already in flight, no new request`,
    resolved: (h: string) => `✓ ${h} resolved`,
    gced: (h: string) => `🗑 ${h} garbage-collected`,
    noData: (n: string) => `${n} mounted, no data`,
    staleBg: (n: string) => `${n} mounted, data stale → background refetch`,
    fresh: (n: string) => `${n} mounted, served fresh from cache`,
    inactive: (h: string, s: number) => `${h} has no observers → inactive, GC in ${s}s`,
    focusStale: 'window focus, stale',
    focusNone: 'window focus: nothing stale & active, no requests',
    mutation: (v: number) => `mutation: renamed product → v${v}; invalidateQueries(['products'])`,
    invActive: 'invalidated, active',
    nInactive: (g: number) => `An entry with **no observers** is *inactive*: its data stays in memory for **gcTime** (${g}s) so a remount is instant. Mount it again before the GC countdown hits zero and you get cached data without a spinner.`,
    nStale: (s: number) => `Some active data is **stale** (older than staleTime = ${s}s). Stale data is still shown, but the next trigger (mount, window focus, invalidation) refetches it in the background. Try **Simulate window focus**.`,
    nShare: "Two components share `['products']` but the server only got **one** request per fetch: the cache dedupes by key. **Rename product** invalidates every key starting with `['products']`, including `['products', 2]`.",
    nStart: (s: number) => `Mount components to subscribe them to query keys. Try **Mount both** to see two subscribers share one request, then watch entries turn stale after ${s}s.`,
    staleAria: 'staleTime in seconds', gcAria: 'gcTime in seconds', reset: 'Reset', mountBoth: "Mount both ['products'] users", simFocus: 'Simulate window focus',
    rename: 'Rename product (mutation)', requests: 'server requests:', unmount: 'Unmount', mount: 'Mount', notMounted: 'not mounted', updating: 'updating…', loading: 'loading…',
    cache: 'Query cache', key: 'key', status: 'status', observers: 'observers', age: 'age', staleIn: 'stale in', gcIn: 'GC in', fetches: 'fetches',
    empty: 'Empty. Mount a component.', invalidated: ' (invalidated)', events: 'Cache events appear here.',
  },
  id: {
    dedupe: (h: string) => `dedupe: ${h} masih dalam proses, tidak ada request baru`,
    resolved: (h: string) => `✓ ${h} selesai`,
    gced: (h: string) => `🗑 ${h} dibersihkan garbage collector`,
    noData: (n: string) => `${n} di-mount, belum ada data`,
    staleBg: (n: string) => `${n} di-mount, data stale → refetch di background`,
    fresh: (n: string) => `${n} di-mount, dilayani data fresh dari cache`,
    inactive: (h: string, s: number) => `${h} tidak punya observer → inactive, GC dalam ${s} dtk`,
    focusStale: 'window focus, stale',
    focusNone: 'window focus: tidak ada yang stale & aktif, tidak ada request',
    mutation: (v: number) => `mutation: nama produk diganti → v${v}; invalidateQueries(['products'])`,
    invActive: 'di-invalidate, aktif',
    nInactive: (g: number) => `Entry yang **tidak punya observer** berstatus *inactive*: datanya tetap disimpan di memori selama **gcTime** (${g} dtk) supaya remount terasa instan. Mount lagi sebelum hitung mundur GC habis, dan kamu langsung dapat data dari cache tanpa spinner.`,
    nStale: (s: number) => `Sebagian data aktif sudah **stale** (lebih tua dari staleTime = ${s} dtk). Data stale tetap ditampilkan, tapi pemicu berikutnya (mount, window focus, invalidation) akan me-refetch-nya di background. Coba **Simulasikan window focus**.`,
    nShare: "Dua component berbagi `['products']`, tapi server hanya menerima **satu** request per fetch: cache melakukan dedupe berdasarkan key. **Ganti nama produk** meng-invalidate semua key yang diawali `['products']`, termasuk `['products', 2]`.",
    nStart: (s: number) => `Mount component untuk men-subscribe-kannya ke query key. Coba **Mount keduanya** untuk melihat dua subscriber berbagi satu request, lalu perhatikan entry berubah jadi stale setelah ${s} dtk.`,
    staleAria: 'staleTime dalam detik', gcAria: 'gcTime dalam detik', reset: 'Reset', mountBoth: "Mount keduanya (pengguna ['products'])", simFocus: 'Simulasikan window focus',
    rename: 'Ganti nama produk (mutation)', requests: 'request ke server:', unmount: 'Unmount', mount: 'Mount', notMounted: 'belum di-mount', updating: 'memperbarui…', loading: 'memuat…',
    cache: 'Query cache', key: 'key', status: 'status', observers: 'observer', age: 'umur', staleIn: 'stale dalam', gcIn: 'GC dalam', fetches: 'fetch',
    empty: 'Kosong. Mount sebuah component.', invalidated: ' (di-invalidate)', events: 'Event cache akan muncul di sini.',
  },
} as const

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
  const t = T[useLang()]
  const L = () => T[getLang()]
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
    const ts = new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })
    setLog(l => [`${ts}  ${msg}`, ...l].slice(0, 12))
  }

  const isStale = (e: Entry, at: number) => e.invalidated || e.data === null || at - e.updatedAt >= cfg.current.staleTime * 1000

  const fetchEntry = (e: Entry, reason: string) => {
    if (e.fetching) {
      addLog(L().dedupe(e.hash))
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
      const at = Date.now()
      for (const e of cache.current.values()) {
        if (e.fetching && at >= e.fetchEndsAt) {
          const s = server.current
          e.fetching = false
          e.invalidated = false
          e.updatedAt = at
          e.data = e.key[0] === 'user' ? 'Ada (admin)' : e.key.length > 1 ? `#${e.key[1]} ${s.productName} v${s.version}` : `3 items: ${s.productName} v${s.version}, Desk, Chair`
          setLog(l => [`${new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}  ${L().resolved(e.hash)}`, ...l].slice(0, 12))
        }
        if (!e.gced && e.observers === 0 && e.inactiveSince !== null && !e.fetching && at - e.inactiveSince >= cfg.current.gcTime * 1000) {
          e.gced = true
          e.data = null
          setLog(l => [`${new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}  ${L().gced(e.hash)}`, ...l].slice(0, 12))
        }
      }
      setNow(at)
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
    if (e.data === null) fetchEntry(e, L().noData(c.name))
    else if (isStale(e, Date.now())) fetchEntry(e, L().staleBg(c.name))
    else addLog(L().fresh(c.name))
  }

  const unmount = (c: Comp) => {
    const e = cache.current.get(hashKey(c.key))
    if (!e) return
    e.observers = Math.max(0, e.observers - 1)
    if (e.observers === 0) {
      e.inactiveSince = Date.now()
      addLog(L().inactive(e.hash, cfg.current.gcTime))
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
    const at = Date.now()
    let n = 0
    for (const e of cache.current.values()) {
      if (!e.gced && e.observers > 0 && isStale(e, at)) {
        fetchEntry(e, L().focusStale)
        n++
      }
    }
    if (!n) addLog(L().focusNone)
    setNow(at)
  }

  const rename = () => {
    const s = server.current
    s.version++
    addLog(L().mutation(s.version))
    for (const e of cache.current.values()) {
      if (e.gced || !startsWith(e.key, ['products'])) continue
      e.invalidated = true
      if (e.observers > 0) fetchEntry(e, L().invActive)
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
    ? t.nInactive(gcTime)
    : anyStaleActive
      ? t.nStale(staleTime)
      : listAndCount
        ? t.nShare
        : t.nStart(staleTime)

  return (
    <div>
      <div className="viz-controls">
        <label className="row" style={{ gap: 6, fontSize: '0.85rem' }}>
          staleTime <input type="range" min={0} max={15} value={staleTime} onChange={e => setStaleTime(Number(e.target.value))} aria-label={t.staleAria} style={{ width: 90 }} />
          <code>{staleTime}s</code>
        </label>
        <label className="row" style={{ gap: 6, fontSize: '0.85rem' }}>
          gcTime <input type="range" min={0} max={15} value={gcTime} onChange={e => setGcTime(Number(e.target.value))} aria-label={t.gcAria} style={{ width: 90 }} />
          <code>{gcTime}s</code>
        </label>
        <button className="btn sm ghost" onClick={reset}>{t.reset}</button>
      </div>
      <div className="viz-stage">
        <div className="viz-controls" style={{ marginBottom: 10 }}>
          <button className="btn sm" onClick={() => setMount(['list', 'count'], true)}>{t.mountBoth}</button>
          <button className="btn sm" onClick={focus}>{t.simFocus}</button>
          <button className="btn sm primary" onClick={rename}>{t.rename}</button>
          <span className="stat subtle" style={{ fontSize: '0.85rem' }}>
            {t.requests} <strong>{server.current.requests}</strong>
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
                    {on ? t.unmount : t.mount}
                  </button>
                </div>
                <div className="subtle" style={{ fontSize: '0.75rem', fontFamily: 'var(--mono)' }}>useQuery({hashKey(c.key)})</div>
                <div style={{ minHeight: 24, marginTop: 4, fontSize: '0.85rem' }}>
                  {!on ? (
                    <span className="subtle">{t.notMounted}</span>
                  ) : e?.data ? (
                    <>
                      {e.data} {e.fetching && <span className="pill accent">{t.updating}</span>}
                    </>
                  ) : (
                    <span className="pill accent">{t.loading}</span>
                  )}
                  {on && st === 'stale' && <span className="pill warn" style={{ marginLeft: 4 }}>stale</span>}
                </div>
              </div>
            )
          })}
        </div>

        <h4 style={{ margin: '14px 0 6px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-3)' }}>{t.cache}</h4>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ fontSize: '0.78rem', width: '100%' }}>
            <thead>
              <tr>
                <th>{t.key}</th>
                <th>{t.status}</th>
                <th>{t.observers}</th>
                <th>{t.age}</th>
                <th>{t.staleIn}</th>
                <th>{t.gcIn}</th>
                <th>{t.fetches}</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td colSpan={7} className="subtle">{t.empty}</td>
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
                      {e.invalidated && !e.gced ? t.invalidated : ''}
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
          {log.length === 0 ? <div className="subtle">{t.events}</div> : log.map((l, i) => <div key={log.length - i}>{l}</div>)}
        </div>
      </div>
      <Note>{note}</Note>
    </div>
  )
}
