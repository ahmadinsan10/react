import type { TopicDetail } from '../types'

const details: Record<string, TopicDetail> = {
  'read-code': {
    explanation: `Reading excellent library code is the fastest way to move from "I can use React" to "I understand the design space React lives in". Application code teaches you one team's compromises; library code shows you solutions that thousands of other people have already tested against edge cases you have not met yet.

### Why library code is different
Libraries such as TanStack Query, Zustand, Radix UI and React Hook Form are written for unknown callers. That forces them to care about things app code usually ignores: stable references, SSR safety, concurrent rendering, tree-shaking, TypeScript inference, and backwards compatibility. Every odd-looking line usually exists because a bug report forced it.

### A method that works
1. **Start from the public API.** Read the docs and the type definitions first. Write down what you *expect* the implementation to look like.
2. **Find the core.** Most libraries have a small core and a large surface. Zustand's core store is tiny; TanStack Query's heart is the \`QueryCache\`, \`Query\` and \`QueryObserver\` classes, with React bindings as a thin layer on top.
3. **Trace one call end to end.** For example: what happens when \`useQuery\` mounts? Follow it into the observer, then into the cache. Use the debugger and step through a tiny reproduction app rather than reading statically.
4. **Read the tests.** Tests document intended behaviour and edge cases far better than comments.
5. **Read git blame and linked issues** on surprising lines. "Why is there a \`useSyncExternalStore\` here?" is usually answered by a past tearing bug.
6. **Ask "why this way?"** and write a one-paragraph answer in your notes.

### Patterns you will keep finding
- **External store + \`useSyncExternalStore\`**: Zustand and TanStack Query keep state outside React and subscribe components, which avoids context re-render storms and is safe under concurrent rendering.
- **Uncontrolled inputs with refs**: React Hook Form registers inputs and reads values from the DOM, so typing does not re-render the whole form.
- **Compound components and \`asChild\`**: Radix splits a widget into parts that share context, and lets you swap the rendered element while keeping behaviour and accessibility.
- **Structural sharing**: TanStack Query keeps unchanged parts of refetched data referentially identical so memoized consumers do not re-render.

### When not to go deep
You do not need to read every library you install. Read deeply the two or three your app depends on most, and the ones whose bugs you keep hitting. The goal is transferable patterns, not trivia.`,
    examples: [
      {
        title: 'The core idea of Zustand in ~25 lines',
        code: `import { useSyncExternalStore } from 'react'

type Listener = () => void

export function createStore<T>(init: T) {
  let state = init
  const listeners = new Set<Listener>()
  return {
    getState: () => state,
    setState(partial: Partial<T> | ((s: T) => Partial<T>)) {
      const next = typeof partial === 'function' ? partial(state) : partial
      state = { ...state, ...next }          // new reference -> subscribers notice
      listeners.forEach((l) => l())
    },
    subscribe(l: Listener) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

export function useStore<T, S>(store: ReturnType<typeof createStore<T>>, select: (s: T) => S) {
  return useSyncExternalStore(store.subscribe, () => select(store.getState()))
}`,
        note: 'Re-implementing a library in miniature is the best test of whether you understood it. Notice that the selector result must be stable (a primitive or a memoized value) or useSyncExternalStore will loop; real Zustand handles this with equality functions.',
      },
      {
        title: 'Reading notes template',
        code: `// notes/tanstack-query.md (written as you read)
// Q: Why does useQuery not re-render when an unused field changes?
// A: QueryObserver tracks which result props were accessed
//    and only notifies when those change.
// Q: Why are queries classes, not hooks?
// A: The cache must outlive components and be shared across them;
//    the React bindings just subscribe to observers.`,
        note: 'Phrase notes as questions and answers. It forces you to explain the design, not just describe the code.',
      },
    ],
    realCase: {
      title: 'A form that re-rendered on every keystroke',
      story: `A team at a fictional insurance company built a 60-field claims form with \`useState\` per field lifted into one parent. Typing lagged badly on mid-range laptops. One engineer spent an afternoon reading React Hook Form's \`register\` and \`useWatch\` source and realised its key trick: keep values in refs and the DOM, and subscribe narrowly only where a value is displayed. They moved to that model (and to the library) and input latency dropped from noticeable to imperceptible. The lesson: the fix was not a micro-optimisation, it was a different *architecture* that the library source made obvious.`,
    },
    pitfalls: [
      'Reading files top to bottom without a question in mind; you retain almost nothing. Trace one concrete call instead.',
      'Copying internal patterns into app code where the constraints do not apply (e.g. hand-rolled external stores for state that is fine in useState).',
      'Ignoring tests and issue history, which explain the "weird" lines.',
      'Reading only the React binding layer and missing the framework-agnostic core where the real design lives.',
    ],
    exercise: {
      task: 'Pick TanStack Query. Write a tiny app with one useQuery, set a breakpoint inside the library, and trace what happens on mount, on window refocus, and when data comes back. Then write a 200-word explanation of how refetch-on-focus is wired.',
      hint: 'Search the source for focusManager and follow who subscribes to it.',
      solution: `A good answer covers: \`focusManager\` listens to \`visibilitychange\` once globally; when focus returns it notifies the \`QueryClient\`, which tells the query cache; each \`Query\` asks its observers whether they want a refetch (based on \`refetchOnWindowFocus\` and staleness); stale queries with active observers refetch; observers then compute a new result and notify subscribed components via \`useSyncExternalStore\`.

\`\`\`ts
// minimal repro used while tracing
const { data } = useQuery({ queryKey: ['todos'], queryFn: fetchTodos, staleTime: 0 })
\`\`\``,
    },
    interview: [
      'Pick a library you use heavily. Explain one non-obvious design decision in it and the problem it solves.',
      'Why do many state libraries use useSyncExternalStore instead of React context?',
      'How does React Hook Form avoid re-rendering the whole form on each keystroke?',
    ],
  },

  oss: {
    explanation: `Contributing to open source builds skills no tutorial gives you: reading an unfamiliar codebase, matching someone else's conventions, writing a reproduction, and communicating asynchronously with maintainers who owe you nothing.

### Where to start
- **Libraries you already use.** You have context, you have hit their rough edges, and you can test your change in a real project.
- **Documentation fixes.** A broken example, a missing TypeScript signature, an outdated API name. These are genuinely valuable and teach you the contribution workflow with low risk.
- **Issues labelled "good first issue" or "help wanted".** Comment before starting so two people do not do the same work.
- **Reproductions.** Turning a vague bug report into a minimal sandbox or repo is one of the most appreciated contributions and does not even require a PR.

### How a good contribution flows
1. Read \`CONTRIBUTING.md\`, the code of conduct, and recent merged PRs to learn conventions.
2. For anything bigger than a typo, open or comment on an issue first and agree the approach.
3. Fork, branch, and run the project's own test and lint scripts locally.
4. Write a failing test first when fixing a bug.
5. Keep the PR small and focused; one concern per PR.
6. Fill in the PR template: what, why, how tested, screenshots for UI.
7. Add a changeset or changelog entry if the repo uses one.
8. Respond to review promptly and without defensiveness.

### Etiquette and mindset
Maintainers are often volunteers. Do not ping repeatedly, do not demand timelines, and do not open giant refactors nobody asked for. If a PR is declined, ask what would make it acceptable or accept the decision gracefully; the design call belongs to the maintainers.

### Why it matters for your career
Merged PRs are public evidence of skill. More importantly, the habits (minimal repros, focused diffs, tests first, clear written communication) transfer directly to your day job and make you the person teammates trust with hard bugs.

### Licences, briefly
Check the licence before copying code between projects, and check your employer's policy on contributing during work time. Some projects require signing a Contributor Licence Agreement or adding a DCO sign-off to commits.`,
    examples: [
      {
        title: '❌ vague issue vs ✅ actionable issue',
        code: `// ❌
// Title: useQuery broken
// Body: it doesn't work after upgrading, please fix asap

// ✅
// Title: useQuery returns stale data after setQueryData with select in v5.x
// Environment: @tanstack/react-query 5.x, React 19, Vite
// Repro: link to a minimal 30-line sandbox
// Steps: 1. click "Update" 2. observe list
// Expected: list shows new item
// Actual: list unchanged until refocus
// Notes: works if select is removed; suspect memoized select result`,
        note: 'The good issue gives exact versions, a minimal reproduction, expected vs actual, and a hypothesis. Maintainers can act on it in minutes.',
      },
      {
        title: 'A focused docs PR description',
        code: `## What
Fix the \`useMutation\` example in the optimistic updates guide.

## Why
The example calls \`queryClient.setQueryData\` with an old signature,
which fails type-checking in the current major version (see #1234).

## How tested
- Ran the snippet in a fresh Vite + TS project
- \`pnpm docs:build\` passes`,
        note: 'Small scope, linked issue, and evidence of testing. This is the shape of a PR that gets merged quickly.',
      },
    ],
    realCase: {
      title: 'From workaround to upstream fix',
      story: `A developer at a fictional logistics startup kept a local patch (via patch-package) for a date-picker library because it mis-handled a timezone edge case. Each upgrade broke the patch. They wrote a failing test reproducing the bug in the library repo, opened an issue with it, and then a 12-line PR. It was merged in a week; the team deleted their patch and the upgrade pain disappeared. Lesson: upstreaming fixes is often cheaper than maintaining forks, and a failing test is the most persuasive argument you can bring.`,
    },
    pitfalls: [
      'Opening a large PR without discussing the approach first; it is likely to be rejected or stall.',
      "Skipping the project's lint, tests or changeset step, which creates work for maintainers.",
      'Mixing unrelated formatting changes into a bug fix, making the diff hard to review.',
      'Taking review comments personally or pinging maintainers for merges.',
    ],
    exercise: {
      task: "Find one documentation error or unclear example in a React library you use. Open a PR (or prepare one locally) that fixes it, following that repo's contributing guide.",
      hint: 'Copy every example from one docs page into a fresh project with strict TypeScript; one of them is likely to be wrong.',
      solution: `A complete solution includes:
- A forked repo with a branch like \`docs/fix-mutation-example\`
- The corrected snippet, verified in a scratch project
- A PR description with What / Why / How tested, linking any related issue
- Any required changeset or sign-off

\`\`\`bash
git checkout -b docs/fix-mutation-example
pnpm install && pnpm lint && pnpm test
git commit -s -m "docs: fix setQueryData signature in optimistic updates guide"
\`\`\``,
    },
    interview: [
      'Tell me about an open-source contribution you made. What did you learn about the codebase?',
      'How would you write a bug report that a maintainer can act on quickly?',
      'When would you upstream a fix versus keeping a local patch?',
    ],
  },

  publish: {
    explanation: `Publishing a React package to npm forces you to think about everything your app code gets for free: build output formats, peer dependencies, types, tree-shaking, and versioning promises to strangers.

### Package shape
A modern React library typically ships **ESM** (optionally CJS too), **TypeScript declarations**, and declares React as a **peer dependency** so consumers do not end up with two copies of React (which breaks hooks with the "invalid hook call" error).

Key \`package.json\` fields:
- \`exports\`: the authoritative map of entry points, with \`types\` listed first in each condition.
- \`peerDependencies\`: \`react\` and \`react-dom\` with a version range you actually test.
- \`sideEffects: false\` (or a list of CSS files) so bundlers can tree-shake.
- \`files\`: only ship \`dist\`, not tests or stray source files.

Tools like tsup or Vite library mode build this for you. Run a checker such as \`publint\` and "are the types wrong" before releasing.

### Semantic versioning
- **patch**: bug fix, no API change.
- **minor**: new feature, backwards compatible.
- **major**: breaking change, including dropping a React version or changing a default.

Types are part of your API. Narrowing a prop type can break consumers' builds, so treat it as breaking.

### Changesets
Changesets separates *describing* a change from *releasing* it. Each PR adds a small markdown file declaring which packages bump and how. A release workflow later collects them, bumps versions, writes \`CHANGELOG.md\`, and publishes. This scales well in monorepos and keeps changelogs human-written.

### Quality bar for a public package
- Tests (unit with Vitest + Testing Library; type tests with \`expectTypeOf\`).
- A README with install, a minimal example, API reference, and SSR notes.
- \`'use client'\` at the top of entry files that use hooks or browser APIs, so it works in Server Component apps.
- No access to browser globals at import time (SSR safety).
- A clear support policy: which React versions, which browsers.

### When not to publish
If only one internal app uses it, a workspace package in a monorepo is simpler. Publishing adds a maintenance contract.`,
    examples: [
      {
        title: '❌ vs ✅ package.json for a hook library',
        code: `// ❌ React as a dependency, no exports map, ships raw source
{
  "name": "use-debounced-value",
  "main": "src/index.ts",
  "dependencies": { "react": "^19.0.0" }
}

// ✅
{
  "name": "@acme/use-debounced-value",
  "version": "1.2.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "sideEffects": false,
  "peerDependencies": { "react": "^18.0.0 || ^19.0.0" },
  "devDependencies": { "react": "^19.0.0", "tsup": "^8.0.0", "@changesets/cli": "^2.27.0" },
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "release": "pnpm build && changeset publish"
  }
}`,
        note: "React must be a peerDependency so the consumer's single copy is used. An exports map with types first gives correct resolution under modern TypeScript module resolution.",
      },
      {
        title: 'A changeset file',
        code: `---
"@acme/use-debounced-value": minor
---

Add a \`leading\` option that fires the first update immediately.`,
        note: 'Written in the PR that makes the change. The release workflow turns it into a version bump and a changelog entry.',
      },
      {
        title: 'Client-safe entry for RSC apps',
        code: `'use client'
import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}`,
        note: 'The directive marks the module as a client boundary so Next.js App Router users can import it from a Server Component tree. Make sure your bundler preserves the directive in the output.',
      },
    ],
    realCase: {
      title: 'The "invalid hook call" support flood',
      story: `A fictional design-system team published their component library with \`react\` in \`dependencies\`. Consumers on a slightly different React version ended up with two copies in their bundle, and every hook threw "Invalid hook call". The team moved React to \`peerDependencies\`, added a CI job that installs the packed tarball into fresh apps on React 18 and 19, and released a patch. Lesson: packaging mistakes look like runtime bugs to your users; test the published artifact, not just the source.`,
    },
    pitfalls: [
      'Listing react under dependencies instead of peerDependencies, causing duplicate React copies.',
      'Changing types or defaults in a minor release; consumers experience it as breaking.',
      "Forgetting 'use client' (or having the bundler strip it), breaking Server Component consumers.",
      'Publishing tests or secrets because files was not set; check with npm pack --dry-run.',
    ],
    exercise: {
      task: 'Package a useLocalStorage hook as a publishable library: tsup build, exports map, peer deps, a Vitest test, Changesets configured, and verify with npm pack --dry-run and publint.',
      hint: 'Guard window access so importing the module on the server does not throw, and give useSyncExternalStore a server snapshot.',
      solution: `\`\`\`ts
'use client'
import { useCallback, useSyncExternalStore } from 'react'

export function useLocalStorage(key: string, initial: string) {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener('storage', cb)
    return () => window.removeEventListener('storage', cb)
  }, [])
  const value = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) ?? initial,
    () => initial, // server snapshot: no window
  )
  const set = useCallback((v: string) => {
    localStorage.setItem(key, v)
    window.dispatchEvent(new StorageEvent('storage', { key }))
  }, [key])
  return [value, set] as const
}
\`\`\`

Then run \`pnpm changeset init\`, add the package.json fields from the example, run \`npx publint\` and \`npm pack --dry-run\`, and confirm only \`dist\` is included.`,
    },
    interview: [
      'Why should a React component library declare React as a peer dependency?',
      'Is changing a prop type from string to a union of literals a breaking change? Why?',
      'How does Changesets differ from writing the changelog at release time?',
    ],
  },

  teach: {
    explanation: `Teaching is a learning technique disguised as generosity. When you try to explain why an effect runs twice in development or why keys matter, you discover exactly which parts you only *thought* you understood.

### Formats, from small to large
- **Pairing and code review comments**: the cheapest teaching, done daily.
- **Internal docs and short posts**: one concept, one example, one gotcha.
- **Lunch-and-learns or meetup talks**: 15 to 25 minutes on a single idea.
- **Mentoring**: a recurring relationship focused on someone else's goals.

### How to explain technical ideas well
1. **Start from the problem**, not the API. "Your list loses input focus when you reorder it" lands better than "keys are identifiers".
2. **Build the mental model** with one small diagram or analogy, then show the real code.
3. **Show the failure first.** A broken demo followed by the fix sticks in memory.
4. **One idea per piece.** If a post needs three subheadings of caveats, split it.
5. **Check accuracy.** Run every snippet, point to official docs, and date your content, since React and Next.js change.

### Mentoring juniors
Good mentoring is mostly asking questions: "What did you try? What did you expect? What happened?" Resist taking the keyboard. Agree on goals, give feedback that is specific and timely, and celebrate progress publicly. Point to sources so they learn to find answers, not just to ask you.

### The Feynman loop
Write an explanation as if for a newcomer. Wherever you reach for jargon or hand-waving, that is a gap; go back to the source or code, then rewrite. Repeat until it is simple *and* correct.

### Why it matters for seniority
Senior engineers multiply a team's output. The ability to explain trade-offs clearly is also exactly what interviews, design reviews and ADRs test. Teaching is practice for all of them.`,
    examples: [
      {
        title: '❌ vs ✅ explaining stale closures to a junior',
        code: `// ❌ "It's a stale closure, just add it to the deps."

// ✅ Show it:
function Timer() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setCount(count + 1), 1000) // captures count = 0 forever
    return () => clearInterval(id)
  }, [])
  return <p>{count}</p> // stuck at 1
}
// "Each render has its own count. The effect ran once, in the first render,
//  so it only ever sees count = 0. Two fixes: setCount(c => c + 1),
//  or add count to deps (which recreates the interval each tick)."`,
        note: 'The good explanation shows the failure, names the mechanism (each render captures its own values), and offers fixes with their trade-offs.',
      },
      {
        title: 'Talk outline skeleton',
        code: `// 20-minute talk: "Why your Next.js page is dynamic"
// 1. Hook (2m): a page that should be static is slow - live demo
// 2. Mental model (5m): static shell vs dynamic holes, diagram
// 3. Cause (5m): reading cookies() at the top of the page
// 4. Fix (5m): move it into a Suspense-wrapped component; add 'use cache'
// 5. Takeaways (3m): 3 bullets, pointer to the docs`,
        note: 'One problem, one model, one fix. A demo of the failure up front gives the audience a reason to care.',
      },
    ],
    realCase: {
      title: 'A weekly 20-minute session that cut onboarding time',
      story: `At a fictional fintech, new frontend hires took weeks to stop introducing effect bugs. A senior engineer started a weekly 20-minute "one concept" session (keys, effects, Suspense, caching), recorded each one, and turned the notes into an internal handbook. Within a quarter, review comments about the same mistakes dropped noticeably and new hires referenced the handbook in their PRs. The engineer also noted that preparing each session exposed two misconceptions of their own about Strict Mode. Lesson: teaching scales knowledge and sharpens the teacher.`,
    },
    pitfalls: [
      'Explaining the API instead of the problem it solves.',
      'Publishing untested snippets that no longer work with current React or Next.js versions.',
      'Taking the keyboard while mentoring, which teaches the mentee to wait for you.',
      'Covering too much in one talk or post.',
    ],
    exercise: {
      task: 'Write a 600-word post explaining why React needs keys in lists, with a broken demo and a fixed one. Have someone less experienced read it and note where they got lost.',
      hint: 'Use an input inside each list item; reorder the list with index keys and show the typed text staying in the wrong row.',
      solution: `Structure:
1. Problem: a todo list where typed text appears in the wrong row after sorting.
2. Model: React matches children between renders by key; with index keys, position 0 is always "the same item".
3. Demo:

\`\`\`tsx
{todos.map((t, i) => <li key={i}><input defaultValue={t.text} /></li>)}   // ❌
{todos.map((t) => <li key={t.id}><input defaultValue={t.text} /></li>)}  // ✅
\`\`\`

4. When index keys are fine (static lists that never reorder).
5. Takeaway: keys are identity, not just a warning silencer.`,
    },
    interview: [
      'Explain the difference between useMemo and useCallback to a junior developer in under a minute.',
      'Tell me about a time you mentored someone. How did you know it worked?',
      'How do you keep technical content you write accurate as frameworks change?',
    ],
  },

  review: {
    explanation: `Code review is where a team's quality bar is actually enforced. Good reviewers catch bugs, but their bigger impact is spreading knowledge and keeping the codebase coherent.

### What to review, in priority order
1. **Correctness**: does it do what the ticket says? Edge cases: empty, loading, error, very long text, double-click, slow network, unauthorised user.
2. **Security**: Server Actions and route handlers validate input and check authorisation; no \`dangerouslySetInnerHTML\` on untrusted data; no secrets in client code (in Next.js only \`NEXT_PUBLIC_\` variables are inlined into the browser bundle, by design).
3. **Accessibility**: semantic elements, labels, keyboard support, focus management in dialogs, colour contrast.
4. **React-specific issues**: effects used for derived state, missing cleanup, unstable keys, state that should live in the URL, client components that could be server components, request waterfalls.
5. **Performance**: large client bundles, unnecessary re-renders in hot paths, unoptimised images.
6. **Maintainability**: naming, cohesion, tests that assert behaviour rather than implementation.
7. **Style**: should be automated by Prettier and ESLint, so humans should rarely comment on it.

### How to write comments
- Be **specific**: point to the line, explain the consequence, propose a fix.
- Label severity: **blocking**, **suggestion**, **nit**, **question**. Conventional Comments is a popular format.
- Ask questions when unsure ("Could this run on the server?") rather than asserting.
- Praise good work concretely; it signals which patterns to repeat.
- Critique the code, never the person.

### As an author
Keep PRs small (a few hundred lines), write a description with context and screenshots, self-review first, and link the preview deployment. Large PRs get shallow reviews.

### Speed matters
Slow reviews encourage huge batched PRs. Many teams aim to give a first response within one working day. If you cannot review deeply, say so and suggest who can.`,
    examples: [
      {
        title: '❌ vs ✅ review comments',
        code: `// ❌ "This is wrong."
// ❌ "Why would you do it like this??"
// ❌ "nit: use const" (should be a lint rule)

// ✅ blocking: deleteInvoice is a Server Action, so anyone can call it
//    with any id. We need to check the session user owns the invoice
//    before deleting, e.g.
//      const session = await auth()
//      if (!session) throw new Error('Unauthorized')
//      await db.invoice.delete({ where: { id, ownerId: session.user.id } })

// ✅ suggestion: fullName is derived from first/last, so it can be
//    computed during render instead of synced with useEffect. That removes
//    an extra render and a possible flicker.

// ✅ question: should the filter live in the URL (?status=paid) so it
//    survives refresh and can be shared?`,
        note: 'Each good comment states severity, the consequence, and a concrete fix or question. Style nits are left to tooling.',
      },
      {
        title: 'PR description template',
        code: `## Context
Ticket: BILL-412. Users can bulk-archive invoices.

## Changes
- New archiveInvoices Server Action (zod-validated, owner check)
- Checkbox column + bulk bar in InvoiceTable
- updateTag('invoices') after the mutation

## Screenshots / preview
Preview deployment link, before/after screenshots

## Testing
- Unit: action rejects ids the user does not own
- E2E: select 3 rows -> archive -> rows disappear

## Risks
Large selections (>500) not batched yet; follow-up BILL-415`,
        note: 'Reviewers get context, scope, evidence and known risks up front, which makes a deep review feasible.',
      },
    ],
    realCase: {
      title: 'The Server Action that slipped through a skim',
      story: `At a fictional SaaS company, a 1,400-line PR added a team-settings page. Reviewers skimmed it and approved. One Server Action, \`removeMember(teamId, userId)\`, checked that the caller was logged in but not that they were an admin of *that* team. A customer discovered they could remove members from other teams by calling the action with different ids. The fix was a two-line authorisation check, plus two team rules: PRs over roughly 400 lines get split, and every \`'use server'\` function gets a security checklist item in review. Lesson: big PRs hide small, critical bugs.`,
    },
    pitfalls: [
      'Spending review energy on formatting instead of correctness, security and accessibility.',
      'Approving huge PRs after a skim; ask for them to be split.',
      'Vague or harsh comments that do not explain the consequence or offer a path forward.',
      'Not marking severity, so authors cannot tell blockers from preferences.',
    ],
    exercise: {
      task: `Review the following component and write at least four comments with severity labels.

\`\`\`tsx
export default function Search({ items }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState(items)
  useEffect(() => { setResults(items.filter(i => i.name.includes(q))) }, [q])
  return (
    <div>
      <div onClick={() => setQ('')}>clear</div>
      <input value={q} onChange={e => setQ(e.target.value)} />
      {results.map((r, i) => <div key={i} dangerouslySetInnerHTML={{ __html: r.name }} />)}
    </div>
  )
}
\`\`\``,
      hint: 'Look at derived state, effect deps, accessibility, keys, XSS and types.',
      solution: `- **blocking (security)**: \`dangerouslySetInnerHTML\` with item names is an XSS risk; render \`{r.name}\` as text.
- **blocking (bug)**: the effect deps omit \`items\`, so results go stale when items change. Better: derive during render with \`const results = items.filter(...)\` and drop the state and effect.
- **blocking (a11y)**: a clickable \`div\` is not keyboard accessible; use \`<button type="button">\`. The input needs a label.
- **suggestion**: use \`key={r.id}\`, not the index.
- **suggestion**: type the props; consider case-insensitive matching and \`useDeferredValue\` for large lists.`,
    },
    interview: [
      'What do you look for first when reviewing a pull request?',
      "How do you give critical feedback on a senior colleague's PR?",
      'What would you check specifically in a PR that adds a Server Action?',
    ],
  },

  adr: {
    explanation: `An **Architecture Decision Record** is a short document capturing one significant decision: the context, the options considered, what was chosen, and the consequences. ADRs answer the question every new team member eventually asks: "why on earth did we do it this way?"

### What counts as significant
Decisions that are expensive to reverse or that shape lots of code:
- Rendering strategy (SPA vs Next.js App Router vs React Router framework mode).
- State management (server cache library, global client store, or none).
- Styling approach (CSS Modules, Tailwind, CSS-in-JS).
- Monorepo tooling, auth provider, ORM, testing strategy.

Choosing a date-formatting helper is not ADR-worthy.

### Anatomy
- **Title** with a number: "ADR-007: Use TanStack Query for server state".
- **Status**: proposed, accepted, deprecated, or superseded by a later ADR.
- **Context**: the forces at play: team size, constraints, current pain, deadlines.
- **Options**: two to four realistic ones, with honest pros and cons.
- **Decision**: what and why, in a few sentences.
- **Consequences**: positive and negative, including follow-up work.

### Process
Store ADRs in the repo (e.g. \`docs/adr/\`) so they are versioned with the code and reviewed via PR. Proposed ADRs are discussed in the PR; once merged, they are **immutable**. If you change your mind, write a new ADR that supersedes the old one and update the old one's status. This keeps history honest.

### Why it works
Writing forces clarity: if you cannot state the options and trade-offs, you have not finished deciding. It also depersonalises debates; the discussion is about written trade-offs, not who argues loudest. Months later, ADRs prevent relitigating settled questions, and they make it obvious when the original context has changed enough to revisit.

### Keep them lightweight
One to two pages. If nobody reads them, they are too long. Link them from the README and from code comments where the decision is visible.`,
    examples: [
      {
        title: 'ADR template filled in',
        code: `# ADR-009: Adopt Next.js Cache Components for the storefront

Status: Accepted (2026-03-14)
Deciders: web platform team

## Context
Product pages are mostly static but show per-user pricing. Today the whole
route is dynamic and TTFB is ~900 ms at p75. We are on Next.js 16.

## Options
1. Keep fully dynamic rendering - simple, slow.
2. Static pages + client-fetched pricing - fast shell, layout shift, extra API.
3. Cache Components: 'use cache' for catalog data with cacheTag,
   dynamic pricing inside a Suspense boundary - fast shell, streamed hole.

## Decision
Option 3. Catalog functions use 'use cache' + cacheLife('hours') + cacheTag('product-<id>').
Admin mutations invalidate with updateTag / revalidateTag.

## Consequences
+ Static shell served instantly; pricing streams in.
- Team must learn the caching model; add docs and examples.
- Every mutation path must invalidate tags; add a test per action.
Follow-up: ADR on cache observability.`,
        note: 'The context includes measurable pain, the options are real alternatives, and the consequences list the costs, not only the benefits.',
      },
      {
        title: '❌ vs ✅ decision statement',
        code: `// ❌ "We chose Zustand because it's better."
// ✅ "We chose Zustand for the small amount of cross-route UI state
//     (sidebar, command palette) because it needs no provider, has
//     selector-based subscriptions, and the team already knows it.
//     Server data stays in TanStack Query; Redux was rejected as more
//     ceremony than our 3 global values justify."`,
        note: 'A good decision ties the choice to the context and names what was rejected and why.',
      },
    ],
    realCase: {
      title: 'The CSS-in-JS choice nobody could explain',
      story: `A fictional retail company's frontend used a runtime CSS-in-JS library. When they adopted Server Components, styled components forced many files to become client components. A new lead wanted to know why the library had been chosen; nobody who made the decision was still on the team. They wrote ADR-001 retroactively (context: years earlier, no RSC, heavy theming needs), then ADR-014 superseding it with CSS Modules plus design tokens, documenting the RSC constraint and a phased migration. Later debates were short because the trade-offs were written down.`,
    },
    pitfalls: [
      'Writing ADRs after the fact only to justify a decision, omitting the real alternatives.',
      'Editing accepted ADRs instead of superseding them, which loses the history.',
      'Making them so long nobody reads them.',
      'Recording trivial decisions, which buries the important ones.',
    ],
    exercise: {
      task: 'Write an ADR for a real or hypothetical project choosing between TanStack Query, SWR, and plain fetching in Server Components.',
      hint: 'The context should mention whether you use the Next.js App Router and how much client-side interactivity (polling, optimistic updates) you need.',
      solution: `\`\`\`text
# ADR-004: Server data fetching strategy
Status: Accepted
## Context
Next.js 16 App Router. Most pages read data once; two screens need polling
and optimistic updates (inbox, kanban).
## Options
1. Fetch in Server Components only
2. TanStack Query everywhere
3. Server Components by default + TanStack Query on the two interactive screens
## Decision
Option 3. Server-render reads; seed TanStack Query with server-fetched
initial data on the interactive screens.
## Consequences
+ Minimal client JS on most pages; rich UX where needed.
- Two patterns to learn; document when to use which.
\`\`\``,
    },
    interview: [
      'What is an ADR and what decisions deserve one?',
      'Why should accepted ADRs be immutable?',
      'Walk me through an architecture decision you made, the alternatives, and what you would change now.',
    ],
  },

  current: {
    explanation: `React and its ecosystem move quickly: React 19 brought Actions, \`use\`, and the form hooks; the React Compiler reached a stable release; Next.js 16 made caching explicit with Cache Components and renamed \`middleware.ts\` to \`proxy.ts\`. Staying current is a skill: knowing what changed, why, and whether it matters for *your* codebase.

### Primary sources first
- **The React blog and docs**: release posts, upgrade guides, and deep explanations.
- **The RFCs repository**: proposals and the reasoning behind them before they ship.
- **Framework release notes and upgrade guides** for Next.js, React Router, TanStack.
- **React Conf and framework conference talks**: the core teams explain direction and motivation.
- **Changelogs of your dependencies**, ideally surfaced automatically via Renovate or Dependabot PRs.

### Curated secondary sources
Newsletters such as This Week in React summarise the ecosystem weekly. Use them to *discover*, then read the primary source before acting.

### A sustainable routine
- Weekly, 30 minutes: skim one newsletter and the release notes of your top dependencies.
- Monthly: try one new feature in a scratch project.
- Per major release: read the upgrade guide, run codemods on a branch, and note breaking changes for the team.

### Evaluate, do not chase
For each new thing ask: what problem does it solve? Do we have that problem? What is the migration cost? Is it stable, or experimental/canary? Many features start behind flags; production adoption should usually wait for stable releases.

### Spot outdated advice
Much online content predates the App Router, React 19, or the Compiler. Red flags: \`getServerSideProps\` in new App Router code, \`forwardRef\` presented as mandatory (React 19 passes \`ref\` as a regular prop), manual \`useMemo\` everywhere in compiler-enabled projects, \`middleware.ts\` in Next.js 16 tutorials, or assumptions about implicit fetch caching. Always check the date and the version.

### Share what you learn
A short internal "what changed this month" note helps the team and forces you to understand changes well enough to summarise them.`,
    examples: [
      {
        title: '❌ outdated vs ✅ current: refs in React 19',
        code: `// ❌ Pre-19 pattern: still works, but no longer necessary
const Input = forwardRef<HTMLInputElement, Props>(function Input(props, ref) {
  return <input ref={ref} {...props} />
})

// ✅ React 19: ref is a regular prop on function components
function Input({ ref, ...props }: Props & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />
}`,
        note: 'Knowing this lets you simplify new code and recognise older tutorials. The React team has signalled forwardRef will be deprecated in a future version; confirm its current status in the docs.',
      },
      {
        title: 'Next.js 16 rename: middleware to proxy',
        code: `// ❌ older tutorials: middleware.ts exporting middleware()
// ✅ Next.js 16: proxy.ts at the project root (or in src/)
import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  if (!request.cookies.has('session')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*'] }`,
        note: 'The file and function names changed; the concept did not. Check the Next.js upgrade guide for the exact current API and the available codemod.',
      },
    ],
    realCase: {
      title: 'Upgrading on a branch, not in a panic',
      story: `A fictional media company's team kept a "tech radar" doc updated monthly. When a new Next.js major shipped, they already knew from the release notes that caching defaults had changed. They ran the codemods on a branch, found three pages that had relied on implicit caching and had become dynamic, added \`'use cache'\` with tags, and shipped the upgrade in a week. A sister team that upgraded blindly saw a large rise in database load from pages that were no longer cached. Lesson: reading release notes is cheaper than incident response.`,
    },
    pitfalls: [
      'Adopting canary or experimental features in production because a talk made them look exciting.',
      'Following tutorials without checking their date and framework version.',
      'Relying on social media summaries instead of the release notes and upgrade guides.',
      'Ignoring dependency update PRs until a major upgrade becomes a massive project.',
    ],
    exercise: {
      task: 'Read the latest React and Next.js release posts. Write a one-page "what changed and does it affect us" note for a real or sample project, with an action list.',
      hint: 'Group items into: adopt now, try in a spike, watch, ignore, and justify each in one sentence.',
      solution: `Example structure:
- **Adopt now**: ref as a prop (simplifies 12 forwardRef components); proxy.ts rename via codemod.
- **Spike**: enable the React Compiler on one route and compare re-render counts in the Profiler.
- **Watch**: features still marked experimental or canary.
- **Ignore**: features for frameworks we do not use.
- **Actions**: 1. Create an upgrade branch. 2. Run codemods. 3. Update lint rules. 4. Share the summary with the team.`,
    },
    interview: [
      'What changed in React 19 that affects how you write components day to day?',
      'How do you decide whether to adopt a newly released feature?',
      "How do you keep a large codebase's dependencies up to date without big-bang upgrades?",
    ],
  },

  interview: {
    explanation: `Senior React interviews rarely test trivia. They test whether you can **build something real under time pressure while explaining trade-offs**. The classic exercises (autocomplete, modal, infinite scroll, data table) are chosen because each hides traps in async state, accessibility and performance.

### The approach that works
1. **Clarify requirements** (2 to 3 minutes): data source, size, keyboard support, mobile, error states. Interviewers reward good questions.
2. **Sketch the component API and state** before coding: which props, which state, what is derived.
3. **Build the happy path** quickly.
4. **Harden it**: loading, empty, error, race conditions, accessibility.
5. **Discuss trade-offs and extensions**: virtualisation, caching, testing, what you would do with more time.

Narrate throughout. Silence makes it hard for the interviewer to give you credit.

### The four classics and their traps
- **Autocomplete**: debounce input; cancel stale requests with \`AbortController\` or ignore out-of-order responses; follow the ARIA combobox pattern (\`role="combobox"\`, \`aria-expanded\`, \`aria-activedescendant\`, listbox options); support arrow keys, Enter and Escape.
- **Modal**: use the native \`<dialog>\` element or a portal; trap focus; return focus to the trigger on close; Escape closes; give it an accessible name; prevent background scroll.
- **Infinite scroll**: \`IntersectionObserver\` on a sentinel element; avoid duplicate fetches while one is in flight; handle end-of-list and errors; consider virtualisation for very long lists and a "Load more" button for accessibility.
- **Data table**: sorting, filtering, pagination; derive visible rows during render (with \`useMemo\` if expensive); keep sort and filter in the URL; use a semantic \`<table>\` with \`aria-sort\`; stable row keys.

### Signals interviewers look for
- You derive state rather than syncing it with effects.
- You handle races and cleanup.
- You think about accessibility without being prompted.
- You can say "I would not optimise this yet, but if the list grew to 10k rows I would virtualise".
- You write, or at least describe, tests.

### Practice
Time-box each exercise to 45 minutes, record yourself, and review where you went silent or got stuck.`,
    examples: [
      {
        title: '❌ racy vs ✅ race-safe autocomplete fetch',
        code: `// ❌ Responses can arrive out of order: "re" results may land after "rea"
useEffect(() => {
  fetch(\`/api/search?q=\${q}\`).then((r) => r.json()).then(setResults)
}, [q])

// ✅ Debounce + abort the previous request
useEffect(() => {
  if (!q) { setResults([]); return }
  const ctrl = new AbortController()
  const id = setTimeout(async () => {
    try {
      const res = await fetch(\`/api/search?q=\${encodeURIComponent(q)}\`, { signal: ctrl.signal })
      if (!res.ok) throw new Error(String(res.status))
      setResults(await res.json())
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError('Search failed')
    }
  }, 250)
  return () => { clearTimeout(id); ctrl.abort() }
}, [q])`,
        note: 'The cleanup cancels both the pending debounce and the in-flight request, so only the latest query can set results. Also note encodeURIComponent on user input.',
      },
      {
        title: 'Accessible modal with the native dialog element',
        code: `function ConfirmDialog({ open, onClose, onConfirm }: {
  open: boolean; onClose: () => void; onConfirm: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()   // inert background, Escape, top layer
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} aria-labelledby="confirm-title" onClose={onClose}>
      <h2 id="confirm-title">Delete project?</h2>
      <button onClick={onClose}>Cancel</button>
      <button onClick={onConfirm} autoFocus>Delete</button>
    </dialog>
  )
}`,
        note: 'showModal gives modal semantics, an inert background and Escape handling for free, and browsers return focus to the previously focused element on close. Mentioning this shows platform knowledge.',
      },
    ],
    realCase: {
      title: 'The candidate who asked the right questions',
      story: `In a fictional company's interview loop, two candidates built an autocomplete. The first wrote clean code fast but never handled out-of-order responses or keyboard navigation. The second spent three minutes asking about data size and accessibility needs, built a simpler UI, but added abort-on-change and arrow-key navigation, and explained how they would test it with Testing Library and MSW. The panel hired the second. Lesson: senior signal comes from judgement and completeness, not typing speed.`,
    },
    pitfalls: [
      'Starting to code before clarifying requirements.',
      'Ignoring race conditions in async UI; it is the most common hidden test.',
      'Forgetting keyboard and screen-reader support.',
      'Reaching for memoization or libraries prematurely instead of explaining when they would be needed.',
      'Working in silence.',
    ],
    exercise: {
      task: 'In 45 minutes, build an infinite-scrolling list of issues from a mock API (page size 20), with loading, error-retry and end-of-list states. Narrate as you go and record yourself.',
      hint: 'Use IntersectionObserver on a sentinel div and a status value to prevent double-loading.',
      solution: `\`\`\`tsx
function IssueList() {
  const [items, setItems] = useState<Issue[]>([])
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'done'>('idle')
  const sentinel = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (status === 'loading' || status === 'done') return
    setStatus('loading')
    try {
      const res = await fetch(\`/api/issues?page=\${page}\`)
      const next: Issue[] = await res.json()
      setItems((prev) => [...prev, ...next])
      setPage((p) => p + 1)
      setStatus(next.length < 20 ? 'done' : 'idle')
    } catch { setStatus('error') }
  }, [page, status])

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) load() })
    io.observe(el)
    return () => io.disconnect()
  }, [load])

  return (
    <>
      <ul>{items.map((i) => <li key={i.id}>{i.title}</li>)}</ul>
      {status === 'error' && <button onClick={load}>Retry</button>}
      {status === 'done' ? <p>No more issues</p> : <div ref={sentinel} aria-hidden />}
      {status === 'loading' && <p role="status">Loading…</p>}
    </>
  )
}
\`\`\`
Then discuss: virtualisation for thousands of rows, TanStack Query's useInfiniteQuery, and a "Load more" button fallback.`,
    },
    interview: [
      'Build an autocomplete. How do you handle responses that arrive out of order?',
      'What does an accessible modal need beyond being visible on top of the page?',
      'When would you virtualise a list, and what does it cost you?',
    ],
  },
}

export default details
