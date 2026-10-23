import type { TopicDetail } from '../types'

const details: Record<string, TopicDetail> = {
  reconciliation: {
    explanation: `Reconciliation is the step where React compares the element tree your components just returned with the tree from the previous render, and works out the smallest set of changes to make to the host (the DOM, or native views). It is *not* a diff of DOM nodes: it compares **React elements**, which are cheap plain objects such as \`{ type: 'li', key: '42', props: {...} }\`.

### Why heuristics instead of a perfect diff

The best general algorithm for turning one tree into another costs roughly O(n³). For a page with a few thousand elements that is billions of operations per update, which is far too slow. React accepts two assumptions that bring the cost down to O(n):

1. **Different type means a different subtree.** If a position held a \`<ProfileCard>\` and now holds a \`<SettingsPanel>\`, or a \`<div>\` became a \`<section>\`, React does not try to match their children. It unmounts the old subtree, which destroys its state and DOM, and mounts the new one.
2. **Keys identify children among siblings.** Inside a list, React matches old and new children by \`key\` instead of by position. Without keys it falls back to the index.

### Identity = type + position (+ key)

This is the most useful mental model: **state belongs to a position in the tree, not to a component instance you created.** If the same component type renders at the same position with the same key, React keeps its state and fiber and only updates props. Change any of the three and the state is gone.

That explains several behaviours that often surprise people:

- Rendering \`{isEditing ? <Input /> : <Input />}\` keeps the input's state, because the type and position are the same.
- Defining a component *inside* another component makes a new function, and therefore a new type, on every render. The child remounts each time and loses focus and state.
- Changing \`key\` is the official way to **reset** a subtree, for example \`<EditForm key={userId} />\`.

### Keys in lists

With index keys, inserting an item at the top shifts every index. React then thinks item 0 changed its content, item 1 changed, and so on, and moves state (input text, checkbox state, animation) to the wrong rows. Stable ids from your data let React see "one new item, the rest moved", so it inserts one DOM node and keeps every other row's state.

Keys only need to be unique among siblings. They are not passed to the component as a prop. Generating them with \`Math.random()\` during render is the worst choice, because every render then remounts every row.

### When to think about it

Most of the time you do not have to. Think about reconciliation when state "leaks" between items, when inputs lose focus while typing, when a list re-renders slowly, or when you deliberately want to reset a component.`,
    examples: [
      {
        title: '❌ Index keys move state to the wrong row vs ✅ stable ids',
        code: `type Todo = { id: string; text: string }

// ❌ Prepending a todo shifts every index; each row's <input> draft text
// stays attached to the old index, so drafts appear on the wrong todos.
function TodoListBad({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {todos.map((t, i) => (
        <li key={i}>
          {t.text} <input placeholder="Add a note" />
        </li>
      ))}
    </ul>
  )
}

// ✅ The key follows the data, so React moves DOM nodes (and their state)
// along with the todo they belong to.
function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {todos.map((t) => (
        <li key={t.id}>
          {t.text} <input placeholder="Add a note" />
        </li>
      ))}
    </ul>
  )
}`,
        note: 'Uncontrolled inputs keep their value in the DOM node. With index keys React reuses node 0 for whatever item is now first, so the typed note sticks to the wrong todo.',
      },
      {
        title: '❌ Component defined inside render vs ✅ hoisted component',
        code: `// ❌ SearchField is a brand-new function type on every render of Page.
// React sees a different type at the same position, unmounts and remounts it,
// so the input loses focus after every keystroke.
function Page() {
  const [query, setQuery] = useState('')
  function SearchField() {
    return <input value={query} onChange={(e) => setQuery(e.target.value)} />
  }
  return <SearchField />
}

// ✅ Hoisted: the type is stable, so React only updates props.
function SearchField(props: { value: string; onChange: (v: string) => void }) {
  return <input value={props.value} onChange={(e) => props.onChange(e.target.value)} />
}
function PageFixed() {
  const [query, setQuery] = useState('')
  return <SearchField value={query} onChange={setQuery} />
}`,
        note: 'Type identity is compared with ===. A function declared inside another component is a new value on every render.',
      },
      {
        title: '✅ Resetting state on purpose with key',
        code: `function ProfilePage({ userId }: { userId: string }) {
  // When userId changes, the whole form remounts with fresh state,
  // with no useEffect needed to "sync" or clear fields.
  return <EditProfileForm key={userId} userId={userId} />
}`,
        note: 'Changing the key is the clean way to say "this is a different thing now". It is better than an effect that resets several pieces of state.',
      },
    ],
    realCase: {
      title: 'Comments written on the wrong support ticket',
      story: `**Situation:** A helpdesk dashboard showed a live list of tickets, each with an inline "quick reply" textarea. New tickets were pushed over a WebSocket and added to the top of the list.

**Symptom:** Agents reported that a half-typed reply sometimes "jumped" to a different ticket. A few replies were sent to the wrong customer.

**Root cause:** The list used \`key={index}\`. When a new ticket arrived at index 0, React kept the existing DOM textareas in place by index, so the draft for ticket A now sat under ticket B. The submit handler read the ticket id from props, which had moved, while the text stayed where it was.

**Fix:** They switched to \`key={ticket.id}\` and moved draft text into state keyed by ticket id, so it could not drift even if the markup changed.

**Lesson:** Index keys are only safe for static lists that are never reordered, filtered or prepended. For anything live, the key must come from the data.`,
    },
    pitfalls: [
      'Using the array index as key for lists that can be reordered, filtered or prepended. State and DOM attach to the wrong items.',
      'Generating keys with `Math.random()` or `crypto.randomUUID()` during render. Every render remounts every child.',
      'Declaring components inside other components. A new type every render means remount, lost state and lost focus.',
      'Expecting state to reset when props change. Same type at the same position keeps state; use a `key` to reset deliberately.',
      'Wrapping a child in a different element conditionally (for example `<div>` vs `<section>`). Changing the parent type unmounts the whole subtree below it.',
    ],
    exercise: {
      task: 'Build a list of 5 counters, each with its own `useState` count and a "Shuffle" button that reorders the list. First use index keys and observe that counts stay in place while labels move. Then fix it so each count follows its label.',
      hint: 'Give each item a stable id when you create the initial array, not when you render.',
      solution: `\`\`\`tsx
const initial = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'].map((label) => ({
  id: label.toLowerCase(),
  label,
}))

function Counter({ label }: { label: string }) {
  const [n, setN] = useState(0)
  return <button onClick={() => setN(n + 1)}>{label}: {n}</button>
}

export function ShuffleList() {
  const [items, setItems] = useState(initial)
  const shuffle = () => setItems([...items].sort(() => Math.random() - 0.5))
  return (
    <>
      <button onClick={shuffle}>Shuffle</button>
      {items.map((it) => (
        // key={it.id}: the counter state now travels with its label.
        <Counter key={it.id} label={it.label} />
      ))}
    </>
  )
}
\`\`\`

With \`key={index}\` the numbers stay in slots 0 to 4 while the labels move, which proves state belongs to the position plus key.`,
    },
    interview: [
      'Why does React use heuristics rather than a minimal tree-edit algorithm, and what are the two heuristics?',
      'A colleague says "keys are just to silence a warning". Show a concrete bug that index keys cause.',
      'How would you reset all state inside a form when the selected record changes, without an effect?',
    ],
  },

  fiber: {
    explanation: `Fiber is the internal data structure and algorithm that React has used since version 16. A **fiber** is a JavaScript object that represents one piece of work: a component instance, a host element like \`<div>\`, a fragment, a Suspense boundary and so on. Each fiber stores its \`type\`, \`key\`, pending and memoized props, memoized state (for function components, the hook list), effect flags, and pointers to related fibers.

### A linked tree instead of a recursive call stack

Before Fiber, React rendered recursively. A deep tree meant a deep JavaScript call stack that could not be paused, so a big update blocked the main thread until it finished. Fiber turns the tree into linked nodes with three pointers:

- \`child\`: the first child
- \`sibling\`: the next sibling
- \`return\`: the parent (where to "return" to when this unit is done)

Because the traversal is a loop over these pointers instead of nested function calls, React can stop after any fiber, yield to the browser, and continue later from the same place.

### Two trees: current and work-in-progress

React keeps the **current** tree (what is on screen) and builds a **work-in-progress** tree for the next update. Each fiber has an \`alternate\` pointer to its counterpart. When the work-in-progress tree is complete, React swaps a pointer and it becomes current. This double buffering lets React throw away half-finished work without the user ever seeing it.

### Render phase: beginWork and completeWork

The **render phase** walks the tree depth first:

1. \`beginWork(fiber)\` going down: call the component (or read a host element's props), reconcile its children, and return the first child.
2. When a fiber has no child, \`completeWork(fiber)\` runs: for host elements it creates or prepares the DOM node and computes the props that changed. Then it moves to the sibling, or climbs back up through \`return\` and completes the parents.

This phase is **pure and interruptible**. It may run more than once for the same update, which is why render must have no side effects, and why Strict Mode double-invokes components in development to expose impurity.

### Commit phase

When the whole tree is ready, the **commit phase** runs synchronously and cannot be interrupted, so the user never sees a half-updated UI. It has sub-steps: before mutation (for example reading layout for \`getSnapshotBeforeUpdate\`), mutation (insert, update and remove DOM nodes, detach refs), layout (attach refs, run \`useLayoutEffect\`), and then passive effects (\`useEffect\`) are flushed afterwards, usually after paint.

### Why you should care

You do not use fibers directly, but the model explains real behaviour: why render can run twice, why effects run after the DOM is updated, why \`useLayoutEffect\` can block paint, and why React can keep the UI responsive during a big transition. It also makes the React DevTools Profiler output (render vs commit durations) much easier to read.`,
    examples: [
      {
        title: 'A simplified fiber work loop',
        code: `type Fiber = {
  type: string | ((props: any) => any)
  props: { children?: any[] } & Record<string, unknown>
  child: Fiber | null
  sibling: Fiber | null
  return: Fiber | null
}

let nextUnitOfWork: Fiber | null = null

// The scheduler calls this; it processes fibers until the time slice is used up.
function workLoop(deadline: { timeRemaining: () => number }) {
  while (nextUnitOfWork && deadline.timeRemaining() > 1) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }
  if (nextUnitOfWork) {
    requestIdleCallback(workLoop) // yield to the browser, continue later
  } else {
    commitRoot() // whole tree ready: apply DOM changes in one go
  }
}

function performUnitOfWork(fiber: Fiber): Fiber | null {
  beginWork(fiber) // render component, reconcile children, set fiber.child
  if (fiber.child) return fiber.child

  let node: Fiber | null = fiber
  while (node) {
    completeWork(node) // create/prepare DOM node, collect effects
    if (node.sibling) return node.sibling
    node = node.return // climb up to the parent
  }
  return null
}

declare function beginWork(f: Fiber): void
declare function completeWork(f: Fiber): void
declare function commitRoot(): void`,
        note: 'The loop can stop after any unit of work because all position information lives in the child/sibling/return pointers, not on the call stack. Real React uses its own scheduler rather than requestIdleCallback, but the shape is the same.',
      },
      {
        title: '❌ Side effects in render vs ✅ in an effect',
        code: `// ❌ Render may run several times (Strict Mode, interrupted transitions).
// This sends duplicate analytics events.
function ProductPage({ product }: { product: Product }) {
  analytics.track('product_viewed', { id: product.id })
  return <ProductDetails product={product} />
}

// ✅ Effects run once per commit, after the DOM is updated.
function ProductPageFixed({ product }: { product: Product }) {
  useEffect(() => {
    analytics.track('product_viewed', { id: product.id })
  }, [product.id])
  return <ProductDetails product={product} />
}`,
        note: 'Only the commit phase is guaranteed to happen once per visible update. Anything observable belongs in an effect or an event handler.',
      },
    ],
    realCase: {
      title: 'Double-counted page views after enabling concurrent features',
      story: `**Situation:** A media company moved its article pages to \`createRoot\` and started using \`startTransition\` for filter changes.

**Symptom:** Analytics showed a sudden 30–40% rise in "article viewed" events, while server logs showed no change in traffic.

**Root cause:** A tracking call lived directly in a component body. With concurrent rendering, transitions can be interrupted and render again, and Strict Mode in staging double-invoked render. Every extra render pass sent another event.

**Fix:** Tracking moved into a \`useEffect\` keyed on the article id, and a lint rule was added to flag calls to the analytics module from component bodies.

**Lesson:** The render phase is a calculation that React may repeat or throw away. Only the commit phase (and the effects after it) reflects what the user actually saw.`,
    },
    pitfalls: [
      'Assuming render runs exactly once per update. Interrupted or restarted work and Strict Mode can run it several times.',
      'Doing heavy synchronous work in `useLayoutEffect`. It runs during commit, before paint, and blocks the frame.',
      'Confusing "re-render" with "DOM update". Render can finish with no DOM mutations at all if nothing changed.',
      'Thinking the commit phase can be interrupted. It is synchronous by design so the UI is never shown half-updated.',
    ],
    exercise: {
      task: 'Given a tree App > (Header, Main > (List, Sidebar)), write down the exact order in which beginWork and completeWork are called in the simplified loop. Then add console.log calls to the simplified work loop above and run it on that tree to check your answer.',
      hint: 'Depth first: go down via child until there is none, complete it, then try sibling, otherwise complete the parent.',
      solution: `\`\`\`
begin App
begin Header
complete Header
begin Main
begin List
complete List
begin Sidebar
complete Sidebar
complete Main
complete App
\`\`\`

A parent completes only after all its children have completed, which is why \`completeWork\` can build a host node and append the already-built child nodes to it.`,
    },
    interview: [
      'What problem did Fiber solve compared with the old stack reconciler?',
      'Explain the difference between the render phase and the commit phase. Which one can be interrupted, and why?',
      'What is the alternate pointer for, and what does double buffering give React?',
    ],
  },

  lanes: {
    explanation: `Not all updates are equally urgent. A keystroke must show up in the input within one frame, while re-filtering a 10,000-row table can wait a few hundred milliseconds. React models this with **lanes**: each update is assigned a priority, stored as a bit in a 31-bit bitmask.

### Where lanes come from

React picks a lane based on *how* the update was triggered:

- **Discrete events** (click, keydown, input) get a high-priority sync lane. These are flushed synchronously, so the UI responds immediately.
- **Continuous events** (scroll, pointermove) get a slightly lower but still fast lane.
- **Default updates** (for example \`setState\` in a \`setTimeout\` or after a fetch) get the default lane. Since React 18 these are batched automatically.
- **Transitions** (\`startTransition\`, \`useTransition\`, and \`useDeferredValue\`'s background render) get one of several transition lanes.
- **Idle and offscreen** work gets the lowest lanes.

Because lanes are bits, React can cheaply combine them (\`a | b\`), check whether a fiber has pending work in a set of lanes, and process several lanes together in one batch.

### Interruption and restarting

When React is rendering in a transition lane and an urgent update arrives, it can stop the transition render between fibers (see the fiber work loop), handle the urgent update and commit it, then go back to the transition. Usually it **restarts** the transition from the root with the latest state rather than resuming exactly where it was, because the urgent update may have changed the inputs. This is why render must be pure: partial work is thrown away.

Concurrent rendering also yields to the browser about every 5ms in a transition render, so the main thread is never blocked for long even if the total render is slow.

### What you control

You do not choose lane numbers. You choose the *kind* of update:

- \`startTransition(() => setFilter(x))\` marks it non-urgent. The old UI stays on screen and interactive until the new one is ready, and Suspense fallbacks are not shown again for content that is already visible.
- \`useDeferredValue(value)\` gives a value that "lags behind" during urgent updates and catches up in a background render.
- \`isPending\` from \`useTransition\` lets you show a subtle loading hint.

### Limits

Transitions do not make slow code faster. They make it *interruptible*. A single component that runs for 300ms still blocks for 300ms, because React can only yield between components. Controlled input values must not be updated in a transition: the input value must stay urgent, or typing will feel broken. Split the state into "what the input shows" (urgent) and "what the expensive list uses" (transition or deferred).`,
    examples: [
      {
        title: '❌ Everything urgent vs ✅ urgent input plus transition for results',
        code: `// ❌ Each keystroke synchronously re-renders 5,000 rows; typing stutters.
function ProductSearchBad({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('')
  const results = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ResultsTable rows={results} />
    </>
  )
}

// ✅ Input value stays urgent; the expensive list renders in a transition lane.
function ProductSearch({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [isPending, startTransition] = useTransition()

  const results = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase())),
    [products, filter],
  )

  return (
    <>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value) // sync lane
          startTransition(() => setFilter(e.target.value)) // transition lane
        }}
      />
      <div style={{ opacity: isPending ? 0.6 : 1 }}>
        <ResultsTable rows={results} />
      </div>
    </>
  )
}`,
        note: 'Two pieces of state with two priorities. If the user types again before the table finishes, React drops the stale table render and starts over with the newest filter.',
      },
      {
        title: '✅ The same idea with useDeferredValue',
        code: `function ProductSearch({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const isStale = query !== deferredQuery

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <div style={{ opacity: isStale ? 0.6 : 1 }}>
        {/* memo matters: ResultsTable must skip re-render when deferredQuery is unchanged */}
        <MemoResultsTable products={products} query={deferredQuery} />
      </div>
    </>
  )
}

const MemoResultsTable = memo(function ResultsTable(props: { products: Product[]; query: string }) {
  const rows = props.products.filter((p) => p.name.includes(props.query))
  return <Table rows={rows} />
})`,
        note: 'useDeferredValue is handy when you do not own the setState call (for example the value comes from props). The child must be memoized, otherwise it re-renders with the urgent update anyway.',
      },
    ],
    realCase: {
      title: 'Laggy typing in an analytics filter bar',
      story: `**Situation:** An internal BI tool had a filter bar above a chart grid with about 40 charts. Every filter keystroke re-rendered all charts.

**Symptom:** Typing in the filter field lagged by 200–400ms per character. INP measurements in Real User Monitoring were in the "poor" range.

**Root cause:** Both the input value and the chart filter used one piece of state, updated in the default/sync lane, so every keystroke waited for 40 charts to render.

**Fix:** The team split the state: the input value stayed urgent, and the applied filter was set inside \`startTransition\`. The chart grid was wrapped in \`memo\`. They also showed a light opacity change while \`isPending\` was true.

**Lesson:** Lanes let you tell React what the user is waiting for. Keep direct feedback (typing, clicks) urgent and move expensive derived rendering to a transition.`,
    },
    pitfalls: [
      'Putting a controlled input\'s own value update inside `startTransition`. The input stops reflecting keystrokes immediately.',
      'Expecting transitions to speed up one slow component. React yields only between components, not inside one.',
      'Using `useDeferredValue` without memoizing the expensive child. The child still re-renders on every urgent update.',
      'Adding a transition when the real fix is less work: virtualize long lists or avoid recomputing data first.',
    ],
    exercise: {
      task: 'Create a component with an input and a list of 20,000 generated strings filtered by the input. Measure how typing feels. Then split the state and use `useTransition` (or `useDeferredValue`) so typing stays smooth, and show a pending indicator.',
      hint: 'Use CPU throttling 4x or 6x in Chrome DevTools to make the difference obvious.',
      solution: `\`\`\`tsx
const all = Array.from({ length: 20_000 }, (_, i) => \`Item \${i} \${(i * 7919) % 1000}\`)

const List = memo(function List({ q }: { q: string }) {
  const rows = all.filter((s) => s.includes(q)).slice(0, 2000)
  return <ul>{rows.map((r) => <li key={r}>{r}</li>)}</ul>
})

export function Search() {
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const [pending, start] = useTransition()
  return (
    <>
      <input value={text} onChange={(e) => { setText(e.target.value); start(() => setQ(e.target.value)) }} />
      {pending && <small>Updating…</small>}
      <List q={q} />
    </>
  )
}
\`\`\``,
    },
    interview: [
      'What is a lane, and why does React represent priorities as a bitmask?',
      'What happens to an in-progress transition render when the user clicks something?',
      'When would you choose `useDeferredValue` over `useTransition`?',
    ],
  },

  'hook-storage': {
    explanation: `Hooks look like magic: \`useState(0)\` somehow remembers a value across calls to a plain function. The trick is simple. React stores hook state **on the fiber** of the component that is rendering, as a **linked list in call order**.

### Mount vs update

When a function component renders for the first time, React sets a "currently rendering fiber" variable and uses the *mount* implementation of each hook. Every hook call appends a new hook object to the fiber's \`memoizedState\` list:

\`\`\`
fiber.memoizedState -> { memoizedState: 0, queue, next } -> { memoizedState: effect, next } -> ...
                           useState(0)                       useEffect(...)
\`\`\`

On later renders React uses the *update* implementation. It does not look up hooks by name, because there are no names. It simply walks the list: the first hook call gets the first node, the second call gets the second node, and so on.

### What is inside each node

- **useState / useReducer**: the current state plus an update **queue**. \`setState\` does not change state immediately. It creates an update object (with a lane), adds it to the queue, and schedules a render. On the next render React processes the queue to compute the new state. That is why the value you read right after \`setCount(c + 1)\` is still the old one, and why functional updates \`setCount(c => c + 1)\` compose correctly.
- **useRef**: an object \`{ current }\` created once and returned every time.
- **useMemo / useCallback**: the cached value and its dependency array.
- **useEffect / useLayoutEffect**: an effect object (create function, destroy function, deps, flags). These are also linked into a separate list so the commit phase can run them quickly.

### Why the Rules of Hooks exist

Because identity is purely by **position**, the number and order of hook calls must be the same on every render. If you call a hook inside an \`if\`, a loop with variable length, or after an early \`return\`, then on a render where that branch is skipped every later hook reads its neighbour's node. A \`useState\` may get a memo's cached value, an effect may get a ref. React detects some cases ("Rendered fewer hooks than expected") but not all.

The rules are therefore:

1. Only call hooks at the top level of a component or custom hook, never conditionally.
2. Only call hooks from React functions (components and custom hooks).

Custom hooks are not special at runtime. They are functions that call hooks, so their hooks are simply inlined into the calling component's list. Two components using the same custom hook do *not* share state.

### The exception: use

\`use(promise)\` and \`use(context)\` may be called conditionally, because \`use\` does not store a node in the hook list in the same positional way. It is still only allowed during render, not in event handlers.`,
    examples: [
      {
        title: 'A tiny hooks runtime',
        code: `type Hook = { state: unknown; next: Hook | null }
type FiberLike = { memoizedState: Hook | null }

let currentFiber: FiberLike
let workInProgressHook: Hook | null = null
let isMount = true

function useStateMini<T>(initial: T): [T, (v: T) => void] {
  let hook: Hook
  if (isMount) {
    hook = { state: initial, next: null }
    if (!currentFiber.memoizedState) currentFiber.memoizedState = hook
    else workInProgressHook!.next = hook
  } else {
    // walk to the next node in call order
    hook = workInProgressHook ? workInProgressHook.next! : currentFiber.memoizedState!
  }
  workInProgressHook = hook
  const setState = (v: T) => {
    hook.state = v // real React enqueues an update with a lane instead
    scheduleRender(currentFiber)
  }
  return [hook.state as T, setState]
}

declare function scheduleRender(f: FiberLike): void`,
        note: 'There is no name or id anywhere: the only thing linking a call to its state is the order of calls. Real React also keeps update queues and separate mount/update dispatchers.',
      },
      {
        title: '❌ Conditional hook vs ✅ condition inside the hook',
        code: `// ❌ When isAdmin flips, every hook below shifts by one position.
function Toolbar({ isAdmin }: { isAdmin: boolean }) {
  if (isAdmin) {
    const [auditOpen, setAuditOpen] = useState(false)
  }
  const [search, setSearch] = useState('') // may read auditOpen's node
  useEffect(() => { /* ... */ }, [search])
  return null
}

// ✅ Always call the hook; branch on the value.
function ToolbarFixed({ isAdmin }: { isAdmin: boolean }) {
  const [auditOpen, setAuditOpen] = useState(false)
  const [search, setSearch] = useState('')
  useEffect(() => { /* ... */ }, [search])
  return isAdmin ? <AuditToggle open={auditOpen} onChange={setAuditOpen} /> : null
}`,
        note: 'An unused hook call costs almost nothing. A shifted hook list causes bugs that are very hard to trace. eslint-plugin-react-hooks catches this at build time.',
      },
    ],
    realCase: {
      title: 'Feature flag that scrambled form state',
      story: `**Situation:** A checkout form added a new "gift message" field behind a feature flag. A developer wrapped the new \`useState\` in \`if (flags.giftMessage)\`. The lint rule had been disabled in that folder months earlier.

**Symptom:** For users whose flag value arrived after the first render (flags loaded asynchronously), the shipping address field suddenly showed the gift message text, and an effect started firing on every keystroke.

**Root cause:** On the first render the flag was false, so the list had N hooks. When the flag became true, a new hook was inserted in the middle and all later hooks read the wrong nodes. React logged a hooks-order warning only in development, and nobody saw it.

**Fix:** The hook was called unconditionally and the field was rendered conditionally. The lint rule was turned back on as an error across the repo, and CI fails on hooks warnings.

**Lesson:** Hook identity is position. Treat the Rules of Hooks as a hard compiler rule, not a style preference.`,
    },
    pitfalls: [
      'Calling hooks after an early `return`. The hook count differs between renders.',
      'Calling hooks inside loops whose length changes, for example one `useState` per list item. Move each item into its own component instead.',
      'Expecting state to change right after `setState`. The update is queued and applied on the next render.',
      'Thinking custom hooks share state between components. Each call site gets its own nodes on its own fiber.',
      'Disabling `react-hooks/rules-of-hooks` "temporarily". It is the only guard against silent order bugs.',
    ],
    exercise: {
      task: 'Extend the mini runtime above with `useRefMini` and a `render(Component)` function that resets `workInProgressHook` and `isMount` correctly, so a component calling `useStateMini` then `useRefMini` keeps both values across three renders.',
      hint: 'Before each render set `workInProgressHook = null`. After the first render set `isMount = false`.',
      solution: `\`\`\`ts
function useRefMini<T>(initial: T): { current: T } {
  let hook: Hook
  if (isMount) {
    hook = { state: { current: initial }, next: null }
    if (!currentFiber.memoizedState) currentFiber.memoizedState = hook
    else workInProgressHook!.next = hook
  } else {
    hook = workInProgressHook ? workInProgressHook.next! : currentFiber.memoizedState!
  }
  workInProgressHook = hook
  return hook.state as { current: T }
}

function render(fiber: FiberLike, Component: () => void) {
  currentFiber = fiber
  workInProgressHook = null
  Component()
  isMount = false
}
\`\`\`

Call \`render\` three times and log the values: the state and the ref object stay the same because each call reads the same position.`,
    },
    interview: [
      'Where does React store the state for `useState`, and how does it find it on the next render?',
      'Explain exactly what goes wrong when a hook is called conditionally.',
      'Why is `use` allowed inside conditions while `useContext` is not?',
    ],
  },

  suspense: {
    explanation: `Suspense lets a component say "I cannot render yet" and lets a parent decide what to show meanwhile. The mechanism behind it is simple: while rendering, a component that needs data that is not ready **suspends**. React stops rendering that subtree, finds the nearest \`<Suspense>\` boundary above it, and shows that boundary's \`fallback\`. When the awaited promise settles, React retries the render.

### How suspending works

In React 19 the official way to read a promise during render is \`use(promise)\`. If the promise is already resolved, \`use\` returns the value. If it is pending, React suspends the component. If it rejected, the error is thrown to the nearest **error boundary**. Data libraries such as TanStack Query (\`useSuspenseQuery\`), Relay and framework loaders integrate the same way.

Important detail: **the promise must be stable across renders**. If you create a new \`fetch()\` promise inside the component body, every retry creates a new promise, which suspends again, and you loop forever. The promise should come from a cache, a loader, a parent (for example a Server Component passing a promise down), or a data library.

### Boundaries define the loading UX

Where you place boundaries decides what the user sees:

- One boundary around the whole page: everything waits for the slowest piece.
- One boundary per independent section: each section appears as soon as it is ready.
- Nested boundaries: an outer skeleton appears first, then inner details reveal progressively.

Siblings inside the same boundary are revealed together, which prevents a "popcorn" effect of many spinners popping in at random.

### Suspense and transitions

If an update that is already showing content suspends again, React would normally replace that content with the fallback. When the update is a **transition** (\`startTransition\`, or navigation in most routers), React instead keeps the old UI visible and waits, because hiding content the user is already looking at feels worse than a short delay. Use \`isPending\` to show a subtle indicator.

### On the server

With streaming SSR, Suspense boundaries are also **streaming boundaries**. The server sends the shell with fallbacks first, then streams each boundary's HTML when its data is ready, together with a small inline script that swaps it in. On the client, boundaries are also units of **selective hydration**.

### When not to use it

Suspense handles *loading*, not errors. Pair every important boundary with an error boundary. Also avoid boundaries so fine-grained that the page flickers with skeletons, and avoid waterfalls where a child only starts fetching after its parent's data has arrived. Start requests early (in a loader or parent) and read them lower down.`,
    examples: [
      {
        title: '❌ Promise created during render vs ✅ promise from a parent with use',
        code: `// ❌ A new promise on every render: suspend -> retry -> new promise -> suspend ...
function OrderSummaryBad({ orderId }: { orderId: string }) {
  const order = use(fetch(\`/api/orders/\${orderId}\`).then((r) => r.json()))
  return <Summary order={order} />
}

// ✅ Start the request once, outside render, and pass the promise down.
// In Next.js the page is a Server Component, so this runs on the server.
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const orderPromise = getOrder(id) // not awaited: starts the query now
  return (
    <ErrorBoundary fallback={<p>Could not load this order.</p>}>
      <Suspense fallback={<SummarySkeleton />}>
        <OrderSummary orderPromise={orderPromise} />
      </Suspense>
    </ErrorBoundary>
  )
}

// Client Component
'use client'
function OrderSummary({ orderPromise }: { orderPromise: Promise<Order> }) {
  const order = use(orderPromise) // suspends until resolved, throws to boundary on reject
  return <Summary order={order} />
}`,
        note: 'The promise identity is stable because it is created once by the parent. Errors go to the ErrorBoundary; loading goes to Suspense. (In a real project the two components live in separate files, since the directive must be at the top of a file.)',
      },
      {
        title: '✅ Independent boundaries for independent data',
        code: `export default function Dashboard() {
  return (
    <>
      <Header />
      <div className="grid">
        <Suspense fallback={<CardSkeleton />}>
          <RevenueCard />{/* fast query */}
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <ChurnCard />{/* slow warehouse query */}
        </Suspense>
      </div>
    </>
  )
}`,
        note: 'The slow churn query no longer delays revenue. Both queries start in parallel because both components render at the same time.',
      },
    ],
    realCase: {
      title: 'Infinite spinner after migrating to use()',
      story: `**Situation:** A team replaced \`useEffect\`-based fetching in a profile page with React 19's \`use\`, writing \`use(fetchProfile(id))\` directly in the component.

**Symptom:** The page showed the skeleton forever in production and hammered the API with hundreds of identical requests per second per user.

**Root cause:** Each retry render called \`fetchProfile\` again and got a new, pending promise. React suspended on the new promise every time, so it never settled from React's point of view.

**Fix:** The fetch moved into the route's Server Component, which passed the promise as a prop. For the client-only part they used TanStack Query's \`useSuspenseQuery\`, which caches promises by key. A rate-limit alert on the endpoint was also added.

**Lesson:** \`use\` reads a promise; it does not own one. Promises must be cached or created outside render.`,
    },
    pitfalls: [
      'Creating the promise inside the component that calls `use`. It causes infinite suspend loops.',
      'No error boundary next to the Suspense boundary. A rejected promise then crashes a large part of the tree.',
      'One giant boundary for the whole page, so the slowest query decides when anything appears.',
      'Request waterfalls: a child starts its fetch only after the parent finished. Start requests together, read them where needed.',
      'Being surprised that a transition keeps old content instead of showing the fallback. That is intended; use `isPending` for feedback.',
    ],
    exercise: {
      task: 'Write a small `createResourceCache` that returns a stable promise per key, then build a `<UserCard id>` client component that uses `use` with it. Wrap two cards with different ids in separate Suspense boundaries plus one error boundary, and simulate one slow and one failing request.',
      hint: 'A `Map<string, Promise<T>>` is enough. Store the promise before it resolves.',
      solution: `\`\`\`tsx
const cache = new Map<string, Promise<User>>()
function getUser(id: string) {
  let p = cache.get(id)
  if (!p) {
    p = fetch(\`/api/users/\${id}\`).then((r) => {
      if (!r.ok) throw new Error('User not found')
      return r.json() as Promise<User>
    })
    cache.set(id, p)
  }
  return p
}

function UserCard({ id }: { id: string }) {
  const user = use(getUser(id))
  return <p>{user.name}</p>
}

export function Users() {
  return (
    <ErrorBoundary fallback={<p>Something failed.</p>}>
      <Suspense fallback={<p>Loading A…</p>}><UserCard id="a" /></Suspense>
      <Suspense fallback={<p>Loading B…</p>}><UserCard id="b" /></Suspense>
    </ErrorBoundary>
  )
}
\`\`\`

In real apps add cache eviction or use a data library; this cache never forgets.`,
    },
    interview: [
      'What exactly happens inside React when a component suspends?',
      'Why must the promise passed to `use` be stable, and how do you make it stable?',
      'How does Suspense behave differently during a transition, and why is that the better UX?',
    ],
  },

  hydration: {
    explanation: `Server-side rendering produces HTML so the user sees content before JavaScript loads. That HTML is not interactive. **Hydration** is the process where React, running in the browser, renders the same component tree, walks the existing DOM, and *adopts* it: it attaches event handlers and connects fibers to existing nodes instead of creating new ones. You start it with \`hydrateRoot(container, <App />)\` (frameworks do this for you).

### The contract: same output

Hydration assumes the first client render produces **exactly the same output** as the server. If it does not, you get a **hydration mismatch**. React 19 reports a single, clearer error with a diff of the mismatching content. For text mismatches it may patch things up, but in general React falls back to client rendering the nearest Suspense boundary (or the whole root), throwing away server HTML. That costs performance and may cause visible flicker or lost input.

Common causes:

- Time and randomness: \`new Date()\`, \`Date.now()\`, \`Math.random()\`, or random ids during render.
- Locale and timezone differences: the server formats dates in UTC with \`en-US\`, the browser in the user's zone and language.
- Browser-only checks in render: \`typeof window !== 'undefined'\`, \`localStorage\`, \`matchMedia\`.
- Invalid HTML nesting, such as a \`<div>\` inside \`<p>\`. The browser parser rearranges it, so the DOM does not match.
- Browser extensions that inject attributes or nodes (React 19 is more tolerant of some of these, but not all).

### Fixing mismatches properly

- Make output deterministic: pass the time or locale from the server as a prop, format with an explicit timezone, and use \`useId\` for ids.
- For values that can only be known on the client, render a neutral placeholder on both sides and update after mount (an effect, or \`useSyncExternalStore\` with a \`getServerSnapshot\`).
- For a tiny unavoidable text difference (for example a timestamp), \`suppressHydrationWarning\` on that one element is acceptable. It only works one level deep and does not fix anything. It only silences the warning.

### Streaming and selective hydration

With streaming SSR (\`renderToReadableStream\`, or frameworks such as Next.js), HTML arrives in chunks per Suspense boundary. On the client, each boundary can **hydrate independently**: React does not need the whole page's JavaScript and data to start. If the user clicks inside a boundary that has not hydrated yet, React **prioritises hydrating that boundary** first and then replays the event. This is selective hydration, and it is a big reason to wrap slow or heavy parts in Suspense.

### Cost

Hydration still runs every component on the client, so a large tree costs CPU even though the HTML was already there. Server Components reduce that cost because their output needs no hydration and their code is never shipped.`,
    examples: [
      {
        title: '❌ Locale-dependent timestamp vs ✅ deterministic formatting',
        code: `// ❌ Server (UTC, en-US) prints "3/4/2026, 11:00 PM".
// A browser in Jakarta (UTC+7, id-ID) prints "5/3/2026, 06.00". Mismatch.
function OrderPlaced({ placedAt }: { placedAt: string }) {
  return <time>{new Date(placedAt).toLocaleString()}</time>
}

// ✅ Fix the locale and timezone explicitly (here: the store's timezone),
// so server and client produce identical text.
const fmt = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Jakarta',
})
function OrderPlacedFixed({ placedAt }: { placedAt: string }) {
  return <time dateTime={placedAt}>{fmt.format(new Date(placedAt))}</time>
}`,
        note: 'If you truly need the viewer\'s own timezone, render the fixed-zone text first and switch to the local version after mount.',
      },
      {
        title: '❌ window check in render vs ✅ useSyncExternalStore with a server snapshot',
        code: `// ❌ Server renders "desktop" layout, a phone renders "mobile" on hydration.
function NavBad() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  return isMobile ? <MobileNav /> : <DesktopNav />
}

// ✅ The server snapshot is used for SSR AND the hydration render,
// then React re-renders with the real value right after.
function subscribe(cb: () => void) {
  const mq = window.matchMedia('(max-width: 767px)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia('(max-width: 767px)').matches,
    () => false, // server and first client render agree
  )
}
function Nav() {
  return useIsMobile() ? <MobileNav /> : <DesktopNav />
}`,
        note: 'For purely visual differences, CSS media queries are better still: no JavaScript, no mismatch, no layout shift.',
      },
    ],
    realCase: {
      title: 'A "last updated" stamp that disabled SSR on a product page',
      story: `**Situation:** An online shop's product page showed "Price updated 3 minutes ago", computed with \`Date.now()\` during render.

**Symptom:** Lab Core Web Vitals looked fine, but field LCP was worse than before SSR was introduced, and the console showed hydration errors. Some users saw the page flash.

**Root cause:** Server and client computed different "minutes ago" values. React could not reuse the server HTML for that boundary, which happened to be the whole product section, and re-rendered it on the client, re-downloading and re-decoding images.

**Fix:** The server rendered the absolute timestamp inside a \`<time>\` element. A small client component converted it to relative text after mount. The product section was also split into smaller Suspense boundaries.

**Lesson:** Anything that depends on "now", the user's locale or the browser must not appear in the first render. Hydration errors are performance bugs, not just console noise.`,
    },
    pitfalls: [
      'Using `Date.now()`, `Math.random()` or `toLocaleString()` without a fixed locale/timezone in render.',
      'Branching on `typeof window` in render. Server and client take different branches.',
      'Spreading `suppressHydrationWarning` around to hide errors. It hides symptoms and only works one level deep.',
      'Invalid nesting such as `<div>` inside `<p>` or `<a>` inside `<a>`. The browser parser changes the DOM before React sees it.',
      'Assuming SSR means no client cost. Hydration still executes every Client Component.',
    ],
    exercise: {
      task: 'Build a `<RelativeTime iso>` component that is hydration-safe: on the server and during hydration it prints an absolute date in UTC; after mount it shows "5 minutes ago" and refreshes every minute.',
      hint: 'Keep a `mounted` flag in state set by an effect, or use `useSyncExternalStore` with a server snapshot.',
      solution: `\`\`\`tsx
'use client'
const abs = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })
const rel = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function RelativeTime({ iso }: { iso: string }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])
  const date = new Date(iso)
  const text =
    now === null
      ? abs.format(date) + ' UTC'
      : rel.format(Math.round((date.getTime() - now) / 60_000), 'minute')
  return <time dateTime={iso} title={abs.format(date)}>{text}</time>
}
\`\`\``,
    },
    interview: [
      'What does hydration actually do, and what happens when there is a mismatch?',
      'Name four common causes of hydration mismatches and how to fix each one.',
      'What is selective hydration and how do Suspense boundaries enable it?',
    ],
  },

  compiler: {
    explanation: `The **React Compiler** is a build-time tool (a Babel plugin, with integrations for Vite, Next.js and other bundlers) that rewrites your components and hooks to memoize automatically. Its stable 1.0 release arrived in October 2025.

### Setup today

\`\`\`ts
// vite.config.ts (@vitejs/plugin-react 6+; the old react({ babel: … }) option was removed)
// npm install -D @rolldown/plugin-babel @babel/core babel-plugin-react-compiler
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
})
\`\`\`

- **Next.js**: \`reactCompiler: true\` in \`next.config.ts\`.
- **Experimental Rust port**: \`react({ compiler: true })\` in Vite (needs the optional \`oxc-transform-react\` peer), or \`experimental.turbopackRustReactCompiler: true\` in Next.js 16.3+. Fast, but still experimental.
- **Lint**: \`eslint-plugin-react-hooks@latest\` with the \`recommended-latest\` preset includes the compiler rules.

### What problem it solves

By default, when a component re-renders, React re-runs the whole function and re-renders all children. To avoid wasted work, people add \`useMemo\`, \`useCallback\` and \`memo\` by hand, which is noisy, easy to get wrong (missing dependencies) and easy to forget. The compiler does that work for you, often at a finer granularity than you would by hand. It can memoize individual JSX elements and intermediate values, and even values computed after a conditional return, which manual hooks cannot do.

### How it works, roughly

The compiler parses each component into an intermediate representation, works out data flow (which values depend on which props, state and context), and identifies **reactive scopes**: groups of values that change together. It then emits code that caches each scope in a per-component cache array (via an internal hook) and recomputes it only when its inputs change. Conceptually the output looks like this:

\`\`\`
const $ = useMemoCache(4)
let rows
if ($[0] !== items || $[1] !== filter) {
  rows = items.filter(...)
  $[0] = items; $[1] = filter; $[2] = rows
} else {
  rows = $[2]
}
\`\`\`

The result: unchanged props produce the same object and element references, so children skip re-rendering without explicit \`memo\`.

### It depends on the Rules of React

The compiler can only do this safely if your code follows the rules:

- Components and hooks are **pure** during render: same inputs, same output, no side effects.
- Props, state and values passed to hooks are **treated as immutable**. Do not mutate them; create new objects.
- Hooks follow the Rules of Hooks.
- Refs are not read or written during render (except lazy initialisation).

When the compiler detects a rule violation it can prove, it **skips that component** (it does not crash) and leaves it unoptimised. Code that breaks the rules in ways it cannot detect, such as mutating an object from outside, may behave differently after compilation. The ESLint rules from \`eslint-plugin-react-hooks\` (which now include the compiler diagnostics) surface these problems in your editor.

### Adopting it

- Fix lint violations first, then enable the compiler. In large codebases you can enable it per directory or use the \`'use memo'\` opt-in mode.
- \`'use no memo'\` at the top of a function is an escape hatch to exclude one component while you investigate a problem.
- Existing \`useMemo\`/\`useCallback\` keep working. Do not rush to delete them; remove them gradually where tests cover behaviour, especially ones used as effect dependencies.
- Measure with the Profiler before and after. The compiler removes *re-render* waste; it does not fix slow algorithms, huge lists or network waterfalls.`,
    examples: [
      {
        title: '❌ Mutating props breaks compiled memoization vs ✅ immutable update',
        code: `// ❌ sort() mutates the incoming array. After compilation, the cached
// "sorted" value may be reused while the parent's array has silently changed,
// and the parent's own UI is also reordered. The compiler may bail out here.
function Leaderboard({ players }: { players: Player[] }) {
  const sorted = players.sort((a, b) => b.score - a.score)
  return <Table rows={sorted} />
}

// ✅ toSorted() returns a new array; render stays pure, so the compiler
// can safely cache "sorted" and only recompute when players changes.
function LeaderboardFixed({ players }: { players: Player[] }) {
  const sorted = players.toSorted((a, b) => b.score - a.score)
  return <Table rows={sorted} />
}`,
        note: 'With the compiler you get the effect of useMemo here for free, but only because the computation is pure.',
      },
      {
        title: 'Before and after: manual memo vs compiler-friendly code',
        code: `// Before: manual memoization everywhere
const InvoiceList = memo(function InvoiceList({ invoices, onSelect }: Props) {
  const overdue = useMemo(() => invoices.filter((i) => i.dueDate < today()), [invoices])
  const handleClick = useCallback((id: string) => onSelect(id), [onSelect])
  return overdue.map((i) => <InvoiceRow key={i.id} invoice={i} onClick={handleClick} />)
})

// After (with the compiler enabled): plain code, same or better memoization
function InvoiceListPlain({ invoices, onSelect }: Props) {
  const overdue = invoices.filter((i) => i.dueDate < today())
  return overdue.map((i) => <InvoiceRow key={i.id} invoice={i} onClick={() => onSelect(i.id)} />)
}

// vite.config.ts (@vitejs/plugin-react 6+)
// import react, { reactCompilerPreset } from '@vitejs/plugin-react'
// import babel from '@rolldown/plugin-babel'
// plugins: [react(), babel({ presets: [reactCompilerPreset()] })]`,
        note: 'The compiler caches the filtered array, the arrow functions and the JSX elements based on what they depend on. Keep `today()` deterministic within a render.',
      },
    ],
    realCase: {
      title: 'Stale UI after turning on the compiler',
      story: `**Situation:** A logistics company enabled the React Compiler across a large dashboard to reduce re-renders.

**Symptom:** One widget, a shipment status list, stopped updating when new statuses arrived over a WebSocket, although the data store clearly had new values.

**Root cause:** The store mutated the same array in place (\`shipments.push(...)\`) and then forced a re-render. Before the compiler the component recomputed everything on every render, which hid the mutation. After compilation the cached derived list was reused because the array reference had not changed.

**Fix:** The store was changed to produce a new array on every update. The team added \`'use no memo'\` temporarily to unblock the release, then removed it after the fix, and turned on the compiler lint rules in CI.

**Lesson:** The compiler rewards immutable, pure code and exposes hidden mutation. Treat its lint output as a list of real bugs.`,
    },
    pitfalls: [
      'Mutating props, state or objects from a store and expecting re-renders to show it. Compiled caches compare references.',
      'Reading or writing `ref.current` during render. It breaks purity and may stop the compiler optimising the component.',
      'Removing all manual `useMemo`/`useCallback` at once, including ones used as effect dependencies. Effect timing can change.',
      'Expecting the compiler to fix slow algorithms or long lists. Profile first; virtualize or change the algorithm where needed.',
      'Ignoring the compiler lint diagnostics. Components it bails out of silently stay unoptimised.',
    ],
    exercise: {
      task: 'Take a component that uses `useMemo`, `useCallback` and `memo` and contains one hidden mutation (for example `items.reverse()`). Enable the compiler in a Vite playground, use React DevTools (compiled components show a "Memo ✨" badge) to check whether it was optimised, fix the mutation, and confirm the badge appears.',
      hint: 'Run the react-hooks ESLint rules first; they point at the exact line that blocks compilation.',
      solution: `\`\`\`tsx
// Before: blocks or breaks optimisation
function History({ events }: { events: Event[] }) {
  const latestFirst = events.reverse() // mutates the prop
  return <ul>{latestFirst.map((e) => <li key={e.id}>{e.label}</li>)}</ul>
}

// After: pure, compiles, and no manual memo needed
function HistoryFixed({ events }: { events: Event[] }) {
  const latestFirst = events.toReversed()
  return <ul>{latestFirst.map((e) => <li key={e.id}>{e.label}</li>)}</ul>
}
\`\`\`

Then remove the old \`useMemo\`/\`useCallback\` around pure values and confirm with the Profiler that children still skip re-renders when unrelated state changes.`,
    },
    interview: [
      'What does the React Compiler actually generate, and how is it finer-grained than manual useMemo?',
      'Which rules must code follow for the compiler to work, and what happens when it detects a violation?',
      'How would you roll the compiler out safely in a large existing codebase?',
    ],
  },
}

export default details
