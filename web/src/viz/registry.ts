import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export type VizMeta = {
  id: string
  title: string
  summary: string
  level: number
  kind: 'Animated' | 'Live React' | 'Interactive'
  Component: LazyExoticComponent<ComponentType>
}

// Each visualization is its own chunk: the Lab loads only what you open.
export const VIZ: VizMeta[] = [
  { id: 'event-loop', title: 'The Event Loop', level: 0, kind: 'Animated', summary: 'Step through the call stack, microtask and macrotask queues to predict console output.', Component: lazy(() => import('./EventLoop')) },
  { id: 'references', title: 'References vs Values', level: 0, kind: 'Animated', summary: 'See why mutation keeps the same reference, and why spread creates a new one.', Component: lazy(() => import('./References')) },
  { id: 'render-tree', title: 'Re-render Propagation', level: 1, kind: 'Interactive', summary: 'Trigger state and context updates and watch which components re-render — with and without memoization.', Component: lazy(() => import('./RenderTree')) },
  { id: 'keys', title: 'Keys & Reconciliation', level: 1, kind: 'Live React', summary: 'A real list with per-row state. Break it with index keys, fix it with IDs.', Component: lazy(() => import('./Keys')) },
  { id: 'batching', title: 'State Snapshots & Batching', level: 1, kind: 'Live React', summary: 'Why setCount(count + 1) three times only adds one, and how updates are batched.', Component: lazy(() => import('./Batching')) },
  { id: 'effect-timeline', title: 'Effect Lifecycle', level: 2, kind: 'Live React', summary: 'A live log of effect setup and cleanup as dependencies change, including StrictMode.', Component: lazy(() => import('./EffectTimeline')) },
  { id: 'stale-closure', title: 'Stale Closures', level: 2, kind: 'Live React', summary: 'Timers that capture old state, and the ref and updater fixes.', Component: lazy(() => import('./StaleClosure')) },
  { id: 'race-condition', title: 'Fetch Race Conditions', level: 2, kind: 'Live React', summary: 'Type fast and watch slow responses overwrite newer ones — then fix it with cleanup.', Component: lazy(() => import('./RaceCondition')) },
  { id: 'ui-states', title: 'Impossible UI States', level: 3, kind: 'Interactive', summary: 'Booleans vs a discriminated union, as a clickable state machine.', Component: lazy(() => import('./UiStates')) },
  { id: 'state-placement', title: 'Where Should State Live?', level: 5, kind: 'Interactive', summary: 'A decision tree that classifies any piece of state into the right home.', Component: lazy(() => import('./StatePlacement')) },
  { id: 'testing-trophy', title: 'The Testing Trophy', level: 7, kind: 'Interactive', summary: 'What each layer of testing is for, and how much of each to write.', Component: lazy(() => import('./TestingTrophy')) },
  { id: 'transition', title: 'useTransition vs Blocking', level: 8, kind: 'Live React', summary: 'Measure real input lag on a slow list with normal updates, transitions and deferred values.', Component: lazy(() => import('./Transition')) },
  { id: 'virtual-list', title: 'List Virtualization', level: 8, kind: 'Live React', summary: '30,000 rows: compare DOM node counts and render time with and without virtualization.', Component: lazy(() => import('./VirtualList')) },
  { id: 'fiber', title: 'Fiber Work Loop', level: 9, kind: 'Animated', summary: 'beginWork/completeWork traversal, the commit phase, and interruption by urgent updates.', Component: lazy(() => import('./Fiber')) },
  { id: 'hooks-list', title: 'Hooks as a Linked List', level: 9, kind: 'Interactive', summary: 'Why calling a hook conditionally hands every later hook the wrong state.', Component: lazy(() => import('./HooksList')) },
  { id: 'rendering-strategies', title: 'Rendering Strategies', level: 10, kind: 'Animated', summary: 'CSR, SSR, SSG, streaming and PPR on a timeline: when content appears and when it becomes interactive.', Component: lazy(() => import('./RenderingStrategies')) },
  { id: 'rsc-boundary', title: "The 'use client' Boundary", level: 10, kind: 'Interactive', summary: 'Move the client boundary around a component tree and watch bundle size and build errors.', Component: lazy(() => import('./RscBoundary')) },
]

export const vizById = (id: string) => VIZ.find(v => v.id === id)
