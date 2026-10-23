# Verified facts for the October 2026 content update

Sources checked on 2026-10-23: npm registry, react.dev/blog/2026/09/09/react-19-3, nextjs.org/blog/next-16-4, remix.run/blog/react-router-v8, react.dev/learn/react-compiler/installation, github.com/mswjs/msw/releases/tag/v3.0.0, jotai docs/guides/migrating-to-v3.mdx, @vitejs/plugin-react 6 README. Use ONLY these facts for new claims; do not invent APIs.

## Current versions (npm, 2026-10-23)
react / react-dom 19.3.1 · next 16.4.2 · react-router 8.5.0 · @tanstack/react-query 5.104 · @tanstack/react-router 1.170 · zustand 5.0 · @reduxjs/toolkit 2.13 · jotai 3.0 · xstate 5.33 · zod 4.6 · react-hook-form 7.90 · typescript 7.0.2 · vite 8.3 · vitest 5.0 · @testing-library/react 16.3 · msw 3.0 · @playwright/test 1.64 · storybook 10.6

## React 19.3 (Sept 9, 2026)
- `<ViewTransition>` from 'react' is **stable** (DOM). Animates enter / exit / update / share. Only updates inside a Transition animate (`startTransition`, a `<Suspense>` reveal, or `useDeferredValue`). Default is a cross-fade; customize with View Transition Classes passed to `enter`, `exit`, `update`, `share`, `default` (e.g. `default="none"`, `update="auto"`) and CSS, or with `onEnter`/`onExit`/`onShare`/`onUpdate`. Enter/exit only animate when the `<ViewTransition>` is the first thing rendered in its subtree before any DOM node; shared `name`s must be unique.
- `addTransitionType(type)` (from 'react'), called inside `startTransition`, lets `enter`/`exit` take a map like `{ next: 'from-right', previous: 'from-left' }`; types are also exposed to CSS via `:active-view-transition-type(...)`.
- Wrapping `<Suspense>` in `<ViewTransition>` animates fallback → content.
- **Fragment refs stable**: `<Fragment ref={ref}>` gives a `FragmentInstance` with `addEventListener/removeEventListener/dispatchEvent`, `focus/focusLast/blur`, `observeUsing/unobserveUsing` (IntersectionObserver/ResizeObserver), `getClientRects`, `getRootNode`, `compareDocumentPosition`, `scrollIntoView`. No wrapper DOM needed.
- `browser()` from 'react-dom', used as `use(browser())`: opts a component out of server rendering (suspends on the server so the nearest Suspense fallback is in the HTML; renders normally on the client). Can be called conditionally.
- Server Components can render a Context (created in a 'use client' module) directly: `<UserContext value={user}>{children}</UserContext>`.
- Trusted Types support: React passes TrustedHTML/TrustedScript/TrustedScriptURL through to the DOM.
- Behavior: Transitions now render independently (a slow one no longer blocks unrelated ones); StrictMode double-invokes effects during hydration too; `useActionState` errors say "action state".
- React 19.2 (Oct 2025) added `<Activity>` and `useEffectEvent`. React Compiler 1.0 stable (Oct 2025).
- React is governed by the **React Foundation** (Linux Foundation) since Feb 2026.

## React Compiler setup (current)
- Vite with @vitejs/plugin-react **6+** (the inline `react({ babel: … })` option was REMOVED in v6):
```ts
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
})
```
  install: `npm install -D @rolldown/plugin-babel @babel/core babel-plugin-react-compiler`
- Experimental alternative: `react({ compiler: true })` uses a Rust port (`oxc-transform-react`, optional peer dep). Mark as experimental.
- Next.js: `reactCompiler: true` in next.config.ts; experimental Rust compiler via `experimental.turbopackRustReactCompiler: true` (16.3+).
- ESLint: `eslint-plugin-react-hooks@latest`, preset **`recommended-latest`** (includes compiler rules). Violations make the compiler skip that component only.

