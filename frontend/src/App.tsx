import { lazy, Suspense, useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { AppShell } from './components/layout/AppShell'
import { createDemoInvestigation } from './api/endpoints'
import { HomePage } from './pages/HomePage'
import { NewInvestigationPage } from './pages/NewInvestigationPage'

const InvestigationPage = lazy(() => import('./pages/InvestigationPage').then((module) => ({ default: module.InvestigationPage })))
const ChangesPage = lazy(() => import('./pages/ChangesPage').then((module) => ({ default: module.ChangesPage })))
const ExperimentsPage = lazy(() => import('./pages/ExperimentsPage').then((module) => ({ default: module.ExperimentsPage })))

type Route = { page: 'home' | 'new' | 'investigation' | 'changes' | 'experiments'; id?: string }

function readRoute(): Route {
  const parts = window.location.pathname.split('/').filter(Boolean)
  if (parts[0] === 'new') return { page: 'new' }
  if (parts[0] === 'investigations' && parts[1] && parts[2] === 'changes') return { page: 'changes', id: parts[1] }
  if (parts[0] === 'investigations' && parts[1] && parts[2] === 'experiments') return { page: 'experiments', id: parts[1] }
  if (parts[0] === 'investigations' && parts[1]) return { page: 'investigation', id: parts[1] }
  return { page: 'home' }
}

function App() {
  const [route, setRoute] = useState<Route>(readRoute)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handlePopState = () => setRoute(readRoute())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function navigate(path: string) {
    window.history.pushState({}, '', path)
    setRoute(readRoute())
    setError(null)
  }

  async function startDemo() {
    setDemoLoading(true)
    setError(null)
    try { const result = await createDemoInvestigation(); navigate(`/investigations/${result.investigation_id}`) } catch (demoError) { setError(demoError instanceof Error ? demoError.message : 'Could not start the demo') } finally { setDemoLoading(false) }
  }

  const pageTitle = route.page === 'home' ? 'Overview' : route.page === 'new' ? 'New investigation' : route.page === 'changes' ? 'Changes' : route.page === 'experiments' ? 'Experiments' : 'Investigation overview'
  return <><AppShell active={route.page === 'home' ? 'overview' : route.page} investigationId={route.id} pageTitle={pageTitle} onNavigate={navigate}><Suspense fallback={<div className="loading-panel"><div className="loading-spinner" />Loading view…</div>}>
    {route.page === 'home' && <HomePage onNew={() => navigate('/new')} onDemo={() => void startDemo()} onOpenInvestigation={(id) => navigate(`/investigations/${id}`)} demoLoading={demoLoading} error={error} />}
    {route.page === 'new' && <NewInvestigationPage onCreated={(id) => navigate(`/investigations/${id}`)} onBack={() => navigate('/')} />}
    {route.page === 'investigation' && route.id && <InvestigationPage id={route.id} onBack={() => navigate('/')} onNavigate={navigate} />}
    {route.page === 'changes' && route.id && <ChangesPage id={route.id} onBack={() => navigate(`/investigations/${route.id}`)} />}
    {route.page === 'experiments' && route.id && <ExperimentsPage id={route.id} onBack={() => navigate(`/investigations/${route.id}`)} />}
  </Suspense></AppShell><Toaster position="bottom-right" richColors closeButton /></>
}

export default App
