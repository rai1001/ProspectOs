/**
 * kit-parsing.test.ts
 *
 * Regression tests for:
 * - extractFirstJsonObject: bracket-counter JSON extraction (replaces greedy regex)
 * - parseKitJSON behavior via the extraction logic
 *
 * Bug: /\{[\s\S]*\}/ (greedy) matched from first '{' to LAST '}', causing
 * parse failures when LLMs append prose or secondary objects after the kit JSON.
 */

import { describe, it, expect } from 'vitest'

// Mirror of extractFirstJsonObject from Kit.tsx (not exported — tested inline)
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

function parseKitJSON(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    const extracted = extractFirstJsonObject(text)
    if (extracted) {
      try { return JSON.parse(extracted) as Record<string, unknown> } catch { /* fallthrough */ }
    }
    return null
  }
}

describe('extractFirstJsonObject (replaces greedy regex)', () => {
  it('extracts clean JSON object', () => {
    const text = '{"key": "value", "num": 42}'
    expect(extractFirstJsonObject(text)).toBe(text)
  })

  it('extracts JSON when prefixed with prose', () => {
    const text = 'Here is your kit: {"platform": "n8n", "steps": []}'
    const result = extractFirstJsonObject(text)
    expect(result).toBe('{"platform": "n8n", "steps": []}')
  })

  it('stops at the first balanced brace — not the last', () => {
    // Greedy regex would capture everything up to the last }
    const text = '{"kit": "data"} Note: {this is extra}'
    const result = extractFirstJsonObject(text)
    expect(result).toBe('{"kit": "data"}')
    expect(result).not.toContain('extra')
  })

  it('handles nested objects correctly', () => {
    const text = '{"outer": {"inner": {"deep": true}}, "x": 1}'
    expect(extractFirstJsonObject(text)).toBe(text)
  })

  it('returns null when no JSON object found', () => {
    expect(extractFirstJsonObject('no braces here')).toBeNull()
    expect(extractFirstJsonObject('')).toBeNull()
    expect(extractFirstJsonObject('[1, 2, 3]')).toBeNull()
  })

  it('returns null for unclosed object', () => {
    // Bracket counter never reaches depth 0 — returns null (safe fallback)
    expect(extractFirstJsonObject('{"unclosed": true')).toBeNull()
  })

  it('handles markdown-wrapped JSON when outer text has no extra braces', () => {
    const text = '```json\n{"result": "ok"}\n```'
    // The ``` are not braces — extraction still works
    const result = extractFirstJsonObject(text)
    expect(result).toBe('{"result": "ok"}')
  })
})

describe('parseKitJSON (full pipeline)', () => {
  it('parses clean JSON directly', () => {
    const result = parseKitJSON('{"platform": "n8n", "steps": []}')
    expect(result).toEqual({ platform: 'n8n', steps: [] })
  })

  it('parses JSON with prose prefix', () => {
    const result = parseKitJSON('Here is the kit:\n{"platform": "n8n"}')
    expect(result).toEqual({ platform: 'n8n' })
  })

  it('correctly handles JSON followed by a second object (regression: greedy bug)', () => {
    const text = '{"kit": "main"} Extra context: {not: json}'
    const result = parseKitJSON(text)
    expect(result).toEqual({ kit: 'main' })
  })

  it('returns null for unparseable text', () => {
    expect(parseKitJSON('This is just text')).toBeNull()
    expect(parseKitJSON('')).toBeNull()
  })

  it('parses deeply nested kit structure', () => {
    const kit = {
      platform: 'n8n',
      workflow_json: { nodes: [{ id: '1', type: 'trigger' }], connections: {} },
      client_summary: { business_name: 'Bar Manolo', headline: 'Automatiza tu bar' },
    }
    expect(parseKitJSON(JSON.stringify(kit))).toEqual(kit)
  })
})
