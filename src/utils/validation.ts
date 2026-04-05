/**
 * Shared input validation utilities.
 *
 * Exported here so they can be used in source files (forms, API handlers)
 * and imported directly in tests — no inline duplication.
 */

/**
 * Returns true for public HTTP/HTTPS URLs.
 * Blocks localhost, private IP ranges, and the AWS metadata endpoint.
 * Used to prevent SSRF via the CORS proxy in the web audit flow (SEC-002).
 */
export function isValidPublicUrl(input: string): boolean {
  try {
    const u = new URL(input.startsWith('http') ? input : `https://${input}`)
    if (!['http:', 'https:'].includes(u.protocol)) return false
    const host = u.hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return false
    if (host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('172.')) return false
    if (host === '169.254.169.254') return false // AWS metadata
    if (!host.includes('.')) return false // must have at least one dot
    return true
  } catch {
    return false
  }
}

/**
 * Returns true for valid Spanish mobile numbers (6xx or 7xx, 9 digits).
 * Accepts optional +34 prefix and common separators (spaces, dashes, parens).
 * Used in inbound lead forms (SEC-005).
 */
export function isValidSpanishPhone(phone: string): boolean {
  const clean = phone.replace(/[\s\-()]/g, '')
  return /^(\+34)?[67]\d{8}$/.test(clean)
}
