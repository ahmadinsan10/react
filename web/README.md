# React Mastery: interactive learning app

A web app for the roadmap in [`../GUIDE.md`](../GUIDE.md): lessons, interactive visualizations, quizzes with spaced repetition, and a progress tracker.

## Features

- **13 levels** of lessons, from JavaScript foundations to React internals and production engineering
- **17 interactive visualizations**, several running live React code you can break on purpose: event loop, references, re-render propagation, keys, batching, effect lifecycle, stale closures, fetch race conditions, impossible UI states, state placement, the testing trophy, `useTransition` with measured input lag, virtualization, the fiber work loop, hooks as a linked list, rendering strategies (CSR/SSR/SSG/streaming/PPR), and the `'use client'` boundary
- **69 quiz questions** with explanations and shuffled answer options
- **Spaced repetition** (Leitner boxes: 1, 3, 7, 16, 35 days), plus a review queue and a mixed exam mode
- **Progress tracker**: weighted per-level progress, streak, 6-month activity heatmap, roadmap map, a projected finish date, per-level notes with autosave, and the expert checklist
- **Command palette** (`Ctrl+K` or `/`) that searches every lesson, demo and question
- Dark/light themes, responsive layout, keyboard support, and accessible markup
- Progress is stored in `localStorage` and syncs across tabs. You can export and import it as JSON to move between devices.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest unit tests (progress logic, content integrity, markdown renderer)
npm run build      # type-check + production build into dist/
```

## Deploy to Vercel

1. Push this repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Set **Root Directory** to `web`. Vercel detects Vite automatically (build: `npm run build`, output: `dist`).
4. Deploy. `vercel.json` rewrites every path to `index.html`, so deep links like `/lab/fiber` work.

Or use the CLI from this folder: `npx vercel` (preview) and `npx vercel --prod`.

## Structure

```
src/
  data/        levels (lessons, projects, checkpoints), quiz bank, checklist
  store/       pure progress logic (tested) + useSyncExternalStore store
  components/  layout, command palette, quiz runner, markdown renderer, UI primitives
  pages/       dashboard, roadmap, level, lab, review/exam, checklist, settings
  viz/         one lazily loaded module per visualization
```
