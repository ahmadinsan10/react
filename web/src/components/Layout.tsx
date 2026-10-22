import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigationType } from 'react-router'
import { LEVELS } from '../data/levels'
import { dueCards, isComplete, levelStats } from '../store/logic'
import { useProgress } from '../store/progress'
import { CommandPalette } from './CommandPalette'
import { SyncBadge } from './SyncPanel'
import { Icon, Logo, Toaster } from './ui'

type Theme = 'system' | 'light' | 'dark'

function useStoredState<T extends string>(key: string, fallback: T, valid: readonly T[]) {
  const [value, setValue] = useState<T>(() => {
    try {
      const v = localStorage.getItem(key) as T | null
      return v && valid.includes(v) ? v : fallback
    } catch {
      return fallback
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* ignore */
    }
  }, [key, value])
  return [value, setValue] as const
}

function useTheme() {
  const [theme, setTheme] = useStoredState<Theme>('rm-theme', 'system', ['system', 'light', 'dark'])
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
  }, [theme])
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  return { setTheme, isDark }
}

export function Layout() {
  const progress = useProgress()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [sidebar, setSidebar] = useStoredState('rm-sidebar', 'open', ['open', 'collapsed'])
  const collapsed = sidebar === 'collapsed'
  const { setTheme, isDark } = useTheme()
  const location = useLocation()
  const navType = useNavigationType()
  const sidebarRef = useRef<HTMLElement>(null)
  const due = dueCards(progress).length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      } else if (e.key === '/' && !typing) {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Mobile drawer: lock background scroll and close on Escape.
  useEffect(() => {
    if (!navOpen) return
    document.body.classList.add('nav-locked')
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setNavOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('nav-locked')
      window.removeEventListener('keydown', onKey)
    }
  }, [navOpen])

  // Remember the scroll position of each history entry, so Back returns you to where you were.
  useEffect(() => {
    const key = `rm-scroll:${location.key}`
    const save = () => {
      try {
        sessionStorage.setItem(key, String(window.scrollY))
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [location.key])

  // On navigation: close the drawer; restore scroll on Back/Forward, otherwise go to the hash or the top.
  useLayoutEffect(() => {
    setNavOpen(false)
    if (navType === 'POP') {
      let y = 0
      try {
        y = Number(sessionStorage.getItem(`rm-scroll:${location.key}`) ?? 0)
      } catch {
        /* ignore */
      }
      // Wait a frame so lazily rendered content has height before restoring.
      requestAnimationFrame(() => window.scrollTo(0, y))
    } else if (location.hash) {
      requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    } else {
      window.scrollTo(0, 0)
    }
    // Keep the active level visible in the long sidebar list.
    requestAnimationFrame(() => sidebarRef.current?.querySelector('.nav-link.active:not([href="/"])')?.scrollIntoView({ block: 'nearest' }))
  }, [location.key, location.hash, navType])

  return (
    <div className={`shell${collapsed ? ' collapsed' : ''}`}>
      <a href="#main" className="sr-only">
        Skip to content
      </a>
      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}
      <aside ref={sidebarRef} className={`sidebar${navOpen ? ' open' : ''}`} aria-label="Main navigation">
        <Link to="/" className="brand" title="React Mastery">
          <Logo /> <span className="brand-text">React Mastery</span>
        </Link>
        <NavLink to="/" end className="nav-link" title="Dashboard">
          <Icon name="home" /> <span className="label">Dashboard</span>
        </NavLink>
        <NavLink to="/roadmap" className="nav-link" title="Roadmap">
          <Icon name="map" /> <span className="label">Roadmap</span>
        </NavLink>
        <NavLink to="/lab" className="nav-link" title="Visualization Lab">
          <Icon name="flask" /> <span className="label">Visualization Lab</span>
        </NavLink>
        <NavLink to="/review" className="nav-link" title="Review">
          <Icon name="brain" /> <span className="label">Review</span>
          {due > 0 && <span className="badge" aria-label={`${due} cards due`}>{due}</span>}
        </NavLink>
        <NavLink to="/exam" className="nav-link" title="Exam mode">
          <Icon name="target" /> <span className="label">Exam mode</span>
        </NavLink>
        <NavLink to="/checklist" className="nav-link" title="Expert checklist">
          <Icon name="list" /> <span className="label">Expert checklist</span>
        </NavLink>
        <div className="nav-section">Levels</div>
        {LEVELS.map(l => {
          const s = levelStats(progress, l)
          const done = isComplete(s.ratio)
          return (
            <NavLink key={l.id} to={`/level/${l.slug}`} className="nav-link" title={`Level ${l.id}: ${l.title}`}>
              <span className={`num${done ? ' done' : ''}`}>{done ? '✓' : l.id}</span>
              <span className="label">{l.title}</span>
              <span className="mini" aria-hidden="true">
                <i style={{ width: `${s.ratio * 100}%` }} />
              </span>
            </NavLink>
          )
        })}
        <div className="spacer" />
        <NavLink to="/settings" className="nav-link" title="Settings & sync">
          <Icon name="settings" /> <span className="label">Settings & sync</span>
        </NavLink>
        <button
          className="nav-link collapse-btn"
          onClick={() => setSidebar(collapsed ? 'open' : 'collapsed')}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span style={{ display: 'inline-flex', transform: collapsed ? 'none' : 'rotate(180deg)' }}>
            <Icon name="chevron" />
          </span>
          <span className="label">Collapse</span>
        </button>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn ghost icon-btn menu-btn" onClick={() => setNavOpen(true)} aria-label="Open navigation">
            <Icon name="menu" />
          </button>
          <button className="search-btn" onClick={() => setPaletteOpen(true)}>
            <Icon name="search" size={16} /> <span className="search-text">Search lessons, demos, questions…</span> <kbd>Ctrl K</kbd>
          </button>
          <span className="spacer" />
          <SyncBadge />
          <button className="btn ghost icon-btn" onClick={() => setTheme(isDark ? 'light' : 'dark')} aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}>
            <Icon name={isDark ? 'sun' : 'moon'} />
          </button>
        </header>
        <main id="main" className="content">
          <Outlet />
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Quick navigation">
        <NavLink to="/" end>
          <Icon name="home" /> Home
        </NavLink>
        <NavLink to="/roadmap">
          <Icon name="map" /> Roadmap
        </NavLink>
        <NavLink to="/lab">
          <Icon name="flask" /> Lab
        </NavLink>
        <NavLink to="/review">
          <Icon name="brain" /> Review
          {due > 0 && <span className="badge">{due}</span>}
        </NavLink>
        <button onClick={() => setNavOpen(true)} aria-label="Open full menu">
          <Icon name="menu" /> Levels
        </button>
      </nav>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Toaster />
    </div>
  )
}
