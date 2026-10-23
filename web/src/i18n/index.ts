import { LEVELS } from '../data/levels'
import { QUESTIONS } from '../data/quizzes'
import { CHECKLIST, MISTAKES } from '../data/checklist'
import type { Level, Question } from '../data/types'
import { localizeLevel, localizeQuestion, type ChecklistId, type LevelsId, type QuestionsId } from './content'
import { useLang, type Lang } from './lang'
import { UI, type UIKey } from './ui'

export { useLang, setLang, getLang, LANGS, type Lang } from './lang'

// Indonesian content files are optional: anything missing falls back to English.
const levelsId = import.meta.glob<LevelsId>('../data/levels.id.ts', { eager: true, import: 'LEVELS_ID' })['../data/levels.id.ts']
const questionsId = import.meta.glob<QuestionsId>('../data/quizzes.id.ts', { eager: true, import: 'QUESTIONS_ID' })['../data/quizzes.id.ts']
const checklistId = import.meta.glob<ChecklistId>('../data/checklist.id.ts', { eager: true, import: 'CHECKLIST_ID' })['../data/checklist.id.ts']

// Built once per language so components get stable references.
const levelCache: Partial<Record<Lang, Level[]>> = { en: LEVELS }
export function levelsFor(lang: Lang): Level[] {
  return (levelCache[lang] ??= LEVELS.map(l => localizeLevel(l, levelsId?.[l.id])))
}
const questionCache: Partial<Record<Lang, Question[]>> = { en: QUESTIONS }
export function questionsFor(lang: Lang): Question[] {
  return (questionCache[lang] ??= QUESTIONS.map(q => localizeQuestion(q, questionsId?.[q.id])))
}

export const useLevels = () => levelsFor(useLang())
export const useQuestions = () => questionsFor(useLang())

export function useChecklist() {
  const lang = useLang()
  const id = lang === 'id' ? checklistId : undefined
  return {
    checklist: CHECKLIST.map((c, i) => ({ ...c, text: id?.checklist[i] ?? c.text })),
    mistakes: MISTAKES.map((m, i) => id?.mistakes[i] ?? m),
    capstones: id?.capstones,
  }
}

export type Vars = Record<string, string | number>
export function translate(lang: Lang, key: UIKey, vars?: Vars) {
  let s: string = UI[lang][key] ?? UI.en[key]
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}

/** `t('key', { n: 3 })`: interpolates {n}. */
export function useT() {
  const lang = useLang()
  return (key: UIKey, vars?: Vars) => translate(lang, key, vars)
}

export const locale = (lang: Lang) => (lang === 'id' ? 'id-ID' : 'en-US')

/** Colocated per-file strings. The type forces every English key to have an Indonesian twin. */
export function defineStrings<E extends Record<string, string>>(d: { en: E; id: { [K in keyof E]: string } }) {
  return d
}

export function useStrings<E extends Record<string, string>>(d: { en: E; id: { [K in keyof E]: string } }) {
  const lang = useLang()
  return (key: keyof E, vars?: Vars) => {
    let s: string = d[lang][key] ?? d.en[key]
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
    return s
  }
}
