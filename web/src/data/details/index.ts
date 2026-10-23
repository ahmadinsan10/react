import type { TopicDetail, VizGuide } from '../types'
import type { Lang } from '../../i18n/lang'

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

// Indonesian lessons: same shape, keyed by topic id. Files are optional; missing topics fall back to English.
const idLoaders = import.meta.glob<{ default: Details }>('./id/level*.ts')

// Cache promises so `use()` receives the same promise across renders (a requirement of `use`).
const cache = new Map<string, Promise<Details>>()

function loadEn(level: number): Promise<Details> {
  const load = loaders[level]
  return load ? load().then(m => m.default) : Promise.resolve({})
}

export function levelDetails(level: number, lang: Lang = 'en'): Promise<Details> {
  const key = `${lang}:${level}`
  let p = cache.get(key)
  if (!p) {
    if (lang === 'en') p = loadEn(level)
    else {
      const loadId = idLoaders[`./id/level${level}.ts`]
      p = Promise.all([loadEn(level), loadId ? loadId().then(m => m.default) : Promise.resolve({} as Details)]).then(([en, id]) => ({ ...en, ...id }))
    }
    cache.set(key, p)
  }
  return p
}

const guideCache = new Map<Lang, Promise<Record<string, VizGuide>>>()
export function vizGuides(lang: Lang = 'en') {
  let p = guideCache.get(lang)
  if (!p) {
    const en = import('../vizGuides').then(m => m.VIZ_GUIDES)
    p =
      lang === 'en'
        ? en
        : Promise.all([en, import.meta.glob<{ VIZ_GUIDES_ID: Record<string, VizGuide> }>('../vizGuides.id.ts')['../vizGuides.id.ts']?.() ?? Promise.resolve({ VIZ_GUIDES_ID: {} })]).then(
            ([e, i]) => ({ ...e, ...i.VIZ_GUIDES_ID }),
          )
    guideCache.set(lang, p)
  }
  return p
}
