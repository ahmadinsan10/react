import { useRef, useState } from 'react'
import { SyncPanel } from '../components/SyncPanel'
import { toast } from '../components/ui'
import { emptyProgress, parseProgress } from '../store/logic'
import { replaceProgress, useProgress } from '../store/progress'
import { defineStrings, LANGS, locale, setLang, useLang, useStrings } from '../i18n'

const S = defineStrings({
  en: {
    eyebrow: 'Settings',
    title: 'Settings & backup',
    intro: 'Progress is saved in this browser and, if you turn on sync, to the sync server so all your devices stay in step. You can also export a JSON backup at any time.',
    language: 'Language',
    languageHint: 'Lessons, quizzes, visualizations and the interface switch instantly. Code examples stay the same in every language.',
    exported: 'Progress exported',
    notBackup: 'This file is not a React Mastery progress backup.',
    imported: 'Progress imported',
    unreadable: 'Could not read file',
    backup: 'Backup',
    stats: '{a} tracked items · {b} notes · started {date}',
    export: 'Export progress (.json)',
    import: 'Import backup…',
    reset: 'Reset',
    resetHint: 'Erase all progress, quiz history and notes in this browser. Export a backup first if you might want it back.',
    resetDone: 'Progress reset',
    resetYes: 'Yes, erase everything',
    cancel: 'Cancel',
    resetBtn: 'Reset progress…',
    shortcuts: 'Keyboard shortcuts',
    or: 'or',
    scSearch: 'Search everything',
    scAnswer: 'Answer a quiz question',
    scNext: 'Next question',
    scNav: 'Navigate search results',
    about: 'About',
    aboutText:
      'Built with React 19, TypeScript, Vite and React Router, following the roadmap in GUIDE.md. Progress logic is covered by unit tests (Vitest). Each visualization is code-split and loads on demand.',
  },
  id: {
    eyebrow: 'Pengaturan',
    title: 'Pengaturan & backup',
    intro: 'Progres disimpan di browser ini dan, kalau sinkronisasi diaktifkan, juga di server sinkronisasi supaya semua perangkatmu selalu sama. Kamu juga bisa mengekspor backup JSON kapan saja.',
    language: 'Bahasa',
    languageHint: 'Materi, kuis, visualisasi, dan tampilan aplikasi langsung berganti. Contoh kode tetap sama di semua bahasa.',
    exported: 'Progres berhasil diekspor',
    notBackup: 'File ini bukan backup progres React Mastery.',
    imported: 'Progres berhasil diimpor',
    unreadable: 'File tidak bisa dibaca',
    backup: 'Backup',
    stats: '{a} item tercatat · {b} catatan · mulai {date}',
    export: 'Ekspor progres (.json)',
    import: 'Impor backup…',
    reset: 'Reset',
    resetHint: 'Hapus semua progres, riwayat kuis, dan catatan di browser ini. Ekspor backup dulu kalau mungkin kamu butuh lagi nanti.',
    resetDone: 'Progres sudah direset',
    resetYes: 'Ya, hapus semuanya',
    cancel: 'Batal',
    resetBtn: 'Reset progres…',
    shortcuts: 'Shortcut keyboard',
    or: 'atau',
    scSearch: 'Cari apa saja',
    scAnswer: 'Menjawab soal kuis',
    scNext: 'Soal berikutnya',
    scNav: 'Berpindah di hasil pencarian',
    about: 'Tentang',
    aboutText:
      'Dibuat dengan React 19, TypeScript, Vite, dan React Router, mengikuti roadmap di GUIDE.md. Logika progres diuji dengan unit test (Vitest). Setiap visualisasi dipecah (code-split) dan baru dimuat saat dibuka.',
  },
})

export function Settings() {
  const p = useProgress()
  const s = useStrings(S)
  const lang = useLang()
  const file = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `react-mastery-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast(s('exported'))
  }

  const importJson = async (f: File) => {
    setError(null)
    try {
      const parsed = parseProgress(JSON.parse(await f.text()))
      if (!parsed) throw new Error(s('notBackup'))
      replaceProgress(parsed)
      toast(s('imported'))
    } catch (e) {
      setError(e instanceof SyntaxError ? s('unreadable') : e instanceof Error ? e.message : s('unreadable'))
    }
  }

  const items = Object.keys(p.topics).length + Object.keys(p.tasks).length + Object.keys(p.cards).length

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">{s('eyebrow')}</div>
        <h1>{s('title')}</h1>
        <p>{s('intro')}</p>
      </div>
      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3>{s('language')}</h3>
          <div className="row" role="radiogroup" aria-label={s('language')}>
            {LANGS.map(l => (
              <button key={l.value} role="radio" aria-checked={lang === l.value} className={`btn${lang === l.value ? ' primary' : ''}`} onClick={() => setLang(l.value)}>
                {l.label}
              </button>
            ))}
          </div>
          <p className="subtle" style={{ margin: '10px 0 0' }}>
            {s('languageHint')}
          </p>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <SyncPanel />
        </div>
        <div className="card">
          <h3>{s('backup')}</h3>
          <p className="subtle">{s('stats', { a: items, b: Object.keys(p.notes).length, date: new Date(p.startedAt).toLocaleDateString(locale(lang)) })}</p>
          <div className="row">
            <button className="btn primary" onClick={exportJson}>
              {s('export')}
            </button>
            <button className="btn" onClick={() => file.current?.click()}>
              {s('import')}
            </button>
            <input
              ref={file}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) void importJson(f)
                e.target.value = ''
              }}
            />
          </div>
          {error && <div className="explain bad">{error}</div>}
        </div>
        <div className="card">
          <h3>{s('reset')}</h3>
          <p className="subtle">{s('resetHint')}</p>
          {confirmReset ? (
            <div className="row">
              <button
                className="btn danger"
                onClick={() => {
                  replaceProgress(emptyProgress())
                  setConfirmReset(false)
                  toast(s('resetDone'))
                }}
              >
                {s('resetYes')}
              </button>
              <button className="btn ghost" onClick={() => setConfirmReset(false)}>
                {s('cancel')}
              </button>
            </div>
          ) : (
            <button className="btn danger" onClick={() => setConfirmReset(true)}>
              {s('resetBtn')}
            </button>
          )}
        </div>
        <div className="card">
          <h3>{s('shortcuts')}</h3>
          <table className="table">
            <tbody>
              <tr>
                <td>
                  <kbd>Ctrl</kbd> + <kbd>K</kbd> {s('or')} <kbd>/</kbd>
                </td>
                <td>{s('scSearch')}</td>
              </tr>
              <tr>
                <td>
                  <kbd>1</kbd>–<kbd>4</kbd>
                </td>
                <td>{s('scAnswer')}</td>
              </tr>
              <tr>
                <td>
                  <kbd>Enter</kbd>
                </td>
                <td>{s('scNext')}</td>
              </tr>
              <tr>
                <td>
                  <kbd>↑</kbd> <kbd>↓</kbd> <kbd>Enter</kbd>
                </td>
                <td>{s('scNav')}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>{s('about')}</h3>
          <p className="subtle">{s('aboutText')}</p>
        </div>
      </div>
    </div>
  )
}
