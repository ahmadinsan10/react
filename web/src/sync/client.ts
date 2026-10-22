import { useSyncExternalStore } from 'react'
import { parseProgress, type Progress } from '../store/logic'
import { applyRemoteProgress, getProgress, onLocalChange } from '../store/progress'
import { merge3, sameProgress } from './merge'

export type SyncStatus = 'off' | 'syncing' | 'synced' | 'error' | 'offline'
export type SyncState = { key: string | null; status: SyncStatus; lastSyncedAt: number | null; error: string | null }

const META_KEY = 'rm-sync-v1'
type Meta = { key: string; rev: number; base: Progress | null; lastSyncedAt: number | null }

// ---------- Sync key ----------

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** 24 base32 characters = 120 random bits, grouped for readability: ABCD-EFGH-… */
export function generateSyncKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  const chars = [...bytes].map(b => ALPHABET[b & 31]).join('')
  return chars.match(/.{4}/g)!.join('-')
}

export const normalizeKey = (k: string) =>
  k
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, '')
    .slice(0, 24)
    .replace(/(.{4})(?=.)/g, '$1-')

export const isValidKey = (k: string) => /^[A-Z2-7]{4}(-[A-Z2-7]{4}){5}$/.test(k)

// ---------- Persistence of sync metadata ----------

function loadMeta(): Meta | null {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return null
    const m = JSON.parse(raw) as Partial<Meta>
    if (typeof m.key !== 'string' || !isValidKey(m.key)) return null
    return { key: m.key, rev: typeof m.rev === 'number' ? m.rev : 0, base: m.base ? parseProgress(m.base) : null, lastSyncedAt: m.lastSyncedAt ?? null }
  } catch {
    return null
  }
}

function saveMeta(m: Meta | null) {
  try {
    if (m) localStorage.setItem(META_KEY, JSON.stringify(m))
    else localStorage.removeItem(META_KEY)
  } catch {
    /* ignore */
  }
}

// ---------- Observable state ----------

let meta = loadMeta()
let state: SyncState = { key: meta?.key ?? null, status: meta ? 'synced' : 'off', lastSyncedAt: meta?.lastSyncedAt ?? null, error: null }
const listeners = new Set<() => void>()
const set = (patch: Partial<SyncState>) => {
  state = { ...state, ...patch }
  listeners.forEach(l => l())
}

export const useSyncState = () =>
  useSyncExternalStore(
    cb => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )

// ---------- Transport ----------

class HttpError extends Error {
  constructor(
    public status: number,
    public body: { error?: string; rev?: number; data?: unknown },
  ) {
    super(body.error ?? `HTTP ${status}`)
  }
}

async function api(method: 'GET' | 'PUT', key: string, body?: unknown) {
  const res = await fetch('/api/progress', {
    method,
    headers: { 'x-sync-key': key, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json: Record<string, unknown> = {}
  try {
    json = (await res.json()) as Record<string, unknown>
  } catch {
    /* non-JSON (e.g. static host without the API) */
  }
  if (!res.ok) throw new HttpError(res.status, json)
  return json
}

// ---------- Sync cycle ----------

let running: Promise<void> | null = null
let again = false

/** Pull → three-way merge → push with compare-and-set; retries on conflict. Coalesces concurrent calls. */
export function syncNow(): Promise<void> {
  if (!meta) return Promise.resolve()
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    do {
      again = false
      await cycle()
    } while (again && meta)
  })().finally(() => {
    running = null
  })
  return running
}

async function cycle() {
  if (!meta) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    set({ status: 'offline' })
    return
  }
  set({ status: 'syncing', error: null })
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      // 1. Pull
      let remote: Progress | null = null
      let remoteRev = 0
      try {
        const r = await api('GET', meta.key)
        remote = parseProgress(r.data)
        remoteRev = typeof r.rev === 'number' ? r.rev : 0
      } catch (e) {
        if (!(e instanceof HttpError && e.status === 404)) throw e
      }

      // 2. Merge
      const local = getProgress()
      const merged: Progress = remote ? merge3(meta.base, local, remote) : local
      if (!sameProgress(merged, local)) applyRemoteProgress({ ...merged, updatedAt: Date.now() })

      // 3. Push only if the server is missing something.
      if (remote && sameProgress(merged, remote)) {
        meta = { ...meta, rev: remoteRev, base: merged, lastSyncedAt: Date.now() }
        break
      }
      try {
        const r = await api('PUT', meta.key, { baseRev: remoteRev, data: merged })
        meta = { ...meta, rev: Number(r.rev), base: merged, lastSyncedAt: Date.now() }
        break
      } catch (e) {
        if (e instanceof HttpError && e.status === 409 && attempt < 3) continue // someone wrote in between: merge again
        throw e
      }
    }
    saveMeta(meta)
    set({ status: 'synced', lastSyncedAt: meta.lastSyncedAt, error: null })
  } catch (e) {
    const msg =
      e instanceof HttpError
        ? e.status === 503
          ? 'Sync is not configured on the server yet (add Upstash Redis in Vercel).'
          : e.message
        : e instanceof TypeError
          ? 'Could not reach the sync server.'
          : String(e)
    set({ status: 'error', error: msg })
  }
}

// ---------- Public controls ----------

/** Start syncing with a key. Existing local progress is merged with whatever is stored under the key. */
export async function connect(key: string) {
  const k = normalizeKey(key)
  if (!isValidKey(k)) throw new Error('That does not look like a sync key (6 groups of 4 characters).')
  meta = { key: k, rev: 0, base: null, lastSyncedAt: null }
  saveMeta(meta)
  set({ key: k, status: 'syncing', error: null })
  await syncNow()
}

export function disconnect() {
  meta = null
  saveMeta(null)
  set({ key: null, status: 'off', lastSyncedAt: null, error: null })
}

// ---------- Automatic triggers ----------

let debounce: ReturnType<typeof setTimeout> | undefined
let started = false

export function startAutoSync() {
  if (started || typeof window === 'undefined') return
  started = true
  onLocalChange(() => {
    if (!meta) return
    clearTimeout(debounce)
    debounce = setTimeout(() => void syncNow(), 1500)
  })
  const kick = () => {
    if (meta && document.visibilityState === 'visible') void syncNow()
  }
  window.addEventListener('focus', kick)
  window.addEventListener('online', kick)
  document.addEventListener('visibilitychange', kick)
  // Flush pending changes when the tab is hidden (e.g. switching apps on a phone).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && debounce) {
      clearTimeout(debounce)
      debounce = undefined
      void syncNow()
    }
  })
  setInterval(kick, 60_000)
  kick()
}
