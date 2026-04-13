import type { Business, ScoringRule } from '../lib/supabase'
import { HIGH_CALL_SECTORS } from '../constants/sectors'

/**
 * Calculates the lead score for a business based on active scoring rules.
 * Returns a value between 0 and 100.
 */
export function calculateScore(business: Business, rules: ScoringRule[]): number {
  const activeRules = rules.filter(r => r.enabled)
  let score = 0

  for (const rule of activeRules) {
    switch (rule.condition) {
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
      case 'web_slow_or_old':
        if (business.technologies && Array.isArray(business.technologies)) {
          const techs = business.technologies as string[]
          if (techs.includes('outdated_cms') || techs.includes('slow_loading')) score += rule.points
        }
        break
      case 'no_review_responses':
        if ((business as any).response_rate !== null && (business as any).response_rate !== undefined && (business as any).response_rate < 20) score += rule.points
        break
    }
  }

  return Math.min(score, 100)
}

export function scoreColor(score: number): string {
  if (score >= 70) return 'text-green-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-zinc-400'
}

export function scoreBgColor(score: number): string {
  if (score >= 70) return 'bg-green-400/20 border-green-400/40 text-green-400'
  if (score >= 40) return 'bg-amber-400/20 border-amber-400/40 text-amber-400'
  return 'bg-zinc-400/20 border-zinc-400/40 text-zinc-400'
}

export function scoreBorderLeft(score: number): string {
  if (score >= 70) return 'border-l-green-400'
  if (score >= 40) return 'border-l-amber-400'
  return 'border-l-zinc-600'
}
