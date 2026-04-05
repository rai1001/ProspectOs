import { generateText, parseLLMJson } from './ai'
import type { AIProvider } from './ai'

const WEB_AUDIT_PROMPT = `Eres un auditor técnico de webs de negocios locales.
Analiza el HTML proporcionado y devuelve SOLO un JSON válido (sin markdown, sin backticks) con esta estructura exacta:

{
  "has_chatbot": boolean,        // ¿tiene widget de chat, WhatsApp o bot visible?
  "has_booking_widget": boolean, // ¿tiene sistema de reservas online?
  "uses_wordpress": boolean,     // ¿detectas señales de WordPress?
  "has_meta_pixel": boolean,     // ¿detectas Píxel de Facebook/Meta?
  "has_analytics": boolean,      // ¿tiene Google Analytics / Tag Manager?
  "mobile_friendly": boolean,    // ¿tiene viewport meta tag?
  "quality_score": number,       // 1-10, calidad general de la web
  "issues": string[],            // lista de problemas detectados (máx 5)
  "technologies": string[]       // tecnologías detectadas (CMS, frameworks, etc.)
}

Sé preciso. Si no puedes determinar algo, usa false. Siempre devuelve JSON válido.`

/**
 * Extracts the auditable portion of raw HTML for LLM analysis.
 *
 * Strategy (ordered by signal value):
 * 1. Full <head> block — contains analytics, meta pixel, viewport, WP signals
 * 2. First 2000 chars of <body> — chatbot/WhatsApp widgets injected near top
 * 3. Fallback to raw slice if HTML is malformed / no recognizable structure
 *
 * Blind slicing at a fixed char count risks cutting before </head>, leaving
 * the most diagnostic signals out of the prompt.
 */
export function extractAuditableHTML(rawHtml: string, maxLen = 6000): string {
  const headMatch = rawHtml.match(/<head[\s\S]*?<\/head>/i)
  const head = headMatch ? headMatch[0] : ''

  const bodyStart = rawHtml.indexOf('<body')
  const bodyChunk = bodyStart >= 0
    ? rawHtml.slice(bodyStart, bodyStart + 2000)
    : ''

  const combined = head || bodyChunk
    ? `${head}\n${bodyChunk}`.trim().slice(0, maxLen)
    : rawHtml.slice(0, maxLen)   // fallback for malformed HTML

  return combined
}

/**
 * Fetches a website's HTML via a public proxy (to bypass CORS)
 * and returns the auditable portion for AI analysis.
 */
async function fetchWebsiteHTML(url: string): Promise<string> {
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ]

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) })
      if (res.ok) {
        const raw = await res.text()
        return extractAuditableHTML(raw)
      }
    } catch {
      continue
    }
  }

  throw new Error('No se pudo acceder a la web del negocio. Intenta más tarde.')
}

export interface WebAuditResult {
  has_chatbot: boolean
  has_booking_widget: boolean
  uses_wordpress: boolean
  has_meta_pixel: boolean
  has_analytics: boolean
  mobile_friendly: boolean
  quality_score: number
  issues: string[]
  technologies: string[]
}

/**
 * Audits a business website using AI to detect technologies, chatbots, and issues.
 * Returns structured data that can be saved to the business record.
 */
export async function auditWebsite(
  websiteUrl: string,
  provider: AIProvider,
  apiKey: string,
): Promise<WebAuditResult> {
  const html = await fetchWebsiteHTML(websiteUrl)

  const response = await generateText({
    provider,
    apiKey,
    systemPrompt: WEB_AUDIT_PROMPT,
    userPrompt: `URL: ${websiteUrl}\n\nHTML (head + inicio del body):\n${html}`,
    maxTokens: 1024,
  })

  const result = parseLLMJson<WebAuditResult>(response)
  if (!result) throw new Error('El análisis no devolvió un JSON válido. Intenta de nuevo.')
  return result
}
