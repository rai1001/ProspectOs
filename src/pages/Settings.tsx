import { useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { cn } from '../lib/cn'
import { toast } from '../components/Toast'
import { useScoringRules } from '../hooks/useScoringRules'
import { useLeads } from '../hooks/useLeads'

export default function Settings() {
  const { rules, loading, toggleRule, updatePoints } = useScoringRules()
  const { recalculateScores } = useLeads()
  const [recalculating, setRecalculating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPoints, setEditPoints] = useState<number>(0)
  const [agencyPhone, setAgencyPhone] = useState(() => localStorage.getItem('prospectOS_agency_phone') ?? '')

  const handleRecalculate = async () => {
    setRecalculating(true)
    await recalculateScores()
    toast.success('Scores recalculados')
    setRecalculating(false)
  }

  const handlePointsSave = async (id: string) => {
    await updatePoints(id, editPoints)
    setEditingId(null)
    toast.success('Puntos actualizados')
  }

  return (
    <div className="flex-1 p-6 max-w-xl">
      <h1 className="text-lg font-mono font-semibold text-white mb-1">Ajustes</h1>
      <p className="text-sm text-[#9ca3af] mb-6">Configura las reglas de scoring del pipeline</p>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg mb-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-mono font-semibold text-white">Reglas de scoring</h2>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-amber-400 transition-colors"
          >
            {recalculating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Recalcular todos
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-amber-500" />
          </div>
        ) : (
          <div className="divide-y divide-[#2a2a2a]">
            {rules.map(rule => (
              <div key={rule.id} className="flex items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={rule.enabled ?? false}
                  onChange={e => toggleRule(rule.id, e.target.checked)}
                  className="accent-amber-500 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm', rule.enabled ? 'text-white' : 'text-[#9ca3af]')}>
                    {rule.description}
                  </p>
                  <p className="text-xs text-[#9ca3af] font-mono">{rule.condition}</p>
                </div>
                {editingId === rule.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={editPoints}
                      onChange={e => setEditPoints(Number(e.target.value))}
                      className="w-16 bg-[#0f0f0f] border border-amber-500 rounded px-2 py-1 text-xs text-white text-center focus:outline-none"
                    />
                    <button
                      onClick={() => handlePointsSave(rule.id)}
                      className="text-xs text-amber-400 hover:text-amber-300 px-1"
                    >
                      OK
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-[#9ca3af] hover:text-white px-1"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingId(rule.id); setEditPoints(rule.points) }}
                    className={cn(
                      'text-xs font-mono font-semibold px-2 py-0.5 rounded border transition-colors',
                      rule.enabled
                        ? 'text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
                        : 'text-[#9ca3af] border-[#2a2a2a]',
                    )}
                  >
                    +{rule.points}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-[#9ca3af] mb-8">
        Los cambios en las reglas no afectan scores existentes hasta que pulses "Recalcular todos".
      </p>

      {/* Agency Phone */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
        <h2 className="text-sm font-mono font-semibold text-white mb-1">Teléfono de agencia</h2>
        <p className="text-xs text-[#9ca3af] mb-3">
          Número de WhatsApp para el botón CTA en los kits compartidos (/share). Formato internacional (ej: 34612345678).
        </p>
        <input
          type="tel"
          value={agencyPhone}
          onChange={e => {
            setAgencyPhone(e.target.value)
            localStorage.setItem('prospectOS_agency_phone', e.target.value)
          }}
          placeholder="34612345678"
          className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-amber-500"
        />
      </div>
    </div>
  )
}
