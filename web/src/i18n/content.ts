/**
 * Shapes of the Indonesian content files. Every field is the Indonesian version of the
 * English field with the same key; anything missing falls back to English at runtime.
 */
import type { Level, Question, TopicDetail, VizGuide } from '../data/types'

/** src/data/levels.id.ts: keyed by level id. */
export type LevelId = {
  title: string
  tagline: string
  checkpoint: string
  /** keyed by topic id */
  topics: Record<string, { title: string; body: string }>
  /** same order and length as the English projects; tasks in the same order */
  projects: { title: string; summary: string; tasks: string[] }[]
}
export type LevelsId = Record<number, LevelId>

/** src/data/quizzes.id.ts: keyed by question id (e.g. "L0-Q1"). Options in the SAME order. */
export type QuestionsId = Record<string, { prompt: string; options: string[]; explanation: string }>

/** src/data/checklist.id.ts */
export type ChecklistId = { checklist: string[]; mistakes: [string, string][]; capstones: [string, string][] }

/** src/data/details/id/levelN.ts: same shape as English, keyed by topic id. */
export type DetailsId = Record<string, TopicDetail>

/** src/data/vizGuides.id.ts: same shape as English, keyed by visualization id. */
export type VizGuidesId = Record<string, VizGuide>

export function localizeLevel(level: Level, t: LevelId | undefined): Level {
  if (!t) return level
  return {
    ...level,
    title: t.title || level.title,
    tagline: t.tagline || level.tagline,
    checkpoint: t.checkpoint || level.checkpoint,
    topics: level.topics.map(tp => ({ ...tp, title: t.topics[tp.id]?.title || tp.title, body: t.topics[tp.id]?.body || tp.body })),
    projects: level.projects.map((pr, i) => {
      const tp = t.projects[i]
      return {
        ...pr,
        title: tp?.title || pr.title,
        summary: tp?.summary || pr.summary,
        // Task ids stay English-derived so progress is shared across languages.
        tasks: pr.tasks.map((task, j) => ({ ...task, text: tp?.tasks[j] || task.text })),
      }
    }),
  }
}

export function localizeQuestion(q: Question, t: QuestionsId[string] | undefined): Question {
  if (!t || t.options.length !== q.options.length) return q
  return { ...q, prompt: t.prompt, options: t.options, explanation: t.explanation }
}
