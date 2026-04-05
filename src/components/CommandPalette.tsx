import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Target, Columns3, FileText, Settings, Wrench } from 'lucide-react'
import { cn } from '../lib/cn'
import { ScoreBadge } from './ScoreBadge'
import { useLeads } from '../hooks/useLeads'
import { STATUS_LABELS, type LeadStatus } from '../constants/statuses'

interface CommandItem {
  id: string
  label: string
  sub?: string
  score?: number
  icon?: React.ReactNode
  onSelect: () => void
}

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { leads } = useLeads()
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const navItems: CommandItem[] = [
    { id: 'nav-radar', label: 'Ir al Radar', sub: 'Buscar nuevos negocios', icon: <Target size={14} />, onSelect: () => { navigate('/radar'); onClose() } },
    { id: 'nav-pipeline', label: 'Ir al Pipeline', sub: 'Gestionar leads activos', icon: <Columns3 size={14} />, onSelect: () => { navigate('/pipeline'); onClose() } },
    { id: 'nav-propuestas', label: 'Ir a Propuestas', sub: 'Generar propuesta comercial', icon: <FileText size={14} />, onSelect: () => { navigate('/propuestas'); onClose() } },
    { id: 'nav-kit', label: 'Ir a Kit Generator', sub: 'Generar kit IA para un lead', icon: <Wrench size={14} />, onSelect: () => { navigate('/kit'); onClose() } },
    { id: 'nav-settings', label: 'Ir a Settings', sub: 'Configurar reglas de scoring', icon: <Settings size={14} />, onSelect: () => { navigate('/settings'); onClose() } },
  ]

  const q = query.toLowerCase()

  const filteredNav = q
    ? navItems.filter(n => n.label.toLowerCase().includes(q) || (n.sub ?? '').toLowerCase().includes(q))
    : navItems

  const leadItems: CommandItem[] = leads
    .filter(l =>
      !q ||
      l.business.name.toLowerCase().includes(q) ||
      l.business.sector.toLowerCase().includes(q) ||
      STATUS_LABELS[l.status as LeadStatus]?.toLowerCase().includes(q)
    )
    .slice(0, 8)
    .map(l => ({
      id: l.id,
      label: l.business.name,
      sub: `${l.business.sector} · ${STATUS_LABELS[l.status as LeadStatus] ?? l.status}`,
      score: l.score,
      onSelect: () => { navigate(`/propuestas?lead=${l.id}`); onClose() },
    }))

  const allItems = [...filteredNav, ...leadItems]

  useEffect(() => { setActiveIdx(0) }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      allItems[activeIdx]?.onSelect()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-24 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a2a]">
          <Search size={15} className="text-[#9ca3af] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar lead o navegar..."
            className="flex-1 bg-transparent text-sm text-white placeholder-[#4a4a4a] focus:outline-none"
          />
          <kbd className="text-[10px] text-[#4a4a4a] border border-[#2a2a2a] rounded px-1.5 py-0.5 font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {filteredNav.length > 0 && (
            <div>
              <p className="px-4 pt-2 pb-1 text-[10px] text-[#4a4a4a] font-semibold uppercase tracking-wider">
                Navegación
              </p>
              {filteredNav.map(item => {
                const idx = allItems.indexOf(item)
                return (
                  <button
                    key={item.id}
                    onClick={item.onSelect}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      idx === activeIdx ? 'bg-amber-500/15' : 'hover:bg-[#222]',
                    )}
                  >
                    <span className={cn('flex-shrink-0', idx === activeIdx ? 'text-amber-400' : 'text-[#4a4a4a]')}>
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium truncate', idx === activeIdx ? 'text-white' : 'text-[#9ca3af]')}>
                        {item.label}
                      </p>
                      {item.sub && <p className="text-xs text-[#4a4a4a] truncate">{item.sub}</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {leadItems.length > 0 && (
            <div>
              <p className="px-4 pt-2 pb-1 text-[10px] text-[#4a4a4a] font-semibold uppercase tracking-wider">
                Leads
              </p>
              {leadItems.map(item => {
                const idx = allItems.indexOf(item)
                return (
                  <button
                    key={item.id}
                    onClick={item.onSelect}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      idx === activeIdx ? 'bg-amber-500/15' : 'hover:bg-[#222]',
                    )}
                  >
                    {item.score !== undefined && <ScoreBadge score={item.score} size="sm" />}
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium truncate', idx === activeIdx ? 'text-white' : 'text-[#9ca3af]')}>
                        {item.label}
                      </p>
                      {item.sub && <p className="text-xs text-[#4a4a4a] truncate">{item.sub}</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {allItems.length === 0 && (
            <div className="py-10 text-center text-[#4a4a4a] text-sm">
              Sin resultados para "{query}"
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-[#2a2a2a] flex items-center gap-3 text-[10px] text-[#3a3a3a]">
          <span><kbd className="font-mono">↑↓</kbd> navegar</span>
          <span><kbd className="font-mono">↵</kbd> seleccionar</span>
          <span><kbd className="font-mono">ESC</kbd> cerrar</span>
        </div>
      </div>
    </div>
  )
}
