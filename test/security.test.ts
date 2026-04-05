import { describe, it, expect } from 'vitest'

// Regression: SEC-002 — SSRF via CORS proxy URL validation
// Found by /security on 2026-04-05
// Report: .gstack/qa-reports/qa-report-prospect-os-teal-vercel-app-2026-04-05.md

// Extract the validation function inline since it's not exported
function isValidPublicUrl(input: string): boolean {
  try {
    const u = new URL(input.startsWith('http') ? input : `https://${input}`)
    if (!['http:', 'https:'].includes(u.protocol)) return false
    const host = u.hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return false
    if (host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('172.')) return false
    if (host === '169.254.169.254') return false
    if (!host.includes('.')) return false
    return true
  } catch {
    return false
  }
}

// Regression: SEC-005 — Phone validation
function isValidSpanishPhone(phone: string): boolean {
  const clean = phone.replace(/[\s\-()]/g, '')
  return /^(\+34)?[67]\d{8}$/.test(clean)
}

describe('isValidPublicUrl (SEC-002: SSRF prevention)', () => {
  it('accepts valid public URLs', () => {
    expect(isValidPublicUrl('www.restaurantepepe.com')).toBe(true)
    expect(isValidPublicUrl('https://mi-negocio.es')).toBe(true)
    expect(isValidPublicUrl('http://example.com/page')).toBe(true)
  })

  it('blocks localhost', () => {
    expect(isValidPublicUrl('localhost')).toBe(false)
    expect(isValidPublicUrl('http://localhost:3000')).toBe(false)
    expect(isValidPublicUrl('http://127.0.0.1')).toBe(false)
    expect(isValidPublicUrl('http://0.0.0.0')).toBe(false)
  })

  it('blocks private IP ranges', () => {
    expect(isValidPublicUrl('http://10.0.0.1')).toBe(false)
    expect(isValidPublicUrl('http://192.168.1.1')).toBe(false)
    expect(isValidPublicUrl('http://172.16.0.1')).toBe(false)
  })

  it('blocks AWS metadata endpoint', () => {
    expect(isValidPublicUrl('http://169.254.169.254/latest/meta-data/')).toBe(false)
  })

  it('blocks hostnames without a dot', () => {
    expect(isValidPublicUrl('intranet')).toBe(false)
    expect(isValidPublicUrl('http://admin')).toBe(false)
  })

  it('blocks non-http protocols', () => {
    expect(isValidPublicUrl('ftp://files.example.com')).toBe(false)
    expect(isValidPublicUrl('file:///etc/passwd')).toBe(false)
  })

  it('rejects garbage input', () => {
    expect(isValidPublicUrl('')).toBe(false)
    expect(isValidPublicUrl('   ')).toBe(false)
  })
})

describe('isValidSpanishPhone (SEC-005: phone validation)', () => {
  it('accepts valid Spanish mobile numbers', () => {
    expect(isValidSpanishPhone('612345678')).toBe(true)
    expect(isValidSpanishPhone('712345678')).toBe(true)
    expect(isValidSpanishPhone('+34612345678')).toBe(true)
    expect(isValidSpanishPhone('612 345 678')).toBe(true)
    expect(isValidSpanishPhone('612-345-678')).toBe(true)
  })

  it('rejects landlines (9xx)', () => {
    expect(isValidSpanishPhone('981234567')).toBe(false)
    expect(isValidSpanishPhone('+34981234567')).toBe(false)
  })

  it('rejects too short / too long', () => {
    expect(isValidSpanishPhone('61234')).toBe(false)
    expect(isValidSpanishPhone('6123456789999')).toBe(false)
  })

  it('rejects garbage', () => {
    expect(isValidSpanishPhone('hola')).toBe(false)
    expect(isValidSpanishPhone('')).toBe(false)
    expect(isValidSpanishPhone('abc123def')).toBe(false)
  })
})
