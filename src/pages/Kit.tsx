import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Loader2, Copy, Download, Share2, AlertCircle, CheckCircle2, Wrench, Globe,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { ScoreBadge } from '../components/ScoreBadge'
import { SectorBadge } from '../components/SectorBadge'
import { toast } from '../components/Toast'
import { useLeads, type LeadWithBusiness } from '../hooks/useLeads'
import { supabase, type ImplementationKit } from '../lib/supabase'
import type { Json as SupabaseJson } from '../types/database'
import { useAIProvider } from '../hooks/useAIProvider'
import { generateText, PROVIDER_LABELS } from '../utils/ai'

type TabKey = 'agent' | 'web'
type Json = Record<string, unknown>  // local alias for kit content shaping

const TABS: { key: TabKey; label: string; icon: typeof Wrench }[] = [
  { key: 'agent', label: 'Agente IA', icon: Wrench },
  { key: 'web', label: 'Página Web', icon: Globe },
]

const AGENT_SYSTEM_PROMPT = `Eres un arquitecto de automatización especializado en agentes IA para negocios locales en España.
Genera un kit de implementación en JSON válido con esta estructura exacta:
{
  "platform": "n8n",
  "workflow_json": { "nodes": [...], "connections": {}, "settings": { "executionOrder": "v1" } },
  "make_blueprint_json": { "flow": [...], "metadata": {} },
  "system_prompt": "Prompt del agente para el negocio...",
  "client_summary": {
    "business_name": "...",
    "headline": "...",
    "what_it_does": "...",
    "what_they_need_to_do": "Nada técnico — nosotros lo configuramos todo",
    "cta": "Quiero empezar"
  }
}
Responde SOLO con el JSON, sin explicaciones ni markdown.`

const WEB_SYSTEM_PROMPT = `Eres un diseñador web especializado en negocios locales en España.
Genera un kit de diseño web en JSON válido con esta estructura exacta:
{
  "style": {
    "palette": ["#hex1", "#hex2", "#hex3"],
    "typography": { "heading": "...", "body": "..." },
    "sections": ["hero", "servicios", "galeria", "contacto", "ubicacion"]
  },
  "antigravity_brief": "Brief completo para crear la web en Antigravity...",
  "freepik_keywords": ["keyword1", "keyword2", "keyword3"],
  "client_summary": {
    "business_name": "...",
    "headline": "...",
    "what_it_does": "...",
    "cta": "Ver borrador"
  }
}
Responde SOLO con el JSON, sin explicaciones ni markdown.`

function buildKitPrompt(lead: LeadWithBusiness, tab: TabKey, ragContext: string): string {
  const b = lead.business
  const webStatus = b.website ? `Tiene web: ${b.website}` : 'No tiene página web'
  const ratingLine = b.google_rating != null
    ? `Rating Google: ${b.google_rating} (${b.review_count ?? '?'} reseñas)`
    : 'Rating Google: desconocido'

  const ragSection = ragContext
    ? `\n\nTemplates de referencia para este sector:\n${ragContext}`
    : ''

  return `Genera un kit de ${tab === 'agent' ? 'agente IA (n8n + Make)' : 'página web (Antigravity + Freepik)'} para:

Nombre: ${b.name}
Sector: ${b.sector}
Dirección: ${b.address ?? 'desconocida'}
${webStatus}
${ratingLine}
Teléfono: ${b.phone ?? 'desconocido'}
Notas: ${lead.notes || 'sin notas'}${ragSection}`
}

// Direct sector/category filtering (Groq removed embedding models as of 2026-04)
// When an embedding provider is available, switch back to match_knowledge_base RPC
async function queryRAG(sector: string, category: string): Promise<string> {
  const { data } = await supabase
    .from('knowledge_base')
    .select('id, title, content')
    .eq('sector', sector)
    .eq('category', category)
    .limit(3)

  if (!data || data.length === 0) return ''
  return data.map(r => `### ${r.title}\n${JSON.stringify(r.content, null, 2)}`).join('\n\n')
}

