// Strings shared across many screens. Screen-specific strings live next to their component (defineStrings).
const en = {
  phase_Foundations: 'Foundations',
  phase_Building: 'Building',
  phase_Mastery: 'Mastery',
  phase_Expert: 'Expert',
  level: 'Level',
  levelN: 'Level {n}',
  weeksApprox: '~{n} weeks',
  weeksShort: '~{n}w',
  lessons: 'Lessons',
  tasks: 'tasks',
  quiz: 'quiz',
  stretch: 'stretch',
  explored: 'explored',
  current: 'current',
  backToDashboard: 'Back to dashboard',
  kind_Animated: 'Animated',
  'kind_Live React': 'Live React',
  kind_Interactive: 'Interactive',
} as const

const id: { [K in keyof typeof en]: string } = {
  phase_Foundations: 'Fondasi',
  phase_Building: 'Membangun',
  phase_Mastery: 'Penguasaan',
  phase_Expert: 'Ahli',
  level: 'Level',
  levelN: 'Level {n}',
  weeksApprox: '~{n} minggu',
  weeksShort: '~{n} mgg',
  lessons: 'Materi',
  tasks: 'tugas',
  quiz: 'kuis',
  stretch: 'opsional',
  explored: 'sudah dicoba',
  current: 'sedang dipelajari',
  backToDashboard: 'Kembali ke dashboard',
  kind_Animated: 'Animasi',
  'kind_Live React': 'React Langsung',
  kind_Interactive: 'Interaktif',
}

export const UI = { en, id }
export type UIKey = keyof typeof en
