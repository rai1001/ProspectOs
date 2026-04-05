import { useState } from 'react'
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '../lib/cn'
import { toast } from '../components/Toast'
import { useScoringRules } from '../hooks/useScoringRules'
import { useLeads } from '../hooks/useLeads'
import { useAIProvider } from '../hooks/useAIProvider'
import { type AIProvider, PROVIDER_LABELS } from '../utils/ai'

const PROVIDERS: { id: AIProvider; label: string; model: string; free: boolean }[] = [
  { id: 'groq',   label: 'Groq',   model: 'llama-3.3-70b',    free: true  },
  { id: 'gemini', label: 'Gemini', model: 'gemini-2.0-flash',  free: true  },
  { id: 'openai', label: 'OpenAI', model: 'gpt-4o-mini',       free: false },
  { id: 'claude', label: 'Claude', model: 'haiku-3.5',         free: false },
]

const KEY_PLACEHOLDERS: Record<AIProvider, string> = {
  groq:   'gsk_xxxxx',
  gemini: 'AIzaSy...',
  openai: 'sk-xxxxx',
  claude: 'sk-ant-xxxxx',
}

const KEY_LINKS: Record<AIProvider, string> = {
  groq:   'console.groq.com/keys',
  gemini: 'aistudio.google.com/app/apikey',
  openai: 'platform.openai.com/api-keys',
  claude: 'console.anthropic.com/settings/keys',
}

export default function Settings() {
  const { rules, loading, toggleRule, updatePoints } = useScoringRules()
  const { recalculateScores } = useLeads()
  const { provider, setProvider, apiKey, setApiKey } = useAIProvider()
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
      <p className="text-sm text-[#9ca3af] mb-6">Proveedor de IA y reglas de scoring del pipeline</p>

      {/* ── AI Provider ─────────────────────────────────────────── */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg mb-4">
        <div className="px-4 py-3 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-mono font-semibold text-white">Proveedor de IA</h2>
          <p className="text-xs text-[#9ca3af] mt-0.5">Modelo usado en Propuestas y Kit Generator</p>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                className={cn(
                  'flex flex-col items-start rounded-lg px-3 py-2.5 border text-left transition-colors',
                  provider === p.id
                    ? 'bg-amber-500/15 border-amber-500/40'
                    : 'bg-[#0f0f0f] border-[#2a2a2a] hover:border-[#3a3a3a]',
                )}
              >
                <span className={cn('text-sm font-medium', provider === p.id ? 'text-amber-400' : 'text-white')}>
                  {p.label}
                </span>
                <span className="text-[10px] text-[#9ca3af] font-mono">{p.model}</span>
                {p.free && <span className="text-[9px] text-green-400 mt-0.5">gratuito</span>}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">
              API Key · {PROVIDER_LABELS[provider]}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={KEY_PLACEHOLDERS[provider]}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-amber-500"
            />
            {apiKey ? (
              <p className="text-xs text-green-400 mt-1.5 flex items-center gap-1">
                <CheckCircle2 size={11} /> Key configurada
              </p>
            ) : (
              <p className="text-xs text-[#9ca3af] mt-1.5">
                Obtén tu key en{' '}
                <a
                  href={`https://${KEY_LINKS[provider]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline"
                >
                  {KEY_LINKS[provider]}
                </a>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Scoring rules ────────────────────────────────────────── */}
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
                    <button onClick={() => handlePointsSave(rule.id)} className="text-xs text-amber-400 hover:text-amber-300 px-1">OK</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-[#9ca3af] hover:text-white px-1">✕</button>
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

      {/* ── Agency Phone ─────────────────────────────────────────── */}
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
