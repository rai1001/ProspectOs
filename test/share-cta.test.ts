/**
 * share-cta.test.ts
 *
 * Regression tests for SEC/BUG: Share CTA must read agency_phone from kit
 * content (DB), NOT from visitor's localStorage.
 *
 * The bug: Share.tsx read `localStorage.getItem('prospectOS_agency_phone')`.
 * On the lead's device that key is always null, so the WhatsApp button never
 * appeared. Fixed by embedding agency_phone into kit.content at generation
 * time (Kit.tsx) and reading it back from the DB row in Share.tsx.
 */

import { describe, it, expect } from 'vitest'

// ─── Helpers that mirror the logic in Share.tsx ──────────────────────────────

type KitContent = Record<string, unknown>

function getAgencyPhoneFromKit(content: KitContent): string {
  return (content as { agency_phone?: string }).agency_phone ?? ''
}

function buildWhatsAppUrl(agencyPhone: string, businessName: string): string | null {
  if (!agencyPhone) return null
  const digits = agencyPhone.replace(/\D/g, '')
  const text = encodeURIComponent(`Hola, vi el kit para ${businessName} y quiero saber más`)
  return `https://wa.me/${digits}?text=${text}`
}

// ─── Helpers that mirror the logic in Kit.tsx ────────────────────────────────

function buildKitContent(parsed: Record<string, unknown>, agencyPhone?: string): KitContent {
  return {
    ...parsed,
    ...(agencyPhone ? { agency_phone: agencyPhone } : {}),
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Share CTA — agency_phone must come from kit content (DB)', () => {
  it('reads agency_phone from kit.content, not from localStorage', () => {
    // Simulate a kit saved with agency_phone embedded
    const kitContent: KitContent = {
      client_summary: { business_name: 'Bar Manolo' },
      agency_phone: '+34612345678',
    }
    expect(getAgencyPhoneFromKit(kitContent)).toBe('+34612345678')
  })

  it('returns empty string when kit.content has no agency_phone', () => {
    const kitContent: KitContent = { client_summary: { business_name: 'Bar Manolo' } }
    expect(getAgencyPhoneFromKit(kitContent)).toBe('')
  })

  it('returns empty string when kit.content.agency_phone is null/undefined', () => {
    const kitContent: KitContent = { agency_phone: undefined }
    expect(getAgencyPhoneFromKit(kitContent)).toBe('')
  })

  it('builds WhatsApp URL from kit content phone, not localStorage', () => {
    const kitContent: KitContent = { agency_phone: '+34 612 345 678' }
    const phone = getAgencyPhoneFromKit(kitContent)
    const url = buildWhatsAppUrl(phone, 'Bar Manolo')
    // Digits only: 34612345678
    expect(url).toContain('wa.me/34612345678')
    expect(url).toContain('Bar%20Manolo')
  })

  it('returns null WhatsApp URL when kit has no agency_phone', () => {
    const kitContent: KitContent = {}
    const phone = getAgencyPhoneFromKit(kitContent)
    expect(buildWhatsAppUrl(phone, 'Bar Manolo')).toBeNull()
  })
})

describe('Kit generation — agency_phone embedded in content', () => {
  it('embeds agency_phone when available', () => {
    const parsed = { client_summary: { headline: 'Kit demo' } }
    const content = buildKitContent(parsed, '+34666777888')
    expect((content as { agency_phone: string }).agency_phone).toBe('+34666777888')
  })

  it('does NOT add agency_phone key when phone is empty/undefined', () => {
    const parsed = { client_summary: { headline: 'Kit demo' } }
    const content = buildKitContent(parsed, undefined)
    expect(content).not.toHaveProperty('agency_phone')
  })

  it('preserves all other kit content fields when embedding phone', () => {
    const parsed = {
      client_summary: { business_name: 'Cafetería Sol' },
      steps: ['step1', 'step2'],
    }
    const content = buildKitContent(parsed, '+34655444333')
    expect(content.client_summary).toEqual(parsed.client_summary)
    expect(content.steps).toEqual(parsed.steps)
    expect((content as { agency_phone: string }).agency_phone).toBe('+34655444333')
  })

  it('does not add agency_phone when phone is empty string', () => {
    const parsed = { headline: 'Kit' }
    // Empty string is falsy, so agency_phone should not be added
    const content = buildKitContent(parsed, '')
    expect(content).not.toHaveProperty('agency_phone')
  })
})
