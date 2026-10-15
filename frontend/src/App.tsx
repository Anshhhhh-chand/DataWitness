import { useEffect, useState } from 'react'
import { createDemoInvestigation } from './api/endpoints'
import { HomePage } from './pages/HomePage'
import { InvestigationPage } from './pages/InvestigationPage'
import { NewInvestigationPage } from './pages/NewInvestigationPage'

type Route = { page: 'home' | 'new' | 'investigation'; id?: string }

function readRoute(): Route {
  const parts = window.location.pathname.split('/').filter(Boolean)
  if (parts[0] === 'new') return { page: 'new' }
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
    try {
      const result = await createDemoInvestigation()
      navigate(`/investigations/${result.investigation_id}`)
    } catch (demoError) {
      setError(demoError instanceof Error ? demoError.message : 'Could not start the demo')
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-button" onClick={() => navigate('/')} aria-label="Go to DataWitness overview">
          <span className="brand-mark">DW</span>
          <span><strong>DataWitness</strong><span className="eyebrow">REPRODUCIBLE DATA DEBUGGING</span></span>
        </button>
        <span className="status-pill"><span className="status-dot" /> Local mode</span>
      </header>
      {route.page === 'home' && <HomePage onNew={() => navigate('/new')} onDemo={() => void startDemo()} demoLoading={demoLoading} error={error} />}
      {route.page === 'new' && <NewInvestigationPage onCreated={(id) => navigate(`/investigations/${id}`)} onBack={() => navigate('/')} />}
      {route.page === 'investigation' && route.id && <InvestigationPage id={route.id} onBack={() => navigate('/')} />}
    </main>
  )
}

export default App
