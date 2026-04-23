import { describe, it, expect } from 'vitest'
import firebaseJson from '../../firebase.json'

describe('firebase.json security headers', () => {
  const catchAll = (firebaseJson.hosting.headers as Array<{
    source: string
    headers: Array<{ key: string; value: string }>
  }>).find(h => h.source === '**')

  const header = (key: string): string | undefined =>
    catchAll?.headers.find(h => h.key === key)?.value

  it('has Content-Security-Policy with required directives', () => {
    const csp = header('Content-Security-Policy') ?? ''
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain('fonts.googleapis.com')
    expect(csp).toContain('fonts.gstatic.com')
    expect(csp).toContain('*.googleapis.com')
    expect(csp).toContain("form-action 'self'")
    expect(csp).toContain("script-src 'self'")
  })

  it('has X-Frame-Options DENY', () => {
    expect(header('X-Frame-Options')).toBe('DENY')
  })

  it('has X-Content-Type-Options nosniff', () => {
    expect(header('X-Content-Type-Options')).toBe('nosniff')
  })

  it('has Referrer-Policy', () => {
    expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
  })

  it('has Permissions-Policy disabling camera, mic, geolocation', () => {
    const pp = header('Permissions-Policy') ?? ''
    expect(pp).toContain('camera=()')
    expect(pp).toContain('microphone=()')
    expect(pp).toContain('geolocation=()')
  })

  it('has HSTS with min 1-year max-age', () => {
    const hsts = header('Strict-Transport-Security') ?? ''
    expect(hsts).toContain('max-age=31536000')
    expect(hsts).toContain('includeSubDomains')
  })
})
