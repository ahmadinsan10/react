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
