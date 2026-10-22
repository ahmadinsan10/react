import type { TopicDetail, VizGuide } from '../types'

type Details = Record<string, TopicDetail>

// Each level's deep content is its own chunk, fetched when the level is opened.
const loaders: Record<number, () => Promise<{ default: Details }>> = {
  0: () => import('./level0'),
  1: () => import('./level1'),
  2: () => import('./level2'),
  3: () => import('./level3'),
  4: () => import('./level4'),
  5: () => import('./level5'),
  6: () => import('./level6'),
  7: () => import('./level7'),
  8: () => import('./level8'),
  9: () => import('./level9'),
  10: () => import('./level10'),
  11: () => import('./level11'),
  12: () => import('./level12'),
}

// Cache promises so `use()` receives the same promise across renders (a requirement of `use`).
const cache = new Map<number, Promise<Details>>()

export function levelDetails(level: number): Promise<Details> {
  let p = cache.get(level)
  if (!p) {
    const load = loaders[level]
    p = load ? load().then(m => m.default) : Promise.resolve({})
    cache.set(level, p)
  }
  return p
}

let guides: Promise<Record<string, VizGuide>> | null = null
export function vizGuides() {
  guides ??= import('../vizGuides').then(m => m.VIZ_GUIDES)
  return guides
}
