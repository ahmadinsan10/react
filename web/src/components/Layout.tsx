import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigationType } from 'react-router'
import { dueCards, isComplete, levelStats } from '../store/logic'
import { useProgress } from '../store/progress'
import { CommandPalette } from './CommandPalette'
import { SyncBadge } from './SyncPanel'
import { Icon, Logo, Toaster } from './ui'
import { defineStrings, LANGS, setLang, useLang, useLevels, useStrings } from '../i18n'

const S = defineStrings({
  en: {
    skip: 'Skip to content',
    nav: 'Main navigation',
    dashboard: 'Dashboard',
    roadmap: 'Roadmap',
    lab: 'Visualization Lab',
    review: 'Review',
    exam: 'Exam mode',
    checklist: 'Expert checklist',
    levels: 'Levels',
    settings: 'Settings & sync',
    collapse: 'Collapse',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar',
    openNav: 'Open navigation',
    closeNav: 'Close navigation',
    openMenu: 'Open full menu',
    search: 'Search lessons, demos, questions…',
    toLight: 'Switch to light theme',
    toDark: 'Switch to dark theme',
    quickNav: 'Quick navigation',
    home: 'Home',
    labShort: 'Lab',
    cardsDue: '{n} cards due',
    language: 'Language',
  },
  id: {
    skip: 'Langsung ke konten',
    nav: 'Navigasi utama',
    dashboard: 'Dashboard',
    roadmap: 'Roadmap',
    lab: 'Lab Visualisasi',
    review: 'Ulang Materi',
    exam: 'Mode Ujian',
    checklist: 'Checklist Ahli',
    levels: 'Level',
    settings: 'Pengaturan & sinkronisasi',
    collapse: 'Ciutkan',
    collapseSidebar: 'Ciutkan sidebar',
    expandSidebar: 'Lebarkan sidebar',
    openNav: 'Buka navigasi',
    closeNav: 'Tutup navigasi',
    openMenu: 'Buka menu lengkap',
    search: 'Cari materi, demo, soal…',
    toLight: 'Ganti ke tema terang',
    toDark: 'Ganti ke tema gelap',
    quickNav: 'Navigasi cepat',
    home: 'Beranda',
    labShort: 'Lab',
    cardsDue: '{n} kartu perlu diulang',
    language: 'Bahasa',
  },
})

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
  const s = useStrings(S)
  const lang = useLang()
  const LEVELS = useLevels()
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

  // Track whether we're in drawer mode (must match the 900px breakpoint in styles.css).
  const [isDrawer, setIsDrawer] = useState(() => window.matchMedia('(max-width: 900px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const onChange = () => {
      setIsDrawer(mq.matches)
      // Rotating/resizing to desktop with the drawer open would otherwise leave scroll locked.
      if (!mq.matches) setNavOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Drawer behaves like a modal: lock background scroll, Escape closes,
  // focus moves into it on open and back to whatever opened it on close.
  const openerRef = useRef<HTMLElement | null>(null)
  const openNav = () => {
    openerRef.current = document.activeElement as HTMLElement | null
    setNavOpen(true)
  }
  useEffect(() => {
    if (!navOpen) return
    document.body.classList.add('nav-locked')
    sidebarRef.current?.querySelector<HTMLElement>('.drawer-close')?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setNavOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('nav-locked')
      window.removeEventListener('keydown', onKey)
      // Restore focus only if it's still inside the drawer (not when a link navigated elsewhere).
      if (sidebarRef.current?.contains(document.activeElement)) openerRef.current?.focus()
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
        {s('skip')}
      </a>
      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}
      <aside
        ref={sidebarRef}
        id="main-nav"
        className={`sidebar${navOpen ? ' open' : ''}`}
        aria-label={s('nav')}
        // A closed drawer is only slid off-screen: make it unreachable by Tab and screen readers.
        inert={isDrawer && !navOpen}
        {...(isDrawer && navOpen ? { role: 'dialog', 'aria-modal': true } : {})}
      >
        <div className="brand-row">
          <Link to="/" className="brand" title="React Mastery">
            <Logo /> <span className="brand-text">React Mastery</span>
          </Link>
          <button className="btn ghost icon-btn drawer-close" onClick={() => setNavOpen(false)} aria-label={s('closeNav')}>
            <Icon name="close" />
          </button>
        </div>
        <NavLink to="/" end className="nav-link" title={s('dashboard')}>
          <Icon name="home" /> <span className="label">{s('dashboard')}</span>
        </NavLink>
        <NavLink to="/roadmap" className="nav-link" title={s('roadmap')}>
          <Icon name="map" /> <span className="label">{s('roadmap')}</span>
        </NavLink>
        <NavLink to="/lab" className="nav-link" title={s('lab')}>
          <Icon name="flask" /> <span className="label">{s('lab')}</span>
        </NavLink>
        <NavLink to="/review" className="nav-link" title={s('review')}>
          <Icon name="brain" /> <span className="label">{s('review')}</span>
          {due > 0 && <span className="badge" aria-label={s('cardsDue', { n: due })}>{due}</span>}
        </NavLink>
        <NavLink to="/exam" className="nav-link" title={s('exam')}>
          <Icon name="target" /> <span className="label">{s('exam')}</span>
        </NavLink>
        <NavLink to="/checklist" className="nav-link" title={s('checklist')}>
          <Icon name="list" /> <span className="label">{s('checklist')}</span>
        </NavLink>
        <div className="nav-section">{s('levels')}</div>
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
        <NavLink to="/settings" className="nav-link" title={s('settings')}>
          <Icon name="settings" /> <span className="label">{s('settings')}</span>
        </NavLink>
        <button
          className="nav-link collapse-btn"
          onClick={() => setSidebar(collapsed ? 'open' : 'collapsed')}
          aria-label={collapsed ? s('expandSidebar') : s('collapseSidebar')}
          title={collapsed ? s('expandSidebar') : s('collapseSidebar')}
        >
          <span style={{ display: 'inline-flex', transform: collapsed ? 'none' : 'rotate(180deg)' }}>
            <Icon name="chevron" />
          </span>
          <span className="label">{s('collapse')}</span>
        </button>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn ghost icon-btn menu-btn" onClick={openNav} aria-label={s('openNav')} aria-expanded={navOpen} aria-controls="main-nav">
            <Icon name="menu" />
          </button>
          <button className="search-btn" onClick={() => setPaletteOpen(true)}>
            <Icon name="search" size={16} /> <span className="search-text">{s('search')}</span> <kbd>Ctrl K</kbd>
          </button>
          <span className="spacer" />
          <SyncBadge />
          <div className="lang-switch" role="radiogroup" aria-label={s('language')}>
            {LANGS.map(l => (
              <button key={l.value} role="radio" aria-checked={lang === l.value} title={l.label} onClick={() => setLang(l.value)}>
                {l.short}
              </button>
            ))}
          </div>
          <button className="btn ghost icon-btn" onClick={() => setTheme(isDark ? 'light' : 'dark')} aria-label={isDark ? s('toLight') : s('toDark')}>
            <Icon name={isDark ? 'sun' : 'moon'} />
          </button>
        </header>
        <main id="main" className="content">
          <Outlet />
        </main>
      </div>
      <nav className="bottom-nav" aria-label={s('quickNav')}>
        <NavLink to="/" end>
          <Icon name="home" /> {s('home')}
        </NavLink>
        <NavLink to="/roadmap">
          <Icon name="map" /> {s('roadmap')}
        </NavLink>
        <NavLink to="/lab">
          <Icon name="flask" /> {s('labShort')}
        </NavLink>
        <NavLink to="/review">
          <Icon name="brain" /> {s('review')}
          {due > 0 && <span className="badge">{due}</span>}
        </NavLink>
        <button onClick={openNav} aria-label={s('openMenu')} aria-expanded={navOpen} aria-controls="main-nav">
          <Icon name="menu" /> {s('levels')}
        </button>
      </nav>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Toaster />
    </div>
  )
}
