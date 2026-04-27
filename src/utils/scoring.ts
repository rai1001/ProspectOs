import type { Business, ScoringRule } from '../lib/supabase'
import { HIGH_CALL_SECTORS } from '../constants/sectors'

export function calculateScore(business: Business, rules: ScoringRule[]): number {
  // Reglas aplicables: comunes (vertical=null) + específicas del vertical del negocio
  const activeRules = rules.filter(r =>
    r.enabled && (r.vertical === null || r.vertical === (business as any).vertical)
  )
  let score = 0

  for (const rule of activeRules) {
    switch (rule.condition) {
      // ── Reglas genéricas existentes ──────────────────────────────────────
      case 'no_website':
        if (!business.website) score += rule.points
        break
      case 'high_call_sector':
        if (HIGH_CALL_SECTORS.includes(business.sector as any)) score += rule.points
        break
      case 'low_rating':
        if (business.google_rating !== null && business.google_rating < 4.0) score += rule.points
        break
      case 'low_reviews':
        if (business.review_count !== null && business.review_count < 30) score += rule.points
        break
      case 'no_mobile_phone':
        if (!business.mobile_phone) score += rule.points
        break
      case 'website_outdated':
        if (business.website_outdated) score += rule.points
        break
      case 'no_chatbot':
        if (business.has_chatbot === false) score += rule.points
        break
      case 'has_pain_points':
        if (Array.isArray(business.pain_points) && business.pain_points.length > 0) score += rule.points
        break
      case 'web_slow_or_old': {
        const techs = business.technologies as string[] | null
        if (Array.isArray(techs) && (techs.includes('outdated_cms') || techs.includes('slow_loading'))) score += rule.points
        break
      }
      case 'no_review_responses': {
        const rr = (business as any).response_rate
        if (rr !== null && rr !== undefined && rr < 20) score += rule.points
        break
      }

      // ── Restaurantes ─────────────────────────────────────────────────────
      case 'rating_bueno_con_margen':
        if (business.google_rating !== null && business.google_rating >= 4.0 && business.google_rating <= 4.5
            && business.review_count !== null && business.review_count > 100) score += rule.points
        break
      case 'rating_bajo_restaurante':
        if (business.google_rating !== null && business.google_rating < 3.8) score += rule.points
        break
      case 'sin_respuestas_negativas': {
        const rr = (business as any).response_rate
        if (rr !== null && rr !== undefined && rr < 10) score += rule.points
        break
      }
      case 'thefork_activo': {
        const techs = business.technologies as string[] | null
        if (Array.isArray(techs) && techs.includes('thefork')) score += rule.points
        break
      }
      case 'sin_web_o_solo_facebook':
        if (!business.website || (business.technologies as string[] | null)?.includes('facebook_only')) score += rule.points
        break
      case 'franquicia_grande': {
        const techs = business.technologies as string[] | null
        if (Array.isArray(techs) && techs.includes('franchise_large')) score += rule.points
        break
      }

      // ── Hoteles ───────────────────────────────────────────────────────────
      case 'hotel_sin_respuestas': {
        const rr = (business as any).response_rate
        if (rr !== null && rr !== undefined && rr < 15) score += rule.points
        break
      }
      case 'hotel_booking_directo': {
        const techs = business.technologies as string[] | null
        if (!Array.isArray(techs) || !techs.includes('booking_engine')) score += rule.points
        break
      }
      case 'hotel_rating_mejorable':
        if (business.google_rating !== null && business.google_rating >= 3.8 && business.google_rating <= 4.3) score += rule.points
        break
      case 'cadena_hotel_grande': {
        const techs = business.technologies as string[] | null
        if (Array.isArray(techs) && techs.includes('franchise_large')) score += rule.points
        break
      }

      // ── Dentistas ─────────────────────────────────────────────────────────
      case 'dental_alta_estetica': {
        const pp = business.pain_points as string[] | null
        if (Array.isArray(pp) && (pp.includes('implantes') || pp.includes('invisalign') || pp.includes('estetica_dental'))) score += rule.points
        break
      }
      case 'dental_web_responsive_fail': {
        const techs = business.technologies as string[] | null
        if (Array.isArray(techs) && techs.includes('not_responsive')) score += rule.points
        break
      }
      case 'dental_multisede': {
        const techs = business.technologies as string[] | null
        if (Array.isArray(techs) && techs.includes('multi_location')) score += rule.points
        break
      }
      case 'dental_cadena_grande': {
        const techs = business.technologies as string[] | null
        if (Array.isArray(techs) && techs.includes('franchise_large')) score += rule.points
        break
      }
      case 'dental_blog_actualizado': {
        const techs = business.technologies as string[] | null
        if (Array.isArray(techs) && techs.includes('blog_active')) score += rule.points
        break
      }

      // ── Fisios ────────────────────────────────────────────────────────────
      case 'fisio_mutuas_visibles': {
        const techs = business.technologies as string[] | null
        if (Array.isArray(techs) && techs.includes('mutuas_listed')) score += rule.points
        break
      }
      case 'fisio_solo_telefono':
      case 'peluqueria_solo_telefono':
      case 'academia_sin_crm_alumnos':
      case 'gestoria_sin_cita_online':
        if (business.has_chatbot === false && !business.website) score += rule.points
        break
      case 'fisio_sin_online_booking': {
        const techs = business.technologies as string[] | null
        if (!Array.isArray(techs) || !techs.includes('online_booking')) score += rule.points
        break
      }

      // ── Peluquerías ───────────────────────────────────────────────────────
      case 'peluqueria_ig_2k': {
        const techs = business.technologies as string[] | null
        if (Array.isArray(techs) && techs.includes('ig_2k_plus')) score += rule.points
        break
      }
      case 'peluqueria_ig_bajo': {
        const techs = business.technologies as string[] | null
        if (Array.isArray(techs) && techs.includes('ig_under_500')) score += rule.points
        break
      }
      case 'peluqueria_precios_visibles':
      case 'taller_presupuesto_visible': {
        const techs = business.technologies as string[] | null
        if (Array.isArray(techs) && techs.includes('prices_visible')) score += rule.points
        break
      }

      // ── Estética ──────────────────────────────────────────────────────────
      case 'estetica_laser_implantos': {
        const pp = business.pain_points as string[] | null
        if (Array.isArray(pp) && (pp.includes('laser') || pp.includes('mesoterapia'))) score += rule.points
        break
      }
      case 'estetica_solo_instagram': {
        const techs = business.technologies as string[] | null
        if (!business.website && Array.isArray(techs) && techs.includes('instagram')) score += rule.points
        break
      }
      case 'estetica_booking_online': {
        const techs = business.technologies as string[] | null
        if (Array.isArray(techs) && (techs.includes('treatwell') || techs.includes('fresha'))) score += rule.points
        break
      }

      // ── Autoescuelas ──────────────────────────────────────────────────────
      case 'autoescuela_multiples_permisos': {
        const pp = business.pain_points as string[] | null
        if (Array.isArray(pp) && pp.length > 2) score += rule.points
        break
      }
      case 'autoescuela_solo_teoria':
      case 'autoescuela_sin_financiacion': {
        const techs = business.technologies as string[] | null
        if (!Array.isArray(techs) || !techs.includes('online_payment')) score += rule.points
        break
      }

      // ── Academias ─────────────────────────────────────────────────────────
      case 'academia_oposiciones': {
        const pp = business.pain_points as string[] | null
        if (Array.isArray(pp) && pp.includes('oposiciones')) score += rule.points
        break
      }
      case 'academia_selectividad': {
        const pp = business.pain_points as string[] | null
        if (Array.isArray(pp) && pp.includes('selectividad')) score += rule.points
        break
      }

      // ── Inmobiliarias ─────────────────────────────────────────────────────
      case 'inmobiliaria_propiedades_activas': {
        if (business.review_count !== null && business.review_count > 20) score += rule.points
        break
      }
      case 'inmobiliaria_equipo_visible': {
        const techs = business.technologies as string[] | null
        if (Array.isArray(techs) && techs.includes('team_page')) score += rule.points
        break
      }
      case 'inmobiliaria_fotos_amateur': {
        const techs = business.technologies as string[] | null
        if (Array.isArray(techs) && techs.includes('amateur_photos')) score += rule.points
        break
      }
      case 'inmobiliaria_sin_virtual_tour': {
        const techs = business.technologies as string[] | null
        if (!Array.isArray(techs) || !techs.includes('virtual_tour')) score += rule.points
        break
      }
      case 'franquicia_inmobiliaria': {
        const techs = business.technologies as string[] | null
        if (Array.isArray(techs) && techs.includes('franchise_large')) score += rule.points
        break
      }

      // ── Gestorías ─────────────────────────────────────────────────────────
      case 'gestoria_autonomos_pymes': {
        const pp = business.pain_points as string[] | null
        if (Array.isArray(pp) && (pp.includes('autonomos') || pp.includes('pymes'))) score += rule.points
        break
      }
      case 'gestoria_sin_portal_cliente': {
        const techs = business.technologies as string[] | null
        if (!Array.isArray(techs) || !techs.includes('client_portal')) score += rule.points
        break
      }

      // ── Talleres ──────────────────────────────────────────────────────────
      case 'taller_multiservicios': {
        const pp = business.pain_points as string[] | null
        if (Array.isArray(pp) && pp.length > 2) score += rule.points
        break
      }
      case 'taller_sin_web':
        if (!business.website) score += rule.points
        break
      case 'taller_oficial_marca': {
        const techs = business.technologies as string[] | null
        if (Array.isArray(techs) && techs.includes('official_brand_dealer')) score += rule.points
        break
      }

      // ── Comercios ─────────────────────────────────────────────────────────
      case 'comercio_sin_tienda_online': {
        const techs = business.technologies as string[] | null
        if (!Array.isArray(techs) || !techs.includes('ecommerce')) score += rule.points
        break
      }
      case 'comercio_google_shopping': {
        const techs = business.technologies as string[] | null
        if (!Array.isArray(techs) || !techs.includes('google_shopping')) score += rule.points
        break
      }
      case 'comercio_rrss_activas': {
        const techs = business.technologies as string[] | null
        if (Array.isArray(techs) && techs.includes('social_active')) score += rule.points
        break
      }
    }
  }

  return Math.min(100, Math.max(0, score))
}

export function scoreColor(score: number): string {
  if (score >= 75) return 'text-green-400'
  if (score >= 50) return 'text-amber-400'
  if (score >= 25) return 'text-orange-400'
  return 'text-zinc-400'
}

export function scoreBgColor(score: number): string {
  if (score >= 75) return 'bg-green-400/20 border-green-400/40 text-green-400'
  if (score >= 50) return 'bg-amber-400/20 border-amber-400/40 text-amber-400'
  if (score >= 25) return 'bg-orange-400/20 border-orange-400/40 text-orange-400'
  return 'bg-zinc-400/20 border-zinc-400/40 text-zinc-400'
}

export function scoreBorderLeft(score: number): string {
  if (score >= 75) return 'border-l-green-400'
  if (score >= 50) return 'border-l-amber-400'
  if (score >= 25) return 'border-l-orange-400'
  return 'border-l-zinc-600'
}

export function scoreLabel(score: number): 'priority' | 'approved' | 'nurture' | 'discard' {
  if (score >= 75) return 'priority'
  if (score >= 50) return 'approved'
  if (score >= 25) return 'nurture'
  return 'discard'
}
