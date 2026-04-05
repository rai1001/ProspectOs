import { describe, it, expect } from 'vitest'
import { transformApifyResult } from '../src/utils/apify'

describe('transformApifyResult', () => {
  it('maps basic fields correctly', () => {
    const result = transformApifyResult({
      title: 'Bar Pepe',
      address: 'Rúa Real 1, A Coruña',
      phone: '+34981234567',
      website: 'https://barpepe.es',
      totalScore: 4.3,
      reviewsCount: 120,
      categoryName: 'Restaurante',
      placeId: 'ChIJabc123',
    })

    expect(result.name).toBe('Bar Pepe')
    expect(result.address).toBe('Rúa Real 1, A Coruña')
    expect(result.sector).toBe('Restauración')
    expect(result.google_rating).toBe(4.3)
    expect(result.review_count).toBe(120)
    expect(result.has_google_business).toBe(true)
    expect(result.place_id).toBe('ChIJabc123')
  })

  it('detects mobile phone (Spanish mobile +346xx)', () => {
    const result = transformApifyResult({
      title: 'Test',
      phone: '+34612345678',
    })
    expect(result.mobile_phone).toBe('+34612345678')
    expect(result.phone).toBeNull() // landline should be null
  })

  it('detects landline phone (Spanish fixed +349xx)', () => {
    const result = transformApifyResult({
      title: 'Test',
      phone: '+34981234567',
    })
    expect(result.phone).toBe('+34981234567')
    expect(result.mobile_phone).toBeNull()
  })

  it('infers sector from category keywords', () => {
    expect(transformApifyResult({ title: 'X', categoryName: 'Peluquería unisex' }).sector).toBe('Peluquería / Estética')
    expect(transformApifyResult({ title: 'X', categoryName: 'Taller mecánico' }).sector).toBe('Taller / Automoción')
    expect(transformApifyResult({ title: 'X', categoryName: 'Clinica dental' }).sector).toBe('Clínica / Salud')
    expect(transformApifyResult({ title: 'X', categoryName: 'Unknown thing' }).sector).toBe('Otro')
  })

  it('handles missing fields gracefully', () => {
    const result = transformApifyResult({})
    expect(result.name).toBe('Sin nombre')
    expect(result.website).toBeNull()
    expect(result.google_rating).toBeNull()
    expect(result.review_count).toBeNull()
    expect(result.has_google_business).toBe(false)
    expect(result.sector).toBe('Otro')
  })

  it('preserves reviews array when present', () => {
    const result = transformApifyResult({
      title: 'Test',
      reviews: [{ name: 'Juan', text: 'Terrible service', stars: 1 }],
    })
    expect(result.reviews).toHaveLength(1)
    expect(result.reviews![0].text).toBe('Terrible service')
  })
})
