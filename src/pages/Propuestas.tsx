import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, Copy, RefreshCw, Save, MessageCircle, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '../lib/cn'
import { ScoreBadge } from '../components/ScoreBadge'
import { SectorBadge } from '../components/SectorBadge'
import { toast } from '../components/Toast'
import { useLeads, type LeadWithBusiness } from '../hooks/useLeads'
import { supabase } from '../lib/supabase'

type ServiceType = 'agente_ia' | 'web' | 'pack_completo'
type Tone = 'formal' | 'cercano' | 'whatsapp'

const SERVICE_LABELS: Record<ServiceType, string> = {
  agente_ia: 'Agente IA de teléfono y reservas',
  web: 'Mejora / creación de página web',
  pack_completo: 'Pack completo (web + agente)',
}

const TONE_LABELS: Record<Tone, string> = {
  formal: 'Formal (carta de presentación)',
  cercano: 'Cercano (email directo)',
  whatsapp: 'WhatsApp (mensaje corto)',
}

const SYSTEM_PROMPT = `Eres un consultor de transformación digital especializado en pequeños y medianos negocios en España.
Redactas propuestas comerciales en español, directas, sin jerga técnica innecesaria, centradas en el beneficio concreto para el negocio (más reservas, menos llamadas perdidas, mejor imagen online).
Nunca uses frases genéricas como "en el mundo digital de hoy" o "en la era de la tecnología".
Responde SOLO con el texto de la propuesta, sin explicaciones adicionales.`

function buildPrompt(lead: LeadWithBusiness, service: ServiceType, tone: Tone): string {
  const b = lead.business
  const webStatus = b.website ? `Tiene web: ${b.website}` : 'No tiene página web'
  const ratingLine = b.google_rating != null
    ? `Rating Google: ${b.google_rating} (${b.review_count ?? '?'} reseñas)`
    : 'Rating Google: desconocido'

  const toneInstruction = {
    whatsapp: 'La propuesta debe ser un mensaje de WhatsApp natural, máximo 250 palabras, sin saludos formales.',
    formal: 'La propuesta debe ser una carta formal con saludo, cuerpo de 3 párrafos y cierre.',
    cercano: 'La propuesta debe ser un email directo, máximo 200 palabras, primer párrafo enganche, segundo beneficios concretos, tercero CTA claro.',
  }[tone]

  return `Escribe una propuesta comercial para el siguiente negocio:

Nombre: ${b.name}
Sector: ${b.sector}
Situación web: ${webStatus}
${ratingLine}
Notas del prospecto: ${lead.notes || 'sin notas'}

Servicio a proponer: ${SERVICE_LABELS[service]}
Tono: ${TONE_LABELS[tone]}

${toneInstruction}`
}

