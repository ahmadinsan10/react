import type { TopicDetail } from '../types'

const details: Record<string, TopicDetail> = {
  quality: {
    explanation: `Code quality tooling is how a team turns its opinions into automated checks. Done well, it ends arguments about style in review, catches real bugs before they reach CI, and lets a new hire run one command to get the same feedback as a senior.

### The layers
- **TypeScript in strict mode** catches type errors. Turn on \`strict\`, \`noUncheckedIndexedAccess\` and \`exactOptionalPropertyTypes\` if your codebase can take it. Each flag removes a class of runtime bug.
- **ESLint** catches *semantic* mistakes the compiler allows: broken hook dependencies, hooks called conditionally, missing \`alt\` text, unused promises. Today ESLint uses the **flat config** (\`eslint.config.js\`), an array of config objects that are merged in order. It replaced \`.eslintrc\` and the cascading lookup.
- **A formatter** (Prettier or Biome) owns whitespace and quotes. Formatting is not linting. Turn off ESLint's stylistic rules so the two tools never disagree.
- **Git hooks** (Husky + lint-staged) run fast checks only on staged files before a commit. CI still runs the full suite, because hooks can be skipped.

### React-specific rules
\`eslint-plugin-react-hooks\` is the single most valuable plugin. \`rules-of-hooks\` prevents the linked-list corruption you learned about in React internals, and \`exhaustive-deps\` catches stale closures. Recent versions also ship rules that flag code the React Compiler cannot optimise, such as mutating values during render or reading refs in render. Check the plugin docs for the current preset name, because it has been renamed across major versions. \`eslint-plugin-jsx-a11y\` catches the cheap accessibility mistakes: clickable \`div\`s, labels without controls and missing alt text.

### Sharing in a monorepo
Put the config in a package such as \`@acme/eslint-config\` that exports an array. Each app spreads it and adds local overrides. Version the package like any other, so a rule change goes through review once instead of being copy-pasted into twelve repos.

### When not to bother
A weekend prototype does not need lint-staged. But every rule you postpone costs more to turn on later, because you have to fix the backlog of violations first. Start strict on new projects. On legacy ones, enable a new rule as a warning, fix the code gradually, then promote it to an error.`,
    examples: [
      {
        title: 'Shared flat config package',
        code: `// packages/eslint-config/index.js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default [
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  reactHooks.configs['recommended-latest'], // name varies by version: check the docs
  jsxA11y.flatConfigs.recommended,
  {
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  { ignores: ['dist/**', '.next/**', 'coverage/**'] },
]

// apps/web/eslint.config.js
import base from '@acme/eslint-config'
export default [...base, { files: ['src/legacy/**'], rules: { '@typescript-eslint/no-explicit-any': 'warn' } }]`,
        note: 'Flat config is just an array. Later entries override earlier ones, and the `files` globs scope a relaxed rule to legacy code instead of turning it off everywhere.',
      },
      {
        title: '❌ Lint everything on commit vs ✅ lint-staged',
        code: `// ❌ .husky/pre-commit
pnpm lint && pnpm test   // 90 seconds: people start using --no-verify

// ✅ .husky/pre-commit
pnpm exec lint-staged

// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix --max-warnings=0", "prettier --write"],
    "*.{json,md,css}": "prettier --write"
  }
}`,
        note: 'Hooks must be fast or people bypass them. Run only on staged files and leave the full typecheck and tests to CI.',
      },
    ],
    realCase: {
      title: 'The silent stale closure',
      story: `A fintech dashboard team had disabled \`react-hooks/exhaustive-deps\` because the warnings were "noisy". A polling hook captured \`accountId\` in an interval callback with an empty dependency array. When users switched accounts, the chart kept polling the first account, so customers saw balances from the wrong account until they reloaded the page.

**Root cause:** the lint rule that would have flagged the missing dependency was off.

**Fix:** they re-enabled the rule as an error, fixed about 40 violations (mostly by moving functions into effects or using functional updates), and added a CI step that fails on warnings.

**Lesson:** a lint rule that "only" warns about hooks is usually warning about a real bug.`,
    },
    pitfalls: [
      'Letting ESLint stylistic rules fight Prettier. Let the formatter own formatting.',
      'Silencing `exhaustive-deps` with a disable comment instead of fixing the dependency design.',
      'Relying on pre-commit hooks as the only gate. They can be skipped, so CI must re-run everything.',
      'Copy-pasting configs between apps so they drift. Publish a shared config package.',
      'Turning on a strict rule as an error in a large legacy codebase at once. Ratchet it in as a warning first.',
    ],
    exercise: {
      task: 'Create a shared ESLint flat config package in a repo with two apps. Enable react-hooks, jsx-a11y and type-aware TypeScript rules, and add lint-staged with Husky so only staged files are checked.',
      hint: 'Type-aware rules need `languageOptions.parserOptions.projectService: true`.',
      solution: `\`\`\`js
// packages/eslint-config/index.js
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default tseslint.config(
  ...tseslint.configs.recommendedTypeChecked,
  reactHooks.configs['recommended-latest'],
  jsxA11y.flatConfigs.recommended,
  { languageOptions: { parserOptions: { projectService: true } } },
)
\`\`\`

Then run \`pnpm add -D husky lint-staged\` at the root and \`pnpm exec husky init\`. Put \`pnpm exec lint-staged\` in \`.husky/pre-commit\` and add the \`lint-staged\` block shown in the example. Test it by staging a file with a conditional hook. The commit should be rejected.`,
    },
    interview: [
      'What is the difference between a linter and a formatter, and why should they not overlap?',
      'Why can pre-commit hooks not replace CI checks?',
      'How would you introduce a strict new lint rule into a 300k-line codebase?',
    ],
  },

  cicd: {
    explanation: `Continuous integration means every change is merged into a shared branch frequently and verified automatically. Continuous delivery or deployment means every verified change *can* go (or does go) to production with no manual steps. For a React app, the pipeline is the safety net that lets a team ship many times a day.

### The standard pipeline
1. **Install** with a frozen lockfile (\`pnpm install --frozen-lockfile\`) so CI gets exactly what you tested locally.
2. **Lint** and **typecheck**. These are fast, cheap and catch most mistakes. Run them in parallel.
3. **Unit and component tests** (Vitest + Testing Library).
4. **Build** the production bundle. A build can fail where dev mode does not, for example on a server-only import in a client component.
5. **End-to-end tests** (Playwright) against the built app or a preview URL.
6. **Deploy**: a preview for every PR, production on merge to \`main\`.

### Preview deployments
A preview is a full copy of the app deployed at a unique URL for each PR. Reviewers, designers and PMs can click through the change instead of reading a diff. Playwright can run against the preview, which is closer to production than localhost. Previews need their own environment variables and usually a seeded or branch database. Never point previews at the production database with write access.

### Speed matters
A 25-minute pipeline changes behaviour: people batch changes, merge less often and skip the queue. Techniques that help:
- Cache the package store and build outputs (for example \`actions/setup-node\` with cache, or Turborepo remote cache).
- Run only affected packages in a monorepo (\`turbo run test --filter=...[origin/main]\`).
- Shard Playwright across machines.
- Cancel superseded runs on the same branch with a \`concurrency\` group.

### Safe releases
Require status checks and review through branch protection. Deploy small changes, watch error rates and Web Vitals, and be able to roll back in one click. Feature flags separate *deploying* code from *releasing* a feature. Secrets live in the CI provider's secret store, and workflows triggered by forks must not receive them.`,
    examples: [
      {
        title: 'GitHub Actions pipeline for a pnpm app',
        code: `# .github/workflows/ci.yml
name: ci
on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test -- --coverage
      - run: pnpm build

  e2e:
    needs: verify
    runs-on: ubuntu-latest
    strategy:
      matrix: { shard: [1, 2, 3] }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm exec playwright test --shard=\${{ matrix.shard }}/3`,
        note: 'The `concurrency` group cancels outdated runs. The frozen lockfile makes installs reproducible, and the matrix shards slow E2E tests across three runners.',
      },
      {
        title: '❌ Secrets in pull_request_target vs ✅ least privilege',
        code: `# ❌ runs fork code with repository secrets available
on: pull_request_target
jobs:
  test:
    steps:
      - uses: actions/checkout@v4
        with: { ref: \${{ github.event.pull_request.head.sha }} }
      - run: pnpm install && pnpm test   # a malicious postinstall can read secrets
        env: { DEPLOY_TOKEN: \${{ secrets.DEPLOY_TOKEN }} }

# ✅ untrusted code runs without secrets and with a read-only token
on: pull_request
permissions:
  contents: read`,
        note: '`pull_request_target` runs in the context of the base repo with its secrets. Checking out and executing fork code there hands your secrets to anyone who opens a PR.',
      },
    ],
    realCase: {
      title: 'Green CI, broken production build',
      story: `A SaaS team ran lint and tests on every PR but only built on deploy. A developer imported a server-only database helper into a component marked \`'use client'\`. Tests passed because they mocked the module. On merge, the production build failed and blocked three other releases for an afternoon.

**Root cause:** the pipeline did not run the step that actually failed.

**Fix:** they added \`pnpm build\` to the PR pipeline and preview deployments, so every PR proved it could be built and opened.

**Lesson:** CI should run what production runs. If a step can fail at deploy time, run it before merge.`,
    },
    pitfalls: [
      'Skipping the production build in CI. Dev mode and tests hide many build-time errors.',
      'Using `npm install` instead of a frozen lockfile, so CI tests different versions than your laptop.',
      'Giving preview deployments production secrets or write access to the production database.',
      'Letting the pipeline grow slow without caching, sharding or affected-only runs.',
      'Running fork PR code in `pull_request_target` with secrets available.',
    ],
    exercise: {
      task: 'Write a GitHub Actions workflow that lints, typechecks, tests and builds a Vite React app on every PR. Cancel superseded runs and upload the `dist` folder as an artifact.',
      hint: 'Use `actions/upload-artifact` after the build step and a `concurrency` group keyed on the ref.',
      solution: `\`\`\`yaml
name: ci
on: [pull_request]
concurrency: { group: ci-\${{ github.ref }}, cancel-in-progress: true }
permissions: { contents: read }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint && pnpm exec tsc -b && pnpm test --run
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist }
\`\`\``,
    },
    interview: [
      'What does a preview deployment give you that a green test suite does not?',
      'Your pipeline takes 30 minutes. What would you do to bring it under 10?',
      'What is the difference between deploying a feature and releasing it?',
    ],
  },

  errors: {
    explanation: `Production apps fail in ways you never saw locally: flaky networks, old browsers, odd data, browser extensions that mutate the DOM. Observability is how you find out *before* users email support, and error boundaries are how you make sure one broken widget does not blank the whole screen.

### Error boundaries
An error boundary is a component that catches errors thrown **during render, in lifecycle methods and in constructors** of its subtree, and renders a fallback instead. It does *not* catch errors in event handlers, in async code such as \`setTimeout\` or fetch callbacks, or in the boundary itself. Those need \`try/catch\` or a global handler. Boundaries are still class components under the hood (\`getDerivedStateFromError\` + \`componentDidCatch\`), so most teams use \`react-error-boundary\`.

Place them in layers:
- **Root**: last resort, a full-page "something went wrong" with a reload button.
- **Route**: in Next.js this is the \`error.tsx\` file per segment. The layout and navigation stay usable.
- **Widget**: around independent panels such as a chart or comments, so a failure stays local.

Give boundaries a way to **reset**: a retry button, and \`resetKeys\` so navigating away clears the error.

### Reporting
React 19 adds \`onCaughtError\`, \`onUncaughtError\` and \`onRecoverableError\` options to \`createRoot\` and \`hydrateRoot\`. These give you one place to forward errors (including hydration mismatches) to a service like Sentry. Upload **source maps** to the service in CI, but do not serve them publicly, so stack traces point to your TypeScript instead of minified code. Attach context: release version, route, user id (not email), and feature flags.

### Real User Monitoring
Lab tools like Lighthouse test one machine. RUM collects **Core Web Vitals** (LCP, INP, CLS) from real users with the \`web-vitals\` library, so you can see that, for example, INP is poor on low-end Android on the search page. Track the 75th percentile, not the average.

### Feature flags
Flags let you ship code dark and enable it for 1%, then 10%, then everyone, while watching error rates. If errors spike, turn the flag off. That is faster than a rollback. Remove flags once a feature is fully launched, or they become permanent complexity.`,
    examples: [
      {
        title: 'Layered boundaries with reset',
        code: `import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import * as Sentry from '@sentry/react'

function WidgetFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert" className="widget-error">
      <p>This panel failed to load.</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}

export function Dashboard({ accountId }: { accountId: string }) {
  return (
    <main>
      <ErrorBoundary
        FallbackComponent={WidgetFallback}
        resetKeys={[accountId]}
        onError={(error, info) =>
          Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
        }
      >
        <RevenueChart accountId={accountId} />
      </ErrorBoundary>
      <ErrorBoundary FallbackComponent={WidgetFallback}>
        <ActivityFeed accountId={accountId} />
      </ErrorBoundary>
    </main>
  )
}`,
        note: 'Each panel fails independently. `resetKeys` clears the error when the account changes, so users are not stuck on a stale error state.',
      },
      {
        title: '❌ Expecting a boundary to catch handler errors vs ✅ handling them',
        code: `// ❌ The boundary never sees this: it is thrown in an event handler
<button onClick={async () => { await saveDraft(form) }}>Save</button>

// ✅ Handle it locally, report it, and tell the user
const { showBoundary } = useErrorBoundary()
async function onSave() {
  try {
    await saveDraft(form)
  } catch (err) {
    Sentry.captureException(err)
    if (isFatal(err)) showBoundary(err) // escalate to the boundary on purpose
    else toast.error('Could not save. Your changes are kept locally.')
  }
}`,
        note: 'Boundaries only catch render-time errors. `useErrorBoundary().showBoundary` lets you deliberately escalate an async error to the nearest boundary.',
      },
      {
        title: 'Root-level reporting in React 19',
        code: `import { createRoot } from 'react-dom/client'
import { onCLS, onINP, onLCP } from 'web-vitals'

createRoot(document.getElementById('root')!, {
  onUncaughtError: (error, info) => report('uncaught', error, info.componentStack),
  onCaughtError: (error, info) => report('caught', error, info.componentStack),
  onRecoverableError: (error) => report('recoverable', error),
}).render(<App />)

const send = (metric: { name: string; value: number; id: string }) =>
  navigator.sendBeacon('/rum', JSON.stringify({ ...metric, path: location.pathname }))
onLCP(send); onINP(send); onCLS(send)`,
        note: '`sendBeacon` delivers metrics even while the page unloads. Recoverable errors include hydration mismatches that React fixed by re-rendering on the client.',
      },
    ],
    realCase: {
      title: 'One chart took down checkout',
      story: `An e-commerce site added a "frequently bought together" carousel to the cart page. The recommendation API sometimes returned \`null\` for a price, and the component called \`price.toFixed(2)\`. With only a root error boundary, the whole cart page was replaced by an error screen, and checkout conversions dropped for several hours before anyone noticed, because nobody was alerted on client errors.

**Fix:** a widget-level boundary around the carousel (fallback: render nothing), schema validation of the API response, and a Sentry alert on new error spikes per release.

**Lesson:** put boundaries around non-critical UI so it fails alone, and alert on client errors the same way you alert on server 500s.`,
    },
    pitfalls: [
      'Expecting error boundaries to catch errors in event handlers, promises or timers. They only catch render and lifecycle errors.',
      'Using only one root boundary, so any widget failure blanks the whole app.',
      'Uploading source maps to a public URL, which exposes your source code. Upload them to the error service only.',
      'Reporting averages for Web Vitals. Track the 75th percentile per page and device type.',
      'Never removing feature flags, so dead code paths pile up.',
    ],
    exercise: {
      task: 'Build a `SafeWidget` wrapper that renders children inside an error boundary, shows a retry button, reports to a `report(error, context)` function with the widget name, and resets when a `resetKey` prop changes.',
      hint: 'Wrap `react-error-boundary` and pass `resetKeys={[resetKey]}`.',
      solution: `\`\`\`tsx
import { ErrorBoundary } from 'react-error-boundary'
import type { ReactNode } from 'react'

export function SafeWidget({ name, resetKey, children }: { name: string; resetKey?: unknown; children: ReactNode }) {
  return (
    <ErrorBoundary
      resetKeys={[resetKey]}
      onError={(error, info) => report(error, { widget: name, stack: info.componentStack })}
      fallbackRender={({ resetErrorBoundary }) => (
        <div role="alert">
          <p>{name} is unavailable.</p>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
\`\`\``,
    },
    interview: [
      'Which errors do error boundaries not catch, and how do you handle those?',
      'Where would you place error boundaries in a dashboard app and why?',
      'How do feature flags reduce deployment risk?',
    ],
  },

  security: {
    explanation: `Front-end security is mostly about three things: never letting attacker-controlled data run as code (XSS), never shipping secrets to the browser, and keeping your dependency tree trustworthy.

### React's default protection
When you write \`{comment.body}\` in JSX, React sets it as a text node, so \`<script>\` arrives as harmless text. That covers most XSS. The escape hatches are where bugs live:
- \`dangerouslySetInnerHTML\` inserts raw HTML. If any part of it comes from users, a CMS or a third-party API, sanitize it with **DOMPurify** first, ideally with a strict allow-list.
- **URLs**: \`<a href={userUrl}>\` with \`javascript:alert(1)\` executes code on click. React warns about \`javascript:\` URLs and may block them in some versions, but validate the protocol yourself (allow only \`http:\`, \`https:\` and \`mailto:\`).
- Spreading untrusted objects into props (\`<div {...userProps}>\`) can inject \`dangerouslySetInnerHTML\` or event handlers.
- Server-rendered JSON in a script tag must be escaped so \`</script>\` in the data cannot close the tag.

### Content Security Policy
CSP is an HTTP header telling the browser which sources may run scripts, load styles, frames and so on. A strict policy based on **nonces** (a random value generated per request, added to allowed script tags) means that even if an attacker injects markup, the browser refuses to run their script. In Next.js you generate the nonce in \`proxy.ts\` and set the header there. Nonces force dynamic rendering, so check the Next.js CSP guide for the current trade-offs. Start with \`Content-Security-Policy-Report-Only\` to find violations before enforcing.

### Trusted Types
The CSP directive \`require-trusted-types-for 'script'\` makes the browser reject plain strings passed to dangerous sinks like \`innerHTML\`; only \`TrustedHTML\` (created by a policy you control, e.g. one that runs DOMPurify) is accepted. Since React 19.3, React passes \`TrustedHTML\`, \`TrustedScript\` and \`TrustedScriptURL\` values through to the DOM, so \`dangerouslySetInnerHTML={{ __html: policy.createHTML(html) }}\` works under that policy and every raw-HTML path is forced through your sanitizer.

### Secrets
Everything in a client bundle is public. Vite exposes \`import.meta.env.VITE_*\` and Next.js exposes \`NEXT_PUBLIC_*\` to the browser *by design*. Private keys belong only in server code: route handlers, Server Actions, Server Components. Use the \`server-only\` package so importing a secret-reading module from a client component fails the build. If a secret leaks, **rotate it**. Deleting the commit is not enough.

### Dependencies and auth
Run Renovate or Dependabot, review lockfile diffs, and run \`pnpm audit\` in CI. Store sessions in \`HttpOnly\`, \`Secure\`, \`SameSite\` cookies rather than \`localStorage\`, where any XSS can read them. And remember that **every Server Action is a public endpoint**: always authorize on the server, because client-side checks only hide buttons.`,
    examples: [
      {
        title: '❌ Raw CMS HTML vs ✅ sanitized',
        code: `import DOMPurify from 'isomorphic-dompurify'

// ❌ Any <img onerror=...> in the CMS runs in your users' sessions
export function ArticleBad({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

// ✅ Allow-list the tags and attributes the design actually needs
const clean = (html: string) =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'a', 'strong', 'em', 'ul', 'ol', 'li', 'h2', 'h3', 'code', 'pre'],
    ALLOWED_ATTR: ['href'],
    ALLOWED_URI_REGEXP: /^(https?:|mailto:)/i,
  })

export function Article({ html }: { html: string }) {
  return <div className="prose" dangerouslySetInnerHTML={{ __html: clean(html) }} />
}`,
        note: 'Sanitize as close to rendering as possible, with an allow-list. Restricting URIs blocks `javascript:` links inside the HTML too.',
      },
      {
        title: 'Nonce-based CSP in Next.js proxy.ts',
        code: `// proxy.ts (Next.js 16+, Node.js runtime by default; middleware.ts is deprecated)
import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'nonce-" + nonce + "' 'strict-dynamic'",
    "style-src 'self' 'nonce-" + nonce + "'",
    "img-src 'self' blob: data: https://images.acme-cdn.example",
    "connect-src 'self' https://api.acme.example",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ')

  const headers = new Headers(request.headers)
  headers.set('x-nonce', nonce)
  const response = NextResponse.next({ request: { headers } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}`,
        note: 'A fresh nonce per request means an injected script tag cannot guess it. `frame-ancestors none` also blocks clickjacking. Confirm the exact setup in the current Next.js CSP docs.',
      },
      {
        title: '❌ Secret in client env vs ✅ server-only module',
        code: `// ❌ Ends up in the JS bundle that every visitor downloads
const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY!)

// ✅ lib/payments.ts
import 'server-only'
import Stripe from 'stripe'
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
// Importing this file from a 'use client' component now fails the build.`,
        note: 'The `NEXT_PUBLIC_` and `VITE_` prefixes mean "ship to the browser". Secrets must never use them.',
      },
    ],
    realCase: {
      title: 'The maps key that paid for someone else',
      story: `A travel startup put a paid geocoding API key into \`VITE_GEOCODE_KEY\` so the React app could call the API directly. The key had no domain restriction. Weeks later the monthly bill was many times the usual amount: someone had extracted the key from the bundle and was using it for their own service.

**Root cause:** a server-side credential was exposed through a client-side env var.

**Fix:** they rotated the key, moved the calls behind a small server route that enforced rate limits and authentication, and added a CI check that scans the built \`dist\` folder for known secret patterns.

**Lesson:** if the browser can read it, so can everyone. Treat bundle contents as public.`,
    },
    pitfalls: [
      'Passing unsanitized CMS or user HTML to `dangerouslySetInnerHTML`.',
      'Rendering user-supplied URLs in `href` without checking the protocol.',
      'Putting secrets in `VITE_*` or `NEXT_PUBLIC_*` variables.',
      'Storing auth tokens in `localStorage`, where any XSS can steal them.',
      'Checking permissions only in the UI and not in the Server Action or API route.',
    ],
    exercise: {
      task: 'Write a `SafeLink` component that renders an anchor only if the URL uses http, https or mailto, adds `rel="noopener noreferrer"` for external links, and otherwise renders plain text.',
      hint: 'Parse with `new URL(href, window.location.origin)` inside try/catch and check `.protocol`.',
      solution: `\`\`\`tsx
const ALLOWED = new Set(['http:', 'https:', 'mailto:'])

export function SafeLink({ href, children }: { href: string; children: React.ReactNode }) {
  let url: URL
  try {
    url = new URL(href, window.location.origin)
  } catch {
    return <span>{children}</span>
  }
  if (!ALLOWED.has(url.protocol)) return <span>{children}</span>
  const external = url.origin !== window.location.origin
  return (
    <a href={url.href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
    </a>
  )
}
\`\`\``,
    },
    interview: [
      'React escapes output by default. Name three ways XSS can still happen in a React app.',
      'How does a nonce-based CSP stop injected scripts from running?',
      'A secret key was committed and deployed in a client bundle. What are your steps?',
    ],
  },

  i18n: {
    explanation: `Internationalization (i18n) is preparing an app so it can be translated and formatted for any locale. Localization (l10n) is doing it for a specific one. Retrofitting i18n is painful, so the earlier you design for it the cheaper it is.

### Messages, not strings
Never build sentences by concatenation: \`"You have " + n + " items"\`. Word order, plural forms and grammar differ by language. Instead, use **message IDs** with **ICU MessageFormat**, which can express variables, plurals and selections inside one translatable string. Translators then get the whole sentence.

### Plurals are not singular/plural
English has two plural categories (\`one\`, \`other\`). Arabic has six (\`zero\`, \`one\`, \`two\`, \`few\`, \`many\`, \`other\`). Polish distinguishes \`few\` and \`many\`. Indonesian and Japanese use just \`other\`. ICU \`plural\` uses the CLDR rules (exposed in JavaScript as \`Intl.PluralRules\`) to pick the right branch, and \`=0\` lets you write an exact match for zero. \`select\` handles cases like grammatical gender.

### Libraries
- **react-intl** (FormatJS) is ICU-native: \`<FormattedMessage>\` and \`useIntl().formatMessage\`.
- **i18next / react-i18next** has a large plugin ecosystem. It has its own plural syntax by default, and ICU is available via a plugin.
- **next-intl** is popular in Next.js App Router apps and works in Server Components.

Load only the active locale's messages (dynamic import per locale) so you do not ship every language to every user.

### Format with Intl
Dates, numbers, currencies, relative times and lists all have built-in formatters: \`Intl.DateTimeFormat\`, \`Intl.NumberFormat\`, \`Intl.RelativeTimeFormat\`, \`Intl.ListFormat\`. Formatting \`1234.5\` gives \`1,234.5\` in en-US, \`1.234,5\` in de-DE and \`1.234,5\` in id-ID. Watch out for **hydration**: if the server formats in UTC with one locale and the client in the user's time zone, the text differs. Pass the locale and time zone explicitly on both sides.

### Right-to-left
For Arabic and Hebrew, set \`<html dir="rtl" lang="ar">\`. Use CSS **logical properties** (\`margin-inline-start\`, \`padding-inline-end\`, \`inset-inline-start\`) instead of left/right so layouts mirror automatically. Flip directional icons like arrows, but not logos or media controls.

### Process
Extract messages with a CLI, send them to translators or a TMS, and fail CI on missing keys. Pseudo-localization (for example \`[Ŝéţţîñĝš___]\`) reveals hard-coded strings and layouts that break with longer text. German is often 30% longer than English.`,
    examples: [
      {
        title: '❌ Concatenation vs ✅ ICU plural',
        code: `// ❌ breaks for 0, for 1 in other languages, and for word order
<p>{'You have ' + count + ' new message' + (count === 1 ? '' : 's')}</p>

// ✅ messages/en.json
{
  "inbox.newMessages": "{count, plural, =0 {No new messages} one {# new message} other {# new messages}}"
}
// messages/ar.json uses zero/one/two/few/many/other branches

// Component
import { FormattedMessage } from 'react-intl'
<p><FormattedMessage id="inbox.newMessages" values={{ count }} /></p>`,
        note: '`#` is replaced by the locale-formatted number. Translators can add as many plural branches as their language needs without any code change.',
      },
      {
        title: 'Intl formatting with an explicit locale and time zone',
        code: `export function OrderSummary({ order, locale, timeZone }: {
  order: { total: number; currency: string; placedAt: string; items: string[] }
  locale: string
  timeZone: string
}) {
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency: order.currency })
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short', timeZone })
  const list = new Intl.ListFormat(locale, { type: 'conjunction' })

  return (
    <dl>
      <dt>Total</dt><dd>{money.format(order.total)}</dd>
      <dt>Placed</dt><dd>{date.format(new Date(order.placedAt))}</dd>
      <dt>Items</dt><dd>{list.format(order.items)}</dd>
    </dl>
  )
}`,
        note: 'Passing `locale` and `timeZone` from the server (for example from user settings) gives the same output on server and client, which avoids hydration mismatches.',
      },
      {
        title: 'RTL-safe CSS with logical properties',
        code: `/* ❌ only correct for left-to-right */
.card { padding-left: 16px; border-left: 4px solid var(--accent); text-align: left; }

/* ✅ mirrors automatically under dir="rtl" */
.card { padding-inline-start: 16px; border-inline-start: 4px solid var(--accent); text-align: start; }
[dir='rtl'] .icon-arrow { transform: scaleX(-1); }`,
        note: 'Logical properties map to left or right depending on the writing direction, so one stylesheet serves both.',
      },
    ],
    realCase: {
      title: 'The "1 items" bug in eight languages',
      story: `A logistics company launched in Poland and the Middle East. Their app used \`t('items') + count\` with keys \`items_singular\` and \`items_plural\` chosen by \`count === 1\`. Polish users saw grammatically wrong text for 2 to 4 and for 22 to 24 items, and Arabic users saw wrong forms almost everywhere. Support tickets called the app "machine translated".

**Root cause:** English plural logic was hard-coded in the component.

**Fix:** they migrated to ICU messages so plural selection used CLDR rules per locale, and added a pseudo-locale build to catch concatenated strings.

**Lesson:** plural rules belong to the language, not to your code. Never branch on \`count === 1\` for display text.`,
    },
    pitfalls: [
      'Concatenating translated fragments, which breaks word order in other languages.',
      'Assuming every language has only singular and plural.',
      'Formatting dates without an explicit time zone, causing hydration mismatches and wrong days.',
      'Using `left`/`right` CSS instead of logical properties, so RTL layouts break.',
      'Bundling every locale into the main chunk instead of loading the active one.',
    ],
    exercise: {
      task: 'Write a `formatRelative(date, now, locale)` helper that returns strings like "3 days ago" or "in 2 hours" using `Intl.RelativeTimeFormat`, choosing the largest sensible unit. Then write an ICU message for "{name} liked your photo" / "{name} and {count} others liked your photo".',
      hint: 'Compute the difference in seconds and walk down a list of units with their sizes in seconds.',
      solution: `\`\`\`ts
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000], ['month', 2592000], ['week', 604800],
  ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1],
]

export function formatRelative(date: Date, now: Date, locale: string) {
  const diff = (date.getTime() - now.getTime()) / 1000
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  for (const [unit, size] of UNITS) {
    if (Math.abs(diff) >= size || unit === 'second') return rtf.format(Math.round(diff / size), unit)
  }
  return ''
}
\`\`\`

ICU message:

\`\`\`
{count, plural, =0 {{name} liked your photo} one {{name} and # other liked your photo} other {{name} and # others liked your photo}}
\`\`\``,
    },
    interview: [
      'Why is string concatenation harmful for translation?',
      'How do you avoid hydration mismatches when formatting dates on the server?',
      'What changes are needed to support right-to-left languages?',
    ],
  },

  monorepo: {
    explanation: `A monorepo stores several apps and packages in one repository. For React teams the usual reason is sharing: one design-system package, one ESLint config, one TypeScript base config and shared API types, used by a customer app, an admin app and a marketing site.

### The pieces
- **pnpm workspaces** link local packages together. \`"@acme/ui": "workspace:*"\` in an app's \`package.json\` resolves to \`packages/ui\` on disk, so a change to a button is visible in every app immediately. pnpm's strict \`node_modules\` layout also stops packages from importing dependencies they did not declare.
- **Turborepo** is a task runner. You declare tasks in \`turbo.json\` with their dependencies (\`"dependsOn": ["^build"]\` means "build my workspace dependencies first") and their outputs. Turbo builds a task graph, runs independent tasks in parallel, and **caches** results by hashing the inputs (source files, env vars, lockfile). If nothing changed, it replays the output in milliseconds. With **remote caching**, CI and teammates share that cache.
- **Filtering**: \`turbo run test --filter=...[origin/main]\` runs tasks only for packages changed since \`main\` and their dependents.

### Internal package strategies
1. **Just-in-time (source) packages**: \`packages/ui\` exports \`.tsx\` files directly and each app's bundler compiles them. Simple and fast to set up. Next.js needs \`transpilePackages\`.
2. **Compiled packages**: each package builds to \`dist\` with tsup or tsc. Needed if you publish to npm, and it gives better cache boundaries.

Use TypeScript **project references** or the \`exports\` field so editors resolve types correctly.

### Boundaries
A monorepo makes it easy to import anything from anywhere, which is also its danger. Enforce boundaries: apps may import packages, packages must never import apps, and a \`ui\` package should not depend on a \`data\` package. Tools like ESLint import rules or Nx module boundaries can enforce this.

### When not to
If two apps share nothing and have different teams and release cycles, separate repos are simpler. Monorepos need tooling investment: CI caching, CODEOWNERS and dependency policies. The pay-off grows with the amount of shared code.`,
    examples: [
      {
        title: 'Workspace layout and turbo.json',
        code: `// pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'

// apps/web/package.json (excerpt)
{ "dependencies": { "@acme/ui": "workspace:*", "@acme/api-types": "workspace:*" } }

// turbo.json
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "env": ["NEXT_PUBLIC_API_URL"]
    },
    "lint": { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "dev": { "cache": false, "persistent": true }
  }
}`,
        note: '`^build` means dependencies build first. Declaring `outputs` lets Turbo restore them from cache, and listing `env` makes the env var part of the cache key, so changing it invalidates the build.',
      },
      {
        title: '❌ Undeclared env var vs ✅ declared in the hash',
        code: `// ❌ build reads process.env.NEXT_PUBLIC_API_URL but turbo.json does not list it
// Staging and production builds hash the same, so CI restores the staging bundle
// (pointing at the staging API) for the production deploy.

// ✅ turbo.json
"build": { "dependsOn": ["^build"], "outputs": [".next/**"], "env": ["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_SENTRY_DSN"] }`,
        note: 'A cache is only correct if its key includes every input. Undeclared env vars are the classic source of wrong cache hits. Recent Turborepo versions use strict env mode to help catch this.',
      },
    ],
    realCase: {
      title: 'Production pointed at staging',
      story: `A retail team moved three apps into a Turborepo monorepo and cut CI time from 18 to 4 minutes with remote caching. A week later the production storefront was calling the staging API. The build for staging had run first and been cached. The production build had identical source files, and \`NEXT_PUBLIC_API_URL\` was not declared in \`turbo.json\`, so Turbo reported a cache hit and deployed the staging bundle.

**Fix:** they declared all build-time env vars in \`env\`, turned on strict env mode, and added a smoke test that checks the deployed API URL.

**Lesson:** caching is a correctness feature, not just a speed feature. Every input must be part of the hash.`,
    },
    pitfalls: [
      'Not declaring env vars in `turbo.json`, which causes incorrect cache hits.',
      'Forgetting `outputs`, so a cache hit restores logs but no build artifacts.',
      'Letting packages import from apps, creating cycles and tangled ownership.',
      'Using different versions of React in different workspaces, which leads to duplicate React and broken hooks.',
    ],
    exercise: {
      task: 'Create a pnpm + Turborepo monorepo with `apps/web` (Vite React), `packages/ui` (a Button component) and `packages/tsconfig`. Make `web` consume `@acme/ui`, then run `turbo run build` twice and confirm the second run is a full cache hit.',
      hint: 'Use `workspace:*` for the dependency and give `ui` a `build` script that outputs to `dist`.',
      solution: `\`\`\`json
// packages/ui/package.json
{
  "name": "@acme/ui",
  "type": "module",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "scripts": { "build": "tsup src/index.tsx --dts --format esm --external react" },
  "peerDependencies": { "react": "^19.0.0" }
}
\`\`\`

\`\`\`json
// turbo.json
{ "tasks": { "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] } } }
\`\`\`

The second \`pnpm turbo run build\` should print "FULL TURBO" with every task cached. Making React a peer dependency keeps one copy of React in the app.`,
    },
    interview: [
      'How does Turborepo decide whether a task is a cache hit?',
      'Compare just-in-time internal packages with compiled packages.',
      'When would you choose separate repositories over a monorepo?',
    ],
  },

  pwa: {
    explanation: `A Progressive Web App is a web app that can be installed and keep working on a bad or missing network. The two key parts are a **web app manifest** (name, icons, colours, display mode) and a **service worker**.

### Service workers
A service worker is a script that runs in the background, separate from the page, and acts as a programmable network proxy. It can intercept every \`fetch\` from its scope and decide to answer from the Cache Storage, from the network, or both. It has a lifecycle: *install* (precache the app shell), *activate* (clean up old caches), then *fetch* handling. A new version waits until all tabs using the old one close, unless you call \`skipWaiting\`, which is why "a new version is available, reload" prompts exist.

### Caching strategies
- **Cache first**: hashed static assets (\`app.3f9a.js\`), fonts. Fast and safe because the filename changes when content changes.
- **Network first**: HTML and API data that should be fresh, falling back to cache offline.
- **Stale-while-revalidate**: serve cached data instantly and update it in the background. Good for avatars and non-critical lists.

In practice you rarely write this by hand. **Workbox** (or \`vite-plugin-pwa\`, which uses it) generates the precache manifest and routing.

### Offline writes
Reading offline is the easy part. For writes, queue them in IndexedDB and replay when the connection returns, and design the UI so users can see what is pending. Conflicts are a product decision, not just a technical one.

### When to use it
PWAs suit field-work apps, internal tools and content apps. Be careful: a buggy service worker can serve old code for a long time, so always ship a way to update it, and never cache authenticated API responses in a shared cache without care.`,
    examples: [
      {
        title: 'vite-plugin-pwa with runtime caching',
        code: `// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: { name: 'Field Inspections', short_name: 'Inspect', theme_color: '#0f766e', icons: [/* 192 and 512 png */] },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2}'],
        runtimeCaching: [
          { urlPattern: /\\/api\\/sites/, handler: 'NetworkFirst', options: { cacheName: 'sites', networkTimeoutSeconds: 3 } },
          { urlPattern: /\\/avatars\\//, handler: 'StaleWhileRevalidate', options: { cacheName: 'avatars' } },
        ],
      },
    }),
  ],
})`,
        note: 'Hashed assets are precached. API data is network-first with a 3 second timeout, so slow connections fall back to cache. `prompt` lets you ask the user before activating a new version.',
      },
    ],
    realCase: {
      title: 'The app that would not update',
      story: `A field-service company shipped a hand-written service worker that cached \`index.html\` cache-first. After a critical bug fix, technicians kept running the old version for days, because the cached HTML referenced old bundles. The fix was a new service worker that used network-first for HTML, plus an in-app "Update available" banner. The lesson: never cache your HTML entry point cache-first, and always plan the update path before the first release.`,
    },
    pitfalls: [
      'Caching `index.html` cache-first, which freezes users on an old version.',
      'Caching personalised API responses that another user on the same device could later see.',
      'Forgetting that offline writes need a queue, retry and conflict handling.',
    ],
    exercise: {
      task: 'Add `vite-plugin-pwa` to a Vite app, show an "Update available" toast when a new service worker is waiting, and reload on click.',
      hint: 'Use the `useRegisterSW` hook from `virtual:pwa-register/react`.',
      solution: `\`\`\`tsx
import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdateToast() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div role="status">
      A new version is available.
      <button onClick={() => updateServiceWorker(true)}>Reload</button>
    </div>
  )
}
\`\`\``,
    },
    interview: [
      'Explain the service worker lifecycle and why new versions wait.',
      'Which caching strategy would you use for hashed JS, HTML and an API list, and why?',
    ],
  },

  mfe: {
    explanation: `Micro-frontends split one user-facing app into pieces owned and deployed by different teams. A *host* (shell) app loads *remotes* at runtime. **Module Federation** (in webpack 5, Rspack, and via plugins for Vite) is the most common technique: a remote exposes modules, the host imports them from a URL at runtime, and shared libraries like React are negotiated so only one copy loads.

### Why teams do it
Independent deployment. If 15 teams work on one app, a single release train becomes a bottleneck. With micro-frontends, the checkout team can deploy without waiting for the search team.

### The costs
- **Runtime integration**: type errors and version mismatches show up in production, not at build time. You need contract tests and shared type packages.
- **Shared dependencies**: React must be a singleton, or hooks break with "invalid hook call". Version ranges have to be coordinated.
- **Performance**: multiple bundles, duplicated libraries and waterfalls of remote entry loads.
- **Consistency**: UX drifts unless everyone uses the same design system.

### When it is worth it
Only when organisational scaling is the real problem: many teams, separate release cadences, maybe legacy apps being migrated piece by piece. For one or two teams, a well-structured monorepo with good boundaries gives most of the benefit at a fraction of the cost. Route-level splitting (each team owns whole pages behind a reverse proxy) is often simpler than composing components at runtime.`,
    examples: [
      {
        title: 'Host config with React as a singleton',
        code: `// rsbuild.config.ts in the shell app (Module Federation 2 plugin)
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin'

export default {
  plugins: [
    pluginModuleFederation({
      name: 'shell',
      remotes: { checkout: 'checkout@https://checkout.acme.example/mf-manifest.json' },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
      },
    }),
  ],
}

// usage in the shell
const CheckoutPage = lazy(() => import('checkout/CheckoutPage'))
<ErrorBoundary fallback={<CheckoutUnavailable />}>
  <Suspense fallback={<Spinner />}><CheckoutPage /></Suspense>
</ErrorBoundary>`,
        note: '`singleton` stops two Reacts from loading. The remote can be down or broken independently, so always wrap it in an error boundary and Suspense.',
      },
    ],
    realCase: {
      title: 'Two Reacts, one broken page',
      story: `An insurance portal had four teams shipping remotes. One team upgraded their remote to a new React major without coordinating, and their \`shared\` config did not mark React as a singleton. The host loaded two copies, and the remote's hooks failed with "Invalid hook call" on the claims page. The fix was a platform rule: React is a strict singleton with a version range owned by the platform team, checked in CI by a contract test that loads every remote into the shell.`,
    },
    pitfalls: [
      'Not sharing React as a singleton, causing duplicate React and hook errors.',
      'Adopting micro-frontends for a small team, paying the complexity without the organisational benefit.',
      'Loading remotes without error boundaries, so one team\'s outage breaks the whole shell.',
    ],
    exercise: {
      task: 'Sketch (in code or a short design) how a shell would load a `profile` remote, handle it being offline, and share types for its props.',
      hint: 'Think: lazy import, Suspense, error boundary, and a published `@acme/profile-contract` types package.',
      solution: `Publish \`@acme/profile-contract\` exporting \`type ProfileProps = { userId: string }\`. The shell does \`const Profile = lazy(() => import('profile/Profile'))\` and renders it inside \`<ErrorBoundary fallback={<p>Profile unavailable</p>}><Suspense fallback={<Skeleton />}><Profile userId={id} /></Suspense></ErrorBoundary>\`. CI in the profile repo runs a contract test that renders the remote with the contract props.`,
    },
    interview: [
      'What problem do micro-frontends solve, and what do they cost?',
      'Why must React be a singleton in Module Federation?',
    ],
  },

  rn: {
    explanation: `React Native lets you use React's component model to build native iOS and Android apps. The reconciler is the same idea you learned in React internals, but the host is different: instead of DOM nodes, components render to native views (\`View\`, \`Text\`, \`Image\`, \`ScrollView\`, \`Pressable\`). There is no HTML and no CSS: styling uses JavaScript objects with a Flexbox layout engine (Yoga), and \`flexDirection\` defaults to \`column\`.

### The new architecture
Modern React Native uses **Fabric** (the new renderer) and **TurboModules** with **JSI**, which let JavaScript call native code directly instead of sending serialised messages over the old asynchronous bridge. This enables concurrent React features and faster native calls. Recent versions enable it by default.

### Expo
Expo is the recommended way to start. It provides a managed toolchain, a large SDK of native modules (camera, notifications, secure storage), **Expo Router** (file-based routing similar to the Next.js App Router), cloud builds with EAS, and over-the-air updates for JavaScript changes.

### What transfers from the web
Components, hooks, state management (Zustand, TanStack Query), TypeScript, testing with Testing Library. What does not: DOM APIs, CSS, \`window\` and \`localStorage\` (use AsyncStorage or SecureStore for secrets). Lists must be virtualised with \`FlatList\` or FlashList, because rendering 1,000 views in a \`ScrollView\` is slow.

Share business logic and types across web and mobile in a monorepo, but usually not UI components, unless you adopt a cross-platform UI library.`,
    examples: [
      {
        title: '❌ ScrollView map vs ✅ FlatList',
        code: `import { FlatList, Text, Pressable, StyleSheet } from 'react-native'

// ❌ renders every row at once: slow and memory hungry for long lists
<ScrollView>{orders.map((o) => <OrderRow key={o.id} order={o} />)}</ScrollView>

// ✅ virtualised
<FlatList
  data={orders}
  keyExtractor={(o) => o.id}
  renderItem={({ item }) => (
    <Pressable onPress={() => router.push('/orders/' + item.id)} style={styles.row}>
      <Text style={styles.title}>{item.reference}</Text>
    </Pressable>
  )}
/>

const styles = StyleSheet.create({
  row: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 16, fontWeight: '600' },
})`,
        note: 'FlatList only mounts rows near the viewport. Note that text must always be inside `Text`; a raw string in a `View` is an error.',
      },
    ],
    realCase: {
      title: 'Tokens in plain storage',
      story: `A delivery startup moved its React web app to React Native with Expo and kept the habit of storing the refresh token in AsyncStorage, the mobile equivalent of \`localStorage\`. A security review flagged that AsyncStorage is unencrypted. They moved tokens to \`expo-secure-store\`, which uses the iOS Keychain and Android Keystore. Lesson: the React model transfers, but platform security primitives are different, so review them explicitly.`,
    },
    pitfalls: [
      'Rendering long lists in a ScrollView instead of a virtualised list.',
      'Storing secrets in AsyncStorage instead of secure storage.',
      'Expecting web-only libraries that touch the DOM to work in React Native.',
    ],
    exercise: {
      task: 'Create an Expo app with Expo Router showing a list of products from an API with pull-to-refresh, and a detail screen.',
      hint: 'FlatList has `refreshing` and `onRefresh` props. Use TanStack Query for the data.',
      solution: `\`\`\`tsx
// app/index.tsx
export default function Products() {
  const { data, isRefetching, refetch } = useQuery({ queryKey: ['products'], queryFn: fetchProducts })
  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(p) => p.id}
      refreshing={isRefetching}
      onRefresh={refetch}
      renderItem={({ item }) => (
        <Link href={{ pathname: '/products/[id]', params: { id: item.id } }}>
          <Text>{item.name}</Text>
        </Link>
      )}
    />
  )
}
\`\`\``,
    },
    interview: [
      'What is the difference between React DOM and React Native at the reconciler level?',
      'What does the new architecture (Fabric, JSI) change compared with the old bridge?',
    ],
  },
}

export default details
