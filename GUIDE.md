# Becoming a React Expert — A Hands-On Roadmap

This guide tells you **what to learn and what to build**, step by step. It does not give you code to copy.
You write every line yourself.

**Path:** JavaScript foundations → React fundamentals → real apps → architecture & performance → React internals → production & leadership.
**Stack (October 2026):** React 19.3, TypeScript 7, Vite 8, then Next.js 16.4 (App Router).
**How you'll prove expertise:** 8 projects of increasing difficulty, plus a capstone.

---

## Table of Contents

- [Levels Overview](#levels-overview)
- [Level 0 — JavaScript & Web Foundations](#level-0--javascript--web-foundations)
- [Level 1 — React Fundamentals](#level-1--react-fundamentals)
- [Level 2 — Hooks in Depth](#level-2--hooks-in-depth)
- [Level 3 — TypeScript with React](#level-3--typescript-with-react)
- [Level 4 — Routing, Forms & Data Fetching](#level-4--routing-forms--data-fetching)
- [Level 5 — State Management & Architecture](#level-5--state-management--architecture)
- [Level 6 — Styling & Component Design](#level-6--styling--component-design)
- [Level 7 — Testing](#level-7--testing)
- [Level 8 — Performance](#level-8--performance)
- [Level 9 — React Internals](#level-9--react-internals)
- [Level 10 — Modern React: Server Components & Next.js](#level-10--modern-react-server-components--nextjs)
- [Level 11 — Production Engineering](#level-11--production-engineering)
- [Level 12 — Expert & Leadership](#level-12--expert--leadership)
- [Capstone Project](#capstone-project)
- [Self-Assessment Checklist](#self-assessment-checklist)
- [Common Mistakes](#common-mistakes)
- [Resources](#resources)

---

## How to Use This Guide

- Work through the levels **in order**. Each one has a **Learn** list, a **Build** project, and a **✅ Checkpoint**.
- **Read the official docs at react.dev.** They are the best React learning material available. Do the exercises ("Challenges") at the end of every page.
- Create one folder per project in this repo (e.g. `01-tic-tac-toe/`, `02-weather/`). Commit at each checkpoint.
- Don't jump to libraries early. Build things by hand first (your own fetch hook, your own form state), and only then adopt the library that solves it. That's how you learn *why* the library exists.
- After each project, write a short `NOTES.md` in its folder: what was hard, what you'd do differently. This makes the learning stick.

- Topics marked **(stretch)** are optional. Skim them, note they exist, and come back later. Don't let them block your progress.
- **Versions move fast.** Before starting a level, check react.dev and the docs of each library for the current major version. Level 10 (Next.js) changes the most often. As of October 2026: React 19.3, Next.js 16.4, React Router 8, TypeScript 7, Vite 8, Vitest 5, Zod 4, MSW 3, Jotai 3. React is governed by the React Foundation (Linux Foundation) since February 2026.

**Rough timeline (part-time, ~10 h/week):** Levels 0–4 ≈ 3 months · Levels 5–8 ≈ 3 months · Levels 9–12 ≈ 3–6 months, plus ongoing practice.

---

## Levels Overview

| Level | Theme | You can… |
|---|---|---|
| 0 | JS foundations | Write modern JS confidently without React |
| 1–2 | Fundamentals & hooks | Build interactive UIs and explain re-renders |
| 3–4 | TS, routing, data | Build a typed, multi-page app with a real API |
| 5–6 | Architecture, styling | Structure a medium-sized codebase and design reusable components |
| 7–8 | Testing, performance | Ship reliable, fast apps and measure them |
| 9 | Internals | Explain *how* React works under the hood |
| 10 | Server Components | Build full-stack React with Next.js |
| 11–12 | Production & leadership | Own a frontend codebase, mentor others, make architecture calls |

---

## Level 0 — JavaScript & Web Foundations

React is "just JavaScript". Weak JS is the #1 reason people struggle with React.

**Can you skip this level?** Try these without looking anything up. If all are easy, go straight to Level 1.
- Given an array of orders, use `reduce` to group them by customer into an object.
- Update a nested object (`user.address.city`) without mutating the original.
- Explain what this logs and why: a `for` loop with `var i` that schedules `setTimeout(() => console.log(i))` three times.
- Write an `async` function that fetches two URLs in parallel, handles errors, and can be cancelled with `AbortController`.
- Explain why `[1, 2] === [1, 2]` is `false`.

**Learn:**
1. **Modern syntax:** `let`/`const`, arrow functions, template literals, destructuring, spread/rest, optional chaining (`?.`), nullish coalescing (`??`), ES modules (`import`/`export`).
2. **Arrays (must be fluent):** `map`, `filter`, `reduce`, `find`, `some`, `every`, `sort` (and why it mutates), `toSorted`, `slice` vs `splice`.
3. **Immutability:** how to update objects and arrays *without mutating* them (spread, `map`, `filter`, `structuredClone`). React depends on this.
4. **Reference vs value:** why `{} !== {}`, and why that matters for re-renders and dependency arrays.
5. **Closures and scope.** This is essential for understanding stale state in hooks.
6. **`this`, classes, and prototypes** (enough to read older code).
7. **Async:** the event loop, Promises, `async`/`await`, `fetch`, error handling, `AbortController`.
8. **DOM & events:** event bubbling and capturing, `preventDefault`, forms.
9. **HTML & CSS:** semantic HTML, Flexbox, Grid, responsive design, CSS custom properties.
10. **Tooling:** npm/pnpm, `package.json`, scripts, Node.js basics, Git.

**Build:** a **vanilla JS todo app** (no framework): add, toggle, delete, filter, save to `localStorage`. Notice how painful it is to keep the DOM in sync with your data. React solves exactly that.

✅ **Checkpoint:** you can explain closures and the event loop, and write `map`/`filter`/`reduce` transformations without looking anything up.

---

## Level 1 — React Fundamentals

**Setup:**
1. Install Node.js LTS.
2. Create a project with **Vite** (`npm create vite@latest`) using the **React + TypeScript** template.
3. Use TypeScript loosely until Level 3: type props with simple inline types and let inference do the rest. Don't fight the type checker yet. Level 3 tightens everything.
4. Enable the **React Compiler** (follow the "React Compiler → Installation" page on react.dev for Vite). With `@vitejs/plugin-react` 6+, you add the `reactCompilerPreset` through `@rolldown/plugin-babel`; the old `react({ babel: … })` option no longer exists, so ignore tutorials that use it. It automatically memoizes components and values, so you can write plain code without `useMemo`/`useCallback` from day one.
5. Set up **ESLint** with the flat config (`eslint.config.js`, which the Vite template already uses) and make sure **`eslint-plugin-react-hooks`** is enabled with its `recommended-latest` config. In current versions, this plugin also includes the React Compiler's rules and flags code the compiler can't optimize (impure renders, mutating props, and so on). Treat its warnings as lessons.

**Learn** (react.dev → *Learn* section, in order):
1. **Thinking in React:** break a UI mockup into a component tree; decide where state lives.
2. **JSX:** expressions in braces, `className`, self-closing tags, fragments, and how JSX compiles to function calls.
3. **Components & props:** passing data down, `children`, default values, props are read-only.
4. **Conditional rendering:** `&&`, ternaries, early returns (and the `0 &&` pitfall).
5. **Lists & keys:** why keys must be stable and unique, and why the array index is usually a bad key.
6. **Purity:** components must be pure functions of their props and state, with no side effects during render. Learn why `StrictMode` double-renders in development.
7. **Events:** handler props, passing handlers down, `e.stopPropagation()`.
8. **State (`useState`):** state as a snapshot, batching, updater functions (`setX(prev => ...)`), and updating objects and arrays immutably.
9. **Sharing state:** lifting state up, controlled vs uncontrolled inputs.
10. **Preserving & resetting state:** how state is tied to a *position in the tree*, and using `key` to reset a component.

**Build:** **Tic-Tac-Toe** (the react.dev tutorial), then extend it yourself:
- show "You are at move #N",
- render the board with two loops instead of hard-coded squares,
- add a toggle to sort the move history ascending/descending,
- highlight the three winning squares,
- show the (row, col) of each move in the history.

**Build #2:** a **Product filter table** from the "Thinking in React" page, built from scratch without looking at the solution.

✅ **Checkpoint:** you can explain what triggers a re-render, why mutating state doesn't work, and what keys are for.

---

## Level 2 — Hooks in Depth

**Learn:**
1. **`useEffect`:** for *synchronizing with external systems* only. Learn the dependency array, the cleanup function, and why effects run twice in StrictMode.
2. **"You Might Not Need an Effect"** (react.dev). Read it twice. Derive values during render instead of syncing state with effects. This is the most common mistake in React code.
3. **`useRef`:** DOM access, and storing mutable values that shouldn't trigger renders. Learn refs vs state.
4. **`useReducer`:** when state transitions get complex. Write reducers as pure functions and model actions as a discriminated union.
5. **`useContext`:** avoid prop drilling, provider patterns, and the cost (every consumer re-renders).
6. **`useMemo` / `useCallback` / `memo`:** learn what they do, because you'll read them in existing codebases. With the **React Compiler** enabled you rarely write them yourself. Use them manually only when the compiler can't optimize a component (the ESLint plugin tells you), or when you need a stable reference for a specific reason, such as an effect dependency.
7. **`useId`, `useLayoutEffect`, `useImperativeHandle`, `useSyncExternalStore`:** know when each is the right tool.
8. **React 19 hooks:** `use`, `useActionState`, `useFormStatus`, `useOptimistic`, `useTransition`, `useDeferredValue`.
9. **Rules of Hooks**, and *why* they exist (hooks are tracked by call order).
10. **Custom hooks:** extracting reusable stateful logic. Remember that custom hooks share *logic*, not *state*.

**Build:** a **Weather / Search app** using a public API (e.g. Open-Meteo, no key needed):
- a search input with **debouncing** (write your own `useDebounce` hook),
- your own `useFetch` hook with loading/error/data states, **AbortController cancellation**, and race-condition handling (typing fast must never show stale results),
- recent searches saved in `localStorage` via a custom `useLocalStorage` hook,
- a unit toggle (°C/°F) where the converted value is **derived during render, not stored**.

✅ **Checkpoint:** you can explain why your effect's dependency array contains what it contains, and you've removed every unnecessary effect.

---

## Level 3 — TypeScript with React

**Learn:**
1. TS basics: types vs interfaces, unions, literal types, generics, `unknown` vs `any`, narrowing, utility types (`Partial`, `Pick`, `Omit`, `Record`).
2. Typing props (including `children` as `React.ReactNode`), event handlers, refs, and `useState` with unions or null.
3. **Discriminated unions for UI state:** model `{status: 'loading'} | {status: 'error', error} | {status: 'success', data}` instead of three booleans.
4. Typing reducers and actions.
5. Typing context (and avoiding the `undefined` default with a custom hook that throws).
6. **Generic components:** e.g. a `<List<T>>` or `<Select<T>>` that's fully typed.
7. Extending native element props (`ComponentProps<'button'>`).
8. Validating runtime data at the boundary with **Zod** (v4: use the top-level formats like `z.email()`): API responses are `unknown` until validated.
9. `tsconfig` strict mode. Turn on `strict` and `noUncheckedIndexedAccess`.

**Build:** convert your Weather app to strict TypeScript with **zero `any`**, and validate API responses with Zod.

✅ **Checkpoint:** `tsc --noEmit` passes in strict mode; impossible UI states are unrepresentable in your types.

---

## Level 4 — Routing, Forms & Data Fetching

**Learn:**
1. **Routing** with **React Router** (or **TanStack Router** for type-safe routing): nested routes, layouts, params, search params as state, loaders/actions, 404 pages, protected routes, lazy-loaded routes.
2. **Server state vs client state.** They are different problems. Server state is a *cache*.
3. **TanStack Query:** queries, query keys, caching, `staleTime` vs `gcTime`, refetching, mutations, invalidation, **optimistic updates**, pagination and infinite queries, prefetching.
4. **Forms:** first build one by hand (controlled inputs, validation, error messages, touched state). Then learn **React Hook Form + Zod**, and React 19 form **Actions** (`useActionState`).
5. **Accessibility in forms:** labels, `aria-describedby` for errors, focus management on submit errors.
6. **Auth flows on the client:** where to store tokens (and why httpOnly cookies beat `localStorage`), redirect after login.

**Build:** a **Movie / Book catalog** (e.g. TMDB or Open Library API), or a frontend for the Tasks API from your [Rust backend guide](https://github.com/ahmadinsan10/rust-dekstop/blob/main/BACKEND_GUIDE.md):
- list page with search, filters and pagination **stored in the URL**,
- detail page with nested routes (overview / reviews tabs),
- a "favorites" feature with optimistic updates,
- a login form plus protected routes,
- an add/edit form with validation,
- proper loading skeletons, error states and empty states on every page.

✅ **Checkpoint:** refreshing any page keeps its state (from the URL); the back button works as expected; no request waterfalls you can't explain.

---

## Level 5 — State Management & Architecture

**Learn:**
1. **Where state should live**, from closest to widest: local → lifted → URL → context → external store → server cache. Always choose the closest that works.
2. **Context performance:** splitting contexts, separating state and dispatch contexts, memoizing provider values.
3. **External stores:** learn **Zustand** deeply (simple and recommended). Learn **Redux Toolkit** well enough to work in existing codebases, since it's still common in enterprise apps: slices, selectors and RTK Query. **(stretch)** **Jotai** (atomic state; in v3 `atomFamily` lives in `jotai-family` and `loadable` is replaced by `unwrap`).
4. **(stretch) State machines** with **XState** for complex flows (wizards, checkout, media players). You can model the checkout below with `useReducer` and a discriminated union instead.
5. **Project structure:** feature-based folders (`features/auth`, `features/cart`) instead of type-based (`components/`, `hooks/`). Use public APIs (`index.ts`) per feature and clear import boundaries.
6. **Separation of concerns:** UI components vs data hooks vs pure domain logic (testable without React).
7. **Dependency direction:** shared UI never imports from features. Enforce it with ESLint rules (e.g. `eslint-plugin-boundaries`).

**Build:** an **E-commerce store** (use the FakeStore API or DummyJSON):
- product catalog (TanStack Query),
- cart (Zustand, persisted),
- multi-step checkout modeled as a **state machine** (`useReducer`, or XState if you did the stretch topic),
- filters in the URL,
- a feature-based folder structure with enforced boundaries.

Then **rewrite the cart with Redux Toolkit** in a branch and compare. Write down what you think in `NOTES.md`.

✅ **Checkpoint:** you can justify where every piece of state lives.

---

## Level 6 — Styling & Component Design

**Learn:**
1. **Styling approaches**, with trade-offs: CSS Modules, **Tailwind CSS**, CSS-in-JS (and why runtime CSS-in-JS lost favor with Server Components), and vanilla-extract.
2. **Design tokens:** colors, spacing and typography as variables; light/dark themes.
3. **Component API design:**
   - composition over configuration (use `children`, not 30 props),
   - **compound components** (`<Tabs><Tabs.List/><Tabs.Panel/></Tabs>`),
   - controlled + uncontrolled support (a `value`/`defaultValue` pair),
   - polymorphic components (an `as` prop / `asChild`),
   - render props and slots,
   - forwarding refs (in React 19, `ref` is a regular prop).
4. **Headless UI libraries:** **Radix UI**, **React Aria**, and **shadcn/ui** (copy-in components built on Radix and Tailwind).
5. **Accessibility (a11y), in depth:** semantic HTML first, keyboard navigation, focus traps, ARIA only when needed, color contrast, screen-reader testing (NVDA on Windows), and the WAI-ARIA Authoring Practices patterns.
6. **Animation:** CSS transitions, **Motion** (formerly Framer Motion), React's stable `<ViewTransition>` (React 19.3: only Transition updates animate; learn enter/exit/share, View Transition Classes and `addTransitionType`), and respecting `prefers-reduced-motion`.
7. **Storybook:** develop and document components in isolation.

**Build:** your own **mini design system**: Button, Input, Select, Checkbox, Modal/Dialog, Tabs, Tooltip, Toast, Dropdown Menu, and DataTable (sorting, pagination, row selection).
- Build Dialog, Tabs and Menu **without** a headless library first. Make them fully keyboard-accessible and test them with a screen reader.
- Then compare your versions with Radix's and note what you missed.
- Document everything in Storybook with a light/dark theme toggle.

✅ **Checkpoint:** every component works with keyboard only and passes the axe accessibility checks.

---

## Level 7 — Testing

**Learn:**
1. **The testing trophy:** mostly integration tests, some unit tests, a few end-to-end (E2E) tests, plus static checks (TS, ESLint).
2. **Vitest** (v5): unit tests for pure logic and hooks. Know that mocks are cleared before each test and un-awaited async assertions fail.
3. **React Testing Library:** test behavior, not implementation. Query by role or label (`getByRole`), use `user-event`, and `findBy*` for async.
4. **Mock Service Worker (MSW 3):** mock the network at the boundary instead of mocking `fetch` or your hooks. Make unhandled requests fail with `onUnhandledFrame` (called `onUnhandledRequest` before v3).
5. **Testing hooks** (`renderHook`), context providers, and routing.
6. **Playwright:** E2E tests for critical user flows; also visual regression and accessibility checks (`@axe-core/playwright`).
7. **What not to test:** implementation details, third-party libraries, and snapshot tests of large trees.

**Build:** add tests to your e-commerce app:
- unit tests for cart logic (pure functions),
- integration tests for "search → filter → add to cart → see count update" (RTL + MSW),
- E2E tests for checkout (Playwright),
- a GitHub Actions workflow that runs lint, type-check and tests on every push.

✅ **Checkpoint:** you can refactor a component's internals without any tests breaking, and tests fail when behavior breaks.

---

## Level 8 — Performance

**Learn:**
1. **Measure first:** the React DevTools **Profiler** ("why did this render?"), the Chrome Performance panel, Lighthouse, and **Core Web Vitals** (LCP, INP, CLS).
2. **Re-render causes:** state changes, parent re-renders, context changes. Learn that "re-render" ≠ "DOM update".
3. **Fixes, in order of preference:**
   - make sure the **React Compiler** is actually optimizing the slow component (the DevTools show a "Memo ✨" badge on compiled components; the ESLint plugin explains why one was skipped). Fix the code so it compiles, instead of adding manual memoization,
   - move state down / lift content up (pass components as `children`),
   - split context,
   - manual `memo`, `useMemo`, `useCallback` only for cases the compiler can't handle, and only where profiling shows a benefit.
4. **Concurrent features:** `useTransition` and `useDeferredValue` to keep input responsive during heavy renders.
5. **Large lists:** virtualization (**TanStack Virtual**).
6. **Bundle size:** code splitting with `lazy` + `Suspense`, route-based splitting, analyzing the bundle (`rollup-plugin-visualizer`), tree-shaking, avoiding heavy dependencies.
7. **Network:** prefetching, caching, image optimization (sizes, formats, lazy loading), font loading.
8. **Web Workers** for CPU-heavy work.

**Build:** a **data-heavy dashboard**: 10,000+ row table with sorting, filtering and search, plus several charts (Recharts or visx), live-updating data (simulate with an interval or WebSocket).
1. Build it naively first, then **profile and record the numbers**.
2. Optimize step by step, recording before/after numbers for each change in `NOTES.md`.
3. Target: typing in search stays smooth (INP < 200 ms) on a throttled CPU (4× slowdown in DevTools).

✅ **Checkpoint:** you can show profiler evidence for each optimization you made, and you have no manual memoization that the compiler already covers.

---

## Level 9 — React Internals

This is what separates experts from advanced users: knowing *why*, not just *how*.

**Learn:**
1. **Virtual DOM & reconciliation:** the diffing heuristics (same type → update, different type → remount; keys for lists).
2. **Fiber architecture:** the fiber tree, work loop, render phase vs commit phase, why rendering is interruptible.
3. **Scheduling & lanes:** priorities, batching, how transitions get lower priority.
4. **How hooks are stored:** a linked list on the fiber, which explains the Rules of Hooks.
5. **Suspense mechanics:** throwing promises (and the `use` hook), boundaries, fallbacks.
6. **Hydration:** what it is, hydration mismatches, selective hydration, streaming SSR.
7. **Server Components protocol:** the RSC payload, client/server boundaries, serialization rules.
8. **The React Compiler:** what it memoizes automatically and what it requires from your code (purity!).

**Build:**
1. **Build your own mini-React** following Rodrigo Pombo's "Build your own React" (pomb.us/build-your-own-react): `createElement`, render, a concurrent work loop, fibers, reconciliation, function components, `useState`. Type it yourself and add `useEffect` on your own.
2. Read parts of the real React source on GitHub: `ReactFiberHooks`, `ReactFiberWorkLoop`, and `ReactChildFiber` (reconciliation).
3. Write a blog post or `NOTES.md` explaining reconciliation and keys in your own words.

✅ **Checkpoint:** you can explain, with a diagram, what happens between `setState` and the pixel changing on screen.

---

## Level 10 — Modern React: Server Components & Next.js

**Learn:**
1. **Rendering strategies:** CSR, SSR, SSG, ISR, streaming, and partial prerendering. Know when to use each.
2. **React Server Components:** server vs client components, the `'use client'` boundary, passing server components as `children` to client components, and what can't be serialized.
3. **Server Functions / Actions** (`'use server'`): mutations, revalidation, progressive enhancement, and their **security implications** (they are public endpoints, so validate and authorize every call).
> **Check versions first.** Next.js changes faster than anything else in this guide. Read the release notes for the current major version before starting. The points below describe Next.js 16.4.

4. **Next.js App Router:** layouts, loading/error/not-found files, route groups, parallel and intercepting routes, metadata/SEO, the `Image` and `Font` components, and **`proxy.ts`** (called `middleware.ts` before Next.js 16; it runs on the Node.js runtime by default, and `middleware.ts` is deprecated but you'll still see it in tutorials and older projects).
5. **Caching with Cache Components:** in current Next.js, everything is **dynamic by default** and you opt in to caching explicitly:
   - enable Cache Components with `cacheComponents: true` and `partialPrefetching: true` in `next.config.ts` (already on in new `create-next-app` projects since 16.4, and the default in Next.js 17),
   - mark cached functions, components or pages with the **`'use cache'`** directive,
   - control lifetime with **`cacheLife`** and tag entries with **`cacheTag`**,
   - invalidate with `revalidateTag` / `updateTag` after mutations,
   - wrap uncached dynamic parts in `<Suspense>` so the static shell streams first (**Partial Prerendering**),
   - use `ensureStatic` to make the build fail if dynamic content sneaks into the shell.

   Older tutorials describe four implicit cache layers (request memoization, data cache, full-route cache, router cache) and `fetch` caching options. Recognize that model when you meet it in existing code, but learn the explicit `'use cache'` model first. This is the hardest part of Next.js, so experiment until it's clear.
6. **Data layer:** an ORM (Prisma or Drizzle) with Postgres, and auth (Auth.js or Better Auth).
7. Alternatives worth knowing: **React Router v8 framework mode** (formerly Remix; import from `react-router`, since `react-router-dom` is gone) and **TanStack Start**.

**Build:** a **full-stack app in Next.js**, e.g. a blog/CMS or a project-management board (Trello-like):
- server components for reading data, Server Actions for mutations,
- authentication with roles,
- drag-and-drop (dnd-kit) with optimistic updates,
- streaming with Suspense boundaries,
- SEO metadata and Open Graph images,
- deployed to Vercel (or self-hosted with Docker).

✅ **Checkpoint:** you can explain, for any piece of your UI, whether it renders on the server or the client and why, whether it's cached (`'use cache'`) or dynamic, and which tag invalidates it.

---

## Level 11 — Production Engineering

**Learn:**
1. **Code quality:** ESLint flat config shared across the monorepo (`eslint-plugin-react-hooks` with the compiler rules, `jsx-a11y`), Prettier (or Biome), strict TS, Husky + lint-staged pre-commit hooks.
2. **CI/CD:** lint → type-check → test → build → preview deploys per pull request.
3. **Error handling:** error boundaries (at route and widget level), reporting with **Sentry**, user-friendly fallbacks.
4. **Observability:** Real User Monitoring of Web Vitals, analytics, feature flags.
5. **Security:** XSS (and why `dangerouslySetInnerHTML` is dangerous), sanitization (DOMPurify), Content Security Policy (and Trusted Types, which React 19.3 supports), CSRF, secrets never in client bundles, dependency auditing (`npm audit`, Renovate/Dependabot).
6. **Internationalization:** react-intl or i18next, pluralization, date/number formatting, right-to-left layouts.
7. **Monorepos:** pnpm workspaces + **Turborepo** (or Nx) for sharing a UI library across apps.
8. **(stretch) PWA & offline:** service workers, caching strategies.
9. **(stretch) Micro-frontends** (Module Federation): know when they're worth the complexity, which is rarely.
10. **(stretch) React Native** basics: the same React mental model on mobile (Expo).

**Build:** turn your Next.js app into a production-grade monorepo:
- `apps/web` (Next.js), `apps/docs` (Storybook), `packages/ui` (your design system from Level 6), `packages/config` (shared ESLint/TS configs),
- Sentry, i18n (English plus a second language of your choice; if possible, pick one with different plural rules or a right-to-left script to test your setup properly), a CSP header, Renovate,
- full CI with preview deployments.

✅ **Checkpoint:** a new developer can clone the repo, run one command, and have everything working; every PR is automatically checked.

---

## Level 12 — Expert & Leadership

Expertise is also about judgment and helping others.

**Do:**
1. **Read great code:** the source of TanStack Query, Zustand, Radix UI and React Hook Form. Understand their design decisions.
2. **Contribute to open source:** start with docs fixes and "good first issue" labels in React ecosystem libraries.
3. **Publish an npm package:** e.g. a hook or component from your design system, with types, tests, docs, semantic versioning and a changelog (Changesets).
4. **Write & teach:** blog posts, talks at local meetups, mentoring juniors, and answering questions on Stack Overflow, Reddit or Discord.
5. **Review code:** practice giving PR reviews focused on correctness, accessibility, performance and maintainability, not just style.
6. **Architecture decisions:** write ADRs (Architecture Decision Records) for choices like state library, rendering strategy or styling approach.
7. **Stay current:** follow the React blog, RFCs (github.com/reactjs/rfcs), React Conf talks, and newsletters like *This Week in React*.
8. **Interview-level depth:** be able to live-code common components (autocomplete, modal, infinite scroll, data table) and explain the trade-offs out loud.

✅ **Checkpoint:** you've shipped at least one package or OSS contribution, and you can lead a technical discussion about frontend architecture.

---

## Capstone Project

Build one substantial app that combines everything. Pick one:

- **Real-time collaborative whiteboard / kanban:** multiplayer presence and cursors (WebSockets, Liveblocks or Yjs), offline support, undo/redo.
- **SaaS analytics dashboard:** multi-tenant auth, role-based access, large data tables and charts, CSV export, billing page (Stripe test mode).
- **Learning platform:** courses, video player, progress tracking, quizzes, admin CMS, i18n.

**Requirements:**
- TypeScript strict, zero `any`.
- Server Components + Server Actions (or a separate API such as your Rust/Axum backend).
- Your own design system package.
- Accessibility: WCAG 2.2 AA, verified with axe and manual keyboard and screen-reader testing.
- Tests: unit + integration + E2E for critical flows, running in CI.
- Performance budget: Lighthouse ≥ 90 on mobile; documented Core Web Vitals.
- Error monitoring, ADRs for the main decisions, and a polished README with architecture diagrams.
- Deployed publicly.

---

## Self-Assessment Checklist

You're an expert when you can confidently:

- [ ] Explain the render and commit phases and what triggers a re-render
- [ ] Explain why keys matter, with an example where an index key causes a bug
- [ ] Remove unnecessary `useEffect`s from someone else's code
- [ ] Diagnose and fix a stale-closure bug
- [ ] Choose where state should live, and defend the choice
- [ ] Design a compound component API that's flexible and accessible
- [ ] Build an accessible modal, combobox and menu from scratch
- [ ] Profile a slow app and fix it with evidence
- [ ] Explain Server vs Client Components and the serialization boundary
- [ ] Explain Next.js caching layers and revalidation
- [ ] Prevent race conditions in data fetching
- [ ] Write tests that survive refactors
- [ ] Set up a monorepo with shared packages and CI
- [ ] Secure an app against XSS and leaked secrets
- [ ] Build a mini-React from scratch
- [ ] Mentor someone through all of the above

---

## Common Mistakes

| Mistake | Better approach |
|---|---|
| Copying props into state | Derive during render; use `key` to reset |
| `useEffect` to compute derived values | Compute directly in the component body (or `useMemo` if expensive) |
| `useEffect` to respond to events | Put the logic in the event handler |
| Fetching in effects without cleanup | AbortController / ignore flag, or TanStack Query |
| Mutating state (`arr.push`, `obj.x = 1`) | Create new arrays/objects |
| Array index as key for dynamic lists | Stable unique IDs |
| Giant components (500+ lines) | Split by responsibility; extract hooks |
| One huge global context | Split contexts, or use an external store with selectors |
| `memo`/`useCallback` everywhere "just in case" | Enable the React Compiler and keep components pure; memoize manually only where profiling shows a need |
| Storing tokens in `localStorage` | httpOnly, Secure, SameSite cookies |
| `div` with `onClick` as a button | Use `<button>`; semantic HTML first |
| Testing implementation details | Test what the user sees and does |
| Ignoring loading/error/empty states | Design all states explicitly (discriminated unions) |

---

## Resources

**Official**
- react.dev: Learn + Reference (the most important resource)
- react.dev/blog: release notes and deep dives
- nextjs.org/learn: the official Next.js course
- typescriptlang.org/docs/handbook

**Courses & books**
- *Epic React*: Kent C. Dodds
- *Joy of React*: Josh W. Comeau
- *The Road to React*: Robin Wieruch
- *Total TypeScript*: Matt Pocock (React + TS workshops)
- *Testing JavaScript*: Kent C. Dodds
- *Advanced React*: Nadia Makarevich (book + blog developerway.com, excellent on re-renders and performance)

**Deep dives**
- *Build your own React*: Rodrigo Pombo (pomb.us)
- *React Fiber Architecture*: Andrew Clark (GitHub)
- Dan Abramov's *overreacted.io* (e.g. "A Complete Guide to useEffect")
- TkDodo's blog (tkdodo.eu): TanStack Query best practices
- patterns.dev: React and rendering patterns
- WAI-ARIA Authoring Practices Guide (w3.org/WAI/ARIA/apg)
- web.dev: performance and Core Web Vitals

**Stay current**
- *This Week in React* newsletter
- React Conf and Next.js Conf talks (YouTube)
- github.com/reactjs/rfcs
