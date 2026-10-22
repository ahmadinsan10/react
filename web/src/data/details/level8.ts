import type { TopicDetail } from '../types'

const details: Record<string, TopicDetail> = {
  measure: {
    explanation: `Performance work without measurement is guessing, and guesses about where time goes are wrong surprisingly often. The discipline is: **define the user-facing metric, reproduce the slowness, record a baseline, change one thing, measure again**.

### Core Web Vitals
Google's Core Web Vitals describe user experience in three numbers, measured at the 75th percentile of real page loads:
- **LCP (Largest Contentful Paint)**: when the main content (hero image, headline) is painted. Good: 2.5 s or less. Affected by server response time, render-blocking resources, image size and client-side rendering waterfalls.
- **INP (Interaction to Next Paint)**: responsiveness. For each click, tap or key press, the time from input until the next frame is painted; the reported value is roughly the worst interaction of the visit. Good: 200 ms or less. INP replaced FID in March 2024 because FID only measured the *delay before* the first interaction's handler ran, ignoring handler and render time. For React apps, INP is usually the metric that suffers: long renders after clicks or typing.
- **CLS (Cumulative Layout Shift)**: unexpected movement of content. Good: 0.1 or less. Caused by images without dimensions, late-loading banners and fonts swapping.

### Lab vs field
- **Lab data** (Lighthouse, Performance panel) is reproducible and great for debugging, but uses one device and network profile. Lighthouse cannot measure INP since it does not interact; it reports Total Blocking Time as a proxy.
- **Field data** (Real User Monitoring with the \`web-vitals\` library, Chrome UX Report) shows what real users experience across devices. Field data tells you *whether* there is a problem; lab tools tell you *why*.

### The tools
- **React DevTools Profiler**: records commits. The flamegraph shows each component's render time in a commit; enable "Record why each component rendered while profiling" to see the cause (props changed, state, context, parent). The ranked view sorts by cost.
- **Chrome Performance panel**: the ground truth for the main thread. Look for long tasks (over 50 ms, marked red), see JS, style, layout and paint, and with React 19.2+ the React performance tracks show scheduler priorities and component renders in the timeline. Use **4x or 6x CPU throttling** to approximate mid-range phones.
- **Lighthouse**: audits for loading performance, accessibility and best practices.
- **Bundle analyzers** (e.g. rollup-plugin-visualizer) for what you ship.

### A good measurement habit
1. Write down the scenario ("typing in the filter box with 5,000 rows").
2. Profile with throttling in a **production build** (development builds are much slower and misleading).
3. Record numbers: interaction duration, commit time, long tasks.
4. Fix the biggest cost, re-measure, keep notes. If the number did not move, revert.`,
    examples: [
      {
        title: '✅ Reporting Web Vitals from real users',
        code: `// src/vitals.ts
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals/attribution'

function send(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
    id: metric.id,
    page: location.pathname,
    // attribution says WHAT was slow, e.g. the INP target element and phase breakdown
    attribution:
      metric.name === 'INP'
        ? { target: (metric as any).attribution?.interactionTarget, processing: (metric as any).attribution?.processingDuration }
        : undefined,
  })
  navigator.sendBeacon?.('/analytics/vitals', body) || fetch('/analytics/vitals', { body, method: 'POST', keepalive: true })
}

onLCP(send)
onINP(send)
onCLS(send)`,
        note: 'The attribution build tells you which element was interacted with and whether time went to input delay, processing or presentation. sendBeacon survives page unload.',
      },
      {
        title: '✅ Measuring a specific interaction in code',
        code: `import { Profiler, type ProfilerOnRenderCallback } from 'react'

const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration) => {
  if (actualDuration > 16) {
    console.warn(\`[\${id}] \${phase} took \${actualDuration.toFixed(1)}ms (unmemoized estimate \${baseDuration.toFixed(1)}ms)\`)
  }
}

export function OrdersPage() {
  return (
    <Profiler id="OrdersTable" onRender={onRender}>
      <OrdersTable />
    </Profiler>
  )
}

// And for user timing visible in the Performance panel:
performance.mark('filter-start')
// ...state update...
requestAnimationFrame(() => setTimeout(() => performance.measure('filter', 'filter-start')))`,
        note: 'actualDuration is the time spent rendering this commit; baseDuration estimates a full re-render without memoization. Profiler adds overhead, so use it on targeted subtrees or in profiling builds.',
      },
    ],
    realCase: {
      title: 'An INP regression hidden by good Lighthouse scores',
      story: `**Situation:** A travel booking site scored 95 in Lighthouse after a redesign.

**Symptom:** Field data showed INP at the 75th percentile rising from 180 ms to 420 ms on mobile; conversion on the search page dropped.

**Root cause:** Lighthouse measured page load without interacting. The new date-range picker re-rendered the entire results list (300 cards with images and price calculations) on every hover over a date. RUM attribution pointed at the calendar cells as the interaction target; a Performance trace with 4x throttling showed 350 ms React commits.

**Fix:** Hover state moved into the calendar component, the results list was wrapped in a deferred value, and price formatting was moved out of render. INP returned to 160 ms.

**Lesson:** Lab scores can be green while users suffer. Collect field INP with attribution, then reproduce in the lab.`,
    },
    pitfalls: [
      'Profiling the development build, which includes extra checks and is much slower than production.',
      'Testing only on a fast developer laptop without CPU throttling.',
      'Treating a Lighthouse score as proof of good responsiveness; it cannot measure INP.',
      'Changing several things at once, so you cannot tell which one helped.',
    ],
    exercise: {
      task: 'Pick a page in your app with a noticeable interaction (filtering, opening a panel). Record a Performance trace with 4x CPU throttling and a React Profiler session. Write down: the interaction duration, the slowest component, and why it rendered.',
      hint: 'Enable "Record why each component rendered" in Profiler settings. In the Performance panel, look at the Interactions track to find the interaction duration.',
      solution: `A good write-up looks like:

- Scenario: typing "berlin" in the city filter, production build, 4x throttling.
- Interactions track: keypress 310 ms (input delay 8 ms, processing 270 ms, presentation 32 ms).
- Profiler: \`ResultsList\` 240 ms per commit, rendered because "props changed: items"; 400 \`ResultCard\` children each about 0.5 ms.
- Hypothesis: the list re-renders on every keystroke even though only the input needs to update urgently.
- Next step: defer the list with \`useDeferredValue\` and confirm the input keystroke drops below 50 ms.`,
    },
    interview: [
      'What does INP measure, and why did it replace FID?',
      'What is the difference between lab and field performance data, and why do you need both?',
      'Walk me through how you would investigate a report that "the page feels slow when typing".',
    ],
  },

  rerenders: {
    explanation: `A **render** is React calling your component function to get a description of the UI. A **commit** is React applying the differences to the DOM. Confusing the two leads to wasted optimisation effort.

### What triggers a render
A component renders when:
1. **Its state changes** (\`useState\`, \`useReducer\` setter called with a different value by \`Object.is\`).
2. **Its parent renders**. By default React re-renders all children of a rendering component, regardless of whether their props changed. Props do not cause renders; parent renders do.
3. **A context it reads changes value** (by \`Object.is\`). Every consumer of that context renders, even if it only uses one field of an object.
4. An external store subscribed via \`useSyncExternalStore\` reports a change (this is how Redux, Zustand and others trigger renders, usually with selectors to limit them).

Note what is *not* on the list: changing a ref, mutating an object, or a prop being a "new" object if the parent did not render.

### Render is not DOM update
After rendering, React compares (reconciles) the new element tree with the previous one and only touches DOM nodes whose output changed. A parent with 200 children that re-renders may update one text node. Most re-renders are cheap: calling a function and comparing a few objects takes microseconds.

### When re-renders become a problem
- The component does **expensive work during render**: sorting or filtering thousands of items, formatting, building charts.
- **Many components** render: a list of 2,000 rows each re-rendering because a parent keystroke changed state.
- Renders happen **at high frequency**: on every keystroke, scroll or mouse move.
- A **context with a frequently changing value** sits high in the tree.

### Identity and memoization
\`memo(Component)\` skips rendering when props are shallowly equal. But a parent that creates \`{}\`, \`[]\` or \`() => {}\` inline produces new identities every render, which defeats \`memo\`. That is why \`useMemo\` and \`useCallback\` existed, and why the **React Compiler** now handles this automatically: it memoizes JSX, values and callbacks based on their actual dependencies at build time.

### Seeing it
- React DevTools: "Highlight updates when components render" flashes rendering components.
- Profiler: "Why did this render?" shows the cause per component per commit.
- A temporary \`console.count('Row render')\` is a quick sanity check.

### The right mindset
Do not aim for zero re-renders. Aim for **no slow interactions**. Find the expensive render with the profiler, then reduce either how often it renders or how much it costs.`,
    examples: [
      {
        title: 'Why every row re-renders when you type',
        code: `// ❌ query state lives in the page, so every keystroke re-renders all 2,000 rows
function ProductsPage({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('')
  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} aria-label="Quick note" />
      <ProductTable products={products} /> {/* does not even use query */}
    </>
  )
}

// ✅ state colocated with the only component that needs it
function QuickNote() {
  const [query, setQuery] = useState('')
  return <input value={query} onChange={e => setQuery(e.target.value)} aria-label="Quick note" />
}
function ProductsPage({ products }: { products: Product[] }) {
  return (
    <>
      <QuickNote />
      <ProductTable products={products} />
    </>
  )
}`,
        note: 'ProductTable re-rendered not because its props changed, but because its parent rendered. Moving state down removes the cause entirely, no memoization needed.',
      },
      {
        title: 'Context: one field changes, every consumer renders',
        code: `// ❌ cursor position updates 60x/second; Sidebar and Header only need user
const AppCtx = createContext<{ user: User; cursor: { x: number; y: number } } | null>(null)

// ✅ split by update frequency
const UserCtx = createContext<User | null>(null)
const CursorCtx = createContext<{ x: number; y: number }>({ x: 0, y: 0 })

function Header() {
  const user = use(UserCtx) // no longer renders on mouse move
  return <span>{user?.name}</span>
}`,
        note: 'Context consumers re-render when the value identity changes. Splitting contexts by how often they change limits the blast radius.',
      },
    ],
    realCase: {
      title: 'A "global store in context" that made the whole app re-render',
      story: `**Situation:** A project-management app kept all client state (user, theme, open modals, drag position, notifications) in one \`AppContext\` value object created inside the provider.

**Symptom:** Dragging a task card was choppy; the Profiler showed 1,100 components rendering on every pointer move.

**Root cause:** The provider created a new value object whenever any field changed, so every consumer rendered. Drag position changed on each pointermove.

**Fix:** Drag state moved to local state in the board component (with the dragged card's transform applied via a ref and style). The remaining state was split into user, UI and notifications contexts; notifications moved to a small external store with selector subscriptions. Renders per pointer move dropped to 3.

**Lesson:** Know the four render triggers. Most "too many re-renders" problems are state living too high or in a too-broad context.`,
    },
    pitfalls: [
      'Believing that new props cause re-renders; parents rendering is the cause. Props only matter to memo.',
      'Equating re-render with DOM update and optimising cheap renders.',
      'Putting frequently changing values in a context consumed widely.',
      'Mutating state objects so Object.is sees no change and the component does not render at all.',
    ],
    exercise: {
      task: 'Build a page with a counter button and a list of 1,000 items that each log when they render. Find, with DevTools, why the items render when the counter changes. Then eliminate those renders without using memo.',
      hint: 'Either move the counter state into its own component, or pass the list as children of the component that owns the state.',
      solution: `\`\`\`tsx
function Counter() {
  const [n, setN] = useState(0)
  return <button onClick={() => setN(n + 1)}>Clicked {n} times</button>
}
export function Page({ items }: { items: string[] }) {
  return (
    <>
      <Counter />
      <ul>{items.map(i => <Item key={i} label={i} />)}</ul>
    </>
  )
}
\`\`\`
The Profiler's "why did this render" originally said "parent component rendered" for every Item. After moving state into Counter, clicking renders only Counter.`,
    },
    interview: [
      'List the reasons a React component re-renders. Do prop changes cause re-renders?',
      'What is the difference between rendering and committing?',
      'Why can a context provider high in the tree hurt performance, and how do you fix it?',
    ],
  },

  fixes: {
    explanation: `Once the profiler has identified a slow interaction, apply fixes from cheapest and most structural to most manual. Structural fixes remove work; memoization only skips it, and adds complexity.

### 1. Let the React Compiler do memoization
The React Compiler (stable since late 2025) is a build-time Babel plugin that analyses components and hooks and automatically memoizes JSX, computed values and callbacks with precise dependencies. With it enabled, most \`memo\`, \`useMemo\` and \`useCallback\` in application code becomes unnecessary. In React DevTools, compiled components show a **"Memo ✨"** badge. If a slow component lacks the badge, the compiler bailed out, usually because the code breaks the Rules of React (mutating props or state, reading refs during render, conditional hooks). The \`eslint-plugin-react-hooks\` compiler rules report these. Fix the rule violation and the compiler can optimise it.

### 2. Move state down
If state is held higher than needed, every component between the owner and the leaf renders on each change. Colocate state with the component that uses it. This is the single most effective fix and costs nothing.

### 3. Lift content up (children as props)
If a component must own frequently changing state (scroll position, hover, open/closed) but wraps an expensive subtree, accept that subtree as \`children\`. The \`children\` element was created by the parent, so when the wrapper's state changes, React sees the same element object and skips re-rendering it.

### 4. Split contexts
Separate values that change at different rates, and separate state from dispatch/setters (setters never change identity). Alternatively, use an external store with selectors (Zustand, Redux, \`useSyncExternalStore\`) so components subscribe to slices.

### 5. Make renders cheaper
- Move heavy computation out of render: precompute on the server, compute once when data arrives, or move it into a Web Worker.
- Avoid creating large derived structures per render; derive once per data change.
- Virtualize long lists.

### 6. Manual memoization, where proven
Without the compiler, or when the compiler cannot help (for example, a third-party component that needs a stable prop identity, or values passed to effect dependencies), use \`memo\`, \`useMemo\` and \`useCallback\` deliberately. Always verify with the Profiler that the change reduced commit time. Memoization costs memory and comparison time and is easily defeated by one unstable prop.

### 7. Use concurrent features
If work is inherently heavy but not urgent, \`useTransition\` or \`useDeferredValue\` keep the urgent update (typing, clicking) responsive while the heavy render happens in the background and can be interrupted.

### Keep evidence
For each change, record before/after numbers from the same scenario. Remove optimisations that did not help.`,
    examples: [
      {
        title: '✅ Lift content up: expensive subtree passed as children',
        code: `// ❌ ScrollTracker owns fast-changing state and renders the heavy Dashboard itself
function ScrollTracker() {
  const [y, setY] = useState(0)
  useEffect(() => {
    const on = () => setY(window.scrollY)
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <div>
      <ProgressBar value={y} />
      <Dashboard /> {/* re-renders on every scroll event */}
    </div>
  )
}

// ✅ Dashboard is created by the parent and passed in
function ScrollTracker({ children }: { children: React.ReactNode }) {
  const [y, setY] = useState(0)
  /* same effect */
  return (
    <div>
      <ProgressBar value={y} />
      {children}
    </div>
  )
}

<ScrollTracker>
  <Dashboard />
</ScrollTracker>`,
        note: 'The children element keeps the same identity across ScrollTracker renders, so React bails out of rendering Dashboard. No memo involved.',
      },
      {
        title: '❌ Compiler bail-out vs ✅ compiler-friendly code',
        code: `// ❌ Mutates a prop during render: breaks the Rules of React, compiler skips this component
function SortedOrders({ orders }: { orders: Order[] }) {
  orders.sort((a, b) => b.createdAt - a.createdAt)
  return <OrderList orders={orders} />
}

// ✅ Pure: the compiler memoizes the sorted copy and the JSX automatically
function SortedOrders({ orders }: { orders: Order[] }) {
  const sorted = orders.toSorted((a, b) => b.createdAt - a.createdAt)
  return <OrderList orders={sorted} />
}`,
        note: 'With the compiler enabled, the second version gets the Memo ✨ badge; sorting only reruns when orders changes. No useMemo needed.',
      },
      {
        title: '✅ Manual memo where the compiler is not available, verified',
        code: `const Row = memo(function Row({ order, onSelect }: { order: Order; onSelect: (id: string) => void }) {
  return (
    <tr>
      <td>{order.number}</td>
      <td><button onClick={() => onSelect(order.id)}>Open</button></td>
    </tr>
  )
})

function OrderTable({ orders }: { orders: Order[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const onSelect = useCallback((id: string) => setSelected(id), []) // stable identity for memo
  return <table><tbody>{orders.map(o => <Row key={o.id} order={o} onSelect={onSelect} />)}</tbody></table>
}
// Profiler before: 180ms commit on select. After: 6ms (only the parent renders).`,
        note: 'memo is useless without a stable onSelect. Record the profiler numbers to justify the code.',
      },
    ],
    realCase: {
      title: 'Removing 300 useMemo calls made the app faster',
      story: `**Situation:** A fintech dashboard had accumulated hundreds of \`useMemo\`/\`useCallback\` calls "for performance". Some inputs still felt laggy.

**Symptom:** The Profiler showed a large table rendering on every keystroke anyway; many memos had dependencies that changed every render (inline objects from parents).

**Root cause:** Memoization was applied without measurement and defeated by unstable inputs. The real issue was filter state stored in a page-level context.

**Fix:** The team enabled the React Compiler, fixed the lint-reported Rules of React violations so all components compiled, removed manual memoization in app code, and moved filter state into the filter bar with the table reading a deferred value. Code became shorter and the keystroke interaction went from 220 ms to 40 ms.

**Lesson:** Structural fixes and the compiler beat hand-placed memoization. Measure before and after.`,
    },
    pitfalls: [
      'Adding memo/useMemo everywhere without profiler evidence.',
      'Passing inline objects or callbacks to memoized children, silently defeating memo.',
      'Ignoring compiler bail-outs: a component without the Memo badge usually has a Rules of React violation to fix.',
      'Using useMemo for correctness (to keep something stable for an effect) and then being surprised when React discards the cache.',
    ],
    exercise: {
      task: 'Given a page where a `Sidebar` with an expensive `NavTree` re-renders whenever a `collapsed` boolean toggles in its parent layout, fix it twice: once with "move state down" and once with "lift content up". Measure both in the Profiler.',
      hint: 'If only the Sidebar needs collapsed, move it into Sidebar. If the layout must own it, render NavTree in the layout and pass it as children.',
      solution: `\`\`\`tsx
// Move state down
function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  return <aside data-collapsed={collapsed}><button aria-expanded={!collapsed} onClick={() => setCollapsed(c => !c)}>Menu</button><NavTree /></aside>
}
// NavTree still renders here because Sidebar renders... so combine with lifting content up:
function Sidebar({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  return <aside data-collapsed={collapsed}><button aria-expanded={!collapsed} onClick={() => setCollapsed(c => !c)}>Menu</button>{children}</aside>
}
function Layout() {
  return <Sidebar><NavTree /></Sidebar>
}
\`\`\`
Profiler after: toggling renders only Sidebar; NavTree shows "did not render".`,
    },
    interview: [
      'What does the React Compiler do, and when would you still write useMemo or memo by hand?',
      'Explain why passing an expensive subtree as children prevents it from re-rendering.',
      'Give an ordered list of fixes you would try for a slow component and justify the order.',
    ],
  },

  concurrent: {
    explanation: `Concurrent rendering lets React **prepare a new UI in the background, interrupt it, and throw it away** if something more urgent happens. You opt in per update by marking it as non-urgent.

### Urgent vs non-urgent
Typing into an input, clicking a toggle, pressing a key: users expect immediate feedback. Rendering a filtered list of 5,000 results or a new tab's content is less urgent: a short delay is fine if the input stays responsive. Without concurrency, React renders synchronously: once a big render starts, the main thread is blocked until it finishes, and keystrokes queue up (poor INP).

### useTransition
\`const [isPending, startTransition] = useTransition()\` returns a function that marks state updates inside it as **transitions**. React renders transition updates at lower priority, in chunks, yielding to the browser regularly (about every 5 ms) so input events can be handled. If a new urgent update arrives, React abandons the in-progress transition render and starts again with fresh state. \`isPending\` is true while the transition is in flight, letting you show a subtle indicator while keeping the old UI visible.

Keep the urgent update outside the transition: the input's \`value\` must update synchronously or typing will feel broken.

In React 19 transitions can be **async**: \`startTransition(async () => { await save(); setX(...) })\`. Actions, \`useActionState\` and form actions build on this, with \`isPending\` covering the whole async operation.

### useDeferredValue
\`const deferred = useDeferredValue(value)\` gives you a copy of a value that lags behind during heavy renders. React first renders with the old deferred value (fast, because the expensive child can bail out if it is memoized or compiled), then renders again in the background with the new one. Use it when you **do not own the state update** (the value comes from props) or want to keep the code simple. Compare \`value !== deferred\` to show staleness (e.g. dim the list).

Important: the expensive child must skip rendering when its props have not changed (memo or React Compiler). Otherwise the first, urgent render still renders the heavy tree with the old value and you gain nothing.

### Transitions and Suspense
If a transition causes a component to suspend (lazy route, data), React keeps showing the current UI instead of replacing it with a fallback. This avoids jarring spinners on navigation; routers wrap navigations in transitions for this reason.

### What concurrency does not do
- It does not make rendering faster; it makes it **interruptible**. A 300 ms render still costs 300 ms of CPU.
- It does not help with slow event handlers or synchronous non-React work.
- Text inputs controlled by a transition update will lag or behave strangely.

Use it when profiling shows the urgent interaction is blocked by a heavy, non-urgent render.`,
    examples: [
      {
        title: '❌ Blocking filter vs ✅ useTransition',
        code: `// ❌ Every keystroke synchronously re-renders 5,000 rows; typing stutters
function Search({ items }: { items: Item[] }) {
  const [query, setQuery] = useState('')
  const results = filterItems(items, query)
  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} aria-label="Search" />
      <ResultList items={results} />
    </>
  )
}

// ✅ Urgent: the input. Non-urgent: the list.
function Search({ items }: { items: Item[] }) {
  const [query, setQuery] = useState('')
  const [listQuery, setListQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const results = filterItems(items, listQuery)

  return (
    <>
      <input
        value={query}
        aria-label="Search"
        onChange={e => {
          setQuery(e.target.value) // urgent
          startTransition(() => setListQuery(e.target.value)) // interruptible
        }}
      />
      <div aria-busy={isPending} style={{ opacity: isPending ? 0.6 : 1 }}>
        <ResultList items={results} />
      </div>
    </>
  )
}`,
        note: 'If the user types again before the list finishes rendering, React discards the stale list render. With 4x throttling, keystroke INP typically drops from hundreds of ms to tens.',
      },
      {
        title: '✅ useDeferredValue when the value comes from props',
        code: `function ResultsPanel({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query)
  const isStale = query !== deferredQuery
  return (
    <section aria-busy={isStale} className={isStale ? 'stale' : undefined}>
      {/* SlowResults must be memoized (or compiled) so the urgent render with the old value bails out */}
      <SlowResults query={deferredQuery} />
    </section>
  )
}`,
        note: 'The panel does not own the query state, so it cannot wrap the setter in a transition. Deferring the value achieves the same split.',
      },
      {
        title: '✅ Async transition with an action (React 19)',
        code: `function PublishButton({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <>
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const res = await fetch(\`/api/posts/\${postId}/publish\`, { method: 'POST' })
            if (!res.ok) setError('Could not publish. Try again.')
          })
        }
      >
        {isPending ? 'Publishing…' : 'Publish'}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  )
}`,
        note: 'isPending stays true for the whole awaited operation. Note: state updates after an await may need their own startTransition in some React versions to be treated as part of the transition.',
      },
    ],
    realCase: {
      title: 'A product filter with 900 ms input lag on mid-range phones',
      story: `**Situation:** A grocery app's catalogue page filtered 3,000 products client-side as the user typed.

**Symptom:** RUM showed INP of 600–900 ms on the search box for Android users; people typed, saw nothing, and typed again.

**Root cause:** Each keystroke synchronously rendered the full grid; the main thread was blocked for the whole render.

**Fix:** The input state stayed urgent, the grid's query became a transition, the grid was compiled by the React Compiler so stale renders could bail out, and the grid was virtualized. Field INP on that interaction fell to about 120 ms.

**Lesson:** Concurrency separates what must feel instant from what may lag. Combine it with making the heavy part cheaper.`,
    },
    pitfalls: [
      'Putting the controlled input\'s own setState inside startTransition, which makes typing lag or drop characters.',
      'Using useDeferredValue with a child that is not memoized or compiled, so the urgent render is still expensive.',
      'Expecting transitions to make slow code fast; they only make it interruptible.',
      'Showing a full-page spinner during a transition instead of keeping the previous UI with a subtle pending state.',
    ],
    exercise: {
      task: 'Build a tabbed page where one tab ("Analytics") renders a deliberately slow component (busy-loop 2 ms per item, 200 items). Make switching tabs responsive: clicking another tab while Analytics is rendering must switch immediately.',
      hint: 'Wrap the tab change in startTransition. Show the pending state on the clicked tab button.',
      solution: `\`\`\`tsx
function TabsPage() {
  const [tab, setTab] = useState<'overview' | 'analytics' | 'settings'>('overview')
  const [isPending, startTransition] = useTransition()
  const select = (t: typeof tab) => startTransition(() => setTab(t))
  return (
    <>
      <div role="tablist" aria-label="Sections">
        {(['overview', 'analytics', 'settings'] as const).map(t => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => select(t)}>{t}</button>
        ))}
        {isPending && <span role="status">Loading…</span>}
      </div>
      <div role="tabpanel">
        {tab === 'overview' && <Overview />}
        {tab === 'analytics' && <SlowAnalytics />}
        {tab === 'settings' && <Settings />}
      </div>
    </>
  )
}
\`\`\`
Because the Analytics render is a transition, clicking Settings mid-render abandons it. Without the transition, the click would wait about 400 ms.`,
    },
    interview: [
      'What is the difference between useTransition and useDeferredValue, and when do you use each?',
      'Why must a controlled input\'s own state update not be inside a transition?',
      'How do transitions interact with Suspense boundaries during navigation?',
    ],
  },

  lists: {
    explanation: `Every DOM node costs memory, style calculation, layout and paint, and every React element costs render and reconciliation time. A table of 10,000 rows with 8 cells is 80,000+ elements. Even if React renders it once, initial render takes seconds, scrolling is janky and any update to the list is slow.

### The idea
**Virtualization** (windowing) renders only the rows visible in the viewport plus a few extra above and below (**overscan**). A tall spacer element preserves the full scroll height, so the scrollbar behaves as if all rows exist. As the user scrolls, the library calculates which index range is visible and React renders just those rows, positioned with \`transform: translateY\` or absolute top offsets. Ten thousand rows become about 30 DOM rows.

### TanStack Virtual
A headless library: \`useVirtualizer({ count, getScrollElement, estimateSize, overscan })\` returns \`getVirtualItems()\` (index, start, size, key) and \`getTotalSize()\`. You render the markup. It supports fixed and **dynamic row heights** (measure with \`measureElement\`), horizontal and grid virtualization, and window scrolling.

### Trade-offs and gotchas
- **Find in page** (Ctrl+F) cannot find rows that are not rendered.
- **Accessibility**: screen readers only see rendered rows. For tables, set \`aria-rowcount\` on the table and \`aria-rowindex\` on rows so assistive tech knows the full size. Keep keyboard navigation working when focus moves to a row that needs scrolling into view.
- **Dynamic heights** need measurement and can cause scroll jumps if estimates are far off; provide a good \`estimateSize\`.
- **Sticky headers**, **row selection state** and **focus** must live outside row components because rows unmount when scrolled away.
- **SEO and printing**: unrendered content is invisible to both.

### Alternatives and complements
- **Pagination** or "load more": simpler, accessible, shareable URLs. Often the better UX for search results.
- **Infinite scroll + virtualization** for feeds.
- **CSS \`content-visibility: auto\`** with \`contain-intrinsic-size\`: the browser skips layout and paint for off-screen sections. Cheap to add, keeps all content in the DOM (find-in-page works), but React still renders every element, so it does not reduce render time.
- **Server-side filtering/sorting** so the client never holds 100,000 rows.

### When to virtualize
Rule of thumb: consider it beyond a few hundred complex rows or a few thousand simple ones, when profiling shows render or scroll cost. Measure: initial render time, memory, and scroll smoothness (Performance panel, frames).`,
    examples: [
      {
        title: '✅ Virtualized, accessible order table with TanStack Virtual',
        code: `import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

export function OrdersTable({ orders }: { orders: Order[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 8,
  })

  return (
    <div ref={parentRef} style={{ height: 600, overflow: 'auto' }} tabIndex={0} aria-label="Orders, scrollable">
      <table role="table" aria-rowcount={orders.length + 1} style={{ width: '100%' }}>
        <thead style={{ position: 'sticky', top: 0 }}>
          <tr aria-rowindex={1}><th>Order</th><th>Customer</th><th>Total</th></tr>
        </thead>
        <tbody style={{ position: 'relative', height: virtualizer.getTotalSize(), display: 'block' }}>
          {virtualizer.getVirtualItems().map(row => {
            const o = orders[row.index]
            return (
              <tr
                key={o.id}
                aria-rowindex={row.index + 2}
                style={{ position: 'absolute', top: 0, transform: \`translateY(\${row.start}px)\`, height: row.size, display: 'flex', width: '100%' }}
              >
                <td style={{ flex: 1 }}>{o.number}</td>
                <td style={{ flex: 2 }}>{o.customer}</td>
                <td style={{ flex: 1 }}>{o.total}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}`,
        note: 'Only about 22 rows exist in the DOM at any time. aria-rowcount and aria-rowindex tell screen readers the real size and position. Keys use stable ids, not virtual indexes.',
      },
      {
        title: '✅ Cheap win without virtualization: content-visibility',
        code: `/* Long article or settings page with many sections */
.section {
  content-visibility: auto;
  contain-intrinsic-size: auto 600px; /* placeholder size until rendered */
}`,
        note: 'The browser skips layout and paint for off-screen sections; find-in-page still works. React render cost is unchanged, so this helps layout-heavy pages, not render-heavy lists.',
      },
    ],
    realCase: {
      title: 'An admin log viewer that crashed tabs',
      story: `**Situation:** An internal audit-log viewer loaded the last 7 days of events (about 40,000 rows) and rendered them in a table.

**Symptom:** Opening the page took 9 seconds, Chrome used 1.2 GB for the tab, and on some laptops it crashed. Scrolling dropped to single-digit fps.

**Root cause:** 40,000 rows × 6 cells, each with tooltips and formatted dates, all mounted.

**Fix:** The table was virtualized with TanStack Virtual (overscan 10), date formatting moved to a precomputed field when data arrived, and filtering moved server-side with cursor pagination of 2,000 rows per page. Initial render dropped to 300 ms and memory to 150 MB.

**Lesson:** The fastest DOM node is the one you never create. Pair virtualization with not loading more data than the user needs.`,
    },
    pitfalls: [
      'Using the virtual index as the React key, which remounts rows with the wrong state when data changes.',
      'Keeping selection or focus state inside row components, which is lost when rows unmount during scroll.',
      'Forgetting aria-rowcount/aria-rowindex, so screen readers announce a 20-row table.',
      'Virtualizing small lists where it adds complexity and breaks find-in-page for no gain.',
    ],
    exercise: {
      task: 'Render 10,000 contacts naively, record initial render time and memory, then virtualize with TanStack Virtual. Keep a "selected" checkbox per row that survives scrolling away and back.',
      hint: 'Store selected ids in a Set in the parent component. Pass checked and onToggle into each rendered row.',
      solution: `\`\`\`tsx
function ContactList({ contacts }: { contacts: Contact[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const parentRef = useRef<HTMLDivElement>(null)
  const v = useVirtualizer({ count: contacts.length, getScrollElement: () => parentRef.current, estimateSize: () => 40, overscan: 6 })
  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  return (
    <div ref={parentRef} style={{ height: 500, overflow: 'auto' }}>
      <ul role="list" style={{ height: v.getTotalSize(), position: 'relative' }}>
        {v.getVirtualItems().map(item => {
          const c = contacts[item.index]
          return (
            <li key={c.id} style={{ position: 'absolute', top: 0, width: '100%', transform: \`translateY(\${item.start}px)\` }}>
              <label><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} /> {c.name}</label>
            </li>
          )
        })}
      </ul>
      <p role="status">{selected.size} selected</p>
    </div>
  )
}
\`\`\`
Typical result: naive initial render around 1.5 s and tens of thousands of nodes; virtualized under 50 ms with about 25 rows.`,
    },
    interview: [
      'How does list virtualization work, and what does overscan do?',
      'What accessibility and UX problems does virtualization introduce, and how do you mitigate them?',
      'When would you choose pagination or content-visibility instead of virtualization?',
    ],
  },

  bundle: {
    explanation: `JavaScript is the most expensive byte on the web: it must be downloaded, parsed, compiled and executed on the main thread before your React app becomes interactive. Images and fonts usually dominate LCP. Bundle and network optimisation is about **shipping less, later, and in parallel**.

### Code splitting
Bundlers split code at dynamic \`import()\` boundaries. In React, \`lazy(() => import('./Settings'))\` creates a component whose code loads on first render, and a \`Suspense\` boundary shows a fallback while it loads.
- **Split by route** first: users visiting the home page should not download the admin area. Routers like React Router support lazy routes natively.
- Then split **heavy, conditional components**: rich text editors, chart libraries, map widgets, modals opened rarely.
- **Preload** likely next chunks on hover or focus of the link (\`import()\` early) so the split costs no visible delay.
- Do not split tiny components; each chunk is a request with overhead.

### Analyse what you ship
Use \`rollup-plugin-visualizer\` (Vite) or \`source-map-explorer\` to see a treemap of the bundle. Common findings: a full date library with every locale, \`lodash\` imported whole, an icon library without tree shaking, two versions of the same package, polyfills for browsers you do not support. Set a **performance budget** in CI (for example, the initial JS for the home route under 170 KB gzip) so regressions are caught in review.

### Dependencies
Before adding a package, check its size and whether it tree-shakes (ESM, \`sideEffects: false\`). Prefer platform APIs: \`Intl.DateTimeFormat\` and \`Intl.NumberFormat\` instead of formatting libraries, \`fetch\` instead of HTTP clients, \`structuredClone\` instead of deep-clone utilities.

### Images
- Serve modern formats (AVIF, WebP) with \`srcset\` and \`sizes\` so phones do not download desktop images.
- Always set \`width\` and \`height\` (or \`aspect-ratio\`) to prevent CLS.
- \`loading="lazy"\` for below-the-fold images; **never** lazy-load the LCP image. Give the LCP image \`fetchPriority="high"\`.

### Fonts
Self-host, subset, use WOFF2, \`font-display: swap\` or \`optional\`, preload the one or two critical faces, and use size-adjusted fallbacks to reduce layout shift.

### Main-thread work
CPU-heavy tasks (parsing large CSV files, image processing, complex filtering, diffing) block interactions. Move them to a **Web Worker** (Vite supports \`new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })\`). Libraries like Comlink make the worker API feel like async function calls. Third-party scripts (analytics, chat widgets) should load after the page is interactive.

### Network
Avoid request waterfalls: start data fetching in parallel with code loading (route loaders, prefetching), use HTTP caching with hashed filenames for immutable assets, and compress with Brotli.`,
    examples: [
      {
        title: '✅ Route-level splitting with preloading on intent',
        code: `import { lazy, Suspense } from 'react'

const loadReports = () => import('./routes/Reports')
const Reports = lazy(loadReports)

export function NavLinkReports() {
  return (
    <a
      href="/reports"
      onMouseEnter={() => void loadReports()}
      onFocus={() => void loadReports()}
    >
      Reports
    </a>
  )
}

export function AppRoutes({ path }: { path: string }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      {path === '/reports' ? <Reports /> : <Home />}
    </Suspense>
  )
}`,
        note: 'Calling the same import function on hover/focus starts downloading the chunk before the click; the module cache means lazy reuses that promise. The skeleton should match the final layout to avoid CLS.',
      },
      {
        title: '❌ Heavy imports vs ✅ platform APIs and targeted imports',
        code: `// ❌ pulls the whole library (and maybe all locales) into the main bundle
import _ from 'lodash'
import moment from 'moment'
const label = moment(order.date).format('D MMM YYYY')
const grouped = _.groupBy(orders, 'status')

// ✅
const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const label = fmt.format(new Date(order.date))
const grouped = Object.groupBy(orders, o => o.status)`,
        note: 'Intl and Object.groupBy are built into modern browsers: zero bytes shipped. Create the formatter once, not per row.',
      },
      {
        title: '✅ Offloading CSV parsing to a Web Worker',
        code: `// csv.worker.ts
self.onmessage = (e: MessageEvent<string>) => {
  const rows = e.data.split('\\n').map(line => line.split(','))
  postMessage(rows)
}

// useCsvImport.ts
export function parseInWorker(text: string): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./csv.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = e => { resolve(e.data); worker.terminate() }
    worker.onerror = err => { reject(err); worker.terminate() }
    worker.postMessage(text)
  })
}`,
        note: 'Parsing a 20 MB file no longer freezes the UI. Structured cloning of large results has a cost too; transfer ArrayBuffers when possible.',
      },
    ],
    realCase: {
      title: 'A marketing site where LCP doubled after adding a chart',
      story: `**Situation:** A SaaS landing page added an interactive pricing calculator with a chart library.

**Symptom:** Mobile LCP in field data went from 2.1 s to 4.3 s; the initial JS grew from 140 KB to 520 KB gzip.

**Root cause:** The chart library and its date dependency were statically imported in the landing page entry, and the hero image had \`loading="lazy"\` added by a blanket lint autofix.

**Fix:** The calculator became a \`lazy\` component rendered when scrolled near (IntersectionObserver), the hero image got \`fetchPriority="high"\` and no lazy loading, and a CI bundle budget was added for the landing route. LCP returned to 2.0 s.

**Lesson:** Analyse the bundle on every significant dependency change, and treat the LCP element specially.`,
    },
    pitfalls: [
      'Lazy-loading the LCP image or hero component, delaying the most important paint.',
      'Over-splitting into dozens of tiny chunks, causing request waterfalls.',
      'Suspense fallbacks with different dimensions than the real content, creating layout shift.',
      'Adding a large dependency for one helper function without checking its size and tree-shakability.',
      'Running heavy parsing or computation on the main thread during an interaction.',
    ],
    exercise: {
      task: 'Run a bundle analysis on your project. Identify the three largest dependencies in the initial chunk, and for each decide: remove, replace, lazy-load or keep. Implement at least one route-level split and measure initial JS before and after.',
      hint: 'Add rollup-plugin-visualizer to vite.config.ts with { open: true, gzipSize: true } and run a production build.',
      solution: `\`\`\`ts
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'
export default defineConfig({
  plugins: [react(), visualizer({ filename: 'stats.html', gzipSize: true, brotliSize: true })],
})
\`\`\`

Example decision log:

1. \`recharts\` (95 KB gz), used only on /reports: **lazy-load** the route.
2. \`date-fns\` with all locales (40 KB): **replace** with \`Intl.DateTimeFormat\`.
3. \`react-dom\` (about 45 KB): **keep**, it is the framework.

Result: initial JS for "/" went from 310 KB to 165 KB gzip; LCP on a throttled mobile profile improved by 0.8 s.`,
    },
    interview: [
      'How do lazy and Suspense implement code splitting, and how do you avoid a visible delay when navigating to a split route?',
      'What would you check first if the LCP of a page regressed?',
      'When would you move work to a Web Worker, and what are the costs?',
    ],
  },
}

export default details
