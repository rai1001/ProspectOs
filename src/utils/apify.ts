import type { BusinessInsert } from '../lib/supabase'
import type { Sector } from '../constants/sectors'

// Apify Google Maps Scraper result shape (partial)
interface ApifyReview {
  name?: string
  text?: string
  stars?: number
  publishedAtDate?: string
}

interface ApifyResult {
  title?: string
  address?: string
  phone?: string
  phoneUnformatted?: string
  website?: string
  totalScore?: number
  reviewsCount?: number
  categoryName?: string
  categories?: string[]
  placeId?: string
  reviews?: ApifyReview[]
}

export type { ApifyReview }

export type ApifySearchResult = Omit<BusinessInsert, 'sector'> & { sector: Sector; reviews?: ApifyReview[] }

const SECTOR_KEYWORDS: Array<{ keywords: string[]; sector: Sector }> = [
  { keywords: ['restaurante', 'restaurant', 'comida', 'tapas', 'gastro', 'bar de tapas', 'pizzeria', 'hamburgues', 'sushi', 'marisqueria', 'cafeteria', 'cafè'], sector: 'Restauración' },
  { keywords: ['hotel', 'hostal', 'pension', 'alojamiento', 'apartamento turistico', 'albergue', 'rural'], sector: 'Hostelería' },
  { keywords: ['peluqueria', 'peluquería', 'barberia', 'estetica', 'estética', 'salon de belleza', 'nail', 'uñas', 'depilacion', 'spa', 'masaje'], sector: 'Peluquería / Estética' },
  { keywords: ['clinica', 'clínica', 'medico', 'médico', 'dentista', 'dental', 'fisioterapia', 'veterinario', 'farmacia', 'centro medico', 'hospital', 'optica', 'psicolog'], sector: 'Clínica / Salud' },
  { keywords: ['taller', 'mecanico', 'mecánico', 'automocion', 'automovil', 'automóvil', 'neumatico', 'neumático', 'motor', 'itv', 'carroceria', 'chapa'], sector: 'Taller / Automoción' },
  { keywords: ['tienda', 'comercio', 'boutique', 'moda', 'ropa', 'zapateria', 'papeleria', 'libreria', 'supermercado', 'ferreteria', 'optica'], sector: 'Comercio retail' },
  { keywords: ['fontanero', 'fontaneria', 'reformas', 'electricista', 'albanil', 'carpintero', 'pintor', 'cerrajero', 'instalacion', 'obras'], sector: 'Fontanería / Reformas' },
  { keywords: ['academia', 'formacion', 'formación', 'escuela', 'clases', 'autoescuela', 'idiomas', 'ingles', 'música', 'danza', 'baile', 'gimnasio', 'crossfit', 'yoga'], sector: 'Academia / Formación' },
]

function inferSector(category: string): Sector {
  const lower = category.toLowerCase()
  for (const { keywords, sector } of SECTOR_KEYWORDS) {
    if (keywords.some(k => lower.includes(k))) return sector
  }
  return 'Otro'
}

// Detect Spanish mobile: starts with +346xx or +347xx or 6xx/7xx (9 digits)
function isMobilePhone(phone: string): boolean {
  const clean = phone.replace(/\s+/g, '').replace(/-/g, '')
  return /^(\+34)?[67]\d{8}$/.test(clean)
}

export function transformApifyResult(result: ApifyResult): ApifySearchResult {
  const rawCategory = result.categoryName ?? result.categories?.[0] ?? ''
  const phone = result.phone ?? result.phoneUnformatted ?? null
  const mobilePhone = phone && isMobilePhone(phone) ? phone : null
  const landlinePhone = phone && !isMobilePhone(phone) ? phone : null

  return {
    name: result.title ?? 'Sin nombre',
    sector: inferSector(rawCategory),
    address: result.address ?? null,
    phone: landlinePhone,
    mobile_phone: mobilePhone,
    website: result.website ?? null,
    website_outdated: false,
    google_rating: result.totalScore ?? null,
    review_count: result.reviewsCount ?? null,
    has_google_business: Boolean(result.placeId),
    place_id: result.placeId ?? null,
    source: 'apify',
    reviews: result.reviews ?? [],
  }
}

export async function searchWithApify(
  query: string,
  apifyToken: string,
): Promise<ApifySearchResult[]> {
  const actorId = 'compass~crawler-google-places'
  const runUrl = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apifyToken}`

  const body = {
    searchStringsArray: [`${query} A Coruña`],
    language: 'es',
    maxCrawledPlacesPerSearch: 20,
    countryCode: 'es',
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60_000)

  let response: Response
  try {
    response = await fetch(runUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('La búsqueda tardó demasiado (>60s). Intenta de nuevo.')
    throw err
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Apify error ${response.status}: ${text}`)
  }

  const data: ApifyResult[] = await response.json()
  return data.map(transformApifyResult)
}

/**
 * Deep search: same as searchWithApify but includes up to 10 recent reviews per business.
 * Filters to places with rating < 4.5 to focus on "pain" leads.
 * Costs more Apify credits but provides the review text for AI analysis.
 */
export async function searchWithApifyDeep(
  query: string,
  apifyToken: string,
): Promise<ApifySearchResult[]> {
  const actorId = 'compass~crawler-google-places'
  const runUrl = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apifyToken}`

  const body = {
    searchStringsArray: [`${query} A Coruña`],
    language: 'es',
    maxCrawledPlacesPerSearch: 15,
    countryCode: 'es',
    maxReviews: 10,
    reviewsSort: 'newest',
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 120_000) // 2 min for deep search

  let response: Response
  try {
    response = await fetch(runUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError')
      throw new Error('La búsqueda profunda tardó demasiado (>120s). Intenta de nuevo.')
    throw err
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Apify error ${response.status}: ${text}`)
  }

  const data: ApifyResult[] = await response.json()

  // Filter: only places with rating < 4.5 (pain candidates)
  return data
    .filter(d => !d.totalScore || d.totalScore < 4.5)
    .map(transformApifyResult)
}