## Next.js 16.4 (Oct 6, 2026)
- Cache Components is now **recommended for every app** and **enabled by default in new `create-next-app` projects**; it becomes the default in Next.js 17. Enable with `cacheComponents: true` and `partialPrefetching: true` in next.config.ts.
- New `export const ensureStatic = 'navigation' | 'prefetch' | 'shell'` (page or layout) fails the build if dynamic content sneaks into that stage.
- New `await navigation()` and `await prefetch()` from 'next/cache' defer cached work out of a prefetch / out of the shell.
- `proxy.ts` (renamed from middleware in 16.0) defaults to the Node.js runtime; `middleware.ts` is deprecated (still works for Edge cases).
- Ships React 19.3. `next upgrade --agent` exists.
- Existing APIs: `'use cache'`, `cacheLife`, `cacheTag`, `revalidateTag`, `updateTag`; variants `'use cache: private'` and `'use cache: remote'`.

## React Router v8 (June 17, 2026; latest 8.5)
- `react-router-dom` package **removed**: import from `react-router` (DOM-specific bits from `react-router/dom`).
- ESM-only; minimums Node 22.22, React 19.2.7, Vite 7.
- Former v8 future flags are now defaults: **middleware on by default**, trailing-slash-aware data requests, pass-through requests, Vite Environment API; `splitRouteModules` is a top-level config, on by default.
- Meta APIs: `data` param removed, use `loaderData`.
- Three modes: declarative (simple client router), data mode, framework mode (Remix's successor). v6 and Remix v2 are end-of-life; v7 gets security fixes. Yearly majors.

## TypeScript 7 (July 8, 2026; 7.0.2)
- First stable release of the native Go compiler ("Corsa"): ~8–12× faster full builds; same `tsc` command (`npm i -D typescript`).
- No stable programmatic API until 7.1; tools needing it (Vue/Svelte/Astro/Angular template checking) still use TypeScript 6.
- JS emit downlevels only to ES2021 and has no decorator emit yet.

## Vite 8 (Mar 2026)
- Rolldown (Rust) replaces the esbuild + Rollup pair for dev and build; Oxc for parsing/transform/minify. Node 20.19+/22.12+. Built-in tsconfig `paths` support.

## Vitest 5 (Sept 2026)
- Requires Node 22.12+ and Vite 6.4+. **Mocks are cleared before each test by default.** **Un-awaited async assertions now fail.** `expect.poll` fails at timeout. Config files are no longer searched in parent folders. Inline projects extend root config.

## MSW 3
- ESM-only, Node 22+. `msw/native` removed. `graphql` moved to `msw/graphql`. `worker.stop()` returns a Promise. Option `onUnhandledRequest` renamed **`onUnhandledFrame`**. New `msw/utils` entry (e.g. `delay`, `passthrough`), a Vite plugin, navigation/form interception. `http` + `HttpResponse` handlers and `setupServer` from 'msw/node' are unchanged.

## Jotai 3
- `atomFamily` moved to the separate **`jotai-family`** package (`import { atomFamily } from 'jotai-family'`).
- `loadable` removed: use **`unwrap`** from 'jotai/utils'.
- `setSelf` removed (no direct replacement; `onMount` or jotai-effect). `delay` option removed. ESM-only. Core `atom`/`useAtom`/`useAtomValue`/`useSetAtom` unchanged.

## Zod 4
- Top-level string formats: **`z.email()`**, **`z.url()`**, `z.uuid()`, `z.iso.datetime()` etc. The `z.string().email()` style is deprecated. Error customization uses `{ error: '…' }` (the `message` param is deprecated).
- Verified (zod.dev/v4/changelog): `z.iso.date()` exists; method forms like `z.string().email()` still work but are deprecated; `ZodError.flatten()` is deprecated, use top-level `z.treeifyError()`; `message` param is deprecated in favour of `error`.
