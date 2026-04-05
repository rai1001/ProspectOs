import { generateText } from './ai'
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
 * Fetches a website's HTML via a public proxy (to bypass CORS)
 * and returns the text content for AI analysis.
 */
async function fetchWebsiteHTML(url: string): Promise<string> {
  // Try multiple CORS proxy approaches
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ]

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) })
      if (res.ok) {
        const html = await res.text()
        // Trim to ~6000 chars to stay within token limits
        return html.slice(0, 6000)
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
    userPrompt: `URL: ${websiteUrl}\n\nHTML (primeros 6000 chars):\n${html}`,
    maxTokens: 1024,
  })

  // Parse JSON from the response (handle possible markdown wrappers)
  let jsonStr = response.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  }

  try {
    const result = JSON.parse(jsonStr) as WebAuditResult
    return result
  } catch {
    throw new Error('El análisis no devolvió un JSON válido. Intenta de nuevo.')
  }
}
