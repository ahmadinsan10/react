import type { TopicDetail } from '../types'

const details: Record<string, TopicDetail> = {
  'use-effect': {
    explanation: `\`useEffect\` lets a component **synchronise with something outside React**: a network connection, a browser API, a timer, a third-party widget, a subscription. It is not a lifecycle hook for "run code on mount"; it is a way to say "while this component is on screen with these values, keep that external thing in sync".

### When it runs

1. React renders your component (pure, no effects).
2. React commits the result to the DOM.
3. The browser usually paints.
4. React runs your effect's setup.

On a later render, if any dependency changed (compared with \`Object.is\`), React first runs the **previous** effect's cleanup with the *old* values, then the new setup with the new values. On unmount, the last cleanup runs.

### Dependencies are not a choice

The dependency array must list every reactive value (props, state, values derived from them, functions defined in the component) the effect reads. The lint rule computes this for you. If the effect re-runs too often, change the *code* so it needs fewer dependencies: move objects inside the effect, use updater functions, extract non-reactive logic with \`useEffectEvent\`. Never lie by omitting dependencies; that creates stale closures.

- No array: runs after every render.
- \`[]\`: setup on mount, cleanup on unmount (because nothing reactive is read).
- \`[a, b]\`: re-sync when \`a\` or \`b\` changes.

### Think in start/stop pairs

Every effect should be written as "start syncing" and "stop syncing". Connect/disconnect, subscribe/unsubscribe, set/clear timeout, add/remove listener, fetch/ignore result. If you write the cleanup properly, the effect works no matter how many times React mounts it.

### Why StrictMode runs it twice

In development React mounts, unmounts and re-mounts every component once, so your effect runs setup → cleanup → setup. If that breaks something (double connection, duplicate listener), your cleanup is missing or wrong. In production it runs once, but real users can trigger the same sequence through navigation, Suspense and Activity.

### Data fetching in effects

Fetching in an effect works but you must handle races and cleanup, and you get no caching, deduplication or preloading. In real apps prefer your framework's data loading, a library like TanStack Query, or React 19's \`use\` with a cached promise. Fetching in effects is still worth understanding because it shows the synchronisation model clearly.

### useLayoutEffect

Same API, but runs synchronously after DOM mutation and *before* paint. Use it only to measure layout and adjust before the user sees a flicker (tooltip positioning). It blocks painting, so default to \`useEffect\`.`,
    examples: [
      {
        title: '❌ missing cleanup vs ✅ start/stop pair',
        code: `function LiveOrderStatus({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<string>('pending')

  // ❌ opens a new socket per orderId change and never closes the old ones
  // useEffect(() => {
  //   const ws = new WebSocket(\`wss://api.example.com/orders/\${orderId}\`)
  //   ws.onmessage = e => setStatus(JSON.parse(e.data).status)
  // }, [orderId])

  // ✅ every connect has a matching disconnect
  useEffect(() => {
    const ws = new WebSocket(\`wss://api.example.com/orders/\${orderId}\`)
    ws.onmessage = e => setStatus(JSON.parse(e.data).status)
    return () => ws.close()
  }, [orderId])

  return <p>Order {orderId}: {status}</p>
}`,
        note: 'Without cleanup, switching orders leaks sockets and old sockets keep calling setStatus with another order\'s status. The cleanup runs with the previous orderId before the new connection opens.',
      },
      {
        title: 'Syncing a third-party widget',
        code: `function MapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapInstance | null>(null)

  // create/destroy once
  useEffect(() => {
    const map = createMap(containerRef.current!)
    mapRef.current = map
    return () => { map.destroy(); mapRef.current = null }
  }, [])

  // sync props into the widget
  const [lat, lng] = center
  useEffect(() => {
    mapRef.current?.setView([lat, lng], zoom)
  }, [lat, lng, zoom])

  return <div ref={containerRef} className="map" />
}`,
        note: 'Separate effects for separate concerns: lifetime of the widget vs keeping its view in sync. Depending on primitives (`lat`, `lng`) avoids re-running for a new-but-equal array.',
      },
    ],
    realCase: {
      title: 'Notification counts from the wrong workspace',
      story: `A team-chat product let users switch workspaces. A \`useEffect(() => { socket.on('unread', setUnread) }, [workspaceId])\` subscribed per workspace with no cleanup. After a few switches the badge flickered between counts from different workspaces, and memory usage grew over a working day.

Each switch added another listener; all of them kept calling \`setUnread\`. The fix returned \`() => socket.off('unread', handler)\` and filtered events by \`workspaceId\`. StrictMode had actually shown a doubled listener in development, but the team had dismissed it. Lesson: write every effect as a start/stop pair, and treat double-execution symptoms in dev as real bugs.`,
    },
    pitfalls: [
      'Omitting dependencies to make an effect run "only once".',
      'Missing cleanup for subscriptions, timers, sockets and listeners.',
      'Making the effect callback `async` (it must return a cleanup or nothing).',
      'Objects/functions created in render used as dependencies, re-running every render.',
      'Using effects for things that are not external synchronisation (see "You might not need an effect").',
    ],
    exercise: {
      task: 'Write a `useOnlineStatus()` hook that returns `true`/`false` and stays in sync with the browser\'s `online`/`offline` events. Then write `useDocumentTitle(title)`. Verify both behave correctly under StrictMode.',
      hint: 'Initial value from `navigator.onLine`; add two listeners in setup and remove them in cleanup. (For the first hook, `useSyncExternalStore` is an even better fit — try both.)',
      solution: `\`\`\`ts
export function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => { document.title = previous }
  }, [title])
}
\`\`\`

The \`useSyncExternalStore\` version: \`useSyncExternalStore(subscribe, () => navigator.onLine, () => true)\` where \`subscribe\` adds/removes the same listeners.`,
    },
    interview: [
      'Describe the exact order of render, commit, cleanup and setup when an effect dependency changes.',
      'Why does React run effects twice in development, and what does it tell you if that breaks your code?',
      'What is the difference between `useEffect` and `useLayoutEffect`?',
    ],
  },

  'no-effect': {
    explanation: `Effects are an escape hatch for synchronising with *external* systems. A large share of effects in real codebases do not touch anything external; they shuffle React state around. Those effects make apps slower (an extra render each time), harder to follow, and buggier (intermediate inconsistent renders, loops).

### You do not need an effect to...

**Transform data for rendering.** If \`fullName\` comes from \`first\` and \`last\`, compute it in render: \`const fullName = first + ' ' + last\`. An effect that sets \`fullName\` state renders once with stale data, then again with the right data. If the computation is expensive, memoise (the React Compiler does this automatically; otherwise \`useMemo\`).

**Handle user events.** "When the user clicks Buy, POST the order and show a toast" belongs in the click handler. An effect that watches a \`submitted\` flag and then posts loses the context of *why* it ran and may fire again on remount.

**Reset state when a prop changes.** Use a \`key\` on the component so React remounts it with fresh state.

**Adjust some state when a prop changes.** Usually you can derive instead (store \`selectedId\` and compute \`selected\`). In rare cases you can set state during render guarded by a comparison with the previous prop, but restructuring is better.

**Share logic between event handlers.** Extract a function and call it from both handlers.

**Notify a parent about a state change.** Call the parent's \`onChange\` in the same handler where you update local state, or lift the state so the parent owns it.

**Chain computations** ("when A changes set B, when B changes set C"). Compute the whole next state in the event handler or a reducer.

**Initialise the app once.** Module-level code or a top-level guard runs once per load; effects run per mount (twice in dev).

**Subscribe to an external store.** Prefer \`useSyncExternalStore\`, which handles concurrent rendering and tearing.

**Fetch data.** Possible with an effect, but frameworks, query libraries and \`use\` handle caching, races and waterfalls better.

### The test

Ask: *why* does this code run? If the answer is "because the user did something", it goes in an event handler. If the answer is "because the component is displayed and must stay in sync with something outside React", it is an effect. If the answer is "because some other state changed", it is probably derived data or belongs in the handler that changed that state.`,
    examples: [
      {
        title: '❌ derived state via effect vs ✅ compute in render',
        code: `function CartSummary({ items }: { items: CartItem[] }) {
  // ❌ extra render with a stale total, plus more state to keep in sync
  // const [total, setTotal] = useState(0)
  // useEffect(() => {
  //   setTotal(items.reduce((s, i) => s + i.price * i.qty, 0))
  // }, [items])

  // ✅ derived during render; compiler memoises if needed
  const total = items.reduce((s, i) => s + i.price * i.qty, 0)
  const freeShipping = total >= 50

  return <p>Total: \${total.toFixed(2)} {freeShipping && '· Free shipping'}</p>
}`,
        note: 'The effect version renders once with the old total and then again. Deriving removes a state variable, an effect and a render.',
      },
      {
        title: '❌ event logic in an effect vs ✅ in the handler',
        code: `function CheckoutButton({ cart }: { cart: Cart }) {
  // ❌ fires again on remount (and twice in StrictMode); hard to trace
  // const [submitted, setSubmitted] = useState(false)
  // useEffect(() => {
  //   if (submitted) { placeOrder(cart); toast('Order placed') }
  // }, [submitted])

  // ✅ the user's click is the cause, so the handler does the work
  async function handleClick() {
    await placeOrder(cart)
    toast('Order placed')
  }
  return <button onClick={handleClick}>Place order</button>
}`,
        note: 'Effects run because of rendering, not because of user intent. Side effects caused by a specific interaction belong in that interaction\'s handler.',
      },
      {
        title: '❌ effect chain vs ✅ one handler computes everything',
        code: `// ❌ card → effect sets round → effect sets gameOver: 3 renders per move
// ✅
function handlePlayCard(card: Card) {
  const nextGold = gold + card.value
  setCard(card)
  setGold(nextGold)
  if (nextGold > 100) {
    setRound(r => r + 1)
    if (round === 5) setGameOver(true)
  }
}`,
        note: 'Computing the next state in one place yields one batched render and keeps the cause and effect visible together.',
      },
    ],
    realCase: {
      title: 'A form that saved twice',
      story: `A healthcare scheduling app used \`useEffect(() => { if (formState === 'submitted') saveAppointment(values) }, [formState])\`. In development every appointment was created twice (StrictMode), which the team "fixed" with a ref flag. In production, navigating back to the confirmation page remounted the component with \`formState === 'submitted'\` restored from a cache, and appointments were duplicated for real patients.

The fix moved \`saveAppointment\` into the submit handler (later a form Action with \`useActionState\`) and deleted the effect and the ref hack. Lesson: if code exists because the user clicked something, an effect is the wrong home, and a ref guard is a symptom, not a cure.`,
    },
    pitfalls: [
      'Storing derived values in state and syncing them with effects.',
      'Running POST requests or toasts from effects that watch "submitted" flags.',
      'Resetting state in an effect instead of using a `key`.',
      'Chains of effects that each set state for the next.',
      'Patching double-execution with a `useRef` flag instead of moving the logic.',
    ],
    exercise: {
      task: 'Refactor this component to have zero effects while keeping behaviour:\n\n```tsx\nfunction UserPicker({ users, onSelect }: Props) {\n  const [query, setQuery] = useState(\'\')\n  const [filtered, setFiltered] = useState(users)\n  const [selectedId, setSelectedId] = useState<string | null>(null)\n  useEffect(() => { setFiltered(users.filter(u => u.name.includes(query))) }, [users, query])\n  useEffect(() => { if (selectedId) onSelect(selectedId) }, [selectedId])\n  ...\n}\n```',
      hint: 'Filtered is derived; notifying the parent belongs in the click handler.',
      solution: `\`\`\`tsx
function UserPicker({ users, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const filtered = users.filter(u => u.name.toLowerCase().includes(query.toLowerCase()))

  function handlePick(id: string) {
    setSelectedId(id)
    onSelect(id)
  }

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ul>
        {filtered.map(u => (
          <li key={u.id} aria-selected={u.id === selectedId} onClick={() => handlePick(u.id)}>{u.name}</li>
        ))}
      </ul>
    </>
  )
}
\`\`\``,
    },
    interview: [
      'Give three examples of effects that should not be effects, and what replaces them.',
      'How do you decide between an event handler and an effect for a piece of logic?',
      'Why does storing derived data in state cause extra renders and bugs?',
    ],
  },

  'use-ref': {
    explanation: `\`useRef(initial)\` returns a plain object \`{ current: initial }\` that React keeps for the whole lifetime of the component. Changing \`ref.current\` does **not** trigger a re-render. That makes refs the escape hatch for values React does not need to render.

### Two main uses

**1. Referencing DOM nodes.** Pass a ref to a JSX element's \`ref\` attribute; after commit React sets \`ref.current\` to the DOM node, and back to \`null\` on unmount. Use it to focus inputs, scroll into view, measure size, play media, or hand a node to a non-React library.

**2. Storing mutable instance values.** Interval and timeout ids, the latest callback for a long-lived listener, an \`AbortController\`, a previous value, "has the user interacted yet" flags. Anything that must survive renders but does not affect the output.

### Refs vs state vs variables

- A **local variable** resets every render.
- **State** persists and triggers a re-render when changed; reads are snapshots.
- A **ref** persists and does not trigger a re-render; reads are always the latest mutable value.

If changing the value should change what is on screen, it must be state.

### Do not read or write refs during render

Render must be pure and predictable. Reading \`ref.current\` during render gives you a value React does not track, so the UI can show stale data and the compiler cannot reason about it. Write and read refs in event handlers and effects. The one accepted exception is lazy initialisation: \`if (ref.current === null) ref.current = createExpensiveThing()\`.

### Ref callbacks

Instead of an object you can pass a function: \`ref={node => { ... }}\`. React calls it with the node on attach. In React 19 the callback may **return a cleanup function**, which runs on detach; this is ideal for attaching observers (ResizeObserver, IntersectionObserver) to a node. Ref callbacks are also how you manage refs for a dynamic list of items (store nodes in a \`Map\` keyed by id).

### Refs to your own components (React 19)

\`ref\` is now a normal prop for function components. A component that wants to expose its inner DOM node simply forwards \`ref\` to it. To expose a limited imperative API instead (\`open()\`, \`scrollToBottom()\`), use \`useImperativeHandle(ref, () => ({ ... }))\`. Keep imperative APIs rare; props are the primary interface.

### TypeScript

\`useRef<HTMLInputElement>(null)\` for DOM refs (read as possibly \`null\`). \`useRef<number | undefined>(undefined)\` for values like timer ids. In React 19 \`useRef\` requires an argument.`,
    examples: [
      {
        title: 'Focus management and an interval id',
        code: `function Stopwatch() {
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<number | undefined>(undefined)
  const startButtonRef = useRef<HTMLButtonElement>(null)

  function start() {
    if (intervalRef.current !== undefined) return
    intervalRef.current = window.setInterval(() => setElapsed(e => e + 100), 100)
  }
  function stop() {
    window.clearInterval(intervalRef.current)
    intervalRef.current = undefined
    startButtonRef.current?.focus()
  }
  useEffect(() => () => window.clearInterval(intervalRef.current), [])

  return (
    <>
      <output>{(elapsed / 1000).toFixed(1)}s</output>
      <button ref={startButtonRef} onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
    </>
  )
}`,
        note: 'The interval id never appears in the UI, so it is a ref. `elapsed` is shown, so it is state. Refs are read only in handlers and cleanup.',
      },
      {
        title: '❌ ref read in render vs ✅ state; React 19 ref cleanup',
        code: `// ❌ UI does not update when clicks.current changes
function LikeButtonBad() {
  const clicks = useRef(0)
  return <button onClick={() => clicks.current++}>Likes: {clicks.current}</button>
}

// ✅ visible value lives in state
function LikeButton() {
  const [likes, setLikes] = useState(0)
  return <button onClick={() => setLikes(l => l + 1)}>Likes: {likes}</button>
}

// ✅ React 19 ref callback with cleanup to observe size
function AutoSizeChart({ data }: { data: Point[] }) {
  const [width, setWidth] = useState(0)
  return (
    <div ref={node => {
      if (!node) return
      const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
      ro.observe(node)
      return () => ro.disconnect()
    }}>
      <Chart data={data} width={width} />
    </div>
  )
}`,
        note: 'Mutating a ref never re-renders, so rendering `clicks.current` shows stale numbers. The ref callback returns a cleanup that disconnects the observer when the node detaches.',
      },
    ],
    realCase: {
      title: 'A "save draft" timer that saved forever',
      story: `A blogging platform autosaved drafts with \`let timer = setTimeout(save, 2000)\` as a plain variable inside the editor component, clearing it on each keystroke with \`clearTimeout(timer)\`. Because the variable reset on every render, \`clearTimeout\` always received \`undefined\`, so every keystroke scheduled a save and the server received dozens of overlapping saves, sometimes out of order, overwriting newer text with older.

Storing the timer id in \`useRef\` (and clearing it on unmount) made debouncing work. Lesson: values that must persist across renders without affecting output belong in a ref, not a local variable.`,
    },
    pitfalls: [
      'Reading or writing `ref.current` during render.',
      'Using a ref for values that should be displayed (no re-render on change).',
      'Keeping timer ids or controllers in plain variables that reset every render.',
      'Forgetting DOM refs are `null` before mount and after unmount.',
      'Exposing large imperative APIs via refs instead of props.',
    ],
    exercise: {
      task: 'Build a chat message list that auto-scrolls to the newest message when one arrives, **unless** the user has scrolled up to read history. Use refs for the scroll container and for the "user is near bottom" flag.',
      hint: 'Update the flag in an onScroll handler; in an effect that depends on messages.length, scroll only if the flag is true.',
      solution: `\`\`\`tsx
function MessageList({ messages }: { messages: Message[] }) {
  const listRef = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)

  function handleScroll() {
    const el = listRef.current!
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
  }

  useEffect(() => {
    const el = listRef.current
    if (el && nearBottom.current) el.scrollTop = el.scrollHeight
  }, [messages.length])

  return (
    <div ref={listRef} onScroll={handleScroll} className="messages">
      {messages.map(m => <p key={m.id}>{m.text}</p>)}
    </div>
  )
}
\`\`\`

\`nearBottom\` does not affect rendering, so a ref avoids re-rendering on every scroll event.`,
    },
    interview: [
      'Compare a ref, state and a local variable. When do you use each?',
      'Why should you not read `ref.current` during render?',
      'What changed with refs in React 19 (ref as a prop, ref callback cleanup)?',
    ],
  },

  'use-reducer': {
    explanation: `\`useReducer(reducer, initialState)\` is an alternative to \`useState\` that moves update logic out of event handlers into a single pure function:

\`\`\`ts
const [state, dispatch] = useReducer(reducer, initialState)
\`\`\`

Handlers \`dispatch\` **actions** that describe *what happened* (\`{ type: 'item_added', product }\`), and the reducer decides *how state changes*: \`(state, action) => nextState\`.

### Why use it

- **Many transitions on related data.** A cart with add, remove, change quantity, apply coupon, clear: with \`useState\` that logic is scattered across handlers. With a reducer it lives in one readable switch.
- **Next state depends on several pieces of current state.** The reducer always receives the latest state, so there are no stale closures.
- **Testability.** A reducer is a pure function: call it with a state and an action, assert the result. No rendering needed.
- **Debuggability.** Logging actions gives a timeline of what happened.
- **Stable dispatch.** \`dispatch\` never changes identity, so passing it down (or through context) does not break memoisation.

### Rules for reducers

- Pure: no fetches, timers, random ids or mutation. React may call reducers twice in StrictMode.
- Return new objects for changes (immutability), return the same \`state\` when nothing changed.
- Actions describe events in user/domain terms (\`'checkout_started'\`), not setters (\`'set_loading_true'\`).
- Handle unknown actions explicitly; in TypeScript use an exhaustive \`switch\` with a \`never\` check.

### Discriminated unions

In TypeScript, model actions as a union keyed by \`type\`. Inside each \`case\` TypeScript narrows the action, so \`action.productId\` only exists where it should. You can also model *state* as a union (\`{ status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string }\`) to make impossible states unrepresentable; the reducer becomes a small state machine.

### Lazy initialisation

\`useReducer(reducer, arg, init)\` calls \`init(arg)\` once to build initial state, e.g. loading from \`localStorage\`.

### When not to use it

A single toggle or text input is clearer with \`useState\`. Reducers add ceremony; use them when the number or complexity of transitions justifies it. A good signal: you find yourself writing several \`setX\` calls together in many handlers.

### Scaling up

\`useReducer\` + context is a lightweight global store pattern (state context + dispatch context). The same reducer concept underlies Redux Toolkit and many state machines.`,
    examples: [
      {
        title: 'Cart reducer with a discriminated union',
        code: `type CartItem = { productId: string; name: string; price: number; qty: number }
type CartState = { items: CartItem[]; coupon: string | null }

type CartAction =
  | { type: 'item_added'; item: Omit<CartItem, 'qty'> }
  | { type: 'quantity_changed'; productId: string; qty: number }
  | { type: 'item_removed'; productId: string }
  | { type: 'coupon_applied'; code: string }
  | { type: 'cleared' }

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'item_added': {
      const existing = state.items.find(i => i.productId === action.item.productId)
      return existing
        ? { ...state, items: state.items.map(i => (i === existing ? { ...i, qty: i.qty + 1 } : i)) }
        : { ...state, items: [...state.items, { ...action.item, qty: 1 }] }
    }
    case 'quantity_changed':
      return action.qty <= 0
        ? { ...state, items: state.items.filter(i => i.productId !== action.productId) }
        : { ...state, items: state.items.map(i => (i.productId === action.productId ? { ...i, qty: action.qty } : i)) }
    case 'item_removed':
      return { ...state, items: state.items.filter(i => i.productId !== action.productId) }
    case 'coupon_applied':
      return { ...state, coupon: action.code.trim().toUpperCase() }
    case 'cleared':
      return { items: [], coupon: null }
    default: {
      const exhaustive: never = action
      return exhaustive
    }
  }
}`,
        note: 'Every transition is in one place, TypeScript narrows each case, and the `never` check fails compilation if a new action type is added but not handled.',
      },
      {
        title: '❌ scattered setters vs ✅ dispatching events',
        code: `// ❌ each handler must remember every related update
function removeBad(id: string) {
  setItems(items.filter(i => i.productId !== id))
  if (items.length === 1) setCoupon(null)
  setLastAction('remove')
}

// ✅ handler describes what happened
const [cart, dispatch] = useReducer(cartReducer, { items: [], coupon: null })
const remove = (productId: string) => dispatch({ type: 'item_removed', productId })`,
        note: 'With setters, business rules leak into every handler and read possibly stale values. The reducer owns the rules and always sees the latest state.',
      },
    ],
    realCase: {
      title: 'A multi-step insurance quote wizard',
      story: `An insurance quote wizard had seven steps and about fifteen \`useState\` calls: current step, answers per step, validation errors, loading, quote result. Bugs kept appearing: going back after an error left the error visible, or the quote stayed from a previous set of answers.

The team rewrote it as a reducer with a state union (\`editing\`, \`calculating\`, \`quoted\`, \`failed\`) and actions like \`step_submitted\`, \`back_clicked\`, \`quote_received\`. Clearing stale quotes became a single line in \`back_clicked\`, and the reducer got thirty fast unit tests. Lesson: when correctness depends on several values changing together, centralise the transitions.`,
    },
    pitfalls: [
      'Side effects (fetch, toast, random ids) inside the reducer.',
      'Mutating `state` and returning it.',
      'Action names that are setters rather than events.',
      'Using a reducer for trivial state where `useState` is clearer.',
      'Forgetting a default/exhaustive case, silently returning `undefined`.',
    ],
    exercise: {
      task: 'Implement a reducer for a data-fetching state machine with states `idle | loading | success(data) | error(message)` and actions `fetch_started`, `fetch_succeeded(data)`, `fetch_failed(message)`, `reset`. Ignore `fetch_succeeded` unless currently loading. Write two unit tests.',
      hint: 'Model state as a discriminated union on `status`; check `state.status` before accepting results.',
      solution: `\`\`\`ts
type State<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }

type Action<T> =
  | { type: 'fetch_started' }
  | { type: 'fetch_succeeded'; data: T }
  | { type: 'fetch_failed'; message: string }
  | { type: 'reset' }

export function fetchReducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case 'fetch_started': return { status: 'loading' }
    case 'fetch_succeeded': return state.status === 'loading' ? { status: 'success', data: action.data } : state
    case 'fetch_failed': return state.status === 'loading' ? { status: 'error', message: action.message } : state
    case 'reset': return { status: 'idle' }
  }
}

// tests (Vitest)
test('accepts data while loading', () => {
  expect(fetchReducer({ status: 'loading' }, { type: 'fetch_succeeded', data: 1 })).toEqual({ status: 'success', data: 1 })
})
test('ignores late data after reset', () => {
  const idle = { status: 'idle' } as const
  expect(fetchReducer(idle, { type: 'fetch_succeeded', data: 1 })).toBe(idle)
})
\`\`\``,
    },
    interview: [
      'When would you choose `useReducer` over `useState`?',
      'Why must reducers be pure, and what happens in StrictMode?',
      'How do discriminated unions improve reducer type safety?',
    ],
  },

  'use-context': {
    explanation: `Context lets a component provide a value to its entire subtree without passing it through every intermediate component as props ("prop drilling").

### The three parts

1. \`const ThemeContext = createContext<Theme>('light')\` creates the context with a default value used when no provider is above.
2. A provider: \`<ThemeContext value={theme}>...</ThemeContext>\`. In React 19 the context object itself is the provider; \`<ThemeContext.Provider>\` still works but is no longer needed.
3. A consumer: \`const theme = useContext(ThemeContext)\` (or \`use(ThemeContext)\`, which can also be called conditionally). It reads the value from the **nearest** provider above in the tree.

### How updates propagate

When a provider's \`value\` changes (by \`Object.is\`), React re-renders **every component that reads that context**, even if it is behind a \`memo\` boundary, and even if it only uses a part of the value that did not change. Components that do not read the context are unaffected by the context itself (they may still re-render because their parent did).

This is the main performance trap: \`value={{ user, setUser }}\` creates a new object every render of the provider, so every consumer re-renders every time the provider renders. Solutions:

- Keep values stable (the React Compiler memoises this automatically; otherwise \`useMemo\`).
- **Split contexts** by update frequency: one for rarely changing data (current user, theme), another for frequently changing data. A common pattern is separate state and dispatch contexts, since \`dispatch\` never changes.
- Move frequently changing state down, closer to where it is used.
- For high-frequency global state with selective subscriptions, use an external store (Zustand, Redux) with selectors.

### What context is good for

Data that many components at different depths need and that changes relatively rarely: theme, locale, authenticated user, feature flags, a design-system's form-field context, a router. It is also the mechanism for **compound components** (a \`Tabs\` parent sharing state with \`Tab\` children).

### What context is not

Context is not a state manager; it is a transport. State still lives in some component (\`useState\`/\`useReducer\`) and context delivers it. Before reaching for context, try composition: passing JSX as \`children\` often removes the drilling entirely.

### A good custom hook

Wrap every context in a hook that throws if the provider is missing: \`useCart()\`. This gives better errors, a single import, and lets you change the implementation later.`,
    examples: [
      {
        title: 'Typed context with a guard hook (React 19 syntax)',
        code: `type AuthValue = { user: User | null; signOut: () => Promise<void> }
const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const signOut = async () => { await api.signOut(); setUser(null) }
  // With the React Compiler this object is memoised automatically
  return <AuthContext value={{ user, signOut }}>{children}</AuthContext>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}`,
        note: 'Defaulting to `null` and throwing in the hook catches missing providers immediately instead of failing with "cannot read property of undefined" far away.',
      },
      {
        title: '❌ one big context vs ✅ split by update frequency',
        code: `// ❌ every cursor move re-renders the toolbar, sidebar and anything reading user/theme
<AppContext value={{ user, theme, cursorPosition, setCursorPosition }}>

// ✅ separate contexts; rare data and frequent data do not mix
<UserContext value={user}>
  <ThemeContext value={theme}>
    <CursorContext value={cursorPosition}>
      <CursorDispatchContext value={setCursorPosition}>
        <Editor />
      </CursorDispatchContext>
    </CursorContext>
  </ThemeContext>
</UserContext>`,
        note: 'Consumers re-render when the context they read changes. Components that only need to *set* the cursor read the stable dispatch context and never re-render on movement.',
      },
    ],
    realCase: {
      title: 'A design tool that stuttered when dragging',
      story: `A whiteboard app stored everything in one \`EditorContext\`: document, selection, zoom, and the live pointer position. Dragging a shape updated the pointer 60 times a second, and every component that read the context (toolbars, layer panel, comments) re-rendered each time. Dragging felt sluggish on mid-range laptops.

Profiling showed hundreds of components re-rendering per frame. The team split the context into stable (document, actions) and volatile (pointer) parts, and moved pointer tracking into an external store with selector subscriptions. Re-renders per frame dropped to the canvas alone. Lesson: context is fine for data that changes occasionally; for high-frequency updates, split it or use a store with selectors.`,
    },
    pitfalls: [
      'Putting high-frequency state into a widely consumed context.',
      'Creating a new value object on every provider render without memoisation (pre-compiler code).',
      'Using context to avoid passing props one or two levels; composition is usually simpler.',
      'Forgetting the provider and silently getting the default value.',
      'Expecting `memo` to stop context-driven re-renders; it does not.',
    ],
    exercise: {
      task: 'Build a `Tabs` compound component: `<Tabs defaultValue="details"><TabList><Tab value="details">Details</Tab><Tab value="reviews">Reviews</Tab></TabList><TabPanel value="details">...</TabPanel><TabPanel value="reviews">...</TabPanel></Tabs>`. Children communicate through context; each `Tab` must have correct ARIA attributes.',
      hint: 'Tabs holds `active` state and provides `{ active, setActive }`; Tab and TabPanel read it.',
      solution: `\`\`\`tsx
const TabsContext = createContext<{ active: string; setActive: (v: string) => void } | null>(null)
const useTabs = () => {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tab components must be inside <Tabs>')
  return ctx
}

export function Tabs({ defaultValue, children }: { defaultValue: string; children: React.ReactNode }) {
  const [active, setActive] = useState(defaultValue)
  return <TabsContext value={{ active, setActive }}>{children}</TabsContext>
}
export const TabList = ({ children }: { children: React.ReactNode }) => <div role="tablist">{children}</div>

export function Tab({ value, children }: { value: string; children: React.ReactNode }) {
  const { active, setActive } = useTabs()
  return (
    <button role="tab" id={\`tab-\${value}\`} aria-selected={active === value} aria-controls={\`panel-\${value}\`} onClick={() => setActive(value)}>
      {children}
    </button>
  )
}
export function TabPanel({ value, children }: { value: string; children: React.ReactNode }) {
  const { active } = useTabs()
  if (active !== value) return null
  return <div role="tabpanel" id={\`panel-\${value}\`} aria-labelledby={\`tab-\${value}\`}>{children}</div>
}
\`\`\``,
    },
    interview: [
      'When a context value changes, which components re-render? Does `memo` help?',
      'How would you structure context for state that changes very frequently?',
      'When is composition a better solution than context for prop drilling?',
    ],
  },

  'memo-hooks': {
    explanation: `React re-renders a component whenever its parent re-renders, its state changes, or a context it reads changes. Usually that is cheap. Memoisation tools let you skip work when inputs have not changed.

### The three tools

- \`useMemo(() => compute(a, b), [a, b])\` caches a **computed value** between renders and recomputes only when a dependency changes (\`Object.is\`).
- \`useCallback(fn, [deps])\` caches a **function reference**. It is exactly \`useMemo(() => fn, deps)\`.
- \`memo(Component)\` caches a **component's render**: if all props are \`Object.is\`-equal to last time, React reuses the previous result and skips rendering it (and its subtree, unless state/context inside changes).

### Why they exist: reference equality

Every render creates new objects and functions. A \`memo\` child receiving \`onSelect={() => ...}\` gets a new function each time, so the memo never hits. \`useCallback\` stabilises the reference. Similarly, an effect depending on a computed object re-runs every render unless the object is memoised. So memo hooks serve two purposes: **avoiding expensive recomputation** and **preserving identities** so other optimisations work.

### The React Compiler changes the default

With the React Compiler enabled, the build step automatically memoises values, callbacks and JSX at a fine-grained level, often better than hand-written code (it can memoise after early returns and conditionals, which hooks cannot). In compiled code you should rarely add \`useMemo\`/\`useCallback\`/\`memo\` yourself. You still need to understand them to:

- Read and maintain existing code and libraries.
- Handle code the compiler skips (components that break the Rules of React).
- Control effect dependencies precisely where a stable identity is semantically required.

### When manual memoisation is worth it (without the compiler)

- A computation that is measurably slow (profile first; \`console.time\` or the React Profiler). Filtering 200 items is not slow; parsing a 5 MB CSV is.
- Passing values or callbacks to a \`memo\` component or into a dependency array.
- A component that re-renders often with the same props and is itself expensive.

### Costs and limits

Memoisation is not free: it keeps old values in memory, adds comparison work, and clutters code. It also only works if dependencies are stable; one inline object in the deps defeats the whole chain. \`useMemo\` is a performance hint, not a semantic guarantee: React may discard the cache. Never rely on it for correctness (like keeping a WebSocket alive).

### Better than memo: structure

Often you can avoid re-renders by moving state down (into the component that needs it) or lifting content up (passing children as props so they are created by a parent that does not re-render).`,
    examples: [
      {
        title: 'Manual memoisation (pre-compiler code you will read)',
        code: `const ProductRow = memo(function ProductRow({ product, onAdd }: { product: Product; onAdd: (id: string) => void }) {
  return <tr><td>{product.name}</td><td><button onClick={() => onAdd(product.id)}>Add</button></td></tr>
})

function Catalog({ products, query }: { products: Product[]; query: string }) {
  const [cart, setCart] = useState<string[]>([])

  const visible = useMemo(
    () => products.filter(p => p.name.toLowerCase().includes(query.toLowerCase())),
    [products, query],
  )
  const handleAdd = useCallback((id: string) => setCart(c => [...c, id]), [])

  return <table><tbody>{visible.map(p => <ProductRow key={p.id} product={p} onAdd={handleAdd} />)}</tbody></table>
}`,
        note: 'Without `useCallback`, `handleAdd` would be a new function each render and every `memo` row would re-render when the cart changes. The updater form lets the callback have no dependencies.',
      },
      {
        title: '❌ memo broken by an inline prop vs ✅ moving state down',
        code: `// ❌ ExpensiveChart is memoised, but options is new every render
function DashboardBad() {
  const [hovered, setHovered] = useState<string | null>(null)
  return (
    <>
      <Legend onHover={setHovered} hovered={hovered} />
      <ExpensiveChart options={{ theme: 'dark' }} />
    </>
  )
}

// ✅ no memo needed: the hover state lives where it is used
function Dashboard() {
  return (
    <>
      <InteractiveLegend />        {/* owns its hover state */}
      <ExpensiveChart options={CHART_OPTIONS} /> {/* module-level constant */}
    </>
  )
}`,
        note: 'Restructuring so frequently changing state does not live above the expensive component is often simpler and more robust than memoisation.',
      },
    ],
    realCase: {
      title: 'A trading table that froze on every tick',
      story: `A brokerage-style demo app rendered a 2,000-row positions table that re-rendered fully on every price tick because the parent held all prices in one state object and passed \`onSelect={() => ...}\` inline to each row.

Wrapping rows in \`memo\` did nothing until the callback was stabilised with \`useCallback\` and each row received only its own price as a primitive prop. Re-renders per tick fell from 2,000 rows to the handful that changed. When the team later adopted the React Compiler, they removed most manual hooks; the compiler produced the same result, and the remaining win came from the data shape (per-row props). Lesson: memoisation works only when the identities flowing into it are stable, and data shape matters more than hooks.`,
    },
    pitfalls: [
      'Memoising everything by default, adding cost and noise without measurable benefit.',
      'Wrapping a component in `memo` while passing it inline objects/functions.',
      'Relying on `useMemo` for correctness; React may discard the cache.',
      'Missing or wrong dependencies, producing stale values.',
      'Adding manual memo hooks in code already optimised by the React Compiler.',
    ],
    exercise: {
      task: 'Profile a list of 5,000 contacts with a search box and a "favourite" toggle per row. First observe (React DevTools Profiler, "Highlight updates") that typing re-renders every row. Then reduce re-renders, once with manual `memo`/`useCallback`, and once by enabling the React Compiler and removing the manual code.',
      hint: 'Rows need stable props: the contact object (unchanged references when toggling another row) and a stable `onToggle(id)` callback.',
      solution: `\`\`\`tsx
const ContactRow = memo(function ContactRow({ contact, onToggle }: { contact: Contact; onToggle: (id: string) => void }) {
  return <li>{contact.name} <button onClick={() => onToggle(contact.id)}>{contact.favourite ? '★' : '☆'}</button></li>
})

function Contacts({ initial }: { initial: Contact[] }) {
  const [contacts, setContacts] = useState(initial)
  const [query, setQuery] = useState('')
  const onToggle = useCallback(
    (id: string) => setContacts(cs => cs.map(c => (c.id === id ? { ...c, favourite: !c.favourite } : c))),
    [],
  )
  const visible = useMemo(() => contacts.filter(c => c.name.includes(query)), [contacts, query])
  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ul>{visible.map(c => <ContactRow key={c.id} contact={c} onToggle={onToggle} />)}</ul>
    </>
  )
}
\`\`\`

Toggling one contact now re-renders only that row, because \`map\` keeps every other contact's reference. With the compiler enabled, delete \`memo\`, \`useCallback\` and \`useMemo\` and the profiler should show the same result.`,
    },
    interview: [
      'What is the difference between `useMemo`, `useCallback` and `memo`?',
      'Why does a memoised child still re-render when you pass it an inline arrow function?',
      'How does the React Compiler change when you should write memoisation by hand?',
    ],
  },

  'react19-hooks': {
    explanation: `React 19 (19.0 through 19.3, the current line in late 2026) added APIs that make async UI, especially forms and mutations, first-class. They revolve around **Actions**: async functions run inside a transition, with React tracking their pending state, errors and results.

### Actions and transitions

\`startTransition(async () => { ... })\` (or \`useTransition\`'s \`startTransition\`) now accepts async functions. While the action runs, \`isPending\` is true; state updates inside are applied together when it settles. A \`<form action={fn}>\` automatically runs \`fn(formData)\` as an Action, resets uncontrolled fields after success, and works with progressive enhancement in frameworks that support Server Functions.

### useActionState

\`const [state, formAction, isPending] = useActionState(action, initialState)\`

Your \`action(prevState, formData)\` returns the next state, for example \`{ error: 'Email taken' }\` or \`{ ok: true }\`. Pass \`formAction\` to \`<form action>\` or a button's \`formAction\`. Calls are queued in order. It replaces the classic trio of \`useState\` for error, \`useState\` for loading and a submit handler.

### useFormStatus

\`const { pending, data, method } = useFormStatus()\` from \`react-dom\` reads the status of the **parent** \`<form>\`. It must be called in a component rendered *inside* the form, which makes reusable \`SubmitButton\` components possible without prop drilling.

### useOptimistic

\`const [optimisticItems, addOptimistic] = useOptimistic(items, (current, newItem) => [...current, newItem])\`

During an Action you call \`addOptimistic(...)\` to show the expected result immediately. When the Action finishes and the real \`items\` update, the optimistic value is discarded and replaced by the truth. If the Action fails, it simply reverts. Great for likes, chat messages, toggles.

### use

\`use(resource)\` reads a **promise** or a **context** during render. With a promise, the component suspends until it resolves (the nearest \`Suspense\` shows a fallback) and the nearest error boundary catches rejection. Unlike hooks, \`use\` can be called inside conditions and loops. The promise must be **stable**: created outside render (in a loader, a cache, a parent Server Component), not \`use(fetch(...))\` inline, which would create a new promise each render.

### Related React 19 changes

- \`ref\` is a regular prop for function components, so new code no longer needs \`forwardRef\`; ref callbacks can return cleanup.
- Render \`<Context value>\` directly as the provider; \`<Context.Provider>\` is no longer needed.
- Document metadata (\`title\`, \`meta\`, \`link\`) rendered anywhere is hoisted to \`head\`.
- \`useTransition\` and \`useDeferredValue\` keep urgent input responsive while slower updates render in the background. Since 19.3, separate Transitions render independently, so a slow one no longer blocks unrelated ones.
- 19.2 added \`<Activity>\` (hide a subtree while keeping its state) and \`useEffectEvent\` (read the latest props in an effect without making them dependencies).

### New in React 19.3 (September 2026)

- **\`<ViewTransition>\`** from \`react\` is stable. It animates enter, exit, update and shared-element changes using the browser's View Transitions, but **only for updates inside a Transition** (\`startTransition\`, a \`<Suspense>\` reveal, or \`useDeferredValue\`). The default is a cross-fade; customise it with View Transition Classes on \`enter\`, \`exit\`, \`update\`, \`share\` or \`default\` (for example \`default="none"\`) plus CSS, or with \`onEnter\`/\`onExit\`/\`onUpdate\`/\`onShare\`. Enter/exit only animate when the \`<ViewTransition>\` comes before any DOM node in its subtree, and shared \`name\`s must be unique. Wrapping a \`<Suspense>\` animates fallback → content.
- **\`addTransitionType(type)\`**, called inside \`startTransition\`, labels the transition so \`enter\`/\`exit\` can take a map like \`{ next: 'from-right', previous: 'from-left' }\`; CSS can match it with \`:active-view-transition-type(...)\`.
- **Fragment refs**: \`<Fragment ref={ref}>\` gives a \`FragmentInstance\` that can add event listeners, \`focus\`/\`focusLast\`/\`blur\`, \`observeUsing\` an IntersectionObserver or ResizeObserver, \`getClientRects\` and \`scrollIntoView\` across its children, with no wrapper \`div\`.
- **\`use(browser())\`** with \`browser\` from \`react-dom\` opts a component out of server rendering: on the server it suspends so the nearest Suspense fallback goes into the HTML; on the client it renders normally. It may be called conditionally.

### Mental model

Instead of manually juggling \`isLoading\`, \`error\` and rollback logic, you describe the async work as an Action and let React handle pending state, ordering and reconciliation with the eventual truth.`,
    examples: [
      {
        title: 'Signup form with useActionState and useFormStatus',
        code: `import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

type State = { error?: string; ok?: boolean }

async function signup(_prev: State, formData: FormData): Promise<State> {
  const email = String(formData.get('email') ?? '')
  if (!email.includes('@')) return { error: 'Enter a valid email' }
  const res = await fetch('/api/signup', { method: 'POST', body: formData })
  if (res.status === 409) return { error: 'That email is already registered' }
  if (!res.ok) return { error: 'Something went wrong, try again' }
  return { ok: true }
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return <button disabled={pending}>{pending ? 'Creating…' : 'Create account'}</button>
}

export function SignupForm() {
  const [state, formAction] = useActionState(signup, {})
  if (state.ok) return <p>Check your inbox to confirm.</p>
  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      {state.error && <p role="alert">{state.error}</p>}
      <SubmitButton />
    </form>
  )
}`,
        note: 'No manual loading/error state or `preventDefault`. `SubmitButton` reads the pending status of whatever form it is placed in.',
      },
      {
        title: 'Optimistic comments',
        code: `function Comments({ comments, postId }: { comments: Comment[]; postId: string }) {
  const [optimistic, addOptimistic] = useOptimistic(
    comments,
    (current, text: string) => [...current, { id: 'temp-' + current.length, text, pending: true }],
  )

  async function send(formData: FormData) {
    const text = String(formData.get('text'))
    addOptimistic(text)
    await api.addComment(postId, text) // parent refetches → comments prop updates
  }

  return (
    <>
      <ul>{optimistic.map(c => <li key={c.id} style={{ opacity: c.pending ? 0.5 : 1 }}>{c.text}</li>)}</ul>
      <form action={send}><input name="text" /><button>Post</button></form>
    </>
  )
}`,
        note: 'The comment appears instantly at half opacity. When the Action ends, React drops the optimistic layer and shows the real `comments`; on failure the temporary item disappears.',
      },
      {
        title: '❌ use with an inline promise vs ✅ a stable promise',
        code: `// ❌ new promise every render → suspends forever / refetch loop
function ProfileBad({ id }: { id: string }) {
  const user = use(fetch(\`/api/users/\${id}\`).then(r => r.json()))
  return <h1>{user.name}</h1>
}

// ✅ promise created once (by a cache, loader or parent) and passed in
function Profile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise)
  return <h1>{user.name}</h1>
}

// parent
<Suspense fallback={<Skeleton />}>
  <Profile userPromise={getUserCached(id)} />
</Suspense>`,
        note: '`use` reads a promise; it does not cache one. The promise must keep its identity across renders, so it comes from a cache or a parent.',
      },
      {
        title: 'Directional slide with ViewTransition (React 19.3)',
        code: `import { ViewTransition, addTransitionType, startTransition, useState } from 'react'

function Gallery({ photos }: { photos: Photo[] }) {
  const [index, setIndex] = useState(0)
  const photo = photos[index]

  function go(delta: 1 | -1) {
    startTransition(() => {
      addTransitionType(delta === 1 ? 'next' : 'previous')
      setIndex(i => (i + delta + photos.length) % photos.length)
    })
  }

  return (
    <>
      <ViewTransition
        key={photo.id}
        enter={{ next: 'from-right', previous: 'from-left' }}
        exit={{ next: 'to-left', previous: 'to-right' }}
      >
        <img src={photo.src} alt={photo.alt} />
      </ViewTransition>
      <button onClick={() => go(-1)}>Previous</button>
      <button onClick={() => go(1)}>Next</button>
    </>
  )
}

/* CSS: style the classes, e.g.
::view-transition-new(.from-right) { animation: slide-in-from-right 250ms; } */`,
        note: 'The update is wrapped in `startTransition`, so it animates. `addTransitionType` picks which class from the `enter`/`exit` maps applies; changing `key` makes the old image exit and the new one enter.',
      },
    ],
    realCase: {
      title: 'Removing 200 lines of form boilerplate',
      story: `A SaaS settings area had a dozen forms, each with \`isSubmitting\`, \`error\`, \`success\` state, a submit handler with \`preventDefault\`, try/catch, and a disabled-button prop drilled into custom buttons. Double submissions still slipped through when users pressed Enter twice.

During the React 19 upgrade the team converted each form to \`useActionState\` with a shared \`SubmitButton\` using \`useFormStatus\`, and the "favourite" toggles to \`useOptimistic\`. Roughly 200 lines of state plumbing disappeared, pending UI became consistent, and Actions queued submissions instead of racing them. Lesson: the new hooks are not just syntax; they encode the async UI patterns teams kept rewriting by hand.`,
    },
    pitfalls: [
      'Calling `use(fetch(...))` with a promise created during render.',
      'Calling `useFormStatus` in the same component that renders the form (it reads a parent form only).',
      'Forgetting that `useActionState` actions receive `prevState` as the first argument.',
      'Not wrapping components that call `use(promise)` in Suspense and an error boundary.',
      'Expecting `useOptimistic` state to persist; it reverts once the Action settles.',
      'Expecting `<ViewTransition>` to animate a plain `setState`; only updates inside a Transition animate.',
    ],
    exercise: {
      task: 'Build a "Like" button for a post using `useOptimistic` and an Action. It should update instantly, show the real count after the server responds, and revert if the request fails (simulate failures randomly on a fake API).',
      hint: 'Keep real `likes` in state, call `addOptimistic` inside `startTransition`, then set the real value from the server response.',
      solution: `\`\`\`tsx
function LikeButton({ postId, initialLikes }: { postId: string; initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes)
  const [optimisticLikes, addOptimistic] = useOptimistic(likes, (n, delta: number) => n + delta)
  const [isPending, startTransition] = useTransition()

  function like() {
    startTransition(async () => {
      addOptimistic(1)
      try {
        const real = await api.like(postId) // returns the new total
        startTransition(() => setLikes(real))
      } catch {
        // nothing to do: optimistic value reverts automatically
      }
    })
  }

  return <button onClick={like} disabled={isPending}>♥ {optimisticLikes}</button>
}
\`\`\`

If \`api.like\` throws, \`likes\` never changes, so when the transition ends \`optimisticLikes\` falls back to the real count.`,
    },
    interview: [
      'What is an Action in React 19, and how do `useActionState` and `<form action>` use it?',
      'How does `useOptimistic` decide when to drop the optimistic value?',
      'Why must the promise passed to `use` be stable, and where should it come from?',
      'What did React 19.3 stabilise (`<ViewTransition>`, Fragment refs, `browser()`), and what problem does each solve?',
    ],
  },

  rules: {
    explanation: `Hooks have two rules, and both follow from how React stores hook state.

### How hooks are stored

React keeps, for each component instance (fiber), a **linked list of hook slots**. During render, the first \`useState\` call gets slot 1, the second hook gets slot 2, and so on. There are no names; React only knows "this is the third hook called". On the next render it walks the same list in the same order and hands each call its stored state.

### Rule 1: only call hooks at the top level

Do not call hooks inside conditions, loops, nested functions, after an early return, or in try/catch blocks. If a condition skips a hook on one render, every later hook shifts by one slot and receives another hook's state. React detects some cases ("Rendered fewer hooks than expected") but the safe rule is: same hooks, same order, every render. If you need conditional behaviour, put the condition *inside* the hook (e.g. inside the effect). \`use\` is the exception: it is not stored by order and may be called conditionally.

### Rule 2: only call hooks from React functions

Call hooks from function components or from custom hooks, never from regular functions, class components or event handlers. This guarantees React is rendering the right component when the hook runs.

The lint plugin \`eslint-plugin-react-hooks\` enforces both rules; the React Compiler also relies on them.

### Custom hooks

A custom hook is a function whose name starts with \`use\` and that calls other hooks. It lets you extract **stateful logic**, not state itself: every component calling \`useOnlineStatus()\` gets its own independent state. The \`use\` prefix is how humans, the linter and the compiler know the rules apply.

Good custom hooks:

- Have a focused purpose named after *what* they do (\`useDebouncedValue\`, \`useMediaQuery\`, \`useCart\`), not lifecycle (\`useMount\`).
- Return the minimum API: a value, a tuple, or a small object.
- Hide effects and subscriptions behind a declarative interface, so components read like a description of behaviour.
- Accept reactive values as arguments and re-sync when they change.

Do not make a function a hook just to share code; if it calls no hooks, it is a plain function and should not start with \`use\`.

### Why this design?

Order-based storage keeps hooks cheap (no keys to manage), composable (custom hooks are just functions calling hooks), and free of name collisions when two custom hooks both use \`useState\` internally. The price is the rules, which tooling now enforces automatically.`,
    examples: [
      {
        title: '❌ conditional hook vs ✅ condition inside',
        code: `function OrderDetails({ orderId, isAdmin }: { orderId: string; isAdmin: boolean }) {
  // ❌ when isAdmin flips, every hook after this shifts slots
  // if (isAdmin) {
  //   const [notes, setNotes] = useState('')
  // }
  // const [tab, setTab] = useState('summary')

  // ✅ always call; decide what to do inside
  const [notes, setNotes] = useState('')
  const [tab, setTab] = useState<'summary' | 'items'>('summary')
  useEffect(() => {
    if (!isAdmin) return
    loadAdminNotes(orderId).then(setNotes)
  }, [isAdmin, orderId])
  // ...
}`,
        note: 'Hooks are identified by call position. Unconditional calls keep positions stable; the condition moves into the hook body.',
      },
      {
        title: 'A focused custom hook',
        code: `export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

// usage in a search page
function ProductSearch() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 400)
  const results = useProductSearch(debouncedQuery) // another custom hook
  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products" />
      <ResultsList results={results} />
    </>
  )
}`,
        note: 'The component reads declaratively: "debounce the query, then search". Each component calling `useDebouncedValue` has its own state and timer.',
      },
    ],
    realCase: {
      title: 'Feature flag that scrambled a form',
      story: `A marketplace added \`if (flags.giftWrap) { const [giftNote, setGiftNote] = useState('') }\` to its checkout component. The flag was loaded asynchronously, so it was false on the first render and true afterwards. When it flipped, React threw "Rendered more hooks than during the previous render" for some users; in a code path where a different hook was skipped, the shipping-method state appeared in the address field.

The lint rule had been disabled in that folder after a migration. The fix called \`useState\` unconditionally and rendered the gift note input conditionally, and the lint rule was re-enabled across the repo with CI enforcement. Lesson: hook order is load-bearing; never let flags or early returns change which hooks run.`,
    },
    pitfalls: [
      'Calling hooks after an early return (`if (!user) return null` before `useState`).',
      'Calling hooks in loops (`items.map(() => useState())`); extract a child component instead.',
      'Naming plain helper functions `useSomething`, or naming hooks without `use`.',
      'Expecting two components using the same custom hook to share state.',
      'Disabling the rules-of-hooks lint rule.',
    ],
    exercise: {
      task: 'Write `useLocalStorage<T>(key, initial)` that behaves like `useState` but persists to `localStorage`, survives JSON parse errors, and syncs across browser tabs via the `storage` event. Use it to persist a "dark mode" toggle.',
      hint: 'Lazy initial state reads storage once; an effect writes on change; another effect listens to `storage` for the same key.',
      solution: `\`\`\`ts
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota or private mode */ }
  }, [key, value])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return
      try { setValue(JSON.parse(e.newValue) as T) } catch { /* ignore */ }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])

  return [value, setValue] as const
}

// usage
const [dark, setDark] = useLocalStorage('prefers-dark', false)
\`\`\``,
    },
    interview: [
      'Why must hooks be called in the same order on every render? What does React store?',
      'Do two components that call the same custom hook share state? Why or why not?',
      'Why can `use` be called conditionally while `useState` cannot?',
    ],
  },
}

export default details
