// Reports which components/hooks the React Compiler optimized and which it skipped (and why).
// Usage: node scripts/compiler-report.mjs
import { transformAsync } from '@babel/core'
import { transformWithOxc } from 'vite'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const files = []
const walk = d => {
  for (const f of readdirSync(d)) {
    const p = join(d, f)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.tsx$/.test(f) && !/\.test\./.test(f)) files.push(p)
  }
}
walk('src')

let ok = 0
const skipped = []
for (const file of files) {
  const events = []
  // Mirror Vite: strip TypeScript (keep JSX) before the compiler sees the code.
  const { code } = await transformWithOxc(readFileSync(file, 'utf8'), file, { lang: 'tsx', jsx: 'preserve' })
  await transformAsync(code, {
    filename: file,
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: ['jsx'] },
    plugins: [['babel-plugin-react-compiler', { logger: { logEvent: (_f, e) => events.push(e) } }]],
  })
  for (const e of events) {
    if (e.kind === 'CompileSuccess') ok++
    else if (e.kind === 'CompileError' || e.kind === 'CompileSkip' || e.kind === 'PipelineError') {
      const d = e.detail
      const reason = (d?.reason ?? d?.options?.reason ?? e.reason ?? e.kind).toString().split('\n')[0]
      const loc = d?.loc ?? d?.options?.loc ?? e.fnLoc
      skipped.push(`${relative('.', file)}:${loc?.start?.line ?? '?'}  ${reason}`)
    }
  }
}
console.log(`Optimized: ${ok}`)
console.log(`Skipped: ${skipped.length}`)
for (const s of skipped) console.log('  - ' + s)
