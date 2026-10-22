export type Topic = {
  id: string
  title: string
  /** Mini-markdown: paragraphs, `code`, **bold**, "- " bullets and ``` fenced blocks. */
  body: string
  stretch?: boolean
}

export type Project = {
  title: string
  summary: string
  tasks: { id: string; text: string }[]
}

export type Level = {
  id: number
  slug: string
  title: string
  tagline: string
  phase: 'Foundations' | 'Building' | 'Mastery' | 'Expert'
  weeks: number
  topics: Topic[]
  projects: Project[]
  checkpoint: string
  vizIds: string[]
  resources: { label: string; url: string }[]
}

export type Question = {
  id: string
  level: number
  prompt: string
  code?: string
  options: string[]
  answer: number
  explanation: string
}

/**
 * Deep-dive content for one lesson topic. Text fields use the app's mini-markdown:
 * paragraphs, `code`, **bold**, *italic*, "- " bullets, "1. " numbered lists, "### " headings, ``` fences.
 */
export type TopicDetail = {
  /** 250–600 words: the mental model, how it works, why it matters. */
  explanation: string
  /** 1–3 runnable-looking examples, ideally "bad vs good". */
  examples: { title: string; code: string; note: string }[]
  /** A realistic production scenario: the situation, what went wrong / what the team did, the lesson. */
  realCase: { title: string; story: string }
  /** 2–5 concrete mistakes people make. */
  pitfalls: string[]
  /** A hands-on exercise with a worked solution. */
  exercise: { task: string; hint: string; solution: string }
  /** 2–3 interview-style questions to self-test understanding. */
  interview: string[]
}

/** Guided walkthrough shown next to a visualization. */
export type VizGuide = {
  /** What the visualization shows and how to read it (mini-markdown). */
  whatYouSee: string
  /** Ordered things to try, each with what to notice. */
  steps: string[]
  /** How this maps to real React code (mini-markdown, may include a code fence). */
  inCode: string
  /** A real-world production case where this concept mattered. */
  realCase: { title: string; story: string }
  /** 2–4 challenge questions; answers are given. */
  challenges: { q: string; a: string }[]
}
