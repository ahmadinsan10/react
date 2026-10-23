import type { TopicDetail } from '../types'

const details: Record<string, TopicDetail> = {
  setup: {
    explanation: `A good setup removes whole categories of bugs before you write a component. A modern React project in 2026 typically has three pillars: a fast dev/build tool, the React Compiler, and linting.

### Vite

\`npm create vite@latest my-app -- --template react-ts\` scaffolds a project. Vite serves your source as native ES modules during development, so the server starts almost instantly and hot module replacement (HMR) updates only the changed module while preserving component state. Since Vite 8 (March 2026), Rolldown (Rust) replaces the old esbuild + Rollup pair for both dev and build, with Oxc handling parsing, transforms and minification; it needs Node 20.19+/22.12+ and understands tsconfig \`paths\` out of the box. For production it bundles and minifies, producing hashed assets you can deploy to any static host.

Key files: \`index.html\` (the real entry, it loads \`src/main.tsx\`), \`vite.config.ts\` (plugins, aliases, proxy), \`tsconfig*.json\` (TypeScript settings). Environment variables prefixed with \`VITE_\` are exposed via \`import.meta.env\`; never put secrets there, they end up in the browser bundle.

### React Compiler

The React Compiler (stable since 1.0, October 2025) is a build-time Babel plugin that analyses your components and hooks and inserts memoisation automatically. In practice it gives you what careful use of \`useMemo\`, \`useCallback\` and \`memo\` would, without writing them. It relies on your code following the **Rules of React**: pure render, no mutation of props/state, hooks called unconditionally. If a component breaks the rules, the compiler skips it rather than producing wrong code.

With \`@vitejs/plugin-react\` 6+ you enable it through \`@rolldown/plugin-babel\` and the \`reactCompilerPreset()\` exported by the React plugin (see the example). The old \`react({ babel: { plugins: [...] } })\` option was **removed** in v6, so older tutorials break. An experimental Rust port is available via \`react({ compiler: true })\` (optional peer dependency \`oxc-transform-react\`); treat it as experimental. Next.js exposes \`reactCompiler: true\` in \`next.config.ts\`. Because it is opt-in per build, you can adopt it gradually.

### ESLint

\`eslint-plugin-react-hooks@latest\` with the **\`recommended-latest\`** preset (it includes the compiler-powered rules) flags rule-of-hooks violations, missing effect dependencies, mutation during render, and patterns the compiler cannot optimise. A violation only makes the compiler skip that one component. Treat its warnings as lessons, not noise; suppressing \`exhaustive-deps\` is almost always hiding a stale-closure bug.

### TypeScript, loosely at first

Start with \`.tsx\` files and let inference do most of the work. Type props with a simple \`type Props = {...}\`. Deeper typing comes in Level 3. Run \`tsc --noEmit\` (or \`tsc -b\`) in CI because Vite's dev server strips types without checking them.

### Habits

- Keep \`StrictMode\` on in \`main.tsx\`.
- Use Prettier (or your editor's formatter) to end style debates.
- Add a \`typecheck\` and \`lint\` script and run them in CI from day one.`,
    examples: [
      {
        title: 'vite.config.ts with the React Compiler',
        code: `import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  server: {
    proxy: { '/api': 'http://localhost:8080' }, // avoid CORS in dev
  },
})`,
        note: 'With @vitejs/plugin-react 6+ the compiler runs through `@rolldown/plugin-babel` using `reactCompilerPreset()`; the old `react({ babel: ... })` option no longer exists. The proxy forwards `/api` calls to a local backend so the frontend can use relative URLs in every environment.',
      },
      {
        title: '❌ secret in VITE_ env vs ✅ server-side',
        code: `// .env
// ❌ VITE_STRIPE_SECRET_KEY=sk_live_... ends up in the JS bundle anyone can read
VITE_API_BASE_URL=/api            // ✅ public config only

// src/api.ts
export const api = (path: string) => fetch(\`\${import.meta.env.VITE_API_BASE_URL}\${path}\`)`,
        note: 'Anything prefixed `VITE_` is inlined into client code at build time. Secrets belong on a server that the browser calls.',
      },
    ],
    realCase: {
      title: 'An API key shipped to every visitor',
      story: `A small travel startup used a maps geocoding API from their React app with \`VITE_GEOCODER_KEY\`. Months later the provider's bill jumped: someone had pulled the key out of the minified bundle and was using it for their own service.

The fix moved geocoding behind a tiny server endpoint that held the key and added rate limiting; the browser called \`/api/geocode\`. They also added a CI check that fails if built assets contain strings matching key patterns. Lesson: client bundles are public. Build tools make it easy to forget that "environment variable" does not mean "secret".`,
    },
    pitfalls: [
      'Putting secrets in `VITE_`-prefixed variables.',
      'Assuming the dev server type-checks; it only strips types. Run `tsc` separately.',
      'Disabling the hooks lint rules instead of fixing the underlying issue.',
      'Removing StrictMode because effects run twice in development.',
      'Expecting the React Compiler to fix code that breaks the Rules of React; it skips such components.',
    ],
    exercise: {
      task: 'Create a new Vite React + TypeScript project, enable the React Compiler, add `lint` and `typecheck` scripts, and verify the compiler is active by opening React DevTools (compiled components show a "Memo ✨" badge).',
      hint: 'Install `@rolldown/plugin-babel`, `@babel/core` and `babel-plugin-react-compiler` as dev dependencies and add `babel({ presets: [reactCompilerPreset()] })` next to `react()`.',
      solution: `\`\`\`bash
npm create vite@latest shop -- --template react-ts
cd shop
npm install
npm install -D @rolldown/plugin-babel @babel/core babel-plugin-react-compiler eslint-plugin-react-hooks@latest
\`\`\`

Edit \`vite.config.ts\` as in the example above, use the \`recommended-latest\` preset of \`eslint-plugin-react-hooks\` in \`eslint.config.js\`, then in \`package.json\`:

\`\`\`json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "typecheck": "tsc -b --noEmit"
}
\`\`\`

Run \`npm run dev\`, open React DevTools, and check that your components carry the compiler badge.`,
    },
    interview: [
      'What does the React Compiler do, and what does it require from your code?',
      'Why is a `VITE_` environment variable never a safe place for secrets?',
      'Why does Vite start faster than older bundler-based dev servers?',
    ],
  },

  thinking: {
    explanation: `"Thinking in React" is the design process for turning a mockup into components and state. It is the most transferable React skill: the same steps work for a to-do list and for a trading dashboard.

### 1. Break the UI into a component hierarchy

Draw boxes around parts of the mockup. A component should ideally do one thing (single responsibility). Your data shape is a good guide: if the JSON has \`orders[].items[]\`, the UI probably has \`OrderList > OrderCard > LineItem\`. Name components by what they *are*, not how they look.

### 2. Build a static version

Render the hierarchy from hard-coded data using only props, no state. This separates "layout and data flow" from "interactivity" and is fast to write. Data flows one way: parent to child.

### 3. Find the minimal state

State is what changes over time *and* cannot be computed from something else. Ask for each piece of data:

- Does it come from a parent via props? Not state.
- Does it stay the same over time? Not state.
- Can you compute it from other state or props? Not state, derive it.

For a product table with a search box: the product list (props from the server), the search text (state), the "in stock only" checkbox (state), and the filtered list (derived).

### 4. Decide where state lives

For each state value, find every component that renders something based on it, then their closest common parent. That parent (or something above it) owns the state. Prefer the lowest owner that works; state too high causes needless re-renders and coupling.

### 5. Add inverse data flow

Children cannot modify parent state directly. The owner passes down setter callbacks (\`onSearchChange\`) and children call them in event handlers.

### Why this works

React's model is \`UI = f(state)\`. If your state is minimal and lives in the right place, the UI is always consistent because everything else is computed from one source of truth. Most bugs in React apps (stale filtered lists, two checkboxes disagreeing) come from duplicated or misplaced state, not from React itself.

### Beyond local state

Later levels add more homes for state: the URL (filters, tabs, pagination that should survive reload), context, external stores, and server caches. The same question applies: what is the *closest* place that serves every reader?`,
    examples: [
      {
        title: '❌ duplicated derived state vs ✅ minimal state',
        code: `// ❌ filtered list stored separately: easy to forget to update
function ProductPageBad({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('')
  const [filtered, setFiltered] = useState(products)
  function onQuery(q: string) {
    setQuery(q)
    setFiltered(products.filter(p => p.name.includes(q)))
  }
  // bug: if products prop changes, filtered is stale
}

// ✅ only the query is state; the list is derived each render
function ProductPage({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('')
  const [inStockOnly, setInStockOnly] = useState(false)
  const visible = products.filter(
    p => p.name.toLowerCase().includes(query.toLowerCase()) && (!inStockOnly || p.stock > 0),
  )
  return (
    <>
      <SearchBar query={query} onQueryChange={setQuery} inStockOnly={inStockOnly} onInStockChange={setInStockOnly} />
      <ProductTable products={visible} />
    </>
  )
}`,
        note: 'The bad version has two sources of truth that drift apart when `products` changes. Deriving `visible` makes the inconsistency impossible.',
      },
    ],
    realCase: {
      title: 'A filter panel and a count badge that disagreed',
      story: `An HR tool showed a candidate list with a filter sidebar and a header badge "42 candidates". The sidebar component held the filters in its own state and the list held a filtered copy; the header computed its count from a third copy synced through an effect.

After a refactor, clearing filters updated the list but not the badge. The team re-applied the Thinking in React steps: the filters became state in the page component (closest common parent of sidebar, list and header), and both the list and the count were derived from \`candidates\` + \`filters\` during render. Two effects and one bug class disappeared. Lesson: when things disagree, look for duplicated state.`,
    },
    pitfalls: [
      'Storing values that can be computed (totals, filtered lists, full names) as state.',
      'Putting all state at the top of the app "just in case".',
      'Copying props into state, which freezes them at their initial value.',
      'Adding interactivity before the static structure and data flow are clear.',
    ],
    exercise: {
      task: 'Take a mockup of a flight search results page: a search summary header, a sort dropdown (price/duration), filters (stops: any/nonstop, max price slider), a results list and a "N flights found" label. Write down the component tree, the minimal state, where each piece lives, and implement a static version followed by the interactive one.',
      hint: 'The results come from props/server. Sort and filters are state. The visible list and N are derived.',
      solution: `Tree: \`FlightResultsPage > (SearchSummary, ControlsBar > (SortSelect, StopsFilter, PriceSlider), ResultsCount, FlightList > FlightCard)\`.

State (in \`FlightResultsPage\`): \`sort\`, \`nonstopOnly\`, \`maxPrice\`. Derived: \`visible\`, \`visible.length\`.

\`\`\`tsx
function FlightResultsPage({ flights }: { flights: Flight[] }) {
  const [sort, setSort] = useState<'price' | 'duration'>('price')
  const [nonstopOnly, setNonstopOnly] = useState(false)
  const [maxPrice, setMaxPrice] = useState(1000)

  const visible = flights
    .filter(f => (!nonstopOnly || f.stops === 0) && f.price <= maxPrice)
    .toSorted((a, b) => (sort === 'price' ? a.price - b.price : a.minutes - b.minutes))

  return (
    <>
      <ControlsBar {...{ sort, setSort, nonstopOnly, setNonstopOnly, maxPrice, setMaxPrice }} />
      <ResultsCount count={visible.length} />
      <FlightList flights={visible} />
    </>
  )
}
\`\`\``,
    },
    interview: [
      'How do you decide whether a piece of data should be state?',
      'How do you decide which component should own a piece of state?',
      'What is inverse data flow in React?',
    ],
  },

  jsx: {
    explanation: `JSX is a syntax extension that lets you write markup inside JavaScript. It is not HTML and it is not a template language; it compiles to plain function calls.

### What it compiles to

\`<Button variant="primary">Save</Button>\` becomes (with the modern automatic runtime) roughly \`jsx(Button, { variant: 'primary', children: 'Save' })\`. The result is a **React element**: a small, immutable object like \`{ type: Button, props: {...}, key: null }\`. Elements are descriptions of UI, not DOM nodes. React later compares element trees and updates the DOM.

Lowercase tags (\`div\`) become strings and map to DOM elements; capitalised tags (\`Button\`) refer to variables in scope. That is why components must start with a capital letter.

### Expressions, not statements

Inside \`{}\` you can put any JavaScript *expression*: variables, function calls, ternaries, \`&&\`, \`.map()\`, template literals. You cannot put statements (\`if\`, \`for\`, \`switch\`, variable declarations). Compute those above the \`return\` or extract a helper.

### Attribute differences from HTML

- \`className\` instead of \`class\`, \`htmlFor\` instead of \`for\`.
- camelCase for most attributes and events: \`onClick\`, \`tabIndex\`, \`autoComplete\`. \`aria-*\` and \`data-*\` stay hyphenated.
- \`style\` takes an object: \`style={{ marginTop: 8 }}\` (numbers become px).
- Every tag must close: \`<img />\`, \`<input />\`.
- A component returns one root; use a fragment \`<>...</>\` (or \`<Fragment key>\` in lists) to group siblings without extra DOM.

### What renders

Strings and numbers render as text. \`null\`, \`undefined\`, \`true\` and \`false\` render nothing, which is what makes \`cond && <X />\` work. Arrays render each item (with keys). Plain objects throw "Objects are not valid as a React child".

### Safety

JSX escapes text by default, so \`{userComment}\` cannot inject HTML or scripts. The escape hatch \`dangerouslySetInnerHTML\` is named that way on purpose; only use it with sanitised content.

### Why JSX?

It keeps rendering logic and markup together, which matches how UI changes: a button's label, its disabled state and its click handler all change together. Since it is JavaScript, you get full language power and type checking for your markup.`,
    examples: [
      {
        title: '❌ statements in JSX vs ✅ compute before return',
        code: `function OrderStatus({ order }: { order: Order }) {
  // ❌ syntax error: if is a statement
  // return <span>{if (order.paid) { 'Paid' } else { 'Due' }}</span>

  // ✅ compute with plain JS first
  let label: string
  switch (order.status) {
    case 'paid': label = 'Paid'; break
    case 'refunded': label = 'Refunded'; break
    default: label = \`Due \${order.dueDate}\`
  }
  return <span className={\`status status-\${order.status}\`}>{label}</span>
}`,
        note: 'JSX holes take expressions. For multi-branch logic, use normal JavaScript above the return and keep the JSX simple.',
      },
      {
        title: 'Fragments with keys in a definition list',
        code: `import { Fragment } from 'react'

function SpecList({ specs }: { specs: { name: string; value: string }[] }) {
  return (
    <dl>
      {specs.map(s => (
        <Fragment key={s.name}>
          <dt>{s.name}</dt>
          <dd>{s.value}</dd>
        </Fragment>
      ))}
    </dl>
  )
}`,
        note: 'A `dl` requires `dt`/`dd` as direct children, so a wrapper `div` would be invalid. The short `<>` syntax cannot take a key; use `Fragment` explicitly in lists.',
      },
    ],
    realCase: {
      title: 'Rendering user bios as HTML',
      story: `A community forum wanted bold and links in user bios, so a developer rendered them with \`dangerouslySetInnerHTML={{ __html: user.bio }}\`. Within weeks a user saved a bio containing an image tag with an \`onerror\` handler that read session data from other visitors' browsers.

The team switched to storing Markdown, rendering it to HTML on the server through a sanitiser with an allow-list of tags, and added a Content Security Policy. Lesson: JSX protects you by escaping text; bypassing that protection requires treating the content as untrusted every time.`,
    },
    pitfalls: [
      'Lowercase component names (`<card />`) which React treats as unknown DOM tags.',
      'Rendering an object directly (`{user}`), which throws.',
      'Using `class` and `for` instead of `className` and `htmlFor`.',
      'Wrapping siblings in unnecessary `div`s that break CSS layouts or semantics instead of using fragments.',
      'Using `dangerouslySetInnerHTML` with unsanitised content.',
    ],
    exercise: {
      task: 'Write by hand what this JSX compiles to (using `jsx(type, props)` calls), then predict what React renders:\n\n```tsx\n<ul className="tags">\n  {tags.length === 0 ? <li>No tags</li> : tags.map(t => <li key={t}>#{t}</li>)}\n  {false}\n  {null}\n</ul>\n```',
      hint: 'children becomes an array when there are several; booleans and null render nothing.',
      solution: `\`\`\`js
jsxs('ul', {
  className: 'tags',
  children: [
    tags.length === 0 ? jsx('li', { children: 'No tags' }) : tags.map(t => jsx('li', { children: ['#', t] }, t)),
    false,
    null,
  ],
})
\`\`\`

Note the key is passed separately from props. React renders the \`ul\` with either "No tags" or one \`li\` per tag; \`false\` and \`null\` produce nothing.`,
    },
    interview: [
      'What does JSX compile to, and what is a React element?',
      'Why must component names start with a capital letter?',
      'Why is JSX safe against XSS by default, and when is it not?',
    ],
  },

  props: {
    explanation: `Components are JavaScript functions that take a single object, **props**, and return a description of UI. Props are how parents configure children, and they flow strictly one way: down.

### Props are read-only

A component must treat its props as immutable. Mutating \`props.items.push(x)\` changes data owned by the parent behind its back, breaks memoisation and makes rendering impure. If a child needs to change something, the parent passes a callback (\`onChange\`, \`onSelect\`) and owns the change.

### Destructuring and defaults

\`function Avatar({ src, size = 40, alt })\` is the idiomatic signature. Defaults apply when the prop is \`undefined\` (not when it is \`null\`). In TypeScript, type the props object: \`type AvatarProps = { src: string; size?: number; alt: string }\`.

### children and composition

\`children\` is just a prop containing whatever JSX you nest between the tags. It enables composition: generic containers (\`Card\`, \`Modal\`, \`Layout\`) that do not need to know what they wrap. Instead of a \`Card\` with \`title\`, \`subtitle\`, \`showFooter\`, \`footerText\`... props, accept \`children\` or named slots (\`header\`, \`footer\` props that take JSX). Composition is React's answer to inheritance; you will almost never extend components.

Composition also helps performance and avoids prop drilling: a parent can render \`<Layout sidebar={<UserMenu user={user} />}>\`, so \`Layout\` never needs to know about \`user\`.

### Props vs state

Props are inputs from the outside, state is memory owned by the component. When a parent re-renders with new props, the child receives them on its next render. Copying a prop into state (\`useState(props.value)\`) only captures the *initial* value; later changes are ignored. Derive from props instead, or use a \`key\` to reset.

### Passing functions

Callbacks are props too. Pass the function, do not call it: \`onClick={handleSave}\` not \`onClick={handleSave()}\`. Name callback props \`onSomething\` and handlers \`handleSomething\`.

### React 19: ref is a prop

Function components can now accept \`ref\` as a regular prop, so \`forwardRef\` is no longer needed for new code. A design-system \`Input\` can simply destructure \`ref\` and pass it to the inner \`input\`.

### Spreading props

\`{...rest}\` forwards unknown props to an underlying element, useful for wrappers. Use it deliberately; spreading everything everywhere hides which props a component really uses.`,
    examples: [
      {
        title: '❌ configuration-prop explosion vs ✅ composition',
        code: `// ❌ every new variant needs a new prop
<Card title="Invoice #42" subtitle="Due Friday" showBadge badgeText="Overdue" footerButtonText="Pay" onFooterClick={pay} />

// ✅ the card provides structure, callers provide content
function Card({ header, children, footer }: { header: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className="card">
      <header className="card-header">{header}</header>
      <div className="card-body">{children}</div>
      {footer && <footer className="card-footer">{footer}</footer>}
    </section>
  )
}

<Card
  header={<><h3>Invoice #42</h3><Badge tone="danger">Overdue</Badge></>}
  footer={<button onClick={pay}>Pay</button>}
>
  <p>Due Friday</p>
</Card>`,
        note: 'Slots (`header`, `footer`, `children`) keep `Card` small and stable while callers compose any content into it.',
      },
      {
        title: 'React 19 ref as a prop',
        code: `type InputProps = React.ComponentProps<'input'> & { label: string }

export function TextField({ label, ref, ...rest }: InputProps) {
  return (
    <label className="field">
      {label}
      <input ref={ref} {...rest} />
    </label>
  )
}

// usage
const emailRef = useRef<HTMLInputElement>(null)
<TextField label="Email" ref={emailRef} type="email" />`,
        note: 'No `forwardRef` wrapper: `ref` arrives like any other prop and is forwarded to the DOM input.',
      },
    ],
    realCase: {
      title: 'A child that edited its parent\'s list',
      story: `In an internal admin panel, a \`TagEditor\` component received \`tags\` as a prop and did \`props.tags.push(newTag)\` then called \`onChange(props.tags)\`. It worked in the demo. In production, the "Save" button stayed disabled after adding a tag because the form compared \`initialTags !== tags\`, and both were the same mutated array.

The fix made \`TagEditor\` call \`onChange([...tags, newTag])\` and never touch the prop. Lesson: props are someone else's data. A child reports what should change; the owner decides and creates new data.`,
    },
    pitfalls: [
      'Mutating props or objects inside props.',
      'Copying props into state and expecting it to follow later prop changes.',
      'Calling a callback while passing it: `onClick={remove(id)}`.',
      'Huge boolean/config prop lists instead of composition with `children` or slots.',
      'Using `forwardRef` in new React 19 code where `ref` can be a plain prop.',
    ],
    exercise: {
      task: 'Build a `Modal` component with `title`, `children`, `footer` (optional ReactNode) and `onClose` props. Then use it to render a "Delete project?" confirmation with Cancel and Delete buttons, keeping all project-specific logic outside `Modal`.',
      hint: 'Modal only renders structure and calls onClose; the caller passes the buttons as the footer.',
      solution: `\`\`\`tsx
type ModalProps = { title: string; children: React.ReactNode; footer?: React.ReactNode; onClose: () => void }

export function Modal({ title, children, footer, onClose }: ModalProps) {
  return (
    <div className="backdrop" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="modal" onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

function DeleteProjectDialog({ project, onCancel, onConfirm }: Props) {
  return (
    <Modal
      title="Delete project?"
      onClose={onCancel}
      footer={<><button onClick={onCancel}>Cancel</button><button className="danger" onClick={() => onConfirm(project.id)}>Delete</button></>}
    >
      <p>This permanently removes <strong>{project.name}</strong>.</p>
    </Modal>
  )
}
\`\`\``,
    },
    interview: [
      'Why are props read-only, and how does a child request a change?',
      'Explain composition with `children` and why React favours it over inheritance.',
      'What changed about `ref` in React 19?',
    ],
  },

  conditional: {
    explanation: `Conditional rendering and lists are where JSX meets ordinary JavaScript control flow. Two skills matter: choosing the clearest conditional form, and giving list items correct keys.

### Conditional forms

- **Early return** for whole-component branches: \`if (!user) return <LoginPrompt />\`. Clear and flat.
- **Ternary** \`cond ? <A /> : <B />\` when choosing between two elements inline.
- **Logical AND** \`cond && <A />\` when rendering something or nothing.
- **Variables**: assign JSX to a variable in an \`if\`/\`switch\` above the return when there are several branches.
- **Lookup objects** for status-to-component mappings: \`const icons = { paid: <Check />, failed: <X /> }\`.

Avoid nested ternaries beyond one level; extract a component instead.

### The && trap

\`&&\` returns its left operand if it is falsy. React renders numbers, so \`{items.length && <List />}\` renders \`0\` when the list is empty. Use a real boolean: \`items.length > 0 &&\`, or a ternary with \`null\`. Strings have the same issue with \`''\` only in that nothing visible appears, but \`NaN\` will render "NaN".

### Lists and keys

\`items.map(item => <Row key={item.id} item={item} />)\` turns data into elements. The **key** tells React which element corresponds to which item across renders. During reconciliation React matches children by key: same key means "same component, update it"; a new key means "create"; a missing key means "remove".

Rules:

- Keys must be **stable** (same item → same key every render), **unique among siblings**, and come from the data (database id, slug).
- **Do not use the array index** if the list can be reordered, filtered, or have items inserted. Index keys make React reuse the wrong component instance, so state (input text, checkbox, expanded flag) and DOM (focus) stick to the *position* instead of the item.
- **Do not use \`Math.random()\` or \`crypto.randomUUID()\` during render**: a new key each render destroys and recreates every row, losing state and wasting work. Generate ids when data is created.
- Keys are not passed as props; if the child needs the id, pass it separately.

Index keys are acceptable only for static lists that never change order.

### Empty and loading states

Treat "no data", "loading" and "error" as first-class branches, not afterthoughts. A list component often looks like: error → message, loading → skeleton, empty → helpful empty state, otherwise → items.`,
    examples: [
      {
        title: '❌ renders 0 vs ✅ boolean condition',
        code: `function NotificationsBell({ unread }: { unread: number }) {
  return (
    <button aria-label="Notifications">
      🔔
      {/* ❌ shows a stray "0" when unread is 0 */}
      {/* {unread && <span className="badge">{unread}</span>} */}

      {/* ✅ */}
      {unread > 0 && <span className="badge">{unread}</span>}
    </button>
  )
}`,
        note: '`0 && x` evaluates to `0`, and React renders numbers. Make the left side a real boolean.',
      },
      {
        title: '❌ index keys lose state on reorder vs ✅ stable ids',
        code: `function ShippingNotes({ stops }: { stops: Stop[] }) {
  return (
    <ol>
      {/* ❌ after sorting, each textarea keeps the text typed for the previous stop at that position */}
      {/* {stops.map((s, i) => <StopNote key={i} stop={s} />)} */}

      {/* ✅ state follows the stop, not the position */}
      {stops.map(s => <StopNote key={s.id} stop={s} />)}
    </ol>
  )
}

function StopNote({ stop }: { stop: Stop }) {
  const [note, setNote] = useState('')
  return <li>{stop.address} <textarea value={note} onChange={e => setNote(e.target.value)} /></li>
}`,
        note: 'With index keys, React sees "the component at position 0" survive the reorder, so its `note` state stays at position 0 while the address prop changes.',
      },
    ],
    realCase: {
      title: 'Driver notes attached to the wrong stop',
      story: `A logistics company's dispatch dashboard let dispatchers reorder delivery stops by drag and drop and type notes for each stop. After reordering, notes appeared next to the wrong addresses, and a driver was told to "leave at back door" at a house with no back door.

The list used \`key={index}\` and each row kept its draft note in local state. Reordering changed the props of each position but React preserved state per position. Switching to \`key={stop.id}\` fixed it; the team also added an ESLint rule (\`react/no-array-index-key\`). Lesson: keys define identity, and identity decides which state belongs to which item.`,
    },
    pitfalls: [
      'Using `count && <X/>` with numbers, which renders `0`.',
      'Index keys on lists that can reorder, filter or insert.',
      'Random keys generated during render.',
      'Deeply nested ternaries instead of early returns or extracted components.',
      'Forgetting empty, loading and error branches.',
    ],
    exercise: {
      task: 'Build `<InboxList messages loading error />` that renders: an error message if `error`, three skeleton rows if `loading`, "Inbox zero 🎉" if empty, otherwise the messages with an unread dot only for unread ones and an "N unread" header only when N > 0.',
      hint: 'Use early returns for error/loading/empty, then a list with key={m.id}.',
      solution: `\`\`\`tsx
type Msg = { id: string; from: string; subject: string; unread: boolean }

export function InboxList({ messages, loading, error }: { messages: Msg[]; loading: boolean; error?: string }) {
  if (error) return <p role="alert">Could not load inbox: {error}</p>
  if (loading) return <ul>{[0, 1, 2].map(i => <li key={i} className="skeleton" />)}</ul>
  if (messages.length === 0) return <p>Inbox zero 🎉</p>

  const unread = messages.filter(m => m.unread).length
  return (
    <section>
      {unread > 0 && <h2>{unread} unread</h2>}
      <ul>
        {messages.map(m => (
          <li key={m.id}>
            {m.unread && <span className="dot" aria-label="unread" />}
            <strong>{m.from}</strong> {m.subject}
          </li>
        ))}
      </ul>
    </section>
  )
}
\`\`\`

Index keys are fine for the static skeleton rows.`,
    },
    interview: [
      'Why does `{items.length && <List/>}` sometimes render 0?',
      'What exactly goes wrong when you use array indexes as keys in a sortable list?',
      'Why is `key={Math.random()}` bad?',
    ],
  },

  purity: {
    explanation: `React assumes your components behave like pure functions during rendering. Most of React's advanced features depend on that assumption.

### What purity means here

A pure render:

- Returns the same JSX for the same props, state and context.
- Does not change anything that existed before the render started: no mutation of props, state, module variables or the DOM; no network calls, timers, subscriptions, logging to analytics, or \`localStorage\` writes.

Local mutation is fine: creating an array inside the component and pushing into it is harmless because nobody else can see it.

### Why React needs it

- **React may render without committing.** With concurrent rendering, transitions and Suspense, React can start rendering, pause, throw the work away and start again. Side effects in render would run for UI the user never sees.
- **React may render more than once** for the same commit (StrictMode in dev, retries after suspending).
- **Memoisation and the React Compiler** skip renders when inputs are equal; that is only correct if output depends solely on inputs.
- **Server rendering** runs components on the server where browser side effects make no sense.

### Where side effects go

- **Event handlers** for things caused by a user action (submit, click). These are the first choice.
- **Effects** (\`useEffect\`) for synchronising with external systems because the component is on screen.
- **Actions** (React 19) for async mutations triggered by forms and transitions.

### StrictMode

\`<StrictMode>\` in development deliberately: renders components twice (and calls state initialisers, updater functions and reducers twice), runs effects setup → cleanup → setup once on mount, and re-runs ref callbacks. In React 19 the second render reuses memoised results from the first. Double rendering exposes impure code: if something increments twice, appends twice, or fetches twice, you have a side effect in the wrong place. StrictMode has no effect in production builds.

### Spotting impurity

Red flags in render: \`Date.now()\` or \`Math.random()\` used to produce output (use state initialisers or pass them in), \`array.sort()\` on props, \`someGlobal++\`, \`document.title = ...\`, \`fetch(...)\`. The ESLint React hooks plugin and the compiler will flag many of them.`,
    examples: [
      {
        title: '❌ mutation during render vs ✅ pure',
        code: `let renderedCount = 0 // module-level

// ❌ changes outside state during render; StrictMode doubles it
function CommentListBad({ comments }: { comments: Comment[] }) {
  renderedCount += comments.length
  comments.sort((a, b) => b.likes - a.likes) // mutates parent's array
  return <ul>{comments.map(c => <CommentItem key={c.id} comment={c} />)}</ul>
}

// ✅ derive a new array, no external writes
function CommentList({ comments }: { comments: Comment[] }) {
  const ranked = comments.toSorted((a, b) => b.likes - a.likes)
  return <ul>{ranked.map(c => <CommentItem key={c.id} comment={c} />)}</ul>
}`,
        note: 'Both the counter and the in-place sort change data that outlives the render. The good version only creates local data.',
      },
      {
        title: '❌ analytics in render vs ✅ in event / effect',
        code: `function ProductPage({ product }: { product: Product }) {
  // ❌ fires on every render, twice in StrictMode, even for discarded renders
  // track('product_viewed', { id: product.id })

  // ✅ "the user saw this product" is synchronisation with an external system
  useEffect(() => {
    track('product_viewed', { id: product.id })
  }, [product.id])

  // ✅ user-caused effects belong in handlers
  const addToCart = () => { cart.add(product.id); track('add_to_cart', { id: product.id }) }
  return <button onClick={addToCart}>Add</button>
}`,
        note: 'Render may run any number of times. Handlers run once per user action; effects run after commit when the dependency changes.',
      },
    ],
    realCase: {
      title: 'Doubled line items in development only',
      story: `A B2B ordering portal built its invoice preview by pushing into a module-level \`lines\` array inside the component body. Developers noticed every line appeared twice locally, assumed StrictMode was "buggy" and removed it.

Weeks later, after enabling transitions for a filter, production users saw duplicated lines too: React was interrupting and restarting the render, and each attempt pushed again. The fix built \`lines\` as a local variable inside render and restored StrictMode. Lesson: StrictMode's double render is a smoke detector; removing it does not remove the fire.`,
    },
    pitfalls: [
      'Removing StrictMode to "fix" double logs or double fetches instead of fixing impurity.',
      'Sorting or mutating props during render.',
      'Writing to module-level variables, `document`, or storage during render.',
      'Using `Math.random()` / `Date.now()` directly in render output, which also causes hydration mismatches.',
    ],
    exercise: {
      task: 'Find and fix the three purity problems:\n\n```tsx\nlet nextId = 0\nfunction TaskBoard({ tasks }: { tasks: Task[] }) {\n  document.title = `${tasks.length} tasks`\n  tasks.reverse()\n  return <ul>{tasks.map(t => <li key={nextId++}>{t.title}</li>)}</ul>\n}\n```',
      hint: 'Document title is an external system; reverse mutates; keys must be stable and come from data.',
      solution: `\`\`\`tsx
function TaskBoard({ tasks }: { tasks: Task[] }) {
  useEffect(() => {
    document.title = \`\${tasks.length} tasks\`
  }, [tasks.length])

  const newestFirst = tasks.toReversed()
  return <ul>{newestFirst.map(t => <li key={t.id}>{t.title}</li>)}</ul>
}
\`\`\`

The title becomes an effect, \`toReversed\` avoids mutation, and the key comes from the task id instead of a global counter that changes every render.`,
    },
    interview: [
      'What does it mean for a React component to be pure, and why does concurrent rendering require it?',
      'What does StrictMode do in development, and why does it double-invoke renders and effects?',
      'Where should side effects go if not in render?',
    ],
  },

  state: {
    explanation: `\`useState\` gives a component memory between renders. The key insight: the state value you read is a **snapshot** for the current render, not a live variable.

### How it works

React stores state outside your function, in the component's fiber, indexed by hook call order. Each render, \`useState\` returns the value React has for that slot. When you call the setter, React does not change the variable you are holding; it **queues an update** and schedules a re-render. In the next render, \`useState\` returns the new value and your function runs again, creating new handlers that close over it.

So in this handler:

\`\`\`js
function handleClick() {
  setCount(count + 1)
  setCount(count + 1)
  console.log(count) // still the old value
}
\`\`\`

both calls compute \`0 + 1\`, and the log prints \`0\`. The count ends at 1.

### Updater functions

\`setCount(c => c + 1)\` queues a *function*. React applies queued updaters in order to the latest pending state, so two updater calls produce +2. Use updaters whenever the next state depends on the previous one, especially in async code, intervals, or multiple updates in a row.

### Batching

React 18+ batches all updates triggered in the same event, promise callback or timeout into a single re-render. Ten \`setX\` calls in one click cause one render. To read the DOM after an update synchronously (rare), \`flushSync\` exists.

### Bail-outs

If you set state to a value that is \`Object.is\`-equal to the current one, React can skip re-rendering that component. This is why mutating and setting the same object does nothing.

### Initialisation

\`useState(initial)\` uses the initial value only on the first render. For expensive initialisation pass a function: \`useState(() => loadDraft())\`, otherwise the expensive call runs (and is discarded) on every render.

### Choosing state structure

- Group values that always change together into one object; keep independent values separate.
- Avoid contradictions (\`isLoading\` and \`isError\` both true): use a single \`status\` union.
- Avoid redundancy: do not store what you can compute.
- Avoid duplicating objects (store \`selectedId\`, not a copy of the selected item).
- Avoid deep nesting; flatten when updates get painful.

### Why snapshots are good

A handler always works with values consistent with the UI the user saw when they clicked. Imagine a "send" button with a 3 second delay: it sends the message that was on screen when clicked, even if the user keeps typing.`,
    examples: [
      {
        title: '❌ stale snapshot vs ✅ updater function',
        code: `function QuantityPicker() {
  const [qty, setQty] = useState(1)

  // ❌ +2 button only adds 1: both calls read the same snapshot
  const addTwoBad = () => { setQty(qty + 1); setQty(qty + 1) }

  // ✅ each updater receives the result of the previous one
  const addTwo = () => { setQty(q => q + 1); setQty(q => q + 1) }

  return <button onClick={addTwo}>{qty} (+2)</button>
}`,
        note: '`qty` is a constant within a render. Updaters are queued and applied in order to the latest pending value.',
      },
      {
        title: '❌ contradictory booleans vs ✅ status union',
        code: `// ❌ four booleans allow 16 combinations, most of them impossible
const [isLoading, setIsLoading] = useState(false)
const [isError, setIsError] = useState(false)
const [isSuccess, setIsSuccess] = useState(false)

// ✅ exactly one status at a time
type Status = 'idle' | 'submitting' | 'success' | 'error'
const [status, setStatus] = useState<Status>('idle')
const [error, setError] = useState<string | null>(null)

async function submit(data: FormData) {
  setStatus('submitting')
  try { await api.save(data); setStatus('success') }
  catch (e) { setError(String(e)); setStatus('error') }
}`,
        note: 'Modelling state as a single status makes impossible states unrepresentable and the render logic a simple switch.',
      },
    ],
    realCase: {
      title: 'Double-click bought one ticket instead of two',
      story: `A cinema booking widget had "+" buttons next to each ticket type. On slow devices, users who tapped "+" twice quickly sometimes saw only one ticket added. The handler was \`setCount(count + 1)\`.

Two taps were handled before React re-rendered, so both handlers closed over the same \`count\`. Switching to \`setCount(c => c + 1)\` made each tap count. The team then audited all "increment/toggle/append" handlers and converted them to updaters. Lesson: when the next state depends on the previous one, do not trust the snapshot in your closure.`,
    },
    pitfalls: [
      'Reading state right after setting it and expecting the new value.',
      'Using `setX(x + 1)` repeatedly or in async callbacks instead of updaters.',
      'Passing an expensive call (`useState(parse(big))`) instead of an initialiser function.',
      'Several booleans that can contradict each other instead of a status union.',
      'Storing a copy of a selected object instead of its id.',
    ],
    exercise: {
      task: 'Predict the final `score` after one click, then rewrite so it ends at 6:\n\n```tsx\nconst [score, setScore] = useState(0)\nfunction onClick() {\n  setScore(score + 1)\n  setScore(s => s + 2)\n  setScore(score + 3)\n}\n```',
      hint: 'Process the queue in order: a value replaces, a function transforms the latest pending value.',
      solution: `Queue: replace with 1 → 1 + 2 = 3 → replace with 0 + 3 = 3. Final score: **3**.

\`\`\`tsx
function onClick() {
  setScore(s => s + 1)
  setScore(s => s + 2)
  setScore(s => s + 3)
}
\`\`\`

Now the result is 0 + 1 + 2 + 3 = 6.`,
    },
    interview: [
      'Why does `console.log(count)` right after `setCount(count + 1)` print the old value?',
      'What is batching, and when did React start batching updates outside event handlers?',
      'How would you structure state for a form that can be idle, submitting, succeeded or failed?',
    ],
  },

  sharing: {
    explanation: `Two components often need the same piece of state: a search box and the results list, a set of accordion panels where only one is open, a form field and a preview. React's answer is **lifting state up**.

### Lifting state up

1. Remove the state from the children.
2. Put it in their closest common parent.
3. Pass the value down as props and pass callbacks to change it.

The children become **controlled** by the parent: they render what they are told and report events. This gives a single source of truth; the two children can never disagree.

The trade-off: lifting too high makes many components re-render and couples unrelated parts. Lift to the *closest* common parent, and when passing through many layers becomes painful, consider composition (passing JSX as children) or context.

### Controlled vs uncontrolled components

The same vocabulary applies to form inputs:

- **Controlled**: React state is the source of truth. \`value={name}\` plus \`onChange={e => setName(e.target.value)}\`. Every keystroke goes through React, so you can validate, transform (uppercase, masks) or derive UI live.
- **Uncontrolled**: the DOM keeps the value. \`defaultValue="..."\` sets the initial value; you read it on submit via \`FormData\` or a ref.

Neither is "correct". Controlled inputs suit live validation, dependent fields and instant previews. Uncontrolled inputs are simpler and cheaper for large forms you only read on submit, and they pair naturally with React 19 form Actions: \`<form action={save}>\` receives a \`FormData\` with every named field.

### Rules

- Do not switch an input between controlled and uncontrolled. \`value={undefined}\` makes it uncontrolled; initialise with \`''\` instead.
- A \`value\` without \`onChange\` makes a read-only field (React warns). Use \`readOnly\` or \`defaultValue\`.
- Checkboxes use \`checked\`/\`defaultChecked\`, not \`value\`.
- \`select\` uses \`value\` on the \`select\`, not \`selected\` on options.

### Components can be controlled too

Your own components can follow the same pattern: a \`Tabs\` component that accepts \`activeTab\` and \`onTabChange\` is controlled; one that keeps its own active index is uncontrolled. Good library components often support both (controlled when \`value\` is passed, otherwise internal state).`,
    examples: [
      {
        title: '❌ duplicated state vs ✅ lifted state',
        code: `// ❌ each panel owns "open", so several can be open at once
function PanelBad({ title, children }: PanelProps) {
  const [open, setOpen] = useState(false)
  return <section><button onClick={() => setOpen(!open)}>{title}</button>{open && children}</section>
}

// ✅ parent owns which panel is open; panels are controlled
function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  return faqs.map(f => (
    <Panel
      key={f.id}
      title={f.question}
      isOpen={openId === f.id}
      onToggle={() => setOpenId(id => (id === f.id ? null : f.id))}
    >
      {f.answer}
    </Panel>
  ))
}

function Panel({ title, isOpen, onToggle, children }: { title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section>
      <button aria-expanded={isOpen} onClick={onToggle}>{title}</button>
      {isOpen && <div>{children}</div>}
    </section>
  )
}`,
        note: 'The "only one open" rule involves all panels, so the state belongs to their parent. Each Panel just renders `isOpen` and reports clicks.',
      },
      {
        title: 'Controlled vs uncontrolled inputs side by side',
        code: `function ShippingForm() {
  // controlled: needed for the live postcode formatting
  const [postcode, setPostcode] = useState('')

  async function save(formData: FormData) {
    await api.saveAddress({
      street: formData.get('street'), // uncontrolled, read on submit
      postcode,
    })
  }

  return (
    <form action={save}>
      <input name="street" defaultValue="" />
      <input value={postcode} onChange={e => setPostcode(e.target.value.toUpperCase().replace(/\\s+/g, ''))} />
      <button>Save</button>
    </form>
  )
}`,
        note: 'Mix freely: control only fields where you need to react to each keystroke; let the rest stay in the DOM and read them via FormData.',
      },
    ],
    realCase: {
      title: 'A price preview that lagged one keystroke behind',
      story: `A print-on-demand shop had a quantity input and a live price preview as siblings. The input kept its own state and called \`onQuantityChange\` from an effect after each change, and the parent copied it into its own state for the preview. Users saw the price for the previous quantity and occasionally checked out with the wrong total.

Two copies of the same state synchronised via effects caused an extra render cycle and races. Lifting \`quantity\` to the parent and making the input controlled removed the effect and the lag. Lesson: if two components need the same value, keep one copy in their common parent; do not sync copies.`,
    },
    pitfalls: [
      'Keeping copies of the same state in siblings and syncing them with effects.',
      'Starting a controlled input with `undefined` and then a string, triggering the controlled/uncontrolled warning.',
      'Providing `value` without `onChange`.',
      'Lifting state far higher than needed, causing large re-renders.',
    ],
    exercise: {
      task: 'Build a temperature converter with two inputs, Celsius and Fahrenheit. Typing in either updates the other. Only one piece of state may exist.',
      hint: 'Store the value as typed and which scale it was typed in; derive the other.',
      solution: `\`\`\`tsx
type Scale = 'c' | 'f'
const toC = (f: number) => ((f - 32) * 5) / 9
const toF = (c: number) => (c * 9) / 5 + 32
const convert = (v: string, fn: (n: number) => number) =>
  v === '' || Number.isNaN(Number(v)) ? '' : String(Math.round(fn(Number(v)) * 10) / 10)

export function Converter() {
  const [input, setInput] = useState<{ scale: Scale; value: string }>({ scale: 'c', value: '' })
  const celsius = input.scale === 'c' ? input.value : convert(input.value, toC)
  const fahrenheit = input.scale === 'f' ? input.value : convert(input.value, toF)

  return (
    <>
      <label>°C <input value={celsius} onChange={e => setInput({ scale: 'c', value: e.target.value })} /></label>
      <label>°F <input value={fahrenheit} onChange={e => setInput({ scale: 'f', value: e.target.value })} /></label>
    </>
  )
}
\`\`\`

Storing the raw string keeps what the user typed exactly; the other field is derived.`,
    },
    interview: [
      'What does lifting state up mean, and what are its costs?',
      'Compare controlled and uncontrolled inputs. When would you choose each?',
      'How would you design a component that can be either controlled or uncontrolled?',
    ],
  },

  preserve: {
    explanation: `State does not live "inside" your component function. React keeps it in the tree it builds from your elements, and ties it to a **position** in that tree. Knowing this explains surprising state resets and surprising state survivals.

### The rule

During reconciliation React compares the new element tree with the previous one:

- **Same type at the same position** (and same key) → React keeps the existing component instance and its state, and updates its props.
- **Different type** at that position (\`<Input>\` replaced by \`<Select>\`, or \`div\` replaced by \`section\`) → React unmounts the old subtree (state destroyed) and mounts a new one.
- **Different key** → treated as a different component even if the type matches: unmount and remount.

"Position" means the place in the parent's children, not the JSX line. \`{isAdmin ? <Profile user={a} /> : <Profile user={b} />}\` renders \`Profile\` at the same position in both branches, so state is *kept* when switching.

### Surprising preservation

A chat app renders \`<Chat contact={selected} />\`. Switching contacts changes only the prop; the component stays mounted, so the half-typed draft follows you to the next person. Wrong!

### Resetting with key

\`<Chat key={selected.id} contact={selected} />\` tells React each contact gets its own instance. Changing the key unmounts the old one and mounts a fresh one with initial state. This is the idiomatic way to reset a form when editing a different record, much cleaner than an effect that resets fields when an id changes.

### Surprising resets

- Defining a component **inside another component** (\`function Parent() { function Row() {...} }\`) creates a new function type on every render. React sees a different type each time, so the child remounts on every parent render, losing state and focus. Always define components at module level.
- Wrapping an element conditionally in a different container (\`isMobile ? <div><Form/></div> : <Form/>\`) changes the tree path, resetting \`Form\`.

### Keeping state for hidden things

If you need state to survive while a component is hidden (tabs), either keep it mounted and hide it with CSS, lift the state up, or use React's \`Activity\` component (React 19.2), which hides a subtree while preserving its state.

### Why React works this way

Matching by position and type is fast (O(n) heuristics instead of an expensive tree diff) and predictable. Keys are your way to give React extra identity information when position alone is not enough.`,
    examples: [
      {
        title: '❌ draft leaks between contacts vs ✅ key resets',
        code: `function Messenger({ contacts }: { contacts: Contact[] }) {
  const [selected, setSelected] = useState(contacts[0])
  return (
    <div className="messenger">
      <ContactList contacts={contacts} selectedId={selected.id} onSelect={setSelected} />
      {/* ❌ same position, same type: draft state is preserved when switching */}
      {/* <ChatPanel contact={selected} /> */}

      {/* ✅ a new key per contact gives each its own fresh state */}
      <ChatPanel key={selected.id} contact={selected} />
    </div>
  )
}

function ChatPanel({ contact }: { contact: Contact }) {
  const [draft, setDraft] = useState('')
  return <textarea placeholder={\`Message \${contact.name}\`} value={draft} onChange={e => setDraft(e.target.value)} />
}`,
        note: 'Without the key React sees the same `ChatPanel` at the same spot and only swaps props. The key makes identity explicit.',
      },
      {
        title: '❌ component defined inside a component',
        code: `function UserTable({ users }: { users: User[] }) {
  // ❌ a new Row type on every UserTable render: rows remount, inputs lose focus
  function Row({ user }: { user: User }) {
    const [editing, setEditing] = useState(false)
    return <tr onClick={() => setEditing(true)}><td>{editing ? <input defaultValue={user.name} /> : user.name}</td></tr>
  }
  return <table><tbody>{users.map(u => <Row key={u.id} user={u} />)}</tbody></table>
}

// ✅ define Row at module level and pass what it needs as props`,
        note: 'Component identity is the function reference. Recreated functions are different types, so React throws away the old subtree each render.',
      },
    ],
    realCase: {
      title: 'Editing one customer, saving another',
      story: `A CRM's side panel showed an edit form for the selected customer. The form initialised its fields with \`useState(customer.email)\`. When a sales rep clicked a different customer, the header changed but the fields still showed the previous customer's email; saving wrote that email onto the new customer.

The team's first fix was an effect that reset each field when \`customer.id\` changed, which caused a flash of stale data. The final fix was \`<CustomerForm key={customer.id} customer={customer} />\`: one line, no effect, no flash. Lesson: when a component should start fresh for a different entity, give it a key derived from that entity.`,
    },
    pitfalls: [
      'Expecting state to reset when only props change.',
      'Using effects to reset state on id changes instead of a `key`.',
      'Defining components inside other components.',
      'Conditionally wrapping elements in different containers, accidentally resetting their state.',
      'Assuming state survives when a component is removed and re-added.',
    ],
    exercise: {
      task: 'Build a `Scoreboard` showing two players\' counters with a toggle "Show Alice / Show Bob". First render a single `<Counter person={...} />` and observe that the count is shared when switching. Then make each player keep their own independent score, using two different techniques.',
      hint: 'Technique 1: different positions. Technique 2: keys. Note: keyed switching resets the score, separate positions keep both mounted only if both render.',
      solution: `\`\`\`tsx
function Scoreboard() {
  const [isAlice, setIsAlice] = useState(true)
  return (
    <>
      {/* Technique 1: different positions, each its own state (resets when unmounted) */}
      {isAlice && <Counter person="Alice" />}
      {!isAlice && <Counter person="Bob" />}

      {/* Technique 2: same position, different keys */}
      <Counter key={isAlice ? 'alice' : 'bob'} person={isAlice ? 'Alice' : 'Bob'} />

      <button onClick={() => setIsAlice(a => !a)}>Switch</button>
    </>
  )
}
\`\`\`

Both techniques give each player separate state but reset it when switching away. To keep both scores across switches, lift the scores up (\`{ alice: 0, bob: 0 }\` in \`Scoreboard\`) or keep both mounted and hide one.`,
    },
    interview: [
      'How does React decide whether to preserve or reset a component\'s state between renders?',
      'Why is using `key` to reset a form better than an effect?',
      'Why should you never define a component inside another component?',
    ],
  },
}

export default details
