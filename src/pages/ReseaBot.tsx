import { useState, useMemo } from 'react'
import { Search, Star, MessageSquare, Send, Loader2, Phone, MapPin, Filter } from 'lucide-react'
import { cn } from '../lib/cn'
import { ScoreBadge } from '../components/ScoreBadge'
import { SectorBadge } from '../components/SectorBadge'
import { toast } from '../components/Toast'
import { searchWithApifyDeep, type ApifySearchResult, type ApifyReview } from '../utils/apify'
import { generateText } from '../utils/ai'
import { useAIProvider } from '../hooks/useAIProvider'
import { calculateScore } from '../utils/scoring'
import { useScoringRules } from '../hooks/useScoringRules'
import { useLeads } from '../hooks/useLeads'
import type { BusinessInsert } from '../lib/supabase'

const RESEABOT_SECTORS = ['Restauración', 'Hostelería', 'Peluquería / Estética', 'Clínica / Salud'] as const
const RESEABOT_SUPABASE_URL = 'https://sxxxfbdkhvpqssfoiiqs.supabase.co'
const RESEABOT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4eHhmYmRraHZwcXNzZm9paXFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NDEzMTEsImV4cCI6MjA5MTUxNzMxMX0.4CJ1KmWIKBAsgHmANFYSQKpkQoW51kpNzGhBeG0uE3U'

const QUICK_SEARCHES = [
  { label: 'Restaurantes A Coruña', query: 'restaurantes A Coruña' },
  { label: 'Peluquerías A Coruña', query: 'peluquerías A Coruña' },
  { label: 'Clínicas dentales A Coruña', query: 'clínicas dentales A Coruña' },
  { label: 'Bares y cafeterías A Coruña', query: 'bares cafeterías A Coruña' },
  { label: 'Centros estética A Coruña', query: 'centros estética A Coruña' },
]

type SectorFilter = typeof RESEABOT_SECTORS[number] | 'all'

interface SearchResult {
  data: ApifySearchResult
  alreadyInPipeline?: boolean
  sentToReseaBot?: boolean
  reviewAnalysis?: {
    unanswered_pct: number
    summary: string
    sample_reviews: { stars: number; text: string }[]
  }
}

function mapSectorToBusinessType(sector: string): string {
  switch (sector) {
    case 'Restauración': return 'restaurante'
    case 'Hostelería': return 'restaurante'
    case 'Peluquería / Estética': return 'peluqueria'
    case 'Clínica / Salud': return 'clinica'
    default: return 'otro'
  }
}

async function sendToReseaBot(result: SearchResult): Promise<boolean> {
  const d = result.data
  const body = {
    business_name: d.name,
    business_type: mapSectorToBusinessType(d.sector ?? ''),
    google_maps_url: d.place_id ? `https://www.google.com/maps/place/?q=place_id:${d.place_id}` : null,
    city: 'A Coruña',
    contact_phone: d.phone ?? d.mobile_phone ?? null,
    reviews_count: d.review_count ?? null,
    avg_rating: d.google_rating ?? null,
    has_unanswered: (d.response_rate !== undefined && d.response_rate !== null) ? d.response_rate < 50 : true,
    status: 'pending',
    source: 'prospectos',
    reviews_sample: result.reviewAnalysis?.sample_reviews ?? null,
  }

  const res = await fetch(`${RESEABOT_SUPABASE_URL}/rest/v1/rb_prospects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': RESEABOT_ANON_KEY,
      'Authorization': `Bearer ${RESEABOT_ANON_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(body),
  })
  return res.ok
}

