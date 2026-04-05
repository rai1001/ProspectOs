import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, MessageCircle, Wrench, Globe } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const anonClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

type Json = Record<string, unknown>

interface KitRow {
  id: string
  kit_type: 'agent' | 'web'
  content: Json
}

export default function Share() {
  const { kitId } = useParams<{ kitId: string }>()
  const [kit, setKit] = useState<KitRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!kitId || !anonClient) {
      setNotFound(true)
      setLoading(false)
      return
    }
    anonClient
      .from('implementation_kits')
      .select('id, kit_type, content')
      .eq('id', kitId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true)
        else setKit(data as KitRow)
        setLoading(false)
      })
  }, [kitId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
        <Loader2 size={24} className="animate-spin text-amber-500" />
      </div>
    )
  }

  if (notFound || !kit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] p-6">
        <div className="text-center space-y-3">
          <p className="text-white font-medium">Este kit ya no está disponible</p>
          <p className="text-sm text-[#9ca3af]">El enlace puede haber expirado o el kit fue eliminado.</p>
        </div>
      </div>
    )
  }

  const summary = (kit.content as { client_summary?: { business_name?: string; headline?: string; what_it_does?: string; what_they_need_to_do?: string; cta?: string } }).client_summary
  const agencyPhone = localStorage.getItem('prospectOS_agency_phone') ?? ''

  const waUrl = agencyPhone
    ? `https://wa.me/${agencyPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hola, vi el kit para ${summary?.business_name ?? 'mi negocio'} y quiero saber más`,
      )}`
    : null

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
            {kit.kit_type === 'agent' ? <Wrench size={20} className="text-black" /> : <Globe size={20} className="text-black" />}
          </div>
          <div>
            <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider">
              {kit.kit_type === 'agent' ? 'Kit Agente IA' : 'Kit Página Web'}
            </p>
            <p className="text-white font-mono font-semibold text-sm">ProspectOS</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          {summary ? (
            <div className="p-6 space-y-4">
              <h1 className="text-xl font-semibold text-white">{summary.business_name}</h1>
              <p className="text-amber-400 font-medium">{summary.headline}</p>
              <p className="text-[#9ca3af] text-sm leading-relaxed">{summary.what_it_does}</p>
              {summary.what_they_need_to_do && (
                <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-3">
                  <p className="text-[10px] text-[#4a4a4a] uppercase tracking-wider mb-1">¿Qué tienes que hacer?</p>
                  <p className="text-sm text-white">{summary.what_they_need_to_do}</p>
                </div>
              )}

              {/* Web-specific preview */}
              {kit.kit_type === 'web' && (
                <WebKitPreview content={kit.content} />
              )}

              {/* CTA */}
              <div className="pt-2">
                {waUrl ? (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium text-sm rounded-lg px-4 py-3 transition-colors"
                  >
                    <MessageCircle size={16} />
                    {summary.cta ?? 'Quiero empezar'}
                  </a>
                ) : (
                  <div className="w-full text-center bg-[#111] border border-[#2a2a2a] text-[#9ca3af] text-sm rounded-lg px-4 py-3">
                    Contacta con nosotros
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <p className="text-[#9ca3af] text-sm">Kit generado correctamente.</p>
              {waUrl ? (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium text-sm rounded-lg px-4 py-3 transition-colors"
                >
                  <MessageCircle size={16} /> Contactar
                </a>
              ) : (
                <div className="mt-4 w-full text-center bg-[#111] border border-[#2a2a2a] text-[#9ca3af] text-sm rounded-lg px-4 py-3">
                  Contacta con nosotros
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-[#3a3a3a] mt-6">
          Generado con ProspectOS
        </p>
      </div>
    </div>
  )
}

function WebKitPreview({ content }: { content: Json }) {
  const style = (content as { style?: { palette?: string[]; sections?: string[] } }).style
  const keywords = (content as { freepik_keywords?: string[] }).freepik_keywords

  if (!style && !keywords) return null

  return (
    <div className="space-y-3">
      {style?.palette && (
        <div>
          <p className="text-[10px] text-[#4a4a4a] uppercase tracking-wider mb-1">Paleta propuesta</p>
          <div className="flex gap-2">
            {style.palette.map((c, i) => (
              <div key={i} className="w-8 h-8 rounded-lg border border-[#3a3a3a]" style={{ backgroundColor: c }} title={c} />
            ))}
          </div>
        </div>
      )}
      {style?.sections && (
        <div>
          <p className="text-[10px] text-[#4a4a4a] uppercase tracking-wider mb-1">Secciones de la web</p>
          <div className="flex gap-1.5 flex-wrap">
            {style.sections.map(s => (
              <span key={s} className="text-xs bg-[#2a2a2a] text-[#9ca3af] px-2 py-0.5 rounded capitalize">{s}</span>
            ))}
          </div>
        </div>
      )}
      {keywords && (
        <div>
          <p className="text-[10px] text-[#4a4a4a] uppercase tracking-wider mb-1">Imágenes sugeridas</p>
          <div className="flex gap-1.5 flex-wrap">
            {keywords.map(k => (
              <span key={k} className="text-xs bg-purple-500/15 text-purple-300 border border-purple-500/25 px-2 py-0.5 rounded">{k}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
