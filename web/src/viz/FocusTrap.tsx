import { useEffect, useRef, useState, type FocusEvent } from 'react'
import { Note, Toggle } from './common'
import { getLang, useLang } from '../i18n/lang'

const T = {
  en: {
    labels: {
      focusIn: 'Move focus into the dialog on open',
      trap: 'Trap Tab / Shift+Tab inside the dialog',
      escape: 'Close on Escape',
      restore: 'Restore focus to the trigger on close',
      aria: 'role="dialog" + aria-modal + aria-labelledby',
      inert: 'Make the background inert',
    } as Record<keyof Opts, string>,
    lost: '<body>: focus lost, keyboard user is back at the top of the page',
    shareClicked: 'background "Share" clicked',
    c1: 'Keyboard users land inside the dialog when it opens', c2: 'Tab cannot reach the page behind the dialog', c3: 'Background is hidden from screen readers & clicks',
    c4: 'Escape dismisses the dialog', c5: 'Focus returns to "Delete project" afterwards', c6: 'Screen readers announce "Delete project?, dialog"',
    correct: 'Make it correct', breakIt: 'Break it', clear: 'Clear log', home: 'Home', settings: 'Settings', project: 'Project "Website redesign" · 12 tasks',
    share: 'Share', del: 'Delete project', help: 'Help center', title: 'Delete project?', body: 'This cannot be undone. Type the project name to confirm.',
    projectName: 'Project name', cancel: 'Cancel', delete: 'Delete', focusLog: 'Focus log', empty: 'Click "Delete project", then press Tab a few times.',
    inside: ' · inside dialog', outside: ' · OUTSIDE open dialog', checklist: 'Checklist',
    allOn: 'All requirements pass: focus moves in, Tab cycles inside, Escape closes, focus returns to the trigger and the background is `inert`. The native `<dialog>` with `showModal()`, or headless libraries like Radix / React Aria, give you all of this for free.',
    off: 'Open the dialog with the keyboard and press **Tab**: with these toggles off, focus stays behind the dialog or wanders back to the page (red lines in the log). Closing without restoration drops focus to `<body>`. Turn the toggles on one by one, or press **Make it correct**.',
  },
  id: {
    labels: {
      focusIn: 'Pindahkan focus ke dalam dialog saat dibuka',
      trap: 'Kurung Tab / Shift+Tab di dalam dialog',
      escape: 'Tutup dengan Escape',
      restore: 'Kembalikan focus ke tombol pemicu saat ditutup',
      aria: 'role="dialog" + aria-modal + aria-labelledby',
      inert: 'Jadikan latar belakang inert',
    } as Record<keyof Opts, string>,
    lost: '<body>: focus hilang, pengguna keyboard terlempar kembali ke awal halaman',
    shareClicked: '"Bagikan" di latar belakang diklik',
    c1: 'Pengguna keyboard langsung berada di dalam dialog saat dialog terbuka', c2: 'Tab tidak bisa menjangkau halaman di belakang dialog', c3: 'Latar belakang tersembunyi dari screen reader & tidak bisa diklik',
    c4: 'Escape menutup dialog', c5: 'Focus kembali ke "Hapus proyek" setelahnya', c6: 'Screen reader mengumumkan "Hapus proyek?, dialog"',
    correct: 'Buat jadi benar', breakIt: 'Rusak lagi', clear: 'Bersihkan log', home: 'Beranda', settings: 'Pengaturan', project: 'Proyek "Website redesign" · 12 tugas',
    share: 'Bagikan', del: 'Hapus proyek', help: 'Pusat bantuan', title: 'Hapus proyek?', body: 'Tindakan ini tidak bisa dibatalkan. Ketik nama proyek untuk konfirmasi.',
    projectName: 'Nama proyek', cancel: 'Batal', delete: 'Hapus', focusLog: 'Log focus', empty: 'Klik "Hapus proyek", lalu tekan Tab beberapa kali.',
    inside: ' · di dalam dialog', outside: ' · DI LUAR dialog yang terbuka', checklist: 'Checklist',
    allOn: 'Semua kebutuhan terpenuhi: focus masuk ke dialog, Tab berputar di dalamnya, Escape menutup, focus kembali ke tombol pemicu, dan latar belakang `inert`. `<dialog>` native dengan `showModal()`, atau library headless seperti Radix / React Aria, sudah memberi semua ini secara gratis.',
    off: 'Buka dialog dengan keyboard lalu tekan **Tab**: selama toggle ini mati, focus tertinggal di belakang dialog atau berkeliaran kembali ke halaman (baris merah di log). Menutup dialog tanpa pengembalian focus membuat focus jatuh ke `<body>`. Nyalakan toggle satu per satu, atau tekan **Buat jadi benar**.',
  },
}

