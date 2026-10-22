import type { TopicDetail } from '../types'

const details: Record<string, TopicDetail> = {
  'modern-syntax': {
    explanation: `Modern React code is written almost entirely in ES2015+ JavaScript. If a line of a component looks cryptic, it is usually one of a handful of syntax features stacked together. Learning to read them fluently is the fastest way to stop "fighting" React code.

### The core toolkit

- **\`const\` / \`let\`**: block-scoped bindings. Use \`const\` by default; it does not make a value immutable, it only prevents reassigning the *binding*. \`const user = {}\` still lets you mutate \`user.name\`.
- **Arrow functions**: \`(a, b) => a + b\`. They have no own \`this\` and no \`arguments\`, which is why they fit event handlers and callbacks. A body in parentheses \`() => ({ id: 1 })\` returns an object literal; without the parentheses the braces are read as a function body.
- **Destructuring**: \`const { name, email = 'n/a' } = user\` and \`const [first, ...rest] = items\`. Every React component that writes \`function Card({ title, children })\` is destructuring its props object.
- **Spread and rest**: \`...\` copies (spread) or collects (rest). \`{ ...user, name }\` creates a new object, which is the backbone of immutable updates.
- **Template literals**: backtick strings with \`\${expr}\` interpolation, used for class names and URLs.
- **Optional chaining \`?.\` and nullish coalescing \`??\`**: \`order?.customer?.name ?? 'Guest'\`. \`??\` only falls back on \`null\`/\`undefined\`, unlike \`||\` which also replaces \`0\` and \`''\`.
- **ES modules**: \`export default\`, named exports, \`import { useState } from 'react'\`. Bundlers like Vite use the static import graph for tree shaking.

### Why it matters for React

React leans on *expressions*. JSX only accepts expressions inside \`{}\`, so ternaries, \`?.\`, \`??\` and \`.map()\` replace \`if\` statements and loops. State updates are written with spread because React needs new objects. Hooks return tuples that you destructure: \`const [count, setCount] = useState(0)\`.

### Newer additions worth knowing

ES2022–ES2024 added \`Array.prototype.at(-1)\` for the last element, \`Object.hasOwn\`, \`structuredClone\` for deep copies, \`Object.groupBy\` for grouping lists, and the non-mutating array methods (\`toSorted\`, \`toSpliced\`, \`with\`). Logical assignment (\`a ??= b\`) is handy outside render.

### When not to be clever

Syntax is for clarity. Five levels of nested destructuring with defaults in a function signature is harder to read than two plain lines. Prefer the form a teammate understands at a glance.`,
    examples: [
      {
        title: '❌ || swallows valid zeros vs ✅ ??',
        code: `type Product = { name: string; stock?: number; discount?: number | null }

// ❌ A product with stock 0 shows "Unknown", discount 0 becomes 10
function labelBad(p: Product) {
  const stock = p.stock || 'Unknown'
  const discount = p.discount || 10
  return \`\${p.name}: \${stock} left, \${discount}% off\`
}

// ✅ Only null/undefined fall back
function labelGood(p: Product) {
  const stock = p.stock ?? 'Unknown'
  const discount = p.discount ?? 10
  return \`\${p.name}: \${stock} left, \${discount}% off\`
}`,
        note: '`||` treats every falsy value (0, empty string, false, NaN) as missing. In inventory, pricing and counters, 0 is real data, so `??` is almost always what you mean.',
      },
      {
        title: 'Destructuring props with defaults and rest',
        code: `type ButtonProps = {
  variant?: 'primary' | 'ghost'
  size?: 'sm' | 'md'
  children: React.ReactNode
} & React.ComponentProps<'button'>

export function Button({ variant = 'primary', size = 'md', children, ...rest }: ButtonProps) {
  return (
    <button className={\`btn btn-\${variant} btn-\${size}\`} {...rest}>
      {children}
    </button>
  )
}`,
        note: 'Defaults live in the destructuring pattern, and `...rest` forwards everything else (onClick, disabled, aria-*) to the real element. This one pattern powers most design-system components.',
      },
    ],
    realCase: {
      title: 'Free shipping that never showed up',
      story: `An online grocery team displayed "Shipping: {fee || 'Calculated at checkout'}" on the cart page. When marketing launched free shipping (fee = 0), customers saw "Calculated at checkout" instead of "Free", and support tickets spiked because people assumed a hidden fee.

The root cause was \`||\` treating \`0\` as missing. The fix was \`fee ?? 'Calculated at checkout'\` plus an explicit branch rendering "Free" when \`fee === 0\`. The team added a lint rule (\`@typescript-eslint/prefer-nullish-coalescing\`) so the mistake could not return. Lesson: choose operators based on which values are *meaningful* in your domain, not on what looks shortest.`,
    },
    pitfalls: [
      'Returning an object from an arrow without parentheses: `() => { id: 1 }` returns undefined because the braces are a block.',
      'Assuming `const` makes objects immutable; it only freezes the binding, not the contents.',
      'Using `||` for defaults where 0, false or empty string are valid values.',
      'Spreading is shallow: `{ ...user }` still shares `user.address` with the original.',
      'Chaining `?.` everywhere to hide data that should never be missing; it turns a clear crash into a silent blank UI.',
    ],
    exercise: {
      task: 'Write `formatOrder(order)` for an order shaped `{ id: string; customer?: { name?: string }; items: { price: number; qty: number }[]; coupon?: { percent: number } | null }`. Return a string like "#A12 for Dana: $45.00 (10% off)". Use destructuring, optional chaining, nullish coalescing and a template literal. Missing name becomes "Guest"; no coupon means no suffix.',
      hint: 'Destructure `id`, `items`, `coupon` in the parameter, compute the subtotal with reduce, then build the suffix with a ternary.',
      solution: `\`\`\`ts
type Order = {
  id: string
  customer?: { name?: string }
  items: { price: number; qty: number }[]
  coupon?: { percent: number } | null
}

export function formatOrder({ id, customer, items, coupon }: Order) {
  const name = customer?.name ?? 'Guest'
  const subtotal = items.reduce((sum, { price, qty }) => sum + price * qty, 0)
  const percent = coupon?.percent ?? 0
  const total = subtotal * (1 - percent / 100)
  const suffix = percent > 0 ? \` (\${percent}% off)\` : ''
  return \`#\${id} for \${name}: $\${total.toFixed(2)}\${suffix}\`
}
\`\`\`

Note the \`percent > 0\` check: a 0% coupon should not print "(0% off)".`,
    },
    interview: [
      'What is the difference between `??` and `||`? Give a React example where using the wrong one causes a bug.',
      'Why does `const` not prevent `user.name = "x"`? How would you make an object truly read-only?',
      'Explain what `function Card({ title, ...rest })` does step by step.',
    ],
  },

  arrays: {
    explanation: `Almost every screen in a React app is a list: products, messages, rows, notifications. Array methods are the vocabulary you use to turn raw data into UI, so you need to know both what they return and whether they change the original.

### Transform, select, aggregate

- \`map(fn)\` returns a new array of the same length. In JSX it turns data into elements: \`items.map(i => <Row key={i.id} item={i} />)\`.
- \`filter(fn)\` returns a new, shorter array of items whose callback returned truthy. Search boxes and tabs are filters.
- \`reduce(fn, initial)\` folds an array into one value: totals, counts, lookup maps. Always pass an initial value; without it an empty array throws.
- \`find\` / \`findIndex\` / \`findLast\` return the first match (or \`undefined\` / \`-1\`). \`some\` and \`every\` answer yes/no questions and stop early.
- \`flatMap\` maps then flattens one level, useful when one item produces zero or many outputs.

### Mutating vs non-mutating

This is the part that matters most for React. Some methods change the array in place: \`push\`, \`pop\`, \`shift\`, \`unshift\`, \`splice\`, \`sort\`, \`reverse\`, \`fill\`. If you call them on state, the array reference stays the same, React's \`Object.is\` check sees "no change", and your UI does not update (or updates inconsistently).

Each has a non-mutating equivalent:

- \`push(x)\` → \`[...arr, x]\`
- \`splice(i, 1)\` → \`arr.filter((_, idx) => idx !== i)\` or \`arr.toSpliced(i, 1)\`
- \`sort(cmp)\` → \`arr.toSorted(cmp)\` (ES2023)
- \`reverse()\` → \`arr.toReversed()\`
- \`arr[i] = x\` → \`arr.with(i, x)\`

### Performance intuition

Chaining \`filter().map()\` creates an intermediate array. For lists of a few thousand items that cost is negligible compared to rendering DOM. Optimise readability first; reach for a single \`reduce\` or a \`for...of\` loop only when profiling says so.

### Derive, don't store

A powerful habit: keep the source array in state and *derive* filtered, sorted or grouped views during render. Storing \`filteredProducts\` in separate state invites the two copies to drift apart.`,
    examples: [
      {
        title: '❌ sort mutates state vs ✅ toSorted',
        code: `function ProductTable({ products }: { products: Product[] }) {
  const [sortBy, setSortBy] = useState<'price' | 'name'>('name')

  // ❌ sorts the parent's array in place during render
  // const rows = products.sort((a, b) => compare(a, b, sortBy))

  // ✅ new array, original untouched
  const rows = products.toSorted((a, b) =>
    sortBy === 'price' ? a.price - b.price : a.name.localeCompare(b.name),
  )

  return (
    <table>
      <tbody>{rows.map(p => <ProductRow key={p.id} product={p} />)}</tbody>
    </table>
  )
}`,
        note: '`sort` mutates the props array, which belongs to the parent. Other components reading the same array suddenly see a different order. `toSorted` derives a view without side effects.',
      },
      {
        title: 'reduce to build a cart summary',
        code: `type Line = { sku: string; price: number; qty: number; category: string }

function summarize(lines: Line[]) {
  return lines.reduce(
    (acc, line) => {
      const amount = line.price * line.qty
      acc.total += amount
      acc.byCategory[line.category] = (acc.byCategory[line.category] ?? 0) + amount
      return acc
    },
    { total: 0, byCategory: {} as Record<string, number> },
  )
}`,
        note: 'Mutating the accumulator is fine here because it is a fresh object created by this call, not shared state. The initial value also defines the result type.',
      },
    ],
    realCase: {
      title: 'The leaderboard that reordered the history panel',
      story: `A fitness app showed a "Top runs" leaderboard and a "Recent runs" history side by side, both reading the same \`runs\` array from a store. The leaderboard component did \`runs.sort((a, b) => b.distance - a.distance)\` during render.

Symptom: the "Recent runs" panel sometimes appeared sorted by distance instead of date, but only after the leaderboard had rendered, which made the bug look random. Root cause: \`sort\` mutated the shared array. Fix: \`runs.toSorted(...)\`, plus freezing store data in development with \`Object.freeze\` so future mutations throw immediately. Lesson: any method that mutates is a shared-state bug waiting for a second reader.`,
    },
    pitfalls: [
      'Calling `sort`/`reverse` on props or state; they mutate in place and return the same reference.',
      'Forgetting the initial value in `reduce`, which throws on an empty array and gives surprising types.',
      'Using `map` for side effects and ignoring the result; use `forEach` or `for...of` instead.',
      'Using `find` and forgetting it can return `undefined`.',
      'Storing derived arrays (filtered/sorted) in state instead of computing them from the source.',
    ],
    exercise: {
      task: 'Given `tasks: { id: number; title: string; done: boolean; priority: 1 | 2 | 3 }[]`, write pure functions: `toggle(tasks, id)`, `remove(tasks, id)`, `openByPriority(tasks)` (undone tasks sorted by priority, high = 1 first) and `countDone(tasks)`. None may mutate the input.',
      hint: 'map for toggle, filter for remove, filter + toSorted for the view, reduce or filter().length for the count.',
      solution: `\`\`\`ts
type Task = { id: number; title: string; done: boolean; priority: 1 | 2 | 3 }

export const toggle = (tasks: Task[], id: number) =>
  tasks.map(t => (t.id === id ? { ...t, done: !t.done } : t))

export const remove = (tasks: Task[], id: number) => tasks.filter(t => t.id !== id)

export const openByPriority = (tasks: Task[]) =>
  tasks.filter(t => !t.done).toSorted((a, b) => a.priority - b.priority)

export const countDone = (tasks: Task[]) =>
  tasks.reduce((n, t) => (t.done ? n + 1 : n), 0)
\`\`\`

Test it by freezing the input (\`Object.freeze\`) and checking nothing throws.`,
    },
    interview: [
      'Which array methods mutate? What are their ES2023 non-mutating alternatives?',
      'Why is `items.sort()` inside a component a bug even if the UI seems to work?',
      'When would you choose `reduce` over `filter` + `map`, and when is a plain loop clearer?',
    ],
  },

  immutability: {
    explanation: `Immutability means you never change existing data; you create a new version with the change applied. In React this is not a style preference, it is how the library detects change.

### Why React needs it

When you call \`setState(next)\`, React compares \`next\` with the previous value using \`Object.is\`. If they are the same reference, React bails out and may skip rendering. Memoised components (\`memo\`, the React Compiler's automatic memoisation) also compare props by reference. So if you mutate an object and pass the same object back, React literally cannot see that anything changed.

Immutability also gives you snapshots: each render's state is a frozen moment in time. That is what makes features like undo/redo, time-travel debugging, concurrent rendering and transitions possible; React can keep an old tree and a new tree side by side because the old data was not overwritten.

### How to update immutably

Copy every level you change, and reuse every level you do not:

- Object field: \`{ ...user, name }\`
- Nested field: \`{ ...user, address: { ...user.address, city } }\`
- Array add: \`[...items, item]\`
- Array remove: \`items.filter(i => i.id !== id)\`
- Array replace: \`items.map(i => i.id === id ? { ...i, qty } : i)\`

Notice the structural sharing: unchanged items keep their references, which lets memoised rows skip re-rendering.

### Deep copies are not the answer

\`structuredClone(state)\` or \`JSON.parse(JSON.stringify(...))\` creates a brand-new tree where *every* reference changes, defeating memoisation and costing time. Copy only the path you modify.

### When nesting gets painful

If updates require four levels of spread, consider flattening (normalising) state, for example storing entities by id, or using \`useReducer\` to centralise updates. Libraries like Immer let you write "mutating" code against a draft and produce an immutable result; that is a tool, not a replacement for understanding the principle.

### Local mutation is fine

Mutating something you *just created* inside a function (an accumulator, a new array you build before returning) is harmless. The rule is about not mutating data that someone else may already hold: state, props, context values, store data.`,
    examples: [
      {
        title: '❌ mutating state vs ✅ copying the path',
        code: `type Cart = { items: { id: string; qty: number }[]; coupon: string | null }

function CartPage() {
  const [cart, setCart] = useState<Cart>({ items: [], coupon: null })

  // ❌ same object reference: React may not re-render
  function incrementBad(id: string) {
    const item = cart.items.find(i => i.id === id)!
    item.qty += 1
    setCart(cart)
  }

  // ✅ new cart, new items array, new item; other items reused
  function increment(id: string) {
    setCart(c => ({
      ...c,
      items: c.items.map(i => (i.id === id ? { ...i, qty: i.qty + 1 } : i)),
    }))
  }
  // ...
}`,
        note: 'In the bad version `setCart(cart)` passes the identical reference, so `Object.is` says nothing changed. The good version copies cart → items → the one item, and nothing else.',
      },
      {
        title: 'Nested profile update',
        code: `type Profile = { name: string; settings: { notifications: { email: boolean; sms: boolean } } }

const toggleSms = (p: Profile): Profile => ({
  ...p,
  settings: {
    ...p.settings,
    notifications: { ...p.settings.notifications, sms: !p.settings.notifications.sms },
  },
})`,
        note: 'Every object on the path from root to the changed field is copied. If this feels heavy, that is a signal to flatten state or use a reducer or Immer.',
      },
    ],
    realCase: {
      title: 'Checkout total stuck after quantity change',
      story: `A ticketing site's checkout let users change seat quantities. QA reported that the order total sometimes did not update until the user clicked elsewhere. The handler did \`order.lines[i].qty = newQty; setOrder({ ...order })\`.

The top-level copy did trigger a render of the page, but the \`OrderLines\` child was wrapped in \`memo\` and received \`order.lines\`, which was still the same array reference. It skipped re-rendering, so line totals were stale while the grand total (computed in the parent) was correct. The fix copied the path properly: \`lines: order.lines.map((l, idx) => idx === i ? { ...l, qty: newQty } : l)\`. Lesson: a shallow top-level copy is not immutability; every level you touch must be new.`,
    },
    pitfalls: [
      'Copying only the top level (`{ ...state }`) while mutating something nested inside.',
      'Using `push`, `splice` or index assignment on state arrays.',
      'Deep-cloning the whole state on each update, which breaks memoisation and wastes time.',
      'Mutating props or context values received from a parent.',
      'Thinking `Object.freeze` deep-freezes; it is shallow.',
    ],
    exercise: {
      task: 'Write an immutable `moveCard(board, cardId, fromColumnId, toColumnId)` for a Kanban board shaped `{ columns: { id: string; cardIds: string[] }[] }`. Only the two affected columns and the columns array should get new references.',
      hint: 'Map over columns: for the source column filter the id out, for the target append it, otherwise return the column unchanged.',
      solution: `\`\`\`ts
type Board = { columns: { id: string; cardIds: string[] }[] }

export function moveCard(board: Board, cardId: string, from: string, to: string): Board {
  if (from === to) return board
  return {
    ...board,
    columns: board.columns.map(col => {
      if (col.id === from) return { ...col, cardIds: col.cardIds.filter(id => id !== cardId) }
      if (col.id === to) return { ...col, cardIds: [...col.cardIds, cardId] }
      return col
    }),
  }
}
\`\`\`

Returning \`board\` unchanged when \`from === to\` lets React bail out entirely.`,
    },
    interview: [
      'Why does React rely on reference equality instead of deep comparison?',
      'What is structural sharing and why does it matter for memoised components?',
      'When is it acceptable to mutate an object inside a React app?',
    ],
  },

  references: {
    explanation: `JavaScript values come in two families. **Primitives** (string, number, boolean, null, undefined, bigint, symbol) are compared by their value: \`'a' === 'a'\` is true. **Objects** (including arrays, functions, dates, maps) are compared by *identity*: two objects are equal only if they are literally the same object in memory.

### The mental model

Think of a variable holding an object as holding an *address*. \`const a = { x: 1 }; const b = a\` copies the address, so \`a === b\` and changing \`b.x\` changes what \`a\` sees. \`const c = { x: 1 }\` creates a new object at a new address, so \`a === c\` is false even though they look identical.

### Why this is central to React

React and its tooling compare by reference all the time:

- \`setState\` bails out if \`Object.is(prev, next)\`.
- \`memo\` compares each prop with \`Object.is\`.
- Dependency arrays in \`useEffect\`, \`useMemo\`, \`useCallback\` compare each item with \`Object.is\`.
- Context consumers re-render when the provider's \`value\` reference changes.

That means **every object, array or function literal written inside a component body is new on every render**. \`style={{ color: 'red' }}\`, \`options={[1, 2]}\`, \`onClick={() => ...}\` all produce fresh references each time. Usually that is fine; rendering is cheap. It becomes a problem when such a value lands in a dependency array (the effect re-runs every render) or is passed to a memoised child (the memo never hits).

### Object.is vs ===

\`Object.is\` behaves like \`===\` except that \`Object.is(NaN, NaN)\` is true and \`Object.is(0, -0)\` is false. React uses \`Object.is\`.

### Fixes, in order of preference

1. Move constant objects outside the component (module scope) so they are created once.
2. Depend on primitives instead of objects: \`[user.id]\` instead of \`[user]\`.
3. Create the object *inside* the effect that needs it.
4. Let the React Compiler memoise, or use \`useMemo\`/\`useCallback\` manually when needed.

Understanding references explains a whole category of "why does this effect run forever" and "why does this memo not work" bugs.`,
    examples: [
      {
        title: '❌ object in deps loops vs ✅ primitive deps',
        code: `function OrdersList({ customerId }: { customerId: string }) {
  const [orders, setOrders] = useState<Order[]>([])

  // ❌ new object every render → effect runs every render → setOrders → render → ...
  const query = { customerId, status: 'open' }
  useEffect(() => {
    fetchOrders(query).then(setOrders)
  }, [query])

  // ✅ depend on the primitive; build the object inside
  useEffect(() => {
    let ignore = false
    fetchOrders({ customerId, status: 'open' }).then(o => { if (!ignore) setOrders(o) })
    return () => { ignore = true }
  }, [customerId])
  // ...
}`,
        note: '`query` is a new reference each render, so `Object.is(prevQuery, query)` is always false. Strings compare by value, so `[customerId]` only changes when the id really changes.',
      },
      {
        title: 'Hoisting constants out of the component',
        code: `// ✅ created once at module load
const CHART_OPTIONS = { responsive: true, legend: { position: 'bottom' } } as const

export function RevenueChart({ data }: { data: Point[] }) {
  return <LineChart data={data} options={CHART_OPTIONS} />
}`,
        note: 'Static configuration has no reason to live inside render. At module scope its identity is stable forever, so a memoised chart only re-renders when `data` changes.',
      },
    ],
    realCase: {
      title: 'An analytics dashboard hammering its API',
      story: `A SaaS analytics team noticed their metrics endpoint receiving roughly 60 requests per second from a single open dashboard tab. The \`useMetrics(filters)\` hook had \`useEffect(fetch, [filters])\`, and the page passed \`filters={{ range, region }}\` inline.

Each render created a new \`filters\` object, the effect fired, the response called \`setState\`, which re-rendered and created another new object. The fix changed the hook to depend on \`[filters.range, filters.region]\` and later moved fetching to a cache library keyed by a serialised filter. Lesson: dependency arrays compare identities, so pass primitives or stable references.`,
    },
    pitfalls: [
      'Putting inline object/array/function props into dependency arrays.',
      'Expecting `{a: 1} === {a: 1}` or `[] === []` to be true.',
      'Assigning an object to a new variable and thinking you copied it.',
      'Passing inline objects to `memo` children and wondering why memo never hits.',
    ],
    exercise: {
      task: 'Predict the output, then run it:\n\n```js\nconst a = { n: 1 }\nconst b = a\nconst c = { ...a }\nb.n = 2\nconsole.log(a.n, c.n, a === b, a === c, Object.is(NaN, NaN), NaN === NaN)\n```\n\nThen write `shallowEqual(x, y)` that returns true if two plain objects have the same keys and `Object.is`-equal values.',
      hint: 'Compare key counts first, then every key with Object.is and Object.hasOwn.',
      solution: `Output: \`2 1 true false true false\`.

\`\`\`ts
export function shallowEqual(x: Record<string, unknown>, y: Record<string, unknown>) {
  if (Object.is(x, y)) return true
  const kx = Object.keys(x)
  const ky = Object.keys(y)
  if (kx.length !== ky.length) return false
  return kx.every(k => Object.hasOwn(y, k) && Object.is(x[k], y[k]))
}
\`\`\`

This is essentially how \`memo\` compares props by default.`,
    },
    interview: [
      'Why does an inline arrow function prop break `memo`?',
      'What is the difference between `Object.is` and `===`?',
      'An effect with `[options]` in its deps runs every render. List three ways to fix it.',
    ],
  },

  closures: {
    explanation: `A closure is a function bundled together with the variables that were in scope when it was created. The function can keep reading those variables long after the outer function has returned.

### How it works

When JavaScript runs a function it creates a new *scope* (an environment record) holding its local variables. Any inner function created during that call keeps a reference to that scope. As long as the inner function is reachable, the scope stays alive. Each call creates a *new* scope, so two calls produce two independent closures.

\`\`\`js
function makeCounter() {
  let n = 0
  return () => ++n
}
const a = makeCounter(); a(); a() // 2
const b = makeCounter(); b()      // 1, separate n
\`\`\`

### Closures in React: every render is a call

A function component is called once per render. Each call has its own \`props\` and its own state values from \`useState\`. Every handler, effect and callback created during that render closes over *that render's* values. This is a feature: an event handler always sees the state consistent with the UI the user clicked.

It is also the source of **stale closures**: a function created in an early render that keeps running later still sees the old values. Classic cases:

- \`setInterval\` in an effect with \`[]\` deps reading \`count\`: it forever sees the initial \`count\`.
- An async handler that awaits, then reads state: it sees the value from when it started.
- Event listeners attached once to \`window\` that read props.

### Fixes

- **Updater functions**: \`setCount(c => c + 1)\` does not need the current value from the closure; React passes the latest.
- **Correct dependencies**: list the values the effect reads so it is recreated with fresh closures.
- **Refs** for "latest value" without re-subscribing: store it in \`ref.current\` and read it inside the long-lived callback.
- **\`useEffectEvent\`** (React 19.2) for logic inside effects that must read the latest props without being a dependency.

### Loops and \`var\`

With \`var\`, all callbacks created in a loop share one function-scoped variable. With \`let\`, each iteration gets a fresh binding. This old interview question is the same idea: closures capture *bindings*, not snapshots of values; React state looks like snapshots only because each render creates new bindings.`,
    examples: [
      {
        title: '❌ stale interval vs ✅ updater function',
        code: `function SessionTimer() {
  const [seconds, setSeconds] = useState(0)

  // ❌ closure from the first render: seconds is always 0, so it shows 1 forever
  useEffect(() => {
    const id = setInterval(() => setSeconds(seconds + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // ✅ no dependency on the captured value
  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  return <span>{seconds}s</span>
}`,
        note: 'The interval callback is created once and keeps the first render\'s `seconds` (0). The updater form receives the latest value from React instead of the closure.',
      },
      {
        title: 'Reading the latest value in a long-lived listener',
        code: `function useHotkey(key: string, onPress: () => void) {
  const latest = useRef(onPress)
  useEffect(() => { latest.current = onPress })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === key) latest.current() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [key])
}`,
        note: 'The listener subscribes once per key but always calls the newest `onPress` via the ref, avoiding both stale closures and constant re-subscription.',
      },
    ],
    realCase: {
      title: 'Chat messages sent to the previous room',
      story: `A support chat app let agents switch between conversations. A "send on Ctrl+Enter" listener was attached in \`useEffect(() => { window.addEventListener('keydown', onKey) }, [])\`, and \`onKey\` used \`roomId\` from props.

Agents occasionally sent replies to the customer they had been talking to before. The listener had closed over the \`roomId\` of the first render. The fix added \`roomId\` to the dependencies (with a proper cleanup) and later refactored to the ref pattern above. Lesson: any callback registered once must not read changing values directly from its closure.`,
    },
    pitfalls: [
      'Empty dependency arrays on effects that read props or state.',
      'Reading state after `await` and expecting the newest value.',
      'Silencing the exhaustive-deps lint rule instead of fixing the closure.',
      'Using `var` in loops that create callbacks.',
    ],
    exercise: {
      task: 'Build a `SearchBox` that logs "searching: <term>" 500 ms after the user stops typing (debounce). Make sure only the latest term is logged and timers are cleaned up on unmount.',
      hint: 'An effect depending on `term` that sets a timeout and returns a cleanup clearing it.',
      solution: `\`\`\`tsx
function SearchBox() {
  const [term, setTerm] = useState('')

  useEffect(() => {
    if (!term) return
    const id = setTimeout(() => console.log('searching:', term), 500)
    return () => clearTimeout(id)
  }, [term])

  return <input value={term} onChange={e => setTerm(e.target.value)} />
}
\`\`\`

Each keystroke creates a new effect whose closure holds that render's \`term\`; the cleanup cancels the previous timer, so only the last one fires.`,
    },
    interview: [
      'What is a stale closure in React, and how do updater functions avoid it?',
      'Why does each render of a component have its own event handlers?',
      'Explain the classic `for (var i...) setTimeout(() => console.log(i))` output and how `let` fixes it.',
    ],
  },

  async: {
    explanation: `JavaScript runs your code on a single thread. Asynchrony is how it waits for slow things (network, timers, user input) without freezing the page.

### The event loop

1. Run the current task's synchronous code until the call stack is empty.
2. Drain the **microtask queue** completely: Promise \`.then\` callbacks, code after \`await\`, \`queueMicrotask\`. Microtasks queued during this step also run now.
3. The browser may render (style, layout, paint).
4. Take the next **macrotask** (a timer, a network event, a click) and repeat.

Consequences: \`setTimeout(fn, 0)\` runs *after* all pending promise callbacks; an infinite microtask chain can block rendering; a long synchronous loop blocks clicks and paint.

### Promises and async/await

A Promise represents a value that will exist later; it is pending, then fulfilled or rejected exactly once. \`async\` functions always return a Promise; \`await\` pauses that function (not the thread) and resumes it as a microtask. Use \`try/catch\` around awaits, and \`Promise.all\` to run independent requests in parallel instead of awaiting them one by one. \`Promise.allSettled\` collects successes and failures; \`Promise.race\`/\`any\` pick the first.

### fetch specifics

\`fetch\` only rejects on network failure. A 404 or 500 still *resolves*; you must check \`res.ok\`. The body is a stream you read once with \`res.json()\`. Cancellation uses \`AbortController\`: pass \`signal\` and call \`abort()\`, which rejects with an \`AbortError\`.

### Why React developers care

- **Race conditions**: if a user types "re" then "react", the "re" response may arrive last and overwrite newer results. Ignore or abort stale requests.
- **Unmounted components**: a response arriving after navigation should not update state. Effect cleanups handle this.
- **Sequencing**: state updates after \`await\` happen in a later tick; React 18+ still batches them automatically.
- **Modern React** moves much of this into frameworks, data libraries (TanStack Query) and React 19 primitives (\`use\` with Suspense, Actions with pending state), but they are all built on the same event loop.`,
    examples: [
      {
        title: '❌ fetch without checks vs ✅ robust request helper',
        code: `// ❌ treats 500 HTML error pages as JSON, never cancellable
async function getUserBad(id: string) {
  const res = await fetch(\`/api/users/\${id}\`)
  return res.json()
}

// ✅ checks status, supports abort, typed result
export async function getUser(id: string, signal?: AbortSignal): Promise<User> {
  const res = await fetch(\`/api/users/\${id}\`, { signal })
  if (!res.ok) throw new Error(\`GET user \${id} failed: \${res.status}\`)
  return (await res.json()) as User
}`,
        note: '`fetch` resolves for HTTP errors. Without `res.ok` you parse error pages as data. Accepting a `signal` lets callers cancel stale requests.',
      },
      {
        title: 'Race-free search effect',
        code: `function useSearch(term: string) {
  const [results, setResults] = useState<Hit[]>([])
  useEffect(() => {
    if (!term) { setResults([]); return }
    const controller = new AbortController()
    fetch(\`/api/search?q=\${encodeURIComponent(term)}\`, { signal: controller.signal })
      .then(r => r.json())
      .then(setResults)
      .catch(err => { if (err.name !== 'AbortError') console.error(err) })
    return () => controller.abort()
  }, [term])
  return results
}`,
        note: 'Each new term aborts the previous request in cleanup, so an older, slower response can never overwrite newer results.',
      },
      {
        title: 'Parallel instead of serial awaits',
        code: `// ❌ ~3x slower: each waits for the previous
const user = await getUser(id)
const orders = await getOrders(id)
const tickets = await getTickets(id)

// ✅ independent requests start together
const [user2, orders2, tickets2] = await Promise.all([getUser(id), getOrders(id), getTickets(id)])`,
        note: 'Sequential awaits create a waterfall. When requests do not depend on each other, start them all and await together.',
      },
    ],
    realCase: {
      title: 'Search results that flickered back to old queries',
      story: `A real-estate listing site's search box fired a request per keystroke. Users typing "san f" quickly sometimes saw results for "sa" appear after the correct ones, because the backend answered short queries slower (they matched more rows).

The effect simply did \`fetch(...).then(setResults)\` with no cleanup. The fix aborted the previous request in the effect cleanup and debounced input by 250 ms. Later the team moved to a query library that keys cache entries by search term. Lesson: responses do not arrive in the order requests were sent; every async UI needs a plan for stale results.`,
    },
    pitfalls: [
      'Assuming `fetch` rejects on 4xx/5xx.',
      'Awaiting independent requests sequentially (waterfalls).',
      'Ignoring race conditions between overlapping requests.',
      'Making the `useEffect` callback itself `async`; it must return a cleanup function, not a Promise.',
      'Forgetting that `setTimeout(fn, 0)` runs after microtasks, not immediately.',
    ],
    exercise: {
      task: 'Predict the log order:\n\n```js\nconsole.log(1)\nsetTimeout(() => console.log(2), 0)\nPromise.resolve().then(() => console.log(3))\nqueueMicrotask(() => console.log(4))\n;(async () => { console.log(5); await null; console.log(6) })()\nconsole.log(7)\n```\n\nThen write `fetchWithTimeout(url, ms)` that rejects if the request takes longer than `ms`.',
      hint: 'Synchronous first, then microtasks in queue order, then timers. For the timeout, use AbortSignal.timeout or an AbortController with setTimeout.',
      solution: `Order: \`1 5 7 3 4 6 2\`. The async function body runs synchronously until its first \`await\`.

\`\`\`ts
export async function fetchWithTimeout(url: string, ms: number) {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms) })
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`)
  return res.json()
}
\`\`\``,
    },
    interview: [
      'Explain microtasks vs macrotasks and give the output order of a mixed example.',
      'How do you prevent a race condition when fetching in a React effect?',
      'Why does `fetch` resolve on a 500 response, and how should calling code handle it?',
    ],
  },

  'dom-events': {
    explanation: `Users interact with the page through events. Understanding how the browser dispatches them explains most "why did my click handler fire twice" or "why did the form reload the page" puzzles.

### Propagation phases

When you click a button inside a card inside a list, the event travels in three phases:

1. **Capture**: from \`window\` down through ancestors to the target.
2. **Target**: at the element that was clicked (\`event.target\`).
3. **Bubble**: back up from the target through every ancestor.

Listeners run in bubble phase by default. \`event.currentTarget\` is the element whose listener is running; \`event.target\` is where the event started. \`stopPropagation()\` stops the journey; \`preventDefault()\` cancels the browser's built-in action (navigating a link, submitting a form, checking a box) but does not stop propagation. They are independent.

### Event delegation

Because events bubble, one listener on a parent can handle clicks for thousands of children by inspecting \`event.target\`. This is cheaper than attaching a listener per row.

### How React does it

React uses delegation at scale: it attaches one listener per event type at the **root container** (since React 17) and dispatches *synthetic events* to your \`onClick\`, \`onChange\` handlers. The synthetic event wraps the native one (\`e.nativeEvent\`) with a consistent API. Capture handlers exist too: \`onClickCapture\`. Some differences matter:

- React's \`onChange\` on inputs fires on every keystroke (like native \`input\`), not on blur.
- \`stopPropagation\` in a React handler stops React propagation; native listeners on \`document\` may still see the event depending on timing.
- Events bubble through the **React tree**, not the DOM tree, so an event inside a portal reaches its React parent even though the DOM node lives elsewhere.

### Practical rules

- Forms: handle \`onSubmit\` on the \`form\` and call \`e.preventDefault()\` (or use React 19 form Actions, which handle this for you).
- Prefer \`button type="button"\` for non-submitting buttons inside forms; the default type is submit.
- Use \`stopPropagation\` sparingly; it breaks analytics, outside-click detection and delegation elsewhere. Often checking \`e.target\` or restructuring markup is cleaner.
- Passive listeners (\`{ passive: true }\`) for scroll/touch improve performance.`,
    examples: [
      {
        title: '❌ nested click triggers row navigation vs ✅ intentional handling',
        code: `function OrderRow({ order, onOpen, onDelete }: RowProps) {
  return (
    <tr onClick={() => onOpen(order.id)}>
      <td>{order.number}</td>
      <td>
        {/* ❌ clicking delete also bubbles to <tr> and opens the order */}
        {/* <button onClick={() => onDelete(order.id)}>Delete</button> */}

        {/* ✅ stop only this event from reaching the row */}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onDelete(order.id) }}
        >
          Delete
        </button>
      </td>
    </tr>
  )
}`,
        note: 'Bubbling means the row handler runs after the button handler. Stopping propagation is justified here because the two actions conflict; a cleaner design is a dedicated "Open" link instead of a clickable row.',
      },
      {
        title: 'Form submission without page reload',
        code: `function NewsletterForm() {
  const [email, setEmail] = useState('')
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    subscribe(email)
  }
  return (
    <form onSubmit={handleSubmit}>
      <label>Email <input type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
      <button>Subscribe</button>
    </form>
  )
}`,
        note: 'Handling `onSubmit` (not the button click) also covers pressing Enter in the field. `preventDefault` stops the native full-page submission.',
      },
    ],
    realCase: {
      title: 'A dropdown that closed before its option was chosen',
      story: `A project-management tool built a custom select. It closed itself with a \`mousedown\` listener on \`document\` that checked "was the click outside the menu?". The menu was rendered in a portal at the end of \`body\`, so the DOM containment check \`menuRef.current.contains(e.target)\` against the trigger's wrapper returned false for option clicks.

Symptom: clicking an option closed the menu before the option's \`onClick\` fired, so nothing was selected. Fix: include the portal's node in the containment check, and listen for \`click\` rather than \`mousedown\`. Lesson: React synthetic events follow the component tree, but native DOM listeners and \`contains\` follow the DOM tree; portals make those differ.`,
    },
    pitfalls: [
      'Confusing `preventDefault` (cancel default action) with `stopPropagation` (stop bubbling).',
      'Forgetting buttons inside a form default to `type="submit"`.',
      'Using `e.target` when you meant `e.currentTarget` (target may be a nested icon).',
      'Calling the handler instead of passing it: `onClick={save()}` runs during render.',
      'Overusing `stopPropagation` and breaking outside-click or analytics listeners.',
    ],
    exercise: {
      task: 'Build a `TodoList` that uses a single `onClick` on the `ul` (event delegation) to handle "toggle" and "delete" buttons in each `li`. Use `data-id` and `data-action` attributes.',
      hint: 'Use `(e.target as HTMLElement).closest(\'button\')` to find the clicked button and read its dataset.',
      solution: `\`\`\`tsx
function TodoList({ todos, onToggle, onDelete }: Props) {
  function handleClick(e: React.MouseEvent<HTMLUListElement>) {
    const btn = (e.target as HTMLElement).closest('button')
    if (!btn) return
    const { id, action } = btn.dataset
    if (!id) return
    if (action === 'toggle') onToggle(id)
    if (action === 'delete') onDelete(id)
  }
  return (
    <ul onClick={handleClick}>
      {todos.map(t => (
        <li key={t.id}>
          {t.title}
          <button type="button" data-id={t.id} data-action="toggle">Toggle</button>
          <button type="button" data-id={t.id} data-action="delete">Delete</button>
        </li>
      ))}
    </ul>
  )
}
\`\`\`

In React per-item handlers are usually fine; this shows the mechanism React itself uses.`,
    },
    interview: [
      'Describe the capture, target and bubble phases.',
      'Where does React attach its event listeners, and how do portals affect propagation?',
      'What is the difference between `event.target` and `event.currentTarget`?',
    ],
  },

  'html-css': {
    explanation: `React renders HTML and the browser styles it with CSS. No component library removes the need to understand both; they just generate them for you.

### Semantic HTML first

Elements carry meaning that browsers, screen readers and search engines use:

- \`button\` is focusable, activates with Enter and Space, and announces itself as a button. A \`div onClick\` does none of that.
- \`a href\` is for navigation; \`button\` is for actions.
- \`label\` linked to an input (wrap it, or use \`htmlFor\`) makes the label clickable and gives the input an accessible name.
- Landmarks (\`header\`, \`nav\`, \`main\`, \`footer\`, \`aside\`) let assistive-tech users jump around.
- Heading levels (\`h1\`–\`h6\`) form an outline; do not pick them for font size.
- \`fieldset\`/\`legend\` group radio buttons; \`table\` is for tabular data.

Correct semantics gets you most of accessibility for free; ARIA is for filling gaps, not replacing native elements.

### Layout: Flexbox and Grid

- **Flexbox** is one-dimensional: a row or a column. Great for toolbars, nav bars, centering, and distributing space with \`gap\`, \`justify-content\`, \`align-items\`, \`flex: 1\`.
- **Grid** is two-dimensional: rows and columns together. Great for page layouts, card galleries (\`grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))\`) and dashboards.

### The box model and sizing

Every element is content + padding + border + margin. Set \`box-sizing: border-box\` globally so width includes padding and border. Use \`rem\` for type and spacing (respects user font size), \`%\`/\`fr\`/\`vw\` for fluid layout, \`min()\`, \`max()\`, \`clamp()\` for responsive values without media queries.

### Responsive design

Design mobile-first: base styles for small screens, then \`@media (min-width: ...)\` to enhance. Container queries (\`@container\`) let a component respond to *its own* width, which suits reusable React components better than viewport queries.

### Custom properties

\`--color-accent: #4f46e5\` defined on \`:root\` and used via \`var(--color-accent)\` enables theming (dark mode by redefining variables), and they can be changed at runtime from React with \`style={{ '--progress': '40%' }}\`.

### Specificity and the cascade

Conflicting rules are resolved by origin, layer, specificity, then order. Keep specificity low (single classes), avoid \`!important\`, and use \`@layer\` to order resets, base, components and utilities. Every React styling approach (CSS Modules, Tailwind, CSS-in-JS) is a strategy for managing this cascade.`,
    examples: [
      {
        title: '❌ div button vs ✅ real button',
        code: `// ❌ not focusable, no keyboard support, not announced as a button
<div className="btn" onClick={addToCart}>Add to cart</div>

// ✅ keyboard, focus, screen-reader role all built in
<button type="button" className="btn" onClick={addToCart}>Add to cart</button>`,
        note: 'Recreating a button with a div requires `role`, `tabIndex` and key handlers, and still tends to be buggy. The native element is free and correct.',
      },
      {
        title: 'Responsive product grid with Grid and custom properties',
        code: `/* products.css */
:root { --gap: 1rem; --card-min: 220px; }

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--card-min), 1fr));
  gap: var(--gap);
}

.product-card {
  display: flex;
  flex-direction: column;
  padding: clamp(0.75rem, 2vw, 1.25rem);
}
.product-card .price { margin-top: auto; } /* pushes price to the bottom */`,
        note: 'No media queries needed: Grid fits as many columns as the width allows. Inside each card Flexbox with `margin-top: auto` aligns prices across cards of different heights.',
      },
    ],
    realCase: {
      title: 'An accessibility audit before a public-sector contract',
      story: `A booking platform bidding for a municipal contract failed an accessibility audit: keyboard users could not open the date picker or submit the form, and screen readers announced "clickable, clickable" with no labels. The UI had been built with \`div\`s styled as buttons and placeholder text instead of labels.

The team replaced clickable divs with \`button\`, added \`label\` elements to every input, fixed the heading hierarchy and visible focus styles. Most issues disappeared without any ARIA. Lesson: semantic HTML is the cheapest accessibility work you will ever do, and it is far harder to retrofit later.`,
    },
    pitfalls: [
      'Using `div`/`span` with `onClick` instead of `button` or `a`.',
      'Placeholder text as the only label for inputs.',
      'Removing focus outlines (`outline: none`) without a visible replacement.',
      'Using Flexbox hacks for two-dimensional layouts that Grid solves directly.',
      'Escalating specificity or `!important` to win style conflicts.',
    ],
    exercise: {
      task: 'Build a responsive, accessible sign-up form: name, email, a plan radio group (Free/Pro), and a submit button. On wide screens the name and email fields sit side by side; on narrow screens they stack. Every control must be reachable and operable with the keyboard only.',
      hint: 'Use `label`, `fieldset` + `legend` for the radios, and a Grid with `repeat(auto-fit, minmax(240px, 1fr))` for the fields.',
      solution: `\`\`\`tsx
export function SignupForm() {
  return (
    <form className="signup">
      <div className="fields">
        <label>Name <input name="name" autoComplete="name" required /></label>
        <label>Email <input name="email" type="email" autoComplete="email" required /></label>
      </div>
      <fieldset>
        <legend>Plan</legend>
        <label><input type="radio" name="plan" value="free" defaultChecked /> Free</label>
        <label><input type="radio" name="plan" value="pro" /> Pro</label>
      </fieldset>
      <button>Create account</button>
    </form>
  )
}
\`\`\`

\`\`\`css
.fields { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.signup label { display: flex; flex-direction: column; gap: .25rem; }
.signup :focus-visible { outline: 2px solid var(--accent, #4f46e5); outline-offset: 2px; }
\`\`\``,
    },
    interview: [
      'When would you choose Grid over Flexbox?',
      'Why is a `button` better than a `div` with an onClick? What would you need to add to make the div equivalent?',
      'How do container queries differ from media queries, and why do they suit component-based UIs?',
    ],
  },
}

export default details
