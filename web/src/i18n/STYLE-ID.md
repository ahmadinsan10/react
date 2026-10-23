# Panduan gaya: Bahasa Indonesia (Indonesian style guide)

This app teaches React to Indonesian developers. The Indonesian version must read as if it were **written in Indonesian by an experienced Indonesian engineer**, not translated. Same meaning, same technical precision, same examples, natural Indonesian.

## Voice
- Address the learner as **"kamu"** (friendly, modern dev-course tone). Never mix with "Anda".
- Clear, direct, conversational but professional. Short sentences are fine. Avoid stiff formal register ("adalah merupakan", "dikarenakan", "dalam rangka").
- Rewrite idioms and analogies so they land for an Indonesian reader. Do not translate English idioms literally ("rule of thumb" → "patokan praktis", not "aturan jempol"; "low-hanging fruit" → "perbaikan yang paling gampang dulu").
- Keep the same structure (headings, lists, emphasis) and the same facts. Do not add or remove technical claims.

## Technical terms
Keep established English terms that Indonesian developers use daily. Do not italicize them. Examples:
state, props, render, re-render, component, hook, effect, dependency array, callback, closure, event loop, promise, async/await, cache, bundle, build, deploy, release, commit, merge, pull request, branch, router, route, query, mutation, fetch, endpoint, payload, token, session, cookie, middleware, server, client, frontend, backend, framework, library, debounce, throttle, lazy loading, code splitting, hydration, streaming, test, unit test, integration test, mock, snapshot, CI/CD, monorepo, design system, accessibility (a11y) or aksesibilitas, focus, screen reader, keyboard, layout, refactor, bug, edge case, race condition, overhead, trade-off.

Translate words that have natural Indonesian equivalents:
- performance → performa, user → pengguna, developer → developer/pengembang (prefer "developer"), team → tim, page → halaman, button → tombol, form → form/formulir, input → input, data → data, browser → browser, function → fungsi, variable → variabel, object → objek, array → array, string → string, error → error, value → nilai, feature → fitur, behaviour → perilaku, requirement → kebutuhan, mental model → model mental, best practice → praktik terbaik, pitfall → jebakan, exercise → latihan, real-world case → kasus nyata, interview question → pertanyaan interview.
- When a term may be unfamiliar, you may add the English once in parentheses, e.g. "pembatas (boundary)".

## Code
- **Code must stay byte-for-byte identical** to the English version: identifiers, strings, comments, formatting, everything inside ``` fences and in `example.code`. Tests enforce this.
- Inline `code` spans stay as they are.
- Prose around code is translated.

## Formatting rules (the renderer is minimal)
Only: paragraphs, `inline code`, **bold**, *italic*, "- " bullets, "1. " numbered lines, "### " headings, ``` fences. In TS template literals escape backticks as \` and `${` as \${.

## Examples of the expected quality
- EN: "Effects are for synchronizing with external systems."
  - ❌ "Efek adalah untuk menyinkronkan dengan sistem eksternal."
  - ✅ "Effect dipakai untuk menyinkronkan komponen dengan sistem di luar React."
- EN: "This is the root of many React behaviours."
  - ❌ "Ini adalah akar dari banyak perilaku React."
  - ✅ "Banyak perilaku React berawal dari sini."
- EN: "Don't let it block your progress."
  - ✅ "Jangan sampai ini menghambat progres belajarmu."
