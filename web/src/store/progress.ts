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

export function setProgress(update: (p: Progress) => Progress) {
  state = update(state)
  persist()
  listeners.forEach(l => l())
}

export function replaceProgress(p: Progress) {
  setProgress(() => p)
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
