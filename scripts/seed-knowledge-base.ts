/**
 * Seed script for knowledge_base table
 * Generates templates via Groq + embeds via nomic-embed-text
 *
 * Run: npx tsx --env-file .env.local scripts/seed-knowledge-base.ts
 * Requires in .env.local:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (not anon — needs RLS bypass)
 *   GROQ_API_KEY
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GROQ_API_KEY = process.env.GROQ_API_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !GROQ_API_KEY) {
  console.error('Missing env vars. Need: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const SECTORS = [
  'Restauración',
  'Hostelería',
  'Peluquería / Estética',
  'Clínica / Salud',
  'Taller / Automoción',
  'Comercio retail',
  'Fontanería / Reformas',
  'Academia / Formación',
  'Otro',
] as const

const CATEGORIES = ['agent_template', 'web_template'] as const

const AGENT_TEMPLATES_PER_SECTOR = [
  { platform: 'n8n', title: (s: string) => `Agente de reservas ${s} (n8n)` },
  { platform: 'n8n', title: (s: string) => `Agente de atención al cliente ${s} (n8n)` },
  { platform: 'make', title: (s: string) => `Agente de reservas ${s} (Make)` },
  { platform: 'make', title: (s: string) => `Automatización de seguimiento ${s} (Make)` },
  { platform: null, title: (s: string) => `System prompt agente IA ${s}` },
  { platform: null, title: (s: string) => `Flujo de cualificación de leads ${s}` },
]

const WEB_TEMPLATES_PER_SECTOR = [
  { platform: 'antigravity', title: (s: string) => `Brief web ${s} (Antigravity)` },
  { platform: 'antigravity', title: (s: string) => `Landing page ${s} (Antigravity)` },
  { platform: null, title: (s: string) => `Diseño web ${s} — estilo profesional` },
  { platform: null, title: (s: string) => `Diseño web ${s} — estilo moderno` },
  { platform: null, title: (s: string) => `Keywords Freepik para ${s}` },
  { platform: null, title: (s: string) => `Paleta de colores y tipografía para ${s}` },
]

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function groqChat(systemPrompt: string, userPrompt: string, retries = 3): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 2048,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      })
      if (!res.ok) {
        if (res.status === 429) {
          const wait = Math.pow(2, attempt) * 5000
          console.log(`  Rate limited, waiting ${wait / 1000}s...`)
          await sleep(wait)
          continue
        }
        throw new Error(`Groq API error: ${res.status} ${await res.text()}`)
      }
      const data = await res.json()
      return data.choices[0].message.content
    } catch (err) {
      if (attempt === retries - 1) throw err
      const wait = Math.pow(2, attempt) * 1000
      console.log(`  Retry ${attempt + 1}/${retries} after ${wait}ms...`)
      await sleep(wait)
    }
  }
  throw new Error('Unreachable')
}

// NOTE: Groq removed embedding models (nomic-embed-text no longer available as of 2026-04).
// Templates are inserted without embeddings. RAG falls back to sector/category filtering.
// Re-enable when an embedding provider is available.

function parseJSON(text: string): Record<string, unknown> | null {
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

const AGENT_SYSTEM = `Eres un experto en automatización con n8n y Make para negocios locales en España.
Genera un template de referencia en JSON válido para el tipo de automatización indicado.
El JSON debe incluir: workflow_json (estructura n8n), make_blueprint_json (estructura Make), y un system_prompt para el agente.
Responde SOLO con JSON válido, sin markdown ni explicaciones.`

const WEB_SYSTEM = `Eres un diseñador web experto especializado en negocios locales en España.
Genera un template de referencia en JSON válido para el tipo de diseño indicado.
El JSON debe incluir: style (palette, typography, sections), antigravity_brief, y freepik_keywords.
Responde SOLO con JSON válido, sin markdown ni explicaciones.`

async function main() {
  const forceFlag = process.argv.includes('--force')

  // Idempotency check
  const { count } = await supabase.from('knowledge_base').select('*', { count: 'exact', head: true })
  const continueFlag = process.argv.includes('--continue')
  if (count && count > 0 && !forceFlag && !continueFlag) {
    console.log(`knowledge_base already has ${count} rows. Use --force to re-seed or --continue to fill gaps.`)
    process.exit(0)
  }

  if (forceFlag && count && count > 0) {
    console.log(`Clearing ${count} existing rows (--force)...`)
    await supabase.from('knowledge_base').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  }

  // If --continue flag, skip existing rows
  let existingTitles = new Set<string>()
  if (continueFlag && count && count > 0) {
    const { data: existing } = await supabase.from('knowledge_base').select('title')
    if (existing) existingTitles = new Set(existing.map(r => r.title))
    console.log(`Continuing: ${existingTitles.size} already exist, will skip those.`)
  }

  // Build template list
  type TemplateSpec = { sector: string; category: string; platform: string | null; title: string }
  const templates: TemplateSpec[] = []

  for (const sector of SECTORS) {
    for (const tpl of AGENT_TEMPLATES_PER_SECTOR) {
      templates.push({ sector, category: 'agent_template', platform: tpl.platform, title: tpl.title(sector) })
    }
    for (const tpl of WEB_TEMPLATES_PER_SECTOR) {
      templates.push({ sector, category: 'web_template', platform: tpl.platform, title: tpl.title(sector) })
    }
  }

  console.log(`Seeding ${templates.length} templates across ${SECTORS.length} sectors...`)
  let seeded = 0
  let failed = 0

  // Process in batches of 5 (Groq free tier has aggressive rate limits)
  const BATCH_SIZE = 5
  for (let i = 0; i < templates.length; i += BATCH_SIZE) {
    const batch = templates.slice(i, i + BATCH_SIZE)

    for (const tpl of batch) {
      if (continueFlag && existingTitles.has(tpl.title)) {
        seeded++
        continue
      }
      try {
        const systemPrompt = tpl.category === 'agent_template' ? AGENT_SYSTEM : WEB_SYSTEM
        const userPrompt = `Genera un template de "${tpl.title}" para el sector "${tpl.sector}" en España. ${tpl.platform ? `Plataforma: ${tpl.platform}.` : 'Template genérico.'}`

        const raw = await groqChat(systemPrompt, userPrompt)
        const content = parseJSON(raw) ?? { _raw: raw }

        const { error } = await supabase.from('knowledge_base').insert({
          category: tpl.category,
          sector: tpl.sector,
          platform: tpl.platform,
          title: tpl.title,
          content,
        })

        if (error) {
          console.error(`  Error inserting "${tpl.title}": ${error.message}`)
          failed++
        } else {
          seeded++
        }
      } catch (err) {
        console.error(`  Failed "${tpl.title}": ${err}`)
        failed++
      }
    }

    console.log(`Seeded ${seeded}/${templates.length} (${failed} failed)...`)

    // 5s delay between batches to respect Groq free tier rate limits
    if (i + BATCH_SIZE < templates.length) {
      await sleep(5000)
    }
  }

  console.log(`\nDone. ${seeded} seeded, ${failed} failed out of ${templates.length} total.`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
