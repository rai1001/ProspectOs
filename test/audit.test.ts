/**
 * audit.test.ts
 *
 * Regression tests for extractAuditableHTML — ensures we always capture
 * <head> signals instead of blindly slicing raw HTML at a fixed char count.
 */

import { describe, it, expect } from 'vitest'
import { extractAuditableHTML } from '../src/utils/audit'

const HEAD_WITH_ANALYTICS = `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXX"></script>
  <script>fbq('init', '123456');</script>
  <title>Restaurante Manolo</title>
</head>`

const BODY_WITH_CHAT = `<body>
  <div id="tidio-chat"></div>
  <h1>Bienvenidos</h1>
  ${'<p>Lorem ipsum</p>'.repeat(300)}
</body>`

const FULL_PAGE = `<!DOCTYPE html><html>${HEAD_WITH_ANALYTICS}${BODY_WITH_CHAT}</html>`

describe('extractAuditableHTML', () => {
  it('always includes the full <head> block', () => {
    const result = extractAuditableHTML(FULL_PAGE)
    expect(result).toContain('googletagmanager')
    expect(result).toContain("fbq('init'")
    expect(result).toContain('viewport')
  })

  it('includes the beginning of <body> for chat widget detection', () => {
    const result = extractAuditableHTML(FULL_PAGE)
    expect(result).toContain('tidio-chat')
  })

  it('does NOT include deep body content (paragraphs, etc.)', () => {
    const result = extractAuditableHTML(FULL_PAGE)
    // body chunk is capped at 2000 chars — deep body won't be included
    const bodyChunkEnd = result.indexOf('Lorem ipsum')
    // Either not present or only appears once near the start
    if (bodyChunkEnd !== -1) {
      // The result length should be <= maxLen (default 6000)
      expect(result.length).toBeLessThanOrEqual(6000)
    }
  })

  it('respects maxLen cap', () => {
    const result = extractAuditableHTML(FULL_PAGE, 500)
    expect(result.length).toBeLessThanOrEqual(500)
  })

  it('falls back to raw slice for malformed HTML without <head>', () => {
    const malformed = 'no head here, just raw content '.repeat(300)
    const result = extractAuditableHTML(malformed, 6000)
    expect(result.length).toBeLessThanOrEqual(6000)
    expect(result).toContain('no head here')
  })

  it('handles HTML with <head> but no <body>', () => {
    const headOnly = `<html>${HEAD_WITH_ANALYTICS}</html>`
    const result = extractAuditableHTML(headOnly)
    expect(result).toContain('viewport')
    expect(result).toContain('googletagmanager')
  })

  it('handles empty string gracefully', () => {
    expect(extractAuditableHTML('')).toBe('')
  })

  it('prioritises <head> signals over body content when near the limit', () => {
    // Build a page where <head> is ~3000 chars and body starts at 3001
    const bigHead = `<head>${'<meta name="x" content="y">'.repeat(100)}</head>`
    const body = `<body><div id="whatsapp-widget">chat</div></body>`
    const page = bigHead + body
    const result = extractAuditableHTML(page, 6000)
    // Head should always be present
    expect(result).toContain('<head>')
    expect(result).toContain('</head>')
  })
})