export default function ReseaBot() {
  const [query, setQuery] = useState('')
  const [apifyToken, setApifyToken] = useState(() => localStorage.getItem('prospectOS_apify_token') ?? '')
  const [searching, setSearching] = useState(false)
  const [progress, setProgress] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>('all')

  const { rules } = useScoringRules()
  const { leads, addBusinessAndLead } = useLeads()
  const { provider, apiKey } = useAIProvider()

  const existingPlaceIds = new Set(leads.map(l => l.business.place_id).filter(Boolean))

  // Pipeline leads filtered to ReseaBot sectors
  const reseabotLeads = useMemo(() =>
    leads.filter(l => RESEABOT_SECTORS.includes(l.business.sector as any)),
    [leads],
  )

  const filteredResults = useMemo(() =>
    sectorFilter === 'all'
      ? results
      : results.filter(r => r.data.sector === sectorFilter),
    [results, sectorFilter],
  )

  const handleSearch = async () => {
    if (!query.trim()) return
    if (!apifyToken) { toast.error('Introduce tu Apify API token en Ajustes > Radar'); return }
    localStorage.setItem('prospectOS_apify_token', apifyToken)
    setSearching(true)
    setResults([])
    setProgress('Buscando negocios con reseñas...')

    try {
      const items = await searchWithApifyDeep(query, apifyToken)
      if (items.length === 0) {
        toast.info('No se encontraron resultados')
        return
      }

      setProgress(`Analizando reseñas de ${items.length} negocios...`)
      const analyzed: SearchResult[] = []

      for (const item of items) {
        const reviews = (item.reviews ?? []).filter((r: ApifyReview) => r.text)
        let reviewAnalysis: SearchResult['reviewAnalysis'] = undefined

        if (reviews.length > 0 && apiKey) {
          const ownerReplies = reviews.filter((r: ApifyReview) => r.responseFromOwnerText).length
          const unanswered_pct = Math.round(((reviews.length - ownerReplies) / reviews.length) * 100)
          const sample_reviews = reviews.slice(0, 3).map((r: ApifyReview) => ({ stars: r.stars ?? 0, text: (r.text ?? '').slice(0, 200) }))

          let summary = ''
          try {
            summary = await generateText({
              provider,
              apiKey,
              systemPrompt: `Eres un analista de reseñas. Analiza las reseñas y da un resumen de 1 línea en español sobre el estado de las reseñas: si responden o no, tono general, quejas principales. Max 100 caracteres.`,
              userPrompt: `Negocio: ${item.name}\n${reviews.map((r: ApifyReview) => `[${r.stars}★${r.responseFromOwnerText ? ' RESPONDIDA' : ''}] ${r.text}`).join('\n')}`,
              maxTokens: 100,
            })
          } catch { /* continue without summary */ }

          reviewAnalysis = { unanswered_pct, summary: summary.trim(), sample_reviews }
        }

        analyzed.push({
          data: item,
          alreadyInPipeline: Boolean(item.place_id && existingPlaceIds.has(item.place_id)),
          reviewAnalysis,
        })
        setProgress(`Analizado ${analyzed.length}/${items.length}...`)
      }

      // Sort: most unanswered reviews first
      analyzed.sort((a, b) => {
        const aUn = a.reviewAnalysis?.unanswered_pct ?? 0
        const bUn = b.reviewAnalysis?.unanswered_pct ?? 0
        return bUn - aUn
      })

      setResults(analyzed)
      const highUnanswered = analyzed.filter(r => (r.reviewAnalysis?.unanswered_pct ?? 0) >= 50).length
      toast.success(`${highUnanswered} de ${analyzed.length} negocios con >50% reseñas sin responder`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error en la búsqueda')
    } finally {
      setSearching(false)
      setProgress('')
    }
  }

  const handleSendToReseaBot = async (result: SearchResult) => {
    const key = result.data.place_id ?? result.data.name
    setSendingId(key)
    try {
      const ok = await sendToReseaBot(result)
      if (ok) {
        toast.success(`${result.data.name} enviado a ReseaBot`)
        setResults(prev => prev.map(r =>
          (r.data.place_id ?? r.data.name) === key ? { ...r, sentToReseaBot: true } : r
        ))
      } else {
        toast.error('Error al enviar a ReseaBot')
      }
    } catch {
      toast.error('Error de conexión con ReseaBot')
    }
    setSendingId(null)
  }

  const handleAddToPipeline = async (result: SearchResult) => {
    const key = result.data.place_id ?? result.data.name
    setSendingId(key)
    const lead = await addBusinessAndLead(result.data as BusinessInsert)
    if (lead) {
      toast.success(`${result.data.name} añadido al pipeline`)
      setResults(prev => prev.map(r =>
        (r.data.place_id ?? r.data.name) === key ? { ...r, alreadyInPipeline: true } : r
      ))
    }
    setSendingId(null)
  }

  return (
    <div className="flex-1 p-4 md:p-6">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-lg font-mono font-semibold text-white">ReseaBot</h1>
        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium">
          Prospección
        </span>
      </div>
      <p className="text-sm text-[#9ca3af] mb-6">
        Encuentra negocios con reseñas sin responder para ReseaBot
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
          <p className="text-xs text-[#9ca3af]">En pipeline (sectores RB)</p>
          <p className="text-xl font-mono font-bold text-white">{reseabotLeads.length}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
          <p className="text-xs text-[#9ca3af]">Restaurantes</p>
          <p className="text-xl font-mono font-bold text-orange-400">
            {reseabotLeads.filter(l => l.business.sector === 'Restauración' || l.business.sector === 'Hostelería').length}
          </p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
          <p className="text-xs text-[#9ca3af]">Peluquerías</p>
          <p className="text-xl font-mono font-bold text-pink-400">
            {reseabotLeads.filter(l => l.business.sector === 'Peluquería / Estética').length}
          </p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
          <p className="text-xs text-[#9ca3af]">Clínicas</p>
          <p className="text-xl font-mono font-bold text-blue-400">
            {reseabotLeads.filter(l => l.business.sector === 'Clínica / Salud').length}
          </p>
        </div>
      </div>

      {/* Apify Token */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 mb-4">
        <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">Apify API Token</label>
        <input
          type="password"
          value={apifyToken}
          onChange={e => setApifyToken(e.target.value)}
          placeholder="apify_api_xxxxx"
          className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Quick searches */}
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_SEARCHES.map(qs => (
          <button
            key={qs.query}
            onClick={() => { setQuery(qs.query); }}
            className="px-3 py-1.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-[#9ca3af] hover:text-indigo-300 hover:border-indigo-500/30 transition-colors"
          >
            {qs.label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="restaurantes A Coruña, peluquerías Arteixo..."
          className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors"
        >
          {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Buscar
        </button>
      </div>

      {/* Progress */}
      {progress && (
        <div className="flex items-center gap-2 text-xs text-indigo-300 mb-4">
          <Loader2 size={12} className="animate-spin" />
          {progress}
        </div>
      )}

      {/* Sector filter */}
      {results.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Filter size={14} className="text-[#9ca3af]" />
          <div className="flex gap-1">
            <button
              onClick={() => setSectorFilter('all')}
              className={cn(
                'px-3 py-1 rounded text-xs font-medium transition-colors',
                sectorFilter === 'all' ? 'bg-indigo-500/20 text-indigo-300' : 'text-[#9ca3af] hover:text-white',
              )}
            >
              Todos ({results.length})
            </button>
            {RESEABOT_SECTORS.map(s => {
              const count = results.filter(r => r.data.sector === s).length
              if (count === 0) return null
              return (
                <button
                  key={s}
                  onClick={() => setSectorFilter(s)}
                  className={cn(
                    'px-3 py-1 rounded text-xs font-medium transition-colors',
                    sectorFilter === s ? 'bg-indigo-500/20 text-indigo-300' : 'text-[#9ca3af] hover:text-white',
                  )}
                >
                  {s.split(' /')[0]} ({count})
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Results grid */}
      {filteredResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredResults.map(result => {
            const key = result.data.place_id ?? result.data.name
            const score = calculateScore(result.data as any, rules)
            const unanswered = result.reviewAnalysis?.unanswered_pct ?? null
            const isSending = sendingId === key

            return (
              <div
                key={key}
                className={cn(
                  'bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 border-l-4',
                  unanswered !== null && unanswered >= 70
                    ? 'border-l-red-400'
                    : unanswered !== null && unanswered >= 40
                      ? 'border-l-amber-400'
                      : 'border-l-green-400',
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-white truncate">{result.data.name}</p>
                    <p className="text-xs text-[#9ca3af] truncate mt-0.5 flex items-center gap-1">
                      <MapPin size={10} /> {result.data.address}
                    </p>
                  </div>
                  <ScoreBadge score={score} size="sm" />
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <SectorBadge sector={result.data.sector} />
                  {result.data.google_rating && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs bg-yellow-500/10 text-yellow-300 border-yellow-500/20">
                      <Star size={10} /> {result.data.google_rating} ({result.data.review_count ?? '?'})
                    </span>
                  )}
                  {result.data.phone && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs bg-zinc-500/10 text-zinc-300 border-zinc-500/20">
                      <Phone size={10} /> {result.data.phone}
                    </span>
                  )}
                </div>

                {/* Review analysis */}
                {unanswered !== null && (
                  <div className={cn(
                    'rounded p-2.5 mb-3 border',
                    unanswered >= 70
                      ? 'bg-red-500/5 border-red-500/20'
                      : unanswered >= 40
                        ? 'bg-amber-500/5 border-amber-500/20'
                        : 'bg-green-500/5 border-green-500/20',
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[#9ca3af] flex items-center gap-1">
                        <MessageSquare size={11} /> Reseñas sin responder
                      </span>
                      <span className={cn(
                        'text-sm font-mono font-bold',
                        unanswered >= 70 ? 'text-red-400' : unanswered >= 40 ? 'text-amber-400' : 'text-green-400',
                      )}>
                        {unanswered}%
                      </span>
                    </div>
                    {result.reviewAnalysis?.summary && (
                      <p className="text-xs text-[#9ca3af] italic">{result.reviewAnalysis.summary}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {result.sentToReseaBot ? (
                    <span className="flex-1 text-center text-xs text-indigo-400 font-medium py-1.5">
                      Enviado a ReseaBot
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSendToReseaBot(result)}
                      disabled={isSending}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium rounded px-3 py-1.5 transition-colors disabled:opacity-40"
                    >
                      {isSending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      Enviar a ReseaBot
                    </button>
                  )}
                  {!result.alreadyInPipeline && (
                    <button
                      onClick={() => handleAddToPipeline(result)}
                      disabled={isSending}
                      className="flex items-center justify-center gap-1.5 bg-[#2a2a2a] hover:bg-[#333] text-white text-xs font-medium rounded px-3 py-1.5 transition-colors disabled:opacity-40"
                    >
                      + Pipeline
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty states */}
      {!searching && results.length === 0 && (
        <div className="text-center py-16 text-[#9ca3af]">
          <MessageSquare size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium text-white mb-1">Encuentra leads para ReseaBot</p>
          <p className="text-xs mb-3">Busca negocios con reseñas de Google sin responder</p>
          <p className="text-xs text-[#4a4a4a]">
            Usa las búsquedas rápidas arriba o escribe tu propia búsqueda
          </p>
        </div>
      )}

      {/* Existing ReseaBot-sector leads from pipeline */}
      {reseabotLeads.length > 0 && results.length === 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-mono font-semibold text-white mb-3 flex items-center gap-2">
            En pipeline (sectores ReseaBot)
            <span className="text-xs font-normal text-[#9ca3af]">{reseabotLeads.length} negocios</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {reseabotLeads.slice(0, 12).map(lead => (
              <div key={lead.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-white truncate">{lead.business.name}</p>
                    <p className="text-xs text-[#9ca3af] truncate">{lead.business.address}</p>
                  </div>
                  <ScoreBadge score={lead.score ?? 0} size="sm" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <SectorBadge sector={lead.business.sector} />
                  {lead.business.google_rating && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs bg-yellow-500/10 text-yellow-300 border-yellow-500/20">
                      <Star size={10} /> {lead.business.google_rating}
                    </span>
                  )}
                  <span className={cn(
                    'px-2 py-0.5 rounded border text-xs',
                    lead.status === 'nuevo' ? 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20' :
                    lead.status === 'contactado' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' :
                    lead.status === 'interesado' ? 'bg-green-500/10 text-green-300 border-green-500/20' :
                    'bg-amber-500/10 text-amber-300 border-amber-500/20',
                  )}>
                    {lead.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
