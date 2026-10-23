import type { TopicDetail } from '../types'

const details: Record<string, TopicDetail> = {
  trophy: {
    explanation: `A test suite is an investment portfolio. Each kind of test costs something (writing time, run time, maintenance, flakiness) and returns something (confidence that users can do what they came to do). The **testing trophy** is a heuristic for allocating that investment in front-end apps.

### The four layers
1. **Static analysis** (the base): TypeScript and ESLint catch typos, wrong prop types, missing hook dependencies and unreachable code on every keystroke. Almost free, so maximise it: \`strict: true\`, \`eslint-plugin-react-hooks\`, \`jsx-a11y\`.
2. **Unit tests**: pure functions and small modules in isolation: price calculations, reducers, date formatting, validation schemas. Fast and precise, but they only prove pieces work alone.
3. **Integration tests** (the widest part): render a meaningful chunk of UI (a page or feature) with its real children, real state management and real routing, with only the network mocked. Interact as a user would and assert on what is visible. These catch the bugs that actually happen: wiring mistakes, wrong props passed between components, state not updating the right place.
4. **End-to-end tests** (the top): a real browser against a running app, ideally with a real backend in a test environment. Highest confidence per test, but slowest and most prone to flakiness, so keep them for critical journeys.

### Why integration in the middle
The more your tests resemble how the software is used, the more confidence they give. A unit test of a \`useCart\` hook can pass while the "Add to cart" button is wired to the wrong product. An integration test that clicks the button and checks the cart badge cannot. Integration tests are also **refactor-resistant**: you can split components, change state libraries or rename internals without touching the test, because the test only knows about roles, labels and text.

### Compared with the pyramid
The classic test pyramid (many unit, fewer integration, few UI tests) came from back-end systems where UI tests were slow and brittle. With jsdom/happy-dom and Testing Library, rendering a component tree is fast enough that integration tests can be the bulk of a front-end suite. The trophy is not a law; a library of pure algorithms should be unit-heavy.

### Confidence per minute
When deciding what to write, ask:
- What would hurt users or the business if it broke?
- What is the cheapest test that would catch that break?
- Will this test fail only when behaviour breaks, or also when I refactor?

Track a few signals: flaky-test rate, suite duration, and escaped bugs by category. If bugs escape in wiring, add integration tests; if they escape across services, add an E2E or contract test.`,
    examples: [
      {
        title: 'One feature, tested at each layer',
        code: `// Static: the type system rejects invalid quantities at compile time
type CartLine = { sku: string; qty: number; unitPrice: number }

// Unit: pure logic, many edge cases cheaply
test('applies 10% discount over 100', () => {
  expect(cartTotal([{ sku: 'a', qty: 2, unitPrice: 60 }])).toBe(108)
})

// Integration: real components, network mocked with MSW
test('adding a product updates the cart badge', async () => {
  const user = userEvent.setup()
  render(<App />, { wrapper: TestProviders })
  await user.click(await screen.findByRole('button', { name: /add blue t-shirt to cart/i }))
  expect(screen.getByRole('link', { name: /cart, 1 item/i })).toBeInTheDocument()
})

// E2E (Playwright): the money path in a real browser
test('guest can check out', async ({ page }) => {
  await page.goto('/products/blue-t-shirt')
  await page.getByRole('button', { name: 'Add to cart' }).click()
  await page.getByRole('link', { name: /cart/i }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  // ...fill test address, use payment provider test card...
  await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible()
})`,
        note: 'Each layer covers what it is best at: types prevent impossible states, units cover arithmetic edge cases, integration covers wiring, E2E covers the whole system for the one flow that earns money.',
      },
    ],
    realCase: {
      title: '1,200 unit tests, and checkout still broke',
      story: `**Situation:** A marketplace front end had high unit coverage: every hook and component tested in isolation with mocked children and mocked hooks.

**Symptom:** A release broke checkout for users with saved addresses. All 1,200 tests were green.

**Root cause:** \`AddressPicker\` had been refactored to call \`onChange(address.id)\` instead of \`onChange(address)\`. Its own unit test was updated; the parent's test mocked \`AddressPicker\` entirely, so nothing checked that they still agreed.

**Fix:** The team replaced mock-heavy component tests with integration tests per page using real children and MSW for the API, and added one Playwright test for checkout with a saved address. Test count dropped by a third; escaped bugs dropped too.

**Lesson:** Mocking your own components tests the mocks. Integration tests catch contract breaks between components.`,
    },
    pitfalls: [
      'Chasing a coverage percentage: 100% line coverage with shallow, mocked tests can still miss broken wiring.',
      'Mocking your own child components or hooks in component tests, which hides integration bugs.',
      'Putting every scenario in E2E tests, producing a slow and flaky suite people learn to ignore.',
      'Skipping the static layer (loose tsconfig, no hooks lint rule), the cheapest bug catcher available.',
    ],
    exercise: {
      task: 'Take a feature you built (for example "search products and add to cart") and write a test plan: list which behaviours you would cover with static checks, unit tests, integration tests and E2E tests, and why.',
      hint: 'Start from failures that would hurt users. For each, choose the cheapest layer that would actually catch it.',
      solution: `Example plan:

- **Static**: \`strict\` TypeScript for API response types (generated from OpenAPI), \`react-hooks/exhaustive-deps\`, \`jsx-a11y\` rules.
- **Unit**: \`parseSearchParams\` (empty, invalid page number, encoded characters), \`cartReducer\` (add same SKU twice merges quantity, remove last item), \`formatPrice\` per locale.
- **Integration (RTL + MSW)**: typing a query shows matching results; empty results show the empty state; a 500 shows the retry message and retry works; filter + add to cart updates the badge; URL updates with the query.
- **E2E (Playwright)**: search → product → add → checkout with a test card; one accessibility scan on the search results page.

Reasoning: wiring and user-visible states live in integration; combinatorial logic lives in units; only the cross-system journey justifies E2E.`,
    },
    interview: [
      'Why does the testing trophy put integration tests at its widest point, and when would you deviate from that?',
      'What makes a test resistant to refactoring?',
      'How would you decide whether a bug should be covered by a unit, integration or E2E test?',
    ],
  },

  vitest: {
    explanation: `Vitest is a test runner built on Vite. It reuses your Vite config (aliases, plugins, TypeScript and JSX transforms), so tests run through the same pipeline as your app with no separate Babel or ts-jest setup. Its API is Jest-compatible (\`describe\`, \`it\`, \`expect\`, \`vi.fn\`, \`vi.mock\`), so most knowledge transfers directly.

### How it runs
- Test files are transformed on demand by Vite and executed in worker threads or child processes, in parallel across files. Tests inside a file run sequentially by default.
- **Watch mode** uses Vite's module graph: when you save a file, only tests that import it (directly or transitively) re-run. This is why the feedback loop feels instant.
- **Environment**: \`node\` by default. For components, set \`environment: 'jsdom'\` or \`'happy-dom'\` to provide a simulated DOM. For high-fidelity needs, **browser mode** runs tests in a real browser via Playwright.

### Setup for React
Configure in \`vite.config.ts\` (or \`vitest.config.ts\`) with a \`test\` block: environment, a \`setupFiles\` entry that imports \`@testing-library/jest-dom/vitest\` (adds matchers like \`toBeInTheDocument\`), starts the MSW server, and calls \`cleanup\` if globals are off.

### What to unit test with Vitest
Pure logic is where unit tests shine: reducers, selectors, formatters, validation schemas, URL parsing, permission checks. Use \`it.each\` / \`test.each\` tables to cover many edge cases compactly.

### Mocks, spies and fakes
- \`vi.fn()\` creates a spy; \`vi.spyOn(obj, 'method')\` wraps an existing one.
- \`vi.mock('./module')\` replaces a module; it is **hoisted** above imports. Use \`vi.hoisted\` for values the factory needs.
- \`vi.useFakeTimers()\` with \`vi.advanceTimersByTime\` for debounce and polling logic; \`vi.setSystemTime\` for date-dependent code.
- Restore between tests: \`restoreMocks: true\` in config, or \`vi.restoreAllMocks()\` in \`afterEach\`.

Prefer mocking at system boundaries (network with MSW, time, randomness) rather than your own modules.

### Other useful features
- **In-source testing**, **snapshot** support (use sparingly), \`expect.soft\`, \`expect.poll\`.
- **Coverage** via V8 (\`--coverage\`), with thresholds in config.
- **Type testing** with \`expectTypeOf\` for library authors.
- **Projects** (workspaces) to run node and browser environments in one command.

### Vitest 5 changes to know
- Requires Node 22.12+ and Vite 6.4+.
- **Mocks are cleared before each test by default**, so call history never leaks between tests (set return values inside each test or \`beforeEach\`).
- **Un-awaited async assertions now fail** (e.g. a forgotten \`await expect(p).resolves...\`), and \`expect.poll\` fails at its timeout.
- Config files are no longer searched in parent folders.

### Common performance tips
Avoid huge barrel imports in tests, keep \`setupFiles\` light, and prefer \`happy-dom\` if your tests do not rely on jsdom-specific behaviour. Use \`--reporter=verbose\` or \`--ui\` to see what is slow.`,
    examples: [
      {
        title: '✅ Table-driven unit tests for a pure reducer',
        code: `import { describe, expect, it } from 'vitest'
import { cartReducer, type CartState } from './cart'

const empty: CartState = { lines: [] }

describe('cartReducer', () => {
  it('adds a new line', () => {
    const s = cartReducer(empty, { type: 'add', sku: 'tee-blue', unitPrice: 20 })
    expect(s.lines).toEqual([{ sku: 'tee-blue', qty: 1, unitPrice: 20 }])
  })

  it('merges quantity when adding the same sku', () => {
    const s1 = cartReducer(empty, { type: 'add', sku: 'tee-blue', unitPrice: 20 })
    const s2 = cartReducer(s1, { type: 'add', sku: 'tee-blue', unitPrice: 20 })
    expect(s2.lines[0].qty).toBe(2)
  })

  it.each([
    [0, []],
    [-1, []],
    [3, [{ sku: 'tee-blue', qty: 3, unitPrice: 20 }]],
  ])('setQty(%i) gives %j', (qty, expected) => {
    const start: CartState = { lines: [{ sku: 'tee-blue', qty: 1, unitPrice: 20 }] }
    expect(cartReducer(start, { type: 'setQty', sku: 'tee-blue', qty }).lines).toEqual(expected)
  })

  it('does not mutate the previous state', () => {
    const frozen = Object.freeze({ lines: Object.freeze([]) }) as unknown as CartState
    expect(() => cartReducer(frozen, { type: 'add', sku: 'x', unitPrice: 1 })).not.toThrow()
  })
})`,
        note: 'Edge cases (zero, negative) are cheap to enumerate with it.each. Freezing input catches accidental mutation, which would break React state updates.',
      },
      {
        title: '✅ Fake timers for a debounce helper',
        code: `import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { debounce } from './debounce'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test('calls once after the quiet period with the last args', () => {
  const fn = vi.fn()
  const d = debounce(fn, 300)
  d('r'); d('re'); d('rea')
  vi.advanceTimersByTime(299)
  expect(fn).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1)
  expect(fn).toHaveBeenCalledExactlyOnceWith('rea')
})`,
        note: 'No real waiting, fully deterministic. Always restore real timers so other tests are unaffected.',
      },
      {
        title: 'Config for React component tests',
        code: `// vite.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    coverage: { provider: 'v8', thresholds: { lines: 80 } },
  },
})

// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './server'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => { cleanup(); server.resetHandlers() })
afterAll(() => server.close())`,
        note: 'onUnhandledFrame "error" (called onUnhandledRequest before MSW 3) makes any un-mocked network call fail loudly instead of silently hanging.',
      },
    ],
    realCase: {
      title: 'Tests passing locally, failing in CI near midnight',
      story: `**Situation:** A booking app had tests for "available dates" logic.

**Symptom:** CI failed a few times a month, always between 23:00 and 01:00 UTC; re-running made it pass.

**Root cause:** The code used \`new Date()\` directly, and the test expected "tomorrow" relative to the machine's local date. When the CI runner's UTC date differed from the test fixture's assumed timezone, the expected day was off by one.

**Fix:** The test pinned time with \`vi.setSystemTime(new Date('2025-03-10T12:00:00Z'))\` and set \`TZ=UTC\` in the test script. The production code was refactored to accept a \`now\` parameter for easier testing.

**Lesson:** Time, randomness and network are non-deterministic inputs. Control them explicitly in tests.`,
    },
    pitfalls: [
      'Forgetting that vi.mock is hoisted, then referencing variables declared later in the file inside the factory.',
      'Leaving fake timers or mocks active between tests, causing order-dependent failures.',
      'Running component tests in the default node environment and getting "document is not defined".',
      'Mocking your own modules everywhere instead of testing real behaviour with boundary mocks.',
    ],
    exercise: {
      task: 'Write a `validatePassword(pw)` function returning a list of failed rules (min 12 chars, a digit, an uppercase letter, not containing "password"). Cover it with a table-driven Vitest suite.',
      hint: 'Return rule ids, not messages, so tests stay stable when copy changes.',
      solution: `\`\`\`ts
export type Rule = 'length' | 'digit' | 'upper' | 'common'
export function validatePassword(pw: string): Rule[] {
  const failed: Rule[] = []
  if (pw.length < 12) failed.push('length')
  if (!/\\d/.test(pw)) failed.push('digit')
  if (!/[A-Z]/.test(pw)) failed.push('upper')
  if (pw.toLowerCase().includes('password')) failed.push('common')
  return failed
}

test.each<[string, Rule[]]>([
  ['short', ['length', 'digit', 'upper']],
  ['Longenoughbutnodigit', ['digit']],
  ['MyPassword12345', ['common']],
  ['Correct-Horse-9-Battery', []],
])('validatePassword(%s)', (pw, expected) => {
  expect(validatePassword(pw)).toEqual(expected)
})
\`\`\``,
    },
    interview: [
      'What advantages does Vitest have over Jest in a Vite project?',
      'How does vi.mock hoisting work, and what problems can it cause?',
      'How would you test code that depends on the current date or on setTimeout?',
    ],
  },

  rtl: {
    explanation: `React Testing Library (RTL) renders components into a DOM and gives you queries that find elements **the way users and assistive technology do**. Its guiding idea: the more your tests resemble the way your software is used, the more confidence they give. A user does not know about your state variables or component names; they see a button labelled "Save" and a heading "Order confirmed".

### Query priority
1. \`getByRole\` with a \`name\`: \`getByRole('button', { name: /save/i })\`. Uses the accessibility tree, so it also verifies your markup is accessible.
2. \`getByLabelText\` for form fields.
3. \`getByPlaceholderText\`, \`getByText\`, \`getByDisplayValue\`.
4. \`getByAltText\`, \`getByTitle\`.
5. \`getByTestId\` as a last resort when nothing user-visible identifies the element.

### Query variants
- \`getBy*\`: element must exist now; throws otherwise. Use for things already rendered.
- \`queryBy*\`: returns \`null\` if missing. Use only to assert **absence**.
- \`findBy*\`: returns a promise that retries until the element appears (default 1 s). Use for anything async: data loading, transitions, lazy components.
- \`*AllBy*\` versions return arrays.
Use \`within(container)\` to scope queries to a region, e.g. a specific table row or dialog.

### user-event over fireEvent
\`fireEvent.click\` dispatches a single synthetic event. Real users produce a sequence: pointerdown, mousedown, focus, pointerup, mouseup, click; typing produces keydown, keypress, input, keyup per character. \`@testing-library/user-event\` simulates those full sequences and respects things like disabled elements and \`pointer-events: none\`. Always create it once per test with \`const user = userEvent.setup()\` and \`await\` each interaction.

### Async and act
RTL wraps render and user-event in \`act\` for you. Warnings about updates "not wrapped in act" usually mean the test ended before some async work finished: await a \`findBy\` for the final UI state. Use \`waitFor\` only for assertions that are not about an element appearing, and keep a single assertion inside it; never put side effects inside \`waitFor\`.

### Providers
Components often need a router, a query client or a theme. Write a custom \`render\` that wraps them, and create a **fresh QueryClient per test** with retries disabled so tests do not share a cache.

### What to assert
Assert on outcomes the user can observe: text appears, a button becomes disabled, a dialog closes and focus returns, the URL changes. Use jest-dom matchers: \`toBeVisible\`, \`toBeDisabled\`, \`toHaveAccessibleName\`, \`toHaveFocus\`, \`toHaveValue\`. Avoid asserting on class names, component state, props passed to children, or call counts of internal functions.`,
    examples: [
      {
        title: '❌ Implementation-detail test vs ✅ behaviour test',
        code: `// ❌ Breaks if you rename state, switch to useReducer, or change markup
const { container } = render(<LoginForm onSubmit={onSubmit} />)
fireEvent.change(container.querySelector('#email')!, { target: { value: 'a@b.co' } })
fireEvent.click(container.querySelector('.btn-primary')!)
expect(onSubmit).toHaveBeenCalled()

// ✅ Only knows what a user knows
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

test('submits trimmed credentials and disables the button while pending', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn(() => new Promise<void>(r => setTimeout(r, 50)))
  render(<LoginForm onSubmit={onSubmit} />)

  await user.type(screen.getByLabelText(/email/i), '  ada@example.com ')
  await user.type(screen.getByLabelText(/password/i), 'correct-horse')
  await user.click(screen.getByRole('button', { name: /sign in/i }))

  expect(onSubmit).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'correct-horse' })
  expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
  expect(await screen.findByRole('button', { name: /sign in/i })).toBeEnabled()
})`,
        note: 'The onSubmit callback is a public prop, so asserting on it is fine. Querying by label fails if the input loses its label, so the test also guards accessibility.',
      },
      {
        title: '✅ Custom render with fresh providers',
        code: `import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { render, type RenderOptions } from '@testing-library/react'

export function renderWithProviders(
  ui: React.ReactElement,
  { route = '/', ...options }: { route?: string } & RenderOptions = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    ),
    ...options,
  })
}`,
        note: 'A new QueryClient per test prevents cache leaking between tests; retry: false makes error states appear immediately instead of after three retries.',
      },
      {
        title: '✅ Scoping with within and asserting absence',
        code: `const row = screen.getByRole('row', { name: /blue t-shirt/i })
await user.click(within(row).getByRole('button', { name: /remove/i }))
expect(screen.queryByRole('row', { name: /blue t-shirt/i })).not.toBeInTheDocument()
expect(screen.getByRole('status')).toHaveTextContent(/removed/i)`,
        note: 'within targets the button in the right row; queryBy is used only for the absence check.',
      },
    ],
    realCase: {
      title: 'A test suite that blocked every refactor',
      story: `**Situation:** A team migrated a settings page from class components and Enzyme-style tests to function components.

**Symptom:** Converting one component broke 40 tests even though the page behaved identically in the browser. Developers started deleting tests to get PRs merged.

**Root cause:** Tests asserted on internal state (\`wrapper.state('isOpen')\`), called instance methods, and selected elements by CSS class.

**Fix:** Tests were rewritten with RTL, querying by role and label and interacting with user-event. The rewrite also surfaced three real accessibility bugs: two inputs without labels and an icon button without a name, because \`getByRole\` could not find them.

**Lesson:** Tests coupled to implementation punish refactoring and miss real bugs. Role-based queries double as an accessibility check.`,
    },
    pitfalls: [
      'Using getBy for async content and getting "unable to find element"; use findBy.',
      'Wrapping user-event calls in act or waitFor manually; they are already wrapped and awaited.',
      'Using fireEvent where user-event would reveal a bug (e.g. clicking a disabled button still fires with fireEvent).',
      'Putting multiple assertions or side effects inside waitFor, which makes it slow and confusing when it fails.',
      'Reaching for getByTestId first, losing the accessibility signal role queries provide.',
    ],
    exercise: {
      task: 'Test the Tabs component from level 6: clicking a tab shows its panel, ArrowRight moves focus and selection to the next tab, and only the selected tab is in the Tab order.',
      hint: 'Use getByRole("tab", { name }), toHaveAttribute("aria-selected", "true"), toHaveFocus, and user.tab().',
      solution: `\`\`\`tsx
test('tabs follow the APG keyboard pattern', async () => {
  const user = userEvent.setup()
  render(
    <Tabs defaultValue="profile">
      <Tabs.List label="Settings">
        <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
        <Tabs.Trigger value="billing">Billing</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Panel value="profile">Profile form</Tabs.Panel>
      <Tabs.Panel value="billing">Billing details</Tabs.Panel>
    </Tabs>,
  )
  await user.tab()
  expect(screen.getByRole('tab', { name: 'Profile' })).toHaveFocus()

  await user.keyboard('{ArrowRight}')
  const billing = screen.getByRole('tab', { name: 'Billing' })
  expect(billing).toHaveFocus()
  expect(billing).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tabpanel')).toHaveTextContent('Billing details')

  await user.tab()
  expect(screen.getByRole('tabpanel')).toHaveFocus() // next Tab stop is the panel, not the other tab
})
\`\`\``,
    },
    interview: [
      'Explain the difference between getBy, queryBy and findBy, and when you use each.',
      'Why is user-event preferred over fireEvent?',
      'What causes "not wrapped in act(...)" warnings and how do you fix them properly?',
    ],
  },

  msw: {
    explanation: `Mock Service Worker (MSW) intercepts network requests and answers them with handlers you define. Instead of mocking \`fetch\`, \`axios\` or your data hooks, you mock **the API itself**. Your component, your data library (TanStack Query, SWR, RTK Query) and your fetch wrapper all run for real; only the server is fake.

### How it works
- **In the browser** (Storybook, local development), MSW registers a Service Worker that sees every outgoing request and asks your handlers whether to respond.
- **In Node** (Vitest, Jest), \`setupServer\` from \`msw/node\` patches the request-making modules (\`http\`, \`https\`, global \`fetch\`) at a low level to achieve the same interception.
The same handler definitions work in both, so one set of mocks serves tests, stories and offline development.

### The current API (v2 and v3)
Handlers are built with \`http.get\`, \`http.post\`, etc. (or \`graphql.query\`). The resolver receives \`{ request, params, cookies }\` and returns a standard Fetch API \`Response\`, usually via the \`HttpResponse\` helper: \`HttpResponse.json(data, { status })\`, \`HttpResponse.text()\`, \`HttpResponse.error()\` for network failures. Use \`delay()\` (from \`msw/utils\` in MSW 3) to simulate latency. Reading the body uses the standard \`await request.json()\`.

**MSW 3** keeps \`http\`, \`HttpResponse\` and \`setupServer\` unchanged, but is ESM-only and needs Node 22+; \`onUnhandledRequest\` was renamed \`onUnhandledFrame\`, \`graphql\` moved to \`msw/graphql\`, helpers like \`delay\` and \`passthrough\` live in \`msw/utils\`, and \`worker.stop()\` returns a Promise.

### Test lifecycle
1. \`server.listen({ onUnhandledFrame: 'error' })\` before all tests, so any request without a handler fails the test loudly.
2. \`server.use(...)\` inside a specific test to **override** a handler for that scenario (empty list, 500, slow response).
3. \`server.resetHandlers()\` after each test removes those overrides.
4. \`server.close()\` after all.

Keep "happy path" handlers as defaults and override per test for edge cases.

### Why not mock fetch or hooks?
- Mocking \`useProducts\` skips your query keys, error handling, retries, caching and parsing: the code most likely to have bugs.
- Mocking \`fetch\` couples tests to which client you use; switching from fetch to ky breaks every test.
- MSW mocks at the HTTP contract, so tests survive internal refactors and verify the request you actually send (method, URL, query params, body).

### Asserting on requests
Prefer asserting on visible outcomes. When the request itself matters (e.g. correct query string), capture it in the handler and assert, or make the handler respond differently based on params so the UI proves the right request was made.

### Keeping mocks honest
Mocks drift from the real API. Mitigations: generate types (or the handlers themselves) from OpenAPI, validate mock payloads against the same Zod schemas the app uses, and keep a small number of E2E or contract tests against the real backend.`,
    examples: [
      {
        title: '✅ Shared handlers and a Node server',
        code: `// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw'
import { delay } from 'msw/utils'

export const products = [
  { id: 'p1', name: 'Blue T-shirt', price: 20 },
  { id: 'p2', name: 'Red Hoodie', price: 45 },
]

export const handlers = [
  http.get('/api/products', ({ request }) => {
    const q = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? ''
    return HttpResponse.json(products.filter(p => p.name.toLowerCase().includes(q)))
  }),
  http.post('/api/cart', async ({ request }) => {
    const body = (await request.json()) as { productId: string }
    await delay(50)
    return HttpResponse.json({ items: [{ productId: body.productId, qty: 1 }] }, { status: 201 })
  }),
]

// src/test/server.ts
import { setupServer } from 'msw/node'
import { handlers } from '../mocks/handlers'
export const server = setupServer(...handlers)`,
        note: 'The GET handler actually filters by the q parameter, so a test that searches proves the UI sent the right query string.',
      },
      {
        title: '✅ Integration test: search, error and retry',
        code: `import { http, HttpResponse } from 'msw'
import { server } from '../test/server'

test('search shows matching products', async () => {
  const user = userEvent.setup()
  renderWithProviders(<ProductSearch />)
  await user.type(screen.getByRole('searchbox', { name: /search products/i }), 'hoodie')
  expect(await screen.findByRole('listitem', { name: /red hoodie/i })).toBeVisible()
  expect(screen.queryByRole('listitem', { name: /blue t-shirt/i })).not.toBeInTheDocument()
})

test('shows an error and recovers on retry', async () => {
  const user = userEvent.setup()
  let calls = 0
  server.use(
    http.get('/api/products', () => {
      calls++
      return calls === 1
        ? HttpResponse.json({ message: 'Internal error' }, { status: 500 })
        : HttpResponse.json([{ id: 'p1', name: 'Blue T-shirt', price: 20 }])
    }),
  )
  renderWithProviders(<ProductSearch />)
  await user.click(await screen.findByRole('button', { name: /try again/i }))
  expect(await screen.findByRole('listitem', { name: /blue t-shirt/i })).toBeVisible()
})`,
        note: 'server.use overrides the default only for this test; resetHandlers in afterEach restores it. The real query hook, error boundary and retry logic all run.',
      },
      {
        title: '❌ Mocking the hook',
        code: `vi.mock('../hooks/useProducts', () => ({
  useProducts: () => ({ data: [{ id: 'p1', name: 'Blue T-shirt' }], isLoading: false }),
}))
// The test passes even if useProducts builds the wrong URL,
// ignores the search term, or crashes on a 500.`,
        note: 'This tests the component against an imaginary hook. Bugs in the data layer are invisible.',
      },
    ],
    realCase: {
      title: 'Wrong query string shipped despite green tests',
      story: `**Situation:** An order-history page filtered by status. Tests mocked \`useOrders\` to return fixed data.

**Symptom:** After a refactor, filtering by "Shipped" showed all orders in production. Tests were green.

**Root cause:** The hook started sending \`?state=shipped\` instead of \`?status=shipped\`. The mocked hook never built a URL, so tests could not notice.

**Fix:** The team switched to MSW handlers that filter by the \`status\` parameter like the real API, removed hook mocks, and set \`onUnhandledFrame: 'error'\`. The regression test now fails if the wrong parameter is sent because the list would not be filtered.

**Lesson:** Mock at the network boundary so the code that builds requests is under test.`,
    },
    pitfalls: [
      'Forgetting server.resetHandlers() after each test, so an error override leaks into later tests.',
      'Leaving onUnhandledFrame (onUnhandledRequest before MSW 3) at the default warning, so un-mocked requests silently hang or hit the network.',
      'Using MSW v1 syntax (rest.get, res(ctx.json())) with v2/v3; the API changed to http and HttpResponse.',
      'Mock payloads drifting from the real API shape; validate with shared schemas or generate from OpenAPI.',
    ],
    exercise: {
      task: 'Write an integration test for an "Add to cart" button that posts to /api/cart: assert the cart badge updates on success, and that a 409 "out of stock" response shows an alert with the server message.',
      hint: 'Use server.use with http.post returning HttpResponse.json({ message }, { status: 409 }). The alert should be found by role "alert".',
      solution: `\`\`\`tsx
test('adds to cart', async () => {
  const user = userEvent.setup()
  renderWithProviders(<ProductPage id="p1" />)
  await user.click(await screen.findByRole('button', { name: /add to cart/i }))
  expect(await screen.findByRole('link', { name: /cart, 1 item/i })).toBeVisible()
})

test('shows out-of-stock error', async () => {
  server.use(http.post('/api/cart', () => HttpResponse.json({ message: 'Blue T-shirt is out of stock' }, { status: 409 })))
  const user = userEvent.setup()
  renderWithProviders(<ProductPage id="p1" />)
  await user.click(await screen.findByRole('button', { name: /add to cart/i }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Blue T-shirt is out of stock')
  expect(screen.getByRole('link', { name: /cart, 0 items/i })).toBeVisible()
})
\`\`\``,
    },
    interview: [
      'Why is mocking at the network layer better than mocking fetch or your data hooks?',
      'How does MSW intercept requests in the browser versus in Node?',
      'How do you test an error scenario for a single test without affecting others?',
    ],
  },

  playwright: {
    explanation: `Playwright drives real browsers (Chromium, Firefox, WebKit) through their automation protocols. End-to-end tests with Playwright verify that the whole system works: built front end, routing, real network calls, cookies, the backend (or a test environment of it), and browser behaviour jsdom cannot simulate (layout, scrolling, focus, file uploads, multiple tabs).

### Locators and auto-waiting
A **locator** is a lazy description of how to find an element: \`page.getByRole('button', { name: 'Checkout' })\`. Nothing is queried until you act on it. Every action (click, fill) automatically waits until the element is attached, visible, stable (not animating), enabled and receives pointer events. **Web-first assertions** such as \`await expect(locator).toBeVisible()\` retry until they pass or time out. Together these remove almost all need for manual waits. If you write \`page.waitForTimeout(2000)\`, something is wrong.

Prefer the same user-facing locators as Testing Library: \`getByRole\`, \`getByLabel\`, \`getByText\`, then \`getByTestId\`. Avoid CSS and XPath tied to layout.

### Isolation and speed
Each test gets a fresh **browser context**: its own cookies and storage, like a new incognito profile, created in milliseconds. Tests run in parallel across workers. To avoid logging in through the UI in every test, a **setup project** logs in once (with test-environment credentials) and saves \`storageState\` to a file that other projects reuse.

### Network control
\`page.route('**/api/recommendations', route => route.fulfill({ json: [] }))\` stubs specific endpoints, which helps with third-party services or non-critical calls. Keep critical paths real; the point of E2E is to exercise integration.

### Debugging
- \`--ui\` mode: time-travel through each step.
- **Trace Viewer**: with \`trace: 'on-first-retry'\`, a failing CI run produces a trace with DOM snapshots, network log, console and screenshots for every action. This is the best tool for diagnosing flaky failures.
- Codegen (\`npx playwright codegen\`) records interactions into locators as a starting point.

### Accessibility checks
\`@axe-core/playwright\` runs axe against the real rendered page: \`new AxeBuilder({ page }).analyze()\`. Run it on key pages and in important states (dialog open, form errors shown).

### What to cover
E2E tests are expensive, so pick critical journeys: sign-up, login, checkout, the core "job to be done". Ten reliable tests beat a hundred flaky ones. Use test-only seed data or API calls to create preconditions instead of clicking through setup screens.

### Flakiness sources
Shared test data between parallel tests, reliance on timing, animations, third-party scripts, and assertions on non-retrying values (\`expect(await locator.textContent()).toBe(...)\` instead of \`await expect(locator).toHaveText(...)\`).`,
    examples: [
      {
        title: '✅ Checkout spec with role locators, web-first assertions and axe',
        code: `import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('checkout', () => {
  test.beforeEach(async ({ request }) => {
    // Arrange via API, not UI: seed a cart for the logged-in test user
    await request.post('/api/test/seed-cart', { data: { items: [{ sku: 'tee-blue', qty: 1 }] } })
  })

  test('pays with a test card and sees confirmation', async ({ page }) => {
    await page.goto('/cart')
    await page.getByRole('button', { name: 'Checkout' }).click()

    await page.getByLabel('Full name').fill('Test Customer')
    await page.getByLabel('Address line 1').fill('1 Test Street')
    await page.getByLabel('Postcode').fill('10001')
    await page.getByRole('button', { name: 'Continue to payment' }).click()

    // payment provider iframe in test mode
    const card = page.frameLocator('iframe[title*="card"]')
    await card.getByLabel('Card number').fill('4242 4242 4242 4242')
    await card.getByLabel('Expiration').fill('12 / 34')
    await card.getByLabel('CVC').fill('123')

    await page.getByRole('button', { name: /pay/i }).click()
    await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible()
    await expect(page).toHaveURL(/\\/orders\\/[a-z0-9-]+$/)
  })

  test('checkout page has no detectable a11y violations', async ({ page }) => {
    await page.goto('/checkout')
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze()
    expect(results.violations).toEqual([])
  })
})`,
        note: 'No manual waits: clicks auto-wait and toBeVisible/toHaveURL retry. Preconditions are seeded through an API. The card number is the provider\'s published test number, used only in its test mode.',
      },
      {
        title: '❌ Flaky patterns vs ✅ fixes',
        code: `// ❌ arbitrary sleep, non-retrying assertion, brittle selector
await page.click('#app > div:nth-child(3) .btn')
await page.waitForTimeout(3000)
expect(await page.locator('.toast').textContent()).toBe('Saved')

// ✅
await page.getByRole('button', { name: 'Save' }).click()
await expect(page.getByRole('status')).toHaveText('Saved')`,
        note: 'toHaveText retries until the text matches or the timeout expires; textContent() reads once and races the UI.',
      },
      {
        title: '✅ Log in once with a setup project',
        code: `// playwright.config.ts (excerpt)
projects: [
  { name: 'setup', testMatch: /auth\\.setup\\.ts/ },
  { name: 'chromium', use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' }, dependencies: ['setup'] },
],
use: { baseURL: 'http://localhost:4173', trace: 'on-first-retry' },

// auth.setup.ts
import { test as setup, expect } from '@playwright/test'
setup('authenticate', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.E2E_USER!)
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('navigation', { name: 'Account' })).toBeVisible()
  await page.context().storageState({ path: 'playwright/.auth/user.json' })
})`,
        note: 'Test credentials come from CI secrets for a dedicated test user, never real accounts. Add the .auth folder to .gitignore.',
      },
    ],
    realCase: {
      title: 'An E2E suite with a 20% flake rate',
      story: `**Situation:** A SaaS team had 60 Playwright tests that failed randomly; engineers re-ran CI until green.

**Symptom:** Failures clustered in tests that edited "the project settings" and in toast assertions.

**Root cause:** Two issues. Tests running in parallel shared a single seeded project, so one test renamed it while another asserted its name. And toast assertions used \`textContent()\` plus \`waitForTimeout\`.

**Fix:** Each test created its own project through an API fixture with a unique name and deleted it afterwards. All assertions were converted to web-first assertions, and \`trace: 'on-first-retry'\` was enabled so remaining failures came with traces. Flake rate dropped below 1%.

**Lesson:** Most E2E flakiness is shared state or timing assumptions. Isolate data per test and let Playwright do the waiting.`,
    },
    pitfalls: [
      'Using waitForTimeout instead of web-first assertions and auto-waiting.',
      'Sharing mutable test data between parallel tests.',
      'Logging in through the UI in every test instead of reusing storageState.',
      'Trying to cover every edge case in E2E instead of in faster integration tests.',
      'Running E2E against a dev server in CI instead of a production build, missing build-only bugs.',
    ],
    exercise: {
      task: 'Write a Playwright test for your design-system Dialog in a demo page: open it with the keyboard, verify focus moved inside, press Escape, and verify focus returned to the trigger. Add an axe scan while the dialog is open.',
      hint: 'Use page.keyboard.press, expect(locator).toBeFocused(), and AxeBuilder with .include("dialog").',
      solution: `\`\`\`ts
test('dialog manages focus and is accessible', async ({ page }) => {
  await page.goto('/demo/dialog')
  const trigger = page.getByRole('button', { name: 'Edit address' })
  await trigger.focus()
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog', { name: 'Edit address' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Address line 1')).toBeFocused()

  const results = await new AxeBuilder({ page }).include('dialog').analyze()
  expect(results.violations).toEqual([])

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})
\`\`\``,
    },
    interview: [
      'What is auto-waiting in Playwright and how do web-first assertions differ from reading a value and asserting on it?',
      'How do you keep E2E tests isolated and fast when they need an authenticated user?',
      'How would you debug a test that fails only in CI?',
    ],
  },

  'what-not': {
    explanation: `Every test is code you maintain. A test is valuable when it **fails if and only if behaviour users care about breaks**. Tests that fail on harmless refactors (false positives) or pass while the feature is broken (false negatives) cost more than they return, because they teach the team to distrust and ignore the suite.

### Implementation details
An implementation detail is anything a user of the component (an end user or a developer consuming its props) cannot observe: state variable names, which hook is used, internal helper functions, component hierarchy, CSS class names, how many times something re-rendered. Tests coupled to these break when you switch from \`useState\` to \`useReducer\`, extract a child component, or rename a class.

A useful check: **would this test still pass if I rewrote the component from scratch with the same behaviour?** If not, it tests implementation.

There are two "users" of a component: the person interacting with the UI, and the developer rendering it with props. Testing that \`onChange\` is called with the right value is fine; it is a public contract.

### Things that usually do not deserve tests
- **Third-party libraries**: do not test that React Router navigates or that Zod validates emails. Test *your* configuration of them through behaviour.
- **Framework guarantees**: that \`useState\` updates, that a prop renders.
- **Trivial code**: a component that renders a static string, a re-export, a constant.
- **Styling**: computed colours and pixel positions belong to visual regression tests, not unit tests.
- **Large snapshots**: a 400-line snapshot of a page changes on any markup tweak; reviewers press "update" without reading. Small, focused inline snapshots of serialized data (e.g. a generated error message object) can be fine.

### Mocking too much
Mocking your own child components, hooks or modules creates tests that verify the mock. Mock boundaries you do not control: network (MSW), time, randomness, browser APIs jsdom lacks (\`IntersectionObserver\`, \`matchMedia\`).

### Coverage is a signal, not a goal
Coverage shows what is **not** tested. A high number says little about assertion quality. Tests that render without asserting meaningful outcomes increase coverage and confidence in equal measure: none. Mutation testing (e.g. Stryker) is a better gauge of whether tests detect changes.

### Deleting tests is allowed
If a test has failed only on refactors in the last six months, rewrite or delete it. Replace three implementation tests with one behaviour test.`,
    examples: [
      {
        title: '❌ Testing implementation vs ✅ testing behaviour',
        code: `// ❌ Breaks if the hook is renamed, if state moves to a reducer,
//    or if the child is restructured. Passes even if the UI is broken.
vi.mock('./useToggle', () => ({ useToggle: vi.fn(() => [true, vi.fn()]) }))
test('passes isOpen to Panel', () => {
  render(<Accordion />)
  expect(Panel).toHaveBeenCalledWith(expect.objectContaining({ isOpen: true }), undefined)
})

// ✅ Survives any internal rewrite with the same behaviour
test('expands a section when its header is clicked', async () => {
  const user = userEvent.setup()
  render(<Accordion items={[{ title: 'Shipping', body: 'Ships in 2 days' }]} />)
  const header = screen.getByRole('button', { name: 'Shipping' })
  expect(header).toHaveAttribute('aria-expanded', 'false')
  await user.click(header)
  expect(header).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText('Ships in 2 days')).toBeVisible()
})`,
        note: 'aria-expanded is part of the observable, accessible contract, so asserting on it is not an implementation detail.',
      },
      {
        title: '❌ Giant snapshot vs ✅ targeted assertions',
        code: `// ❌ 600 lines nobody reviews
expect(render(<InvoicePage />).container).toMatchSnapshot()

// ✅ The things that matter
renderWithProviders(<InvoicePage id="inv-7" />)
expect(await screen.findByRole('heading', { name: 'Invoice INV-7' })).toBeVisible()
expect(screen.getByRole('row', { name: /total/i })).toHaveTextContent('€1,234.50')
expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled()`,
        note: 'Explicit assertions document intent; a failing one tells you exactly which behaviour broke.',
      },
    ],
    realCase: {
      title: 'Snapshot fatigue',
      story: `**Situation:** A component library had snapshots for every component and story, about 900 snapshot files.

**Symptom:** Any shared change (adding a \`data-state\` attribute to a primitive) updated hundreds of snapshots. PRs routinely included \`-u\` updates. A real regression, a missing \`aria-label\` on the close button, was approved inside a 3,000-line snapshot diff.

**Root cause:** Snapshots captured everything, so they signalled nothing; humans cannot review that volume.

**Fix:** Snapshot tests were deleted. The team added role-based behaviour tests for each component, axe checks per story and visual regression for appearance. The missing label would now fail \`getByRole('button', { name: /close/i })\`.

**Lesson:** A test that changes on every edit is noise. Assert on what matters, explicitly.`,
    },
    pitfalls: [
      'Asserting on component state, internal function calls or which child components received which props.',
      'Writing large DOM snapshots and updating them blindly.',
      'Testing library behaviour (does the router navigate?) rather than your use of it.',
      'Treating a coverage percentage as the goal, producing tests without meaningful assertions.',
    ],
    exercise: {
      task: 'Find three tests in a project (yours or an open-source one) that test implementation details. Rewrite each as a behaviour test, or justify deleting it.',
      hint: 'Look for mocks of your own modules, .toHaveBeenCalledWith on internal functions, container.querySelector, class-name selectors and big snapshots.',
      solution: `A typical rewrite:

\`\`\`tsx
// Before: spies on an internal formatter
const spy = vi.spyOn(utils, 'formatPrice')
render(<PriceTag amount={1234.5} currency="EUR" />)
expect(spy).toHaveBeenCalledWith(1234.5, 'EUR')

// After: asserts the visible outcome
render(<PriceTag amount={1234.5} currency="EUR" />)
expect(screen.getByText('€1,234.50')).toBeInTheDocument()
\`\`\`

Delete instead of rewrite when the test only checks that a static component renders, or duplicates a test at another layer with no extra confidence.`,
    },
    interview: [
      'How do you define an implementation detail in the context of component tests?',
      'When, if ever, are snapshot tests a good idea?',
      'Your team wants 100% coverage. What would you say?',
    ],
  },
}

export default details
