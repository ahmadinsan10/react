import type { TopicDetail } from '../types'

const details: Record<string, TopicDetail> = {
  styling: {
    explanation: `Every styling approach answers the same three questions: **how are class names scoped** so styles don't leak, **when is the CSS produced** (build time or runtime), and **how do styles react to props and themes**. Once you see the options through those questions, choosing one stops being a matter of fashion.

### CSS Modules
A \`.module.css\` file is plain CSS, but the bundler rewrites every class name to something unique (\`button\` becomes \`Button_button__x7f2a\`) and gives you a JS object mapping the original names to the generated ones. Scoping happens at build time, the output is a static stylesheet, and there is zero runtime cost. Variants are handled by toggling classes or, better, by \`data-*\` attributes that CSS selects on. CSS Modules work everywhere, including Server Components, because nothing runs in the browser.

### Tailwind CSS
Tailwind flips the model: instead of naming things, you compose small utility classes directly in markup (\`px-4 py-2 rounded-md bg-blue-600\`). A compiler scans your source files and emits only the utilities you used, so the final CSS stays small and grows slowly even as the app grows. The benefits are speed, consistency (you pick from a constrained scale) and no dead CSS. The costs are long class strings and the need for discipline: you still extract components, and you use a helper such as \`clsx\` plus \`tailwind-merge\` to combine conditional classes safely. Tailwind v4 is configured in CSS with \`@theme\`, which turns your design tokens into both utilities and CSS variables.

### Runtime CSS-in-JS
Libraries like styled-components and Emotion generate CSS **while rendering**: they serialize style objects, hash them, and inject \`<style>\` tags. That means extra JavaScript, extra work on every render with dynamic props, and style insertion that can fight with concurrent rendering. They also need client-side context, so they do not fit React Server Components. This is why the ecosystem has moved away from them for new projects.

### Zero-runtime CSS-in-JS
vanilla-extract, Panda CSS, StyleX and Linaria let you author styles in TypeScript (type-safe tokens, co-location) but extract static CSS at build time. You get the ergonomics without the runtime cost.

### How to choose
- New app, small team, fast iteration: **Tailwind**.
- Existing CSS skills, design-system library to ship to others: **CSS Modules** or **vanilla-extract** (consumers do not need your Tailwind setup).
- Avoid starting new projects on runtime CSS-in-JS.

Whatever you pick, put dynamic values into **CSS custom properties** (\`style={{ '--progress': pct }}\`) rather than generating new classes per value.`,
    examples: [
      {
        title: '❌ Runtime CSS-in-JS with per-render dynamic styles vs ✅ CSS Module + data attributes',
        code: `// ❌ A new style rule is serialized and injected for every distinct prop combo
const Btn = styled.button<{ $variant: 'primary' | 'ghost'; $size: number }>\`
  padding: \${p => p.$size}px;
  background: \${p => (p.$variant === 'primary' ? '#2563eb' : 'transparent')};
\`

// ✅ Button.module.css
// .button { padding: var(--btn-pad, 8px 14px); border-radius: var(--radius-md); }
// .button[data-variant='primary'] { background: var(--color-accent); color: white; }
// .button[data-variant='ghost'] { background: transparent; }
import styles from './Button.module.css'

type Props = React.ComponentProps<'button'> & { variant?: 'primary' | 'ghost' }

export function Button({ variant = 'primary', className, ...rest }: Props) {
  return (
    <button
      {...rest}
      data-variant={variant}
      className={[styles.button, className].filter(Boolean).join(' ')}
    />
  )
}`,
        note: 'The CSS Module version produces one static stylesheet at build time. Variants are selected with data attributes, which also makes them inspectable in DevTools and testable. Consumers can still pass a className.',
      },
      {
        title: '✅ Tailwind with safe class merging',
        code: `import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

const variants = {
  primary: 'bg-accent text-white hover:bg-accent/90',
  ghost: 'bg-transparent hover:bg-muted',
} as const

export function Button({
  variant = 'primary',
  className,
  ...rest
}: React.ComponentProps<'button'> & { variant?: keyof typeof variants }) {
  return (
    <button
      {...rest}
      className={cn('inline-flex items-center rounded-md px-4 py-2 focus-visible:outline-2', variants[variant], className)}
    />
  )
}`,
        note: 'twMerge resolves conflicts so a consumer passing "px-2" actually overrides "px-4" instead of both classes being present and the winner depending on stylesheet order.',
      },
    ],
    realCase: {
      title: 'A dashboard that got slower every time a filter changed',
      story: `**Situation:** An internal analytics dashboard used a runtime CSS-in-JS library with styles interpolated from props (column widths, heat-map colours per cell).

**Symptom:** Changing a filter took 400 ms on a mid-range laptop. The Performance panel showed long tasks dominated by style serialization and \`insertRule\` calls, and the number of \`<style>\` rules kept growing.

**Root cause:** Each distinct cell colour produced a new class. Thousands of unique rules were generated and injected during render.

**Fix:** The team moved static styles to CSS Modules and passed the dynamic value through a custom property: \`style={{ '--heat': value }}\` with \`background: color-mix(in oklch, var(--hot) calc(var(--heat) * 100%), var(--cold))\`. One rule, no runtime generation.

**Lesson:** Dynamic values belong in CSS variables, not in generated classes. Choosing a zero-runtime approach removes a whole category of performance problems.`,
    },
    pitfalls: [
      'Concatenating Tailwind classes without tailwind-merge: "px-4 px-2" both apply and the winner depends on CSS order, not on what you wrote last.',
      'Building class names dynamically like `bg-${color}-500` in Tailwind: the compiler cannot see them, so the CSS is never generated.',
      'Choosing runtime CSS-in-JS for a new app that uses Server Components: it requires client context and cannot style server-rendered components.',
      'Global CSS for component styles: selectors collide as the app grows and nobody dares to delete anything.',
    ],
    exercise: {
      task: 'Build a `Badge` component with variants `neutral | success | danger` and sizes `sm | md`, styled with a CSS Module. Variants and sizes must be expressed as data attributes, and a consumer must be able to pass `className`.',
      hint: 'Select on `.badge[data-variant="success"]` in CSS. Spread remaining props onto the span so `aria-*` attributes pass through.',
      solution: `\`\`\`tsx
// Badge.module.css
// .badge { display:inline-flex; border-radius:999px; font-weight:600; }
// .badge[data-size='sm'] { padding:2px 8px; font-size:12px; }
// .badge[data-size='md'] { padding:4px 10px; font-size:14px; }
// .badge[data-variant='neutral'] { background:var(--color-muted); }
// .badge[data-variant='success'] { background:var(--color-success-bg); color:var(--color-success-fg); }
// .badge[data-variant='danger'] { background:var(--color-danger-bg); color:var(--color-danger-fg); }
import s from './Badge.module.css'

type BadgeProps = React.ComponentProps<'span'> & {
  variant?: 'neutral' | 'success' | 'danger'
  size?: 'sm' | 'md'
}

export function Badge({ variant = 'neutral', size = 'md', className, ...rest }: BadgeProps) {
  return <span {...rest} data-variant={variant} data-size={size} className={[s.badge, className].filter(Boolean).join(' ')} />
}
\`\`\``,
    },
    interview: [
      'Why did runtime CSS-in-JS fall out of favour, and what problems does it have with Server Components and concurrent rendering?',
      'How does Tailwind keep its CSS output small, and why does `bg-${color}-500` break?',
      'How would you style a progress bar whose width changes 60 times a second without generating new CSS rules?',
    ],
  },

  tokens: {
    explanation: `Design tokens are the **named decisions** of a design system: colours, spacing steps, radii, font sizes, shadows, durations. Instead of writing \`#2563eb\` or \`12px\` in a component, you write \`var(--color-accent)\` or \`var(--space-3)\`. The token is the contract between design and code.

### Three layers
Mature systems separate tokens into layers:
1. **Primitive (reference) tokens**: the raw palette and scale, e.g. \`--blue-600\`, \`--gray-50\`, \`--space-4: 16px\`. They describe *what exists*.
2. **Semantic (system) tokens**: meaning, e.g. \`--color-bg\`, \`--color-text\`, \`--color-accent\`, \`--color-danger\`, \`--color-border\`. They point at primitives.
3. **Component tokens** (optional): \`--button-bg\`, \`--input-border\`, pointing at semantic tokens so a single component can be tuned.

Components should only consume semantic or component tokens. If a button references \`--blue-600\` directly, dark mode cannot change it without touching the component.

### Why CSS custom properties
Custom properties are resolved by the browser at computed-style time and **inherit down the DOM tree**. That gives you theming for free: redefine the semantic tokens on \`:root[data-theme="dark"]\` or on any subtree, and every element below picks up the new values with no React re-render. Changing a theme is a single attribute change, so it costs one style recalculation instead of re-rendering your component tree through a ThemeProvider context.

### Dark mode done properly
- Default to the user's preference with \`@media (prefers-color-scheme: dark)\`.
- Allow an explicit override with \`data-theme\` on \`<html>\`, persisted in \`localStorage\`.
- Apply the stored theme **before first paint** with a tiny inline script in \`<head>\`, otherwise users see a flash of the wrong theme.
- Set \`color-scheme: light dark\` so native controls and scrollbars match.
- Dark mode is not inverted light mode: reduce saturation, use elevation via lighter surfaces, and re-check contrast (WCAG AA requires 4.5:1 for body text).

### Single source of truth
Large teams keep tokens in JSON (often the W3C Design Tokens format) and generate CSS variables, TypeScript types and native platform files with a tool such as Style Dictionary. Tailwind v4's \`@theme\` block is another source of truth: tokens declared there become both CSS variables and utilities.

### When not to tokenise
Not every number is a decision. A one-off \`translateY(1px)\` nudge does not need a token. Tokenise values that repeat or that a theme might change.`,
    examples: [
      {
        title: '✅ Layered tokens with a dark theme',
        code: `/* tokens.css */
:root {
  /* primitives */
  --gray-0: #ffffff; --gray-900: #111827; --gray-200: #e5e7eb; --gray-700: #374151;
  --blue-600: #2563eb; --blue-400: #60a5fa;
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --radius-md: 8px;

  /* semantic */
  --color-bg: var(--gray-0);
  --color-text: var(--gray-900);
  --color-border: var(--gray-200);
  --color-accent: var(--blue-600);
  color-scheme: light;
}

:root[data-theme='dark'] {
  --color-bg: var(--gray-900);
  --color-text: var(--gray-0);
  --color-border: var(--gray-700);
  --color-accent: var(--blue-400);
  color-scheme: dark;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --color-bg: var(--gray-900);
    --color-text: var(--gray-0);
    --color-border: var(--gray-700);
    --color-accent: var(--blue-400);
    color-scheme: dark;
  }
}

body { background: var(--color-bg); color: var(--color-text); }`,
        note: 'Components never see a hex code. The theme switch only redefines semantic tokens; primitives stay the same. The media query respects the OS preference unless the user explicitly chose light.',
      },
      {
        title: '❌ Theme in React context vs ✅ theme as an attribute',
        code: `// ❌ Every consumer re-renders when the theme flips, and colours live in JS
const ThemeCtx = createContext(lightTheme)
function Card() {
  const t = use(ThemeCtx)
  return <div style={{ background: t.surface, color: t.text }} />
}

// ✅ React only toggles one attribute; CSS does the rest
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark' | null) ?? 'system',
  )
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])
  return [theme, setTheme] as const
}

// index.html, before any CSS-dependent paint:
// <script>try{const t=localStorage.getItem('theme');if(t&&t!=='system')document.documentElement.dataset.theme=t}catch{}</script>`,
        note: 'The inline script prevents the flash of incorrect theme. Toggling an attribute triggers a style recalculation but zero component re-renders.',
      },
    ],
    realCase: {
      title: 'Dark mode that took three sprints instead of three days',
      story: `**Situation:** A SaaS team was asked to ship dark mode. Their components used a colour palette file directly: \`colors.blue600\`, \`colors.gray100\`.

**Symptom:** Every one of 140 components needed manual edits, and reviewers kept finding light-grey-on-white text in rarely visited screens.

**Root cause:** No semantic layer. Components encoded *which colour* instead of *what role* (background, border, muted text).

**Fix:** They introduced semantic tokens, wrote a codemod mapping the most common primitives to roles, and added a lint rule (stylelint \`declaration-property-value-disallowed-list\`) banning raw hex values in component CSS. A visual regression run in Storybook in both themes caught the remaining contrast problems.

**Lesson:** The semantic token layer is what makes theming cheap. Add it before you need a second theme.`,
    },
    pitfalls: [
      'Components referencing primitive tokens (`--blue-600`) instead of semantic ones (`--color-accent`), so themes cannot change them.',
      'Applying the stored theme in a useEffect only: users see a flash of the light theme on every page load.',
      'Forgetting `color-scheme`, leaving white scrollbars and form controls in dark mode.',
      'Mechanically inverting colours for dark mode without re-checking WCAG contrast ratios.',
      'Keeping theme colours in a React context and re-rendering the entire tree on toggle.',
    ],
    exercise: {
      task: 'Create a token file with primitives and semantic tokens for bg, surface, text, text-muted, border and accent. Add a ThemeToggle with three options (System, Light, Dark) that persists the choice and avoids the flash on reload.',
      hint: 'System means removing the attribute so the media query decides. The inline script must run before the stylesheet-dependent first paint.',
      solution: `\`\`\`tsx
export function ThemeToggle() {
  const [theme, setTheme] = useTheme() // from the example above
  return (
    <fieldset>
      <legend>Theme</legend>
      {(['system', 'light', 'dark'] as const).map(t => (
        <label key={t}>
          <input type="radio" name="theme" value={t} checked={theme === t} onChange={() => setTheme(t)} />
          {t[0].toUpperCase() + t.slice(1)}
        </label>
      ))}
    </fieldset>
  )
}
\`\`\`

A radio group is the right semantic control here: one choice out of several, arrow keys move between options, and the legend gives the group an accessible name. Test the flash by setting Dark, reloading with CPU throttling, and watching the first frame in the Performance panel.`,
    },
    interview: [
      'What is the difference between primitive and semantic tokens, and why should components only use semantic ones?',
      'Why is theming with CSS custom properties cheaper than theming through React context?',
      'How do you prevent the flash of the wrong theme on page load?',
    ],
  },

  'api-design': {
    explanation: `A component's props are a public API. Good APIs are **small, predictable and hard to misuse**. The test is simple: can a colleague use it correctly without reading its source, and can they handle the case you did not anticipate without forking it?

### Composition over configuration
A "configuration" component grows a prop for every variation: \`title\`, \`subtitle\`, \`icon\`, \`iconPosition\`, \`showClose\`, \`footerButtons\`... Each new requirement adds another prop and another branch. A composed component accepts \`children\` and small building blocks, so new layouts need no new props. Rule of thumb: when you add a prop that takes a string just to render it somewhere, consider a slot (\`children\` or a named element prop) instead.

### Compound components
Some widgets have parts that must cooperate: Tabs has a list, triggers and panels. Compound components expose those parts (\`Tabs.List\`, \`Tabs.Trigger\`, \`Tabs.Panel\`) and share state through a context created by the root. Users control the structure and markup; the root controls behaviour and ARIA wiring (ids, \`aria-controls\`, \`aria-selected\`). Throw a helpful error if a part is used outside its root.

### Controlled and uncontrolled
Support both, like native inputs do:
- **Uncontrolled**: \`defaultValue\`, the component owns the state. Easy to drop in.
- **Controlled**: \`value\` + \`onValueChange\`, the parent owns the state. Needed for syncing to the URL or validation.
A small \`useControllableState\` hook decides which mode applies based on whether \`value\` is \`undefined\`. Never switch modes during a component's lifetime.

### Polymorphism
Sometimes a Button must render as a link. Two patterns:
- \`as\` prop: \`<Button as="a" href="/x">\`. Simple but hard to type well.
- \`asChild\` (Radix style): \`<Button asChild><Link to="/x" /></Button>\` merges the button's props and classes into the single child. Better typing and works with router links.

### Refs in React 19
\`ref\` is now an ordinary prop for function components, so \`forwardRef\` is unnecessary. Type it with \`React.ComponentProps<'button'>\`, which already includes \`ref\`, and spread it onto the DOM node. Ref callbacks may also return a cleanup function.

### Other conventions
- Spread remaining props (\`...rest\`) onto the root element so \`aria-*\`, \`data-*\` and event handlers work.
- Merge \`className\` rather than replacing it.
- Name callbacks \`onXChange\` and booleans as adjectives (\`disabled\`, \`open\`).
- Prefer a union (\`variant: 'primary' | 'ghost'\`) to several mutually exclusive booleans.`,
    examples: [
      {
        title: '✅ Accessible compound Tabs with controlled/uncontrolled support',
        code: `import { createContext, use, useId, useRef, useState } from 'react'

type TabsCtx = { value: string; setValue: (v: string) => void; baseId: string }
const Ctx = createContext<TabsCtx | null>(null)
const useTabs = () => {
  const c = use(Ctx)
  if (!c) throw new Error('Tabs.* must be used inside <Tabs>')
  return c
}

function useControllableState<T>(value: T | undefined, defaultValue: T, onChange?: (v: T) => void) {
  const [inner, setInner] = useState(defaultValue)
  const isControlled = value !== undefined
  const current = isControlled ? value : inner
  const set = (v: T) => {
    if (!isControlled) setInner(v)
    onChange?.(v)
  }
  return [current, set] as const
}

type TabsProps = {
  value?: string
  defaultValue: string
  onValueChange?: (v: string) => void
  children: React.ReactNode
}

export function Tabs({ value, defaultValue, onValueChange, children }: TabsProps) {
  const [current, setValue] = useControllableState(value, defaultValue, onValueChange)
  const baseId = useId()
  return <Ctx value={{ value: current, setValue, baseId }}>{children}</Ctx>
}

function List({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const onKeyDown = (e: React.KeyboardEvent) => {
    const tabs = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role=tab]') ?? [])]
    const i = tabs.indexOf(document.activeElement as HTMLButtonElement)
    const next =
      e.key === 'ArrowRight' ? tabs[(i + 1) % tabs.length]
      : e.key === 'ArrowLeft' ? tabs[(i - 1 + tabs.length) % tabs.length]
      : e.key === 'Home' ? tabs[0]
      : e.key === 'End' ? tabs[tabs.length - 1]
      : null
    if (next) { e.preventDefault(); next.focus(); next.click() }
  }
  return <div ref={ref} role="tablist" aria-label={label} onKeyDown={onKeyDown}>{children}</div>
}

function Trigger({ value, children }: { value: string; children: React.ReactNode }) {
  const { value: active, setValue, baseId } = useTabs()
  const selected = active === value
  return (
    <button
      role="tab"
      id={\`\${baseId}-tab-\${value}\`}
      aria-selected={selected}
      aria-controls={\`\${baseId}-panel-\${value}\`}
      tabIndex={selected ? 0 : -1}
      onClick={() => setValue(value)}
    >
      {children}
    </button>
  )
}

function Panel({ value, children }: { value: string; children: React.ReactNode }) {
  const { value: active, baseId } = useTabs()
  return (
    <div
      role="tabpanel"
      id={\`\${baseId}-panel-\${value}\`}
      aria-labelledby={\`\${baseId}-tab-\${value}\`}
      hidden={active !== value}
      tabIndex={0}
    >
      {children}
    </div>
  )
}

Tabs.List = List
Tabs.Trigger = Trigger
Tabs.Panel = Panel`,
        note: 'Roving tabindex (only the selected tab is in the Tab order), arrow/Home/End keys, and id wiring follow the APG Tabs pattern. Context is provided with <Ctx value> (React 19 syntax). Consumers decide markup and ordering; the root owns behaviour.',
      },
      {
        title: '❌ forwardRef + prop explosion vs ✅ React 19 ref prop + composition',
        code: `// ❌
const Card = forwardRef<HTMLDivElement, {
  title: string; subtitle?: string; icon?: string; showFooter?: boolean; footerText?: string
}>((props, ref) => { /* ...branches for every prop... */ })

// ✅
export function Card({ className, ...rest }: React.ComponentProps<'div'>) {
  return <div {...rest} className={['card', className].filter(Boolean).join(' ')} />
}
export const CardHeader = (p: React.ComponentProps<'header'>) => <header className="card-header" {...p} />
export const CardFooter = (p: React.ComponentProps<'footer'>) => <footer className="card-footer" {...p} />

// usage: ref is just a prop
<Card ref={cardRef} aria-labelledby="plan-title">
  <CardHeader><h3 id="plan-title">Pro plan</h3></CardHeader>
  <p>Unlimited projects</p>
  <CardFooter><Button>Upgrade</Button></CardFooter>
</Card>`,
        note: 'ComponentProps<"div"> includes ref in React 19, so spreading rest forwards it. New layouts need no new props.',
      },
    ],
    realCase: {
      title: 'The Modal with 34 props',
      story: `**Situation:** A design-system Modal at a mid-size retailer had grown to 34 props (\`hideHeader\`, \`headerAlign\`, \`secondaryButtonVariant\`, \`footerLeftContent\`...).

**Symptom:** Every product team request became a design-system PR. Teams started copying the Modal source into their own folders, so bug fixes (including a focus-restore fix) never reached them.

**Root cause:** Configuration-style API. The component tried to predict every layout.

**Fix:** It was rebuilt as compound components: \`Dialog\`, \`Dialog.Trigger\`, \`Dialog.Content\`, \`Dialog.Title\`, \`Dialog.Description\`, \`Dialog.Close\`. Behaviour (focus trap, Escape, aria wiring) stayed in the root; layout moved to the consumer. The old API was kept as a thin wrapper over the new parts for one release with a deprecation warning.

**Lesson:** If your component keeps getting layout props, it wants to be composed. Owning behaviour and giving away structure scales across teams.`,
    },
    pitfalls: [
      'Switching between controlled and uncontrolled during a component lifetime (value goes from undefined to a string): state becomes inconsistent and React warns.',
      'Not spreading rest props, so consumers cannot add aria-label, data-testid or onFocus.',
      'Overwriting className instead of merging it.',
      'Still wrapping new components in forwardRef in React 19: unnecessary noise, ref is a prop now.',
      'Compound parts silently doing nothing outside their root instead of throwing a clear error.',
    ],
    exercise: {
      task: 'Write an `Accordion` compound component (Accordion, Accordion.Item, Accordion.Trigger, Accordion.Content) supporting `type="single" | "multiple"`, and both controlled (`value`, `onValueChange`) and uncontrolled (`defaultValue`) use.',
      hint: 'Store an array of open item values in all cases. Each Item provides its own value through a nested context so Trigger and Content know which item they belong to. Trigger is a button with aria-expanded and aria-controls.',
      solution: `\`\`\`tsx
type Ctx = { open: string[]; toggle: (v: string) => void; id: string }
const AccCtx = createContext<Ctx | null>(null)
const ItemCtx = createContext<string | null>(null)

export function Accordion({ type = 'single', value, defaultValue = [], onValueChange, children }: {
  type?: 'single' | 'multiple'; value?: string[]; defaultValue?: string[]
  onValueChange?: (v: string[]) => void; children: React.ReactNode
}) {
  const [open, setOpen] = useControllableState(value, defaultValue, onValueChange)
  const id = useId()
  const toggle = (v: string) => {
    const isOpen = open.includes(v)
    if (type === 'single') setOpen(isOpen ? [] : [v])
    else setOpen(isOpen ? open.filter(x => x !== v) : [...open, v])
  }
  return <AccCtx value={{ open, toggle, id }}>{children}</AccCtx>
}

function Item({ value, children }: { value: string; children: React.ReactNode }) {
  return <ItemCtx value={value}><div>{children}</div></ItemCtx>
}

function Trigger({ children }: { children: React.ReactNode }) {
  const acc = use(AccCtx)!; const v = use(ItemCtx)!
  const expanded = acc.open.includes(v)
  return (
    <h3>
      <button id={\`\${acc.id}-t-\${v}\`} aria-expanded={expanded} aria-controls={\`\${acc.id}-c-\${v}\`} onClick={() => acc.toggle(v)}>
        {children}
      </button>
    </h3>
  )
}

function Content({ children }: { children: React.ReactNode }) {
  const acc = use(AccCtx)!; const v = use(ItemCtx)!
  return (
    <div role="region" id={\`\${acc.id}-c-\${v}\`} aria-labelledby={\`\${acc.id}-t-\${v}\`} hidden={!acc.open.includes(v)}>
      {children}
    </div>
  )
}
Accordion.Item = Item; Accordion.Trigger = Trigger; Accordion.Content = Content
\`\`\``,
    },
    interview: [
      'When would you choose compound components over a single component with props? What are the trade-offs?',
      'How do you implement a component that supports both controlled and uncontrolled usage?',
      'Compare the `as` prop and the `asChild` pattern for polymorphic components.',
    ],
  },

  headless: {
    explanation: `A headless component library ships **behaviour and accessibility without visual styling**. You get state management, keyboard interaction, focus management, ARIA attributes, collision-aware positioning and screen-reader announcements; you bring the markup classes and design.

### Why this split exists
The hard part of a Menu, Combobox or Dialog is not how it looks. It is everything else: typeahead in menus, focus returning to the trigger, Escape closing only the topmost layer, scroll locking, portals, clicks outside, \`aria-activedescendant\` in comboboxes, RTL support, touch vs pointer differences, and dozens of screen-reader quirks. Teams that build these from scratch usually get the happy path right and fail the long tail. Headless libraries encode years of fixes, while leaving your brand free.

### The main options
- **Radix UI Primitives**: unstyled compound components (\`Dialog.Root\`, \`Dialog.Trigger\`, \`Dialog.Content\`...). Uses \`asChild\` for polymorphism and \`data-state="open"\` attributes for styling hooks.
- **React Aria (Adobe)**: available as hooks (\`useButton\`, \`useComboBox\`) and as React Aria Components. Very thorough internationalisation and accessibility, strong on complex widgets like date pickers and grids.
- **Headless UI** (Tailwind Labs), **Ariakit** and **Base UI** are other solid choices.
- **shadcn/ui** is not a dependency at all: a CLI copies pre-styled Radix-based components (Tailwind classes) into your repository. You own and edit the code; you take upstream improvements by re-running or diffing.

### How to use them well
- Style through the state attributes the library exposes (\`[data-state=open]\`, \`[data-highlighted]\`, \`[data-disabled]\`) instead of mirroring state in React.
- Wrap primitives once in your design system (\`<Select>\` = Radix Select + your tokens), then expose your own small API. Product code should not import the headless library directly; that keeps a migration possible.
- Keep their accessibility intact: do not remove the title from a dialog, do not replace their trigger with a \`div\`.

### When not to use one
- Simple components (Button, Card, Badge) need no library; native HTML already provides the behaviour.
- If you need a very unusual interaction model, a hooks-level library (React Aria hooks) gives more control than prebuilt components.
- Bundle-sensitive pages: check the cost per primitive; most are tree-shakeable, but each adds some kilobytes.

Building one Dialog and one Menu yourself (as the level project asks) is the best way to appreciate what these libraries do. Then compare with Radix and list everything you missed.`,
    examples: [
      {
        title: '✅ Wrapping Radix Dialog as a design-system component',
        code: `import * as RD from '@radix-ui/react-dialog'
import styles from './Dialog.module.css'

export const Dialog = RD.Root
export const DialogTrigger = RD.Trigger
export const DialogClose = RD.Close

export function DialogContent({
  title,
  description,
  children,
}: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <RD.Portal>
      <RD.Overlay className={styles.overlay} />
      <RD.Content className={styles.content}>
        <RD.Title className={styles.title}>{title}</RD.Title>
        {description && <RD.Description className={styles.desc}>{description}</RD.Description>}
        {children}
        <RD.Close className={styles.close} aria-label="Close">×</RD.Close>
      </RD.Content>
    </RD.Portal>
  )
}

/* Dialog.module.css
.overlay[data-state='open'] { animation: fade-in 150ms ease-out; }
.content[data-state='open'] { animation: pop-in 150ms ease-out; }
@media (prefers-reduced-motion: reduce) {
  .overlay, .content { animation: none !important; }
}
*/`,
        note: 'Making title a required prop guarantees every dialog has an accessible name. Styling uses data-state attributes Radix sets, so no React state is duplicated.',
      },
      {
        title: '✅ React Aria Components ComboBox',
        code: `import { ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem } from 'react-aria-components'

export function CountryPicker({ countries }: { countries: { id: string; name: string }[] }) {
  return (
    <ComboBox defaultItems={countries} className="combo">
      <Label>Country</Label>
      <div className="combo-field">
        <Input />
        <Button aria-label="Show suggestions">▾</Button>
      </div>
      <Popover>
        <ListBox>
          {item => <ListBoxItem id={item.id}>{item.name}</ListBoxItem>}
        </ListBox>
      </Popover>
    </ComboBox>
  )
}`,
        note: 'Filtering, aria-activedescendant management, announcements of result counts and mobile behaviour come from the library; you only style it.',
      },
    ],
    realCase: {
      title: 'A home-made Select that failed an accessibility audit',
      story: `**Situation:** A fintech team built a custom Select from \`div\`s to match the brand. It looked perfect.

**Symptom:** An external accessibility audit before a public-sector contract flagged it as blocking: no keyboard support beyond Tab, screen readers announced "clickable" with no name or value, and the popup was clipped inside a scrolling modal.

**Root cause:** The team had reimplemented the visual layer but not the listbox behaviour, ARIA roles, typeahead or portal positioning.

**Fix:** They replaced the internals with Radix Select wrapped in their own \`<Select>\` component, keeping the same public props. The visual design stayed identical; the audit item closed in a week.

**Lesson:** Own the look, borrow the behaviour. Keeping a stable wrapper API made the swap invisible to product teams.`,
    },
    pitfalls: [
      'Importing the headless library directly all over product code, making a future migration a huge refactor.',
      'Breaking built-in accessibility by passing a non-focusable element to asChild, or by omitting the Dialog Title.',
      'Mirroring open/selected state in React only to style it, instead of using the data-state attributes.',
      'Treating shadcn/ui as a library that updates itself: the code is yours, including its bugs.',
    ],
    exercise: {
      task: 'Wrap Radix DropdownMenu into a design-system `Menu` with `Menu`, `Menu.Trigger`, `Menu.Content` and `Menu.Item` parts. Items must support a `destructive` variant and a disabled state, styled only via data attributes.',
      hint: 'Radix sets data-highlighted and data-disabled on items. Add your own data-variant attribute for destructive.',
      solution: `\`\`\`tsx
import * as DM from '@radix-ui/react-dropdown-menu'
import s from './Menu.module.css'

export function Menu(props: DM.DropdownMenuProps) { return <DM.Root {...props} /> }
Menu.Trigger = DM.Trigger
Menu.Content = function Content(p: DM.DropdownMenuContentProps) {
  return <DM.Portal><DM.Content sideOffset={4} className={s.content} {...p} /></DM.Portal>
}
Menu.Item = function Item({ destructive, ...p }: DM.DropdownMenuItemProps & { destructive?: boolean }) {
  return <DM.Item className={s.item} data-variant={destructive ? 'destructive' : undefined} {...p} />
}
/* .item[data-highlighted] { background: var(--color-muted); }
   .item[data-disabled] { opacity: .5; pointer-events: none; }
   .item[data-variant='destructive'] { color: var(--color-danger-fg); } */
\`\`\``,
    },
    interview: [
      'What does a headless component library give you, and what does it deliberately not give you?',
      'How is shadcn/ui different from a normal npm component library, and what are the maintenance consequences?',
      'Why wrap a headless library in your own components instead of using it directly?',
    ],
  },

  a11y: {
    explanation: `Accessibility means people using keyboards, screen readers, voice control, magnification or switch devices can perceive and operate your UI. In React apps most failures come from **custom widgets built from divs** and from **focus management** after dynamic changes.

### The accessibility tree
Browsers build an accessibility tree alongside the DOM. Each node has a **role** (button, link, dialog), a **name** (what a screen reader announces), a **state** (expanded, checked, selected) and a **value**. Assistive technology only sees this tree. A \`<div onClick>\` has no role, no name from its content in a useful way, is not focusable and does not respond to Enter or Space. A \`<button>\` gets all of that for free.

### Rules in priority order
1. **Semantic HTML first**: \`button\`, \`a href\`, \`label\` + \`input\`, \`fieldset\`/\`legend\`, \`nav\`, \`main\`, headings in order, \`dialog\`, \`details\`.
2. **ARIA only when no native element fits**, and then follow the WAI-ARIA Authoring Practices (APG) pattern exactly. ARIA changes what is announced, not behaviour: \`role="button"\` does not add keyboard handling.
3. **Keyboard**: everything operable with Tab, Shift+Tab, Enter, Space, Escape and arrow keys where the pattern says so. Composite widgets (tabs, menus, listboxes, grids) use **one Tab stop** and arrow keys inside (roving tabindex or \`aria-activedescendant\`).
4. **Visible focus**: never \`outline: none\` without a replacement. Use \`:focus-visible\` so mouse users do not see rings but keyboard users do.
5. **Accessible names**: every control needs one. Visible label preferred; otherwise \`aria-label\` or \`aria-labelledby\`. Icon buttons are the usual offenders.

### Focus management in SPAs
- **Dialogs**: move focus inside on open (first field or the dialog itself), trap Tab within, close on Escape, make the background inert, and **restore focus to the trigger** on close. The native \`<dialog>\` element with \`showModal()\` gives you the top layer, inert background and Escape handling.
- **Route changes**: move focus to the new page's \`h1\` or announce the title, otherwise screen-reader users do not know the page changed.
- **Deleting an item**: move focus to a sensible neighbour, not to \`body\`.
- **Async results**: announce with a live region (\`role="status"\` or \`aria-live="polite"\`) that exists in the DOM before its content changes.

### Testing
Automated tools (axe in Storybook, jest-axe, @axe-core/playwright) catch roughly a third of issues: missing names, contrast, invalid ARIA. The rest requires manual checks: unplug the mouse and complete each flow, then use a screen reader (NVDA + Firefox or Chrome on Windows, VoiceOver on macOS). Testing Library queries by role encourage accessible markup because tests break when names are missing.`,
    examples: [
      {
        title: '❌ Div dialog vs ✅ native dialog with focus restore',
        code: `// ❌ No role, no focus move, no Escape, background still tabbable
{open && (
  <div className="modal">
    <div className="x" onClick={close}>×</div>
    <h2>Confirm payment</h2>
  </div>
)}

// ✅
import { useEffect, useRef } from 'react'

export function ConfirmDialog({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dlg = ref.current
    if (!dlg) return
    if (open && !dlg.open) {
      returnFocus.current = document.activeElement as HTMLElement
      dlg.showModal() // top layer, inert background, Escape fires 'cancel'
    } else if (!open && dlg.open) {
      dlg.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onClose={() => { onClose(); returnFocus.current?.focus() }}
    >
      <h2 id="confirm-title">{title}</h2>
      {children}
      <button type="button" onClick={() => ref.current?.close()} aria-label="Close dialog">×</button>
    </dialog>
  )
}`,
        note: 'showModal() makes the rest of the page inert and handles Escape. The onClose handler covers every close path (button, Escape, form method="dialog") and restores focus to the trigger. Use useId for the title id when several dialogs can exist.',
      },
      {
        title: '✅ Icon button, focus-visible and a live region',
        code: `<button type="button" aria-label="Remove Blue T-shirt from cart" onClick={() => remove(item.id)}>
  <TrashIcon aria-hidden="true" />
</button>

/* .btn:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; } */

// Rendered once, always in the DOM; only its text changes
<p role="status" className="sr-only">{statusMessage}</p>
// setStatusMessage('Blue T-shirt removed. Cart has 2 items.')`,
        note: 'The name includes the item so a list of identical "Remove" buttons is distinguishable. The live region must exist before the message changes or screen readers will not announce it.',
      },
    ],
    realCase: {
      title: 'Checkout dialog failing an accessibility audit',
      story: `**Situation:** An e-commerce company's checkout used a custom address dialog. A procurement-driven WCAG 2.2 AA audit was required before a large B2B customer could sign.

**Symptom:** Auditors reported: focus stayed on the page behind the dialog, Tab moved into hidden page content, the close icon had no accessible name, and after saving the address focus jumped to the top of the document, so NVDA users had to navigate the whole page again.

**Root cause:** The dialog was a positioned \`div\` rendered via a portal; nobody had tested it with a keyboard.

**Fix:** They switched to the native \`dialog\` element with \`showModal()\`, added \`aria-labelledby\`, restored focus to the "Change address" button on close, and added a \`role="status"\` message "Address updated". A Playwright test now opens the dialog, presses Tab until it cycles, presses Escape and asserts focus is back on the trigger; axe runs on the open state.

**Lesson:** Focus management is part of a dialog's contract. Encode it in a test so it never regresses.`,
    },
    pitfalls: [
      'Adding role="button" to a div and assuming it is now accessible: it still is not focusable and does not respond to Enter or Space.',
      'Removing focus outlines globally with outline: none and no :focus-visible replacement.',
      'Using aria-label on non-interactive elements like div or span without a role: many screen readers ignore it.',
      'Mounting a live region at the same time as its message: the change is not announced.',
      'Relying only on automated axe checks, which miss most keyboard and focus-order problems.',
    ],
    exercise: {
      task: 'Build a `DisclosureMenu` for a site navigation: a button that toggles a list of links. It must expose expanded state, close on Escape and return focus to the button, and close when focus leaves the menu.',
      hint: 'Navigation menus of links should use the disclosure pattern (button + aria-expanded + aria-controls), not role="menu". Use onBlur on the wrapper and check e.relatedTarget.',
      solution: `\`\`\`tsx
export function DisclosureMenu({ label, links }: { label: string; links: { href: string; text: string }[] }) {
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const id = useId()
  return (
    <div
      onKeyDown={e => { if (e.key === 'Escape' && open) { setOpen(false); btn.current?.focus() } }}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false) }}
    >
      <button ref={btn} aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>
        {label}
      </button>
      <ul id={id} hidden={!open}>
        {links.map(l => <li key={l.href}><a href={l.href}>{l.text}</a></li>)}
      </ul>
    </div>
  )
}
\`\`\`
Using role="menu" here would be wrong: it tells screen readers to expect application-style arrow-key navigation, which users of a site nav do not expect.`,
    },
    interview: [
      'Why is "no ARIA is better than bad ARIA"? Give an example where adding ARIA made things worse.',
      'Describe everything a modal dialog must do for keyboard and screen-reader users.',
      'What is roving tabindex and when would you use aria-activedescendant instead?',
    ],
  },

  animation: {
    explanation: `Good animation explains change: where a panel came from, which item was removed, what is loading. Bad animation delays users and can make some of them physically ill. The engineering side is about **what the browser can animate cheaply** and **which tool fits which job**.

### The rendering cost model
Changing a CSS property can trigger up to three stages: **layout** (geometry), **paint** (pixels) and **composite** (layers combined on the GPU). Animating \`width\`, \`height\`, \`top\` or \`margin\` forces layout every frame and is likely to drop frames. Animating \`transform\` and \`opacity\` usually only needs compositing and can run off the main thread, so it stays smooth even when JavaScript is busy. Prefer them, and use \`will-change\` sparingly for elements about to animate.

### Choosing a tool
- **CSS transitions**: state A to state B, triggered by a class or attribute change. Hover, focus, open/closed. Cheapest and most robust. Modern CSS adds \`@starting-style\` for enter transitions and \`transition-behavior: allow-discrete\` for animating \`display\` and the top layer.
- **CSS keyframes**: looping or multi-step effects (spinners, skeleton shimmer).
- **Web Animations API** (\`element.animate()\`): imperative control, still compositor-friendly.
- **Motion** (formerly Framer Motion): declarative \`<motion.div animate>\`, spring physics, gestures, **exit animations** via \`AnimatePresence\` (React normally removes elements immediately), and **layout animations** (\`layout\` prop) that use the FLIP technique to animate position and size changes with transforms.
- **View Transitions API**: \`document.startViewTransition(() => update())\` snapshots the old and new state and cross-fades or morphs between them. Great for route changes and list reorders. In React, use the stable \`<ViewTransition>\` component (below); routers such as React Router offer a \`viewTransition\` option.

### React \`<ViewTransition>\` (stable since React 19.3)
Import it from \`'react'\` and wrap the part of the tree that should animate. React calls the browser API for you and animates four cases: **enter** (inserted), **exit** (removed), **update** (its DOM changed) and **share** (an element with the same \`name\` leaves in one place and appears in another).
- **Only Transition updates animate**: \`startTransition\`, a \`<Suspense>\` reveal or \`useDeferredValue\`. A plain urgent \`setState\` updates instantly.
- The default is a cross-fade. Customize with **View Transition Classes** passed to \`enter\`, \`exit\`, \`update\`, \`share\` or \`default\` (e.g. \`default="none"\`, \`update="auto"\`) and target them in CSS with \`::view-transition-old(.cls)\` / \`::view-transition-new(.cls)\`; or use the \`onEnter\`/\`onExit\`/\`onShare\`/\`onUpdate\` callbacks.
- \`addTransitionType('next')\` inside \`startTransition\` lets \`enter\`/\`exit\` take a map such as \`{ next: 'from-right', previous: 'from-left' }\`; CSS can also match \`:active-view-transition-type(next)\`.
- Wrapping a \`<Suspense>\` in \`<ViewTransition>\` animates fallback → content.
- Enter/exit only animate when the \`<ViewTransition>\` is the first thing rendered in its subtree, before any DOM node. Shared \`name\`s must be unique on the page.

### FLIP in one paragraph
First: measure the element's old position. Last: apply the change and measure the new position. Invert: apply a transform so it looks like it is still at the old position. Play: animate the transform back to zero. Layout changes become cheap transform animations. Motion's \`layout\` prop does this for you.

### Reduced motion
Some users have vestibular disorders; large movement, parallax and zooming can cause nausea. Respect \`prefers-reduced-motion: reduce\`: replace movement with fades or remove it, never remove information. In Motion, use \`useReducedMotion()\` or \`<MotionConfig reducedMotion="user">\`.

### Guidelines
- UI feedback: 100–200 ms; larger transitions: 200–400 ms. Ease-out for entering, ease-in for leaving.
- Never block interaction until an animation finishes.
- Animations should not cause layout shift (CLS) or delay content (LCP).`,
    examples: [
      {
        title: '❌ Animating height/left vs ✅ transform + reduced motion',
        code: `/* ❌ Layout every frame */
.drawer { left: -320px; transition: left 300ms; }
.drawer[data-open='true'] { left: 0; }

/* ✅ Compositor-only */
.drawer {
  transform: translateX(-100%);
  transition: transform 250ms cubic-bezier(.2,.8,.2,1);
}
.drawer[data-open='true'] { transform: translateX(0); }

@media (prefers-reduced-motion: reduce) {
  .drawer { transition: opacity 150ms; transform: none; opacity: 0; }
  .drawer[data-open='true'] { opacity: 1; }
}`,
        note: 'Reduced motion still communicates the change (a fade) but removes the large movement.',
      },
      {
        title: '✅ Motion: exit and layout animation for a toast stack',
        code: `import { AnimatePresence, motion, MotionConfig } from 'motion/react'

export function ToastStack({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <MotionConfig reducedMotion="user">
      <ol className="toasts" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map(t => (
            <motion.li
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            >
              {t.message}
              <button aria-label="Dismiss notification" onClick={() => dismiss(t.id)}>×</button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </MotionConfig>
  )
}`,
        note: 'AnimatePresence keeps removed items mounted until their exit finishes; layout makes the remaining toasts slide into place with FLIP. Stable keys are required for both.',
      },
      {
        title: '✅ React <ViewTransition>: directional slide with transition types',
        code: `import { ViewTransition, addTransitionType, startTransition, useState } from 'react'

export function Gallery({ photos }: { photos: Photo[] }) {
  const [index, setIndex] = useState(0)
  function go(dir: 'next' | 'previous') {
    startTransition(() => {
      addTransitionType(dir)
      setIndex(i => (i + (dir === 'next' ? 1 : photos.length - 1)) % photos.length)
    })
  }
  const photo = photos[index]
  return (
    <>
      <ViewTransition
        key={photo.id}
        enter={{ next: 'from-right', previous: 'from-left' }}
        exit={{ next: 'to-left', previous: 'to-right' }}
      >
        <img src={photo.src} alt={photo.alt} />
      </ViewTransition>
      <button onClick={() => go('previous')}>Previous</button>
      <button onClick={() => go('next')}>Next</button>
    </>
  )
}
/* CSS: ::view-transition-new(.from-right) { animation: slide-in-right 250ms ease-out; }
   @media (prefers-reduced-motion: reduce) {
     ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
   } */`,
        note: 'Changing the key exits the old image and enters the new one; only updates inside startTransition animate. addTransitionType picks the direction class. Disable the animation under prefers-reduced-motion.',
      },
    ],
    realCase: {
      title: 'Janky side panel on low-end Android devices',
      story: `**Situation:** A delivery app's order details panel slid in by animating \`width\` from 0 to 400px with a JS animation library.

**Symptom:** On low-end Android phones the animation ran at about 15 fps, and taps during the animation were ignored; INP for "open order" interactions was above 500 ms in field data.

**Root cause:** Animating width triggered layout of the whole order list each frame, on the main thread, while React was also rendering the panel content.

**Fix:** The panel was rendered at its final width and animated with \`transform: translateX\`; content rendering was wrapped in \`startTransition\` so the click response painted immediately. Reduced-motion users get an instant appear.

**Lesson:** Choose compositor-friendly properties and never let animation compete with urgent rendering on the main thread.`,
    },
    pitfalls: [
      'Animating layout properties (width, height, top, margin) instead of transform and opacity.',
      'Ignoring prefers-reduced-motion, or handling it by removing information instead of motion.',
      'Using array index as key with AnimatePresence, so the wrong item animates out.',
      'Long entrance animations that delay LCP or block clicks.',
    ],
    exercise: {
      task: 'Build an expandable FAQ item that animates open and closed smoothly, works without JavaScript animation libraries, and respects reduced motion.',
      hint: 'Use a grid trick: animate grid-template-rows from 0fr to 1fr with an inner overflow:hidden element. Pair it with a button that has aria-expanded.',
      solution: `\`\`\`tsx
export function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className="faq" data-open={open}>
      <h3><button aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>{q}</button></h3>
      <div id={id} className="faq-body" inert={!open}><div><p>{a}</p></div></div>
    </div>
  )
}
/* .faq-body { display:grid; grid-template-rows:0fr; transition:grid-template-rows 200ms ease-out; }
   .faq-body > div { overflow:hidden; }
   .faq[data-open='true'] .faq-body { grid-template-rows:1fr; }
   @media (prefers-reduced-motion: reduce) { .faq-body { transition:none; } } */
\`\`\`
\`inert\` keeps the collapsed links out of the Tab order and accessibility tree (in React 19 it accepts a boolean).`,
    },
    interview: [
      'Why are transform and opacity cheaper to animate than width or top?',
      'Explain the FLIP technique and how layout animation libraries use it.',
      'How should an app behave when the user has prefers-reduced-motion set?',
    ],
  },

  storybook: {
    explanation: `Storybook is a workshop for components: a separate app where each component is rendered in isolation in every state that matters. A **story** is a named, rendered state: \`Primary\`, \`Disabled\`, \`Loading\`, \`WithLongLabel\`, \`ErrorState\`. Stories are written in **Component Story Format (CSF)**: a default export with metadata and named exports, each an object of \`args\`.

### Why isolation matters
Inside the app, reaching the "payment failed with a very long German error message" state takes ten clicks and a mocked backend. In Storybook it is one URL. That makes edge cases visible to designers, QA and reviewers, and it forces components to be decoupled from global app state: if a component is hard to put in a story, it is probably too coupled.

### What Storybook gives you
- **Args and controls**: tweak props live; args are typed from your component.
- **Autodocs**: a docs page from the component's types and stories.
- **Decorators**: wrappers for themes, routers, providers. A toolbar global can switch light/dark by setting \`data-theme\`.
- **Loaders and MSW**: with the msw-storybook-addon, stories declare network handlers so data-fetching components render realistic states.

### Stories as tests
This is where Storybook moves from documentation to quality tooling:
- **Interaction tests**: a \`play\` function uses Testing Library-style queries and user events against the rendered story, with assertions via \`expect\` from \`storybook/test\`. You see each step in the Interactions panel.
- **Accessibility tests**: the a11y addon runs axe on every story. You can make violations fail the test run.
- **Vitest integration**: with the Storybook Vitest addon, stories run as tests in a real browser (Vitest browser mode), so CI executes every story's render, play function and a11y checks.
- **Visual regression**: services such as Chromatic (or self-hosted screenshot diffing) compare a screenshot of every story against the baseline, catching CSS regressions unit tests cannot.

### Good story hygiene
- One story per meaningful state, not per prop combination.
- Include stress cases: long text, empty list, RTL, small viewport, dark theme.
- Keep stories close to components (\`Button.stories.tsx\` next to \`Button.tsx\`).
- Reuse stories in unit tests with \`composeStories\` so test setup is not duplicated.

### When it is overkill
A small app without a shared component library may not need it. It pays off when several people build UI against shared components, or when designers review states.`,
    examples: [
      {
        title: '✅ CSF3 stories with an interaction + a11y test',
        code: `import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { Tabs } from './Tabs'

const meta = {
  title: 'Navigation/Tabs',
  component: Tabs,
  parameters: { a11y: { test: 'error' } },
  render: args => (
    <Tabs {...args}>
      <Tabs.List label="Account settings">
        <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
        <Tabs.Trigger value="billing">Billing</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Panel value="profile">Profile form</Tabs.Panel>
      <Tabs.Panel value="billing">Billing details</Tabs.Panel>
    </Tabs>
  ),
  args: { defaultValue: 'profile' },
} satisfies Meta<typeof Tabs>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const KeyboardNavigation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const profile = canvas.getByRole('tab', { name: 'Profile' })
    await userEvent.click(profile)
    await userEvent.keyboard('{ArrowRight}')
    const billing = canvas.getByRole('tab', { name: 'Billing' })
    await expect(billing).toHaveFocus()
    await expect(billing).toHaveAttribute('aria-selected', 'true')
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent('Billing details')
  },
}`,
        note: 'The play function is a real test that runs in the browser; a11y test "error" fails the run on axe violations. The same story is documentation and regression test.',
      },
      {
        title: '✅ Theme decorator driven by a toolbar global',
        code: `// .storybook/preview.tsx
import type { Preview } from '@storybook/react-vite'
import '../src/tokens.css'

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: { icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, ctx) => {
      document.documentElement.dataset.theme = ctx.globals.theme
      return <Story />
    },
  ],
}
export default preview`,
        note: 'Because themes are just token values, the decorator only flips an attribute. Visual tests can capture both themes per story.',
      },
    ],
    realCase: {
      title: 'Visual regressions slipping through a green test suite',
      story: `**Situation:** A design-system team at a travel company had 90% unit coverage, yet product teams kept reporting broken layouts after releases.

**Symptom:** A token rename changed the input border to transparent in dark mode; all tests passed because they queried roles and text, not appearance.

**Root cause:** No test looked at pixels, and dark mode was only checked manually on a handful of screens.

**Fix:** Every component got stories for its states in both themes, and CI ran screenshot comparison on every pull request. Reviewers approve visual diffs explicitly. The a11y addon was set to fail on violations, which caught two contrast regressions in the first week.

**Lesson:** Behaviour tests and visual tests catch different bugs. Stories are the cheapest place to run both.`,
    },
    pitfalls: [
      'Stories that depend on global app state or real APIs, so they break randomly; mock with decorators and MSW handlers.',
      'Writing one story per prop combination instead of per meaningful state: noise hides the important cases.',
      'Treating Storybook as documentation only and never running stories in CI.',
      'Letting stories drift from real usage because they are not reused in tests (use composeStories).',
    ],
    exercise: {
      task: 'Write stories for a `UserCard` that fetches `/api/users/:id`: Loading, Success, NotFound (404) and ServerError (500), using MSW handlers per story. Add a play function to the Success story asserting the user name heading is visible.',
      hint: 'With msw-storybook-addon, put handlers in parameters.msw.handlers. Use delay("infinite") for the loading state.',
      solution: `\`\`\`tsx
import { http, HttpResponse } from 'msw'
import { delay } from 'msw/utils'
import { expect, within } from 'storybook/test'

const meta = { component: UserCard, args: { id: '42' } } satisfies Meta<typeof UserCard>
export default meta
type Story = StoryObj<typeof meta>

export const Loading: Story = {
  parameters: { msw: { handlers: [http.get('/api/users/:id', async () => { await delay('infinite') })] } },
}
export const Success: Story = {
  parameters: { msw: { handlers: [http.get('/api/users/:id', () => HttpResponse.json({ id: '42', name: 'Ada Lovelace' }))] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(await c.findByRole('heading', { name: 'Ada Lovelace' })).toBeVisible()
  },
}
export const NotFound: Story = {
  parameters: { msw: { handlers: [http.get('/api/users/:id', () => new HttpResponse(null, { status: 404 }))] } },
}
export const ServerError: Story = {
  parameters: { msw: { handlers: [http.get('/api/users/:id', () => HttpResponse.json({ message: 'boom' }, { status: 500 }))] } },
}
\`\`\``,
    },
    interview: [
      'How can Storybook stories be used as tests, not just documentation?',
      'What kinds of bugs does visual regression testing catch that Testing Library tests do not?',
      'How do you make a data-fetching component render in Storybook without a real backend?',
    ],
  },
}

export default details
