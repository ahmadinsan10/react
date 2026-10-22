import { describe, expect, it } from 'vitest'
import { LEVELS } from './levels'
import { levelDetails } from './details'
import { VIZ_GUIDES } from './vizGuides'
import { VIZ } from '../viz/registry'

const words = (s: string) => s.split(/\s+/).filter(Boolean).length

describe('deep lesson content', () => {
  for (const level of LEVELS) {
    it(`level ${level.id} has complete deep content for every topic`, async () => {
      const details = await levelDetails(level.id)
      for (const t of level.topics) {
        const d = details[t.id]
        expect(d, `missing detail for ${level.id}:${t.id}`).toBeDefined()
        if (!d) continue
        expect(words(d.explanation), `${t.id} explanation too short`).toBeGreaterThan(t.stretch ? 120 : 200)
        expect(d.examples.length, `${t.id} needs examples`).toBeGreaterThan(0)
        expect(d.realCase.story.length).toBeGreaterThan(100)
        expect(d.pitfalls.length).toBeGreaterThan(1)
        expect(d.exercise.solution.length).toBeGreaterThan(30)
        expect(d.interview.length).toBeGreaterThan(1)
        // Unbalanced fences would swallow the rest of the lesson.
        for (const text of [d.explanation, d.exercise.solution, d.realCase.story]) {
          expect((text.match(/^```/gm) ?? []).length % 2, `${t.id} has an unclosed code fence`).toBe(0)
        }
      }
      // No stray keys (typos in topic ids would silently hide content).
      for (const key of Object.keys(details)) expect(level.topics.some(t => t.id === key), `unknown topic id ${key}`).toBe(true)
    })
  }
})

describe('visualization guides', () => {
  it('every registered visualization has a full guide', () => {
    for (const v of VIZ) {
      const g = VIZ_GUIDES[v.id]
      expect(g, `missing guide for ${v.id}`).toBeDefined()
      expect(g!.steps.length).toBeGreaterThan(2)
      expect(g!.challenges.length).toBeGreaterThan(1)
    }
  })
})