function parseKitJSON(text: string): Json | null {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { /* fallthrough */ }
    }
    return null
  }
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

export default function Kit() {
  const [searchParams] = useSearchParams()
  const { leads } = useLeads()
  const { provider, apiKey } = useAIProvider()

  const [selectedLeadId, setSelectedLeadId] = useState<string>(searchParams.get('lead') ?? '')
  const [activeTab, setActiveTab] = useState<TabKey>('agent')

  const [generatingAgent, setGeneratingAgent] = useState(false)
  const [generatingWeb, setGeneratingWeb] = useState(false)
  const [agentKit, setAgentKit] = useState<Json | null>(null)
  const [webKit, setWebKit] = useState<Json | null>(null)
  const [agentKitId, setAgentKitId] = useState<string | null>(null)
  const [webKitId, setWebKitId] = useState<string | null>(null)
  const [copiedAgent, setCopiedAgent] = useState(false)
  const [copiedWeb, setCopiedWeb] = useState(false)
  const [kitHistory, setKitHistory] = useState<ImplementationKit[]>([])

  const selectedLead = leads.find(l => l.id === selectedLeadId) ?? null

  useEffect(() => {
    const leadId = searchParams.get('lead')
    if (leadId) setSelectedLeadId(leadId)
  }, [searchParams])

  // Load kit history when lead changes
  useEffect(() => {
    if (!selectedLeadId) { setKitHistory([]); return }
    supabase
      .from('implementation_kits')
      .select('*')
      .eq('lead_id', selectedLeadId)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setKitHistory(data ?? []))
  }, [selectedLeadId])

  const isGenerating = activeTab === 'agent' ? generatingAgent : generatingWeb
  const currentKit = activeTab === 'agent' ? agentKit : webKit
  const currentKitId = activeTab === 'agent' ? agentKitId : webKitId
  const copied = activeTab === 'agent' ? copiedAgent : copiedWeb
  const canGenerate = Boolean(selectedLead && apiKey)

  const handleGenerate = async () => {
    if (!selectedLead || !apiKey) return
    localStorage.setItem('prospectOS_groq_key', apiKey)

    const tab = activeTab
    const setGenerating = tab === 'agent' ? setGeneratingAgent : setGeneratingWeb
    const setKit = tab === 'agent' ? setAgentKit : setWebKit
    const setKitId = tab === 'agent' ? setAgentKitId : setWebKitId

    setGenerating(true)
    setKit(null)
    setKitId(null)

    try {
      const ragContext = await queryRAG(
        selectedLead.business.sector,
        tab === 'agent' ? 'agent_template' : 'web_template',
      )
      const prompt = buildKitPrompt(selectedLead, tab, ragContext)
      const systemPrompt = tab === 'agent' ? AGENT_SYSTEM_PROMPT : WEB_SYSTEM_PROMPT

      const text = await generateText({
        provider,
        apiKey,
        systemPrompt,
        userPrompt: prompt,
        maxTokens: 4096,
      })

      const parsed = parseKitJSON(text)
      if (!parsed) {
        setKit({ _raw: text, _fallback: true } as Json)
        toast('Kit generado (formato texto)', { description: 'El JSON no pudo parsearse' })
      } else {
        setKit(parsed)
      }

      const kitContent = (parsed ?? { _raw: text }) as unknown as SupabaseJson
      const { data: saved, error: saveErr } = await supabase
        .from('implementation_kits')
        .insert({
          lead_id: selectedLead.id,
          kit_type: tab,
          platform: tab === 'agent' ? 'n8n' : 'antigravity',
          content: kitContent,
        })
        .select('id')
        .single()

      if (!saveErr && saved) {
        setKitId(saved.id)
        // Refresh history
        supabase
          .from('implementation_kits')
          .select('*')
          .eq('lead_id', selectedLead.id)
          .order('created_at', { ascending: false })
          .limit(3)
          .then(({ data }) => setKitHistory(data ?? []))
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al generar el kit'
      toast.error(msg)
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyJSON = async () => {
    if (!currentKit) return
    const jsonStr = (currentKit as { _fallback?: boolean })._fallback
      ? String((currentKit as { _raw: string })._raw)
      : activeTab === 'agent'
        ? JSON.stringify((currentKit as { workflow_json?: Json }).workflow_json ?? currentKit, null, 2)
        : JSON.stringify(currentKit, null, 2)
    await navigator.clipboard.writeText(jsonStr)
    const setCopied = activeTab === 'agent' ? setCopiedAgent : setCopiedWeb
    setCopied(true)
    toast.success('JSON copiado al portapapeles')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadJSON = () => {
    if (!currentKit || !selectedLead) return
    const jsonStr = (currentKit as { _fallback?: boolean })._fallback
      ? String((currentKit as { _raw: string })._raw)
      : activeTab === 'agent'
        ? JSON.stringify((currentKit as { workflow_json?: Json }).workflow_json ?? currentKit, null, 2)
        : JSON.stringify(currentKit, null, 2)
    const name = selectedLead.business.name.replace(/\s+/g, '-').toLowerCase()
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kit-${name}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const shareUrl = currentKitId ? `${window.location.origin}/share/${currentKitId}` : null

  const handleCopyShareLink = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    toast.success('Link copiado')
  }

  if (leads.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
        <Wrench size={40} className="text-[#3a3a3a] mb-3" />
        <p className="text-sm font-medium text-white mb-1">Sin leads en el pipeline</p>
        <p className="text-xs text-[#9ca3af] mb-4">Añade negocios desde el Radar para generar kits</p>
        <Link
          to="/radar"
          className="bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded-lg px-4 py-2"
        >
          Ir al Radar
        </Link>
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 md:p-6 max-w-4xl">
      <h1 className="text-lg font-mono font-semibold text-white mb-1">Kit Generator</h1>
      <p className="text-sm text-[#9ca3af] mb-6">Genera kits de implementación con IA para tus leads</p>

      {/* Groq API Key → replaced by provider indicator */}
      <div className="flex items-center justify-between bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 mb-5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9ca3af]">Modelo:</span>
          <span className="text-xs font-mono text-amber-400">{PROVIDER_LABELS[provider]}</span>
        </div>
        {!apiKey && (
          <Link to="/settings" className="text-xs text-red-400 hover:text-red-300">
            Configura la key en Ajustes
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#111] border border-[#2a2a2a] rounded-lg p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === key
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                : 'text-[#9ca3af] hover:text-white',
            )}
          >
            <Icon size={14} />
            {label}
            {((key === 'agent' && generatingAgent) || (key === 'web' && generatingWeb)) && (
              <Loader2 size={12} className="animate-spin" />
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Configuration */}
        <div className="space-y-4">
          {/* Lead selector */}
          <div>
            <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">Lead</label>
            <select
              value={selectedLeadId}
              onChange={e => setSelectedLeadId(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">— Selecciona un lead —</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>
                  {l.business.name} ({l.business.sector}) — score {l.score}
                </option>
              ))}
            </select>
          </div>

          {/* Lead summary */}
          {selectedLead && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <ScoreBadge score={selectedLead.score} size="md" />
                <div>
                  <p className="font-medium text-sm text-white">{selectedLead.business.name}</p>
                  <SectorBadge sector={selectedLead.business.sector} />
                </div>
              </div>
              <div className="text-xs text-[#9ca3af] space-y-0.5">
                {selectedLead.business.website
                  ? <p>Web: <span className="text-white">{selectedLead.business.website}</span></p>
                  : <p className="text-red-400">Sin página web</p>
                }
                {selectedLead.business.google_rating && (
                  <p>Rating: <span className="text-white">{selectedLead.business.google_rating}</span> ({selectedLead.business.review_count ?? '?'} reseñas)</p>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black font-medium text-sm rounded-lg px-4 py-2.5 transition-colors"
          >
            {isGenerating
              ? <><Loader2 size={16} className="animate-spin" /> Generando kit...</>
              : `Generar kit ${activeTab === 'agent' ? 'Agente IA' : 'Página Web'}`
            }
          </button>

          {!selectedLead && (
            <p className="text-xs text-[#9ca3af] flex items-center gap-1">
              <AlertCircle size={12} /> Selecciona un lead para habilitar la generación
            </p>
          )}

          {/* Kit history */}
          {selectedLead && kitHistory.length > 0 && (
            <div className="border-t border-[#2a2a2a] pt-3">
              <p className="text-[10px] text-[#4a4a4a] uppercase tracking-wider mb-2">Últimos kits</p>
              <div className="space-y-1.5">
                {kitHistory.map(kit => (
                  <div key={kit.id} className="flex items-center gap-2">
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-mono uppercase',
                      kit.kit_type === 'agent'
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-blue-500/15 text-blue-400',
                    )}>
                      {kit.kit_type}
                    </span>
                    <span className="text-xs text-[#9ca3af] flex-1 truncate">
                      {kit.created_at ? formatRelativeTime(kit.created_at) : '—'}
                    </span>
                    <button
                      onClick={() => {
                        setActiveTab(kit.kit_type as TabKey)
                        if (kit.kit_type === 'agent') setAgentKit(kit.content as unknown as Json)
                        else setWebKit(kit.content as unknown as Json)
                      }}
                      className="text-xs text-[#9ca3af] hover:text-white transition-colors"
                    >
                      Cargar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Result */}
        <div className="space-y-3">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg min-h-[320px] flex flex-col">
            {isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[#9ca3af]">
                <Loader2 size={24} className="animate-spin text-amber-500" />
                <p className="text-sm">Generando kit {activeTab === 'agent' ? 'Agente IA' : 'Página Web'}...</p>
              </div>
            ) : currentKit ? (
              <div className="flex-1 overflow-auto p-4">
                {(currentKit as { _fallback?: boolean })._fallback ? (
                  <pre className="text-xs text-[#9ca3af] whitespace-pre-wrap font-mono">
                    {String((currentKit as { _raw: string })._raw)}
                  </pre>
                ) : (
                  <KitPreview kit={currentKit} tab={activeTab} />
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#3a3a3a]">
                <p className="text-sm">El kit generado aparecerá aquí</p>
              </div>
            )}
          </div>

          {currentKit && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleCopyJSON}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 transition-colors border',
                  copied
                    ? 'bg-green-500/15 text-green-400 border-green-500/25'
                    : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#9ca3af] hover:text-white hover:border-[#3a3a3a]',
                )}
              >
                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado' : 'Copiar JSON'}
              </button>

              <button
                onClick={handleDownloadJSON}
                className="flex items-center justify-center gap-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af] hover:text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
              >
                <Download size={14} /> Descargar .json
              </button>

              {shareUrl && (
                <button
                  onClick={handleCopyShareLink}
                  className="flex items-center justify-center gap-1.5 bg-amber-500/15 border border-amber-500/25 text-amber-400 hover:bg-amber-500/25 text-sm font-medium rounded-lg px-3 py-2 transition-colors"
                >
                  <Share2 size={14} /> Compartir
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KitPreview({ kit, tab }: { kit: Json; tab: TabKey }) {
  if (tab === 'agent') {
    const summary = (kit as { client_summary?: { business_name?: string; headline?: string; what_it_does?: string } }).client_summary
    return (
      <div className="space-y-3">
        {summary && (
          <div className="space-y-2">
            <p className="text-white font-medium text-sm">{summary.business_name}</p>
            <p className="text-amber-400 text-sm">{summary.headline}</p>
            <p className="text-[#9ca3af] text-xs">{summary.what_it_does}</p>
          </div>
        )}
        <div className="border-t border-[#2a2a2a] pt-3">
          <p className="text-[10px] text-[#4a4a4a] uppercase tracking-wider mb-1">Plataformas incluidas</p>
          <div className="flex gap-2">
            <span className="text-xs bg-[#2a2a2a] text-[#9ca3af] px-2 py-0.5 rounded">n8n workflow</span>
            <span className="text-xs bg-[#2a2a2a] text-[#9ca3af] px-2 py-0.5 rounded">Make blueprint</span>
          </div>
        </div>
        {(kit as { system_prompt?: string }).system_prompt && (
          <div className="border-t border-[#2a2a2a] pt-3">
            <p className="text-[10px] text-[#4a4a4a] uppercase tracking-wider mb-1">System Prompt</p>
            <p className="text-xs text-[#9ca3af] line-clamp-3">{(kit as { system_prompt: string }).system_prompt}</p>
          </div>
        )}
        <div className="border-t border-[#2a2a2a] pt-3">
          <p className="text-[10px] text-[#4a4a4a] uppercase tracking-wider mb-1">JSON completo</p>
          <pre className="text-[10px] text-[#9ca3af] font-mono overflow-auto max-h-40 whitespace-pre-wrap">
            {JSON.stringify(kit, null, 2)}
          </pre>
        </div>
      </div>
    )
  }

  // Web tab
  const summary = (kit as { client_summary?: { business_name?: string; headline?: string; what_it_does?: string } }).client_summary
  const style = (kit as { style?: { palette?: string[]; typography?: { heading?: string; body?: string }; sections?: string[] } }).style
  const keywords = (kit as { freepik_keywords?: string[] }).freepik_keywords

  return (
    <div className="space-y-3">
      {summary && (
        <div className="space-y-2">
          <p className="text-white font-medium text-sm">{summary.business_name}</p>
          <p className="text-amber-400 text-sm">{summary.headline}</p>
          <p className="text-[#9ca3af] text-xs">{summary.what_it_does}</p>
        </div>
      )}
      {style?.palette && (
        <div className="border-t border-[#2a2a2a] pt-3">
          <p className="text-[10px] text-[#4a4a4a] uppercase tracking-wider mb-1">Paleta de colores</p>
          <div className="flex gap-2">
            {style.palette.map((c, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="w-5 h-5 rounded border border-[#3a3a3a]" style={{ backgroundColor: c }} />
                <span className="text-[10px] text-[#9ca3af] font-mono">{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {style?.sections && (
        <div className="border-t border-[#2a2a2a] pt-3">
          <p className="text-[10px] text-[#4a4a4a] uppercase tracking-wider mb-1">Secciones</p>
          <div className="flex gap-1.5 flex-wrap">
            {style.sections.map(s => (
              <span key={s} className="text-xs bg-[#2a2a2a] text-[#9ca3af] px-2 py-0.5 rounded">{s}</span>
            ))}
          </div>
        </div>
      )}
      {keywords && (
        <div className="border-t border-[#2a2a2a] pt-3">
          <p className="text-[10px] text-[#4a4a4a] uppercase tracking-wider mb-1">Freepik Keywords</p>
          <div className="flex gap-1.5 flex-wrap">
            {keywords.map(k => (
              <span key={k} className="text-xs bg-purple-500/15 text-purple-300 border border-purple-500/25 px-2 py-0.5 rounded">{k}</span>
            ))}
          </div>
        </div>
      )}
      <div className="border-t border-[#2a2a2a] pt-3">
        <p className="text-[10px] text-[#4a4a4a] uppercase tracking-wider mb-1">JSON completo</p>
        <pre className="text-[10px] text-[#9ca3af] font-mono overflow-auto max-h-40 whitespace-pre-wrap">
          {JSON.stringify(kit, null, 2)}
        </pre>
      </div>
    </div>
  )
}
