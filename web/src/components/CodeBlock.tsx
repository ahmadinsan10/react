import { useState, type ReactNode } from 'react'

const KEYWORDS = new Set(
  'const let var function return if else for while do switch case break continue new class extends import export from default async await try catch finally throw typeof instanceof in of type interface enum as satisfies keyof readonly void null undefined true false this super yield delete implements public private protected static get set declare'.split(
    ' ',
  ),
)

// One pass over the source: comments, strings/templates, numbers, JSX tags, identifiers.
const TOKEN = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|(\b\d[\d_.]*n?\b)|(<\/?[A-Za-z][\w.]*)|([A-Za-z_$][\w$]*)/g

/** Lightweight TS/TSX highlighter: returns spans, never HTML strings. */
export function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  TOKEN.lastIndex = 0
  while ((m = TOKEN.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index))
    const [tok, comment, str, num, tag, ident] = m
    const cls = comment
      ? 'tk-c'
      : str
        ? 'tk-s'
        : num
          ? 'tk-n'
          : tag
            ? 'tk-t'
            : ident && KEYWORDS.has(ident)
              ? 'tk-k'
              : ident && /^[A-Z]/.test(ident)
                ? 'tk-t'
                : ident && code[TOKEN.lastIndex] === '('
                  ? 'tk-f'
                  : null
    out.push(cls ? <span key={i++} className={cls}>{tok}</span> : tok)
    last = TOKEN.lastIndex
  }
  if (last < code.length) out.push(code.slice(last))
  return out
}

export function CodeBlock({ code, title }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked: user can still select */
    }
  }
  return (
    <div className="codeblock">
      <div className="codeblock-head">
        <span>{title ?? ''}</span>
        <button className="btn ghost sm" onClick={copy} aria-label="Copy code">
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <pre>
        <code>{highlight(code)}</code>
      </pre>
    </div>
  )
}
