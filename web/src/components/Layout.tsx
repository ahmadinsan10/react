import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { LEVELS } from '../data/levels'
import { dueCards, isComplete, levelStats } from '../store/logic'
import { useProgress } from '../store/progress'
import { CommandPalette } from './CommandPalette'
import { Icon, Logo, Toaster } from './ui'

type Theme = 'system' | 'light' | 'dark'

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const t = localStorage.getItem('rm-theme')
      return t === 'light' || t === 'dark' ? t : 'system'
    } catch {
      return 'system'
    }
  })
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
    try {
      if (theme === 'system') localStorage.removeItem('rm-theme')
      else localStorage.setItem('rm-theme', theme)
    } catch {
      /* ignore */
    }
  }, [theme])
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  return { theme, setTheme, isDark }
}

export function Layout() {
  const progress = useProgress()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const { setTheme, isDark } = useTheme()
  const location = useLocation()
  const due = dueCards(progress).length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      } else if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Close the mobile nav and scroll to top (or to the hash) on navigation.
  useEffect(() => {
    setNavOpen(false)
    if (location.hash) {
      requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    } else {
      window.scrollTo(0, 0)
    }
  }, [location.pathname, location.hash])

  return (
    <div className="shell">
      <a href="#main" className="sr-only">
        Skip to content
      </a>
      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}
      <aside className={`sidebar${navOpen ? ' open' : ''}`} aria-label="Main navigation">
        <Link to="/" className="brand">
          <Logo /> React Mastery
        </Link>
        <NavLink to="/" end className="nav-link">
          <Icon name="home" /> <span className="label">Dashboard</span>
        </NavLink>
        <NavLink to="/roadmap" className="nav-link">
          <Icon name="map" /> <span className="label">Roadmap</span>
        </NavLink>
        <NavLink to="/lab" className="nav-link">
          <Icon name="flask" /> <span className="label">Visualization Lab</span>
        </NavLink>
        <NavLink to="/review" className="nav-link">
          <Icon name="brain" /> <span className="label">Review</span>
          {due > 0 && <span className="badge" aria-label={`${due} cards due`}>{due}</span>}
        </NavLink>
        <NavLink to="/exam" className="nav-link">
          <Icon name="target" /> <span className="label">Exam mode</span>
        </NavLink>
        <NavLink to="/checklist" className="nav-link">
          <Icon name="list" /> <span className="label">Expert checklist</span>
        </NavLink>
        <div className="nav-section">Levels</div>
        {LEVELS.map(l => {
          const s = levelStats(progress, l)
          const done = isComplete(s.ratio)
          return (
            <NavLink key={l.id} to={`/level/${l.slug}`} className="nav-link" title={l.title}>
              <span className={`num${done ? ' done' : ''}`}>{done ? '✓' : l.id}</span>
              <span className="label">{l.title}</span>
              <span className="mini" aria-hidden="true">
                <i style={{ width: `${s.ratio * 100}%` }} />
              </span>
            </NavLink>
          )
        })}
        <div className="spacer" />
        <NavLink to="/settings" className="nav-link">
          <Icon name="settings" /> <span className="label">Settings & backup</span>
        </NavLink>
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
          <button className="btn ghost icon-btn" onClick={() => setTheme(isDark ? 'light' : 'dark')} aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}>
            <Icon name={isDark ? 'sun' : 'moon'} />
          </button>
        </header>
        <main id="main" className="content">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Toaster />
    </div>
  )
}
