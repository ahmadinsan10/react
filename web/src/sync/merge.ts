import { emptyProgress, type CardState, type Progress } from '../store/logic'

type FlagSection = 'topics' | 'tasks' | 'checkpoints' | 'checklist' | 'vizSeen'
const FLAG_SECTIONS: FlagSection[] = ['topics', 'tasks', 'checkpoints', 'checklist', 'vizSeen']

const keys = (...objs: Record<string, unknown>[]) => new Set(objs.flatMap(o => Object.keys(o)))

/** Per key: if this device changed it since the last sync, keep ours; otherwise take theirs. */
function pick<T>(base: Record<string, T>, local: Record<string, T>, remote: Record<string, T>, same: (a: T | undefined, b: T | undefined) => boolean) {
  const out: Record<string, T> = {}
  for (const k of keys(base, local, remote)) {
    const v = same(local[k], base[k]) ? remote[k] : local[k]
    if (v !== undefined) out[k] = v
  }
  return out
}

const sameCard = (a: CardState | undefined, b: CardState | undefined) =>
  a === b || (!!a && !!b && a.last === b.last && a.box === b.box && a.correct === b.correct && a.wrong === b.wrong)

/**
 * Three-way merge of progress from two devices.
 * `base` is the snapshot both sides last agreed on (empty for a device's first sync).
 * - checkmarks, notes: the side that changed a key since base wins (so un-checking syncs too)
 * - quiz cards: if both answered the same card, the most recent answer wins
 * - activity: increments from both sides are added together
 */
export function merge3(base: Progress | null, local: Progress, remote: Progress): Progress {
  const b = base ?? emptyProgress(Math.min(local.startedAt, remote.startedAt))
  const out: Progress = { ...emptyProgress(Math.min(local.startedAt, remote.startedAt)) }

  for (const s of FLAG_SECTIONS) out[s] = pick(b[s], local[s], remote[s], (x, y) => x === y)
  out.notes = pick(b.notes, local.notes, remote.notes, (x, y) => x === y)

  const cards: Record<string, CardState> = {}
  for (const k of keys(b.cards, local.cards, remote.cards)) {
    const l = local.cards[k]
    const r = remote.cards[k]
    const localChanged = !sameCard(l, b.cards[k])
    const remoteChanged = !sameCard(r, b.cards[k])
    const v = localChanged && remoteChanged ? ((l?.last ?? 0) >= (r?.last ?? 0) ? l : r) : localChanged ? l : r
    if (v) cards[k] = v
  }
  out.cards = cards

  const activity: Record<string, number> = {}
  for (const d of keys(b.activity, local.activity, remote.activity)) {
    const base0 = b.activity[d] ?? 0
    const n = base0 + Math.max(0, (local.activity[d] ?? 0) - base0) + Math.max(0, (remote.activity[d] ?? 0) - base0)
    if (n > 0) activity[d] = n
  }
  out.activity = activity
  out.updatedAt = Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0)
  return out
}

/** Stable comparison that ignores key order, for "did anything change?" checks. */
export function sameProgress(a: Progress, b: Progress) {
  const norm = (p: Progress) => JSON.stringify(p, (_, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => x.localeCompare(y))) : v))
  const { updatedAt: _a, ...ra } = a
  const { updatedAt: _b, ...rb } = b
  return norm(ra as Progress) === norm(rb as Progress)
}
