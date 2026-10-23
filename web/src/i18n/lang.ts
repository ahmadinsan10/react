import { useSyncExternalStore } from 'react'

export type Lang = 'en' | 'id'
export const LANGS: { value: Lang; label: string; short: string }[] = [
  { value: 'en', label: 'English', short: 'EN' },
  { value: 'id', label: 'Bahasa Indonesia', short: 'ID' },
]

const KEY = 'rm-lang'
const listeners = new Set<() => void>()

function initial(): Lang {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'en' || v === 'id') return v
  } catch {
    /* ignore */
  }
  // First visit: follow the browser language.
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('id') ? 'id' : 'en'
}

let lang: Lang = initial()
if (typeof document !== 'undefined') document.documentElement.lang = lang

export function setLang(next: Lang) {
  if (next === lang) return
  lang = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    /* ignore */
  }
  document.documentElement.lang = next
  listeners.forEach(l => l())
}

export const getLang = () => lang

export const useLang = () =>
  useSyncExternalStore(
    cb => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => lang,
    () => lang,
  )
