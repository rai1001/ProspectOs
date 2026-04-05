import { describe, it, expect } from 'vitest'
import { calculateScore, scoreColor, scoreBgColor, scoreBorderLeft } from '../src/utils/scoring'
import type { Business, ScoringRule } from '../src/lib/supabase'

// Minimal business factory
function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: 'test-1',
    name: 'Test Biz',
    sector: 'Restauración',
    address: null,
    phone: null,
    mobile_phone: null,
    website: 'https://example.com',
    website_outdated: false,
    google_rating: 4.5,
    review_count: 50,
    has_google_business: true,
    place_id: null,
    source: 'manual',
    created_at: new Date().toISOString(),
    has_chatbot: true,
    pain_points: null,
    technologies: null,
    ...overrides,
  } as Business
}

function makeRule(condition: string, points: number, enabled = true): ScoringRule {
  return {
    id: `rule-${condition}`,
    condition,
    label: condition,
    points,
    enabled,
    created_at: new Date().toISOString(),
  } as ScoringRule
}

describe('calculateScore', () => {
  it('returns 0 when no rules match', () => {
    const biz = makeBusiness({ website: 'https://foo.com', google_rating: 5.0, review_count: 100 })
    const rules = [makeRule('no_website', 20)]
    expect(calculateScore(biz, rules)).toBe(0)
  })

  it('adds points for no_website', () => {
    const biz = makeBusiness({ website: null })
    const rules = [makeRule('no_website', 25)]
    expect(calculateScore(biz, rules)).toBe(25)
  })

  it('adds points for low_rating when rating < 4.0', () => {
    const biz = makeBusiness({ google_rating: 3.2 })
    const rules = [makeRule('low_rating', 15)]
    expect(calculateScore(biz, rules)).toBe(15)
  })

  it('does NOT add low_rating when rating >= 4.0', () => {
    const biz = makeBusiness({ google_rating: 4.0 })
    const rules = [makeRule('low_rating', 15)]
    expect(calculateScore(biz, rules)).toBe(0)
  })

  it('adds points for no_chatbot when has_chatbot is false', () => {
    const biz = makeBusiness({ has_chatbot: false })
    const rules = [makeRule('no_chatbot', 20)]
    expect(calculateScore(biz, rules)).toBe(20)
  })

  it('adds points for has_pain_points when array is non-empty', () => {
    const biz = makeBusiness({ pain_points: ['slow service', 'cold food'] })
    const rules = [makeRule('has_pain_points', 30)]
    expect(calculateScore(biz, rules)).toBe(30)
  })

  it('ignores disabled rules', () => {
    const biz = makeBusiness({ website: null })
    const rules = [makeRule('no_website', 25, false)]
    expect(calculateScore(biz, rules)).toBe(0)
  })

  it('caps score at 100', () => {
    const biz = makeBusiness({
      website: null,
      has_chatbot: false,
      pain_points: ['issue'],
      google_rating: 2.0,
      review_count: 5,
      mobile_phone: null,
    })
    const rules = [
      makeRule('no_website', 30),
      makeRule('no_chatbot', 30),
      makeRule('has_pain_points', 30),
      makeRule('low_rating', 30),
      makeRule('low_reviews', 30),
      makeRule('no_mobile_phone', 30),
    ]
    expect(calculateScore(biz, rules)).toBe(100)
  })

  it('accumulates multiple matching rules', () => {
    const biz = makeBusiness({ website: null, google_rating: 3.0 })
    const rules = [makeRule('no_website', 20), makeRule('low_rating', 15)]
    expect(calculateScore(biz, rules)).toBe(35)
  })
})

describe('scoreColor', () => {
  it('returns green for score >= 70', () => {
    expect(scoreColor(70)).toBe('text-green-400')
    expect(scoreColor(100)).toBe('text-green-400')
  })

  it('returns amber for score 40-69', () => {
    expect(scoreColor(40)).toBe('text-amber-400')
    expect(scoreColor(69)).toBe('text-amber-400')
  })

  it('returns zinc for score < 40', () => {
    expect(scoreColor(0)).toBe('text-zinc-400')
    expect(scoreColor(39)).toBe('text-zinc-400')
  })
})

describe('scoreBorderLeft', () => {
  it('returns correct border colors by threshold', () => {
    expect(scoreBorderLeft(80)).toBe('border-l-green-400')
    expect(scoreBorderLeft(50)).toBe('border-l-amber-400')
    expect(scoreBorderLeft(10)).toBe('border-l-zinc-600')
  })
})
