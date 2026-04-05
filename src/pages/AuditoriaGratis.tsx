import { useState } from 'react'
import { ScanSearch, Loader2, AlertTriangle, CheckCircle2, XCircle, Zap } from 'lucide-react'
import { cn } from '../lib/cn'
import { auditWebsite, type WebAuditResult } from '../utils/audit'
import { supabase } from '../lib/supabase'

export default function AuditoriaGratis() {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [auditing, setAuditing] = useState(false)
  const [result, setResult] = useState<WebAuditResult | null>(null)
  const [auditError, setAuditError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Use Gemini free tier for public audit — configure via env or localStorage
  const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY || localStorage.getItem('prospectOS_gemini_key') || ''

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    setAuditing(true)
    setResult(null)
    setAuditError(null)

    try {
      let fullUrl = url.trim()
      if (!fullUrl.startsWith('http')) fullUrl = `https://${fullUrl}`
      const auditResult = await auditWebsite(fullUrl, 'gemini', GEMINI_KEY)
      setResult(auditResult)
    } catch {
      setAuditError('No se pudo analizar la web. Verifica la URL e intenta de nuevo.')
    } finally {
      setAuditing(false)
    }
  }

  const handleSubmitLead = async () => {
    if (!phone.trim()) return
    setSubmitting(true)

    // Save lead silently
    let fullUrl = url.trim()
    if (!fullUrl.startsWith('http')) fullUrl = `https://${fullUrl}`

    const { data: biz } = await supabase
      .from('businesses')
      .insert({
        name: name || fullUrl,
        website: fullUrl,
        sector: 'Otro',
        source: 'inbound',
        phone: phone,
        has_chatbot: result?.has_chatbot ?? null,
        technologies: (result?.technologies ?? []) as unknown as any,
        pain_points: (result?.issues ?? []) as unknown as any,
        website_outdated: result ? result.quality_score < 5 : null,
        has_google_business: false,
      })
      .select()
      .single()

    if (biz) {
      await supabase.from('leads').insert({
        business_id: biz.id,
        status: 'nuevo',
        score: result ? Math.max(0, 100 - result.quality_score * 10) : 50,
      })
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10 max-w-lg">
        <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-4 py-1.5 text-xs font-medium mb-4">
          <Zap size={12} /> Análisis gratuito con IA
        </div>
        <h1 className="text-2xl md:text-3xl font-mono font-bold text-white mb-3">
          ¿Tu web está perdiendo clientes?
        </h1>
        <p className="text-sm text-[#9ca3af] leading-relaxed">
          Nuestra IA analiza tu página web en segundos y te dice exactamente qué está fallando: chatbots ausentes, velocidad, reservas que no llegan y más.
        </p>
      </div>

      {/* Form */}
      {!result && !auditError && (
        <form onSubmit={handleAudit} className="w-full max-w-md space-y-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">URL de tu web</label>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="www.tunegocio.com"
                required
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#9ca3af] mb-1.5 font-medium">Nombre del negocio (opcional)</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Mi restaurante"
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={auditing || !url.trim()}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black font-semibold text-sm rounded-lg px-4 py-3 transition-colors"
            >
              {auditing ? (
                <><Loader2 size={16} className="animate-spin" /> Analizando...</>
              ) : (
                <><ScanSearch size={16} /> Analizar mi web gratis</>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Error state */}
      {auditError && !result && (
        <div className="w-full max-w-md">
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 text-center space-y-3">
            <AlertTriangle size={32} className="mx-auto text-red-400" />
            <p className="text-sm text-red-200">{auditError}</p>
            <button
              onClick={() => { setAuditError(null) }}
              className="text-xs text-amber-400 hover:text-amber-300 underline"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !submitted && (
        <div className="w-full max-w-md space-y-4">
          {/* Score card */}
          <div className={cn(
            'bg-[#1a1a1a] border rounded-xl p-6 text-center',
            result.quality_score >= 7 ? 'border-green-500/40' : result.quality_score >= 4 ? 'border-amber-500/40' : 'border-red-500/40',
          )}>
            <div className={cn(
              'text-5xl font-mono font-bold mb-2',
              result.quality_score >= 7 ? 'text-green-400' : result.quality_score >= 4 ? 'text-amber-400' : 'text-red-400',
            )}>
              {result.quality_score}/10
            </div>
            <p className="text-sm text-[#9ca3af]">
              {result.quality_score >= 7 ? 'Tu web está bien, pero puede mejorar' : result.quality_score >= 4 ? 'Tu web tiene problemas que te cuestan clientes' : 'Tu web necesita ayuda urgente'}
            </p>
          </div>

          {/* Diagnostics */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 space-y-3">
            <h3 className="text-xs text-[#4a4a4a] uppercase tracking-wider font-medium">Diagnóstico</h3>
            <div className="space-y-2">
              <DiagRow ok={result.has_chatbot} label="Chatbot / WhatsApp" />
              <DiagRow ok={result.has_booking_widget} label="Sistema de reservas" />
              <DiagRow ok={result.mobile_friendly} label="Optimizada para móvil" />
              <DiagRow ok={result.has_analytics} label="Google Analytics" />
              <DiagRow ok={result.has_meta_pixel} label="Píxel de Meta Ads" />
            </div>
          </div>

          {/* Issues */}
          {result.issues.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 space-y-2">
              <h3 className="text-xs text-red-400 uppercase tracking-wider font-medium flex items-center gap-1.5">
                <AlertTriangle size={12} /> Problemas detectados
              </h3>
              {result.issues.map((issue, i) => (
                <p key={i} className="text-xs text-red-200">• {issue}</p>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 space-y-3">
            <h3 className="text-sm text-amber-400 font-semibold">
              ¿Quieres que lo arreglemos por ti?
            </h3>
            <p className="text-xs text-[#9ca3af]">
              Déjanos tu teléfono y te contactamos con una solución personalizada lista para instalar en tu negocio.
            </p>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Tu teléfono de contacto"
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-white placeholder-[#4a4a4a] focus:outline-none focus:border-amber-500 transition-colors"
            />
            <button
              onClick={handleSubmitLead}
              disabled={submitting || !phone.trim()}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black font-semibold text-sm rounded-lg px-4 py-3 transition-colors"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              Quiero la solución
            </button>
          </div>
        </div>
      )}

      {/* Thank you */}
      {submitted && (
        <div className="w-full max-w-md bg-[#1a1a1a] border border-green-500/30 rounded-xl p-8 text-center">
          <CheckCircle2 size={48} className="mx-auto text-green-400 mb-4" />
          <h2 className="text-lg font-mono font-bold text-white mb-2">¡Recibido!</h2>
          <p className="text-sm text-[#9ca3af]">
            Nuestro equipo te contactará pronto con una demo personalizada del agente IA diseñado para tu negocio.
          </p>
        </div>
      )}

      {/* Footer */}
      <p className="text-[10px] text-[#4a4a4a] mt-10">
        Powered by ProspectOs · Análisis con IA generativa
      </p>
    </div>
  )
}

function DiagRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#9ca3af]">{label}</span>
      {ok ? (
        <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 size={12} /> OK</span>
      ) : (
        <span className="flex items-center gap-1 text-xs text-red-400"><XCircle size={12} /> Falta</span>
      )}
    </div>
  )
}
