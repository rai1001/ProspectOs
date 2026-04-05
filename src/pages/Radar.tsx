import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Globe, Phone, Star, AlertCircle, Loader2, Flame } from 'lucide-react'
import { cn } from '../lib/cn'
import { ScoreBadge } from '../components/ScoreBadge'
import { SectorBadge } from '../components/SectorBadge'
import { toast } from '../components/Toast'
import { searchWithApify, searchWithApifyDeep, type ApifySearchResult, type ApifyReview } from '../utils/apify'
import { generateText } from '../utils/ai'
import { useAIProvider } from '../hooks/useAIProvider'
import { calculateScore } from '../utils/scoring'
import { useScoringRules } from '../hooks/useScoringRules'
import { useLeads } from '../hooks/useLeads'
import type { BusinessInsert } from '../lib/supabase'
import type { Sector } from '../constants/sectors'
import { SECTORS } from '../constants/sectors'

type Tab = 'apify' | 'dolor' | 'manual'

interface SearchResult {
  data: ApifySearchResult
  alreadyAdded?: boolean
  painAnalysis?: { has_complaints: boolean; summary: string }
}

export default function Radar() {
  const [tab, setTab] = useState<Tab>('apify')
  const [query, setQuery] = useState('')
  const [apifyToken, setApifyToken] = useState(() => localStorage.getItem('prospectOS_apify_token') ?? '')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [addingId, setAddingId] = useState<string | null>(null)

  const { rules } = useScoringRules()
  const { leads, addBusinessAndLead } = useLeads()
  const { provider, apiKey } = useAIProvider()
  const navigate = useNavigate()

  const [dolorQuery, setDolorQuery] = useState('')
  const [searchingDolor, setSearchingDolor] = useState(false)
  const [dolorProgress, setDolorProgress] = useState('')
  const [dolorResults, setDolorResults] = useState<SearchResult[]>([])

  const existingPlaceIds = new Set(leads.map(l => l.business.place_id).filter(Boolean))

  const handleSearch = async () => {
    if (!query.trim()) return
    if (!apifyToken) {
      toast.error('Introduce tu Apify API token primero')
      return
    }
    localStorage.setItem('prospectOS_apify_token', apifyToken)
    setSearching(true)
    setResults([])
    try {
      const items = await searchWithApify(query, apifyToken)
      setResults(items.map(item => ({
        data: item,
        alreadyAdded: Boolean(item.place_id && existingPlaceIds.has(item.place_id)),
      })))
      if (items.length === 0) {
        toast.info('No se encontraron resultados para esa búsqueda')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al buscar en Apify')
    } finally {
      setSearching(false)
    }
  }

  // ── Deep search + AI review analysis ───────────────────────────
  const handleDolorSearch = async () => {
    if (!dolorQuery.trim()) return
    if (!apifyToken) { toast.error('Introduce tu Apify API token primero'); return }
    if (!apiKey) { toast.error('Configura tu API key en Ajustes'); return }
    localStorage.setItem('prospectOS_apify_token', apifyToken)
    setSearchingDolor(true)
    setDolorResults([])
    setDolorProgress('Buscando negocios con reseñas...')

    try {
      const items = await searchWithApifyDeep(dolorQuery, apifyToken)
      if (items.length === 0) {
        toast.info('No se encontraron negocios con rating < 4.5')
        setSearchingDolor(false)
        return
      }

      setDolorProgress(`Analizando reseñas de ${items.length} negocios con IA...`)

      // Analyze reviews with AI in batches
      const analyzed: SearchResult[] = []
      for (const item of items) {
        const reviews = (item.reviews ?? []).filter((r: ApifyReview) => r.text)
        let painAnalysis = { has_complaints: false, summary: '' }

        if (reviews.length > 0) {
          const reviewText = reviews.map((r: ApifyReview) => `[${r.stars}★] ${r.text}`).join('\n')
          try {
            const aiResponse = await generateText({
              provider,
              apiKey,
              systemPrompt: `Analiza estas reseñas de un negocio local y devuelve SOLO un JSON válido (sin markdown):
{"has_complaints": boolean, "summary": "resumen de 1 línea en español de las quejas principales"}
Busca quejas sobre: atención al cliente mala, no cogen el teléfono, tardan en responder, esperas largas, trato descortés, reservas que fallan. Si no hay quejas claras, pon has_complaints: false.`,
              userPrompt: `Negocio: ${item.name}\nReseñas:\n${reviewText}`,
              maxTokens: 200,
            })

            let jsonStr = aiResponse.trim()
            if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
            painAnalysis = JSON.parse(jsonStr)
          } catch {
            // If AI fails for this one, continue
          }
        }

        analyzed.push({
          data: item,
          alreadyAdded: Boolean(item.place_id && existingPlaceIds.has(item.place_id)),
          painAnalysis,
        })
        setDolorProgress(`Analizado ${analyzed.length}/${items.length}...`)
      }

      // Sort: pain leads first
      analyzed.sort((a, b) => {
        if (a.painAnalysis?.has_complaints && !b.painAnalysis?.has_complaints) return -1
        if (!a.painAnalysis?.has_complaints && b.painAnalysis?.has_complaints) return 1
        return 0
      })

      setDolorResults(analyzed)
      const painCount = analyzed.filter(r => r.painAnalysis?.has_complaints).length
      toast.success(`Encontrados ${painCount} leads con quejas de ${analyzed.length} analizados`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error en la búsqueda profunda')
    } finally {
      setSearchingDolor(false)
      setDolorProgress('')
    }
  }

  const handleAddResult = async (result: SearchResult) => {
    const key = result.data.place_id ?? result.data.name
    setAddingId(key)
    const lead = await addBusinessAndLead(result.data as BusinessInsert)
    if (lead) {
      toast.success(`${result.data.name} añadido al pipeline`)
      setResults(prev => prev.map(r =>
        (r.data.place_id ?? r.data.name) === key
          ? { ...r, alreadyAdded: true }
          : r
      ))
    } else {
      toast.error('Error al añadir al pipeline')
    }
    setAddingId(null)
  }

  // Manual form state
  const [manual, setManual] = useState<Partial<BusinessInsert>>({
    sector: 'Restauración',
    source: 'manual',
    has_google_business: false,
    website_outdated: false,
  })
  const [submitting, setSubmitting] = useState(false)

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manual.name || !manual.sector) return
    setSubmitting(true)
    const lead = await addBusinessAndLead({ ...manual, source: 'manual' } as BusinessInsert)
    if (lead) {
      toast.success(`${manual.name} añadido al pipeline`)
      setManual({ sector: 'Restauración', source: 'manual', has_google_business: false, website_outdated: false })
    } else {
      toast.error('Error al añadir el negocio')
    }
    setSubmitting(false)
  }

  return (
    <div className="flex-1 p-4 md:p-6">
      <h1 className="text-lg font-mono font-semibold text-white mb-1">Radar</h1>
      <p className="text-sm text-[#9ca3af] mb-6">Busca negocios en A Coruña y añádelos al pipeline</p>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1a1a1a] rounded-lg p-1 w-fit mb-6 border border-[#2a2a2a]">
        {(['apify', 'dolor', 'manual'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5',
              tab === t
                ? 'bg-amber-500 text-black'
                : 'text-[#9ca3af] hover:text-white',
            )}
          >
            {t === 'dolor' && <Flame size={13} />}
            {t === 'apify' ? 'Búsqueda Apify' : t === 'dolor' ? 'Búsqueda Dolor' : 'Entrada manual'}
          </button>
        ))}
      </div>

      {tab === 'apify' && (
        <div>
          {/* API Token */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 mb-4">
            <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">Apify API Token</label>
            <input
              type="password"
              value={apifyToken}
              onChange={e => setApifyToken(e.target.value)}
              placeholder="apify_api_xxxxx"
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-amber-500"
            />
            <p className="text-xs text-[#9ca3af] mt-1.5 flex items-center gap-1">
              <AlertCircle size={12} />
              Coste aprox. €0.016 por búsqueda. Guardado localmente.
            </p>
          </div>

          {/* Search bar */}
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="restaurantes, peluquerías, talleres..."
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black font-medium text-sm rounded-lg px-4 py-2.5 transition-colors"
            >
              {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Buscar
            </button>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {results.map(result => {
                const key = result.data.place_id ?? result.data.name
                const score = calculateScore(result.data as any, rules)
                return (
                  <div
                    key={key}
                    className={cn(
                      'bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 border-l-4',
                      score >= 70 ? 'border-l-green-400' : score >= 40 ? 'border-l-amber-400' : 'border-l-zinc-600',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-white truncate">{result.data.name}</p>
                        <p className="text-xs text-[#9ca3af] truncate mt-0.5">{result.data.address}</p>
                      </div>
                      <ScoreBadge score={score} size="sm" />
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <SectorBadge sector={result.data.sector} />
                      {result.data.website
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs bg-blue-500/10 text-blue-300 border-blue-500/20"><Globe size={10} /> Web</span>
                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs bg-red-500/10 text-red-300 border-red-500/20">Sin web</span>
                      }
                      {result.data.google_rating && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs bg-yellow-500/10 text-yellow-300 border-yellow-500/20">
                          <Star size={10} /> {result.data.google_rating}
                        </span>
                      )}
                      {result.data.phone && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs bg-zinc-500/10 text-zinc-300 border-zinc-500/20">
                          <Phone size={10} /> {result.data.phone}
                        </span>
                      )}
                    </div>

                    {result.alreadyAdded ? (
                      <span className="inline-block text-xs text-amber-400 font-medium">Ya en pipeline</span>
                    ) : (
                      <button
                        onClick={() => handleAddResult(result)}
                        disabled={addingId === key}
                        className="w-full flex items-center justify-center gap-1.5 bg-[#2a2a2a] hover:bg-[#333] text-white text-xs font-medium rounded px-3 py-1.5 transition-colors disabled:opacity-40"
                      >
                        {addingId === key
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Plus size={12} />
                        }
                        Añadir al pipeline
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {!searching && results.length === 0 && query && (
            <div className="text-center py-16 text-[#9ca3af]">
              <Search size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Sin resultados. Prueba con otro término de búsqueda.</p>
            </div>
          )}

          {!query && !searching && results.length === 0 && (
            <div className="text-center py-16 text-[#9ca3af]">
              <Search size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium text-white mb-1">Busca negocios en A Coruña</p>
              <p className="text-xs">Ejemplos: "restaurantes", "peluquerías", "talleres mecánicos"</p>
            </div>
          )}
        </div>
      )}

      {/* ── Dolor (Deep) tab ────────────────────────────────────── */}
      {tab === 'dolor' && (
        <div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 mb-4">
            <p className="text-xs text-amber-400 mb-2 flex items-center gap-1.5">
              <Flame size={12} /> Búsqueda profunda: extrae reseñas recientes y detecta negocios con quejas de atención al cliente.
            </p>
            <p className="text-[10px] text-[#9ca3af] mb-3">
              Coste mayor (~€0.05/búsqueda). Filtra automáticamente a negocios con rating {'<'} 4.5. Análisis con {provider.toUpperCase()}.
            </p>
            <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">Apify API Token</label>
            <input
              type="password"
              value={apifyToken}
              onChange={e => setApifyToken(e.target.value)}
              placeholder="apify_api_xxxxx"
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-amber-500 mb-3"
            />
          </div>

          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={dolorQuery}
              onChange={e => setDolorQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDolorSearch()}
              placeholder="restaurantes, clínicas, talleres..."
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleDolorSearch}
              disabled={searchingDolor || !dolorQuery.trim()}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors"
            >
              {searchingDolor ? <Loader2 size={16} className="animate-spin" /> : <Flame size={16} />}
              Buscar dolor
            </button>
          </div>

          {searchingDolor && dolorProgress && (
            <div className="flex items-center gap-2 mb-4 text-sm text-amber-400">
              <Loader2 size={14} className="animate-spin" /> {dolorProgress}
            </div>
          )}

          {dolorResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {dolorResults.map(result => {
                const key = result.data.place_id ?? result.data.name
                const score = calculateScore(result.data as any, rules)
                const isPain = result.painAnalysis?.has_complaints
                return (
                  <div
                    key={key}
                    className={cn(
                      'bg-[#1a1a1a] border rounded-lg p-4 border-l-4',
                      isPain
                        ? 'border-red-500 border-l-red-500 animate-pulse-slow'
                        : 'border-[#2a2a2a] border-l-zinc-600',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-white truncate flex items-center gap-1">
                          {isPain && <Flame size={12} className="text-red-400 flex-shrink-0" />}
                          {result.data.name}
                        </p>
                        <p className="text-xs text-[#9ca3af] truncate mt-0.5">{result.data.address}</p>
                      </div>
                      <ScoreBadge score={score} size="sm" />
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <SectorBadge sector={result.data.sector} />
                      {result.data.google_rating && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs bg-yellow-500/10 text-yellow-300 border-yellow-500/20">
                          <Star size={10} /> {result.data.google_rating}
                        </span>
                      )}
                    </div>

                    {isPain && result.painAnalysis?.summary && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded px-3 py-2 mb-3">
                        <p className="text-[10px] text-red-300 uppercase tracking-wider mb-0.5">Quejas detectadas</p>
                        <p className="text-xs text-red-200">{result.painAnalysis.summary}</p>
                      </div>
                    )}

                    {result.alreadyAdded ? (
                      <span className="inline-block text-xs text-amber-400 font-medium">Ya en pipeline</span>
                    ) : (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleAddResult(result)}
                          disabled={addingId === key}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded px-3 py-1.5 transition-colors disabled:opacity-40',
                            isPain
                              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30'
                              : 'bg-[#2a2a2a] hover:bg-[#333] text-white',
                          )}
                        >
                          {addingId === key ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                          Añadir
                        </button>
                        {isPain && (
                          <button
                            disabled={addingId === key}
                            onClick={async () => {
                              const lead = await addBusinessAndLead(result.data as BusinessInsert)
                              if (lead) {
                                setDolorResults(prev => prev.map(r =>
                                  (r.data.place_id ?? r.data.name) === key ? { ...r, alreadyAdded: true } : r
                                ))
                                navigate(`/kit?lead=${lead.id}&auto=agent`)
                              } else {
                                toast.error('Error al añadir al pipeline')
                              }
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded px-3 py-1.5 transition-colors disabled:opacity-40 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
                          >
                            <Flame size={12} /> + Kit
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {!searchingDolor && dolorResults.length === 0 && !dolorQuery && (
            <div className="text-center py-16 text-[#9ca3af]">
              <Flame size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium text-white mb-1">Detecta negocios que necesitan ayuda urgente</p>
              <p className="text-xs">Busca por sector y la IA analizará las reseñas para encontrar quejas de atención</p>
            </div>
          )}
        </div>
      )}

      {tab === 'manual' && (
        <form onSubmit={handleManualAdd} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 max-w-xl">
          <h2 className="text-sm font-mono font-semibold text-white mb-5">Añadir negocio manualmente</h2>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">Nombre del negocio *</label>
              <input
                type="text"
                value={manual.name ?? ''}
                onChange={e => setManual(p => ({ ...p, name: e.target.value }))}
                required
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">Sector *</label>
              <select
                value={manual.sector ?? 'Restauración'}
                onChange={e => setManual(p => ({ ...p, sector: e.target.value as Sector }))}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {SECTORS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">Dirección</label>
              <input
                type="text"
                value={manual.address ?? ''}
                onChange={e => setManual(p => ({ ...p, address: e.target.value }))}
                placeholder="Calle Mayor 1, A Coruña"
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">Teléfono fijo</label>
                <input
                  type="tel"
                  value={manual.phone ?? ''}
                  onChange={e => setManual(p => ({ ...p, phone: e.target.value }))}
                  placeholder="981 000 000"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">Teléfono móvil</label>
                <input
                  type="tel"
                  value={manual.mobile_phone ?? ''}
                  onChange={e => setManual(p => ({ ...p, mobile_phone: e.target.value }))}
                  placeholder="600 000 000"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">URL web</label>
              <input
                type="url"
                value={manual.website ?? ''}
                onChange={e => setManual(p => ({ ...p, website: e.target.value }))}
                placeholder="https://..."
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">Rating Google</label>
                <input
                  type="number"
                  min={1} max={5} step={0.1}
                  value={manual.google_rating ?? ''}
                  onChange={e => setManual(p => ({ ...p, google_rating: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="4.2"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">Nº reseñas</label>
                <input
                  type="number"
                  min={0}
                  value={manual.review_count ?? ''}
                  onChange={e => setManual(p => ({ ...p, review_count: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="45"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-[#9ca3af]">
                <input
                  type="checkbox"
                  checked={manual.has_google_business ?? false}
                  onChange={e => setManual(p => ({ ...p, has_google_business: e.target.checked }))}
                  className="accent-amber-500"
                />
                Tiene Google Business
              </label>
              {manual.website && (
                <label className="flex items-center gap-2 cursor-pointer text-sm text-[#9ca3af]">
                  <input
                    type="checkbox"
                    checked={manual.website_outdated ?? false}
                    onChange={e => setManual(p => ({ ...p, website_outdated: e.target.checked }))}
                    className="accent-amber-500"
                  />
                  Web desactualizada
                </label>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !manual.name}
            className="mt-5 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black font-medium text-sm rounded-lg px-5 py-2.5 transition-colors"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Añadir al pipeline
          </button>
        </form>
      )}
    </div>
  )
}
