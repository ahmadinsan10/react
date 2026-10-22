import { LEVELS } from '../data/levels'
import { QUESTIONS } from '../data/quizzes'
import type { Level } from '../data/types'

export type CardState = { box: number; due: number; correct: number; wrong: number; last: number }

export type Progress = {
  version: 1
  topics: Record<string, true>
  tasks: Record<string, true>
  checkpoints: Record<string, true>
  checklist: Record<string, true>
  vizSeen: Record<string, true>
  cards: Record<string, CardState>
  notes: Record<string, string>
  activity: Record<string, number>
  startedAt: number
  /** Last local modification (ms). Used by sync to show freshness. */
  updatedAt?: number
}

export const emptyProgress = (now = Date.now()): Progress => ({
  version: 1,
  topics: {},
  tasks: {},
  checkpoints: {},
  checklist: {},
  vizSeen: {},
  cards: {},
  notes: {},
  activity: {},
  startedAt: now,
})

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Validate untrusted data (localStorage, imported files). Unknown keys are dropped, bad sections reset. */
export function parseProgress(raw: unknown): Progress | null {
  if (!isRecord(raw) || raw.version !== 1) return null
  const base = emptyProgress(typeof raw.startedAt === 'number' ? raw.startedAt : Date.now())
  const flags = (v: unknown) => (isRecord(v) ? Object.fromEntries(Object.keys(v).filter(k => v[k] === true).map(k => [k, true as const])) : {})
  const cards: Record<string, CardState> = {}
  if (isRecord(raw.cards)) {
    for (const [k, c] of Object.entries(raw.cards)) {
      if (isRecord(c) && ['box', 'due', 'correct', 'wrong', 'last'].every(f => typeof c[f] === 'number')) {
        cards[k] = c as CardState
      }
    }
  }
  const strings = (v: unknown) => (isRecord(v) ? Object.fromEntries(Object.entries(v).filter(([, s]) => typeof s === 'string')) as Record<string, string> : {})
  const numbers = (v: unknown) => (isRecord(v) ? Object.fromEntries(Object.entries(v).filter(([, n]) => typeof n === 'number')) as Record<string, number> : {})
  return {
    ...base,
    topics: flags(raw.topics),
    tasks: flags(raw.tasks),
    checkpoints: flags(raw.checkpoints),
    checklist: flags(raw.checklist),
    vizSeen: flags(raw.vizSeen),
    cards,
    notes: strings(raw.notes),
    activity: numbers(raw.activity),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : undefined,
  }
}

export const dayKey = (d: Date | number) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

const bump = (p: Progress, now: number): Progress => {
  const k = dayKey(now)
  return { ...p, activity: { ...p.activity, [k]: (p.activity[k] ?? 0) + 1 } }
}

export function toggleFlag(
  p: Progress,
  section: 'topics' | 'tasks' | 'checkpoints' | 'checklist' | 'vizSeen',
  key: string,
  now = Date.now(),
): Progress {
  const next = { ...p[section] }
  if (next[key]) {
    delete next[key]
    return { ...p, [section]: next }
  }
  next[key] = true
  return bump({ ...p, [section]: next }, now)
}

/** Leitner intervals in days for boxes 1..5. */
export const BOX_INTERVAL_DAYS = [0, 1, 3, 7, 16, 35] as const
const DAY = 86_400_000

export function recordAnswer(p: Progress, qid: string, correct: boolean, now = Date.now()): Progress {
  const prev = p.cards[qid] ?? { box: 0, due: now, correct: 0, wrong: 0, last: 0 }
  const box = correct ? Math.min(prev.box + 1, 5) : 1
  const card: CardState = {
    box,
    due: correct ? now + (BOX_INTERVAL_DAYS[box] ?? 35) * DAY : now,
    correct: prev.correct + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
    last: now,
  }
  return bump({ ...p, cards: { ...p.cards, [qid]: card } }, now)
}

export const isMastered = (c: CardState | undefined) => !!c && c.box >= 2

export const dueCards = (p: Progress, now = Date.now()) =>
  QUESTIONS.filter(q => {
    const c = p.cards[q.id]
    return c !== undefined && c.due <= now
  })

export const topicKey = (level: number, topicId: string) => `${level}:${topicId}`

export type LevelStats = {
  topicsDone: number
  topicsTotal: number
  tasksDone: number
  tasksTotal: number
  quizMastered: number
  quizTotal: number
  checkpoint: boolean
  ratio: number
}

export function levelStats(p: Progress, level: Level): LevelStats {
  const core = level.topics.filter(t => !t.stretch)
  const topicsDone = core.filter(t => p.topics[topicKey(level.id, t.id)]).length
  const tasks = level.projects.flatMap(pr => pr.tasks)
  const tasksDone = tasks.filter(t => p.tasks[t.id]).length
  const qs = QUESTIONS.filter(q => q.level === level.id)
  const quizMastered = qs.filter(q => isMastered(p.cards[q.id])).length
  const checkpoint = !!p.checkpoints[String(level.id)]
  // Weighted: lessons 35%, project 35%, quiz 20%, checkpoint 10%.
  const part = (done: number, total: number) => (total === 0 ? 1 : done / total)
  const ratio =
    0.35 * part(topicsDone, core.length) +
    0.35 * part(tasksDone, tasks.length) +
    0.2 * part(quizMastered, qs.length) +
    0.1 * (checkpoint ? 1 : 0)
  return {
    topicsDone,
    topicsTotal: core.length,
    tasksDone,
    tasksTotal: tasks.length,
    quizMastered,
    quizTotal: qs.length,
    checkpoint,
    ratio,
  }
}

/** Weighted sums of floats land at 0.9999…; treat that as done. */
export const isComplete = (ratio: number) => ratio > 0.9995

export function overallStats(p: Progress) {
  const per = LEVELS.map(l => levelStats(p, l))
  const weeks = LEVELS.map(l => l.weeks)
  const totalWeeks = weeks.reduce((a, b) => a + b, 0)
  // Weight each level by its estimated duration.
  const ratio = per.reduce((sum, s, i) => sum + s.ratio * (weeks[i] ?? 0), 0) / totalWeeks
  const currentLevel = LEVELS.find((_, i) => !isComplete(per[i]?.ratio ?? 0)) ?? LEVELS[LEVELS.length - 1]!
  return { per, ratio, currentLevel, totalWeeks }
}

export function streak(activity: Record<string, number>, now = Date.now()) {
  let count = 0
  const d = new Date(now)
  // Today not yet active doesn't break the streak.
  if (!activity[dayKey(d)]) d.setDate(d.getDate() - 1)
  while (activity[dayKey(d)]) {
    count++
    d.setDate(d.getDate() - 1)
  }
  return count
}
