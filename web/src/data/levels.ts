import type { Level } from './types'

const t = (id: string, title: string, body: string, stretch = false) => ({ id, title, body, stretch })
const p = (title: string, summary: string, tasks: string[]) => ({
  title,
  summary,
  tasks: tasks.map((text, i) => ({ id: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${i}`, text })),
})

export const LEVELS: Level[] = [
  {
    id: 0,
    slug: 'javascript-foundations',
    title: 'JavaScript & Web Foundations',
    tagline: 'React is just JavaScript. Make the language feel effortless.',
    phase: 'Foundations',
    weeks: 3,
    vizIds: ['event-loop', 'references'],
    checkpoint: 'You can explain closures and the event loop, and write map/filter/reduce transformations without looking anything up.',
    topics: [
      t('modern-syntax', 'Modern syntax', `You will read and write these every day in React code:

- \`const\`/\`let\` instead of \`var\` (block scope, no surprises in loops)
- arrow functions, template literals, default parameters
- destructuring: \`const { name, age = 0 } = user\`
- spread/rest: \`{ ...user, age: 31 }\`, \`[...items, next]\`
- optional chaining \`user?.address?.city\` and nullish coalescing \`value ?? 'default'\`
- ES modules: named vs default exports

**Why it matters:** almost every React state update uses spread to build a *new* object or array.`),
      t('arrays', 'Array methods', `JSX lists are built with \`map\`, filtered views with \`filter\`, and totals with \`reduce\`. Learn which methods **mutate** (\`push\`, \`splice\`, \`sort\`, \`reverse\`) and their non-mutating twins (\`concat\`/spread, \`slice\`/\`toSpliced\`, \`toSorted\`, \`toReversed\`).

\`\`\`js
const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
const visible = todos.filter(t => !t.done).map(t => t.title)
\`\`\``),
      t('immutability', 'Immutability', `React decides whether to re-render by comparing **references**. If you mutate an object in place, its reference stays the same and React may skip the update.

- Update objects with spread: \`{ ...state, done: true }\`
- Update nested data level by level: \`{ ...user, address: { ...user.address, city } }\`
- Update arrays with \`map\` (replace), \`filter\` (remove), spread (add)
- \`structuredClone\` deep-copies when you truly need it`),
      t('references', 'Reference vs value', `Primitives (numbers, strings, booleans) compare by value. Objects, arrays and functions compare by **reference** — two separately created objects are never \`===\`, even with identical contents.

This is the root of many React behaviours: dependency arrays, \`memo\`, and context all compare with \`Object.is\`. A new object or arrow function created during render is a *new reference every render*.`),
      t('closures', 'Closures & scope', `A closure is a function that remembers the variables from the scope where it was **created**. Every render of a React component creates new closures that capture *that render's* props and state.

That is why a \`setTimeout\` started in an old render still sees old state — the classic **stale closure**. Understanding this makes hooks feel logical instead of magical.`),
      t('async', 'Async: event loop, Promises, fetch', `JavaScript is single-threaded. The **event loop** runs the call stack to completion, then drains **all microtasks** (Promise callbacks, \`queueMicrotask\`), then takes **one macrotask** (timers, I/O, events), then repeats.

Learn \`async\`/\`await\`, \`try/catch\` around awaits, \`Promise.all\` for parallel work, and \`AbortController\` to cancel requests — you'll need cancellation in every data-fetching hook.`),
      t('dom-events', 'DOM & events', `Events **bubble** from the target up to the root. React attaches a single listener at the root and dispatches synthetic events, but the mental model is the same: \`stopPropagation\` stops bubbling, \`preventDefault\` stops the browser's default action (like form submission reloading the page).`),
      t('html-css', 'HTML & CSS', `Semantic HTML (\`button\`, \`nav\`, \`main\`, \`label\`) gives you accessibility for free. Be comfortable with **Flexbox**, **Grid**, responsive units, media queries and CSS custom properties (variables) — every styling approach in React builds on them.`),
    ],
    projects: [
      p('Vanilla JS Todo', 'Build a todo app with no framework, to feel the pain React removes.', [
        'Add, toggle and delete todos',
        'Filter: all / active / completed',
        'Persist to localStorage and restore on load',
        'Keep the DOM in sync with your data array by hand',
        'Write NOTES.md: what was painful about manual DOM updates?',
      ]),
    ],
    resources: [
      { label: 'javascript.info', url: 'https://javascript.info' },
      { label: 'MDN JavaScript Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide' },
    ],
  },
  {
    id: 1,
    slug: 'react-fundamentals',
    title: 'React Fundamentals',
    tagline: 'Components, props, state, and thinking in React.',
    phase: 'Foundations',
    weeks: 3,
    vizIds: ['render-tree', 'keys', 'batching'],
    checkpoint: 'You can explain what triggers a re-render, why mutating state does not work, and what keys are for.',
    topics: [
      t('setup', 'Setup: Vite, React Compiler, ESLint', `Create a project with \`npm create vite@latest\` (React + TypeScript). Enable the **React Compiler** (react.dev → React Compiler → Installation) so memoization is automatic, and keep \`eslint-plugin-react-hooks\` on — its warnings are lessons. Write *loose* TypeScript until Level 3.`),
      t('thinking', 'Thinking in React', `Start from a mockup:

- Break the UI into a **component hierarchy** (one component = one responsibility)
- Build a static version with props only
- Find the **minimal** state (anything derivable is not state)
- Decide **where** each piece of state lives: the closest common parent of everything that needs it
- Add inverse data flow (pass setters/handlers down)`),
      t('jsx', 'JSX', `JSX is syntax sugar for function calls that produce element objects. Use \`{}\` to embed any JS **expression** (not statements). Use \`className\`, close every tag, and wrap siblings in a fragment \`<>...</>\`.`),
      t('props', 'Components & props', `Components are functions that take **props** and return UI. Props are read-only — a component must never modify them. \`children\` is just a prop containing whatever you nest inside the component, and it's the key to composition.`),
      t('conditional', 'Conditional rendering & lists', `Use \`if\` with early returns, ternaries, or \`&&\`. Beware: \`{count && <Badge/>}\` renders **0** when \`count\` is 0 — use \`count > 0 &&\`.

Render lists with \`map\` and give each item a stable, unique \`key\` — usually an ID from your data, **not** the array index.`),
      t('purity', 'Purity & StrictMode', `Rendering must be **pure**: same inputs → same JSX, and no side effects (no mutations of outside variables, no fetches, no subscriptions) during render. \`StrictMode\` renders components twice in development to surface impure code.`),
      t('state', 'State as a snapshot', `\`useState\` gives you the value **for this render**. Calling \`setCount(count + 1)\` doesn't change \`count\` in the current render — it schedules a new render. Multiple updates in one event are **batched**.

Use an updater \`setCount(c => c + 1)\` when the next state depends on the previous one.`),
      t('sharing', 'Sharing state, controlled inputs', `When two components need the same state, **lift it up** to their closest common parent and pass it down. A **controlled** input takes its value from state (\`value\` + \`onChange\`); an uncontrolled one keeps its own value in the DOM (\`defaultValue\` + ref).`),
      t('preserve', 'Preserving & resetting state', `React ties state to a component's **position in the tree**. Same component at the same position → state preserved. Different type or different \`key\` → state reset. Changing \`key\` is the idiomatic way to reset a component (e.g. a form when switching users).`),
    ],
    projects: [
      p('Tic-Tac-Toe', 'The react.dev tutorial — then extend it yourself.', [
        'Finish the official tutorial',
        'Show "You are at move #N" for the current move',
        'Render the board with two loops instead of hard-coded squares',
        'Toggle sorting the move list ascending/descending',
        'Highlight the three winning squares',
        'Show (row, col) for each move in the history',
      ]),
      p('Filterable Product Table', 'Rebuild the "Thinking in React" example from scratch.', [
        'Draw the component hierarchy on paper first',
        'Build the static version with props only',
        'Identify the minimal state and where it lives',
        'Add the search box and "in stock only" filter',
      ]),
    ],
    resources: [
      { label: 'react.dev — Learn', url: 'https://react.dev/learn' },
      { label: 'Thinking in React', url: 'https://react.dev/learn/thinking-in-react' },
    ],
  },
  {
    id: 2,
    slug: 'hooks-in-depth',
    title: 'Hooks in Depth',
    tagline: 'Effects, refs, reducers, context and custom hooks.',
    phase: 'Foundations',
    weeks: 3,
    vizIds: ['effect-timeline', 'stale-closure', 'race-condition'],
    checkpoint: 'You can explain why every effect dependency is there, and you have removed every unnecessary effect.',
    topics: [
      t('use-effect', 'useEffect: synchronization', `Effects are for **synchronizing with external systems**: network, subscriptions, timers, browser APIs, non-React widgets. An effect runs *after* commit. The cleanup runs before the next effect and on unmount.

The dependency array is not a choice — it must list every reactive value the effect reads. If that causes too many runs, change the code, not the array.`),
      t('no-effect', 'You might not need an effect', `The most common React mistake. You do **not** need an effect to:

- compute values from props/state → calculate during render
- reset state when a prop changes → use a \`key\`
- respond to a user action → do it in the event handler
- notify a parent → call its callback in the event handler
- cache expensive computations → \`useMemo\` (or let the compiler do it)`),
      t('use-ref', 'useRef', `A ref is a mutable box \`{ current }\` that survives renders **without** triggering one. Use it for DOM nodes (focus, measure, scroll) and for values that don't affect output (interval IDs, previous values). Don't read or write \`ref.current\` during render.`),
      t('use-reducer', 'useReducer', `When state has many transitions, move the logic into a pure **reducer** \`(state, action) => newState\`. Model actions as a discriminated union. Reducers are trivially unit-testable and make impossible transitions explicit.`),
      t('use-context', 'useContext', `Context passes data deep without prop drilling. Every component that reads a context re-renders when its value changes, so keep values stable and split unrelated data into separate contexts.`),
      t('memo-hooks', 'useMemo, useCallback, memo', `They cache a value, a function, or a component's render between renders. With the **React Compiler** you rarely write them by hand. Learn them to read existing code and for cases the compiler can't optimize.`),
      t('react19-hooks', 'React 19 hooks', `- \`use(promise | context)\` — read a resource, suspending until ready
- \`useActionState\` — state driven by an async form action
- \`useFormStatus\` — pending state of the parent form
- \`useOptimistic\` — show the expected result before the server confirms
- \`useTransition\` / \`useDeferredValue\` — keep the UI responsive during heavy updates`),
      t('rules', 'Rules of Hooks & custom hooks', `Call hooks at the top level, in the same order, every render (never in conditions or loops). React stores hook state **by call order**.

Custom hooks (\`useSomething\`) extract reusable stateful *logic*. Two components using the same custom hook get **independent** state.`),
    ],
    projects: [
      p('Weather Search', 'A search app using the free Open-Meteo API.', [
        'Debounced search input with your own useDebounce hook',
        'Your own useFetch hook: loading / error / data states',
        'Cancel stale requests with AbortController (no race conditions)',
        'Recent searches via a custom useLocalStorage hook',
        '°C/°F toggle where the converted value is derived during render',
      ]),
    ],
    resources: [
      { label: 'You Might Not Need an Effect', url: 'https://react.dev/learn/you-might-not-need-an-effect' },
      { label: 'A Complete Guide to useEffect', url: 'https://overreacted.io/a-complete-guide-to-useeffect/' },
    ],
  },
  {
    id: 3,
    slug: 'typescript-react',
    title: 'TypeScript with React',
    tagline: 'Make impossible states unrepresentable.',
    phase: 'Building',
    weeks: 2,
    vizIds: ['ui-states'],
    checkpoint: 'tsc passes in strict mode, there is zero `any`, and impossible UI states cannot be expressed in your types.',
    topics: [
      t('ts-basics', 'TypeScript essentials', `Know unions, literal types, generics, \`unknown\` vs \`any\`, narrowing (\`typeof\`, \`in\`, discriminants) and utility types (\`Partial\`, \`Pick\`, \`Omit\`, \`Record\`). Turn on \`strict\` and \`noUncheckedIndexedAccess\`.`),
      t('typing-components', 'Typing components', `Type props with a type alias; \`children\` is \`React.ReactNode\`. Type events with \`React.ChangeEvent<HTMLInputElement>\` etc. Extend native elements with \`ComponentProps<'button'>\` so your Button accepts every normal button prop.`),
      t('discriminated', 'Discriminated unions for UI state', `Three booleans (\`isLoading\`, \`isError\`, \`data\`) allow 8 combinations, most of them nonsense. A union allows only valid states:

\`\`\`ts
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: City[] }
\`\`\``),
      t('generic-components', 'Generic components', `A \`<Select<T>>\` or \`<List<T>>\` can be fully type-safe: the type of \`items\` determines the type of \`onSelect\`'s argument. Generic components are how good libraries feel "magical".`),
      t('zod', 'Runtime validation with Zod', `TypeScript types vanish at runtime. Data from an API, localStorage or a URL is \`unknown\` until **validated**. Define a Zod schema, parse at the boundary, and infer your TS type from the schema so they never drift.`),
    ],
    projects: [
      p('Typed Weather App', 'Convert your Level 2 app to strict TypeScript.', [
        'Enable strict and noUncheckedIndexedAccess',
        'Remove every `any`',
        'Model fetch state as a discriminated union',
        'Validate API responses with Zod',
      ]),
    ],
    resources: [
      { label: 'React TypeScript Cheatsheet', url: 'https://react-typescript-cheatsheet.netlify.app' },
      { label: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/intro.html' },
    ],
  },
  {
    id: 4,
    slug: 'routing-forms-data',
    title: 'Routing, Forms & Data Fetching',
    tagline: 'Real multi-page apps with real APIs.',
    phase: 'Building',
    weeks: 4,
    vizIds: ['query-cache', 'race-condition', 'ui-states'],
    checkpoint: 'Refreshing any page keeps its state (from the URL), the back button works, and you can explain every request waterfall.',
    topics: [
      t('routing', 'Routing', `Learn **React Router** (or TanStack Router for type-safety): nested routes and layouts, params, **search params as state**, loaders/actions, 404s, protected routes and lazy routes. If a piece of UI state should survive a refresh or be shareable, put it in the URL.`),
      t('server-state', 'Server state vs client state', `Server state is a **cache** of data owned by someone else: it can be stale, it's shared, it needs refetching. Client state (a modal is open, a draft) is yours. Treat them with different tools.`),
      t('tanstack-query', 'TanStack Query', `Query keys identify cached data. \`staleTime\` = how long data counts as fresh; \`gcTime\` = how long unused data stays in memory. Mutations + **invalidation** refetch affected queries. Learn optimistic updates, pagination, infinite queries and prefetching.`),
      t('forms', 'Forms', `Build one form by hand first (values, errors, touched, submit state). Then use **React Hook Form + Zod**, and learn React 19 **Actions** with \`useActionState\` and \`useFormStatus\`.`),
      t('forms-a11y', 'Accessible forms', `Every input needs a \`<label>\`. Link error messages with \`aria-describedby\` and mark invalid fields with \`aria-invalid\`. On a failed submit, move focus to the first invalid field.`),
      t('auth', 'Auth on the client', `Store session tokens in **httpOnly, Secure, SameSite** cookies set by the server — JavaScript (and therefore XSS) can't read them. \`localStorage\` tokens are readable by any injected script. Redirect back to the intended page after login.`),
    ],
    projects: [
      p('Catalog App', 'Movies/books catalog — or a frontend for your Rust Tasks API.', [
        'List page with search, filters and pagination stored in the URL',
        'Detail page with nested tab routes',
        'Favorites with optimistic updates',
        'Login form and protected routes',
        'Add/edit form with validation',
        'Loading skeletons, error and empty states on every page',
      ]),
    ],
    resources: [
      { label: 'TanStack Query docs', url: 'https://tanstack.com/query/latest' },
      { label: 'TkDodo — Practical React Query', url: 'https://tkdodo.eu/blog/practical-react-query' },
    ],
  },
  {
    id: 5,
    slug: 'state-architecture',
    title: 'State Management & Architecture',
    tagline: 'Put every piece of state in the right place.',
    phase: 'Building',
    weeks: 3,
    vizIds: ['state-placement', 'render-tree'],
    checkpoint: 'You can justify where every piece of state in your app lives.',
    topics: [
      t('placement', 'Where state should live', `From closest to widest: **local → lifted → URL → context → external store → server cache**. Always pick the closest level that works. Most "state management problems" are state living too high.`),
      t('context-perf', 'Context performance', `Every consumer re-renders when the context value changes. Split unrelated values into separate contexts, separate state from dispatch, and keep the provider's value stable.`),
      t('stores', 'External stores', `Learn **Zustand** deeply: small API, selectors prevent unnecessary re-renders. Learn **Redux Toolkit** well enough for enterprise codebases (slices, selectors, RTK Query).`),
      t('jotai', 'Atomic state (Jotai)', `State as small independent atoms that components subscribe to individually. Great for highly interconnected UI state such as editors.`, true),
      t('xstate', 'State machines (XState)', `Model flows as explicit states and transitions (wizard, checkout, media player). Impossible transitions simply don't exist.`, true),
      t('structure', 'Feature-based structure', `Organise by **feature** (\`features/cart\`, \`features/auth\`), not by type. Each feature exposes a public \`index.ts\`. Shared UI never imports from features — enforce boundaries with lint rules.`),
    ],
    projects: [
      p('E-commerce Store', 'Catalog, cart and checkout using DummyJSON or FakeStore.', [
        'Product catalog with TanStack Query',
        'Cart with Zustand, persisted to storage',
        'Multi-step checkout modelled as a state machine (useReducer or XState)',
        'Filters stored in the URL',
        'Feature-based folders with lint-enforced boundaries',
        'Rewrite the cart with Redux Toolkit in a branch and compare in NOTES.md',
      ]),
    ],
    resources: [
      { label: 'Zustand', url: 'https://zustand.docs.pmnd.rs' },
      { label: 'Redux Toolkit', url: 'https://redux-toolkit.js.org' },
    ],
  },
  {
    id: 6,
    slug: 'styling-components',
    title: 'Styling & Component Design',
    tagline: 'Design APIs other developers love — accessible by default.',
    phase: 'Building',
    weeks: 4,
    vizIds: ['focus-trap'],
    checkpoint: 'Every component in your design system works keyboard-only and passes axe checks.',
    topics: [
      t('styling', 'Styling approaches', `CSS Modules (scoped, zero runtime), **Tailwind** (utility-first, very popular), zero-runtime CSS-in-JS (vanilla-extract). Runtime CSS-in-JS fell out of favour because it doesn't fit Server Components and costs render time.`),
      t('tokens', 'Design tokens & theming', `Define colours, spacing, radii and typography as CSS custom properties. Themes are just different token values — dark mode becomes a variable swap.`),
      t('api-design', 'Component API design', `- **Composition** over configuration: accept \`children\` instead of 30 props
- **Compound components**: \`<Tabs><Tabs.List/><Tabs.Panel/></Tabs>\` sharing state via context
- Support **controlled and uncontrolled** use (\`value\` / \`defaultValue\`)
- **Polymorphism** via \`as\` or \`asChild\`
- In React 19, \`ref\` is a normal prop — no more forwardRef`),
      t('headless', 'Headless UI', `**Radix UI** and **React Aria** give you behaviour and accessibility without styles. **shadcn/ui** copies styled Radix components into your codebase so you own them.`),
      t('a11y', 'Accessibility in depth', `Semantic HTML first; ARIA only when no native element fits. Every interactive element must be keyboard reachable and operable, have a visible focus style, and an accessible name. Dialogs trap focus and restore it on close. Test with a screen reader (NVDA on Windows) and follow the WAI-ARIA Authoring Practices.`),
      t('animation', 'Animation', `CSS transitions for simple cases, **Motion** for complex/layout animation, the View Transitions API for page transitions. Always respect \`prefers-reduced-motion\`.`),
      t('storybook', 'Storybook', `Develop components in isolation, document every state, and run accessibility and interaction tests per story.`),
    ],
    projects: [
      p('Mini Design System', 'Build, document and test your own component library.', [
        'Button, Input, Select, Checkbox',
        'Dialog, Tabs and Menu built WITHOUT a headless library',
        'Tooltip and Toast',
        'DataTable with sorting, pagination and row selection',
        'Test everything with keyboard only and NVDA',
        'Compare your Dialog/Menu with Radix and note what you missed',
        'Document in Storybook with a light/dark toggle',
      ]),
    ],
    resources: [
      { label: 'WAI-ARIA Authoring Practices', url: 'https://www.w3.org/WAI/ARIA/apg/' },
      { label: 'Radix UI', url: 'https://www.radix-ui.com' },
    ],
  },
  {
    id: 7,
    slug: 'testing',
    title: 'Testing',
    tagline: 'Tests that catch bugs and survive refactors.',
    phase: 'Mastery',
    weeks: 2,
    vizIds: ['testing-trophy'],
    checkpoint: 'You can refactor a component\'s internals without breaking tests, and tests fail when behaviour breaks.',
    topics: [
      t('trophy', 'The testing trophy', `Static checks (TypeScript, ESLint) at the base, a few unit tests, **mostly integration tests**, a handful of end-to-end tests. Integration tests give the most confidence per minute spent.`),
      t('vitest', 'Vitest', `Fast, Vite-native test runner with a Jest-compatible API. Use it for pure logic (reducers, formatters, validation) and for running component tests.`),
      t('rtl', 'React Testing Library', `Test what users see and do. Query by **role** and **label** (\`getByRole('button', { name: /save/i })\`), interact with \`user-event\`, wait with \`findBy*\`. Never assert on state variables or internal methods.`),
      t('msw', 'Mock Service Worker', `Mock the network at the HTTP boundary instead of mocking \`fetch\` or your hooks. The same handlers work in tests, Storybook and the browser.`),
      t('playwright', 'Playwright E2E', `Real browsers, auto-waiting, traces. Cover critical flows (signup, checkout). Add \`@axe-core/playwright\` for automated accessibility checks.`),
      t('what-not', 'What not to test', `Implementation details, third-party libraries, and giant snapshot tests nobody reads. If a refactor that keeps behaviour identical breaks a test, that test was testing implementation.`),
    ],
    projects: [
      p('Test the Store', 'Add a full test suite to your e-commerce app.', [
        'Unit tests for cart logic',
        'Integration test: search → filter → add to cart → count updates (RTL + MSW)',
        'E2E test for checkout with Playwright',
        'GitHub Actions running lint, typecheck and tests on every push',
      ]),
    ],
    resources: [
      { label: 'Testing Library', url: 'https://testing-library.com/docs/react-testing-library/intro/' },
      { label: 'Playwright', url: 'https://playwright.dev' },
    ],
  },
  {
    id: 8,
    slug: 'performance',
    title: 'Performance',
    tagline: 'Measure, then optimise — with evidence.',
    phase: 'Mastery',
    weeks: 3,
    vizIds: ['render-tree', 'transition', 'virtual-list'],
    checkpoint: 'You have profiler evidence for each optimisation, and no manual memoization the compiler already covers.',
    topics: [
      t('measure', 'Measure first', `Use the React DevTools **Profiler** (enable "record why each component rendered"), the Chrome Performance panel and Lighthouse. Know the **Core Web Vitals**: LCP (loading), INP (responsiveness), CLS (visual stability).`),
      t('rerenders', 'Why components re-render', `A component re-renders when its state changes, its parent re-renders, or a context it reads changes. A re-render is not a DOM update — React only touches the DOM where output differs. Re-renders are usually cheap; slow ones are the problem.`),
      t('fixes', 'Fixes, in order', `- Make sure the **React Compiler** optimises the slow component (look for the "Memo ✨" badge in DevTools)
- Move state **down** into the component that needs it
- Lift content **up**: pass expensive subtrees as \`children\`
- Split contexts
- Manual \`memo\`/\`useMemo\` only where the compiler can't help and profiling proves it`),
      t('concurrent', 'Concurrent features', `\`useTransition\` marks an update as non-urgent so typing stays responsive while a heavy list re-renders. \`useDeferredValue\` lets part of the UI lag behind a fast-changing value.`),
      t('lists', 'Virtualization', `Rendering 10,000 rows creates 10,000 DOM nodes. Virtualization (TanStack Virtual) only renders the rows in view plus a small overscan.`),
      t('bundle', 'Bundle & network', `Code-split with \`lazy\` + \`Suspense\`, split by route, analyse the bundle, avoid heavy dependencies. Optimise images (sizes, modern formats, lazy loading) and fonts. Move CPU-heavy work to Web Workers.`),
    ],
    projects: [
      p('Data-heavy Dashboard', '10,000+ rows, charts and live data — then make it fast.', [
        'Build it naively first',
        'Profile and record baseline numbers',
        'Optimise step by step, recording before/after numbers',
        'Virtualize the table',
        'Keep typing smooth (INP < 200 ms) with 4× CPU throttling',
      ]),
    ],
    resources: [
      { label: 'React Compiler', url: 'https://react.dev/learn/react-compiler' },
      { label: 'web.dev — Core Web Vitals', url: 'https://web.dev/articles/vitals' },
      { label: 'developerway.com', url: 'https://www.developerway.com' },
    ],
  },
  {
    id: 9,
    slug: 'react-internals',
    title: 'React Internals',
    tagline: 'Know why, not just how.',
    phase: 'Mastery',
    weeks: 4,
    vizIds: ['fiber', 'hooks-list', 'keys'],
    checkpoint: 'You can explain, with a diagram, everything that happens between setState and the pixel changing on screen.',
    topics: [
      t('reconciliation', 'Reconciliation', `React diffs the new element tree against the previous one using two heuristics: elements of a **different type** produce a different subtree (unmount + mount), and **keys** identify children across renders. This makes diffing O(n) instead of O(n³).`),
      t('fiber', 'Fiber architecture', `Each element becomes a **fiber** — a unit of work with links to child, sibling and return (parent). The **render phase** walks fibers (beginWork going down, completeWork going up) and can be paused. The **commit phase** applies DOM changes synchronously and runs effects.`),
      t('lanes', 'Scheduling & lanes', `Updates get a priority **lane**: a click is urgent, a transition is not. React can interrupt low-priority rendering to handle urgent work, then resume or restart it.`),
      t('hook-storage', 'How hooks are stored', `A fiber's hooks are a **linked list** in call order. On re-render, React walks the list in the same order to find each hook's state. Calling a hook conditionally shifts every later hook — that's why the Rules of Hooks exist.`),
      t('suspense', 'Suspense', `When a component reads data that isn't ready (via \`use\` or a Suspense-enabled library), it **suspends**; React shows the nearest boundary's fallback and retries when the promise resolves.`),
      t('hydration', 'Hydration', `SSR sends HTML; **hydration** attaches React to it. If client output differs from the server HTML you get a mismatch. Streaming SSR and **selective hydration** let parts of the page become interactive independently.`),
      t('compiler', 'The React Compiler', `A build-time Babel plugin that analyses components and inserts fine-grained memoization. It relies on your code following the rules: pure render, no mutation of props/state.`),
    ],
    projects: [
      p('Build Your Own React', 'Follow pomb.us/build-your-own-react and extend it.', [
        'createElement and render',
        'Concurrent work loop with requestIdleCallback',
        'Fibers and reconciliation',
        'Function components and useState',
        'Add useEffect yourself',
        'Read ReactFiberHooks and ReactFiberWorkLoop in the React repo',
        'Write NOTES.md explaining reconciliation and keys in your own words',
      ]),
    ],
    resources: [
      { label: 'Build your own React', url: 'https://pomb.us/build-your-own-react/' },
      { label: 'React Fiber Architecture', url: 'https://github.com/acdlite/react-fiber-architecture' },
    ],
  },
  {
    id: 10,
    slug: 'server-components-nextjs',
    title: 'Server Components & Next.js',
    tagline: 'Full-stack React. Check current Next.js versions before starting.',
    phase: 'Expert',
    weeks: 5,
    vizIds: ['rendering-strategies', 'rsc-boundary'],
    checkpoint: 'For any piece of UI you can say whether it renders on the server or client, whether it is cached (\'use cache\') or dynamic, and which tag invalidates it.',
    topics: [
      t('strategies', 'Rendering strategies', `**CSR** renders in the browser. **SSR** renders HTML per request. **SSG** renders at build time. **Streaming** sends HTML in chunks as data resolves. **Partial Prerendering** serves a static shell instantly and streams dynamic holes.`),
      t('rsc', 'Server Components', `Server Components run only on the server: they can read databases directly and ship **zero JS**. Client Components (\`'use client'\`) are needed for state, effects and event handlers. Props crossing the boundary must be serializable. Pass Server Components *into* Client Components as \`children\`.`),
      t('actions', 'Server Functions', `\`'use server'\` functions can be called from the client — which means they are **public HTTP endpoints**. Validate input and check authorization in every one.`),
      t('app-router', 'Next.js App Router', `Layouts, \`loading\`/\`error\`/\`not-found\` files, route groups, parallel & intercepting routes, metadata, \`Image\` and \`Font\`, and \`proxy.ts\` (called \`middleware.ts\` before Next.js 16).`),
      t('cache-components', 'Caching with Cache Components', `In current Next.js everything is **dynamic by default**. Opt in with the \`'use cache'\` directive, set lifetime with \`cacheLife\`, tag entries with \`cacheTag\`, and invalidate with \`revalidateTag\`/\`updateTag\` after mutations. Wrap dynamic parts in \`<Suspense>\` so the static shell streams first. Older code uses the implicit four-cache model — recognise it, but learn the explicit one.`),
      t('data-layer', 'Data layer & auth', `Use an ORM (Prisma or Drizzle) with Postgres and an auth library (Auth.js or Better Auth). Alternatives to Next.js: React Router framework mode and TanStack Start.`),
    ],
    projects: [
      p('Full-stack Board', 'A Trello-like board or a blog CMS in Next.js.', [
        'Server Components for reads, Server Actions for mutations',
        'Authentication with roles',
        'Drag-and-drop (dnd-kit) with optimistic updates',
        'Streaming with Suspense boundaries',
        'SEO metadata and Open Graph images',
        'Deploy to Vercel',
      ]),
    ],
    resources: [
      { label: 'Next.js Learn', url: 'https://nextjs.org/learn' },
      { label: 'Next.js docs', url: 'https://nextjs.org/docs' },
    ],
  },
  {
    id: 11,
    slug: 'production',
    title: 'Production Engineering',
    tagline: 'Own a codebase other people can work in.',
    phase: 'Expert',
    weeks: 4,
    vizIds: ['xss'],
    checkpoint: 'A new developer can clone your repo, run one command and have everything working; every PR is automatically checked.',
    topics: [
      t('quality', 'Code quality', `ESLint flat config shared across the monorepo (react-hooks with compiler rules, jsx-a11y), Prettier or Biome, strict TypeScript, Husky + lint-staged.`),
      t('cicd', 'CI/CD', `Lint → typecheck → test → build on every PR, with **preview deployments** so reviewers can click through changes.`),
      t('errors', 'Errors & observability', `Error boundaries at route and widget level, reporting with Sentry, Real User Monitoring of Web Vitals, feature flags for safe rollouts.`),
      t('security', 'Security', `React escapes text by default; \`dangerouslySetInnerHTML\` bypasses that — sanitize with DOMPurify if you must use it. Add a Content Security Policy, never put secrets in client bundles, and audit dependencies (Renovate/Dependabot).`),
      t('i18n', 'Internationalization', `react-intl or i18next, ICU plural rules, \`Intl\` for dates/numbers, and right-to-left layout support.`),
      t('monorepo', 'Monorepos', `pnpm workspaces + Turborepo to share a UI package and configs between apps with cached builds.`),
      t('pwa', 'PWA & offline', `Service workers and caching strategies for offline-capable apps.`, true),
      t('mfe', 'Micro-frontends', `Module Federation lets teams deploy parts of a UI independently. Worth the complexity only for large orgs.`, true),
      t('rn', 'React Native', `The same React mental model on iOS/Android with Expo.`, true),
    ],
    projects: [
      p('Production Monorepo', 'Turn your Next.js app into a production-grade monorepo.', [
        'apps/web, apps/docs (Storybook), packages/ui, packages/config',
        'Sentry error reporting',
        'i18n: English plus a second language of your choice',
        'Content Security Policy header',
        'Renovate for dependency updates',
        'Full CI with preview deployments',
      ]),
    ],
    resources: [
      { label: 'Turborepo', url: 'https://turborepo.com' },
      { label: 'OWASP Cheat Sheets', url: 'https://cheatsheetseries.owasp.org' },
    ],
  },
  {
    id: 12,
    slug: 'expert-leadership',
    title: 'Expert & Leadership',
    tagline: 'Judgment, teaching and contributing back.',
    phase: 'Expert',
    weeks: 8,
    vizIds: [],
    checkpoint: 'You have shipped a package or OSS contribution, and you can lead a technical discussion about frontend architecture.',
    topics: [
      t('read-code', 'Read great code', `Study the source of TanStack Query, Zustand, Radix UI and React Hook Form. Ask "why did they design it this way?"`),
      t('oss', 'Open source', `Start with documentation fixes and "good first issue" labels in libraries you use.`),
      t('publish', 'Publish a package', `Ship a hook or component to npm with types, tests, docs, semantic versioning and a changelog (Changesets).`),
      t('teach', 'Teach', `Write posts, give meetup talks, mentor juniors. Explaining exposes gaps in your own understanding.`),
      t('review', 'Code review', `Review for correctness, accessibility, performance and maintainability — not just style. Be specific and kind.`),
      t('adr', 'Architecture decisions', `Record significant choices (state library, rendering strategy, styling) as ADRs: context, options, decision, consequences.`),
      t('current', 'Stay current', `Follow the React blog, RFCs, React Conf talks and This Week in React.`),
      t('interview', 'Interview depth', `Live-code an autocomplete, modal, infinite scroll and data table while explaining trade-offs out loud.`),
    ],
    projects: [
      p('Capstone', 'One substantial app combining everything (see the Capstone page).', [
        'Pick: collaborative board, SaaS dashboard, or learning platform',
        'Strict TypeScript, zero any',
        'Your own design system package',
        'WCAG 2.2 AA verified',
        'Unit + integration + E2E tests in CI',
        'Lighthouse ≥ 90 on mobile',
        'Error monitoring and ADRs',
        'Deployed publicly with a polished README',
      ]),
      p('Give Back', 'Contribute to the ecosystem.', [
        'Publish one npm package',
        'Land one open-source contribution',
        'Write one technical blog post',
        'Mentor one person through a project',
      ]),
    ],
    resources: [
      { label: 'React RFCs', url: 'https://github.com/reactjs/rfcs' },
      { label: 'This Week in React', url: 'https://thisweekinreact.com' },
    ],
  },
]

export const levelBySlug = (slug: string) => LEVELS.find(l => l.slug === slug)
