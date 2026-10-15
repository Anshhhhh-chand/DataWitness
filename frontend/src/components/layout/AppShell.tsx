import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Activity, ArrowLeft, BarChart3, ChevronRight, FileSearch, FlaskConical, Menu, Moon, Plus, Search, Sun, X } from 'lucide-react'
import { getInvestigations } from '../../api/endpoints'
import type { InvestigationSummary } from '../../api/types'

type AppShellProps = {
  active: 'overview' | 'new' | 'investigation' | 'changes' | 'experiments'
  investigationId?: string
  pageTitle: string
  onNavigate: (path: string) => void
  children: React.ReactNode
}

const navigation = [
  { id: 'overview', label: 'Overview', icon: BarChart3, path: '/' },
  { id: 'new', label: 'New investigation', icon: Plus, path: '/new' },
] as const

export function AppShell({ active, investigationId, pageTitle, onNavigate, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dark, setDark] = useState(() => window.localStorage.getItem('datawitness-theme') === 'dark')
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [investigations, setInvestigations] = useState<InvestigationSummary[]>([])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    window.localStorage.setItem('datawitness-theme', dark ? 'dark' : 'light')
  }, [dark])

  const go = (path: string) => {
    setSidebarOpen(false)
    onNavigate(path)
  }

  async function openSearch() {
    setSearchOpen(true)
    if (investigations.length === 0) {
      try { setInvestigations(await getInvestigations(20)) } catch { setInvestigations([]) }
    }
  }

  const searchResults = investigations.filter((item) => `${item.before_filename} ${item.after_filename} ${item.status}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="app-frame">
      <AnimatePresence>
        {sidebarOpen && <motion.button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}
      </AnimatePresence>
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <button className="brand-lockup" onClick={() => go('/')} aria-label="Go to DataWitness overview">
            <span className="brand-mark"><Activity size={18} strokeWidth={2.5} /></span>
            <span><strong>DataWitness</strong><small>Data debugging, verified</small></span>
          </button>
          <button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <button className="sidebar-search" onClick={() => void openSearch()}><Search size={15} /><span>Search</span><kbd>⌘ K</kbd></button>
        <div className="sidebar-section-label">Workspace</div>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navigation.map(({ id, label, icon: Icon, path }) => <button key={id} className={`nav-item ${active === id ? 'nav-item-active' : ''}`} onClick={() => go(path)}><Icon size={17} /><span>{label}</span>{active === id && <ChevronRight size={14} className="nav-chevron" />}</button>)}
        </nav>
        {investigationId && <>
          <div className="sidebar-section-label sidebar-section-spaced">Current investigation</div>
          <nav className="sidebar-nav" aria-label="Investigation navigation">
            <button className={`nav-item ${active === 'investigation' ? 'nav-item-active' : ''}`} onClick={() => go(`/investigations/${investigationId}`)}><FileSearch size={17} /><span>Overview</span></button>
            <button className={`nav-item ${active === 'changes' ? 'nav-item-active' : ''}`} onClick={() => go(`/investigations/${investigationId}/changes`)}><Search size={17} /><span>Changes</span></button>
            <button className={`nav-item ${active === 'experiments' ? 'nav-item-active' : ''}`} onClick={() => go(`/investigations/${investigationId}/experiments`)}><FlaskConical size={17} /><span>Experiments</span></button>
          </nav>
        </>}
        <div className="sidebar-spacer" />
        <div className="sidebar-footer"><div className="local-status"><span className="status-dot" /><span><strong>Local processing</strong><small>Your data stays here</small></span></div><button className="theme-toggle" onClick={() => setDark((value) => !value)} aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`}>{dark ? <Sun size={16} /> : <Moon size={16} />}</button></div>
      </aside>
      <main className="main-area">
        <header className="app-header"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={19} /></button><div className="breadcrumbs"><span>DataWitness</span><ChevronRight size={14} /><strong>{pageTitle}</strong></div><div className="header-actions"><button className="header-search" onClick={() => void openSearch()}><Search size={15} /><span>Search investigations</span><kbd>⌘ K</kbd></button><button className="header-theme icon-button" onClick={() => setDark((value) => !value)} aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>{investigationId && <button className="button button-compact button-primary" onClick={() => go('/new')}><Plus size={15} /> New</button>}</div></header>
        <div className="page-content">{children}</div>
      </main>
      <AnimatePresence>{searchOpen && <motion.div className="search-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><button className="search-overlay-close" aria-label="Close search" onClick={() => setSearchOpen(false)} /><motion.div className="search-dialog" role="dialog" aria-modal="true" aria-label="Search investigations" initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }}><div className="search-dialog-input"><Search size={17} /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setSearchOpen(false) }} placeholder="Search investigations…" /><kbd>ESC</kbd></div><div className="search-dialog-results">{searchResults.length === 0 ? <p>{investigations.length === 0 ? 'No recent investigations yet.' : 'No matching investigations.'}</p> : searchResults.map((item) => <button key={item.investigation_id} onClick={() => { setSearchOpen(false); setSearch(''); go(`/investigations/${item.investigation_id}`) }}><FileSearch size={15} /><span><strong>{item.before_filename} → {item.after_filename}</strong><small>{item.status} · {item.changed_count} changed records</small></span><ChevronRight size={14} /></button>)}</div></motion.div></motion.div>}</AnimatePresence>
    </div>
  )
}

export function PageBack({ onBack, label = 'Back to overview' }: { onBack: () => void; label?: string }) {
  return <button className="back-link" onClick={onBack}><ArrowLeft size={14} /> {label}</button>
}