type Opts = { focusIn: boolean; trap: boolean; escape: boolean; restore: boolean; aria: boolean; inert: boolean }
type LogItem = { id: number; desc: string; inside: boolean | null; warn: boolean }

const OFF: Opts = { focusIn: false, trap: false, escape: false, restore: false, aria: false, inert: false }
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])'

function describe(el: Element) {
  const tag = el.tagName.toLowerCase()
  const text = el.getAttribute('aria-label') ?? (el as HTMLInputElement).placeholder ?? ''
  return `<${tag}> ${(text || el.textContent || '').trim().slice(0, 30)}`
}

export default function FocusTrap() {
  const t = T[useLang()]
  const LABELS = t.labels
  const [opts, setOpts] = useState<Opts>(OFF)
  const [open, setOpen] = useState(false)
  const [log, setLog] = useState<LogItem[]>([])
  const seq = useRef(0)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const push = (desc: string, inside: boolean | null, warn: boolean) => setLog(l => [{ id: ++seq.current, desc, inside, warn }, ...l].slice(0, 10))

  const restorePending = useRef(false)

  // Restore focus AFTER React commits the close: until then the trigger is still inside the
  // inert background, and browsers silently refuse to focus inert elements.
  useEffect(() => {
    if (!open && restorePending.current) {
      restorePending.current = false
      triggerRef.current?.focus()
    }
  }, [open])

  const close = () => {
    setOpen(false)
    if (opts.restore) {
      restorePending.current = true
    } else {
      // Without restoration, focus falls back to <body> when the focused node unmounts.
      setTimeout(() => {
        const a = document.activeElement
        if (!a || a === document.body) push(T[getLang()].lost, null, true)
      }, 50)
    }
  }

  useEffect(() => {
    if (open && opts.focusIn) dialogRef.current?.querySelector<HTMLElement>('input')?.focus()
  }, [open, opts.focusIn])

  useEffect(() => {
    if (!open || (!opts.trap && !opts.escape)) return
    const onKey = (e: KeyboardEvent) => {
      const dialog = dialogRef.current
      if (!dialog) return
      if (opts.escape && e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (opts.trap && e.key === 'Tab') {
        const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)]
        if (!items.length) return
        const first = items[0]!
        const last = items[items.length - 1]!
        const active = document.activeElement
        if (!dialog.contains(active)) {
          e.preventDefault()
          first.focus()
        } else if (e.shiftKey && active === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, opts.trap, opts.escape, opts.restore])

  const onFocusIn = (e: FocusEvent<HTMLDivElement>) => {
    const inside = !!dialogRef.current?.contains(e.target)
    push(describe(e.target), open ? inside : null, open && !inside)
  }

  const set = (k: keyof Opts) => (v: boolean) => setOpts(o => ({ ...o, [k]: v }))
  const allOn = Object.values(opts).every(Boolean)

  const checks: { label: string; pass: boolean }[] = [
    { label: t.c1, pass: opts.focusIn },
    { label: t.c2, pass: opts.trap || opts.inert },
    { label: t.c3, pass: opts.inert },
    { label: t.c4, pass: opts.escape },
    { label: t.c5, pass: opts.restore },
    { label: t.c6, pass: opts.aria },
  ]

  const bgLink = { color: 'var(--accent)' }

  return (
    <div>
      <div className="viz-controls" style={{ alignItems: 'flex-start' }}>
        <div className="stack" style={{ gap: 4 }}>
          {(Object.keys(LABELS) as (keyof Opts)[]).map(k => (
            <Toggle key={k} checked={opts[k]} onChange={set(k)}>
              {LABELS[k]}
            </Toggle>
          ))}
        </div>
        <div className="row">
          <button className="btn sm primary" onClick={() => setOpts({ focusIn: true, trap: true, escape: true, restore: true, aria: true, inert: true })} disabled={allOn}>
            {t.correct}
          </button>
          <button className="btn sm ghost" onClick={() => setOpts(OFF)}>{t.breakIt}</button>
          <button className="btn sm ghost" onClick={() => setLog([])}>{t.clear}</button>
        </div>
      </div>
      <div className="grid cols-2" style={{ gap: 10 }}>
        <div ref={stageRef} className="viz-stage" onFocus={onFocusIn} style={{ position: 'relative', minHeight: 300, overflow: 'hidden', minWidth: 0 }}>
          <div inert={open && opts.inert} aria-hidden={open && opts.inert ? true : undefined}>
            <div className="row" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
              <strong>Acme Projects</strong>
              <nav className="row" style={{ gap: 10, fontSize: '0.85rem' }}>
                <a href="#home" style={bgLink} onClick={e => e.preventDefault()}>{t.home}</a>
                <a href="#settings" style={bgLink} onClick={e => e.preventDefault()}>{t.settings}</a>
              </nav>
            </div>
            <p style={{ fontSize: '0.85rem' }}>{t.project}</p>
            <div className="row">
              <button className="btn sm" onClick={() => push(t.shareClicked, null, open)}>{t.share}</button>
              <button ref={triggerRef} className="btn sm danger" onClick={() => setOpen(true)}>{t.del}</button>
            </div>
            <p style={{ fontSize: '0.8rem' }}>
              <a href="#help" style={bgLink} onClick={e => e.preventDefault()}>{t.help}</a>
            </p>
          </div>
          {open && (
            <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in srgb, var(--bg) 70%, transparent)', display: 'grid', placeItems: 'center', padding: 12 }}>
              <div
                ref={dialogRef}
                {...(opts.aria ? { role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'ft-title' } : {})}
                className="card"
                style={{ width: '100%', maxWidth: 300, boxShadow: 'var(--shadow)', background: 'var(--bg-elev)', padding: 14 }}
              >
                <h4 id="ft-title" style={{ margin: '0 0 6px' }}>{t.title}</h4>
                <p style={{ fontSize: '0.8rem', margin: '0 0 8px' }}>{t.body}</p>
                <input type="text" placeholder="Website redesign" aria-label={t.projectName} style={{ width: '100%', boxSizing: 'border-box' }} />
                <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
                  <button className="btn sm" onClick={close}>{t.cancel}</button>
                  <button className="btn sm danger" onClick={close}>{t.delete}</button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="stack" style={{ gap: 10, minWidth: 0 }}>
          <div>
            <h4 style={{ margin: '0 0 6px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-3)' }}>{t.focusLog}</h4>
            <div className="log" aria-live="polite" style={{ minHeight: 120 }}>
              {log.length === 0 && <div className="subtle">{t.empty}</div>}
              {log.map(l => (
                <div key={l.id} style={{ color: l.warn ? 'var(--bad)' : undefined, overflowWrap: 'anywhere' }}>
                  {l.warn ? '⚠ ' : ''}
                  {l.desc}
                  {l.inside === null ? '' : l.inside ? t.inside : t.outside}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ margin: '0 0 6px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-3)' }}>{t.checklist}</h4>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '0.82rem' }}>
              {checks.map(c => (
                <li key={c.label} style={{ color: c.pass ? 'var(--ok)' : 'var(--bad)' }}>
                  {c.pass ? '✓' : '✗'} <span style={{ color: 'var(--text-2)' }}>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <Note>
        {allOn
          ? t.allOn
          : t.off}
      </Note>
    </div>
  )
}
