import { NavLink } from 'react-router-dom'
import { Radar, Columns3, FileText, Settings, Search, Wrench, MessageSquare } from 'lucide-react'
import { cn } from '../lib/cn'

const NAV = [
  { to: '/radar', icon: Radar, label: 'Radar' },
  { to: '/pipeline', icon: Columns3, label: 'Pipeline' },
  { to: '/propuestas', icon: FileText, label: 'Propuestas' },
  { to: '/kit', icon: Wrench, label: 'Kit Generator' },
  { to: '/reseabot', icon: MessageSquare, label: 'ReseaBot' },
]

export function Sidebar({ onOpenCmd }: { onOpenCmd?: () => void }) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-16 md:w-56 flex flex-col bg-surface border-r border-[#2a2a2a] z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#2a2a2a]">
        <div className="w-7 h-7 rounded bg-amber-500 flex items-center justify-center flex-shrink-0">
          <span className="text-black font-mono font-bold text-sm">P</span>
        </div>
        <span className="hidden md:block font-mono font-semibold text-sm text-text-primary tracking-tight">
          ProspectOS
        </span>
      </div>

      {/* Search / Cmd+K */}
      <div className="px-2 pt-3 pb-1">
        <button
          onClick={onOpenCmd}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-[#111] border border-[#2a2a2a] text-[#4a4a4a] hover:border-[#3a3a3a] hover:text-[#9ca3af] transition-colors text-xs"
        >
          <Search size={13} className="flex-shrink-0" />
          <span className="hidden md:block flex-1 text-left">Buscar...</span>
          <kbd className="hidden md:block font-mono text-[10px] border border-[#2a2a2a] rounded px-1">⌘K</kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md mb-1 transition-colors text-sm font-medium',
                isActive
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                  : 'text-text-secondary hover:text-text-primary hover:bg-[#2a2a2a]',
              )
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            <span className="hidden md:block">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-[#2a2a2a]">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium',
              isActive
                ? 'bg-amber-500/15 text-amber-400'
                : 'text-text-secondary hover:text-text-primary hover:bg-[#2a2a2a]',
            )
          }
        >
          <Settings size={18} className="flex-shrink-0" />
          <span className="hidden md:block">Ajustes</span>
        </NavLink>
      </div>
    </aside>
  )
}
