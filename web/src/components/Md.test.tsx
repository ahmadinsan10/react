import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Md } from './Md'

const html = (text: string) => renderToStaticMarkup(<Md text={text} />)

describe('Md', () => {
  it('renders inline code, bold and italic', () => {
    expect(html('Use `useState` for **local** state, *not* refs.')).toBe(
      '<p>Use <code>useState</code> for <strong>local</strong> state, <em>not</em> refs.</p>',
    )
  })

  it('renders lists and fenced code without parsing markup inside code', () => {
    const out = html('- one\n- **two**\n\n```js\nconst a = 2 * 3 * 4\n```')
    expect(out).toContain('<ul><li>one</li><li><strong>two</strong></li></ul>')
    expect(out).toContain('<pre><code>const a = 2 * 3 * 4</code></pre>')
  })

  it('escapes HTML instead of injecting it', () => {
    expect(html('<img src=x onerror=alert(1)>')).toBe('<p>&lt;img src=x onerror=alert(1)&gt;</p>')
  })
})
