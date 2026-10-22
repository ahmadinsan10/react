import type { TopicDetail } from '../types'

const details: Record<string, TopicDetail> = {
  strategies: {
    explanation: `A rendering strategy answers two questions: **where** does the HTML get produced (browser or server) and **when** (at build time, per request, or progressively while data arrives). Every strategy is a trade-off between freshness, time-to-first-byte, interactivity cost and infrastructure cost.

### The classic four

- **CSR (client-side rendering)**: the server sends an almost empty HTML file plus a JS bundle. The browser downloads, parses and executes the bundle, then fetches data, then paints. Cheap to host (static files), great for app-like dashboards behind a login, poor for SEO and slow first paint on weak devices.
- **SSR (server-side rendering)**: the server runs React per request and returns full HTML. Users see content sooner, crawlers get real markup, but every request costs server CPU and the page is not interactive until hydration finishes.
- **SSG (static site generation)**: HTML is rendered once at build time and served from a CDN. Fastest possible TTFB, but data is only as fresh as the last build. Incremental regeneration (revalidating a page after N seconds or on demand) narrows that gap.
- **Streaming SSR**: instead of waiting for the slowest query, the server flushes the shell immediately and streams the rest as each \`<Suspense>\` boundary resolves. The browser receives HTML chunks plus small inline scripts that swap fallbacks for real content.

### Partial Prerendering (PPR)

PPR combines SSG and streaming in a single route: everything that does not depend on the request (layout, navigation, product description) is prerendered into a **static shell** served from the edge, while request-dependent holes (cart count, personalised recommendations) are wrapped in Suspense and streamed from the server in the same response. In Next.js 16 this model is what Cache Components builds on: cached parts become part of the shell, uncached dynamic parts become streamed holes. Confirm the exact configuration flag in the current Next.js docs, since the naming has moved between releases.

### How to choose

Pick per **route segment**, not per app. Ask: does this content depend on the request (cookies, headers, search params)? How stale may it be? Does it need SEO? A marketing page is static; a product page is a static shell with a dynamic price/stock hole; an admin table might be fully dynamic or even client-rendered.

### When not to reach for SSR

SSR is not free: it adds server cost, cold starts, and hydration work. An internal tool behind auth with heavy interactivity often does fine with CSR plus good code-splitting. Conversely, don't ship a CSR landing page and then wonder why Largest Contentful Paint is 4 seconds on mid-range phones.`,
    examples: [
      {
        title: '❌ Whole page blocked by the slowest query vs ✅ streamed with Suspense',
        code: `// ❌ The entire page waits for recommendations (slow ML service, ~1.5s)
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProduct(id)          // 40ms
  const recs = await getRecommendations(id)     // 1500ms
  return (
    <>
      <ProductInfo product={product} />
      <Recommendations items={recs} />
    </>
  )
}

// ✅ Shell + product stream immediately; recommendations fill in later
import { Suspense } from 'react'

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProduct(id)
  return (
    <>
      <ProductInfo product={product} />
      <Suspense fallback={<RecsSkeleton />}>
        <Recommendations productId={id} />
      </Suspense>
    </>
  )
}

async function Recommendations({ productId }: { productId: string }) {
  const items = await getRecommendations(productId)
  return <RecsGrid items={items} />
}`,
        note: 'Moving the slow await into a child component wrapped in Suspense lets the server flush everything above the boundary first. TTFB and LCP now depend on the fast query, not the slowest one.',
      },
      {
        title: 'Deciding strategy per segment',
        code: `// app/(marketing)/pricing/page.tsx  -> fully static, cached in the shell
// app/products/[id]/page.tsx         -> static shell + dynamic stock/price hole
// app/dashboard/page.tsx             -> dynamic (reads cookies for the session)
// app/editor/page.tsx                -> mostly a client component island

import { cookies } from 'next/headers'

export default async function Dashboard() {
  const session = (await cookies()).get('session')?.value // request data => dynamic
  const stats = await getStatsFor(session)
  return <StatsPanel stats={stats} />
}`,
        note: 'Reading cookies, headers or searchParams is what makes a segment request-dependent. Keep those reads as deep in the tree as possible so the rest can stay static.',
      },
    ],
    realCase: {
      title: 'A slow carousel took the whole product page down',
      story: `**Situation:** a mid-size online retailer rendered product pages with SSR. A new "you may also like" carousel called an internal recommendation service.

**Symptom:** p75 TTFB jumped from 180ms to 1.6s overnight; conversion on mobile dropped noticeably.

**Root cause:** the page component awaited the recommendation call before returning any JSX, so the server could not send a single byte until the slowest dependency answered.

**Fix:** the carousel became its own async component inside \`<Suspense>\` with a skeleton, and the static product description moved into the cached shell. TTFB returned to under 200ms; the carousel arrived ~1s later without blocking anything.

**Lesson:** in streaming architectures, every top-level await is a decision about what blocks the first byte. Push slow, non-critical data behind Suspense boundaries.`,
    },
    pitfalls: [
      'Treating the whole app as one strategy. Strategy is a per-route (even per-component) decision.',
      'Awaiting slow, non-essential data at the top of a page, blocking the stream for everything else.',
      'Using SSR for authenticated, highly interactive tools where CSR would be simpler and cheaper.',
      'Assuming static means stale forever: on-demand revalidation can keep static content fresh after mutations.',
      'Placing a Suspense boundary so high that the fallback replaces the entire page, which looks identical to blocking.',
    ],
    exercise: {
      task: 'Take a news article page that awaits the article (fast), comments (slow) and a "trending" sidebar (slow) sequentially. Restructure it so the article renders first and comments and trending stream independently.',
      hint: 'Each slow piece should be an async component inside its own Suspense boundary. Also check whether the two slow fetches run in parallel.',
      solution: `\`\`\`tsx
import { Suspense } from 'react'

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await getArticle(slug)
  return (
    <main>
      <Article article={article} />
      <Suspense fallback={<p>Loading comments…</p>}>
        <Comments articleId={article.id} />
      </Suspense>
      <aside>
        <Suspense fallback={<TrendingSkeleton />}>
          <Trending />
        </Suspense>
      </aside>
    </main>
  )
}

async function Comments({ articleId }: { articleId: string }) {
  const comments = await getComments(articleId)
  return <CommentList comments={comments} />
}

async function Trending() {
  return <TrendingList items={await getTrending()} />
}
\`\`\`

Because the two boundaries are siblings, React starts both fetches during the same render pass and each streams in as soon as it resolves; neither waits for the other.`,
    },
    interview: [
      'Compare SSR, SSG, streaming SSR and Partial Prerendering in terms of TTFB, freshness and server cost.',
      'What makes a route segment dynamic in the Next.js App Router, and how do you keep most of the page static anyway?',
      'When would you deliberately choose client-side rendering for a new screen today?',
    ],
  },

  rsc: {
    explanation: `React Server Components (RSC) split your component tree into two kinds of components that run in different environments.

### Server Components

In the App Router, every component is a Server Component unless its module (or an ancestor module in the import graph) starts with \`'use client'\`. Server Components:

- run only on the server (at build time or per request), never in the browser;
- can be \`async\` and \`await\` data directly: a database query, a file read, a secret-bearing API call;
- ship **zero JavaScript** for their own code; their output is serialized into the **RSC payload**, a streamable description of the rendered tree;
- cannot use state, effects, refs to DOM, or event handlers, because there is no living instance on the client.

### Client Components

A file marked \`'use client'\` declares a **boundary**: that module and everything it imports become part of the client bundle. Client Components still render on the server for the initial HTML (SSR), then hydrate in the browser. Use them for interactivity: \`useState\`, \`useEffect\`, browser APIs, event handlers.

### The boundary rules

1. **Props crossing server to client must be serializable**: strings, numbers, plain objects, arrays, Dates, Maps/Sets, promises, JSX, and Server Functions. Not class instances, not arbitrary functions.
2. **A Client Component cannot import a Server Component**: the import would pull it into the client bundle. Instead, a Server Component renders the Client Component and passes server-rendered JSX in as \`children\` or another prop. The client receives already-rendered output, a "hole" it can place anywhere.
3. **Push \`'use client'\` to the leaves.** Marking a whole layout as client drags every child into the bundle. Mark just the button, the dropdown, the chart.

### Under the hood

When a route is requested, React renders the server tree into the RSC payload. For client components it emits a reference (module id + export name) plus their props. On the client, React reads the stream, loads the referenced client modules, and reconciles. On client-side navigations only the RSC payload is fetched, so client state in shared layouts survives.

### Security and data

Since Server Components can touch the DB, they are tempting places to over-fetch. Everything you pass as a prop to a Client Component ends up in the payload visible in the browser. Pass \`user.name\`, not the whole \`user\` row with password hash and internal flags. Marking server-only modules with \`import 'server-only'\` makes an accidental client import fail at build time.

### When not to use RSC

Highly interactive widgets (editors, canvases) are naturally client components. RSC shines for content-heavy, data-driven UI where most of the tree is display.`,
    examples: [
      {
        title: "❌ 'use client' on the layout vs ✅ client leaf with server children",
        code: `// ❌ app/dashboard/layout.tsx
'use client'
import { useState } from 'react'
import { Sidebar } from './sidebar'          // now client too
export default function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return <div>{open && <Sidebar />}<button onClick={() => setOpen(o => !o)}>Toggle</button>{children}</div>
}

// ✅ app/dashboard/layout.tsx  (Server Component)
import { CollapsibleShell } from './collapsible-shell'
import { Sidebar } from './sidebar'           // stays on the server, can query the DB
export default function Layout({ children }: { children: React.ReactNode }) {
  return <CollapsibleShell sidebar={<Sidebar />}>{children}</CollapsibleShell>
}

// app/dashboard/collapsible-shell.tsx
'use client'
import { useState } from 'react'
export function CollapsibleShell({ sidebar, children }: { sidebar: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="shell">
      {open && sidebar}
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}>Toggle sidebar</button>
      {children}
    </div>
  )
}`,
        note: 'Only the toggle logic is shipped to the browser. The Sidebar is rendered on the server and passed in as a JSX prop: the client shell places it but never imports it.',
      },
      {
        title: '❌ Leaking a DB row vs ✅ a DTO for the client',
        code: `// ❌ The whole row, including passwordHash and stripeCustomerId, is serialized
import { db } from '@/lib/db'
import { ProfileCard } from './profile-card' // 'use client'
export default async function Page() {
  const user = await db.user.findFirstOrThrow()
  return <ProfileCard user={user} />
}

// ✅ Shape exactly what the client needs
import 'server-only'
export async function getProfileDTO(userId: string) {
  const u = await db.user.findUniqueOrThrow({ where: { id: userId } })
  return { name: u.name, avatarUrl: u.avatarUrl, joined: u.createdAt.toISOString() }
}`,
        note: 'Props to client components are visible in the RSC payload in DevTools. A data-access layer returning minimal DTOs prevents accidental exposure.',
      },
    ],
    realCase: {
      title: 'Bundle size tripled after one innocent line',
      story: `**Situation:** a SaaS team added a theme toggle to the root layout of their Next.js app.

**Symptom:** first-load JS on every route rose from ~95 kB to ~310 kB; Lighthouse TBT regressed on all pages.

**Root cause:** the developer put \`'use client'\` at the top of \`app/layout.tsx\` to use \`useState\`. Every component imported by the layout (header, footer, markdown renderer, a date library) became client code.

**Fix:** extracted a small \`ThemeToggle\` client component and a \`ThemeProvider\` that accepts \`children\`. The layout went back to being a Server Component.

**Lesson:** \`'use client'\` marks a module-graph boundary, not a single component. Keep it on the smallest leaf that needs interactivity and check the bundle analyzer in CI.`,
    },
    pitfalls: [
      'Importing a Server Component from a Client Component; pass it as children instead.',
      'Passing non-serializable props (class instances, functions that are not Server Functions) across the boundary.',
      "Putting 'use client' high in the tree, turning large subtrees into client JS.",
      'Passing full database rows to client components and leaking sensitive fields in the payload.',
      'Thinking Client Components do not render on the server: they do, for SSR, so browser-only APIs still need guarding.',
    ],
    exercise: {
      task: 'Build a product page where the product details come from the DB in a Server Component, and an "Add to wishlist" heart button is interactive. Keep the client bundle minimal.',
      hint: 'Only the heart button needs state. Pass it a serializable productId and initial state.',
      solution: `\`\`\`tsx
// app/products/[id]/page.tsx
import { getProduct } from '@/lib/products'
import { WishlistButton } from './wishlist-button'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await getProduct(id)
  return (
    <article>
      <h1>{p.title}</h1>
      <p>{p.description}</p>
      <WishlistButton productId={p.id} initiallySaved={p.savedByViewer} />
    </article>
  )
}

// app/products/[id]/wishlist-button.tsx
'use client'
import { useOptimistic, useTransition } from 'react'
import { toggleWishlist } from './actions'

export function WishlistButton({ productId, initiallySaved }: { productId: string; initiallySaved: boolean }) {
  const [saved, setSaved] = useOptimistic(initiallySaved)
  const [, start] = useTransition()
  return (
    <button aria-pressed={saved} onClick={() => start(async () => { setSaved(!saved); await toggleWishlist(productId) })}>
      {saved ? '♥ Saved' : '♡ Save'}
    </button>
  )
}
\`\`\``,
    },
    interview: [
      'Why can a Client Component render a Server Component passed as children but not import one?',
      'What exactly is in the RSC payload, and what does that imply for security?',
      'How does client state in a layout survive navigation in the App Router?',
    ],
  },

  actions: {
    explanation: `A **Server Function** is an async function marked with \`'use server'\` (either at the top of a file, making every export one, or inside the function body). React and the framework compile it into a **reference**: the client gets an opaque id, and calling the function sends an HTTP POST to the server with serialized arguments. When used as a form \`action\` or via \`useActionState\`, it is often called a **Server Action**.

### The most important fact

A Server Function is a **public HTTP endpoint**. Anyone who can find its id (it's in your client JS) can call it with any arguments they like, from curl, without your UI. Hiding the button for non-admins protects nothing. TypeScript types protect nothing at runtime. Therefore every Server Function must:

1. **Authenticate**: who is calling? Read the session server-side.
2. **Validate** input with a runtime schema (Zod, Valibot). Treat \`FormData\` as untrusted strings.
3. **Authorize**: is *this* user allowed to act on *this* resource? Check ownership, not just "is logged in".
4. **Mutate**, then **revalidate** caches that show the changed data.
5. Return a serializable, minimal result (errors for the form, never stack traces).

### Integration with React 19

- \`<form action={serverFn}>\` works without JavaScript (progressive enhancement) and receives \`FormData\`.
- \`useActionState(fn, initialState)\` gives you the returned state and a \`pending\` flag; the function receives \`(prevState, formData)\`.
- \`useFormStatus\` inside a child gives the pending status of the parent form, ideal for submit buttons.
- \`useOptimistic\` shows the expected result while the request is in flight.

### Closures and bound arguments

Inline Server Functions defined inside a Server Component can close over variables; the framework encrypts closed-over values sent to the client, but you should still not rely on them for authorization. Prefer \`fn.bind(null, id)\` for passing ids, and re-check permission for that id on the server.

### When not to use them

Server Functions are for **mutations** triggered by your own UI. For reading data, fetch in Server Components. For public APIs, webhooks or third-party consumers, use Route Handlers with explicit contracts. Server Functions run sequentially per client by default in Next.js, so they are not a good fit for parallel data fetching.`,
    examples: [
      {
        title: '❌ Trusting the client vs ✅ validate, authenticate, authorize',
        code: `// ❌ app/projects/actions.ts
'use server'
import { db } from '@/lib/db'
export async function deleteProject(id: string) {
  await db.project.delete({ where: { id } })   // anyone can delete any project
}

// ✅ app/projects/actions.ts
'use server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const Input = z.object({ id: z.string().uuid() })

export async function deleteProject(raw: unknown) {
  const session = await auth()
  if (!session) return { ok: false as const, error: 'Not signed in' }

  const parsed = Input.safeParse(raw)
  if (!parsed.success) return { ok: false as const, error: 'Invalid input' }

  const project = await db.project.findUnique({ where: { id: parsed.data.id }, select: { ownerId: true } })
  if (!project || project.ownerId !== session.user.id) {
    return { ok: false as const, error: 'Not found' } // do not reveal existence
  }

  await db.project.delete({ where: { id: parsed.data.id } })
  revalidatePath('/projects')
  return { ok: true as const }
}`,
        note: 'The parameter is typed unknown on purpose: runtime data is untrusted. Ownership is checked against the session, not a userId sent by the client.',
      },
      {
        title: 'Form with useActionState and useFormStatus',
        code: `'use client'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createInvoice, type InvoiceState } from './actions'

function Submit() {
  const { pending } = useFormStatus()
  return <button disabled={pending}>{pending ? 'Saving…' : 'Create invoice'}</button>
}

export function InvoiceForm() {
  const [state, formAction] = useActionState<InvoiceState, FormData>(createInvoice, { errors: {} })
  return (
    <form action={formAction}>
      <input name="customer" aria-invalid={!!state.errors.customer} />
      {state.errors.customer && <p role="alert">{state.errors.customer}</p>}
      <input name="amount" inputMode="decimal" />
      <Submit />
    </form>
  )
}`,
        note: 'createInvoice receives (prevState, formData) and returns field errors. useFormStatus must live in a child of the form to read its pending state.',
      },
    ],
    realCase: {
      title: 'Hidden admin button, exposed admin endpoint',
      story: `**Situation:** a fictional B2B platform added a "promote to admin" action in its team settings. The button only rendered when \`viewer.role === 'owner'\`.

**Symptom:** a security researcher reported that a regular member could escalate privileges.

**Root cause:** the Server Action \`promoteUser(userId)\` only checked that a session existed. The action id was visible in the client chunk; replaying the POST with another member's id worked for any signed-in user.

**Fix:** the action now loads the team membership of the caller and requires the owner role for the target's team, validates input with Zod, and logs the change in an audit table. A lint rule and code-review checklist require an auth helper call at the top of every \`'use server'\` export.

**Lesson:** UI visibility is not authorization. Treat each Server Function like a REST endpoint you would expose publicly.`,
    },
    pitfalls: [
      'Relying on hidden UI or TypeScript types instead of server-side authorization.',
      'Accepting a userId or role from the client instead of reading it from the session.',
      'Forgetting to revalidate caches after a mutation, so the UI shows stale data.',
      'Returning raw errors or whole DB records to the client.',
      'Using Server Functions for data fetching; they are designed for mutations and are queued per client.',
    ],
    exercise: {
      task: 'Write a `renameWorkspace(prev, formData)` Server Action for a useActionState form. Name must be 3–50 chars, caller must be an admin of the workspace, and the workspace page must refresh.',
      hint: 'Validate FormData with Zod, look up membership by session user id plus workspace id, then revalidate.',
      solution: `\`\`\`ts
'use server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const Schema = z.object({ workspaceId: z.string().uuid(), name: z.string().trim().min(3).max(50) })
export type RenameState = { error?: string; ok?: boolean }

export async function renameWorkspace(_prev: RenameState, formData: FormData): Promise<RenameState> {
  const session = await auth()
  if (!session) return { error: 'Please sign in' }

  const parsed = Schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const membership = await db.membership.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId: parsed.data.workspaceId } },
  })
  if (membership?.role !== 'admin') return { error: 'Not allowed' }

  await db.workspace.update({ where: { id: parsed.data.workspaceId }, data: { name: parsed.data.name } })
  revalidatePath(\`/w/\${parsed.data.workspaceId}\`)
  return { ok: true }
}
\`\`\``,
    },
    interview: [
      'Why is a Server Function considered a public endpoint, and what checks does each one need?',
      'How do useActionState, useFormStatus and useOptimistic fit together in a form?',
      'When would you use a Route Handler instead of a Server Action?',
    ],
  },

  'app-router': {
    explanation: `The App Router maps folders in \`app/\` to URL segments, and special file names in each folder to roles in a nested React tree.

### The special files

- \`page.tsx\`: makes the segment routable; the leaf UI.
- \`layout.tsx\`: wraps children and **persists across navigations** between its child routes (state preserved, not re-rendered on navigation).
- \`template.tsx\`: like a layout but remounts on every navigation (useful for enter animations or per-page effects).
- \`loading.tsx\`: automatically wraps the page in \`<Suspense fallback={<Loading/>}>\`.
- \`error.tsx\`: a client error boundary for the segment; receives \`error\` and a \`reset\` function. \`global-error.tsx\` covers the root layout.
- \`not-found.tsx\`: rendered when \`notFound()\` is called.
- \`route.ts\`: a Route Handler (GET/POST functions) instead of a page.

Nesting is the key: for \`/shop/shoes\`, React renders RootLayout > ShopLayout > (loading boundary) > (error boundary) > ShoesPage. An error in the page is caught by the nearest error file without taking the layout down.

### Organising routes

- **Route groups** \`(marketing)\` organise folders and share layouts without affecting the URL.
- **Dynamic segments** \`[id]\`, catch-all \`[...slug]\`, optional \`[[...slug]]\`. In current Next.js, \`params\` and \`searchParams\` are **promises**: \`const { id } = await params\`.
- **Parallel routes** \`@modal\`, \`@analytics\`: named slots rendered side by side by a layout, each with its own loading/error states.
- **Intercepting routes** \`(.)photo/[id]\`: show a route in the current context (a modal over the feed) on soft navigation, but render the full page on hard load or refresh.

### Metadata, images and fonts

Export \`metadata\` or \`generateMetadata\` from pages/layouts for titles, Open Graph and canonical URLs. \`next/image\` handles responsive sizes, lazy loading and avoids layout shift via required dimensions. \`next/font\` self-hosts fonts at build time, removing the external request and reducing CLS.

### proxy.ts

Next.js 16 renamed \`middleware.ts\` to \`proxy.ts\` (exporting a \`proxy\` function). It runs before routing for matched paths: redirects, rewrites, setting headers, coarse auth gating, A/B bucketing. Keep it light; it runs on every matched request. Do **not** treat it as your only auth check: data access and Server Functions must still verify the session. Check the current docs for runtime defaults and the codemod for migrating.`,
    examples: [
      {
        title: 'A segment with layout, loading, error and not-found',
        code: `// app/orders/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getOrder } from '@/lib/orders'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: \`Order #\${id}\` }
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await getOrder(id)
  if (!order) notFound()
  return <OrderDetails order={order} />
}

// app/orders/[id]/error.tsx
'use client'
export default function OrderError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert">
      <p>We could not load this order.</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}`,
        note: 'error.tsx must be a Client Component. The error boundary sits inside the layout, so navigation and header keep working when the page fails.',
      },
      {
        title: 'proxy.ts for coarse auth redirects',
        code: `// proxy.ts (project root, replaces middleware.ts in Next.js 16)
import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has('session')
  if (!hasSession && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*'] }`,
        note: 'This is an optimistic check (cookie presence) for fast redirects. The real verification still happens in the data layer and every Server Action.',
      },
    ],
    realCase: {
      title: 'Modal photo route broke on refresh',
      story: `**Situation:** a photo-sharing side project opened photos in a modal from the feed using an intercepting route \`@modal/(.)photo/[id]\`.

**Symptom:** sharing a photo link and opening it directly showed an empty feed with no modal, or a 404.

**Root cause:** there was no regular \`app/photo/[id]/page.tsx\`. Interception only applies on soft navigation; a hard load needs a real page. The \`@modal\` slot also lacked a \`default.tsx\`, so unmatched states rendered nothing predictable.

**Fix:** added the full-page route and \`@modal/default.tsx\` returning \`null\`.

**Lesson:** intercepting routes are an enhancement layer over real routes. Always design the hard-navigation version first.`,
    },
    pitfalls: [
      'Forgetting that params and searchParams are promises in current Next.js and must be awaited.',
      'Making error.tsx a Server Component; it must be a Client Component.',
      'Expecting a layout to re-render on navigation; use template.tsx or read params in the page.',
      'Using proxy.ts as the only authorization layer.',
      'Parallel route slots without default.tsx, causing 404s on hard navigation.',
    ],
    exercise: {
      task: 'Create an `app/(shop)/products/[slug]` route with loading skeleton, error boundary with retry, a not-found page for missing slugs, and generated metadata including an Open Graph image.',
      hint: 'notFound() from next/navigation; generateMetadata awaits params just like the page.',
      solution: `\`\`\`tsx
// app/(shop)/products/[slug]/loading.tsx
export default function Loading() { return <div className="skeleton h-96" aria-busy="true" /> }

// app/(shop)/products/[slug]/not-found.tsx
export default function NotFound() { return <p>That product does not exist.</p> }

// app/(shop)/products/[slug]/page.tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getProductBySlug } from '@/lib/products'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug)
  if (!p) return { title: 'Not found' }
  return { title: p.title, openGraph: { images: [p.imageUrl] } }
}

export default async function Page({ params }: Props) {
  const p = await getProductBySlug((await params).slug)
  if (!p) notFound()
  return <ProductView product={p} />
}
\`\`\`
Plus an error.tsx with 'use client' and a reset button as in the example above.`,
    },
    interview: [
      'Walk through the component tree Next.js builds for a nested route with layouts, loading and error files.',
      'How do intercepting and parallel routes combine to build a shareable modal?',
      'What belongs in proxy.ts and what must not rely on it?',
    ],
  },

  'cache-components': {
    explanation: `Older App Router versions had an **implicit** caching model: fetch results were cached by default, routes were statically rendered unless something dynamic was detected, and there were four layers (request memoization, data cache, full route cache, client router cache) interacting in ways many teams found surprising. With **Cache Components** in Next.js 16, the model is inverted and made explicit.

### Dynamic by default

When Cache Components is enabled (a flag in \`next.config\`; check the current docs for its exact name), nothing is cached unless you say so. Data fetching runs at request time. To keep the page fast, any uncached, request-time work must sit inside a \`<Suspense>\` boundary: the prerendered **static shell** is served immediately and the dynamic holes stream in. If uncached data is accessed outside Suspense, Next.js reports an error at build/dev time so you make a conscious choice.

### Opting in: 'use cache'

Put \`'use cache'\` at the top of an async function, a component, or a whole file. The return value is cached, keyed by the function's identity and its **serializable arguments** (and closed-over values). Inside a cached scope you cannot read request APIs like \`cookies()\` or \`headers()\` directly; read them outside and pass the values you need as arguments (which then become part of the key). Variants such as \`'use cache: private'\` and \`'use cache: remote'\` exist for per-user or shared remote caches; confirm their current semantics in the docs.

### Lifetime: cacheLife

\`cacheLife('hours')\` or a custom profile \`{ stale, revalidate, expire }\` controls freshness. *stale* is how long the client may use it without checking; *revalidate* is when the server refreshes it in the background; *expire* is the hard limit after which a request waits for fresh data.

### Invalidation: cacheTag, revalidateTag, updateTag

Tag entries with \`cacheTag('product-42', 'products')\`. After a mutation:

- \`updateTag(tag)\` (Server Actions only) expires the entry and makes the next read in the same request wait for fresh data: **read-your-own-writes**, ideal when the user must immediately see their change.
- \`revalidateTag(tag, profile)\` marks entries stale with stale-while-revalidate semantics: the next visitor may still see old data while it refreshes. Good for content where eventual consistency is fine, or from Route Handlers and webhooks.

### Recognising the old model

You will meet code using \`fetch(url, { next: { revalidate: 60 } })\`, \`export const revalidate = 60\`, \`export const dynamic = 'force-static'\` and \`unstable_cache\`. These belong to the previous model; learn to read them and migrate gradually.`,
    examples: [
      {
        title: 'Cached product data with tags and a lifetime',
        code: `// lib/products.ts
import { cacheLife, cacheTag } from 'next/cache'
import { db } from '@/lib/db'

export async function getProduct(id: string) {
  'use cache'
  cacheLife('hours')
  cacheTag(\`product-\${id}\`, 'products')
  return db.product.findUnique({ where: { id }, select: { id: true, title: true, price: true, description: true } })
}`,
        note: 'The id argument is part of the cache key. The tags let a mutation invalidate exactly this product or every product.',
      },
      {
        title: '❌ Stale after save vs ✅ updateTag for read-your-own-writes',
        code: `// ❌ Admin saves a new price, the page still shows the old one until the cache expires
'use server'
export async function updatePrice(id: string, price: number) {
  await requireAdmin()
  await db.product.update({ where: { id }, data: { price } })
}

// ✅
'use server'
import { updateTag } from 'next/cache'
import { z } from 'zod'

export async function updatePrice(raw: unknown) {
  await requireAdmin()
  const { id, price } = z.object({ id: z.string(), price: z.number().positive() }).parse(raw)
  await db.product.update({ where: { id }, data: { price } })
  updateTag(\`product-\${id}\`) // the admin's redirect/refresh sees the new price immediately
}`,
        note: 'Without invalidation the cached entry lives until cacheLife expires. updateTag is meant for Server Actions where the actor must see their change; revalidateTag suits webhooks and background refresh.',
      },
      {
        title: 'Static shell with a dynamic hole',
        code: `import { Suspense } from 'react'
import { cookies } from 'next/headers'

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProduct(id)       // cached -> part of the shell
  return (
    <>
      <ProductInfo product={product} />
      <Suspense fallback={<CartBadgeSkeleton />}>
        <CartBadge />                         {/* per-user, uncached */}
      </Suspense>
    </>
  )
}

async function CartBadge() {
  const cartId = (await cookies()).get('cart')?.value
  const count = cartId ? await countItems(cartId) : 0
  return <span aria-label={\`\${count} items in cart\`}>{count}</span>
}`,
        note: 'cookies() is request data, so CartBadge is dynamic and must be inside Suspense. The product info is cached and prerendered.',
      },
    ],
    realCase: {
      title: 'Edited article kept showing the old headline',
      story: `**Situation:** an editorial team at a fictional publisher migrated to Cache Components. Article loaders used \`'use cache'\` with \`cacheLife('days')\`.

**Symptom:** editors fixed a typo in a headline, got a success toast, and still saw the typo for hours; readers saw it too.

**Root cause:** the save action wrote to the DB but never invalidated anything; the loader had no \`cacheTag\` at all, so nothing could target it.

**Fix:** loaders tag \`article-\${slug}\` and \`articles\`; the editor action calls \`updateTag\` for the article so the editor sees the change at once, and the CMS webhook calls \`revalidateTag('articles', 'max')\` for listing pages.

**Lesson:** every \`'use cache'\` needs an invalidation story decided at the same time: which tag, which mutation, read-your-writes or stale-while-revalidate.`,
    },
    pitfalls: [
      'Calling cookies() or headers() inside a "use cache" scope; read them outside and pass values as arguments.',
      'Caching without tags, leaving no way to invalidate after mutations.',
      'Using revalidateTag where the user must immediately see their own change; prefer updateTag in Server Actions.',
      'Passing large or non-serializable arguments that bloat or break the cache key.',
      'Mixing old route segment config (dynamic, revalidate exports) with the new model without understanding which is active.',
    ],
    exercise: {
      task: 'Make a blog index cached for one hour, each post cached per slug, and invalidate correctly when an author publishes or edits a post via a Server Action.',
      hint: 'Two tags: a per-post tag and a shared list tag. Which invalidation API gives the author read-your-writes?',
      solution: `\`\`\`ts
// lib/posts.ts
import { cacheLife, cacheTag } from 'next/cache'
export async function listPosts() {
  'use cache'
  cacheLife('hours')
  cacheTag('posts')
  return db.post.findMany({ where: { published: true }, orderBy: { publishedAt: 'desc' } })
}
export async function getPost(slug: string) {
  'use cache'
  cacheLife('hours')
  cacheTag(\`post-\${slug}\`)
  return db.post.findUnique({ where: { slug } })
}

// app/admin/actions.ts
'use server'
import { updateTag } from 'next/cache'
export async function savePost(raw: unknown) {
  const user = await requireAuthor()
  const data = PostSchema.parse(raw)
  await db.post.update({ where: { slug: data.slug, authorId: user.id }, data })
  updateTag(\`post-\${data.slug}\`)
  updateTag('posts')
}
\`\`\``,
    },
    interview: [
      'Explain how "use cache" builds its cache key and why request APIs cannot be read inside it.',
      'When would you choose updateTag versus revalidateTag?',
      'How does Cache Components change the default behaviour compared to the older implicit caching model?',
    ],
  },

  'data-layer': {
    explanation: `Server Components let you query the database from a component, but "can" is not "should do it everywhere". Production apps centralise data access in a **data access layer (DAL)**: a set of server-only modules that own the DB client, authentication checks, authorization rules and DTO shaping.

### ORMs: Prisma and Drizzle

- **Prisma** uses a schema file (\`schema.prisma\`), generates a typed client, and has a mature migration workflow. Very ergonomic, a larger runtime footprint historically (check the current docs on its newer query-compiler architecture).
- **Drizzle** defines tables in TypeScript, produces SQL-like queries with full type inference, has a small runtime and works well in serverless and edge environments.

Both work with Postgres, the default sensible choice for relational data. In serverless, use a pooled connection (PgBouncer, a provider pooler, or an HTTP driver) and instantiate the client once per process (a module-level singleton, guarded against hot reload in dev).

### Auth libraries

**Auth.js** (formerly NextAuth) and **Better Auth** handle OAuth providers, sessions, CSRF and adapters for your DB. Whatever you pick, wrap it in a single helper such as \`getCurrentUser()\` (memoised per request with React's \`cache()\`) and call it from the DAL, from Server Actions and from Route Handlers. A redirect in \`proxy.ts\` or a layout is only a UX optimisation: layouts do not re-run on every navigation and are not a security boundary.

### DAL shape

1. \`import 'server-only'\` at the top so client imports fail at build.
2. Functions take ids, read the current user, check permissions, query, and return DTOs.
3. Pages and actions call DAL functions, never the raw DB client.

This gives you one place to audit security, add caching (\`'use cache'\` on functions without per-user data) and swap infrastructure.

### Framework alternatives

Next.js is not the only RSC-era option. **React Router framework mode** (the successor of Remix) uses route modules with \`loader\` and \`action\` functions, strong progressive enhancement and web-standard Request/Response. **TanStack Start** builds on TanStack Router with end-to-end type-safe server functions and flexible SSR. Choose based on team familiarity, hosting, and how much you want the framework to own caching and data.`,
    examples: [
      {
        title: 'A server-only data access layer',
        code: `// lib/dal.ts
import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export const getCurrentUser = cache(async () => {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return session.user
})

export async function getInvoice(invoiceId: string) {
  const user = await getCurrentUser()
  const inv = await db.invoice.findFirst({
    where: { id: invoiceId, org: { members: { some: { userId: user.id } } } },
    select: { id: true, number: true, total: true, status: true, dueDate: true },
  })
  return inv // null when it doesn't exist OR the user cannot see it
}`,
        note: "React cache() deduplicates getCurrentUser within one request. Authorization is part of the query, so there is no path that returns another org's invoice.",
      },
      {
        title: 'Drizzle schema and a typed query',
        code: `// db/schema.ts
import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core'

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  priceCents: integer('price_cents').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// lib/products.ts
import 'server-only'
import { desc } from 'drizzle-orm'
import { db } from '@/db'
import { products } from '@/db/schema'

export function latestProducts(limit = 20) {
  return db.select({ id: products.id, title: products.title, priceCents: products.priceCents })
    .from(products).orderBy(desc(products.createdAt)).limit(limit)
}`,
        note: 'Selecting explicit columns doubles as DTO shaping. Store money as integer cents to avoid floating-point errors.',
      },
    ],
    realCase: {
      title: 'Layout auth check, unprotected page data',
      story: `**Situation:** a fictional HR tool checked the session in \`app/(app)/layout.tsx\` and redirected anonymous users.

**Symptom:** a pentest showed that fetching the RSC payload of \`/employees/[id]\` with a crafted request returned salary data for employees in other companies.

**Root cause:** the page queried \`db.employee.findUnique({ where: { id } })\` directly. The layout check only ensured *someone* was signed in, and did not scope data by organisation.

**Fix:** a DAL with \`getEmployee(id)\` that filters by the caller's organisation, plus an ESLint restriction forbidding imports of the DB client outside \`lib/dal\`.

**Lesson:** authorization belongs next to the data, not in layouts or routing.`,
    },
    pitfalls: [
      'Doing auth checks only in layouts or proxy.ts instead of in each data access.',
      'Creating a new ORM client per request or per hot reload, exhausting DB connections.',
      'Returning whole rows to components instead of explicit DTOs.',
      'Caching per-user data in a shared cache scope.',
      'Choosing a framework for hype rather than hosting, team skills and data needs.',
    ],
    exercise: {
      task: 'Create a DAL function `listMyProjects()` and a Server Action `archiveProject(id)` that both enforce that the current user is a member of the project\'s team. Use React cache() for the current user.',
      hint: 'Put the membership condition inside the where clause rather than checking afterwards.',
      solution: `\`\`\`ts
import 'server-only'
import { cache } from 'react'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export const currentUser = cache(async () => {
  const s = await auth()
  if (!s?.user) throw new Error('UNAUTHENTICATED')
  return s.user
})

export async function listMyProjects() {
  const u = await currentUser()
  return db.project.findMany({
    where: { archived: false, team: { members: { some: { userId: u.id } } } },
    select: { id: true, name: true, updatedAt: true },
  })
}

// actions.ts
'use server'
export async function archiveProject(id: string) {
  const u = await currentUser()
  const res = await db.project.updateMany({
    where: { id, team: { members: { some: { userId: u.id, role: { in: ['owner', 'admin'] } } } } },
    data: { archived: true },
  })
  if (res.count === 0) return { error: 'Not found' }
  revalidatePath('/projects')
  return { ok: true }
}
\`\`\``,
    },
    interview: [
      'What is a data access layer in an RSC app and what responsibilities does it own?',
      'Compare Prisma and Drizzle for a serverless Postgres deployment.',
      'Why is a session check in a layout not sufficient for authorization?',
    ],
  },
}

export default details
