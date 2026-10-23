import type { Question } from './types'

type Q = Omit<Question, 'id' | 'level'>

const bank: Record<number, Q[]> = {
  0: [
    {
      prompt: 'In what order are the numbers logged?',
      code: `console.log(1)
setTimeout(() => console.log(2), 0)
Promise.resolve().then(() => console.log(3))
console.log(4)`,
      options: ['1 2 3 4', '1 4 3 2', '1 4 2 3', '1 3 4 2'],
      answer: 1,
      explanation: 'Synchronous code runs first (1, 4). Then all microtasks drain (the Promise callback → 3). Only then does the event loop take a macrotask (the timer → 2).',
    },
    {
      prompt: 'What does this log?',
      code: `for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i))
}`,
      options: ['0 1 2', '3 3 3', '2 2 2', 'undefined ×3'],
      answer: 1,
      explanation: '`var` is function-scoped, so all three closures share one `i`, which is 3 by the time the timers fire. With `let`, each iteration gets its own binding and you get 0 1 2.',
    },
    {
      prompt: 'Which array method mutates the original array?',
      options: ['map', 'toSorted', 'sort', 'filter'],
      answer: 2,
      explanation: '`sort` sorts in place and returns the same array. `toSorted` (ES2023) returns a sorted copy, which is what you want for React state.',
    },
    {
      prompt: 'What is the value of `[1, 2] === [1, 2]`?',
      options: ['true', 'false', 'TypeError', 'undefined'],
      answer: 1,
      explanation: 'Arrays are objects, compared by reference. Two separately created arrays are different objects, even with equal contents.',
    },
    {
      prompt: 'Which correctly sets `user.address.city` to "Bandung" without mutating `user`?',
      options: [
        '{ ...user, city: "Bandung" }',
        '{ ...user, address: { city: "Bandung" } }',
        '{ ...user, address: { ...user.address, city: "Bandung" } }',
        'Object.assign(user.address, { city: "Bandung" })',
      ],
      answer: 2,
      explanation: 'Copy each level you change. Option 2 drops the other address fields; option 4 mutates the existing address object.',
    },
    {
      prompt: 'What does `value ?? "default"` return when value is `0`?',
      options: ['"default"', '0', 'undefined', 'false'],
      answer: 1,
      explanation: '`??` only falls back on `null` or `undefined`. `||` would treat 0 as falsy and return "default".',
    },
  ],
  1: [
    {
      prompt: 'After one click, what does the counter show (starting at 0)?',
      code: `function handleClick() {
  setCount(count + 1)
  setCount(count + 1)
  setCount(count + 1)
}`,
      options: ['3', '1', '0', 'It throws'],
      answer: 1,
      explanation: '`count` is a snapshot: it is 0 for this whole render, so each call sets 0 + 1. Use `setCount(c => c + 1)` three times to get 3.',
    },
    {
      prompt: 'What renders when `items.length` is 0?',
      code: `{items.length && <List items={items} />}`,
      options: ['Nothing', 'The number 0', 'An empty List', 'false'],
      answer: 1,
      explanation: '`0 && x` evaluates to 0, and React renders numbers. Use `items.length > 0 &&` instead.',
    },
    {
      prompt: 'Why is the array index a risky key for a list that can be reordered?',
      options: [
        'Indexes are not strings',
        'React will warn and refuse to render',
        'State and DOM get attached to the wrong item after reordering',
        'It makes rendering slower in all cases',
      ],
      answer: 2,
      explanation: 'Keys tell React which item is which. With index keys, after inserting at the top, item "0" is now a different item but keeps the old item\'s state (e.g. an input\'s text).',
    },
    {
      prompt: 'Which is the idiomatic way to fully reset a `<ProfileForm>` when the selected user changes?',
      options: [
        'A useEffect that resets every state variable',
        '<ProfileForm key={userId} />',
        'Unmount and remount with a setTimeout',
        'Store the form state in a global variable',
      ],
      answer: 1,
      explanation: 'A different key makes React treat it as a different component instance, discarding its state.',
    },
    {
      prompt: 'Why does `StrictMode` render components twice in development?',
      options: [
        'To make the app faster',
        'To surface impure rendering logic and missing effect cleanups',
        'Because of a React bug',
        'To pre-warm the cache',
      ],
      answer: 1,
      explanation: 'A pure component gives the same result twice. If double rendering changes behaviour, the render has side effects.',
    },
    {
      prompt: 'This code adds a todo. What is wrong?',
      code: `todos.push(newTodo)
setTodos(todos)`,
      options: [
        'Nothing',
        'It mutates state and passes the same reference, so React may skip the re-render',
        'push is too slow',
        'setTodos must be awaited',
      ],
      answer: 1,
      explanation: 'React compares with Object.is. Same array reference → no change detected. Use `setTodos([...todos, newTodo])`.',
    },
  ],
  2: [
    {
      prompt: 'Which of these genuinely needs useEffect?',
      options: [
        'Computing fullName from firstName and lastName',
        'Subscribing to a WebSocket while the component is mounted',
        'Sending analytics when a user clicks "Buy"',
        'Resetting a form when the userId prop changes',
      ],
      answer: 1,
      explanation: 'Effects synchronize with external systems. Derived values are computed during render, click logic belongs in the handler, and resets use a key.',
    },
    {
      prompt: 'The interval logs 0 forever even though count increases. Why?',
      code: `useEffect(() => {
  const id = setInterval(() => console.log(count), 1000)
  return () => clearInterval(id)
}, [])`,
      options: [
        'setInterval is broken in React',
        'The callback closed over count from the first render (stale closure)',
        'count is not state',
        'Cleanup runs too early',
      ],
      answer: 1,
      explanation: 'With an empty dependency array the effect runs once, so the interval keeps the first render\'s closure. Add `count` to deps or read it via an updater/ref.',
    },
    {
      prompt: 'When does an effect\'s cleanup function run?',
      options: [
        'Only on unmount',
        'Before the effect re-runs and on unmount',
        'Before every render',
        'Never, unless called manually',
      ],
      answer: 1,
      explanation: 'React cleans up the previous effect before running the next one, and once more when the component unmounts.',
    },
    {
      prompt: 'What does changing `ref.current` do?',
      options: [
        'Triggers a re-render',
        'Nothing visible — it updates the value without re-rendering',
        'Resets component state',
        'Throws in StrictMode',
      ],
      answer: 1,
      explanation: 'Refs are mutable boxes that persist across renders but do not trigger them.',
    },
    {
      prompt: 'Two components call the same custom hook `useToggle()`. Do they share state?',
      options: ['Yes, always', 'No — each call has its own independent state', 'Only if wrapped in a Provider', 'Only in production'],
      answer: 1,
      explanation: 'Custom hooks share logic, not state. Each call is a separate set of hooks on that component.',
    },
    {
      prompt: 'Why must hooks not be called inside an `if`?',
      options: [
        'Performance',
        'React identifies hooks by call order; skipping one shifts all later hooks',
        'It is only a style rule',
        'Because if statements cannot contain functions',
      ],
      answer: 1,
      explanation: 'Hooks are stored in a list per component. If the order changes between renders, React hands each hook the wrong state.',
    },
  ],
  3: [
    {
      prompt: 'Why prefer a discriminated union over `isLoading`, `isError` and `data` fields?',
      options: [
        'Unions are faster at runtime',
        'It prevents impossible combinations such as loading AND error',
        'TypeScript requires it',
        'It uses less memory',
      ],
      answer: 1,
      explanation: 'Three independent fields allow invalid combinations. A union of `{status: ...}` variants allows only real states, and narrowing gives you typed data.',
    },
    {
      prompt: 'What is the correct type for a `children` prop that can be any renderable content?',
      options: ['JSX.Element', 'React.ReactNode', 'string', 'React.Component'],
      answer: 1,
      explanation: 'ReactNode covers elements, strings, numbers, fragments, arrays, null and undefined.',
    },
    {
      prompt: 'Why validate API responses with Zod even when you have TypeScript types?',
      options: [
        'TS types are erased at runtime, so the real data is unchecked',
        'Zod makes requests faster',
        'TypeScript cannot type JSON',
        'It is required by fetch',
      ],
      answer: 0,
      explanation: 'A type annotation is a promise you make to the compiler. Only runtime validation proves the server kept it.',
    },
    {
      prompt: 'How do you make `<Button>` accept every native button attribute?',
      options: [
        'type Props = any',
        "type Props = ComponentProps<'button'> & { variant?: 'primary' | 'ghost' }",
        'Copy every attribute manually',
        'type Props = HTMLElement',
      ],
      answer: 1,
      explanation: '`ComponentProps<\'button\'>` gives you all native props including onClick, disabled and aria-* attributes.',
    },
    {
      prompt: 'What is the main difference between `unknown` and `any`?',
      options: [
        'None',
        '`unknown` must be narrowed before use; `any` disables type checking',
        '`any` is safer',
        '`unknown` only works with strings',
      ],
      answer: 1,
      explanation: '`unknown` forces you to prove the type first, which is exactly what you want for external data.',
    },
  ],
  4: [
    {
      prompt: 'A user filters a product list, then refreshes. Where should the filter live so it survives?',
      options: ['useState', 'A ref', 'URL search params', 'A module-level variable'],
      answer: 2,
      explanation: 'The URL survives refreshes, is shareable, and makes the back button work.',
    },
    {
      prompt: 'In TanStack Query, what does `staleTime` control?',
      options: [
        'How long unused data stays in memory',
        'How long fetched data is considered fresh before a background refetch',
        'The request timeout',
        'How often to poll',
      ],
      answer: 1,
      explanation: 'Fresh data is served without refetching. `gcTime` controls how long unused data stays cached.',
    },
    {
      prompt: 'A user types "re" then "react" quickly; the "re" response arrives last. What prevents showing stale results?',
      options: [
        'Debouncing alone',
        'Ignoring or aborting outdated requests (AbortController / ignore flag)',
        'Using async/await',
        'Wrapping fetch in useMemo',
      ],
      answer: 1,
      explanation: 'Debouncing reduces requests but responses can still arrive out of order. Cancel or ignore anything that is not the latest.',
    },
    {
      prompt: 'Where should an auth session token be stored to resist XSS?',
      options: ['localStorage', 'sessionStorage', 'An httpOnly, Secure, SameSite cookie', 'A global JS variable'],
      answer: 2,
      explanation: 'httpOnly cookies cannot be read by JavaScript, so injected scripts cannot steal them.',
    },
    {
      prompt: 'Which attribute links an input to its error message for screen readers?',
      options: ['aria-label', 'aria-describedby', 'title', 'role="alert" on the input'],
      answer: 1,
      explanation: '`aria-describedby` points to the element that describes the input; pair it with `aria-invalid="true"`.',
    },
  ],
  5: [
    {
      prompt: 'Only a dropdown uses `isOpen`. Where should that state live?',
      options: ['Global store', 'Context at the app root', 'Inside the dropdown component', 'URL'],
      answer: 2,
      explanation: 'Keep state as close as possible to where it is used. Global state for local concerns causes needless re-renders and coupling.',
    },
    {
      prompt: 'A context holds `{ user, theme, cart }`. What happens when the cart changes?',
      options: [
        'Only cart consumers re-render',
        'Every component that reads this context re-renders',
        'Nothing re-renders',
        'Only the Provider re-renders',
      ],
      answer: 1,
      explanation: 'Context consumers re-render when the value changes, regardless of which field they use. Split unrelated data into separate contexts or use a store with selectors.',
    },
    {
      prompt: 'Why do Zustand selectors reduce re-renders?',
      options: [
        'They cache network requests',
        'A component only re-renders when the selected slice changes',
        'They skip React entirely',
        'They batch updates across tabs',
      ],
      answer: 1,
      explanation: '`useStore(s => s.count)` subscribes to just `count`; other store changes do not re-render the component.',
    },
    {
      prompt: 'In a feature-based structure, what should `components/ui/Button` never do?',
      options: ['Accept children', 'Import from features/cart', 'Use CSS', 'Have tests'],
      answer: 1,
      explanation: 'Shared code must not depend on features, or you get circular dependencies and tightly coupled modules.',
    },
    {
      prompt: 'Product data loaded from an API is best treated as…',
      options: ['Client state in Redux', 'Server state managed by a cache like TanStack Query', 'Context state', 'A ref'],
      answer: 1,
      explanation: 'Server data needs caching, refetching and invalidation — exactly what server-state libraries do.',
    },
  ],
  6: [
    {
      prompt: 'Which is the best base element for a clickable action?',
      options: ['<div onClick>', '<span role="button">', '<button>', '<a href="#">'],
      answer: 2,
      explanation: 'A native button is focusable and keyboard-operable (Enter/Space) with the right role for free.',
    },
    {
      prompt: 'What must a modal dialog do with keyboard focus?',
      options: [
        'Nothing special',
        'Move focus inside, trap it while open, and restore it to the trigger on close',
        'Blur the page',
        'Focus the close button only on mouse click',
      ],
      answer: 1,
      explanation: 'Without a focus trap, keyboard users tab into the page behind the modal; without restore, they lose their place.',
    },
    {
      prompt: 'What is a compound component?',
      options: [
        'A component with many props',
        'A set of components that share implicit state, e.g. <Tabs>, <Tabs.List>, <Tabs.Panel>',
        'A class component',
        'Two components in one file',
      ],
      answer: 1,
      explanation: 'The parent shares state via context, so consumers compose the parts freely instead of passing config props.',
    },
    {
      prompt: 'Why did runtime CSS-in-JS lose favour?',
      options: [
        'It cannot use variables',
        'Runtime style injection costs render time and does not fit Server Components',
        'Browsers dropped support',
        'It is not type-safe',
      ],
      answer: 1,
      explanation: 'Zero-runtime solutions (CSS Modules, Tailwind, vanilla-extract) generate CSS at build time instead.',
    },
    {
      prompt: 'Which media query should animations respect?',
      options: ['prefers-color-scheme', 'prefers-reduced-motion', 'hover: none', 'orientation'],
      answer: 1,
      explanation: 'Some users experience nausea from motion; honour their OS preference.',
    },
  ],
  7: [
    {
      prompt: 'Which query best matches how users find a Save button?',
      options: [
        "getByTestId('save-btn')",
        "container.querySelector('.btn-save')",
        "getByRole('button', { name: /save/i })",
        "getByText('Save').parentElement",
      ],
      answer: 2,
      explanation: 'Role + accessible name mirrors how users and assistive tech perceive the UI, and it also tests accessibility.',
    },
    {
      prompt: 'Why mock the network with MSW instead of mocking your useProducts hook?',
      options: [
        'MSW is faster',
        'Your real hook, parsing and error handling get exercised; tests stay valid after refactors',
        'Hooks cannot be mocked',
        'MSW is required by Vitest',
      ],
      answer: 1,
      explanation: 'Mocking at the HTTP boundary keeps more real code under test.',
    },
    {
      prompt: 'A refactor keeps behaviour identical but breaks 20 tests. What does that suggest?',
      options: [
        'The refactor is wrong',
        'The tests were coupled to implementation details',
        'You need more snapshot tests',
        'Testing Library is buggy',
      ],
      answer: 1,
      explanation: 'Good tests fail when behaviour breaks, not when internals change.',
    },
    {
      prompt: 'Which kind of test should be the largest group, according to the testing trophy?',
      options: ['Unit', 'Integration', 'End-to-end', 'Snapshot'],
      answer: 1,
      explanation: 'Integration tests give the best balance of confidence, speed and maintenance cost.',
    },
    {
      prompt: 'Which query waits for an element that appears after an async fetch?',
      options: ['getByText', 'queryByText', 'findByText', 'getAllByText'],
      answer: 2,
      explanation: '`findBy*` returns a promise and retries until the element appears or it times out.',
    },
  ],
  8: [
    {
      prompt: 'A parent re-renders. By default, what happens to its children?',
      options: ['Nothing', 'They re-render too', 'Only children with changed props re-render', 'They unmount'],
      answer: 1,
      explanation: 'Without memoization (manual or via the compiler), children re-render with their parent. That is usually fine — only slow re-renders matter.',
    },
    {
      prompt: 'Why does passing `<ExpensiveTree />` as `children` avoid its re-render when the wrapper\'s state changes?',
      options: [
        'children are always memoized by React',
        'The element was created by the parent, so its reference is unchanged when only the wrapper re-renders',
        'children never re-render',
        'It disables state',
      ],
      answer: 1,
      explanation: 'The wrapper re-renders but receives the same children element object, so React skips that subtree.',
    },
    {
      prompt: 'What does `useTransition` do?',
      options: [
        'Animates elements',
        'Marks a state update as non-urgent so urgent updates (typing) stay responsive',
        'Debounces input',
        'Moves work to a Web Worker',
      ],
      answer: 1,
      explanation: 'React can interrupt the transition render to handle more urgent input.',
    },
    {
      prompt: 'Which Core Web Vital measures responsiveness to user input?',
      options: ['LCP', 'CLS', 'INP', 'TTFB'],
      answer: 2,
      explanation: 'Interaction to Next Paint measures the delay from user input to the next visual update.',
    },
    {
      prompt: 'You must render 50,000 rows. What is the most effective fix?',
      options: ['memo on every row', 'Virtualization', 'useCallback on handlers', 'Smaller CSS'],
      answer: 1,
      explanation: 'Virtualization renders only visible rows, cutting DOM nodes from 50,000 to a few dozen.',
    },
    {
      prompt: 'With the React Compiler enabled, when should you still write useMemo by hand?',
      options: [
        'Always, everywhere',
        'Never under any circumstances',
        'Only where the compiler skips a component or a stable reference is needed, backed by profiling',
        'Only in class components',
      ],
      answer: 2,
      explanation: 'The compiler handles most memoization. Manual memoization is the exception, not the habit.',
    },
  ],
  9: [
    {
      prompt: 'During reconciliation, `<div>` is replaced by `<section>` at the same position. What happens?',
      options: [
        'React updates the tag name in place',
        'The old subtree is unmounted (state lost) and a new one mounted',
        'Nothing changes',
        'React throws a warning',
      ],
      answer: 1,
      explanation: 'Different element types are assumed to produce different trees, so React rebuilds instead of diffing deeper.',
    },
    {
      prompt: 'Which phase can React pause and resume?',
      options: ['Commit phase', 'Render phase', 'Both', 'Neither'],
      answer: 1,
      explanation: 'The render phase is pure computation on fibers and can be interrupted. The commit phase mutates the DOM and runs synchronously.',
    },
    {
      prompt: 'How does React know which state belongs to which useState call?',
      options: ['By variable name', 'By call order in a linked list on the fiber', 'By a hidden key prop', 'By source line number'],
      answer: 1,
      explanation: 'Hooks are a linked list walked in order each render — hence the Rules of Hooks.',
    },
    {
      prompt: 'In what order does the fiber work loop visit nodes?',
      options: [
        'Breadth-first',
        'Depth-first: beginWork down to the child, then completeWork up / across siblings',
        'Random',
        'Leaves first only',
      ],
      answer: 1,
      explanation: 'React goes child → child until a leaf, completes it, moves to its sibling, and completes parents on the way back up.',
    },
    {
      prompt: 'What causes a hydration mismatch?',
      options: [
        'Using CSS modules',
        'Client render output differs from server HTML (e.g. Date.now() or window checks during render)',
        'Using too many components',
        'Fetching data in a Server Component',
      ],
      answer: 1,
      explanation: 'Hydration expects identical output. Non-deterministic render values must be moved to effects or rendered consistently.',
    },
  ],
  10: [
    {
      prompt: 'Which can a Server Component do that a Client Component cannot?',
      options: ['Use useState', 'Handle onClick', 'Query a database directly without shipping that code to the browser', 'Use useEffect'],
      answer: 2,
      explanation: 'Server Components run only on the server and add zero JS to the bundle; they cannot have state, effects or handlers.',
    },
    {
      prompt: 'Which prop cannot be passed from a Server Component to a Client Component?',
      options: ['A string', 'A plain object', 'A function defined in the Server Component (not a Server Function)', 'A JSX element'],
      answer: 2,
      explanation: 'Props crossing the boundary must be serializable. Ordinary functions are not; Server Functions are a special exception.',
    },
    {
      prompt: 'Why must every Server Function validate input and check authorization?',
      options: [
        'For performance',
        'It is effectively a public HTTP endpoint anyone can call',
        'TypeScript requires it',
        'Next.js will not compile otherwise',
      ],
      answer: 1,
      explanation: 'Anyone can send a request to it with arbitrary arguments, not just your form.',
    },
    {
      prompt: 'In Next.js with Cache Components, what is the default for a page reading data?',
      options: [
        'Cached forever',
        'Dynamic — you opt in to caching with "use cache"',
        'Static at build time',
        'Revalidated every 60 seconds',
      ],
      answer: 1,
      explanation: 'Caching is explicit: mark functions/components with "use cache" and control them with cacheLife and cacheTag. Since Next.js 16.4, Cache Components is on by default in new create-next-app projects.',
    },
    {
      prompt: 'After a mutation, how do you refresh cached data tagged "posts"?',
      options: ['Restart the server', 'Call revalidateTag/updateTag("posts")', 'Use window.location.reload()', 'Set staleTime to 0'],
      answer: 1,
      explanation: 'Tag-based invalidation updates every cache entry associated with that tag.',
    },
    {
      prompt: 'What was `middleware.ts` renamed to in Next.js 16?',
      options: ['edge.ts', 'proxy.ts', 'server.ts', 'handler.ts'],
      answer: 1,
      explanation: 'It is now `proxy.ts` (Node.js runtime by default since 16.4); `middleware.ts` is deprecated but you will still see it in older tutorials and projects.',
    },
  ],
  11: [
    {
      prompt: 'Why is `dangerouslySetInnerHTML` dangerous?',
      options: [
        'It is slow',
        'It bypasses React\'s escaping, so unsanitized input can run scripts (XSS)',
        'It breaks hydration always',
        'It is deprecated',
      ],
      answer: 1,
      explanation: 'React escapes text by default. Raw HTML must be sanitized (e.g. with DOMPurify) before injecting.',
    },
    {
      prompt: 'An environment variable is used in client code. What can see it?',
      options: ['Only the server', 'Anyone who downloads the JS bundle', 'Only logged-in users', 'Nobody'],
      answer: 1,
      explanation: 'Client-exposed variables are inlined into the bundle. Never put secrets there.',
    },
    {
      prompt: 'What does an error boundary catch?',
      options: [
        'All errors including event handlers',
        'Errors thrown while rendering its child tree',
        'Network errors only',
        'Syntax errors',
      ],
      answer: 1,
      explanation: 'Errors in event handlers and async code must be caught with try/catch; boundaries handle render errors.',
    },
    {
      prompt: 'What is the main benefit of preview deployments per pull request?',
      options: ['Cheaper hosting', 'Reviewers can test the real change in a browser before merging', 'Faster builds', 'Better SEO'],
      answer: 1,
      explanation: 'Reviewing behaviour, not just code, catches UI and integration bugs early.',
    },
    {
      prompt: 'When are micro-frontends usually worth their complexity?',
      options: ['Every project', 'Small solo apps', 'Large organisations where independent teams must deploy independently', 'Never'],
      answer: 2,
      explanation: 'They solve an organisational scaling problem at significant technical cost.',
    },
  ],
  12: [
    {
      prompt: 'What does an ADR record?',
      options: ['API response times', 'The context, options, decision and consequences of an architecture choice', 'Every commit', 'Accessibility defects'],
      answer: 1,
      explanation: 'Architecture Decision Records preserve *why* a choice was made, so future teams can revisit it sensibly.',
    },
    {
      prompt: 'What is the best focus for a code review?',
      options: [
        'Only formatting',
        'Correctness, accessibility, performance and maintainability — with specific, kind feedback',
        'Rewriting it your way',
        'Approving quickly',
      ],
      answer: 1,
      explanation: 'Linters handle style. Humans should focus on what tools cannot judge.',
    },
    {
      prompt: 'A library releases a breaking change. Which semver part changes?',
      options: ['Patch', 'Minor', 'Major', 'None'],
      answer: 2,
      explanation: 'MAJOR.MINOR.PATCH — breaking changes bump MAJOR.',
    },
    {
      prompt: 'What is a good first open-source contribution?',
      options: ['Rewriting the core', 'A docs fix or a "good first issue"', 'A huge new feature without discussion', 'Changing the license'],
      answer: 1,
      explanation: 'Small, well-scoped contributions teach the project\'s process and build trust.',
    },
  ],
}

export const QUESTIONS: Question[] = Object.entries(bank).flatMap(([level, qs]) =>
  qs.map((q, i) => ({ ...q, level: Number(level), id: `L${level}-Q${i + 1}` })),
)

export const questionsForLevel = (level: number) => QUESTIONS.filter(q => q.level === level)
export const questionById = (id: string) => QUESTIONS.find(q => q.id === id)
