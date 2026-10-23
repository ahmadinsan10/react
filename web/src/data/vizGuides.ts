import type { VizGuide } from './types'

/**
 * Guided walkthroughs for every visualization in the Lab.
 * Text uses the app's mini-markdown: paragraphs, `code`, **bold**, *italic*,
 * "- " bullets, "1. " lists, "### " headings and ``` fences.
 */
export const VIZ_GUIDES: Record<string, VizGuide> = {
  // ───────────────────────────── Level 0 ─────────────────────────────
  'event-loop': {
    whatYouSee: `The top-left lane shows the **code**, with the line currently executing highlighted. The top-right lane is the **console output** as it accumulates. Underneath are three lanes: the **call stack** (blue chips, newest frame on top), the **microtask queue** (violet chips) and the **macrotask queue** (amber chips).

The concept: JavaScript runs one thing at a time. Synchronous code runs to completion on the stack. Promise callbacks, \`await\` continuations and \`queueMicrotask\` go to the microtask queue; timers go to the macrotask queue. When the stack empties, the event loop drains **every** microtask first, then takes **one** macrotask, then repeats. Use the step controls (previous, next, play, speed) to walk through it and switch between the **Timers vs Promises** and **async / await** scenarios.`,
    steps: [
      'Stay on **Timers vs Promises** and, before pressing anything, write down the order you expect A, B, C, D and E to print.',
      'Step to the `setTimeout` line: the callback lands in the amber macrotask lane, not on the stack. A delay of 0 ms still means "after the current script and all microtasks".',
      'Step through the `then` and `queueMicrotask` lines: both land in the violet microtask lane, in the order they were scheduled.',
      'Keep stepping until the stack is empty. Notice C and D both run before B even though the timer was scheduled first: microtasks are drained completely before any macrotask runs. Final order is A E C D B.',
      'Switch to **async / await**. Step past `await null`: the rest of `load()` becomes a "resume load()" microtask and control returns to `main()`, so 2 prints before 3.',
      'Predict the async scenario before stepping to the end, then check: 1 2 3 4. Everything before the first `await` was synchronous.',
    ],
    inCode: `React code runs on the same event loop, so this ordering explains several everyday behaviours:

- A state update inside \`setTimeout\` or after \`await\` runs in a later task, but React 18+ still batches it.
- Code after \`await fetch()\` in an event handler runs after the handler "returned", so the event object and the render snapshot you closed over are from the past.
- An infinite chain of microtasks (a promise that keeps scheduling another) starves rendering and input, because the browser only paints between macrotasks.

\`\`\`ts
async function onSave() {
  setStatus('saving')          // queued, rendered after this handler yields
  await api.save(form)         // everything below is a microtask continuation
  setStatus('saved')           // still batched with anything else in this tick
}
\`\`\`

When you need "after the browser has painted", use \`requestAnimationFrame\` or an effect, not \`Promise.resolve().then\`.`,
    realCase: {
      title: 'A loading spinner that never appeared',
      story: `**Situation:** a reporting tool showed a spinner, then computed a large export by chaining thousands of small promise steps (\`await\` inside a loop over rows with no real I/O).

**Symptom:** the button froze for four seconds and the spinner never showed. Users clicked again, starting a second export.

**Root cause:** each \`await\` on an already-resolved value only schedules a microtask. The loop never gave the event loop a macrotask boundary, so the browser had no chance to render the spinner or handle clicks. Microtasks drain completely before paint.

**Fix:** the team yielded to the browser every few hundred rows with \`await new Promise(r => setTimeout(r))\` (later \`scheduler.yield()\` where supported), and moved the heavy work into a Web Worker. They also disabled the button while \`status === 'exporting'\`.`,
    },
    challenges: [
      { q: 'What prints? `setTimeout(() => log(1)); Promise.resolve().then(() => log(2)); log(3)`', a: '3, 2, 1. Synchronous code first, then the microtask (promise), then the macrotask (timer).' },
      { q: 'Does `setTimeout(fn, 0)` run before a `.then` callback registered after it?', a: 'No. The timer is a macrotask; the `.then` callback is a microtask. All microtasks run before the next macrotask, regardless of registration order.' },
      { q: 'Inside `async function f() { log("a"); await null; log("b") }`, is "a" logged synchronously when you call `f()`?', a: 'Yes. An async function runs synchronously until its first `await`. Only the code after the `await` is deferred as a microtask.' },
    ],
  },

  references: {
    whatYouSee: `The left column lists **variables**; the right column is the **heap**, where objects live. Arrows show which object each variable points to. Each object box has an id (#o1, #o2) and a border colour: blue for the original object, amber once it has been mutated, green for a fresh copy. Chips under the diagram evaluate comparisons like \`a === b\`, and the code panel accumulates the lines run so far.

The concept: variables holding objects store a **reference**, not the object. Assigning copies the arrow; spreading creates a new box. React compares state and props with \`Object.is\`, which for objects means "same box?", so mutation (same box, new contents) can be invisible to React, while a copy (new box) is always seen as a change.`,
    steps: [
      'Step to `const b = a`: two arrows now point at one box, and the chip says `a === b → true`. Nothing was copied.',
      'Step to `b.n = 2`: the shared box turns amber and `a.n` is now 2 as well. This is what happens when you mutate state in place: the reference React compares is unchanged.',
      'Step to `const c = { ...a }`: a second, green box appears. `a === c` is false even though the contents match. This is the "new reference" React needs to notice an update.',
      'Step to `c.n = 3`: only the green box changes. Copy-then-modify leaves the original intact, which is exactly how immutable state updates work.',
      'Finish with `{ n: 3 } === { n: 3 }`: false. Think about what that means for an object or arrow function created inside a component body on every render.',
    ],
    inCode: `In React, the update below does nothing visible because the array reference never changes:

\`\`\`tsx
// Bug: mutates and passes the same reference back
todos.push(newTodo)
setTodos(todos)          // Object.is(old, new) → true, render bailed out

// Fix: new array, new reference
setTodos(prev => [...prev, newTodo])
setUser(prev => ({ ...prev, address: { ...prev.address, city } }))
\`\`\`

The same rule affects dependency arrays and memoization: \`useEffect(fn, [options])\` re-runs every render if \`options\` is an object literal built during render, and \`memo(Child)\` cannot skip a render when it receives a new \`style={{...}}\` each time. The React Compiler memoizes such values automatically, but only if you never mutate them.`,
    realCase: {
      title: 'Checkout total that only updated on the second click',
      story: `**Situation:** a shop's cart kept \`items\` in \`useState\`. The quantity stepper did \`item.qty++\` and then \`setItems(items)\`.

**Symptom:** clicking + seemed to do nothing; clicking anything else (such as opening a tooltip) suddenly showed the right quantity and total.

**Root cause:** the array and item objects were mutated in place. React compared the old and new \`items\` with \`Object.is\`, found the same reference, and skipped the render. An unrelated re-render later displayed the already-mutated data.

**Fix:** \`setItems(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + 1 } : i))\`. The team also enabled lint rules against mutating state and moved the cart to \`useReducer\` with Immer for nested updates.`,
    },
    challenges: [
      { q: 'After `const b = a; b.n = 5`, what is `a.n`?', a: '5. `a` and `b` reference the same object, so the mutation is visible through both.' },
      { q: 'Does `{ ...a }` deep-copy nested objects?', a: 'No. Spread is shallow: top-level properties are copied, but nested objects are still shared references. You must spread each level you change.' },
      { q: 'Why can `setList(list)` after `list.push(x)` fail to re-render?', a: 'React bails out when the new state is `Object.is`-equal to the old one. The push changed contents but not the reference, so React considers the state unchanged.' },
    ],
  },

  // ───────────────────────────── Level 1 ─────────────────────────────
  'render-tree': {
    whatYouSee: `A component tree: App → ThemeProvider → Header / Page / Footer and their children. Click a node to simulate an update. Colours in the legend: **red** = the component whose state changed, **amber** = re-rendered as a result, **violet outline** = reads ThemeContext (ThemeToggle and Footer). The blue bubble on each node is a running **render count**.

The concept: when a component's state changes, React re-renders it **and, by default, all of its descendants**, whether or not their props changed. Memoization (React Compiler or \`memo\`) lets unchanged children be skipped. Passing elements as \`children\` from a higher component also avoids re-rendering them. Context is different: every consumer re-renders when the value changes, regardless of memoization in between.`,
    steps: [
      'With **setState in a component** selected and both toggles off, click **Page**. SearchBox, ResultList and both Rows turn amber: the whole subtree re-rendered. Header and Footer did not, because they are siblings, not children.',
      'Click **App**. Everything re-renders. Note how quickly the counters climb for leaf components that never changed.',
      'Turn on **React Compiler / memo** and click Page again. Only Page re-renders: children with unchanged props are skipped.',
      'Turn memo off and turn on **Lift ResultList up (pass as children)**. Click Page: ResultList and its Rows stay quiet, because the ResultList element was created by App and Page just places it. No memo required.',
      'Switch to **Change context value** and click any node. ThemeProvider plus the two violet consumers (ThemeToggle and Footer) re-render, even with memo on: context bypasses memoized parents.',
      'Use **Reset counts** and compare totals for the same five clicks with and without memo.',
    ],
    inCode: `The "lift content up" trick in real code:

\`\`\`tsx
// Before: every keystroke in Page re-renders ResultList
function Page() {
  const [q, setQ] = useState('')
  return <><SearchBox value={q} onChange={setQ} /><ResultList /></>
}

// After: App creates ResultList once; Page only places it
function Page({ children }: { children: React.ReactNode }) {
  const [q, setQ] = useState('')
  return <><SearchBox value={q} onChange={setQ} />{children}</>
}
<Page><ResultList /></Page>
\`\`\`

With the React Compiler (stable 1.0; in Vite enable it with \`reactCompilerPreset\` + \`@rolldown/plugin-babel\`, in Next.js with \`reactCompiler: true\`), components and JSX are memoized automatically, so you rarely write \`memo\`/\`useMemo\` by hand. For context, split rarely-changing values (theme) from frequently-changing ones (cursor position), or use a store with selectors.`,
    realCase: {
      title: 'A dashboard that stuttered on every keystroke',
      story: `**Situation:** an analytics dashboard kept the filter text input's state in the top-level \`Dashboard\` component, which also rendered six heavy chart components.

**Symptom:** typing in the filter box lagged badly; the React Profiler showed every chart re-rendering on every character.

**Root cause:** state lived higher than it needed to. Each \`setFilter\` re-rendered \`Dashboard\` and therefore every child, even though the charts only cared about the debounced, applied filter.

**Fix:** the input's draft text moved into a small \`FilterBox\` component with its own state, which only reported the applied value upward on submit. The charts were also compiled with the React Compiler. Typing went from re-rendering roughly forty components per keystroke to one.`,
    },
    challenges: [
      { q: 'Page re-renders. Does its child SearchBox re-render if its props are identical and nothing is memoized?', a: 'Yes. Without memoization, a parent render re-renders all children it creates, regardless of whether props changed.' },
      { q: 'Why does lifting ResultList up and passing it as `children` stop it from re-rendering when Page updates?', a: 'The element was created by App. When only Page re-renders, `children` is the same element object as before, so React can skip it.' },
      { q: 'A memoized parent sits between a context provider and a consumer. Does the consumer re-render when the context value changes?', a: 'Yes. Context consumers are re-rendered directly when the value changes, bypassing memoized ancestors.' },
    ],
  },

  keys: {
    whatYouSee: `A real React list of people (Ana, Budi, Citra). Each row is a component with its **own state**: a note input and a "mounted at" timestamp that is set once when the component instance is created. The **Key strategy** switch picks between \`key={index}\` and \`key={item.id}\`, and the buttons **Add to top**, **Shuffle**, **Reverse**, **Remove first** and **Reset** reorder the data.

The concept: during reconciliation, React matches old and new children by key. The key decides **which component instance (and its state) is reused** for each item. With index keys, identity is "position", so state stays at a position while the data moves. With stable IDs, state travels with the item. Watch the coloured square and name (props) versus the note and mount time (state).`,
    steps: [
      'With **key={index}**, type "Ana note" in Ana\'s row and "Budi note" in Budi\'s row.',
      'Click **Add to top**. A new person appears at position 0, but the "Ana note" text and Ana\'s mount time stay at position 0 next to the new name. Props moved; state did not, because position 0 is still "the same component" to React.',
      'Click **Remove first**. Now the last row is the one that unmounts, and every note shifts onto a different person.',
      'Switch to **key={item.id}** (the list resets), type notes again, then click **Add to top**: the new row gets a fresh mount time and empty note, and existing notes stay with their people.',
      'Click **Shuffle** and **Reverse** several times. Notes and mount times follow each person, because React moves the existing DOM nodes instead of rewriting them.',
    ],
    inCode: `\`\`\`tsx
// Fragile: identity = position
{items.map((item, i) => <Row key={i} item={item} />)}

// Correct: identity = the item
{items.map(item => <Row key={item.id} item={item} />)}
\`\`\`

Rules of thumb:

- Use a stable, unique ID from your data (database id, UUID created when the item is created).
- Never generate keys during render (\`key={Math.random()}\` or \`crypto.randomUUID()\` inline): every render mounts brand-new components and wipes their state.
- Index keys are acceptable only for static lists that never reorder, insert or delete, and whose rows hold no state.
- You can use \`key\` on purpose to **reset** a component: \`<ProfileForm key={userId} />\` gives each user a fresh form.`,
    realCase: {
      title: 'Payment amounts typed into the wrong invoice',
      story: `**Situation:** an accounting app listed unpaid invoices, each row containing an uncontrolled amount input, rendered with \`key={index}\`. New invoices arrived over a websocket and were prepended to the list.

**Symptom:** a clerk typed an amount into the third row, an invoice arrived, and the typed amount now sat beside a different invoice. Several payments were recorded against the wrong supplier before anyone noticed.

**Root cause:** prepending shifted every invoice down one position, but the input DOM nodes and their typed values stayed at their positions because keys were indexes.

**Fix:** keys switched to the invoice id, inputs became controlled with the draft amount stored per invoice id, and an end-to-end test now inserts an item while a row is being edited.`,
    },
    challenges: [
      { q: 'You render `<li key={i}>` with a text input inside. A new item is inserted at the top. Where does the text the user typed in the first row end up?', a: 'Still in the first row, now beside the new item. With index keys React reuses the component at index 0 and only updates its props.' },
      { q: 'Is `key={crypto.randomUUID()}` inside `map` a good fix?', a: 'No. A new key every render makes React unmount and remount every row on every render, losing state and focus and hurting performance. Keys must be stable.' },
      { q: 'How can a key be used deliberately to reset state?', a: 'Change the key of a component when you want a fresh instance, e.g. `<Editor key={docId} />`. React treats a different key as a different component and remounts it.' },
    ],
  },

  batching: {
    whatYouSee: `Four buttons, each running a different snippet of state updates (the code is printed on the button). Underneath are three stats: the current **count**, a boolean **flag**, and **commits so far**, which increments once each time React commits a render. **Reset values** zeroes count and flag.

The concept has two parts. **Snapshots:** inside a render, \`count\` is a constant: calling \`setCount(count + 1)\` three times queues "set to 1" three times. **Updater functions** (\`c => c + 1\`) are queued and each receives the previous result. **Batching:** React collects all updates from one event (and, since React 18, from timeouts and promises too) and renders once. The commit counter proves that several updates produce one render.`,
    steps: [
      'Click **Snapshot value ×3** from 0. count becomes 1, not 3, and commits goes up by exactly one.',
      'Click **Updater function ×3**. count goes up by 3, and commits still rises by exactly one: three queued updates, one render.',
      'Click **Mixed**. Whatever count was, it ends at 42: React processes the queue in order (replace with count+5, add 1, replace with 42), so the last replacement wins.',
      'Click **Inside setTimeout**. Both count and flag change, with a single commit, even though the updates ran outside a React event handler.',
      'Predict before clicking: from count = 10, what does Mixed produce? And Snapshot ×3? (42 and 11.)',
    ],
    inCode: `\`\`\`tsx
function handleClick() {
  setCount(count + 1)   // count is this render's snapshot, e.g. 0 → queues "set 1"
  setCount(count + 1)   // queues "set 1" again
  setCount(c => c + 1)  // queues "previous + 1" → 2
  console.log(count)    // still 0: state updates do not change the variable
}
\`\`\`

Use the updater form whenever the next value depends on the previous one, especially in async code, intervals and anything that may run more than once per render. If you genuinely need the DOM updated synchronously before continuing (rare, e.g. to measure or scroll), \`flushSync(() => setX(...))\` opts out of batching for that update.`,
    realCase: {
      title: 'Double-click "like" counted once',
      story: `**Situation:** a social feed's like button did \`setLikes(likes + 1)\` and then fired an API call; a quick double-tap feature called the same handler twice in one gesture.

**Symptom:** a double-tap showed +1 locally, but the server recorded +2, so the count "jumped" on the next refresh.

**Root cause:** both calls happened before a re-render, so both read the same \`likes\` snapshot and set the same value. The server, which incremented atomically, saw two requests.

**Fix:** the client switched to \`setLikes(l => l + 1)\` and, more importantly, made the client state reflect the server's returned total after each request (an optimistic update reconciled with the response), so the two could never diverge.`,
    },
    challenges: [
      { q: 'count is 5. What is it after `setCount(count + 1); setCount(count + 1)` in one handler?', a: '6. Both calls read the snapshot value 5 and set 6.' },
      { q: 'What is it after `setCount(c => c + 1); setCount(count * 10)` when count is 5?', a: '50. The updater produces 6, then the plain value 50 replaces it.' },
      { q: 'Two state updates inside a `setTimeout` callback in React 19: how many renders?', a: 'One. Automatic batching (since React 18) applies to timeouts, promises and native event handlers too.' },
    ],
  },

  // ───────────────────────────── Level 2 ─────────────────────────────
  'effect-timeline': {
    whatYouSee: `A live \`<Chat>\` component that "connects" to a room in an effect with \`[roomId]\` as its dependency. The log below records, with timestamps: grey **commit** lines (each time Chat renders and commits), green **▶ setup** lines (\`connect("room")\`) and red **■ cleanup** lines (\`disconnect("room")\`).

Controls: **Unmount/Mount <Chat>**, a **roomId** dropdown (general, react, rust), **Toggle theme (not a dependency)**, **Simulate StrictMode mount** and **Clear log**.

The concept: an effect is a synchronisation with an external system. Setup runs after commit; cleanup runs before the next setup and on unmount. The effect only re-runs when a dependency changes, so a re-render alone does not reconnect. In development, StrictMode deliberately runs setup → cleanup → setup on mount to expose missing cleanups.`,
    steps: [
      'Click **Clear log**, then change **roomId** from general to react. You see a commit line, then cleanup for "general", then setup for "react": cleanup of the old value always comes before setup of the new one.',
      'Click **Toggle theme (not a dependency)**. A new commit line appears with the new theme, but no setup or cleanup: the effect did not re-run.',
      'Click **Unmount <Chat>**. A single red cleanup line closes the last connection. Mount it again to see a fresh setup.',
      'Turn on **Simulate StrictMode mount**. The log shows connect → disconnect → connect for the same room. If your cleanup were missing, you would now have two open connections.',
      'Change roomId rapidly between all three rooms and confirm every setup is paired with exactly one cleanup.',
    ],
    inCode: `\`\`\`tsx
function Chat({ roomId, theme }: { roomId: string; theme: string }) {
  useEffect(() => {
    const conn = createConnection(roomId)
    conn.connect()
    return () => conn.disconnect()   // runs before the next setup and on unmount
  }, [roomId])                       // theme is not read here, so it is not a dep
  return <ChatWindow theme={theme} />
}
\`\`\`

If an effect needs a value that should *not* trigger reconnection (for example logging the current theme when a message arrives), React 19.2 provides \`useEffectEvent\` to read the latest value from inside the effect without listing it as a dependency. Do not silence the exhaustive-deps lint rule instead. And remember: if no external system is involved (deriving data, reacting to a click), you probably do not need an effect at all.`,
    realCase: {
      title: 'Duplicate websocket subscriptions after navigation',
      story: `**Situation:** a trading-style price dashboard subscribed to a websocket channel in \`useEffect(() => { socket.subscribe(symbol, onTick) }, [symbol])\` with no cleanup.

**Symptom:** after switching between a few symbols, prices flickered between values and network traffic climbed steadily. In development, every tick arrived twice from the very first load.

**Root cause:** each symbol change added another subscription without removing the previous one. StrictMode's double mount in development was surfacing exactly this, but the team had dismissed it as "React running effects twice".

**Fix:** the effect returned \`() => socket.unsubscribe(symbol, onTick)\`. With the cleanup in place the StrictMode double-run became harmless, and production traffic dropped back to one stream per visible symbol.`,
    },
    challenges: [
      { q: 'roomId changes from "a" to "b". In what order do the logs appear?', a: 'The component re-renders and commits, then the cleanup from the "a" effect runs, then setup for "b".' },
      { q: 'Why does toggling theme not reconnect?', a: 'theme is not in the dependency array (and is not used inside the effect), so React skips re-running the effect after that render.' },
      { q: 'Does StrictMode run effects twice in production?', a: 'No. The extra setup → cleanup → setup only happens in development, to reveal effects whose cleanup does not fully undo their setup.' },
    ],
  },

  'stale-closure': {
    whatYouSee: `Two live demos side by side.

**1 · Delayed read:** a counter with a **+1** button and a **Read in 3s** button. When the timer fires, the log prints both what the **closure** captured at click time and what a **ref** (updated after every render) holds now. An amber pill counts pending timers.

**2 · Interval with empty-ish deps:** an interval ticking every 500 ms inside an effect that does not list \`count\` as a dependency. The **Interval code** switch toggles between \`setCount(count + 1)\` and \`setCount(c => c + 1)\`; **Start/Stop** and **Reset** control it.

The concept: every render creates new functions that close over **that render's** values. A callback that runs later still sees the old snapshot. Refs give you the latest value; updater functions let you compute from the previous state without reading it at all.`,
    steps: [
      'In demo 1, click **Read in 3s**, then click **+1** three times quickly. When it fires, the closure value is the old count and the ref value is the current one.',
      'Click Read in 3s several times with +1 clicks between them. Each result shows a different captured value: each click was a different render with its own snapshot.',
      'In demo 2, choose `setCount(count + 1)` and press **Start**. The counter goes to 1 and stays there: the interval was created once, with count = 0, so it keeps computing 0 + 1.',
      'Stop, switch to `setCount(c => c + 1)` and Start again. Now it keeps counting, because the updater receives the latest state from React each time.',
      'Ask yourself: would adding `count` to the dependency array also fix demo 2? (Yes, but the interval would be torn down and recreated on every tick.)',
    ],
    inCode: `\`\`\`tsx
// Fix 1: updater, when the new state depends on the old state
useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000)
  return () => clearInterval(id)
}, [])

// Fix 2: ref, when a later callback must READ the latest value
const latest = useRef(value)
useEffect(() => { latest.current = value })
setTimeout(() => send(latest.current), 3000)

// Fix 3 (React 19.2): useEffectEvent for non-reactive logic inside effects
const onTick = useEffectEvent(() => log(count))
useEffect(() => {
  const id = setInterval(onTick, 1000)
  return () => clearInterval(id)
}, [])
\`\`\`

Do not write to a ref during render; update it in an effect or event handler.`,
    realCase: {
      title: 'Autosave that saved an old draft',
      story: `**Situation:** a note editor scheduled an autosave with \`setTimeout(() => save(text), 2000)\` inside a change handler, cancelling the previous timer each time.

**Symptom:** occasionally, after navigating away right after typing, the saved note was missing the last few words.

**Root cause:** a separate "save on unmount" effect had been written as \`useEffect(() => () => save(text), [])\`. With an empty dependency array its cleanup closed over the **first** render's \`text\`, so on unmount it overwrote the newer autosave with the original draft.

**Fix:** the unmount save read from a ref (\`textRef.current\`) kept in sync after each render, and saves were sequenced so an older payload could never overwrite a newer version (the server rejected writes with a lower revision number).`,
    },
    challenges: [
      { q: 'You click "Read in 3s" when count is 2, then click +1 twice. What does the closure log?', a: '2. The timer callback captured the value from the render in which you clicked.' },
      { q: 'Why does `setInterval(() => setCount(count + 1))` in an effect with `[]` stop at 1?', a: 'The effect ran once, so the interval callback always sees count = 0 and keeps setting 1.' },
      { q: 'When is a ref the right fix rather than an updater function?', a: 'When the delayed code needs to read the latest value for something other than computing the next state, e.g. sending it to a server or logging it.' },
    ],
  },

  'race-condition': {
    whatYouSee: `A search box over a list of fruits backed by a fake API in which **shorter queries respond more slowly**, so out-of-order responses are common. Under the input: "Showing results for" the query whose results are displayed, with a red **⚠ stale** badge when it does not match the input, or a green **✓ matches input** pill.

The **request timeline** draws one bar per request: **amber** = in flight, **green** = response applied to the UI, **grey/faded** = aborted or ignored. The **Fetch strategy** switch compares **Naive fetch in effect** with **With cleanup (abort / ignore)**.

The concept: each keystroke starts a request, and responses can arrive in any order. Without cleanup, whichever response arrives **last** wins, even if it belongs to an older query.`,
    steps: [
      'Choose **Naive fetch in effect** and type "apple" quickly. Watch the timeline: the "a" request is still amber after "apple" has gone green.',
      'Wait. When "a" finishes it also turns green and overwrites the list, and the red stale badge appears: the UI shows results for "a" while the input says "apple".',
      'Press **Reset**, try "pea" for a shorter example, and count how many bars are green: every response was applied, in arrival order.',
      'Switch to **With cleanup (abort / ignore)** and type "apple" quickly again. Earlier bars turn grey as soon as the next keystroke arrives; only the last request turns green.',
      'Confirm the badge always reads "✓ matches input" in the cleanup mode, however fast you type.',
    ],
    inCode: `\`\`\`tsx
useEffect(() => {
  if (!query) return
  const controller = new AbortController()
  let ignore = false
  fetch(\`/api/search?q=\${encodeURIComponent(query)}\`, { signal: controller.signal })
    .then(r => r.json())
    .then(data => { if (!ignore) setResults(data) })
    .catch(err => { if (err.name !== 'AbortError') setError(err) })
  return () => { ignore = true; controller.abort() }
}, [query])
\`\`\`

\`abort()\` saves bandwidth; the \`ignore\` flag guarantees correctness even for work that cannot be aborted. In real apps prefer a data library: TanStack Query keys the cache by \`['search', query]\`, so a late response for an old key can never be shown for the new key, and it cancels or ignores superseded requests for you. In Next.js, Server Components and \`use()\` with Suspense avoid the effect entirely.`,
    realCase: {
      title: 'Customer search that opened the wrong account',
      story: `**Situation:** a support console searched customers as the agent typed, then auto-selected the first result and loaded that customer's profile.

**Symptom:** agents occasionally typed a full surname and landed on a different customer's profile, whose name matched only the first two letters.

**Root cause:** the short query "ma" matched thousands of records and responded slower than "martins". The naive effect applied both responses in arrival order, so the slow, broad result list replaced the correct one and the auto-select chose the wrong person.

**Fix:** requests were aborted in effect cleanup, the auto-select only ran when \`results.query === input\`, and later the screen moved to TanStack Query with the query string in the key plus a 250 ms debounce.`,
    },
    challenges: [
      { q: 'Why is debouncing alone not a complete fix for race conditions?', a: 'It reduces the number of requests but two requests can still overlap and resolve out of order. You still need to ignore or abort stale responses.' },
      { q: 'What does the `ignore` flag protect against that `AbortController` might not?', a: 'Work that has already resolved or cannot be cancelled (e.g. a non-abortable SDK call). The flag ensures a stale result is never written to state, even if it arrives.' },
      { q: 'In the cleanup version, when exactly is the previous request aborted?', a: 'When the query changes: React runs the previous effect\'s cleanup before running the effect for the new query. It is also aborted on unmount.' },
    ],
  },

  // ───────────────────────────── Level 3 ─────────────────────────────
  'ui-states': {
    whatYouSee: `Two panels describe the same city-search feature.

**Left, three booleans → 8 combinations:** a table of every combination of \`isLoading\`, \`isError\` and \`data\`. Red rows marked "✗ impossible" are combinations the type allows but the UI should never be in, such as loading **and** error at once.

**Right, discriminated union → only real states:** a state machine with four nodes (idle, loading, success, error). The current state is filled blue; arrows leaving it are highlighted. The event buttons **FETCH, RESOLVE, REJECT, RETRY, RESET** are disabled when that transition is not allowed from the current state. Below, the raw state object and the rendered UI.

The concept: model a value that can be in one of several mutually exclusive situations as a union with a \`status\` tag, so invalid combinations cannot be expressed and TypeScript narrows each branch.`,
    steps: [
      'Read the left table: 4 of 8 rows are impossible, yet a component typed with three booleans must still guard against them (and someone will eventually set one by accident).',
      'On the right, from **idle**, note that only FETCH is enabled. Try to think of a meaning for RESOLVE while idle: there is none, so the button is disabled.',
      'Click **FETCH** then **REJECT**. The state JSON now has an `error` field, and only RETRY and RESET are enabled.',
      'Click **RETRY** then **RESOLVE**. The JSON contains `data` and no `error`: the old error disappeared automatically because it lived only in the error variant.',
      'Compare with the boolean model: what would you have to remember to reset there when a retry succeeds? (isError and the error message.)',
    ],
    inCode: `\`\`\`ts
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: City[] }

function reducer(s: State, e: Event): State {
  switch (s.status) {
    case 'loading':
      if (e.type === 'RESOLVE') return { status: 'success', data: e.data }
      if (e.type === 'REJECT') return { status: 'error', error: e.message }
      return s
    // ...
  }
}

// In JSX, TypeScript narrows for you:
if (state.status === 'success') return <List cities={state.data} />
\`\`\`

Add an exhaustive \`default: const _never: never = s\` so adding a new status becomes a compile error in every switch that forgot it. TanStack Query exposes the same idea via \`status: 'pending' | 'error' | 'success'\`.`,
    realCase: {
      title: 'An error banner on top of fresh results',
      story: `**Situation:** a flight search page tracked \`isLoading\`, \`error\` and \`results\` in three \`useState\` calls.

**Symptom:** after a failed search, a successful retry showed the new flights **and** the red "Something went wrong" banner. Sometimes a spinner showed alongside results.

**Root cause:** the success path set \`results\` and \`isLoading = false\` but forgot to clear \`error\`. Nothing in the types prevented the impossible combination.

**Fix:** the three variables became one \`useReducer\` with a discriminated union. Each transition returns a whole new state object, so entering \`success\` drops \`error\` by construction. A unit test per transition replaced several ad-hoc guards in the JSX.`,
    },
    challenges: [
      { q: 'How many states can `{ isLoading: boolean; isError: boolean; hasData: boolean }` represent, and how many are valid for a fetch?', a: '8 combinations, of which only 4 (idle, loading, error, success) are meaningful.' },
      { q: 'Inside `if (state.status === "error")`, why can you access `state.error` without a check?', a: 'TypeScript narrows the union to the `error` variant, which is the only one that declares the field.' },
      { q: 'How do you make TypeScript complain when a new status is added but not handled?', a: 'Use an exhaustive switch with a `default` branch that assigns the value to `never`; an unhandled variant then fails to compile.' },
    ],
  },

  // ───────────────────────────── Level 4 ─────────────────────────────
  'query-cache': {
    whatYouSee: `A simulated TanStack Query cache. On one side are components that can be **mounted and unmounted**, each subscribing to a query key such as \`['todos']\` or \`['todo', 1]\`. On the other side is the **cache**: one entry per key, shown on a timeline as it moves through its lifecycle:

- **fresh**: data is younger than \`staleTime\`; mounting another observer reuses it with no request.
- **stale**: data is still shown instantly, but the next trigger (mount, window focus, reconnect) refetches in the background.
- **inactive**: no component observes the key; the \`gcTime\` countdown starts.
- **garbage-collected**: the countdown ran out and the entry is removed.

Sliders control **staleTime** and **gcTime**. You can also simulate a **window focus** and run a **mutation followed by invalidation**. The concept: server state is a cache, and these two timers decide when it is trusted and when it is forgotten.`,
    steps: [
      'With staleTime at 0, mount a component using a key. Watch the entry fetch, become fresh only briefly, and turn stale almost immediately: staleTime 0 is the library default.',
      'Mount a second component with the same key. Both share one cache entry: no second request, because requests are deduplicated by key.',
      'Simulate a window focus while the entry is stale: a background refetch runs, but the components keep showing the cached data until the new data arrives (no loading spinner).',
      'Raise the staleTime slider (e.g. 30 s), refetch, then focus the window again: nothing is fetched while the entry is fresh.',
      'Unmount every component using the key. The entry becomes inactive and the gcTime countdown starts. Remount before it expires to get instant data; let it expire to see the entry garbage-collected and a hard loading state on the next mount.',
      'Run the mutation followed by invalidation: the matching entries are marked stale immediately, and active ones refetch right away, so the list reflects the change.',
    ],
    inCode: `\`\`\`tsx
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, gcTime: 5 * 60_000 } },
})

function Todos() {
  const { data, isPending, isFetching } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })
  // isPending: no data yet. isFetching: any request in flight, including background refetches.
}

function AddTodo() {
  const qc = useQueryClient()
  const { mutate } = useMutation({
    mutationFn: createTodo,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
}
\`\`\`

Key points: the key must contain every variable the fetch depends on (\`['todos', { status, page }]\`); \`invalidateQueries\` matches by prefix; \`gcTime\` (formerly \`cacheTime\`) only starts counting once a query has no observers.`,
    realCase: {
      title: 'A product list that hammered the API on every tab switch',
      story: `**Situation:** an internal inventory tool migrated to TanStack Query and kept all defaults. Staff kept the app open all day and switched windows constantly.

**Symptom:** backend logs showed several hundred list requests per user per hour, and the list's background spinner flickered every time someone came back from their email.

**Root cause:** the default \`staleTime\` is 0, so every query is stale immediately and refetches on every window focus and every remount. The data actually changed only a few times a day, and only through the app's own forms.

**Fix:** the team set \`staleTime\` to five minutes for catalogue queries, kept it at 0 for stock levels, and called \`invalidateQueries({ queryKey: ['products'] })\` in each mutation's \`onSuccess\`. Request volume dropped by more than 90% while edits still appeared instantly.`,
    },
    challenges: [
      { q: 'What is the difference between staleTime and gcTime?', a: 'staleTime decides how long data counts as fresh (no automatic refetch). gcTime decides how long an unused (inactive) entry stays in memory before being removed. They are independent.' },
      { q: 'A query is stale and the window regains focus. Does the user see a loading spinner?', a: 'Not a full loading state. The cached data stays on screen while a background refetch runs (`isFetching` is true, `isPending` is false).' },
      { q: 'Why invalidate after a mutation instead of manually setting the new list?', a: 'Invalidation marks every matching key stale and refetches the active ones from the source of truth, so filtered, paginated and sorted variants all stay correct. Manual cache updates are faster but you must update every affected key yourself.' },
      { q: 'Two components mount with the key `["user", 7]` at the same time. How many requests are sent?', a: 'One. Queries are deduplicated by key, and both components observe the same cache entry.' },
    ],
  },

  // ───────────────────────────── Level 5 ─────────────────────────────
  'state-placement': {
    whatYouSee: `An interactive decision tree. A card asks one yes/no question at a time; the breadcrumb row above it records your path (Q1 → Q2 → …), and you can click an earlier crumb to go back. When you reach a leaf, a green **Recommendation** card names where the state should live, the tool to use, why, and a short example. **Classify another piece of state** starts over.

The questions run from the **closest** home to the **widest**: derived (not state at all), server state, URL state, local state, lifted state, then an external store for frequently changing shared data, and finally context for rarely changing, widely read values. The concept: most state-management complexity comes from putting state higher or in a heavier tool than it needs.`,
    steps: [
      'Classify a cart total: "Can it be calculated from other state?" Yes. Result: not state at all, compute during render.',
      'Classify a product list from your API: No, then Yes on "comes from a server". Result: server state, handled by TanStack Query or Server Components, not useState + useEffect.',
      'Classify the active category filter on a shop page: answer Yes to "survive a refresh or be shareable". Result: URL search params.',
      'Classify whether a dropdown is open. You should end at local state with `useState`.',
      'Classify the logged-in user\'s display name used in the header and a dozen other places, changing rarely. You should end at context. Then try a live cursor position shared by many components: that ends at an external store.',
      'Use the breadcrumbs to jump back to Q1 and see how one different answer early on changes the whole recommendation.',
    ],
    inCode: `Examples of each home:

\`\`\`tsx
// Derived: no useState
const total = items.reduce((s, i) => s + i.price * i.qty, 0)

// Server state
const { data } = useQuery({ queryKey: ['products', filters], queryFn })

// URL state (Next.js App Router)
const params = useSearchParams()
const sort = params.get('sort') ?? 'price'

// Local
const [open, setOpen] = useState(false)

// External store with a selector (Zustand)
const count = useCart(s => s.items.length)
\`\`\`

A strong smell is \`useEffect(() => setX(f(y)), [y])\`: that is derived state stored twice. Another is copying server data into a global store, where it immediately starts to go stale.`,
    realCase: {
      title: 'Filters that vanished on refresh',
      story: `**Situation:** a property listing site stored search filters (city, price range, bedrooms) in a global Redux slice.

**Symptom:** users who refreshed, pressed Back from a listing, or shared a link with a friend landed on the unfiltered first page. Support tickets described it as "the site forgets my search".

**Root cause:** the filters were URL-shaped state (should survive refresh, be shareable and navigable) stored in memory.

**Fix:** filters moved into search params (\`?city=bandung&min=500&beds=2\`), read with \`useSearchParams\` and updated with \`router.replace\`. The query key included the parsed params, so the listings cache keyed off the URL too. The Redux slice was deleted.`,
    },
    challenges: [
      { q: 'Where should `fullName` live if you already have `firstName` and `lastName` in state?', a: 'Nowhere: compute it during render. Storing it creates two sources of truth that can drift.' },
      { q: 'Why is context a poor home for a value that changes on every keystroke and is read by many components?', a: 'Every consumer re-renders whenever the value changes. A store with selectors lets each component subscribe only to the slice it uses.' },
      { q: 'Which state is persisted, shareable and back-button aware for free?', a: 'URL state: search params and route params.' },
    ],
  },

  // ───────────────────────────── Level 6 ─────────────────────────────
  'focus-trap': {
    whatYouSee: `A live modal dialog plus a set of toggles, one per accessibility behaviour:

- **move focus into the dialog on open**
- **trap Tab / Shift+Tab inside the dialog**
- **close on Escape**
- **restore focus to the trigger on close**
- **aria-modal and aria-labelledby** on the dialog
- **make the background inert**

A live log shows \`document.activeElement\` every time focus moves, so you can see exactly where a keyboard or screen-reader user is. With everything off you get the **broken** dialog many apps ship; with everything on you get the **correct** pattern. The concept: a modal must move focus in, keep it in, let the user out with Escape, and put them back where they started, while assistive technology is told the rest of the page is unavailable.`,
    steps: [
      'Turn every toggle off and open the dialog with the keyboard (Tab to the trigger, press Enter). The log shows focus still on the trigger, behind the dialog: a screen-reader user does not even know it opened.',
      'Still broken: press Tab repeatedly. The log shows focus leaving the dialog and landing on links in the page behind it.',
      'Turn on moving focus on open and trapping Tab. Open again: focus starts inside, and Tab/Shift+Tab cycle only through the dialog\'s controls.',
      'Press Escape with the Escape toggle off, then on. Without it, keyboard users must Tab to a close button; with it, the dialog closes immediately.',
      'Close the dialog with restore focus off: the log shows focus on `body`, so the next Tab starts from the top of the page. Turn it on: focus returns to the trigger button.',
      'Turn on aria-modal/aria-labelledby and inert background and notice the background controls can no longer be focused or clicked, and the dialog is announced with its title.',
    ],
    inCode: `The simplest correct implementation in modern browsers is the native \`<dialog>\` element opened with \`showModal()\`, which gives you focus-in, an inert background, Escape to close and a top layer for free:

\`\`\`tsx
function ConfirmDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} aria-labelledby="confirm-title" onClose={onClose}>
      <h2 id="confirm-title">Delete project?</h2>
      <button autoFocus onClick={onClose}>Cancel</button>
    </dialog>
  )
}
\`\`\`

Restore focus by saving \`document.activeElement\` before opening and calling \`.focus()\` on it after closing (browsers often do this for \`showModal\`, but verify). For custom dialogs, libraries such as Radix UI or React Aria implement the full pattern. In React 19, \`inert\` is a normal boolean prop: \`<main inert={open}>\`.`,
    realCase: {
      title: 'A cookie preference dialog keyboard users could not escape',
      story: `**Situation:** a public-sector booking site built its own preference dialog as a fixed \`div\` over the page.

**Symptom:** an accessibility audit found that keyboard users tabbed straight past the dialog into the page behind it, screen-reader users heard the booking form instead of the dialog, and after closing it focus jumped to the top of the document, forcing users to tab through the whole header again.

**Root cause:** the dialog never moved focus into itself, had no trap, no \`role="dialog"\`/\`aria-modal\`/label, left the background interactive, and did not remember the trigger.

**Fix:** the team replaced it with a native \`<dialog>\` opened via \`showModal()\`, labelled by its heading, with the first button auto-focused and focus restored to the trigger on close. Automated checks (axe in integration tests) plus a Playwright test that tabs through the dialog now guard against regressions.`,
    },
    challenges: [
      { q: 'Why is trapping Tab not enough to make a modal accessible to screen-reader users?', a: 'Screen readers can navigate by virtual cursor without Tab. The background must also be hidden from assistive technology (`aria-modal` plus making it `inert`), and the dialog needs a role and an accessible name.' },
      { q: 'What should happen to focus when a modal closes, and why?', a: 'It should return to the element that opened it (usually the trigger), so keyboard users continue where they were instead of starting from the top of the page.' },
      { q: 'What does the `inert` attribute do to the background content?', a: 'It makes the subtree unfocusable and unclickable and hides it from the accessibility tree, so neither Tab nor assistive technology can reach it.' },
    ],
  },

  // ───────────────────────────── Level 7 ─────────────────────────────
  'testing-trophy': {
    whatYouSee: `A trophy-shaped diagram with four clickable layers, from top to bottom: **End-to-end** (red, small cap), **Integration** (blue, the wide cup), **Unit** (violet, narrow stem) and **Static** (green, base). Clicking a layer highlights it and fills the side panel with what it is for, typical **tools**, **speed**, **confidence** and a rough **share of effort**.

The concept: the shape reflects how much of each kind of test to write. Static analysis is cheap and always on. Integration tests, which render a feature and interact with it like a user while mocking only the network, give the most confidence per minute, so they get the largest share (about half). Unit tests cover tricky pure logic. End-to-end tests drive a real browser through a few critical journeys, because they are slow and more brittle.`,
    steps: [
      'Click **Static**: TypeScript and ESLint catch typos, wrong types and hook-rule violations instantly, before any test runs.',
      'Click **Unit**: fast and precise, but note the "Narrow" confidence: a passing reducer test says little about whether the screen works.',
      'Click **Integration** and compare the share (~50%) with the others. This is where tools like Testing Library and MSW live.',
      'Click **End-to-end**: highest confidence, slowest. Think of the two or three journeys in your app that deserve one (sign in, checkout).',
      'Pick a feature you built recently and decide, layer by layer, which single test you would write first. Most of the time it should be an integration test.',
    ],
    inCode: `An integration test in the trophy's widest layer, using Vitest, Testing Library and MSW:

\`\`\`tsx
server.use(http.get('/api/todos', () => HttpResponse.json([{ id: 1, title: 'Write tests' }])))

test('adds a todo', async () => {
  const user = userEvent.setup()
  render(<TodoPage />, { wrapper: Providers })
  expect(await screen.findByText('Write tests')).toBeInTheDocument()
  await user.type(screen.getByRole('textbox', { name: /new todo/i }), 'Ship it')
  await user.click(screen.getByRole('button', { name: /add/i }))
  expect(await screen.findByText('Ship it')).toBeInTheDocument()
})
\`\`\`

Query by role and accessible name (what users and assistive tech see), not by class names or test ids. Avoid mocking your own components; mock the network boundary instead. Note that async Server Components are not yet well supported by Testing Library, so cover them with end-to-end tests.`,
    realCase: {
      title: '100% unit coverage, broken checkout',
      story: `**Situation:** a retail front-end team had near-total unit coverage: every component was tested in isolation with its children and hooks mocked.

**Symptom:** a release broke the checkout button for one payment method. All tests were green.

**Root cause:** the unit tests mocked the very integration that failed: the payment-method component and the order summary disagreed about a renamed prop. Each side passed its own tests against its own mock of the other.

**Fix:** the team replaced most mock-heavy component tests with integration tests that rendered the whole checkout step with MSW handlers for the API, added one Playwright journey per payment method, and turned on stricter TypeScript, which would have flagged the renamed prop at compile time.`,
    },
    challenges: [
      { q: 'Why does the trophy give integration tests the largest share?', a: 'They exercise many units working together the way users do, while staying fast enough to run often. That yields the best confidence per unit of effort.' },
      { q: 'What should you mock in a front-end integration test?', a: 'Ideally only the network boundary (e.g. with MSW), not your own components or hooks.' },
      { q: 'Name one class of bug static analysis catches that no test would need to.', a: 'Typos and type mismatches (wrong prop names or types), and Rules of Hooks violations caught by ESLint.' },
    ],
  },

  // ───────────────────────────── Level 8 ─────────────────────────────
  transition: {
    whatYouSee: `A text input filters a deliberately **slow list** (each item burns CPU, so a full render costs a few hundred milliseconds). Press **Start demo** first. Three stats measure what users feel: **avg input lag** and **worst** lag (time from keystroke until the browser can paint, red above 100/200 ms), and **list status** ("updating…" in amber while the list is behind, "up to date" in green). The list dims while it is stale.

The **Update strategy** switch compares **Normal setState**, **useTransition** and **useDeferredValue**.

The concept: not all updates are equally urgent. Typing must feel instant; the filtered list can lag slightly. Transitions and deferred values mark the expensive render as interruptible, so React can abandon it when a new keystroke arrives and keep the input responsive.`,
    steps: [
      'Press **Start demo**, keep **Normal setState** and type a burst of characters quickly. The input stutters and the worst lag climbs well past 200 ms: every keystroke waits for the whole list.',
      'Switch to **useTransition** and type the same burst. The input keeps up, lag stays low, and "updating…" shows while the list catches up (this is `isPending`).',
      'Switch to **useDeferredValue** and type again. Similar result: the list renders with the old text first (cheap, since it is memoized), then the new text in the background.',
      'In either non-blocking mode, type continuously for several seconds: the list may not update until you pause, because React keeps discarding the outdated render.',
      'Compare the avg lag numbers across the three modes. These are the delays that the INP (Interaction to Next Paint) metric captures.',
    ],
    inCode: `\`\`\`tsx
// useTransition: you own the state update
const [isPending, startTransition] = useTransition()
function onChange(v: string) {
  setText(v)                                // urgent
  startTransition(() => setFilter(v))       // can be interrupted
}

// useDeferredValue: you only receive a value
const deferred = useDeferredValue(text)
const stale = text !== deferred
return <div style={{ opacity: stale ? 0.5 : 1 }}><SlowList query={deferred} /></div>
\`\`\`

The expensive child must be memoized (\`memo\` or the React Compiler), otherwise it re-renders with the urgent update too. Transitions do not make work faster; they make it interruptible. In React 19, \`startTransition\` also accepts async functions (Actions), and router navigations in Next.js are transitions. A controlled input's own state must never be set inside a transition.`,
    realCase: {
      title: 'A search-as-you-type field with 400 ms keystrokes',
      story: `**Situation:** an HR portal filtered a 5,000-person directory on the client, rendering rich cards with avatars and badges on each keystroke.

**Symptom:** on mid-range laptops, characters appeared in bursts; real-user monitoring flagged the page's INP as poor.

**Root cause:** the input value and the filtered list were updated in the same urgent render. Each keystroke had to wait for thousands of cards to render before the browser could paint the character.

**Fix:** the list received \`useDeferredValue(query)\` and was memoized, the list dimmed while stale, and the cards were virtualized. INP moved into the "good" range without adding a debounce.`,
    },
    challenges: [
      { q: 'Why must the slow list be memoized for useDeferredValue to help?', a: 'React first re-renders with the old deferred value. If the list is not memoized, that urgent render still renders the whole slow list, so nothing is gained.' },
      { q: 'Should you wrap the input\'s own `setText` in startTransition?', a: 'No. The input must update urgently; putting its state in a transition makes typing feel broken. Only wrap the expensive, derived update.' },
      { q: 'What is the difference between useTransition and useDeferredValue?', a: 'useTransition wraps a state update you control and gives you isPending. useDeferredValue gives you a lagging copy of a value you receive (e.g. a prop) when you cannot wrap the update.' },
    ],
  },

  'virtual-list': {
    whatYouSee: `A scrollable list of orders with a **Rendering mode** switch (**Render every row** vs **Virtualized**) and a **Rows** selector (1,000, 10,000 or 30,000). Two stats measure the cost: **DOM nodes in list** (red above 5,000) and **last render + commit** time (red above 100 ms).

The concept: the browser has to create, style and lay out every DOM node, even ones far off-screen. A virtualized list renders only the rows inside the viewport plus a few **overscan** rows (4 here), absolutely positioned inside a spacer element as tall as the full list. The scrollbar looks identical, but the DOM stays a few dozen rows no matter how large the data set is.`,
    steps: [
      'Choose **Render every row** at 1,000 rows and note the node count and render time.',
      'Switch Rows to 10,000, then 30,000. The DOM node count grows into the tens of thousands, render time turns red, and the switch itself takes noticeably long.',
      'Switch to **Virtualized** at 30,000 rows. The node count drops to a few dozen and render time to a few milliseconds.',
      'Scroll the virtualized list quickly. Row numbers update as you go, while the node count stays almost constant: rows are recycled, not added.',
      'Think about what breaks: browser Find (Ctrl+F) cannot find off-screen rows in the virtual list, and rows of varying height need measurement.',
    ],
    inCode: `With TanStack Virtual:

\`\`\`tsx
const parentRef = useRef<HTMLDivElement>(null)
const virtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 32,
  overscan: 4,
})

return (
  <div ref={parentRef} style={{ height: 320, overflow: 'auto' }}>
    <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
      {virtualizer.getVirtualItems().map(v => (
        <div key={v.key} style={{ position: 'absolute', top: 0, transform: \`translateY(\${v.start}px)\`, height: v.size, width: '100%' }}>
          <Row row={rows[v.index]} />
        </div>
      ))}
    </div>
  </div>
)
\`\`\`

For variable heights, pass \`measureElement\` as a ref. Before virtualizing, consider pagination or CSS \`content-visibility: auto\`, which are simpler for medium lists.`,
    realCase: {
      title: 'A logistics table that froze for eight seconds',
      story: `**Situation:** a shipment-tracking screen loaded all of a warehouse's open shipments (around 20,000) into an HTML table with ten columns and status icons.

**Symptom:** opening the page froze the tab for several seconds; on older office PCs it sometimes showed the "page unresponsive" prompt. Sorting a column froze it again.

**Root cause:** every row produced around fifteen DOM nodes, so the page created hundreds of thousands of nodes on each render and sort, overwhelming layout and memory.

**Fix:** the table was virtualized with a fixed row height and sticky header, keeping roughly forty rows in the DOM. The team added a server-side search because browser Find no longer reached off-screen rows, and kept keyboard navigation working by scrolling the focused row into view.`,
    },
    challenges: [
      { q: 'Why does the virtualized list need a spacer element as tall as the full list?', a: 'So the scroll container has the correct total height and scrollbar, even though only a few rows are actually rendered.' },
      { q: 'What is overscan for?', a: 'It renders a few extra rows above and below the viewport so fast scrolling does not reveal blank space before the next render.' },
      { q: 'Name one trade-off of virtualization.', a: 'Off-screen rows are not in the DOM, so browser Find, some accessibility tools and print do not see them, and variable row heights require measurement.' },
    ],
  },

  // ───────────────────────────── Level 9 ─────────────────────────────
  fiber: {
    whatYouSee: `A fiber tree (HostRoot → App → Header/Main → …) animated through React's work loop. Pills at the top show the current **phase** (Render phase (interruptible), Urgent work, or Commit phase) and the **lane** (priority) of the work. In the tree: a **blue** outline with "↓ begin" marks \`beginWork\` going down, a **violet** outline with "↑ complete" marks \`completeWork\` going back up, and fills record which fibers have been begun or completed in this pass. Everything turns **green** once committed to the DOM.

Use the step controls, and the **Interrupt with an urgent update** toggle.

The concept: rendering is a depth-first walk that can pause between fibers (every ~5 ms React checks \`shouldYield\`). Commit is synchronous and never interrupted. Higher-priority lanes, like a click, can pre-empt a transition, which is then restarted.`,
    steps: [
      'With the toggle off, step slowly. Notice the order: begin goes down to Logo, Logo completes (it is a leaf), then Nav begins: depth-first, child before sibling, complete on the way up.',
      'Keep stepping until App and HostRoot complete. Up to here nothing has touched the DOM: render work is pure preparation.',
      'Step into the commit: the whole tree turns green at once. DOM mutations, then layout effects, then passive effects (useEffect) are scheduled.',
      'Turn on **Interrupt with an urgent update** and step again. Partway through, the time slice runs out and React yields to the browser.',
      'Keep stepping: a SyncLane update (a click) is rendered and committed first, then the half-built transition tree is discarded and rendering restarts from the root.',
      'Ask yourself why this requires render functions to be pure: a component in the abandoned pass was called, but its result never reached the screen.',
    ],
    inCode: `You do not write fiber code, but its consequences shape how you write components:

- Render functions may be called, paused, discarded and called again. They must be **pure**: no subscriptions, network requests or mutations of outside variables during render.
- Side effects belong in event handlers or effects, which only run for committed work.
- Priorities are exposed through APIs: urgent updates from discrete events (clicks, typing), \`startTransition\` for interruptible work, \`useDeferredValue\` for lagging values, and Suspense for waiting.

\`\`\`tsx
function Row({ item }: { item: Item }) {
  analytics.track('row-rendered')   // wrong: may fire for renders that never commit
  useEffect(() => { analytics.track('row-shown') }, [])  // runs only after commit
  return <li>{item.name}</li>
}
\`\`\``,
    realCase: {
      title: 'Impression counts that were 30% too high',
      story: `**Situation:** a marketplace counted product "impressions" by calling a tracking function directly inside each product card's render body.

**Symptom:** after enabling transitions for filter changes, analytics reported many more impressions than products actually shown, and the numbers differed between development and production.

**Root cause:** with concurrent rendering, React can start rendering a transition, get interrupted by typing, throw that work away, and render again. Each abandoned render still called the tracking function. StrictMode's double render in development inflated it further.

**Fix:** tracking moved into an effect (and later into an IntersectionObserver-based hook), so it only ran for committed, visible cards.`,
    },
    challenges: [
      { q: 'Can the commit phase be interrupted by a click?', a: 'No. Commit is synchronous so the DOM is never left half-updated. Only the render phase is interruptible.' },
      { q: 'In what order are `beginWork` and `completeWork` called for a parent with two leaf children A and B?', a: 'begin(parent), begin(A), complete(A), begin(B), complete(B), complete(parent).' },
      { q: 'Why must components be pure for concurrent rendering to be safe?', a: 'React may call a component and then discard the result (after an interruption or for a higher-priority update). Side effects during render would run for work that never reaches the screen.' },
    ],
  },

  'hooks-list': {
    whatYouSee: `A \`Form\` component with four hook calls: \`useState\` for name and surname, a \`useEffect\` named persistForm, and \`useState\` for age. The left column shows the **fiber's hook list** as stored at mount: four slots, numbered by position. The right column replays the calls made during a re-render, green when each call lines up with its stored slot and red when it receives another hook's data.

Controls: **Put a hook inside an if (breaks the Rules of Hooks)**, **Re-render with name = ''** and **Reset**.

The concept: hooks have no names inside React, only **positions** in a linked list on the fiber. On every render React walks that list in order, handing the next stored slot to the next hook call. If a call is skipped, every later hook gets its neighbour's state.`,
    steps: [
      'With the toggle off, click **Re-render with name = \'\'**. All four calls are green: same order, same slots.',
      'Click **Reset**, turn on the toggle and read the updated code: `useState(\'Putri\')` is now inside `if (name !== \'\')`.',
      'Click **Re-render with name = \'\'**. Slot #2 is handed to the effect call, slot #3 to the age state ("gets useEffect\'s data!"), and slot #4 has no call at all.',
      'Read the final red row: React detects that fewer hooks were rendered than during the previous render and throws an error.',
      'Think of a correct version: call `useState` unconditionally and put the condition inside the effect or in the JSX instead.',
    ],
    inCode: `\`\`\`tsx
// Breaks the Rules of Hooks
if (name !== '') {
  const [surname, setSurname] = useState('Putri')
}

// Fine: hook always called; condition used inside
const [surname, setSurname] = useState('Putri')
useEffect(() => {
  if (name !== '') localStorage.setItem('form', name)
}, [name])
\`\`\`

The same applies to early returns before a hook, hooks inside loops whose length changes, and hooks inside callbacks. The \`eslint-plugin-react-hooks\` rules catch all of these. One deliberate exception: React 19's \`use()\` is not a hook in this sense and may be called conditionally, because it does not store state in a slot.`,
    realCase: {
      title: 'A profile page that crashed only for new users',
      story: `**Situation:** a component returned early with \`if (!user) return <Spinner />\` and called \`useMemo\` and \`useEffect\` after that line.

**Symptom:** most users were fine, but newly registered users saw a blank page with "Rendered more hooks than during the previous render" in the error tracker.

**Root cause:** new accounts loaded the user asynchronously, so the first render returned early with fewer hooks, and the next render with the user present called more. Existing users usually had the user cached, so the early return never happened for them.

**Fix:** all hooks moved above the early return (with the memo and effect handling a missing user internally), and the hooks lint rule was switched from warning to error in CI.`,
    },
    challenges: [
      { q: 'How does React know which `useState` call gets which value on re-render?', a: 'By call order. Hooks are stored as a list on the fiber and matched by position, not by variable name.' },
      { q: 'Is an early `return` before a hook call a problem?', a: 'Yes, if the early return happens on some renders but not others: the number and order of hooks changes between renders.' },
      { q: 'May `use(promise)` be called inside an `if`?', a: 'Yes. `use` is the one React API documented as callable conditionally, because it does not occupy a hook slot the same way stateful hooks do.' },
    ],
  },

  // ───────────────────────────── Level 10 ─────────────────────────────
  'rendering-strategies': {
    whatYouSee: `An illustrative timeline for one page load, with three rows: **server**, **network** and **browser**. Coloured bars play in real time: violet = server rendering, grey = HTML on the network, amber = downloading/running JavaScript, red = fetching data, blue = client render, green = hydration. Two dashed markers show **FCP** (first contentful paint) and **Interactive**. On the right, "What the user sees" shows a blank screen, then visible but inert content ("Buy (not yet)"), then interactive content ("Buy (works)").

The **Strategy** switch replays the load for **CSR**, **SSR**, **SSG**, **Streaming** and **PPR**.

The concept: strategies differ in **where** HTML is produced and **when**: in the browser, per request on the server, at build time, progressively, or as a static shell with dynamic holes. That controls when content appears and when it becomes usable.`,
    steps: [
      'Play **CSR**. The screen stays blank until JavaScript downloads, runs, fetches data and renders: FCP and Interactive arrive together, late.',
      'Play **SSR**. Content appears much earlier, but the server first waits for all data, and between FCP and Interactive the Buy button is visible but does nothing (the hydration gap).',
      'Play **SSG**. Cached HTML from a CDN gives the earliest FCP. Ask: how fresh is this content?',
      'Play **Streaming**. The shell arrives almost immediately while slow data is still loading on the server; the rest streams in as a chunk and hydrates separately.',
      'Play **PPR**. The static shell is served like SSG while the dynamic data starts on the server in parallel, then streams into the holes. Compare its FCP with SSR and its freshness with SSG.',
    ],
    inCode: `In the Next.js 16.4 App Router, these are mostly choices about data and caching rather than separate APIs:

\`\`\`tsx
// Static by default when there is no dynamic data (SSG-like)
export default async function Page() {
  const posts = await getPosts()   // cacheable data
  return <PostList posts={posts} />
}

// Streaming: wrap slow parts in Suspense
<Suspense fallback={<ReviewsSkeleton />}>
  <Reviews productId={id} />       {/* async Server Component */}
</Suspense>
\`\`\`

With Cache Components enabled (\`cacheComponents: true\`, on by default in new \`create-next-app\` projects since 16.4), Next.js prerenders the static shell and streams any Suspense-wrapped dynamic parts (cookies, headers, uncached fetches) at request time: that is Partial Prerendering. Use \`'use cache'\` with \`cacheLife\`/\`cacheTag\` to make data static, and \`revalidateTag\` after mutations. Pure CSR still fits authenticated dashboards where SEO does not matter.`,
    realCase: {
      title: 'A product page that waited on its slowest widget',
      story: `**Situation:** an e-commerce product page was server-rendered per request and awaited product details, price, stock, recommendations and reviews before returning any HTML.

**Symptom:** time to first byte was over two seconds whenever the recommendations service was slow, and mobile conversion dropped during peak hours.

**Root cause:** classic SSR is all-or-nothing: the page could not send a byte until the slowest dependency resolved, even though recommendations were below the fold.

**Fix:** the team moved the page to a static shell (product info cached and revalidated by tag when edited), wrapped stock, recommendations and reviews in separate Suspense boundaries that stream in, and deferred the reviews component's markdown library to the server. First paint dropped to a few hundred milliseconds, and a slow recommendations call now only delays its own section.`,
    },
    challenges: [
      { q: 'Why can an SSR page show a Buy button that does not respond to clicks?', a: 'The HTML is visible before JavaScript has downloaded and hydrated it. Until hydration attaches event handlers, the button is inert.' },
      { q: 'What does streaming change compared with classic SSR?', a: 'The server sends the shell immediately and streams each Suspense boundary when its data is ready, instead of waiting for all data before sending anything.' },
      { q: 'What is the core idea of Partial Prerendering?', a: 'A single route has a prerendered static shell served instantly from cache, plus dynamic holes (inside Suspense) that are rendered at request time and streamed in.' },
    ],
  },

  'rsc-boundary': {
    whatYouSee: `A puzzle on a product page's component tree. **Violet** nodes are Server Components (0 kb of client JS); **amber** nodes are Client Components and show their bundle cost. Each node is tagged "db" if it reads the database or "state" if it uses \`useState\`/\`onClick\`. Click a node to toggle a \`'use client'\` directive on it (shown above the node). A **red outline** marks a build error. A **dashed line** means the child is passed in as \`children\` rather than imported.

The side panel shows **Client JS shipped** (red above 60 kb) and the list of **Build errors**. The checkbox **Pass <Reviews> to Tabs as children** switches between slotting Reviews and importing it inside Tabs.

The concept: \`'use client'\` marks a boundary; that file and everything it **imports** become client code. Components passed as props or children from a Server Component stay on the server.`,
    steps: [
      'Start from the default (Gallery and Tabs marked). Check the error list: AddToCart uses state but is still a Server Component. Click **AddToCart** to mark it and clear the error.',
      'Try marking **Details** instead of AddToCart. The error clears, but Price is pulled into the client too, and the bundle grows. Push the directive down to the leaf.',
      'Mark **ProductPage** itself. Everything becomes client code, the bundle jumps, and ProductPage and Reviews now error because they read the database.',
      'Reset to a minimal solution and untick **Pass <Reviews> to Tabs as children**. Reviews and its 70 kb Markdown library are now imported by a Client Component, so they enter the bundle and Reviews can no longer access the database.',
      'Tick the checkbox again: the dashed line returns, Reviews renders on the server inside the client Tabs, and the bundle shrinks. Aim for zero errors with the smallest bundle.',
    ],
    inCode: `\`\`\`tsx
// app/product/[id]/page.tsx  (Server Component by default)
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await db.product.find(id)
  return (
    <Tabs>                          {/* client */}
      <Reviews productId={id} />    {/* still a Server Component: passed as children */}
    </Tabs>
  )
}

// components/Tabs.tsx
'use client'
export function Tabs({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState('reviews')
  return <div>{/* tab buttons */}{tab === 'reviews' && children}</div>
}
\`\`\`

Props crossing the boundary must be serializable (no functions except Server Actions, no class instances). Import \`'server-only'\` in modules that touch secrets or the database so an accidental client import fails the build.`,
    realCase: {
      title: 'A 300 kb layout caused by one directive',
      story: `**Situation:** a content site's root layout needed a theme switcher, so a developer added \`'use client'\` at the top of \`layout.tsx\` to make \`useState\` work.

**Symptom:** after deploy, the JavaScript sent to every page tripled, Lighthouse scores fell, and a server-only module that read environment secrets started failing the build with confusing errors.

**Root cause:** the directive turned the layout, and everything it imported (navigation, footer, a markdown renderer, a date library), into client code. The secrets module was now being bundled for the browser.

**Fix:** \`'use client'\` moved to a tiny \`ThemeToggle\` leaf component, the layout went back to being a Server Component that renders it, and the secrets module gained \`import 'server-only'\` so any future client import fails loudly.`,
    },
    challenges: [
      { q: 'A Client Component imports a component without a directive. Is that component server or client?', a: 'Client. Everything imported from a \'use client\' module becomes part of the client bundle.' },
      { q: 'How can a Server Component that reads the database render inside a Client Component?', a: 'Render it in a Server Component parent and pass it to the Client Component as `children` (or another prop). The client receives the already-rendered result.' },
      { q: 'Why is it better to put `\'use client\'` on leaf components?', a: 'It keeps the client bundle small and lets the rest of the tree stay on the server, where it can access data directly and ships no JavaScript.' },
    ],
  },

  // ───────────────────────────── Level 11 ─────────────────────────────
  xss: {
    whatYouSee: `Type a comment containing HTML into the input, for example \`<b>hi</b><img src=x onerror="alert(1)">\`. Three panes render the same string in three ways:

- **Escaped (React default):** \`{comment}\` in JSX. You see the literal angle brackets as text; nothing is interpreted as markup.
- **Raw dangerouslySetInnerHTML:** the string inserted as HTML. For safety it is shown inside a sandboxed iframe, so scripts cannot actually run, and the dangerous parts (event-handler attributes, \`script\` tags, \`javascript:\` URLs) are highlighted.
- **Allowlist-sanitized:** the string passed through a sanitizer that keeps only allowed tags and attributes, so formatting such as bold survives and anything executable is stripped.

The concept: React escapes text by default, which prevents most cross-site scripting (XSS). The risk returns whenever you bypass that, and the safe way to render user HTML is to sanitize with an allowlist.`,
    steps: [
      'Type plain text, then `<b>bold</b>`. The escaped pane shows the tags as characters; the raw and sanitized panes show bold text.',
      'Add `<img src=x onerror="alert(1)">`. In the raw pane the `onerror` attribute is highlighted: in a real page this would run as soon as the broken image fails to load. The sanitized pane keeps the image but drops `onerror` (or drops the image entirely, depending on the allowlist).',
      'Try `<a href="javascript:alert(1)">click</a>`. Note that the URL scheme itself is the attack: the sanitizer must check attribute values, not just names.',
      'Try `<script>alert(1)</script>`. Interesting detail: scripts inserted via innerHTML do not execute, which is why real attacks prefer event handlers and URLs; the sanitizer removes the tag anyway.',
      'Compare the panes and decide which one you would use for a product review, and which for rich text from a trusted editor (still sanitized: trust can change).',
    ],
    inCode: `\`\`\`tsx
// Safe by default: React escapes text
<p>{comment.body}</p>

// Dangerous: only with sanitized input
import DOMPurify from 'dompurify'
const clean = DOMPurify.sanitize(comment.html, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'li'],
  ALLOWED_ATTR: ['href'],
})
<div dangerouslySetInnerHTML={{ __html: clean }} />
\`\`\`

Other ways XSS sneaks past React's escaping:

- \`href\`/\`src\` built from user input (\`javascript:\` URLs). Validate the scheme (allow only \`https:\` and \`mailto:\`). React 19 blocks \`javascript:\` URLs in \`href\`, but do not rely on that alone.
- Serializing data into a \`<script>\` tag for hydration without escaping \`</script>\`.
- Server-side rendering of markdown into HTML without sanitizing.

Add a Content-Security-Policy as defence in depth (with \`require-trusted-types-for 'script'\`, React 19.3 accepts \`TrustedHTML\` from your sanitizing policy), and sanitize on the server where possible.`,
    realCase: {
      title: 'A support chat that leaked agent sessions',
      story: `**Situation:** a help-desk widget let customers send messages with simple formatting. To show bold and links, the agent dashboard rendered messages with \`dangerouslySetInnerHTML\` and a hand-written regex that removed \`<script>\` tags.

**Symptom:** a security researcher reported that a message containing an image with an \`onerror\` handler ran JavaScript in the agent's browser, where it could read the dashboard's data and act as the agent.

**Root cause:** the regex blocklist removed scripts but not event-handler attributes or \`javascript:\` links. Blocklists miss the many other ways HTML can execute code.

**Fix:** messages were stored as plain text plus a small markdown subset, rendered to HTML on the server and sanitized with an allowlist (DOMPurify configuration with a few tags and \`href\` restricted to https). The dashboard added a strict CSP without \`unsafe-inline\`, and session cookies were made \`HttpOnly\`.`,
    },
    challenges: [
      { q: 'Why is `{userInput}` in JSX safe from XSS?', a: 'React inserts it as a text node (escaped), so characters like `<` and `"` are shown literally and never parsed as HTML.' },
      { q: 'Why is an allowlist safer than a blocklist for sanitizing HTML?', a: 'An allowlist only keeps known-safe tags and attributes; anything new or obscure is removed. A blocklist must anticipate every dangerous construct, and attackers only need one it missed.' },
      { q: 'Is it safe to render `<a href={user.website}>` without checks?', a: 'Not entirely. A `javascript:` URL can execute code on click. Validate the URL and allow only safe schemes such as https.' },
      { q: 'Why might `<script>` inserted via innerHTML not run, while `<img onerror>` does?', a: 'Browsers do not execute script elements inserted through innerHTML, but event-handler attributes on inserted elements still fire, e.g. when the image fails to load.' },
    ],
  },
}
