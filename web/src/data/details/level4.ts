import type { TopicDetail } from '../types'

const details: Record<string, TopicDetail> = {
  routing: {
    explanation: `A router maps **URLs to UI**. In a single-page app the browser never reloads; the router listens to history changes, matches the current location against a route tree, and renders the matching components. Treat the URL as a piece of application state that the user can bookmark, share, refresh and navigate with the back button.

### Nested routes and layouts

Routes form a tree. A parent route renders shared chrome (navigation, sidebar, tabs) and an \`<Outlet />\` where the matched child renders. \`/projects/:projectId/settings\` might render \`AppLayout > ProjectLayout > ProjectSettings\`. Navigating between child routes keeps the parent mounted, so its state and layout persist. Use **index routes** for the default child and a \`path: '*'\` route (or \`errorElement\`) for 404s.

### Params vs search params

- **Path params** (\`:projectId\`) identify *which resource* the page is about.
- **Search params** (\`?status=open&page=2\`) describe *how you are viewing it*: filters, sort, pagination, selected tab, a search query.

If state should survive a refresh or be shareable, put it in the URL. \`useSearchParams\` gives you a \`URLSearchParams\` and a setter. Values are always strings, so **parse and validate** them (Zod with \`.catch\` defaults) instead of trusting them. Use \`replace: true\` for keystroke-level updates so the back button isn't flooded with history entries.

### Data APIs: loaders and actions

With \`createBrowserRouter\`, each route can have a \`loader\` that runs **before** the route renders, in parallel for all matched routes. That removes the classic waterfall where a parent renders, fetches, then a child renders and fetches. \`useLoaderData\` reads the result. An \`action\` handles \`<Form method="post">\` submissions; after an action, loaders revalidate automatically. \`useNavigation\` exposes pending state for global spinners. Loaders pair well with TanStack Query: the loader calls \`queryClient.ensureQueryData\` and the component uses \`useQuery\` with the same key, giving you both early fetching and a cache.

### Protected and lazy routes

Protect routes in a loader (redirect to \`/login?redirectTo=...\` when there is no session) or in a layout route that checks auth. Remember this is UX only: the server must authorise every request. Use \`lazy\` on routes to code-split each page so the initial bundle only contains what the first screen needs.

### When to choose TanStack Router

It offers fully type-safe paths, params and validated search params at the cost of a different mental model. Either is fine; what matters is understanding nested layouts, URL state and loading data before render.`,
    examples: [
      {
        title: '✅ Route tree with layouts, loaders, lazy pages and 404',
        code: `import { createBrowserRouter, redirect } from 'react-router'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      {
        path: 'projects',
        loader: requireUser,
        children: [
          { index: true, lazy: () => import('./features/projects/ProjectListPage') },
          {
            path: ':projectId',
            lazy: () => import('./features/projects/ProjectLayout'),
            children: [
              { index: true, lazy: () => import('./features/projects/OverviewTab') },
              { path: 'settings', lazy: () => import('./features/projects/SettingsTab') },
            ],
          },
        ],
      },
      { path: 'login', element: <LoginPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

async function requireUser({ request }: { request: Request }) {
  const user = await getSession()
  if (!user) {
    const url = new URL(request.url)
    throw redirect(\`/login?redirectTo=\${encodeURIComponent(url.pathname + url.search)}\`)
  }
  return null
}`,
        note: 'Each lazily imported module can export `Component`, `loader` and `ErrorBoundary`. The auth check runs before any project page renders, and the original location is preserved for after login.',
      },
      {
        title: '❌ useState filters vs ✅ search params as state',
        code: `// ❌ lost on refresh, not shareable, back button does nothing
const [status, setStatus] = useState('open')

// ✅ URL is the state
import { useSearchParams } from 'react-router'
import { z } from 'zod'

const FiltersSchema = z.object({
  status: z.enum(['open', 'closed', 'all']).catch('open'),
  page: z.coerce.number().int().min(1).catch(1),
  q: z.string().catch(''),
})

export function useTicketFilters() {
  const [params, setParams] = useSearchParams()
  const filters = FiltersSchema.parse(Object.fromEntries(params))

  function update(patch: Partial<z.infer<typeof FiltersSchema>>, opts?: { replace?: boolean }) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) next.set(k, String(v))
      if (!('page' in patch)) next.set('page', '1') // filter change resets paging
      return next
    }, opts)
  }
  return { filters, update }
}

// typing in a search box: update({ q: value }, { replace: true })`,
        note: 'Filters are derived from the URL on every render, validated with safe defaults. Changing a filter resets the page, and keystrokes use `replace` so history stays usable.',
      },
    ],
    realCase: {
      title: 'Support agents could not share filtered views',
      story: `**Situation:** a SaaS helpdesk kept ticket filters in a Zustand store. **Symptom:** agents pasted links to "urgent unassigned tickets" in chat, but colleagues opened an unfiltered list; refreshing after a deploy also reset everyone's view, and the back button left the app entirely. **Root cause:** shareable view state lived in memory instead of the URL. **Fix:** filters, sort and page moved to search params, parsed with a Zod schema with \`.catch\` defaults; the list query key was built from the parsed filters. **Lesson:** if a person might bookmark, share or refresh it, it belongs in the URL.`,
    },
    pitfalls: [
      'Reading search params without validation; they are user-editable strings and old links live forever.',
      'Pushing a history entry on every keystroke instead of using `replace`.',
      'Fetching in `useEffect` in nested components, creating parent-then-child waterfalls that loaders avoid.',
      'Treating client-side route guards as security; the API must check authorisation.',
      'Forgetting to reset pagination when filters change, landing users on an empty page 7.',
    ],
    exercise: {
      task: 'Build a `/products` route whose list is driven by `?q=&category=&sort=&page=`. Validate the params with Zod, add a "Clear filters" button, and make the category tabs nested routes under `/products/:category` instead.',
      hint: 'Decide which piece is identity (path param) vs view (search param). Category could be either; justify your choice.',
      solution: `\`\`\`tsx
const Schema = z.object({
  q: z.string().catch(''),
  sort: z.enum(['newest', 'price-asc', 'price-desc']).catch('newest'),
  page: z.coerce.number().int().min(1).catch(1),
})

function ProductsPage() {
  const { category = 'all' } = useParams()
  const [params, setParams] = useSearchParams()
  const filters = Schema.parse(Object.fromEntries(params))
  const { data } = useQuery({
    queryKey: ['products', { category, ...filters }],
    queryFn: () => api.listProducts({ category, ...filters }),
  })
  return (
    <>
      <nav>{CATEGORIES.map((c) => <NavLink key={c} to={\`/products/\${c}\`}>{c}</NavLink>)}</nav>
      <button onClick={() => setParams({})}>Clear filters</button>
      <ProductGrid products={data?.items ?? []} />
    </>
  )
}
\`\`\`
Category as a path param gives each category a clean, indexable URL; filters stay in search params.`,
    },
    interview: [
      'What belongs in a path param versus a search param? Give examples.',
      'How do route loaders eliminate request waterfalls compared with fetching in effects?',
      'Why is a client-side protected route not a security boundary?',
    ],
  },

  'server-state': {
    explanation: `Most of what beginners call "state" in a React app is not really theirs. A list of invoices, the current user's profile, a product's stock level: these are **owned by the server**. What the browser holds is a **cache**: a snapshot that may already be outdated. That is server state. Client state, by contrast, is owned entirely by the UI: whether a modal is open, the text in an unsubmitted draft, which row is expanded.

### Why the distinction matters

Server state has problems client state does not:

- It can be **stale**: someone else edited the invoice two minutes ago.
- It is **shared**: five components need the current user; they should not each fetch it.
- It needs **deduplication**: two components mounting at once should cause one request.
- It needs **refetching** at the right moments: window refocus, reconnect, after a mutation.
- It has **lifecycle**: loading, error, background refresh, garbage collection of unused data.
- It suffers **race conditions**: a slow old response must not overwrite a fast new one.

If you put server data into \`useState\` + \`useEffect\`, or into Redux/Zustand, you are hand-building a cache and usually missing half of the list above. Classic symptoms: spinners on every navigation, stale data after editing, duplicate requests, and "why does the sidebar show the old name?".

### The right tools

Use a server-state library (TanStack Query, RTK Query, SWR, or router loaders with revalidation) for server state. Use \`useState\`, \`useReducer\`, the URL, context or a small store for client state. The global store then becomes tiny, because most of what used to live there was a cache.

### Grey areas

- **Form drafts** of server data: copy the server value into local state when the edit starts (or use it as \`defaultValues\`), and write back via a mutation.
- **Filters**: client state, best stored in the URL, but they become part of the *query key* for server state.
- **Optimistic updates**: temporarily client-side, then reconciled with the server.

### A useful test

Ask: "If I close the tab and reopen it, where does the truth come from?" If the answer is the server, it is server state, and your job is to manage freshness, not ownership.`,
    examples: [
      {
        title: '❌ Server data copied into a global store vs ✅ cached query',
        code: `// ❌ a hand-made cache: no dedupe, no staleness, manual refetch everywhere
const useStore = create<{ user: User | null; loadUser: () => Promise<void> }>()((set) => ({
  user: null,
  loadUser: async () => set({ user: await api.getMe() }),
}))
// Every page calls loadUser() in an effect; after editing the profile,
// someone must remember to call loadUser() again.

// ✅ server state in a query, client state stays local
export const meQuery = {
  queryKey: ['me'] as const,
  queryFn: api.getMe,
  staleTime: 5 * 60_000,
}

export function useMe() {
  return useQuery(meQuery)
}

function ProfileMenu() {
  const { data: me } = useMe()          // server state (cached, shared)
  const [open, setOpen] = useState(false) // client state (local)
  return <Menu open={open} onOpenChange={setOpen} title={me?.name ?? '…'} />
}`,
        note: 'Ten components can call `useMe()` and only one request happens. After a profile mutation, `invalidateQueries({ queryKey: [\'me\'] })` refreshes every consumer. The menu\'s open flag never belonged in a global store.',
      },
    ],
    realCase: {
      title: 'The stale cart badge',
      story: `**Situation:** a retail team stored the cart in Redux, fetched once on app start. **Symptom:** customers adding items on their phone saw a stale count on desktop; after checkout, the badge still showed 3 items until a hard refresh. **Root cause:** cart data was server state held as client state with no freshness rules. **Fix:** the cart moved to a query with refetch on window focus and invalidation after cart mutations; Redux kept only UI concerns. The store shrank by about two thirds. **Lesson:** classify state by ownership first; tool choice follows.`,
    },
    pitfalls: [
      'Storing API responses in Redux/Zustand/context and re-implementing caching badly.',
      'Copying query data into `useState` "to edit it", then never syncing when the server data changes.',
      'Treating filters as server state; they are client (URL) state that feeds the query key.',
      'Assuming fetched data is current; always ask when it should be refreshed.',
    ],
    exercise: {
      task: 'Audit an app you built: list every piece of state and classify it as server, URL, local, or global client state. Move at least one piece of server data out of `useState`/a store into a query hook.',
      hint: 'For each piece ask: who owns the truth, who needs it, and should it survive a refresh?',
      solution: `Example classification for a project dashboard:
- Projects list, current user, notifications: **server state** -> \`useQuery\` hooks (\`useProjects\`, \`useMe\`).
- Selected filter/sort/page: **URL** -> search params.
- Sidebar collapsed, theme: **global client** -> small Zustand store (persisted).
- Modal open, form draft: **local** -> \`useState\` / form library.

\`\`\`ts
export const projectsQuery = (filters: Filters) => ({
  queryKey: ['projects', filters] as const,
  queryFn: () => api.listProjects(filters),
})
export const useProjects = (f: Filters) => useQuery(projectsQuery(f))
\`\`\``,
    },
    interview: [
      'Define server state and client state. Why do they need different tools?',
      'List four problems a server-state cache solves that `useState` + `useEffect` does not.',
      'How do you handle editing a form that starts with server data?',
    ],
  },

  'tanstack-query': {
    explanation: `TanStack Query is a **server-state cache** with a React API. You tell it how to fetch (\`queryFn\`) and how to identify the data (\`queryKey\`); it handles caching, deduping, background refetching, retries, garbage collection and race conditions.

### Query keys

A query key is an array that uniquely identifies cached data, like a cache address: \`['invoices', 'list', { status, page }]\`. Everything the \`queryFn\` depends on must be in the key; when the key changes, a new cache entry is used and fetched. Keys are hashed deterministically, so object property order does not matter. Organise them hierarchically (often with a **query key factory**) so you can invalidate broadly (\`['invoices']\`) or precisely.

### staleTime vs gcTime

- \`staleTime\` (default 0): how long data counts as **fresh**. Fresh data is served from cache without refetching. Stale data is still shown, but refetched in the background on triggers like mount, window focus and reconnect.
- \`gcTime\` (default 5 minutes, formerly \`cacheTime\`): how long **unused** data (no observers) stays in memory before being garbage collected.

Most "it refetches too much" complaints are fixed by a sensible \`staleTime\` (e.g. 30–60 seconds for lists).

### Status

\`status\` is \`'pending' | 'error' | 'success'\` (do we have data?), while \`fetchStatus\` is \`'fetching' | 'paused' | 'idle'\` (is a request running?). \`isPending\` means no data yet; \`isFetching\` includes background refreshes. Show skeletons for pending, a subtle indicator for background fetching.

### Mutations and invalidation

\`useMutation\` runs writes. On success, call \`queryClient.invalidateQueries({ queryKey: ['invoices'] })\`: matching queries are marked stale and active ones refetch. Return the promise from \`onSuccess\` / \`onSettled\` if you want the mutation to stay pending until refetch finishes.

### Optimistic updates

Two approaches: render \`mutation.variables\` while pending (simple, local to one component), or update the cache in \`onMutate\` (cancel outgoing queries, snapshot previous data, \`setQueryData\`, roll back in \`onError\`, invalidate in \`onSettled\`).

### Pagination, infinite, prefetch

Use \`placeholderData: keepPreviousData\` so page 2 doesn't flash a spinner. \`useInfiniteQuery\` with \`initialPageParam\` and \`getNextPageParam\` powers "load more". \`queryClient.prefetchQuery\` on hover or in a route loader makes navigation instant. \`useSuspenseQuery\` integrates with Suspense and always returns data.

### When not to use it

Don't put client state (open modals) in it, and don't \`useEffect\` to copy query data into \`useState\`. Derive from \`data\` directly.`,
    examples: [
      {
        title: '✅ Query key factory and typed hooks',
        code: `import { queryOptions, useQuery, keepPreviousData } from '@tanstack/react-query'

type InvoiceFilters = { status: 'all' | 'open' | 'paid'; page: number }

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (f: InvoiceFilters) => [...invoiceKeys.lists(), f] as const,
  detail: (id: string) => [...invoiceKeys.all, 'detail', id] as const,
}

export const invoiceListOptions = (f: InvoiceFilters) =>
  queryOptions({
    queryKey: invoiceKeys.list(f),
    queryFn: ({ signal }) => api.listInvoices(f, { signal }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

export const useInvoices = (f: InvoiceFilters) => useQuery(invoiceListOptions(f))

// in a route loader: await queryClient.ensureQueryData(invoiceListOptions(filters))`,
        note: '`queryOptions` keeps key and fn together and type-safe, reusable by hooks, loaders and prefetching. Passing `signal` lets the library abort requests that are no longer needed.',
      },
      {
        title: '❌ useEffect fetch vs ✅ mutation with optimistic cache update',
        code: `// ❌ race conditions, no cache, no retry, manual loading flags
useEffect(() => {
  setLoading(true)
  api.listInvoices(filters).then(setInvoices).finally(() => setLoading(false))
}, [filters])

// ✅ optimistic "mark as paid"
export function useMarkPaid(filters: InvoiceFilters) {
  const qc = useQueryClient()
  const key = invoiceKeys.list(filters)
  return useMutation({
    mutationFn: (id: string) => api.markPaid(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<InvoicePage>(key)
      qc.setQueryData<InvoicePage>(key, (old) =>
        old && { ...old, items: old.items.map((i) => (i.id === id ? { ...i, status: 'paid' } : i)) },
      )
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: invoiceKeys.all }),
  })
}`,
        note: 'Cancel in-flight fetches so they don\'t overwrite the optimistic change, snapshot for rollback, and always invalidate at the end to resync with the server.',
      },
    ],
    realCase: {
      title: 'A dashboard hammering its own API',
      story: `**Situation:** an analytics team adopted TanStack Query with default settings. **Symptom:** API load tripled; every tab switch and window focus triggered refetches of a dozen heavy report queries. **Root cause:** \`staleTime: 0\` (default) made all data instantly stale, so every mount and focus refetched. Some keys also embedded a \`new Date()\`, creating a new cache entry each render. **Fix:** report queries got \`staleTime: 5 * 60_000\`, date ranges were normalised to strings in the key, and focus refetch was kept only for cheap, volatile queries. **Lesson:** tune freshness per kind of data, and keep query keys stable and serialisable.`,
    },
    pitfalls: [
      'Leaving a variable the `queryFn` uses out of the `queryKey`, so the cache returns data for the wrong filters.',
      'Using `cacheTime` (v4) in v5 code; it is `gcTime` now, and options use the single object syntax.',
      'Copying `data` into `useState` with an effect instead of deriving from it.',
      'Confusing `isPending` (no data yet) with `isFetching` (any request running), showing full-page spinners during background refreshes.',
      'Optimistic updates without `cancelQueries` and rollback, causing flicker or permanently wrong UI on failure.',
    ],
    exercise: {
      task: 'Implement a paginated "Orders" list with `useQuery` + `keepPreviousData`, prefetch the next page, and a "Cancel order" mutation that optimistically removes the row and rolls back on error.',
      hint: 'Prefetch with `queryClient.prefetchQuery(ordersOptions({ page: page + 1 }))` inside an effect keyed on `page` and `data?.hasMore`.',
      solution: `\`\`\`tsx
const ordersOptions = (page: number) => queryOptions({
  queryKey: ['orders', 'list', { page }] as const,
  queryFn: () => api.listOrders({ page }),
  placeholderData: keepPreviousData,
  staleTime: 20_000,
})

function Orders() {
  const [page, setPage] = useState(1)
  const qc = useQueryClient()
  const { data, isPending, isFetching, isPlaceholderData } = useQuery(ordersOptions(page))

  useEffect(() => {
    if (data?.hasMore) qc.prefetchQuery(ordersOptions(page + 1))
  }, [data, page, qc])

  const cancel = useMutation({
    mutationFn: api.cancelOrder,
    onMutate: async (id: string) => {
      const key = ordersOptions(page).queryKey
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData(key)
      qc.setQueryData(key, (old) => old && { ...old, items: old.items.filter((o) => o.id !== id) })
      return { prev, key }
    },
    onError: (_e, _id, ctx) => ctx && qc.setQueryData(ctx.key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })

  if (isPending) return <OrdersSkeleton />
  return (
    <>
      {isFetching && <TopProgressBar />}
      <OrderTable orders={data?.items ?? []} onCancel={(id) => cancel.mutate(id)} />
      <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
      <button disabled={isPlaceholderData || !data?.hasMore} onClick={() => setPage((p) => p + 1)}>Next</button>
    </>
  )
}
\`\`\``,
    },
    interview: [
      'Explain `staleTime` vs `gcTime` with a concrete timeline.',
      'Why must every input of the `queryFn` be part of the `queryKey`?',
      'Walk through an optimistic update with rollback. What is `cancelQueries` for?',
    ],
  },

  forms: {
    explanation: `Forms look simple and are one of the hardest parts of UI work: values, validation, error display timing, async submission, pending states, server errors, resets and accessibility all interact. Build one by hand once so you understand the moving parts, then use tools.

### The moving parts

- **Values**: controlled (\`value\` + \`onChange\` in state) or uncontrolled (the DOM holds the value; read it via \`FormData\` or refs on submit).
- **Errors**: per field, plus form-level errors (e.g. "invalid credentials").
- **Touched/dirty**: show an error only after the user left the field or tried to submit, not while they type their first character.
- **Submit state**: idle, submitting, succeeded, failed; disable double submits.
- **Server errors**: map them back to fields (\`email: 'already taken'\`).

### React Hook Form + Zod

React Hook Form (RHF) keeps inputs **uncontrolled** via \`register\`, so typing doesn't re-render the whole form: it is fast even with large forms. Pair it with \`zodResolver(schema)\` so one Zod schema defines both validation and the TypeScript type of the values. Key APIs: \`useForm<T>({ resolver, defaultValues, mode })\`, \`register\`, \`handleSubmit\`, \`formState: { errors, isSubmitting, isDirty }\`, \`setError\` for server errors, \`reset\` after loading server data, and \`Controller\` for non-native inputs (date pickers, comboboxes). Always provide \`defaultValues\`.

### React 19 Actions

React 19 lets a \`<form action={fn}>\` take a function. React runs it in a transition when the form submits, passes the \`FormData\`, and resets uncontrolled fields after success. Related hooks:

- \`useActionState(action, initialState)\` returns \`[state, formAction, isPending]\`. Your action receives \`(previousState, formData)\` and returns the next state, perfect for returning validation errors or a success message.
- \`useFormStatus()\` called *inside* a component rendered within a form returns \`{ pending, data, method }\`, so a reusable \`SubmitButton\` can disable itself.
- \`useOptimistic\` shows the expected result while the action runs.

Actions shine for simple forms and progressive enhancement (especially with server functions in frameworks). RHF shines for complex client-side forms: field arrays, dependent fields, live validation. They can be combined, but pick one owner of the form state.

### Validation layers

Client validation is UX: fast feedback. Server validation is the truth and security. Share the Zod schema between both when possible, and always handle server-returned errors.`,
    examples: [
      {
        title: '✅ React Hook Form + Zod with server errors',
        code: `import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const ProjectSchema = z.object({
  name: z.string().trim().min(3, 'At least 3 characters'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Lowercase letters, digits and dashes'),
  budget: z.coerce.number().positive('Must be positive'),
})
type ProjectInput = z.infer<typeof ProjectSchema>

export function NewProjectForm({ onCreated }: { onCreated: (id: string) => void }) {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<ProjectInput>({
      resolver: zodResolver(ProjectSchema),
      defaultValues: { name: '', slug: '', budget: 0 },
      mode: 'onTouched',
    })

  const onSubmit = handleSubmit(async (values) => {
    const res = await api.createProject(values)
    if (!res.ok) {
      if (res.error.code === 'SLUG_TAKEN') setError('slug', { message: 'Slug already in use' })
      else setError('root', { message: 'Could not create project. Try again.' })
      return
    }
    onCreated(res.value.id)
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <TextField label="Name" {...register('name')} error={errors.name?.message} />
      <TextField label="Slug" {...register('slug')} error={errors.slug?.message} />
      <TextField label="Budget" type="number" {...register('budget')} error={errors.budget?.message} />
      {errors.root && <p role="alert">{errors.root.message}</p>}
      <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create'}</button>
    </form>
  )
}`,
        note: 'One schema yields validation and the `ProjectInput` type. `mode: \'onTouched\'` avoids yelling while the user types. Server errors are mapped to fields with `setError`, and `root` holds form-level errors.',
      },
      {
        title: '✅ React 19 useActionState + useFormStatus',
        code: `import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

type State = { ok: boolean; errors?: Partial<Record<'email', string>>; message?: string }

async function subscribe(_prev: State, formData: FormData): Promise<State> {
  const parsed = z.object({ email: z.string().email() }).safeParse({ email: formData.get('email') })
  if (!parsed.success) return { ok: false, errors: { email: 'Enter a valid email' } }
  const res = await api.subscribe(parsed.data.email)
  return res.ok ? { ok: true, message: 'Check your inbox!' } : { ok: false, message: 'Try again later' }
}

function SubmitButton() {
  const { pending } = useFormStatus() // reads the parent <form>
  return <button disabled={pending}>{pending ? 'Subscribing…' : 'Subscribe'}</button>
}

export function NewsletterForm() {
  const [state, formAction, isPending] = useActionState(subscribe, { ok: false })
  return (
    <form action={formAction} aria-busy={isPending}>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" aria-invalid={!!state.errors?.email} />
      {state.errors?.email && <p role="alert">{state.errors.email}</p>}
      <SubmitButton />
      {state.message && <p aria-live="polite">{state.message}</p>}
    </form>
  )
}`,
        note: 'The action returns the next state, so errors flow back without extra `useState`. `useFormStatus` must be called in a child of the `<form>`, not in the component that renders it.',
      },
    ],
    realCase: {
      title: 'Double-charged donations',
      story: `**Situation:** a non-profit's donation form submitted via a plain \`onClick\` handler. **Symptom:** on slow mobile networks some donors tapped "Donate" twice and were charged twice. **Root cause:** no pending state; the button stayed enabled during the request, and the backend had no idempotency key. **Fix:** the form moved to RHF with \`isSubmitting\` disabling the button, the client generated an idempotency key per form session, and the server deduplicated on it. **Lesson:** submit state is a correctness concern, not polish; defend on both client and server.`,
    },
    pitfalls: [
      'Showing validation errors on the very first keystroke; validate on blur/touched, then on change once invalid.',
      'Calling `useFormStatus` in the same component that renders the `<form>` (it only sees parent forms).',
      'Omitting `defaultValues` in RHF, leading to uncontrolled-to-controlled warnings and broken `reset`/`isDirty`.',
      'Mixing RHF and `useActionState` both trying to own the same field values.',
      'Ignoring server-side errors, so a "slug taken" response shows a generic failure.',
    ],
    exercise: {
      task: 'Build an "Edit profile" form: load the profile with `useQuery`, populate RHF via `values` or `reset`, validate with Zod (display name 2–40 chars, optional website URL), submit with `useMutation`, map a `409` error to the display name field and invalidate `[\'me\']` on success.',
      hint: 'RHF\'s `values` option updates the form when server data arrives; `isDirty` can disable Save when nothing changed.',
      solution: `\`\`\`tsx
const ProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(40),
  website: z.string().url().or(z.literal('')),
})
type Profile = z.infer<typeof ProfileSchema>

function EditProfile() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['me'], queryFn: api.getMe })
  const form = useForm<Profile>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: { displayName: '', website: '' },
    values: data ? { displayName: data.displayName, website: data.website ?? '' } : undefined,
  })
  const save = useMutation({
    mutationFn: api.updateMe,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409)
        form.setError('displayName', { message: 'Name already taken' })
    },
  })
  const { errors, isDirty } = form.formState
  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate>
      <TextField label="Display name" {...form.register('displayName')} error={errors.displayName?.message} />
      <TextField label="Website" {...form.register('website')} error={errors.website?.message} />
      <button disabled={!isDirty || save.isPending}>Save</button>
    </form>
  )
}
\`\`\``,
    },
    interview: [
      'Why is React Hook Form fast with large forms? What does "uncontrolled" mean here?',
      'Explain the signature of `useActionState` and what the action receives.',
      'When would you choose React 19 Actions over React Hook Form, and vice versa?',
    ],
  },

  'forms-a11y': {
    explanation: `An accessible form is one that works with a keyboard, a screen reader, voice control, zoom and autofill. Most of it comes for free from **native HTML**; most failures come from replacing native elements with divs or from errors that are only visible, never announced.

### Labels

Every input needs a programmatic name. A visible \`<label htmlFor={id}>\` is best: clicking it focuses the input, it enlarges the tap target, and screen readers read it. Placeholders are **not** labels: they disappear on typing, have poor contrast and are not reliably announced. Group related controls (radio buttons, an address) in \`<fieldset>\` with a \`<legend>\`. Use \`useId()\` to generate stable ids.

### Hints and errors

- Connect help text and error messages with \`aria-describedby\` (it can list several ids). Screen readers read them after the label.
- Mark invalid fields with \`aria-invalid="true"\` only when there is an error.
- Write errors that say how to fix the problem: "Enter a date like 31/12/2026", not "Invalid input".
- Don't rely on colour alone; include text or an icon.

### Submit failure flow

On a failed submit, **move focus to the first invalid field** (React Hook Form does this by default with \`shouldFocusError\`). For long forms, an error summary at the top with a heading, \`tabIndex={-1}\` and focus moved to it, listing anchors to each field, is even better. For async results, use a polite live region (\`aria-live="polite"\` or \`role="status"\`) so "Saved" is announced; reserve \`role="alert"\` for important errors.

### Input semantics and autofill

Use the right \`type\` (\`email\`, \`tel\`, \`url\`, \`number\` sparingly), \`inputMode\` for numeric keyboards, and \`autoComplete\` tokens (\`email\`, \`current-password\`, \`new-password\`, \`one-time-code\`, \`postal-code\`). Autofill dramatically improves completion, and password managers rely on these tokens. Mark required fields visibly and with \`required\` or \`aria-required\`.

### Custom controls

If you build a custom select, combobox or toggle, you inherit the job of keyboard support, roles, states and focus management. Prefer native elements or a well-tested headless library (React Aria, Radix). Keep disabled submit buttons to a minimum: a disabled button gives no feedback about *why*; it is often better to allow submit and show errors.

### Testing

Tab through the whole form without a mouse. Use Testing Library queries like \`getByRole('textbox', { name: 'Email' })\`: if the query fails, the field has no accessible name. Try a screen reader at least once.`,
    examples: [
      {
        title: '❌ Placeholder-only field vs ✅ labelled, described field',
        code: `// ❌ no label, error only visible, colour-only signal
<input placeholder="Email" className={error ? 'red' : ''} />
{error && <span className="red">Invalid</span>}

// ✅
function EmailField({ error }: { error?: string }) {
  const id = useId()
  const hintId = \`\${id}-hint\`
  const errorId = \`\${id}-error\`
  return (
    <div>
      <label htmlFor={id}>Work email <span aria-hidden="true">*</span></label>
      <p id={hintId}>We'll send the invoice here.</p>
      <input
        id={id}
        name="email"
        type="email"
        autoComplete="email"
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? \`\${hintId} \${errorId}\` : hintId}
      />
      {error && <p id={errorId} className="field-error">⚠ {error}</p>}
    </div>
  )
}`,
        note: 'The screen reader reads label, then hint, then error. `aria-invalid` is only present when invalid. The error has an icon and text, not just colour.',
      },
      {
        title: '✅ Error summary with focus management',
        code: `function ErrorSummary({ errors }: { errors: Record<string, string> }) {
  const ref = useRef<HTMLDivElement>(null)
  const entries = Object.entries(errors)
  useEffect(() => {
    if (entries.length > 0) ref.current?.focus()
  }, [entries.length])
  if (entries.length === 0) return null
  return (
    <div ref={ref} tabIndex={-1} role="alert" aria-labelledby="error-summary-title">
      <h2 id="error-summary-title">There are {entries.length} problems</h2>
      <ul>
        {entries.map(([field, message]) => (
          <li key={field}><a href={\`#\${field}\`}>{message}</a></li>
        ))}
      </ul>
    </div>
  )
}`,
        note: 'After a failed submit focus lands on the summary, which is announced; each link jumps to the field (whose `id` matches the field name).',
      },
    ],
    realCase: {
      title: 'A checkout screen readers could not finish',
      story: `**Situation:** an online grocery redesigned checkout with placeholder-only inputs and red borders for errors. **Symptom:** accessibility complaints and a measurable drop in completion among keyboard users; screen reader users pressed "Pay", heard nothing, and assumed the site was broken. **Root cause:** no labels, errors not linked or announced, focus stayed on the button after a failed submit, and a custom div-based dropdown for delivery slots had no keyboard support. **Fix:** labels, \`aria-describedby\` errors, focus to the first invalid field, a native \`<select>\`, and correct \`autoComplete\` tokens. Completion improved for all users, not just assistive technology users. **Lesson:** accessible forms are better forms.`,
    },
    pitfalls: [
      'Using placeholders as labels.',
      'Errors that are visible but not connected via `aria-describedby` or announced.',
      'Leaving focus on the submit button after validation fails.',
      'Missing `autoComplete` tokens, breaking autofill and password managers.',
      'Rebuilding native controls with divs without keyboard and ARIA support.',
    ],
    exercise: {
      task: 'Take a 5-field shipping address form and make it fully accessible: labels, fieldset/legend, hints, linked errors, `autoComplete` tokens, focus on first error, and a live region announcing "Address saved". Verify with Testing Library `getByRole` queries.',
      hint: 'Address tokens: `name`, `address-line1`, `address-level2` (city), `postal-code`, `country`.',
      solution: `\`\`\`tsx
<form onSubmit={onSubmit} noValidate>
  <fieldset>
    <legend>Shipping address</legend>
    <TextField label="Full name" name="name" autoComplete="name" required error={errors.name} />
    <TextField label="Street address" name="line1" autoComplete="address-line1" required error={errors.line1} />
    <TextField label="City" name="city" autoComplete="address-level2" required error={errors.city} />
    <TextField label="Postal code" name="postal" autoComplete="postal-code" inputMode="numeric" error={errors.postal} />
    <TextField label="Country" name="country" autoComplete="country-name" error={errors.country} />
  </fieldset>
  <button type="submit">Save address</button>
  <p role="status">{saved ? 'Address saved' : ''}</p>
</form>

// test
expect(screen.getByRole('textbox', { name: /city/i })).toHaveAttribute('aria-invalid', 'true')
\`\`\`
Focus the first invalid field in \`onSubmit\` with \`document.getElementById(firstErrorName)?.focus()\` (or RHF's built-in \`shouldFocusError\`).`,
    },
    interview: [
      'Why is a placeholder not a substitute for a label?',
      'What do `aria-describedby` and `aria-invalid` do, and when should each be set?',
      'Describe the ideal focus behaviour after a failed form submission.',
    ],
  },

  auth: {
    explanation: `Authentication on the client is mostly about **not making the server's job harder** and not leaking credentials. The browser can never be a security boundary: anyone can edit your JavaScript. The server decides who someone is and what they can do; the client stores proof of identity safely and shapes the UI.

### Where to keep the session

- **httpOnly, Secure, SameSite cookies** set by the server: JavaScript cannot read them, so an XSS bug cannot steal the token. The browser sends them automatically with requests to that origin. This is the recommended default for web apps with their own backend (or a backend-for-frontend).
- **localStorage / sessionStorage tokens**: any script on the page, including an injected one or a compromised dependency, can read and exfiltrate them. Convenient, but an XSS becomes a full account takeover.
- **In-memory access tokens** with a refresh token in an httpOnly cookie are a reasonable middle ground for SPA-to-API setups: a reload calls a refresh endpoint.

Cookies bring **CSRF** risk: another site can trigger requests that carry your cookie. \`SameSite=Lax\` or \`Strict\` blocks most of it; add CSRF tokens or require a custom header for state-changing requests when needed.

### Client-side responsibilities

- Load the current user once (\`useQuery(['me'])\` or a root loader) and expose it via a hook. Unknown, anonymous and authenticated are three distinct states; don't flash the login page while the session is loading.
- **Protected routes**: redirect unauthenticated users in a loader or layout, preserving the intended destination (\`/login?redirectTo=/billing\`). After login, validate that \`redirectTo\` is a relative path to avoid open redirects.
- Handle **401** globally: clear cached user data and redirect to login. Handle **403** as "you are signed in but not allowed", which is a different screen.
- On logout, call the server to invalidate the session and \`queryClient.clear()\` so the next user on a shared machine doesn't see cached data.
- Hide UI for permissions the user lacks, but never rely on it: the API must enforce authorisation on every request.

### Third-party identity

For OAuth/OIDC providers, use the Authorization Code flow with PKCE via a maintained library or your backend; never implement crypto or token parsing yourself. Avoid putting tokens in URLs.`,
    examples: [
      {
        title: '❌ Token in localStorage vs ✅ cookie session with credentials',
        code: `// ❌ readable by any injected script
localStorage.setItem('token', data.accessToken)
fetch('/api/invoices', { headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` } })

// ✅ the server sets: Set-Cookie: sid=...; HttpOnly; Secure; SameSite=Lax; Path=/
export async function apiFetch<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const res = await fetch(\`/api\${path}\`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch', ...init?.headers },
  })
  if (res.status === 401) throw new UnauthorizedError()
  if (res.status === 403) throw new ForbiddenError()
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return schema.parse(await res.json())
}`,
        note: 'The client never touches the token. 401 and 403 become typed errors so the app can redirect to login or show a "no access" page respectively.',
      },
      {
        title: '✅ Login with safe redirect back',
        code: `function safeRedirect(target: string | null, fallback = '/') {
  if (!target || !target.startsWith('/') || target.startsWith('//')) return fallback
  return target
}

export function LoginPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const login = useMutation({
    mutationFn: api.login,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['me'] })
      navigate(safeRedirect(params.get('redirectTo')), { replace: true })
    },
  })
  return <LoginForm onSubmit={(v) => login.mutate(v)} error={login.error?.message} />
}

export function useLogout() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return async () => {
    await api.logout()
    qc.clear() // drop every cached query from the previous user
    navigate('/login', { replace: true })
  }
}`,
        note: '`safeRedirect` blocks open redirects like `?redirectTo=https://evil.example` or `//evil.example`. `replace: true` keeps the login page out of history. Logout clears the whole cache.',
      },
    ],
    realCase: {
      title: 'A compromised analytics script and stolen tokens',
      story: `**Situation:** a B2B SaaS stored JWTs in \`localStorage\` and loaded a third-party chat widget. **Symptom:** security noticed API calls from unknown IPs using valid customer tokens. **Root cause:** the widget's CDN had been tampered with in a supply-chain incident affecting that (fictional) vendor; the injected script read \`localStorage\` and sent tokens out. **Fix:** sessions moved to httpOnly SameSite cookies via a backend-for-frontend, a strict Content Security Policy limited script sources, third-party scripts were loaded with integrity hashes, and all tokens were revoked. **Lesson:** assume some script will eventually run on your page; keep secrets where scripts can't reach them.`,
    },
    pitfalls: [
      'Storing long-lived tokens in `localStorage`.',
      'Trusting client-side role checks as authorisation.',
      'Redirecting to an unvalidated `redirectTo`, creating an open redirect.',
      'Not clearing the query cache on logout, leaking data to the next user.',
      'Treating 401 and 403 the same way, sending signed-in users without permission into a login loop.',
    ],
    exercise: {
      task: 'Implement `useSession()` returning a discriminated union `loading | anonymous | authenticated(user)`, a `RequireAuth` layout route that redirects with `redirectTo`, and a global 401 handler in the QueryClient that clears the cache and navigates to login.',
      hint: 'Use `QueryCache({ onError })` on the QueryClient to catch `UnauthorizedError` from any query.',
      solution: `\`\`\`tsx
type Session = { status: 'loading' } | { status: 'anonymous' } | { status: 'authenticated'; user: User }

export function useSession(): Session {
  const { data, isPending, error } = useQuery({ queryKey: ['me'], queryFn: api.getMe, retry: false })
  if (isPending) return { status: 'loading' }
  if (error instanceof UnauthorizedError || !data) return { status: 'anonymous' }
  return { status: 'authenticated', user: data }
}

export function RequireAuth() {
  const session = useSession()
  const location = useLocation()
  if (session.status === 'loading') return <FullPageSpinner />
  if (session.status === 'anonymous') {
    const to = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={\`/login?redirectTo=\${to}\`} replace />
  }
  return <Outlet />
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err) => {
      if (err instanceof UnauthorizedError) {
        queryClient.clear()
        router.navigate('/login')
      }
    },
  }),
})
\`\`\``,
    },
    interview: [
      'Compare httpOnly cookies and localStorage for session tokens. What threat does each protect against?',
      'What is CSRF and how does `SameSite` mitigate it?',
      'Why is a protected route in React not enough to protect data?',
    ],
  },
}

export default details