export default function Propuestas() {
  const [searchParams] = useSearchParams()
  const { leads, updateLead } = useLeads()

  const [selectedLeadId, setSelectedLeadId] = useState<string>(searchParams.get('lead') ?? '')
  const [service, setService] = useState<ServiceType>('agente_ia')
  const [tone, setTone] = useState<Tone>('cercano')
  const [claudeKey, setClaudeKey] = useState(() => localStorage.getItem('prospectOS_groq_key') ?? '')
  const [generating, setGenerating] = useState(false)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const selectedLead = leads.find(l => l.id === selectedLeadId) ?? null

  // Prefill from URL param
  useEffect(() => {
    const leadId = searchParams.get('lead')
    if (leadId) setSelectedLeadId(leadId)
  }, [searchParams])

  const canGenerate = Boolean(selectedLead && claudeKey)

  const handleGenerate = async () => {
    if (!selectedLead || !claudeKey) return
    localStorage.setItem('prospectOS_groq_key', claudeKey)
    setGenerating(true)
    setContent('')

    const prompt = buildPrompt(selectedLead, service, tone)

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${claudeKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1024,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        if (response.status === 401) throw new Error('API key de Groq inválida')
        throw new Error(err.error?.message ?? `Error ${response.status}`)
      }

      const data = await response.json()
      const text = data.choices[0].message.content
      setContent(text)

      // Save proposal to DB
      await supabase.from('proposals').insert({
        lead_id: selectedLead.id,
        service_type: service,
        tone,
        model_used: 'llama-3.3-70b-versatile',
        prompt_used: prompt,
        content: text,
      })
    } catch (err: any) {
      toast.error(err.message ?? 'Error al generar la propuesta')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!content) return
    await navigator.clipboard.writeText(content)
    setCopied(true)
    toast.success('Copiado al portapapeles')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveToLead = async () => {
    if (!selectedLead || !content) return
    setSaving(true)
    const existing = selectedLead.notes?.trim() ?? ''
    const header = `[Propuesta ${SERVICE_LABELS[service]} · ${TONE_LABELS[tone]}]`
    const newNotes = existing ? `${existing}\n\n---\n${header}\n${content}` : `${header}\n${content}`
    const { error } = await updateLead(selectedLead.id, { notes: newNotes })
    if (error) toast.error('Error al guardar')
    else toast.success('Propuesta guardada en las notas del lead')
    setSaving(false)
  }

  const waLink = selectedLead?.business.mobile_phone
    ? `https://wa.me/${selectedLead.business.mobile_phone.replace(/\D/g, '')}?text=${encodeURIComponent(content || 'Hola, me gustaría presentarte nuestros servicios...')}`
    : null

  return (
    <div className="flex-1 p-6 max-w-4xl">
      <h1 className="text-lg font-mono font-semibold text-white mb-1">Propuestas</h1>
      <p className="text-sm text-[#9ca3af] mb-6">Genera propuestas personalizadas con IA</p>

      {/* API Key */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 mb-5">
        <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">Groq API Key</label>
        <input
          type="password"
          value={claudeKey}
          onChange={e => setClaudeKey(e.target.value)}
          placeholder="gsk_xxxxx"
          className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-amber-500"
        />
        {!claudeKey && (
          <p className="text-xs text-[#9ca3af] mt-1.5 flex items-center gap-1">
            <AlertCircle size={12} />
            Necesitas una API key de Groq (gratis en console.groq.com). Se guarda localmente.
          </p>
        )}
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
                {selectedLead.notes && <p>Notas: <span className="text-white">{selectedLead.notes}</span></p>}
              </div>
            </div>
          )}

          {/* Service */}
          <div>
            <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">Servicio a proponer</label>
            <div className="space-y-2">
              {(Object.keys(SERVICE_LABELS) as ServiceType[]).map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="service"
                    value={s}
                    checked={service === s}
                    onChange={() => setService(s)}
                    className="accent-amber-500"
                  />
                  <span className="text-sm text-[#9ca3af] hover:text-white">{SERVICE_LABELS[s]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div>
            <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">Tono</label>
            <div className="space-y-2">
              {(Object.keys(TONE_LABELS) as Tone[]).map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tone"
                    value={t}
                    checked={tone === t}
                    onChange={() => setTone(t)}
                    className="accent-amber-500"
                  />
                  <span className="text-sm text-[#9ca3af] hover:text-white">{TONE_LABELS[t]}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black font-medium text-sm rounded-lg px-4 py-2.5 transition-colors"
          >
            {generating
              ? <><Loader2 size={16} className="animate-spin" /> Generando propuesta...</>
              : 'Generar propuesta'
            }
          </button>

          {!selectedLead && (
            <p className="text-xs text-[#9ca3af] flex items-center gap-1">
              <AlertCircle size={12} /> Selecciona un lead para habilitar la generación
            </p>
          )}
        </div>

        {/* Right: Result */}
        <div className="space-y-3">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-1 min-h-[280px] flex flex-col">
            {generating ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[#9ca3af]">
                <Loader2 size={24} className="animate-spin text-amber-500" />
                <p className="text-sm">Generando propuesta...</p>
              </div>
            ) : content ? (
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                className="flex-1 w-full bg-transparent p-3 text-sm text-white resize-none focus:outline-none"
                rows={16}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#3a3a3a]">
                <p className="text-sm">La propuesta generada aparecerá aquí</p>
              </div>
            )}
          </div>

          {content && (
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 transition-colors border',
                  copied
                    ? 'bg-green-500/15 text-green-400 border-green-500/25'
                    : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#9ca3af] hover:text-white hover:border-[#3a3a3a]',
                )}
              >
                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center justify-center gap-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af] hover:text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
              >
                <RefreshCw size={14} /> Regenerar
              </button>

              {waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-green-500/15 border border-green-500/25 text-green-400 hover:bg-green-500/25 text-sm font-medium rounded-lg px-3 py-2 transition-colors"
                >
                  <MessageCircle size={14} /> WhatsApp
                </a>
              ) : (
                <button
                  disabled
                  title="Necesitas el teléfono móvil del negocio"
                  className="flex items-center justify-center gap-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-[#4a4a4a] text-sm font-medium rounded-lg px-3 py-2 cursor-not-allowed"
                >
                  <MessageCircle size={14} /> WhatsApp
                </button>
              )}

              <button
                onClick={handleSaveToLead}
                disabled={saving}
                className="flex items-center justify-center gap-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af] hover:text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Guardar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
