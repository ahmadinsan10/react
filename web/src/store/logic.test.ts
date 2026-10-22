import { describe, expect, it } from 'vitest'
import { LEVELS } from '../data/levels'
import { QUESTIONS } from '../data/quizzes'
import {
  dayKey,
  dueCards,
  emptyProgress,
  levelStats,
  overallStats,
  parseProgress,
  recordAnswer,
  streak,
  toggleFlag,
  topicKey,
} from './logic'

const NOW = new Date(2026, 9, 22, 12).getTime()
const DAY = 86_400_000

describe('content integrity', () => {
  it('has unique question ids and valid answers', () => {
    const ids = new Set(QUESTIONS.map(q => q.id))
    expect(ids.size).toBe(QUESTIONS.length)
    for (const q of QUESTIONS) expect(q.options[q.answer]).toBeDefined()
  })

  it('has unique task ids across all projects', () => {
    const ids = LEVELS.flatMap(l => l.projects.flatMap(p => p.tasks.map(t => t.id)))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has every level covered by a quiz', () => {
    for (const l of LEVELS) expect(QUESTIONS.some(q => q.level === l.id)).toBe(true)
  })
})

describe('toggleFlag', () => {
  it('toggles on and off and records activity only when turning on', () => {
    let p = toggleFlag(emptyProgress(NOW), 'topics', '1:jsx', NOW)
    expect(p.topics['1:jsx']).toBe(true)
    expect(p.activity[dayKey(NOW)]).toBe(1)
    p = toggleFlag(p, 'topics', '1:jsx', NOW)
    expect(p.topics['1:jsx']).toBeUndefined()
    expect(p.activity[dayKey(NOW)]).toBe(1)
  })

  it('never mutates the input', () => {
    const p = emptyProgress(NOW)
    toggleFlag(p, 'tasks', 'x', NOW)
    expect(p.tasks).toEqual({})
  })
})

describe('recordAnswer (Leitner)', () => {
  it('promotes on correct answers and schedules later', () => {
    let p = recordAnswer(emptyProgress(NOW), 'L0-Q1', true, NOW)
    expect(p.cards['L0-Q1']).toMatchObject({ box: 1, correct: 1, due: NOW + DAY })
    p = recordAnswer(p, 'L0-Q1', true, NOW)
    expect(p.cards['L0-Q1']).toMatchObject({ box: 2, due: NOW + 3 * DAY })
  })

  it('demotes to box 1 and makes the card due now on a wrong answer', () => {
    let p = recordAnswer(emptyProgress(NOW), 'L0-Q1', true, NOW)
    p = recordAnswer(p, 'L0-Q1', true, NOW)
    p = recordAnswer(p, 'L0-Q1', false, NOW)
    expect(p.cards['L0-Q1']).toMatchObject({ box: 1, wrong: 1, due: NOW })
    expect(dueCards(p, NOW).map(q => q.id)).toEqual(['L0-Q1'])
  })

  it('caps the box at 5', () => {
    let p = emptyProgress(NOW)
    for (let i = 0; i < 10; i++) p = recordAnswer(p, 'L0-Q1', true, NOW)
    expect(p.cards['L0-Q1']?.box).toBe(5)
  })
})

describe('levelStats', () => {
  const level = LEVELS[0]!

  it('is 0 for a fresh start', () => {
    expect(levelStats(emptyProgress(), level).ratio).toBe(0)
  })

  it('reaches 1 when everything is done and ignores stretch topics', () => {
    let p = emptyProgress(NOW)
    for (const t of level.topics) if (!t.stretch) p = toggleFlag(p, 'topics', topicKey(level.id, t.id), NOW)
    for (const t of level.projects.flatMap(pr => pr.tasks)) p = toggleFlag(p, 'tasks', t.id, NOW)
    for (const q of QUESTIONS.filter(q => q.level === 0)) {
      p = recordAnswer(p, q.id, true, NOW)
      p = recordAnswer(p, q.id, true, NOW)
    }
    p = toggleFlag(p, 'checkpoints', '0', NOW)
    expect(levelStats(p, level).ratio).toBeCloseTo(1)
    expect(overallStats(p).currentLevel.id).toBe(1)
  })
})

describe('streak', () => {
  it('counts consecutive days and tolerates today being empty', () => {
    const a = { [dayKey(NOW - DAY)]: 1, [dayKey(NOW - 2 * DAY)]: 3, [dayKey(NOW - 4 * DAY)]: 1 }
    expect(streak(a, NOW)).toBe(2)
    expect(streak({ ...a, [dayKey(NOW)]: 1 }, NOW)).toBe(3)
    expect(streak({}, NOW)).toBe(0)
  })
})

describe('parseProgress', () => {
  it('rejects garbage and wrong versions', () => {
    expect(parseProgress(null)).toBeNull()
    expect(parseProgress({ version: 2 })).toBeNull()
    expect(parseProgress('hello')).toBeNull()
  })

  it('drops malformed entries but keeps valid ones', () => {
    const p = parseProgress({
      version: 1,
      topics: { a: true, b: 'yes' },
      cards: { ok: { box: 1, due: 1, correct: 1, wrong: 0, last: 1 }, bad: { box: '1' } },
      notes: { 0: 'hi', 1: 42 },
    })
    expect(p?.topics).toEqual({ a: true })
    expect(Object.keys(p?.cards ?? {})).toEqual(['ok'])
    expect(p?.notes).toEqual({ 0: 'hi' })
  })
})
