# React Mastery: interactive learning app

A web app for the roadmap in [`../GUIDE.md`](../GUIDE.md): lessons, interactive visualizations, quizzes with spaced repetition, and a progress tracker.

## Features

- **13 levels, 86 deep lessons**: each with a full explanation, bad-vs-good code examples, a real-world production case, pitfalls, an exercise with solution and interview questions
- **20 interactive visualizations**, each with a guided walkthrough, real-code mapping, a real-world case and challenges; several running live React code you can break on purpose: event loop, references, re-render propagation, keys, batching, effect lifecycle, stale closures, fetch race conditions, impossible UI states, state placement, the testing trophy, a query cache, focus management in dialogs, XSS sanitization, `useTransition` with measured input lag, virtualization, the fiber work loop, hooks as a linked list, rendering strategies (CSR/SSR/SSG/streaming/PPR), and the `'use client'` boundary
- **69 quiz questions** with explanations and shuffled answer options
- **Spaced repetition** (Leitner boxes: 1, 3, 7, 16, 35 days), plus a review queue and a mixed exam mode
- **Progress tracker**: weighted per-level progress, streak, 6-month activity heatmap, roadmap map, a projected finish date, per-level notes with autosave, and the expert checklist
- **Command palette** (`Ctrl+K` or `/`) that searches every lesson, demo and question
- **Bilingual: English and Bahasa Indonesia.** Every lesson, quiz, visualization and the whole interface. The Indonesian is written natively (see `src/i18n/STYLE-ID.md`), not machine-translated; code examples are byte-identical across languages (enforced by tests)
- Dark/light themes, responsive layout, keyboard support, and accessible markup
- **Cross-device sync** (Vercel Function + Upstash Redis) with three-way merge and conflict-safe writes; also syncs across tabs, and JSON export/import
- **App-like**: installable (web app manifest), works offline (service worker), bottom tab bar on phones, collapsible sidebar, Back restores scroll position

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest unit tests (progress logic, content integrity, markdown renderer)
npm run build      # type-check + production build into dist/
npm run compiler:report   # which components the React Compiler optimized or skipped, and why
```

### Toolchain (October 2026)

React 19.3 · React Router 8 · TypeScript 7 (native compiler) · Vite 8 (Rolldown) · Vitest 5, all at their latest releases.

- **React Compiler** is enabled the current way for `@vitejs/plugin-react` 6: `babel({ presets: [reactCompilerPreset()] })` with `@rolldown/plugin-babel` (the old `react({ babel: … })` option was removed in v6). Components the compiler skips still work; `npm run compiler:report` lists them. Several skips are deliberate: some demos break the rules of React on purpose (reading refs during render, mutating module state) to show what happens.
- **ESLint is not set up yet**: typescript-eslint needs TypeScript's programmatic API, which TypeScript 7 doesn't have until 7.1. Add `eslint-plugin-react-hooks` (`recommended-latest`) once typescript-eslint supports TS 7.

## Deploy to Vercel

1. In Vercel, choose **Add New → Project** and import this repository.
2. Set **Root Directory** to `web`. Vercel detects Vite automatically (build: `npm run build`, output: `dist`).
3. Deploy. `vercel.json` rewrites every non-API path to `index.html`, so deep links like `/lab/fiber` work.

### Enable cross-device sync (Upstash Redis, free tier)

1. In the Vercel project, open **Storage → Create Database → Upstash for Redis** (Marketplace) and connect it to the project. This adds the `KV_REST_API_URL` and `KV_REST_API_TOKEN` environment variables.
2. Redeploy (Deployments → ⋯ → Redeploy) so the function picks up the variables.
3. In the app, open **Settings → Sync across devices → Turn on sync**, then enter the same key on your other devices.

Until the database is connected, the app works fully offline/locally and the sync panel shows "Sync is not configured on the server yet". A manually created Upstash database also works: set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` instead.

### How sync works

- **No accounts.** A random 120-bit sync key identifies your progress. The server stores data under the SHA-256 hash of the key, never the key itself. Treat the key like a password.
- **Three-way merge.** Each device keeps the last snapshot it agreed on with the server. Changes since then are merged per item: checkmarks and notes take the side that changed them (so un-checking syncs too), quiz cards take the most recent answer, and activity counts are added together.
- **No lost writes.** Every write is an atomic compare-and-set on a revision number (a Lua script in Redis). If another device wrote first, the server answers 409 with its data, and the client merges and retries.
- **When it syncs:** about 1.5 s after a change, when the tab regains focus or comes back online, when it is hidden, and every minute.
- `npm run dev` serves the same API from an in-memory store (see `vite.config.ts`), so sync can be tried locally.

## Structure

```
src/
  data/        levels (lessons, projects, checkpoints), quiz bank, checklist
  data/details lazily loaded deep lesson content per level; vizGuides.ts walkthroughs
  store/       pure progress logic (tested) + useSyncExternalStore store
  sync/        sync client, three-way merge (tested)
api/           Vercel Function for sync (_handler.ts is shared with dev server and tests)
  components/  layout, command palette, quiz runner, markdown renderer, UI primitives
  pages/       dashboard, roadmap, level, lab, review/exam, checklist, settings
  viz/         one lazily loaded module per visualization
```
