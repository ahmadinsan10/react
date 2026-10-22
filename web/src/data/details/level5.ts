import type { TopicDetail } from '../types'

const details: Record<string, TopicDetail> = {
  placement: {
    explanation: `Most "state management problems" are not about libraries. They are about **state living in the wrong place**, usually too high. Every piece of state has a natural home; picking it well removes prop drilling, needless re-renders and synchronisation bugs.

### The ladder, from closest to widest

1. **Derived, not stored**: if you can compute it from props or other state during render (a filtered list, a total, \`isValid\`), don't store it at all.
2. **Local state** (\`useState\`/\`useReducer\`) in the one component that uses it: an open dropdown, a hover state, an input draft.
3. **Lifted state**: two siblings need it, so move it to their closest common parent and pass it down.
4. **URL**: it should survive refresh, be shareable or work with the back button: filters, tabs, pagination, selected item.
5. **Context**: many components at different depths need a rarely changing value: theme, locale, current user, a feature-scoped service.
6. **External store** (Zustand, Redux, Jotai): app-wide client state that changes often and is read in many places, needing fine-grained subscriptions: a cart, editor state, a multi-step wizard spanning routes.
7. **Server cache** (TanStack Query, loaders): anything the server owns.

Always pick the **closest level that works**, and move it up only when a concrete need appears.

### Why "too high" hurts

State placed high means every update re-renders a large subtree, components are coupled to a global they don't need, tests require providers, and features can't be removed cleanly. A search input's text in Redux causes app-wide subscriber checks per keystroke for no benefit.

### Why "too low" hurts

State placed too low forces syncing: two components each hold a copy, and effects try to keep them aligned. The symptom is \`useEffect(() => setX(props.y), [props.y])\`. That almost always means the state should be lifted, derived, or keyed.

### Colocation

Keep state, the components that use it and their tests in the same feature folder. When a feature is deleted, its state disappears with it. Colocation also makes code review easier: the reader sees every writer of a piece of state.

### A quick decision checklist

- Can it be derived? Derive it.
- Does only one component use it? Local.
- Should a URL capture it? URL.
- Does the server own it? Query cache.
- Is it read widely and changes rarely? Context.
- Is it read widely and changes often? Store with selectors.`,
    examples: [
      {
        title: '❌ Duplicated + synced state vs ✅ derived and lifted',
        code: `// ❌ storing a copy of derived data and syncing with an effect
function CartSummaryBad({ items }: { items: CartItem[] }) {
  const [total, setTotal] = useState(0)
  useEffect(() => {
    setTotal(items.reduce((sum, i) => sum + i.price * i.qty, 0))
  }, [items]) // extra render, briefly wrong total
  return <p>Total: {formatMoney(total)}</p>
}

// ✅ derived during render
function CartSummary({ items }: { items: CartItem[] }) {
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  return <p>Total: {formatMoney(total)}</p>
}

// ✅ selection lifted to the closest common parent, not a global store
function InboxPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  return (
    <div className="split">
      <MessageList selectedId={selectedId} onSelect={setSelectedId} />
      <MessagePreview messageId={selectedId} />
    </div>
  )
}`,
        note: 'The total cannot drift because it is never stored. Selection is shared by exactly two siblings, so their parent owns it. If selection must survive refresh, the next step up is a search param, not Redux.',
      },
    ],
    realCase: {
      title: 'A global store for everything',
      story: `**Situation:** an HR platform put almost all state in one Redux store: form drafts, modal flags, hover states and API data. **Symptom:** typing in any field caused noticeable lag on low-end laptops; deleting an old feature took a week because its slices were referenced everywhere. **Root cause:** state lived far above its consumers, and every keystroke dispatched a global action that ran every subscriber's selector. **Fix:** form drafts moved to React Hook Form, modal flags to local state, API data to TanStack Query, filters to the URL. Redux kept auth-adjacent UI preferences only. **Lesson:** global is the last resort, not the default.`,
    },
    pitfalls: [
      'Storing derived values and syncing them with effects.',
      'Putting state in a global store "in case someone needs it later".',
      'Keeping shareable view state (filters, tabs) in memory instead of the URL.',
      'Lifting state to the app root when a nearer common parent exists.',
    ],
    exercise: {
      task: 'Take a page with a list, a filter bar, a detail drawer and a "compact view" preference. Decide the home of each piece of state (list data, filter values, selected item, drawer open, compact view, unsaved note in the drawer) and implement it.',
      hint: 'Is "drawer open" separate state, or derived from "selected item is not null"?',
      solution: `- List data: **server cache** (\`useQuery(['items', filters])\`).
- Filters: **URL** search params.
- Selected item: **URL** (\`?selected=42\`) so the drawer is deep-linkable.
- Drawer open: **derived**: \`const open = selected !== null\`. No separate state.
- Compact view: **persisted client preference** (small Zustand store with \`persist\`, or localStorage hook).
- Unsaved note: **local** state inside the drawer; reset per item with \`key={selectedId}\`.

\`\`\`tsx
const [params, setParams] = useSearchParams()
const selected = params.get('selected')
<Drawer open={selected !== null} onClose={() => setParams((p) => { p.delete('selected'); return p })}>
  {selected && <NoteEditor key={selected} itemId={selected} />}
</Drawer>
\`\`\``,
    },
    interview: [
      'Describe the levels where state can live and how you choose between them.',
      'What is the code smell that suggests state is placed too low?',
      'Why is putting form input state in a global store usually a mistake?',
    ],
  },

  'context-perf': {
    explanation: `Context is a **dependency-injection mechanism**, not a state manager. A provider makes a value available to everything below it; \`useContext\` (or \`use(Context)\` in React 19) reads the nearest one. The performance rule is simple and strict: **when the provider's value changes (by \`Object.is\`), every component that reads that context re-renders**, regardless of which part of the value it uses, and \`memo\` on intermediate components does not stop it.

### Why this bites

Typical code: \`<AppContext.Provider value={{ user, theme, cart, setCart }}>\`. Two problems:

- The object literal is **new on every render** of the provider, so all consumers re-render whenever the provider re-renders, even if nothing changed.
- Unrelated data shares one context, so a cart update re-renders every component that only wanted the theme.

There are no selectors in plain context: you cannot subscribe to "just \`user.name\`".

### Techniques

1. **Split contexts by concern and change frequency**: \`ThemeContext\`, \`AuthContext\`, \`CartContext\`. Rarely changing values in one, frequently changing values in another.
2. **Separate state from dispatch**: put the \`dispatch\` (or a stable actions object) in its own context. Components that only trigger updates (an "Add to cart" button) subscribe to the stable actions context and never re-render on cart changes.
3. **Stabilise the value**: memoise the value object (\`useMemo\`) and callbacks (\`useCallback\`), or let the React Compiler do it. \`useReducer\`'s \`dispatch\` and \`useState\`'s setter are already stable.
4. **Push providers down**: a provider for a wizard belongs around the wizard, not the whole app.
5. **Pass children through**: components rendered as \`children\` of the stateful provider component are created by its parent, so they don't re-render just because the provider's state changed; only consumers do.

### When to stop using context

If many components need *different slices* of frequently changing state, you want subscriptions with selectors. That is exactly what Zustand, Redux (\`useSelector\`) and Jotai give you, using \`useSyncExternalStore\` under the hood. Context is perfect for values like theme, locale, the current user, or injecting a store/client instance (QueryClient is passed via context, but the data is subscribed to separately).

### Measure first

Use the React DevTools Profiler with "highlight updates" to see who re-renders and why. A re-render is not automatically a problem; it matters when it is expensive or very frequent.`,
    examples: [
      {
        title: '❌ One context with an unstable value vs ✅ split state and actions',
        code: `// ❌ new object every render; theme readers re-render on cart changes
function AppProviderBad({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  return (
    <AppContext.Provider value={{ cart, setCart, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  )
}

// ✅ separate contexts, stable actions
type CartActions = { add: (item: CartItem) => void; remove: (id: string) => void }
const CartStateContext = createContext<CartItem[] | null>(null)
const CartActionsContext = createContext<CartActions | null>(null)

function cartReducer(state: CartItem[], action: { type: 'add'; item: CartItem } | { type: 'remove'; id: string }) {
  switch (action.type) {
    case 'add': return [...state, action.item]
    case 'remove': return state.filter((i) => i.id !== action.id)
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, [])
  const actions = useMemo<CartActions>(() => ({
    add: (item) => dispatch({ type: 'add', item }),
    remove: (id) => dispatch({ type: 'remove', id }),
  }), [])
  return (
    <CartActionsContext.Provider value={actions}>
      <CartStateContext.Provider value={cart}>{children}</CartStateContext.Provider>
    </CartActionsContext.Provider>
  )
}

export function useCartActions() {
  const ctx = useContext(CartActionsContext)
  if (!ctx) throw new Error('useCartActions must be used inside CartProvider')
  return ctx
}`,
        note: 'An "Add to cart" button that uses only `useCartActions()` never re-renders when the cart changes, because the actions object is created once. The custom hook also throws a clear error if the provider is missing.',
      },
    ],
    realCase: {
      title: 'A typing lag caused by a "global" context',
      story: `**Situation:** a CRM app kept the search query, current user, permissions and notifications in one \`AppContext\`. **Symptom:** each keystroke in the global search box took 80–120ms on mid-range laptops; the profiler showed hundreds of components re-rendering. **Root cause:** the search query lived in the root context, so every consumer, including large tables reading only permissions, re-rendered per keystroke. **Fix:** the query moved to local state in the search component (and the URL on submit), permissions and user into a rarely changing \`SessionContext\`, notifications into a small Zustand store with selectors. **Lesson:** context value changes fan out to every consumer; put fast-changing state close to where it's used.`,
    },
    pitfalls: [
      'Passing an inline object/array as the provider value, creating a new value every render.',
      'Bundling unrelated, differently-paced data into one context.',
      'Expecting `memo` to block context-driven re-renders; it does not.',
      'Using context for high-frequency state read in many places, where a store with selectors fits better.',
      'Providing a default value that hides a missing provider; prefer `null` plus a throwing custom hook.',
    ],
    exercise: {
      task: 'Build a `NotificationsProvider` exposing `notifications` and `push/dismiss` actions. Add a `NotifyButton` that only pushes and a `NotificationList` that reads. Prove with React DevTools (or a render counter) that `NotifyButton` does not re-render when notifications change.',
      hint: 'Two contexts, `useReducer`, and a `useMemo` actions object with an empty dependency array.',
      solution: `\`\`\`tsx
const ListCtx = createContext<Notification[] | null>(null)
const ActionsCtx = createContext<{ push: (n: Omit<Notification, 'id'>) => void; dismiss: (id: string) => void } | null>(null)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [list, dispatch] = useReducer(reducer, [])
  const actions = useMemo(() => ({
    push: (n: Omit<Notification, 'id'>) => dispatch({ type: 'push', n: { ...n, id: crypto.randomUUID() } }),
    dismiss: (id: string) => dispatch({ type: 'dismiss', id }),
  }), [])
  return (
    <ActionsCtx.Provider value={actions}>
      <ListCtx.Provider value={list}>{children}</ListCtx.Provider>
    </ActionsCtx.Provider>
  )
}

function NotifyButton() {
  const renders = useRef(0)
  renders.current++ // debug only
  const { push } = useNotificationActions()
  return <button onClick={() => push({ text: 'Saved' })}>Notify</button>
}
\`\`\`
Clicking repeatedly grows the list while the button's render count stays at 1 (2 in StrictMode dev).`,
    },
    interview: [
      'Why does every consumer re-render when a context value changes, and why doesn\'t `memo` help?',
      'Explain the "split state and dispatch" pattern.',
      'When would you replace context with Zustand or Redux?',
    ],
  },

  stores: {
    explanation: `An **external store** is state that lives outside the React tree in a plain JavaScript object, with a subscribe mechanism. Components subscribe with a **selector** and re-render only when the selected slice changes. React integrates these safely (without tearing during concurrent rendering) through \`useSyncExternalStore\`, which both Zustand and React Redux use internally.

### When you need one

Use a store for **client state** that is shared widely, changes often, or must be accessed outside React (in an API interceptor, a WebSocket handler): carts, editors, multi-step flows spanning routes, UI preferences, real-time collaboration presence. Don't use it for server data (use a query cache) or shareable view state (use the URL).

### Zustand

A store is a hook created with \`create\`. State and actions live together. In TypeScript, use the curried form \`create<State>()(...)\`.

- **Selectors are the performance model**: \`useCartStore((s) => s.items.length)\` re-renders only when the count changes. Calling \`useCartStore()\` without a selector subscribes to everything.
- Selectors must return stable values. Returning a new object or array each call (\`(s) => ({ a: s.a, b: s.b })\`) changes every time; in Zustand v5 this can cause an infinite re-render loop. Use separate selectors or wrap with \`useShallow\`.
- \`set\` merges at the top level; update nested data immutably (or add the \`immer\` middleware).
- Middleware: \`persist\` (storage, with \`version\` and \`migrate\`), \`devtools\`, \`immer\`, \`subscribeWithSelector\`.
- Outside React: \`useCartStore.getState()\` and \`useCartStore.subscribe\`.

Export custom hooks (\`useCartCount\`) rather than the raw store, so components don't couple to its shape.

### Redux Toolkit

Many enterprise codebases use Redux. RTK removed the boilerplate: \`createSlice\` generates action creators and a reducer (with Immer so "mutations" are safe), \`configureStore\` sets up devtools and middleware. Use typed hooks (\`useAppSelector\`, \`useAppDispatch\` via \`.withTypes\`). Write **memoised selectors** with \`createSelector\` for derived data. Its strengths are strict unidirectional flow, a single action log, time-travel debugging and conventions that scale to large teams.

**RTK Query** is Redux's server-state layer: define endpoints with \`createApi\`, get generated hooks, cache tags for invalidation. If you're in a Redux codebase, prefer it over hand-written thunks storing API data.

### Choosing

Zustand: minimal API, little ceremony, great for most apps. Redux Toolkit: strong conventions, middleware ecosystem, familiar to large teams. Both are fine; what matters more is keeping the store small and putting only true global client state in it.`,
    examples: [
      {
        title: '✅ Zustand cart store with persist and selectors',
        code: `import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

type CartLine = { productId: string; name: string; unitPrice: number; qty: number }
type CartState = {
  lines: CartLine[]
  add: (line: Omit<CartLine, 'qty'>) => void
  setQty: (productId: string, qty: number) => void
  clear: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line) =>
        set((s) => {
          const existing = s.lines.find((l) => l.productId === line.productId)
          return {
            lines: existing
              ? s.lines.map((l) => (l.productId === line.productId ? { ...l, qty: l.qty + 1 } : l))
              : [...s.lines, { ...line, qty: 1 }],
          }
        }),
      setQty: (productId, qty) =>
        set((s) => ({
          lines: qty <= 0
            ? s.lines.filter((l) => l.productId !== productId)
            : s.lines.map((l) => (l.productId === productId ? { ...l, qty } : l)),
        })),
      clear: () => set({ lines: [] }),
    }),
    { name: 'cart', version: 1 },
  ),
)

// Public hooks: narrow subscriptions
export const useCartCount = () => useCartStore((s) => s.lines.reduce((n, l) => n + l.qty, 0))
export const useCartActions = () =>
  useCartStore(useShallow((s) => ({ add: s.add, setQty: s.setQty, clear: s.clear })))`,
        note: '`useCartCount` re-renders the header badge only when the number changes. `useShallow` lets one selector return an object of actions without creating a new subscription result each time.',
      },
      {
        title: '❌ Selecting the whole store vs ✅ Redux Toolkit slice with memoised selector',
        code: `// ❌ re-renders on every cart change, even unrelated fields
const { lines } = useCartStore()

// ✅ Redux Toolkit
import { createSlice, createSelector, configureStore, type PayloadAction } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'

const cartSlice = createSlice({
  name: 'cart',
  initialState: { lines: [] as CartLine[], couponCode: null as string | null },
  reducers: {
    added(state, action: PayloadAction<Omit<CartLine, 'qty'>>) {
      const line = state.lines.find((l) => l.productId === action.payload.productId)
      if (line) line.qty += 1 // Immer makes this safe
      else state.lines.push({ ...action.payload, qty: 1 })
    },
    couponApplied(state, action: PayloadAction<string>) {
      state.couponCode = action.payload
    },
  },
})

export const store = configureStore({ reducer: { cart: cartSlice.reducer } })
type RootState = ReturnType<typeof store.getState>
export const useAppSelector = useSelector.withTypes<RootState>()
export const useAppDispatch = useDispatch.withTypes<typeof store.dispatch>()

export const selectSubtotal = createSelector(
  [(s: RootState) => s.cart.lines],
  (lines) => lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0),
)
// const subtotal = useAppSelector(selectSubtotal)`,
        note: '`createSelector` recomputes only when `lines` changes, so applying a coupon does not recompute the subtotal. Typed hooks remove the need to annotate `RootState` everywhere.',
      },
    ],
    realCase: {
      title: 'An infinite loop after upgrading Zustand',
      story: `**Situation:** a marketplace team upgraded to Zustand v5. **Symptom:** the product page crashed with "Maximum update depth exceeded". **Root cause:** a selector built a new object every call: \`useStore((s) => ({ items: s.items, total: s.total }))\`. In v4 that only caused wasted re-renders; with v5's stricter \`useSyncExternalStore\`-based behaviour, an always-new snapshot triggers a render loop. **Fix:** split into two primitive selectors and wrapped the remaining object selector with \`useShallow\`; a lint rule flagged object-literal selectors. **Lesson:** selectors must return stable references; the store's subscription model depends on it.`,
    },
    pitfalls: [
      'Calling the store hook without a selector, subscribing to everything.',
      'Selectors that return new objects/arrays every time (use primitives, `useShallow`, or memoised selectors).',
      'Putting server data in the store instead of a query cache.',
      'Changing a persisted store shape without `version`/`migrate`, crashing returning users with old data.',
      'Exporting the raw store everywhere instead of focused custom hooks, coupling components to its internal shape.',
    ],
    exercise: {
      task: 'Build a Zustand "editor UI" store: selected shape ids, active tool, zoom level. Expose `useActiveTool`, `useIsSelected(id)` and an actions hook. Persist only `activeTool` and `zoom` (not selection) using `partialize`.',
      hint: '`useIsSelected(id)` should return a boolean so each shape re-renders only when its own selection changes.',
      solution: `\`\`\`ts
type Tool = 'select' | 'rect' | 'text'
type EditorState = {
  selected: string[]; tool: Tool; zoom: number
  select: (id: string, additive?: boolean) => void
  setTool: (t: Tool) => void
  setZoom: (z: number) => void
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      selected: [], tool: 'select', zoom: 1,
      select: (id, additive = false) =>
        set((s) => ({ selected: additive ? [...new Set([...s.selected, id])] : [id] })),
      setTool: (tool) => set({ tool }),
      setZoom: (zoom) => set({ zoom: Math.min(4, Math.max(0.25, zoom)) }),
    }),
    { name: 'editor-ui', partialize: (s) => ({ tool: s.tool, zoom: s.zoom }) },
  ),
)

export const useActiveTool = () => useEditorStore((s) => s.tool)
export const useIsSelected = (id: string) => useEditorStore((s) => s.selected.includes(id))
export const useEditorActions = () =>
  useEditorStore(useShallow((s) => ({ select: s.select, setTool: s.setTool, setZoom: s.setZoom })))
\`\`\``,
    },
    interview: [
      'How do selectors prevent unnecessary re-renders in Zustand or Redux?',
      'Why can a selector that returns `{ a, b }` cause problems, and how do you fix it?',
      'Compare Zustand and Redux Toolkit. When would you pick each?',
    ],
  },

  jotai: {
    explanation: `Jotai models state as **atoms**: tiny, independent units that components subscribe to individually. Instead of one big store you select from (top-down), you compose state bottom-up. A component reading \`countAtom\` re-renders only when \`countAtom\` changes.

### Primitive and derived atoms

- \`atom(0)\` creates a primitive atom with an initial value. \`useAtom(a)\` returns \`[value, set]\`, like \`useState\` but shareable. \`useAtomValue\` and \`useSetAtom\` split reading and writing so write-only components don't re-render.
- \`atom((get) => get(priceAtom) * get(qtyAtom))\` is a **derived atom**: it tracks its dependencies automatically and recomputes only when they change. This forms a dependency graph, similar to a spreadsheet.
- Writable derived atoms take a write function: \`atom(null, (get, set, arg) => ...)\` act like actions.
- Async atoms return promises and integrate with Suspense.

### Where it shines

Highly interconnected UI state: design tools, diagram editors, spreadsheets, form builders, where thousands of items each need their own state and derived values. \`atomFamily\`-style patterns (or atoms created per item and stored in a map) give each item its own subscription, so editing one node re-renders only that node.

### Scoping

By default atoms live in a global default store. Wrap a subtree in \`<Provider>\` to give it isolated atom values (e.g. two independent editor instances, or tests).

### Trade-offs

Atoms are easy to create, which makes it easy to scatter state everywhere. Without conventions it can be hard to see the whole state of a feature at once, and there is no single action log as in Redux. Keep atoms in a feature's \`atoms.ts\`, expose custom hooks, and don't use atoms for server state (use TanStack Query, or the jotai-tanstack-query integration).`,
    examples: [
      {
        title: '✅ Primitive, derived and write-only atoms',
        code: `import { atom, useAtomValue, useSetAtom } from 'jotai'

type Shape = { id: string; x: number; y: number; w: number; h: number }

export const shapesAtom = atom<Record<string, Shape>>({})
export const selectedIdsAtom = atom<string[]>([])

export const selectedShapesAtom = atom((get) => {
  const shapes = get(shapesAtom)
  return get(selectedIdsAtom).map((id) => shapes[id]).filter((s): s is Shape => !!s)
})

export const moveSelectedAtom = atom(null, (get, set, delta: { dx: number; dy: number }) => {
  const ids = new Set(get(selectedIdsAtom))
  set(shapesAtom, (prev) => {
    const next = { ...prev }
    for (const id of ids) {
      const s = next[id]
      if (s) next[id] = { ...s, x: s.x + delta.dx, y: s.y + delta.dy }
    }
    return next
  })
})

function SelectionInfo() {
  const selected = useAtomValue(selectedShapesAtom)
  return <p>{selected.length} selected</p>
}

function NudgeButtons() {
  const move = useSetAtom(moveSelectedAtom) // write-only: never re-renders on shape changes
  return <button onClick={() => move({ dx: 10, dy: 0 })}>→</button>
}`,
        note: 'The derived atom tracks both dependencies automatically. `useSetAtom` gives a stable setter without subscribing to the value.',
      },
    ],
    realCase: {
      title: 'A whiteboard where every drag re-rendered everything',
      story: `**Situation:** a startup's whiteboard stored all shapes in one context. **Symptom:** dragging a sticky note on a board with 2,000 items dropped to a few frames per second. **Root cause:** every position update replaced the context value, re-rendering all shapes. **Fix:** each shape got its own atom (held in a map atom of ids), so dragging one updated one atom and re-rendered one component; selection and toolbar state became derived atoms. **Lesson:** fine-grained subscriptions matter when you have many independently changing items.`,
    },
    pitfalls: [
      'Creating atoms inside components without memoisation, producing a new atom (and lost state) each render.',
      'Scattering atoms across files with no feature ownership, making state hard to trace.',
      'Using `useAtom` where only the setter is needed, causing needless re-renders.',
    ],
    exercise: {
      task: 'Build a mini spreadsheet with 3 cell atoms (A1, A2, A3) holding numbers and a derived `sumAtom`. Render inputs for the cells and a total. Verify that editing A1 does not re-render the A2 input.',
      hint: 'One component per cell, each calling `useAtom` on its own atom.',
      solution: `\`\`\`tsx
const a1 = atom(0), a2 = atom(0), a3 = atom(0)
const sumAtom = atom((get) => get(a1) + get(a2) + get(a3))

function Cell({ label, cell }: { label: string; cell: PrimitiveAtom<number> }) {
  const [v, setV] = useAtom(cell)
  return <label>{label} <input type="number" value={v} onChange={(e) => setV(e.target.valueAsNumber || 0)} /></label>
}
function Total() {
  return <output>{useAtomValue(sumAtom)}</output>
}
\`\`\``,
    },
    interview: [
      'How does Jotai\'s bottom-up atom model differ from a top-down store with selectors?',
      'What is a derived atom and how does it know when to recompute?',
    ],
  },

  xstate: {
    explanation: `A **state machine** describes a flow as a finite set of **states**, the **events** each state accepts, and the **transitions** those events cause. Anything not described is impossible: if the \`submitting\` state doesn't handle \`EDIT\`, the user cannot edit during submission, no matter how many buttons are clicked. **Statecharts** extend this with nested states, parallel states, guards, delayed transitions and side effects.

### Why it helps

Flows like checkout, onboarding wizards, media players, file uploads or a WebSocket connection have rules: "can only pay after shipping is chosen", "retry at most 3 times", "time out after 30 seconds". Encoded as booleans and effects, those rules are scattered and break under unusual sequences (double clicks, back button, slow responses). A machine puts them in one declarative definition you can read, visualise and test.

### XState v5 essentials

- \`setup({ types, actions, actors, guards }).createMachine({...})\` defines a typed machine.
- \`context\` holds extended data (cart id, error message, retry count).
- \`on: { NEXT: 'shipping' }\` defines transitions; \`guard\` conditions block them; \`assign\` updates context.
- \`invoke\` runs an actor (e.g. a \`fromPromise\` API call) while a state is active, with \`onDone\`/\`onError\` transitions; leaving the state cancels it.
- In React, \`useMachine(machine)\` returns \`[snapshot, send]\`. Use \`snapshot.matches('payment')\` and \`snapshot.can({ type: 'PAY' })\` to drive the UI.

### Lighter alternatives

You often don't need XState: a \`useReducer\` with a discriminated union state that ignores invalid events is already a state machine. Reach for XState when you need nested/parallel states, timers, invoked services, visualisation, or the same flow across many screens.

### Trade-offs

There's a learning curve and more ceremony. Keep machines for genuine flows, not every toggle.`,
    examples: [
      {
        title: '✅ Checkout machine with guarded transitions and an invoked payment',
        code: `import { setup, assign, fromPromise } from 'xstate'
import { useMachine } from '@xstate/react'

export const checkoutMachine = setup({
  types: {
    context: {} as { addressId: string | null; error: string | null; orderId: string | null },
    events: {} as
      | { type: 'CHOOSE_ADDRESS'; addressId: string }
      | { type: 'NEXT' }
      | { type: 'BACK' }
      | { type: 'PAY' },
  },
  actors: {
    pay: fromPromise(async ({ input }: { input: { addressId: string } }) => api.pay(input.addressId)),
  },
  guards: { hasAddress: ({ context }) => context.addressId !== null },
}).createMachine({
  id: 'checkout',
  initial: 'shipping',
  context: { addressId: null, error: null, orderId: null },
  states: {
    shipping: {
      on: {
        CHOOSE_ADDRESS: { actions: assign({ addressId: ({ event }) => event.addressId }) },
        NEXT: { target: 'payment', guard: 'hasAddress' },
      },
    },
    payment: { on: { BACK: 'shipping', PAY: 'paying' } },
    paying: {
      invoke: {
        src: 'pay',
        input: ({ context }) => ({ addressId: context.addressId! }),
        onDone: { target: 'done', actions: assign({ orderId: ({ event }) => event.output.orderId }) },
        onError: { target: 'payment', actions: assign({ error: 'Payment failed, try again' }) },
      },
    },
    done: { type: 'final' },
  },
})

function Checkout() {
  const [snapshot, send] = useMachine(checkoutMachine)
  if (snapshot.matches('done')) return <Confirmation orderId={snapshot.context.orderId} />
  return (
    <button disabled={!snapshot.can({ type: 'PAY' })} onClick={() => send({ type: 'PAY' })}>
      {snapshot.matches('paying') ? 'Paying…' : 'Pay'}
    </button>
  )
}`,
        note: 'While in `paying`, `PAY` is not handled, so double-submits are impossible by construction. `snapshot.can` drives the disabled state from the same rules.',
      },
    ],
    realCase: {
      title: 'An onboarding wizard with unreachable steps',
      story: `**Situation:** an insurance quote wizard used eight booleans and effects to decide which step to show. **Symptom:** users who pressed back during a pricing request occasionally landed on a blank step, and support couldn't reproduce it. **Root cause:** an in-flight request resolved after navigation and flipped flags into a combination no screen handled. **Fix:** the flow was modelled as a statechart; the pricing request was an invoked actor cancelled on leaving the state, and the machine diagram was reviewed with product. **Lesson:** explicit states turn race conditions into impossible transitions.`,
    },
    pitfalls: [
      'Using a machine for trivial UI toggles, adding ceremony without benefit.',
      'Keeping duplicate React state alongside the machine, so two sources of truth drift.',
      'Starting async work in components instead of invoking actors, losing automatic cancellation.',
    ],
    exercise: {
      task: 'Model a media player as a reducer-based state machine with states `idle | loading | playing | paused | error`, accepting `LOAD`, `LOADED`, `PLAY`, `PAUSE`, `FAIL`. Invalid events must be ignored. Then port it to XState.',
      hint: 'Write a transition table: `Record<State, Partial<Record<Event, State>>>`.',
      solution: `\`\`\`ts
type S = 'idle' | 'loading' | 'playing' | 'paused' | 'error'
type E = 'LOAD' | 'LOADED' | 'PLAY' | 'PAUSE' | 'FAIL'
const table: Record<S, Partial<Record<E, S>>> = {
  idle: { LOAD: 'loading' },
  loading: { LOADED: 'paused', FAIL: 'error' },
  paused: { PLAY: 'playing', LOAD: 'loading' },
  playing: { PAUSE: 'paused', FAIL: 'error' },
  error: { LOAD: 'loading' },
}
export const player = (s: S, e: E): S => table[s][e] ?? s
\`\`\``,
    },
    interview: [
      'What does "impossible transitions simply don\'t exist" mean in practice?',
      'When is `useReducer` enough and when would you reach for XState?',
    ],
  },

  structure: {
    explanation: `Folder structure is architecture you can see. Grouping by **type** (\`components/\`, \`hooks/\`, \`services/\`, \`utils/\`) works for tiny apps but scales badly: changing one feature touches five folders, and nothing tells you what is safe to delete. Grouping by **feature** (\`features/cart\`, \`features/auth\`, \`features/invoices\`) keeps everything that changes together in one place.

### A typical layout

- \`src/app/\`: app shell, providers, router, global styles.
- \`src/features/<name>/\`: components, hooks, API functions, schemas, store, tests for one domain feature.
- \`src/shared/\` (or \`components/ui\`, \`lib/\`): generic, domain-agnostic building blocks: Button, Modal, formatters, the API client.
- \`src/pages/\` or route modules: thin compositions of features.

### Public APIs

Each feature exposes a **public entry point** (\`features/cart/index.ts\`) exporting only what others may use: \`CartButton\`, \`useCartCount\`, \`cartQueries\`. Everything else is internal. Other code imports \`@/features/cart\`, never \`@/features/cart/components/CartLineItem\`. This lets you refactor a feature's internals without breaking callers, the same way a library works.

Barrel files have a cost: careless \`export *\` barrels can hurt tree-shaking and create import cycles. Export explicitly and keep them per feature, not one giant root barrel.

### Dependency direction

Dependencies should point one way: \`app → pages → features → shared\`. **Shared never imports from features**, and features avoid importing each other's internals. If two features need the same thing, either it is shared (move it down) or one feature exposes it through its public API. Cross-feature composition happens at the page/route level.

### Enforce it with tooling

Conventions decay without enforcement. Use ESLint rules such as \`no-restricted-imports\` (ban deep imports into features), \`import/no-cycle\`, or boundary plugins (eslint-plugin-boundaries) that declare element types and allowed dependencies. Fail CI on violations. TypeScript path aliases (\`@/features/*\`) make imports readable.

### Pragmatism

Don't create a feature folder for every component on day one. Start with colocation, extract to \`shared\` when a second feature needs something (not before), and split a feature when it grows two clearly separate responsibilities. The goal is that a feature can be understood, changed and deleted in one place.`,
    examples: [
      {
        title: '❌ Type-based folders vs ✅ feature folders with a public API',
        code: `// ❌ one feature smeared across the tree
src/
  components/CartDrawer.tsx  CartLine.tsx  InvoiceTable.tsx ...
  hooks/useCart.ts  useInvoices.ts ...
  services/cartApi.ts  invoiceApi.ts ...

// ✅ feature-based
src/
  app/        router.tsx  providers.tsx
  shared/     ui/Button.tsx  ui/Dialog.tsx  lib/apiClient.ts  lib/formatMoney.ts
  features/
    cart/
      api.ts            // cartQueries, mutations
      schemas.ts        // Zod schemas + inferred types
      store.ts          // Zustand UI store (internal)
      components/CartDrawer.tsx  CartLine.tsx
      index.ts          // PUBLIC API
    invoices/ ...
  pages/CheckoutPage.tsx  // composes cart + payments

// features/cart/index.ts
export { CartDrawer } from './components/CartDrawer'
export { useCartCount } from './store'
export type { Cart } from './schemas'`,
        note: 'Deleting the cart feature means deleting one folder and fixing imports of `@/features/cart`. `CartLine` stays private, so it can change freely.',
      },
      {
        title: '✅ Enforcing boundaries with ESLint',
        code: `// eslint.config.js (flat config)
export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@/features/*/*'],
          message: 'Import from the feature public API (@/features/<name>) instead.',
        }],
      }],
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['@/features/*', '@/pages/*', '@/app/*'], message: 'shared must not depend on features.' }],
      }],
    },
  },
]`,
        note: 'Two simple rules capture the architecture: no deep imports into features, and shared depends on nothing above it. CI fails before the coupling spreads.',
      },
    ],
    realCase: {
      title: 'The "utils" folder that blocked a rebrand',
      story: `**Situation:** a media company's web app had grown for four years with type-based folders. **Symptom:** removing a retired "podcasts" section took three sprints; deleting files broke unrelated pages, because \`shared/utils\` imported podcast helpers and other features deep-imported podcast components. **Root cause:** no public APIs and no dependency direction, so coupling accumulated invisibly. **Fix:** a migration to feature folders, one feature at a time, with \`index.ts\` APIs and ESLint boundary rules enforced in CI; violations were tracked to zero. Later feature removals took days. **Lesson:** structure is valuable only if the boundaries are enforced automatically.`,
    },
    pitfalls: [
      'Deep imports into another feature\'s internals, defeating its public API.',
      'Shared modules importing from features, creating cycles and hidden coupling.',
      'Giant root barrel files with `export *`, hurting tree-shaking and causing circular imports.',
      'Premature extraction to `shared` of code only one feature uses.',
      'Relying on conventions without lint rules; boundaries erode under deadline pressure.',
    ],
    exercise: {
      task: 'Restructure a small app (e.g. your catalog app) into `app/`, `shared/`, `features/` and `pages/`. Give each feature an `index.ts` and add ESLint rules forbidding deep feature imports and shared-to-feature imports. Introduce a violation and confirm lint fails.',
      hint: 'Set a `@/` path alias in both `tsconfig` (`paths`) and Vite (`resolve.alias`) first.',
      solution: `1. Add aliases: \`"paths": { "@/*": ["./src/*"] }\` and the Vite alias.
2. Move files feature by feature; create \`features/<name>/index.ts\` exporting only what pages use.
3. Add the two \`no-restricted-imports\` blocks from the example.
4. Write \`import { CartLine } from '@/features/cart/components/CartLine'\` in a page and run \`npx eslint src\`:

\`\`\`text
error  '@/features/cart/components/CartLine' import is restricted from being used by a pattern.
       Import from the feature public API (@/features/<name>) instead
\`\`\`
5. Fix it by exporting through \`index.ts\` only if pages genuinely need it; otherwise compose a public component instead.`,
    },
    interview: [
      'Why does feature-based structure scale better than type-based structure?',
      'What is a feature\'s public API and how do you enforce it?',
      'Which direction should dependencies flow between app, pages, features and shared code?',
    ],
  },
}

export default details
