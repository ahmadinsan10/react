import { Fragment, type ReactNode } from 'react'
import { CodeBlock } from './CodeBlock'

/** Inline: `code`, **bold** and *italic*. Builds elements, never injects HTML. */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    out.push(
      tok.startsWith('`') ? (
        <code key={`${keyBase}-${i++}`}>{tok.slice(1, -1)}</code>
      ) : tok.startsWith('**') ? (
        <strong key={`${keyBase}-${i++}`}>{tok.slice(2, -2)}</strong>
      ) : (
        <em key={`${keyBase}-${i++}`}>{tok.slice(1, -1)}</em>
      ),
    )
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/** Tiny block renderer: paragraphs, "### " headings, "- " and "1. " lists, ``` fences. */
export function Md({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  const lines = text.split('\n')
  let i = 0
  let k = 0
  while (i < lines.length) {
    const line = lines[i]!
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i]!.startsWith('```')) code.push(lines[i++]!)
      i++
      blocks.push(<CodeBlock key={k++} code={code.join('\n')} title={lang || undefined} />)
    } else if (line.startsWith('### ')) {
      const key = k++
      blocks.push(<h4 key={key} className="md-h">{inline(line.slice(4), String(key))}</h4>)
      i++
    } else if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i]!)) items.push(lines[i++]!.replace(/^\d+\. /, ''))
      const key = k++
      blocks.push(
        <ol key={key}>
          {items.map((it, j) => (
            <li key={j}>{inline(it, `${key}-${j}`)}</li>
          ))}
        </ol>,
      )
    } else if (line.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i]!.startsWith('- ')) items.push(lines[i++]!.slice(2))
      const key = k++
      blocks.push(
        <ul key={key}>
          {items.map((it, j) => (
            <li key={j}>{inline(it, `${key}-${j}`)}</li>
          ))}
        </ul>,
      )
    } else if (line.trim() === '') {
      i++
    } else {
      const para: string[] = []
      while (i < lines.length && lines[i]!.trim() !== '' && !/^(- |\d+\. |### |```)/.test(lines[i]!)) {
        para.push(lines[i++]!)
      }
      const key = k++
      blocks.push(<p key={key}>{inline(para.join(' '), String(key))}</p>)
    }
  }
  return <Fragment>{blocks}</Fragment>
}
