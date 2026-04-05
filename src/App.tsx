import { useState, useEffect } from 'react'
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
import { Loader2 } from 'lucide-react'

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
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
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
  )
}
