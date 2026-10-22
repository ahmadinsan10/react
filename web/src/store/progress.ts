import { useSyncExternalStore } from 'react'
import { emptyProgress, parseProgress, type Progress } from './logic'

const KEY = 'rm-progress-v1'
const listeners = new Set<() => void>()

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return parseProgress(JSON.parse(raw)) ?? emptyProgress()
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  return emptyProgress()
}

let state: Progress = load()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* private mode / quota: keep working in memory */
  }
}

const changeHooks = new Set<() => void>()
/** Lets the sync engine react to local edits without the store depending on it. */
export const onLocalChange = (fn: () => void) => {
  changeHooks.add(fn)
  return () => changeHooks.delete(fn)
}

export function setProgress(update: (p: Progress) => Progress) {
  const next = update(state)
  if (next === state) return
  state = { ...next, updatedAt: Date.now() }
  persist()
  listeners.forEach(l => l())
  changeHooks.forEach(h => h())
}

export function replaceProgress(p: Progress) {
  setProgress(() => p)
}

/** Apply data that came from sync: no change hooks (avoids sync echo loops). */
export function applyRemoteProgress(p: Progress) {
  state = p
  persist()
  listeners.forEach(l => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Keep multiple open tabs in sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key !== KEY) return
    state = load()
    listeners.forEach(l => l())
  })
}

export function useProgress<T = Progress>(selector: (p: Progress) => T = p => p as T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state))
}

export const getProgress = () => state
