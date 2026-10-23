import type { TopicDetail } from '../types'

const details: Record<string, TopicDetail> = {
  'ts-basics': {
    explanation: `TypeScript is a **static description of the shapes your JavaScript values can take**. The compiler checks that description and then erases it: no type exists at runtime. Keeping that in mind explains most of TypeScript's behaviour, including why validation (Zod) is still needed at the edges of your app.

### The core toolbox

- **Union types** (\`'idle' | 'loading'\`) say "one of these". **Literal types** make a single value a type, which turns strings into an enum you cannot misspell.
- **Generics** are type parameters: \`function first<T>(items: T[]): T | undefined\` keeps the relationship between input and output instead of collapsing to \`any\`.
- **\`unknown\` vs \`any\`**: \`any\` switches the checker off and silently spreads through everything it touches. \`unknown\` means "I don't know yet": you must narrow it before using it. Use \`unknown\` for JSON, \`catch\` errors and anything from outside.
- **Narrowing**: \`typeof x === 'string'\`, \`'error' in result\`, \`Array.isArray\`, checking a discriminant like \`state.status === 'error'\`, or a custom type guard \`(x): x is User\`. The checker follows control flow, so inside the \`if\` the type is narrower.
- **Utility types**: \`Partial<T>\` (all optional), \`Required<T>\`, \`Pick<T, K>\`, \`Omit<T, K>\`, \`Record<K, V>\`, \`ReturnType<typeof fn>\`, \`Awaited<T>\`. They let you derive types instead of duplicating them.

### Structural typing

TypeScript compares shapes, not names. Any object with the right properties satisfies a type. That is flexible but means two "different" ids (\`UserId\`, \`OrderId\`) that are both \`string\` are interchangeable unless you brand them.

### Strictness settings that matter

\`strict: true\` enables \`strictNullChecks\`, \`noImplicitAny\` and friends; without it, \`null\` silently fits everywhere. Add \`noUncheckedIndexedAccess\`: then \`items[0]\` is \`Item | undefined\`, matching reality. It feels noisy for a week and then catches real crashes.

### \`satisfies\` and \`as const\`

\`as const\` freezes literals so \`['a', 'b']\` becomes \`readonly ['a', 'b']\`. \`satisfies\` checks a value against a type *without widening it*, so you keep precise inferred keys while still getting errors. Prefer both over \`as SomeType\`, which is an unchecked assertion: you are telling the compiler to trust you, and it will.

### When not to type

Let inference work. Annotate function parameters, public return types and exported APIs; do not annotate every local variable. Over-annotation hides better inferred types and creates maintenance noise.

### Tooling in 2026: TypeScript 7

TypeScript 7 (July 2026) is the first stable release of the native compiler rewritten in Go: full builds are roughly 8–12× faster, and you still install \`typescript\` and run the same \`tsc\` command. Two caveats: there is no stable programmatic API until 7.1, so tools that need it (Vue/Svelte/Astro/Angular template checking) still run on TypeScript 6; and JS emit only downlevels to ES2021, with no decorator emit yet. In a Vite React app this rarely matters, because Vite strips types and \`tsc\` only type-checks.`,
    examples: [
      {
        title: '❌ any vs ✅ unknown + narrowing',
        code: `// ❌ any spreads silently: no error, crashes at runtime
async function loadUserBad(id: string) {
  const res = await fetch(\`/api/users/\${id}\`)
  const data: any = await res.json()
  return data.profile.displayName.toUpperCase()
}

// ✅ unknown forces a check before use
type User = { id: string; profile: { displayName: string } }

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' && value !== null &&
    'id' in value && 'profile' in value
  )
}

async function loadUser(id: string): Promise<User> {
  const res = await fetch(\`/api/users/\${id}\`)
  const data: unknown = await res.json()
  if (!isUser(data)) throw new Error('Unexpected user payload')
  return data // narrowed to User
}`,
        note: 'With `any` the compiler happily accepts `data.profile.displayName` even if the API changed. `unknown` forces a guard; in real code you would use Zod instead of a hand-written guard, but the principle is identical.',
      },
      {
        title: '✅ Derive types with utility types, satisfies and as const',
        code: `const ROLES = ['viewer', 'editor', 'admin'] as const
type Role = (typeof ROLES)[number] // 'viewer' | 'editor' | 'admin'

type Invoice = { id: string; amount: number; dueDate: string; paidAt: string | null }
type InvoiceDraft = Omit<Invoice, 'id' | 'paidAt'>
type InvoicePatch = Partial<InvoiceDraft>

const permissions = {
  viewer: ['read'],
  editor: ['read', 'write'],
  admin: ['read', 'write', 'delete'],
} satisfies Record<Role, string[]>

const first = ROLES[0] // with noUncheckedIndexedAccess: Role | undefined`,
        note: 'One source of truth (`ROLES`) produces the `Role` type. `satisfies` errors if a role is missing but keeps the exact keys of `permissions`. Draft/patch types are derived, so adding a field to `Invoice` updates them automatically.',
      },
    ],
    realCase: {
      title: 'The undefined first item in a fintech dashboard',
      story: `**Situation:** a fintech team rendered "latest transaction" with \`transactions[0].amount\`. **Symptom:** new accounts with no history saw a white screen; error monitoring showed "Cannot read properties of undefined". **Root cause:** \`strict\` was on but \`noUncheckedIndexedAccess\` was off, so TypeScript typed \`transactions[0]\` as \`Transaction\`, not \`Transaction | undefined\`. **Fix:** they enabled the flag, fixed roughly 60 resulting errors (most with an early return or an empty state), and found three more latent crashes in the process. **Lesson:** compiler flags encode assumptions; the stricter the flags, the more runtime crashes become compile errors.`,
    },
    pitfalls: [
      'Using `as Type` to silence an error: assertions are unchecked and hide real mismatches. Narrow or validate instead.',
      'Typing JSON responses directly as your domain type (`res.json() as User`): the types lie as soon as the API changes.',
      'Leaving `any` in `catch (e: any)`: catch variables should be `unknown` and narrowed with `e instanceof Error`.',
      'Duplicating types by hand instead of deriving with `Pick`/`Omit`/`typeof`: copies drift apart.',
      'Using TypeScript `enum` for simple string sets: a union of literals (or an `as const` array) is lighter and erases cleanly.',
    ],
    exercise: {
      task: 'Write a generic `groupBy<T, K extends PropertyKey>(items: T[], getKey: (item: T) => K): Record<K, T[]>` and use it to group orders by status. Turn on `noUncheckedIndexedAccess` and make it compile without `as any`.',
      hint: 'Start with `{} as Record<K, T[]>` is tempting but is an assertion; a `Partial<Record<K, T[]>>` accumulator plus `??=` is more honest.',
      solution: `\`\`\`ts
function groupBy<T, K extends PropertyKey>(items: T[], getKey: (item: T) => K) {
  const out: Partial<Record<K, T[]>> = {}
  for (const item of items) {
    const key = getKey(item)
    ;(out[key] ??= []).push(item)
  }
  return out
}

type Order = { id: string; status: 'open' | 'paid' | 'refunded' }
const byStatus = groupBy(orders, (o) => o.status)
const paid = byStatus.paid ?? [] // Order[]
\`\`\`
Returning \`Partial<Record<K, T[]>>\` is accurate: a status with no orders has no key.`,
    },
    interview: [
      'What is the difference between `unknown`, `any` and `never`? Give a use for each.',
      'Explain structural typing. How would you stop a `UserId` being passed where an `OrderId` is expected?',
      'When would you use `satisfies` instead of a type annotation or `as`?',
    ],
  },

  'typing-components': {
    explanation: `A React component is just a function from props to UI, so typing a component mostly means **typing its props object** well. The goal is not decoration: good prop types are the documentation, autocomplete and refactoring safety net for every caller.

### Props

Use a \`type\` alias (or interface) and destructure in the parameter: \`function Card({ title, children }: CardProps)\`. Avoid \`React.FC\`: it adds nothing useful today and makes generics awkward. Let the return type be inferred (it is \`JSX.Element\` or \`React.ReactNode\` as needed).

- \`children: React.ReactNode\` accepts anything renderable: strings, numbers, elements, arrays, \`null\`.
- Use \`React.ReactElement\` only if you truly require a single element.
- Optional props get \`?\` and a default in destructuring: \`size = 'md'\`.
- Callback props are named for intent: \`onSelect: (id: string) => void\`.

### Events

Inline handlers infer their event type from the JSX attribute, so \`onChange={(e) => setQ(e.target.value)}\` needs no annotation. When the handler is declared separately, type it: \`React.ChangeEvent<HTMLInputElement>\`, \`React.FormEvent<HTMLFormElement>\`, \`React.MouseEvent<HTMLButtonElement>\`, \`React.KeyboardEvent\`.

### Extending native elements

A design-system \`Button\` should accept everything a real \`<button>\` accepts: \`type\`, \`disabled\`, \`aria-*\`, \`onClick\`. Use \`ComponentProps<'button'>\` (or \`ComponentPropsWithoutRef\`) and add your own props on top. Use \`Omit\` when your prop conflicts with a native one. Spread the rest onto the element.

### Refs in React 19

In React 19, \`ref\` is a **regular prop** for function components: \`ComponentProps<'input'>\` already includes it, so \`forwardRef\` is no longer needed for new code. You will still read \`forwardRef\` in older codebases.

### Polymorphism and variants

Model mutually exclusive variants with a union rather than many optional booleans. A link-styled button that requires \`href\` but forbids \`onClick\` is a union: \`{ as: 'a'; href: string } | { as?: 'button'; onClick: () => void }\`. Full "as any element" polymorphism is possible but complex; reach for it only in a shared library.

### Hooks

\`useState\` infers from the initial value; give a type argument when the initial value is narrower than the real type: \`useState<User | null>(null)\`. \`useRef<HTMLInputElement>(null)\` gives a ref for DOM nodes. For \`useReducer\`, type the reducer and inference does the rest.`,
    examples: [
      {
        title: '❌ Re-declaring button props vs ✅ extending ComponentProps',
        code: `// ❌ only the props the author remembered; aria-*, type, form... are lost
type BadButtonProps = { label: string; onClick: () => void; disabled?: boolean }

// ✅ every native prop, plus variants
import type { ComponentProps } from 'react'

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
}

export function Button({ variant = 'primary', loading = false, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading}
      className={\`btn btn-\${variant}\`}
    >
      {loading ? 'Saving…' : children}
    </button>
  )
}

// Callers get full autocomplete, including ref in React 19
<Button type="submit" form="invoice-form" aria-describedby="hint">Save</Button>`,
        note: '`type="button"` comes before `{...rest}` so callers can override it to `submit`, while the default prevents accidental form submits. `ref` flows through `rest` because in React 19 it is a normal prop.',
      },
      {
        title: '✅ Typed handlers declared outside JSX',
        code: `type SearchBoxProps = { initialQuery?: string; onSearch: (query: string) => void }

export function SearchBox({ initialQuery = '', onSearch }: SearchBoxProps) {
  const [query, setQuery] = useState(initialQuery)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!query.trim()) return inputRef.current?.focus()
    onSearch(query.trim())
  }

  return (
    <form role="search" onSubmit={handleSubmit}>
      <label htmlFor="q">Search products</label>
      <input id="q" ref={inputRef} value={query} onChange={handleChange} />
    </form>
  )
}`,
        note: 'The callback prop `onSearch` exposes intent (a query string), not the raw DOM event. Parents should not need to know about events at all.',
      },
    ],
    realCase: {
      title: 'The design-system button that broke forms',
      story: `**Situation:** an internal design system shipped \`<Button label onClick />\` with hand-picked props. **Symptom:** product teams could not set \`type="submit"\`, \`aria-label\` or \`form\`, so they wrapped buttons in divs, added click handlers that called \`form.requestSubmit()\`, and screen readers announced icon buttons as "button" with no name. **Root cause:** the prop type re-declared a subset of native props instead of extending them. **Fix:** the team rewrote it as \`ComponentProps<'button'> & { variant }\`, spread the rest props, and added a lint rule requiring an accessible name for icon-only buttons. **Lesson:** wrapper components should be a superset of the element they wrap.`,
    },
    pitfalls: [
      'Using `React.FC` by habit: it hurts generic components and used to add implicit `children`.',
      'Typing `children` as `JSX.Element`, which rejects strings, arrays and `null`.',
      'Spreading `{...rest}` before your own critical props, letting callers accidentally override `className` or `disabled` logic (or the reverse, when you want them to override).',
      'Callback props that expose DOM events (`onChange(e)`) instead of domain values (`onChange(value)`), leaking implementation details.',
      'Writing new `forwardRef` wrappers in React 19 code where `ref` is already a prop.',
    ],
    exercise: {
      task: 'Build a typed `TextField` that accepts every native `<input>` prop plus `label: string` and `error?: string`. It must render a label linked to the input, show the error, and set `aria-invalid` and `aria-describedby` when there is an error.',
      hint: 'Use `useId()` for ids, `ComponentProps<\'input\'>` for the base, and `Omit` nothing unless a name conflicts.',
      solution: `\`\`\`tsx
import { useId, type ComponentProps } from 'react'

type TextFieldProps = ComponentProps<'input'> & { label: string; error?: string }

export function TextField({ label, error, id, ...rest }: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const errorId = \`\${inputId}-error\`
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />
      {error && <p id={errorId} role="alert">{error}</p>}
    </div>
  )
}
\`\`\``,
    },
    interview: [
      'Why prefer `ComponentProps<\'button\'>` over listing button props manually?',
      'How did refs change in React 19 for function components, and what does that mean for `forwardRef`?',
      'What is the difference between `ReactNode` and `ReactElement`, and when would you use each?',
    ],
  },

  discriminated: {
    explanation: `A **discriminated union** is a union of object types that share one literal field, the *discriminant* (often \`status\` or \`type\`). Checking that field narrows the whole object, so TypeScript knows exactly which other fields exist. This is the single most valuable TypeScript pattern for UI code.

### Why booleans fail

A typical fetch component starts with \`isLoading\`, \`error\` and \`data\`. That is 2 × 2 × 2 = 8 combinations, but only 4 are meaningful. What does \`isLoading: true\` with an \`error\` mean? A stale error during a retry? Every render path must defend against nonsense combinations, and bugs hide in the ones nobody thought about: showing an old error banner above fresh data, or a spinner that never stops because one setter was forgotten.

### Making impossible states unrepresentable

With a union, each state carries exactly the data that state needs:

- \`{ status: 'idle' }\`
- \`{ status: 'loading' }\`
- \`{ status: 'error'; error: string }\`
- \`{ status: 'success'; data: City[] }\`

You cannot read \`data\` without first proving \`status === 'success'\`. You cannot be loading and errored at once. Transitions become single assignments (\`setState({ status: 'error', error })\`) instead of three setter calls that must stay in sync.

### Exhaustiveness

In a \`switch (state.status)\`, add a \`default\` branch that assigns \`state\` to \`never\`. If someone later adds \`{ status: 'empty' }\`, every switch that forgot it becomes a compile error. That turns "remember to update all the places" into a checklist the compiler hands you.

### Beyond fetch state

The same pattern models reducer actions (\`{ type: 'added'; item } | { type: 'removed'; id }\`), form steps, payment methods (\`card\` needs \`last4\`, \`bank\` needs \`iban\`), component variants and API results (\`{ ok: true; value } | { ok: false; error }\`). It is the type-level version of a state machine.

### When not to

If the states are truly independent (a modal open flag and a selected tab), keep them separate; forcing them into one union multiplies cases. Also note that libraries like TanStack Query already expose a union-like \`status\`; narrow on it rather than re-modelling.`,
    examples: [
      {
        title: '❌ Boolean soup vs ✅ discriminated union',
        code: `// ❌ 8 combinations, 4 nonsense
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [cities, setCities] = useState<City[] | null>(null)
// forgetting setError(null) on retry shows an old error above new data

// ✅ only valid states
type CitiesState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: City[] }

function CityResults({ state }: { state: CitiesState }) {
  switch (state.status) {
    case 'idle':
      return <p>Type a city name to search.</p>
    case 'loading':
      return <Spinner label="Searching cities" />
    case 'error':
      return <ErrorBanner message={state.error} />
    case 'success':
      return state.data.length === 0
        ? <p>No cities found.</p>
        : <CityList cities={state.data} />
    default: {
      const unreachable: never = state
      return unreachable
    }
  }
}`,
        note: 'Inside each `case`, `state` is narrowed: `state.data` only exists in the success branch. The `never` default makes adding a new status a compile error until handled.',
      },
      {
        title: '✅ Discriminated reducer actions',
        code: `type CheckoutState =
  | { step: 'cart' }
  | { step: 'shipping'; cartId: string }
  | { step: 'payment'; cartId: string; addressId: string }
  | { step: 'done'; orderId: string }

type CheckoutAction =
  | { type: 'cartConfirmed'; cartId: string }
  | { type: 'addressChosen'; addressId: string }
  | { type: 'paid'; orderId: string }

function checkout(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case 'cartConfirmed':
      return state.step === 'cart' ? { step: 'shipping', cartId: action.cartId } : state
    case 'addressChosen':
      return state.step === 'shipping'
        ? { step: 'payment', cartId: state.cartId, addressId: action.addressId }
        : state
    case 'paid':
      return state.step === 'payment' ? { step: 'done', orderId: action.orderId } : state
  }
}`,
        note: 'Both state and actions are unions. You cannot reach `payment` without an `addressId`, and invalid transitions simply return the current state.',
      },
    ],
    realCase: {
      title: 'The phantom error banner',
      story: `**Situation:** a travel booking team's search page used \`loading\`, \`error\` and \`results\` booleans. **Symptom:** after a network blip, users retried and got results, but a red "Search failed" banner stayed on top, so they assumed prices were wrong and abandoned. **Root cause:** the retry path called \`setLoading(true)\` and \`setResults(...)\` but never \`setError(null)\`. **Fix:** the state was rewritten as a discriminated union; a successful response replaces the whole state object, so the error cannot survive. An exhaustive switch rendered each status. **Lesson:** when several pieces of state must change together, they are one piece of state.`,
    },
    pitfalls: [
      'Using a non-literal discriminant (`status: string`), which prevents narrowing.',
      'Destructuring before narrowing (`const { data } = state`) — TypeScript cannot narrow destructured fields from the original union check later.',
      'Omitting the `never` exhaustiveness check, so new variants silently fall through.',
      'Over-modelling: combining genuinely independent state into one huge union with dozens of variants.',
    ],
    exercise: {
      task: 'Model a file upload as a discriminated union: idle, uploading (with progress 0–100), failed (with error and a retry count), done (with file URL). Write a `render` function using an exhaustive switch and a reducer handling `start`, `progress`, `fail`, `succeed`, `reset`.',
      hint: 'Make `progress` actions ignored unless the current status is `uploading`.',
      solution: `\`\`\`ts
type Upload =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | { status: 'failed'; error: string; retries: number }
  | { status: 'done'; url: string }

type UploadAction =
  | { type: 'start' }
  | { type: 'progress'; value: number }
  | { type: 'fail'; error: string }
  | { type: 'succeed'; url: string }
  | { type: 'reset' }

function upload(state: Upload, a: UploadAction): Upload {
  switch (a.type) {
    case 'start': return { status: 'uploading', progress: 0 }
    case 'progress':
      return state.status === 'uploading' ? { ...state, progress: a.value } : state
    case 'fail': {
      const retries = state.status === 'failed' ? state.retries + 1 : 0
      return { status: 'failed', error: a.error, retries }
    }
    case 'succeed': return { status: 'done', url: a.url }
    case 'reset': return { status: 'idle' }
  }
}
\`\`\``,
    },
    interview: [
      'Why are three booleans for loading/error/data a bug magnet? Count the states.',
      'How does an exhaustiveness check with `never` work?',
      'Give an example outside data fetching where a discriminated union improves a component API.',
    ],
  },

  'generic-components': {
    explanation: `A **generic component** is a component whose props are parameterised by a type, so the relationship between props is preserved. For a \`<Select<T>>\`, the type of the \`options\` array determines the type of the value passed to \`onChange\`. The caller rarely writes \`<T>\` explicitly: TypeScript infers it from the props, which is why good libraries feel "magical".

### How inference flows

When you write \`<Select options={currencies} onChange={(c) => ...} />\`, TypeScript sees \`options: T[]\`, infers \`T = Currency\` from \`currencies\`, and then types \`c\` as \`Currency\`. One inference site feeds the others. If two props disagree, you get an error, which is exactly the safety you want.

### Syntax

Write generic components as function declarations: \`function Select<T>(props: SelectProps<T>)\`. In a \`.tsx\` file, an arrow function needs \`<T,>\` (trailing comma) so the parser does not read \`<T>\` as JSX. Avoid \`React.FC\`, which cannot carry a type parameter.

### Constraints

Use \`extends\` to require what you need. A list needs a stable key: \`T extends { id: string }\`. Or, better, accept a \`getKey: (item: T) => string\` prop so any shape works. Constraints should be minimal: requiring \`id\` excludes data that is keyed by \`sku\`.

### Render props and accessors

Generic components usually take functions that know about \`T\`: \`renderItem\`, \`getLabel\`, \`getKey\`. This separates *behaviour* (selection, keyboard navigation, virtualisation) from *data shape*. A \`DataTable<Row>\` can accept \`columns: Column<Row>[]\` where each column has \`accessor: (row: Row) => ReactNode\`. With \`keyof\` you can go further: \`sortBy: keyof Row\` only allows real field names.

### When not to

Generics add cognitive load. If a component is used with exactly one data type, make it concrete. Reach for generics in shared building blocks: selects, comboboxes, tables, lists, form fields, typed hooks like \`useLocalStorage<T>\`. Also, do not use generics to "pass through" a type you never relate to anything else; a type parameter used only once is usually just \`unknown\`.

### Wrappers

\`memo\` and other HOCs lose the generic signature. A common fix is a cast back: \`export const List = memo(ListImpl) as typeof ListImpl\`. With the React Compiler you often don't need \`memo\` at all.`,
    examples: [
      {
        title: '❌ any-typed select vs ✅ generic select',
        code: `// ❌ onChange receives any; typos compile
type BadSelectProps = { options: any[]; onChange: (v: any) => void }

// ✅ generic: options decide the value type
type SelectProps<T> = {
  label: string
  options: readonly T[]
  value: T | null
  onChange: (value: T) => void
  getLabel: (option: T) => string
  getKey: (option: T) => string
}

export function Select<T>({ label, options, value, onChange, getLabel, getKey }: SelectProps<T>) {
  const id = useId()
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value ? getKey(value) : ''}
        onChange={(e) => {
          const next = options.find((o) => getKey(o) === e.target.value)
          if (next) onChange(next)
        }}
      >
        <option value="" disabled>Choose…</option>
        {options.map((o) => (
          <option key={getKey(o)} value={getKey(o)}>{getLabel(o)}</option>
        ))}
      </select>
    </>
  )
}

// Usage: T inferred as Currency
<Select
  label="Currency"
  options={currencies}
  value={currency}
  onChange={(c) => setCurrency(c)} // c: Currency
  getLabel={(c) => \`\${c.code} — \${c.name}\`}
  getKey={(c) => c.code}
/>`,
        note: 'Nobody writes `<Select<Currency>>`. `T` is inferred from `options`, and every callback is typed from it. Passing an `onChange` expecting a different type is a compile error.',
      },
      {
        title: '✅ Typed table columns with keyof',
        code: `type Column<Row> = {
  header: string
  cell: (row: Row) => React.ReactNode
  sortKey?: keyof Row
}

type DataTableProps<Row> = {
  rows: Row[]
  columns: Column<Row>[]
  getRowId: (row: Row) => string
}

export function DataTable<Row>({ rows, columns, getRowId }: DataTableProps<Row>) {
  return (
    <table>
      <thead><tr>{columns.map((c) => <th key={c.header}>{c.header}</th>)}</tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={getRowId(r)}>{columns.map((c) => <td key={c.header}>{c.cell(r)}</td>)}</tr>
        ))}
      </tbody>
    </table>
  )
}

const invoiceColumns: Column<Invoice>[] = [
  { header: 'Number', cell: (i) => i.number, sortKey: 'number' },
  { header: 'Amount', cell: (i) => formatMoney(i.amount), sortKey: 'amount' },
  // sortKey: 'amout' -> compile error
]`,
        note: '`keyof Row` restricts sort keys to real fields, so a typo is caught at compile time instead of producing an unsortable column.',
      },
    ],
    realCase: {
      title: 'The admin table with stringly typed columns',
      story: `**Situation:** a logistics company's admin panel had a shared \`Table\` taking \`columns: { key: string }[]\` and \`rows: any[]\`. **Symptom:** after the API renamed \`eta\` to \`estimatedArrival\`, three screens showed blank columns for weeks; nothing failed and nobody noticed until a customer complained. **Root cause:** column keys were plain strings unrelated to the row type. **Fix:** the table became \`Table<Row>\` with \`cell: (row: Row) => ReactNode\`; rows came from Zod-inferred types, so the rename produced compile errors at every affected column. **Lesson:** generics turn implicit contracts between props into checked ones.`,
    },
    pitfalls: [
      'Writing `const List = <T>(...) =>` in a .tsx file, which parses as JSX; use `<T,>` or a function declaration.',
      'Over-constraining (`T extends { id: string }`) when a `getKey` accessor would accept any shape.',
      'Wrapping in `memo`/`forwardRef` and losing the generic, so everything becomes `unknown`.',
      'Making a component generic when it has one caller; the extra abstraction costs readability.',
    ],
    exercise: {
      task: 'Write a generic `useLocalStorage<T>(key: string, initial: T, schema: { parse: (v: unknown) => T })` hook that returns `[value, setValue]` typed as `T`, and a generic `<RadioGroup<T>>` that renders options and calls `onChange(value: T)`.',
      hint: 'Accept the schema as anything with a `parse` method so a Zod schema fits. Catch parse errors and fall back to `initial`.',
      solution: `\`\`\`tsx
function useLocalStorage<T>(key: string, initial: T, schema: { parse: (v: unknown) => T }) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initial : schema.parse(JSON.parse(raw))
    } catch {
      return initial
    }
  })
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])
  return [value, setValue] as const
}

type RadioGroupProps<T> = {
  name: string; options: readonly T[]; value: T
  onChange: (v: T) => void; getLabel: (v: T) => string; getKey: (v: T) => string
}
function RadioGroup<T>({ name, options, value, onChange, getLabel, getKey }: RadioGroupProps<T>) {
  return (
    <fieldset>
      {options.map((o) => (
        <label key={getKey(o)}>
          <input type="radio" name={name} checked={getKey(o) === getKey(value)} onChange={() => onChange(o)} />
          {getLabel(o)}
        </label>
      ))}
    </fieldset>
  )
}
\`\`\``,
    },
    interview: [
      'How does TypeScript infer the type parameter of a generic component from its props?',
      'Why can\'t you easily use generics with `React.FC`, and how do you write a generic arrow component in .tsx?',
      'When would you choose a `getKey` accessor over a `T extends { id: string }` constraint?',
    ],
  },

  zod: {
    explanation: `TypeScript types are erased at compile time. When data crosses into your app from the network, \`localStorage\`, URL search params, \`postMessage\` or a form, the compiler has **no idea what it actually is**. Typing \`await res.json()\` as \`User\` is a promise you are making on behalf of a server you don't control. **Zod** lets you write the shape once as a runtime schema, check real data against it, and *infer* the static type from the same schema, so types and validation can never drift. The examples use **Zod 4**: string formats are top-level (\`z.email()\`, \`z.url()\`, \`z.uuid()\`, \`z.iso.date()\`; the old \`z.string().email()\` style is deprecated) and custom messages use \`{ error: '...' }\` instead of the deprecated \`message\`.

### Parse, don't validate

The idea: at the **boundary**, transform \`unknown\` into a trusted, typed value, or fail loudly. After that, the rest of the app works with typed data and never re-checks. \`schema.parse(data)\` returns the typed value or throws a \`ZodError\`. \`schema.safeParse(data)\` returns \`{ success: true, data } | { success: false, error }\` — a discriminated union, so you handle both branches without try/catch.

### Inference

\`type User = z.infer<typeof UserSchema>\` derives the TS type. Change the schema and the type follows. Use \`z.input<>\` vs \`z.output<>\` when transforms change the shape (e.g. a string coerced to a \`Date\`).

### Shaping data

Schemas can do more than check:

- \`z.coerce.number()\` turns \`"42"\` from a URL into \`42\`.
- \`.default(1)\` fills missing values; \`.catch(1)\` replaces invalid ones (great for search params).
- \`.transform(fn)\` maps to your domain shape (e.g. snake_case API to camelCase).
- \`.refine\` / \`.superRefine\` add cross-field rules ("end date after start date").
- \`z.discriminatedUnion('type', [...])\` validates union payloads efficiently.

### Where to parse

- In the API client, right after \`res.json()\`, so every caller of \`getInvoice\` receives a valid \`Invoice\`.
- When reading search params and \`localStorage\`, with \`.catch\` defaults so bad input never crashes the page.
- In forms, via \`zodResolver\` for React Hook Form, and on the server again (client validation is UX, server validation is security).
- For env variables at startup.

### Strictness trade-offs

By default object schemas strip unknown keys, which tolerates additive API changes. Being too strict (\`.strict()\`) on third-party APIs can break the UI when a harmless field is added. Being too loose (\`z.any()\`) defeats the point. Validate what you *use*. On a failure, log the \`ZodError\` with context to your monitoring: it tells you exactly which field broke, which turns a vague UI bug into a precise contract violation.`,
    examples: [
      {
        title: '❌ Trusting the cast vs ✅ parsing at the boundary',
        code: `// ❌ the cast is a lie if the API changes
async function getInvoiceBad(id: string) {
  const res = await fetch(\`/api/invoices/\${id}\`)
  return (await res.json()) as Invoice
}

// ✅ schema is the source of truth
import { z } from 'zod'

const InvoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  amount_cents: z.number().int().nonnegative(),
  currency: z.enum(['USD', 'EUR', 'IDR']),
  due_date: z.iso.date(),
  status: z.enum(['draft', 'sent', 'paid', 'void']),
}).transform((i) => ({
  id: i.id,
  number: i.number,
  amount: i.amount_cents / 100,
  currency: i.currency,
  dueDate: new Date(i.due_date),
  status: i.status,
}))

export type Invoice = z.output<typeof InvoiceSchema>

export async function getInvoice(id: string): Promise<Invoice> {
  const res = await fetch(\`/api/invoices/\${id}\`)
  if (!res.ok) throw new Error(\`Invoice \${id}: HTTP \${res.status}\`)
  return InvoiceSchema.parse(await res.json())
}`,
        note: 'The API client is the boundary. Components receive a camelCase `Invoice` with a real `Date`, and a malformed payload fails here with a precise error instead of deep inside a render.',
      },
      {
        title: '✅ Search params with coercion and safe defaults',
        code: `const ProductFiltersSchema = z.object({
  q: z.string().trim().catch(''),
  page: z.coerce.number().int().min(1).catch(1),
  sort: z.enum(['price-asc', 'price-desc', 'newest']).catch('newest'),
  inStock: z.enum(['true', 'false']).transform((v) => v === 'true').catch(false),
})
export type ProductFilters = z.infer<typeof ProductFiltersSchema>

export function parseFilters(params: URLSearchParams): ProductFilters {
  return ProductFiltersSchema.parse(Object.fromEntries(params))
}
// ?page=abc&sort=hack  ->  { q: '', page: 1, sort: 'newest', inStock: false }`,
        note: '`.catch()` means any garbage in the URL falls back to a default, so a hand-edited or old shared link never crashes the page.',
      },
    ],
    realCase: {
      title: 'Null prices after a backend migration',
      story: `**Situation:** an e-commerce team's backend migrated pricing services and started returning \`price: null\` for items without a regional price. **Symptom:** product pages crashed in \`price.toFixed(2)\` for some regions; the crash surfaced far from the fetch, so it took a day to trace. **Root cause:** the frontend cast the response to \`Product\` with \`price: number\`. **Fix:** responses were parsed with Zod in the API client; \`price\` became \`z.number().nullable()\`, the type change forced every consumer to handle "price unavailable", and parse failures were reported to monitoring with the failing path. **Lesson:** validate at the boundary so contract breaks are loud, early and precise.`,
    },
    pitfalls: [
      'Defining a TS type and a Zod schema separately; they drift. Infer the type from the schema.',
      'Parsing deep inside components instead of once at the boundary (API client, loader, storage reader).',
      'Using `.strict()` on third-party responses, so a harmless new field breaks your UI.',
      'Treating client-side Zod validation as security; the server must validate too.',
      'Swallowing `safeParse` failures without logging them, losing the most useful debugging signal.',
    ],
    exercise: {
      task: 'Write a Zod schema for a sign-up form: email, password (min 12 chars, one digit), confirmPassword (must match), and an optional referral code of 8 uppercase letters/digits. Export the inferred type and a function that returns field errors as `Record<string, string>`.',
      hint: 'Use `.refine` on the object with `path: [\'confirmPassword\']`, and iterate `error.issues` to build the map.',
      solution: `\`\`\`ts
import { z } from 'zod'

export const SignUpSchema = z.object({
  email: z.email({ error: 'Enter a valid email' }),
  password: z.string().min(12, { error: 'At least 12 characters' }).regex(/\\d/, { error: 'Include a digit' }),
  confirmPassword: z.string(),
  referralCode: z.string().regex(/^[A-Z0-9]{8}$/, { error: 'Invalid code' }).optional(),
}).refine((v) => v.password === v.confirmPassword, {
  error: 'Passwords do not match',
  path: ['confirmPassword'],
})
export type SignUp = z.infer<typeof SignUpSchema>

export function fieldErrors(input: unknown): Record<string, string> {
  const result = SignUpSchema.safeParse(input)
  if (result.success) return {}
  const out: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.')
    out[key] ??= issue.message
  }
  return out
}
\`\`\``,
    },
    interview: [
      'Why isn\'t TypeScript enough to guarantee the shape of API data?',
      'What is the difference between `parse` and `safeParse`, and when would you use `.catch()`?',
      'Where in a React app should validation happen, and why should it happen only once per boundary?',
    ],
  },
}

export default details
