import { useState, useEffect, Component, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { CommandPalette } from './components/CommandPalette'
import { Toaster } from './components/Toast'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Radar from './pages/Radar'
import Pipeline from './pages/Pipeline'
import Propuestas from './pages/Propuestas'
import Settings from './pages/Settings'
import Kit from './pages/Kit'
import Share from './pages/Share'
import AuditoriaGratis from './pages/AuditoriaGratis'
import { Loader2 } from 'lucide-react'

class ConfigErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] p-8">
          <div className="max-w-md text-center space-y-4">
            <p className="text-red-400 font-mono text-sm">Error de configuración</p>
            <p className="text-[#9ca3af] text-sm">
              Revisa tu <code className="text-amber-400">.env.local</code>: asegúrate de que{' '}
              <code className="text-amber-400">VITE_SUPABASE_URL</code> y{' '}
              <code className="text-amber-400">VITE_SUPABASE_ANON_KEY</code> tienen valores reales.
            </p>
            <p className="text-[#4a4a4a] text-xs font-mono">{(this.state.error as Error).message}</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center space-y-3">
        <p className="text-4xl font-mono font-bold text-[#4a4a4a]">404</p>
        <p className="text-sm text-[#9ca3af]">Esta página no existe.</p>
        <a href="/radar" className="inline-block text-xs text-amber-400 hover:text-amber-300 underline">
          Volver al Radar
        </a>
      </div>
    </div>
  )
}

function AppShell() {
  const { session, loading } = useAuth()
  const [cmdOpen, setCmdOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
        <Loader2 size={24} className="animate-spin text-amber-500" />
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <div className="flex min-h-screen bg-[#0f0f0f]">
      <Sidebar onOpenCmd={() => setCmdOpen(true)} />
      <main className="flex-1 ml-16 md:ml-56 flex flex-col">
        <Routes>
          <Route path="/" element={<Navigate to="/radar" replace />} />
          <Route path="/radar" element={<Radar />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/propuestas" element={<Propuestas />} />
          <Route path="/kit" element={<Kit />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <ConfigErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/share/:kitId" element={<Share />} />
          <Route path="/auditoria-gratis" element={<AuditoriaGratis />} />
          <Route path="*" element={<AppShell />} />
        </Routes>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              color: '#f5f5f5',
            },
          }}
        />
      </BrowserRouter>
    </ConfigErrorBoundary>
  )
}
