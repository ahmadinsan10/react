import { describe, expect, it } from 'vitest'
import { LEVELS } from '../data/levels'
import { QUESTIONS } from '../data/quizzes'
import { CHECKLIST, MISTAKES } from '../data/checklist'
import { VIZ_GUIDES } from '../data/vizGuides'
import { VIZ_GUIDES_ID } from '../data/vizGuides.id'
import { LEVELS_ID } from '../data/levels.id'
import { QUESTIONS_ID } from '../data/quizzes.id'
import { CHECKLIST_ID } from '../data/checklist.id'
import type { TopicDetail } from '../data/types'
import { VIZ } from '../viz/registry'

const fences = (s: string) => s.match(/```[\s\S]*?```/g) ?? []
const inlineCode = (s: string) => (s.replace(/```[\s\S]*?```/g, '').match(/`[^`\n]+`/g) ?? []).sort()

const en = import.meta.glob<{ default: Record<string, TopicDetail> }>('../data/details/level*.ts', { eager: true })
const id = import.meta.glob<{ default: Record<string, TopicDetail> }>('../data/details/id/level*.ts', { eager: true })

describe('Indonesian lessons', () => {
  for (const level of LEVELS) {
    it(`level ${level.id}: every topic translated with identical code and structure`, () => {
      const E = en[`../data/details/level${level.id}.ts`]!.default
      const I = id[`../data/details/id/level${level.id}.ts`]?.default
      expect(I, `missing src/data/details/id/level${level.id}.ts`).toBeDefined()
      if (!I) return
      expect(Object.keys(I).sort()).toEqual(Object.keys(E).sort())
      for (const [k, e] of Object.entries(E)) {
        const i = I[k]!
        expect(i.examples.length, `${k} examples`).toBe(e.examples.length)
        e.examples.forEach((ex, j) => expect(i.examples[j]!.code, `${k} example ${j} code`).toBe(ex.code))
        expect(i.pitfalls.length, `${k} pitfalls`).toBe(e.pitfalls.length)
        expect(i.interview.length, `${k} interview`).toBe(e.interview.length)
        for (const f of ['explanation'] as const) expect(fences(i[f]), `${k} ${f} fences`).toEqual(fences(e[f]))
        expect(fences(i.exercise.solution), `${k} solution fences`).toEqual(fences(e.exercise.solution))
        expect(fences(i.realCase.story), `${k} case fences`).toEqual(fences(e.realCase.story))
        // Translated prose should actually differ from the English.
        expect(i.explanation, `${k} explanation looks untranslated`).not.toBe(e.explanation)
      }
    })
  }
})

describe('Indonesian levels, quizzes, checklist', () => {
  it('translates every level, topic and project task in order', () => {
    for (const l of LEVELS) {
      const t = LEVELS_ID[l.id]
      expect(t, `level ${l.id}`).toBeDefined()
      for (const tp of l.topics) {
        expect(t!.topics[tp.id], `level ${l.id} topic ${tp.id}`).toBeDefined()
        expect(fences(t!.topics[tp.id]!.body)).toEqual(fences(tp.body))
      }
      expect(t!.projects.length, `level ${l.id} projects`).toBe(l.projects.length)
      l.projects.forEach((p, i) => expect(t!.projects[i]!.tasks.length, `level ${l.id} project ${i} tasks`).toBe(p.tasks.length))
    }
  })

  it('translates every question without moving the answer', () => {
    for (const q of QUESTIONS) {
      const t = QUESTIONS_ID[q.id]
      expect(t, q.id).toBeDefined()
      expect(t!.options.length, `${q.id} options`).toBe(q.options.length)
      // Options that are pure code must be untouched, which also pins the option order.
      q.options.forEach((o, i) => {
        // "Pure code" = nothing but code once inline code spans are removed (no two prose words in a row).
        const prose = o.replace(/`[^`]*`/g, '').trim()
        const pureCode = !/[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(prose) && (prose === '' || /^[<\d'"{(]/.test(prose))
        if (pureCode) expect(t!.options[i], `${q.id} option ${i}`).toBe(o)
      })
    }
  })

  it('translates the checklist and mistakes in order', () => {
    expect(CHECKLIST_ID.checklist.length).toBe(CHECKLIST.length)
    expect(CHECKLIST_ID.mistakes.length).toBe(MISTAKES.length)
    expect(CHECKLIST_ID.capstones.length).toBe(3)
  })
})

describe('Indonesian visualization guides & registry', () => {
  it('has a guide for every visualization with identical code', () => {
    for (const v of VIZ) {
      const e = VIZ_GUIDES[v.id]!
      const i = VIZ_GUIDES_ID[v.id]
      expect(i, v.id).toBeDefined()
      expect(i!.steps.length, `${v.id} steps`).toBe(e.steps.length)
      expect(i!.challenges.length, `${v.id} challenges`).toBe(e.challenges.length)
      expect(fences(i!.inCode), `${v.id} code`).toEqual(fences(e.inCode))
    }
  })

  it('has Indonesian titles and summaries for every visualization', () => {
    for (const v of VIZ) {
      expect(v.titleId, v.id).toBeTruthy()
      expect(v.summaryId, v.id).toBeTruthy()
    }
  })
})

// Inline code is informational: report big drifts without failing on legitimate rewording.
it('keeps most inline code spans in lessons', () => {
  let total = 0
  let kept = 0
  for (const [path, mod] of Object.entries(id)) {
    const E = en[path.replace('/id/', '/')]!.default
    for (const [k, i] of Object.entries(mod.default)) {
      const a = inlineCode(E[k]!.explanation)
      const b = new Set(inlineCode(i.explanation))
      total += a.length
      kept += a.filter(x => b.has(x)).length
    }
  }
  expect(kept / Math.max(1, total)).toBeGreaterThan(0.9)
})
