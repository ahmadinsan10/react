import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export type VizMeta = {
  id: string
  title: string
  summary: string
  titleId?: string
  summaryId?: string
  level: number
  kind: 'Animated' | 'Live React' | 'Interactive'
  Component: LazyExoticComponent<ComponentType>
}

// Each visualization is its own chunk: the Lab loads only what you open.
export const VIZ: VizMeta[] = [
  { id: 'event-loop', title: 'The Event Loop', level: 0, kind: 'Animated', summary: 'Step through the call stack, microtask and macrotask queues to predict console output.', titleId: 'Event Loop', summaryId: 'Telusuri call stack, antrean microtask dan macrotask langkah demi langkah untuk menebak output console.', Component: lazy(() => import('./EventLoop')) },
  { id: 'references', title: 'References vs Values', level: 0, kind: 'Animated', summary: 'See why mutation keeps the same reference, and why spread creates a new one.', titleId: 'Referensi vs Nilai', summaryId: 'Lihat kenapa mutasi tetap memakai referensi yang sama, dan kenapa spread membuat referensi baru.', Component: lazy(() => import('./References')) },
  { id: 'render-tree', title: 'Re-render Propagation', level: 1, kind: 'Interactive', summary: 'Trigger state and context updates and watch which components re-render — with and without memoization.', titleId: 'Rambatan Re-render', summaryId: 'Picu update state dan context, lalu amati component mana saja yang re-render, dengan dan tanpa memoization.', Component: lazy(() => import('./RenderTree')) },
  { id: 'keys', title: 'Keys & Reconciliation', level: 1, kind: 'Live React', summary: 'A real list with per-row state. Break it with index keys, fix it with IDs.', titleId: 'Key & Reconciliation', summaryId: 'List sungguhan dengan state di tiap baris. Rusak dengan key index, perbaiki dengan ID.', Component: lazy(() => import('./Keys')) },
  { id: 'batching', title: 'State Snapshots & Batching', level: 1, kind: 'Live React', summary: 'Why setCount(count + 1) three times only adds one, and how updates are batched.', titleId: 'Snapshot State & Batching', summaryId: 'Kenapa setCount(count + 1) tiga kali hanya menambah satu, dan bagaimana update di-batch.', Component: lazy(() => import('./Batching')) },
  { id: 'effect-timeline', title: 'Effect Lifecycle', level: 2, kind: 'Live React', summary: 'A live log of effect setup and cleanup as dependencies change, including StrictMode.', titleId: 'Siklus Hidup Effect', summaryId: 'Log langsung setup dan cleanup effect saat dependency berubah, termasuk di StrictMode.', Component: lazy(() => import('./EffectTimeline')) },
  { id: 'stale-closure', title: 'Stale Closures', level: 2, kind: 'Live React', summary: 'Timers that capture old state, and the ref and updater fixes.', titleId: 'Stale Closure', summaryId: 'Timer yang menangkap state lama, beserta solusinya dengan ref dan updater.', Component: lazy(() => import('./StaleClosure')) },
  { id: 'race-condition', title: 'Fetch Race Conditions', level: 2, kind: 'Live React', summary: 'Type fast and watch slow responses overwrite newer ones — then fix it with cleanup.', titleId: 'Race Condition saat Fetch', summaryId: 'Ketik cepat dan lihat response lambat menimpa yang lebih baru, lalu perbaiki dengan cleanup.', Component: lazy(() => import('./RaceCondition')) },
  { id: 'ui-states', title: 'Impossible UI States', level: 3, kind: 'Interactive', summary: 'Booleans vs a discriminated union, as a clickable state machine.', titleId: 'State UI yang Mustahil', summaryId: 'Kumpulan boolean vs discriminated union, dalam bentuk state machine yang bisa diklik.', Component: lazy(() => import('./UiStates')) },
  { id: 'query-cache', title: 'Inside a Query Cache', level: 4, kind: 'Interactive', summary: 'Mount components, tune staleTime and gcTime, and watch dedupe, refetch-on-focus and invalidation happen.', titleId: 'Di Balik Query Cache', summaryId: 'Mount component, atur staleTime dan gcTime, lalu lihat dedupe, refetch saat focus, dan invalidation terjadi.', Component: lazy(() => import('./QueryCache')) },
  { id: 'state-placement', title: 'Where Should State Live?', level: 5, kind: 'Interactive', summary: 'A decision tree that classifies any piece of state into the right home.', titleId: 'Di Mana State Sebaiknya Disimpan?', summaryId: 'Pohon keputusan untuk menentukan tempat yang tepat bagi setiap jenis state.', Component: lazy(() => import('./StatePlacement')) },
  { id: 'focus-trap', title: 'Accessible Dialog Focus', level: 6, kind: 'Live React', summary: 'Turn focus management features on one by one and watch a live focus log as you Tab through a dialog.', titleId: 'Focus pada Dialog yang Aksesibel', summaryId: 'Aktifkan fitur pengelolaan focus satu per satu dan pantau log focus saat kamu menekan Tab di dalam dialog.', Component: lazy(() => import('./FocusTrap')) },
  { id: 'testing-trophy', title: 'The Testing Trophy', level: 7, kind: 'Interactive', summary: 'What each layer of testing is for, and how much of each to write.', titleId: 'Testing Trophy', summaryId: 'Fungsi tiap lapisan testing, dan seberapa banyak test yang perlu kamu tulis di tiap lapisan.', Component: lazy(() => import('./TestingTrophy')) },
  { id: 'transition', title: 'useTransition vs Blocking', level: 8, kind: 'Live React', summary: 'Measure real input lag on a slow list with normal updates, transitions and deferred values.', titleId: 'useTransition vs Blocking', summaryId: 'Ukur lag input yang nyata pada list lambat dengan update biasa, transition, dan deferred value.', Component: lazy(() => import('./Transition')) },
  { id: 'virtual-list', title: 'List Virtualization', level: 8, kind: 'Live React', summary: '30,000 rows: compare DOM node counts and render time with and without virtualization.', titleId: 'Virtualisasi List', summaryId: '30.000 baris: bandingkan jumlah node DOM dan waktu render dengan dan tanpa virtualisasi.', Component: lazy(() => import('./VirtualList')) },
  { id: 'fiber', title: 'Fiber Work Loop', level: 9, kind: 'Animated', summary: 'beginWork/completeWork traversal, the commit phase, and interruption by urgent updates.', titleId: 'Work Loop Fiber', summaryId: 'Penelusuran beginWork/completeWork, fase commit, dan interupsi oleh update yang mendesak.', Component: lazy(() => import('./Fiber')) },
  { id: 'hooks-list', title: 'Hooks as a Linked List', level: 9, kind: 'Interactive', summary: 'Why calling a hook conditionally hands every later hook the wrong state.', titleId: 'Hook sebagai Linked List', summaryId: 'Kenapa memanggil hook secara kondisional membuat semua hook sesudahnya menerima state yang salah.', Component: lazy(() => import('./HooksList')) },
  { id: 'rendering-strategies', title: 'Rendering Strategies', level: 10, kind: 'Animated', summary: 'CSR, SSR, SSG, streaming and PPR on a timeline: when content appears and when it becomes interactive.', titleId: 'Strategi Rendering', summaryId: 'CSR, SSR, SSG, streaming, dan PPR dalam satu timeline: kapan konten muncul dan kapan halaman bisa diinteraksikan.', Component: lazy(() => import('./RenderingStrategies')) },
  { id: 'rsc-boundary', title: "The 'use client' Boundary", level: 10, kind: 'Interactive', summary: 'Move the client boundary around a component tree and watch bundle size and build errors.', titleId: "Batas 'use client'", summaryId: 'Geser batas client di pohon component dan amati ukuran bundle serta error build.', Component: lazy(() => import('./RscBoundary')) },
  { id: 'xss', title: 'XSS & dangerouslySetInnerHTML', level: 11, kind: 'Live React', summary: 'Paste attack payloads and compare React escaping, raw HTML (safely sandboxed) and an allowlist sanitizer.', titleId: 'XSS & dangerouslySetInnerHTML', summaryId: 'Tempel payload serangan dan bandingkan escaping React, HTML mentah (di sandbox yang aman), dan sanitizer berbasis allowlist.', Component: lazy(() => import('./Xss')) },
]

export const vizTitle = (v: VizMeta, lang: 'en' | 'id') => (lang === 'id' ? v.titleId ?? v.title : v.title)
export const vizSummary = (v: VizMeta, lang: 'en' | 'id') => (lang === 'id' ? v.summaryId ?? v.summary : v.summary)

export const vizById = (id: string) => VIZ.find(v => v.id === id)
