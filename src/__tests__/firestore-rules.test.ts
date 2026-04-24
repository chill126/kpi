import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const rules = readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf-8')

describe('firestore.rules — observability collections', () => {
  it('has errorLog rule', () => {
    expect(rules).toContain('match /errorLog/{docId}')
  })

  it('errorLog allows read only for management', () => {
    const idx = rules.indexOf('match /errorLog/{docId}')
    const section = rules.slice(idx, idx + 200)
    expect(section).toContain('allow read: if isManagement()')
    expect(section).not.toContain('allow read: if isAuthenticated()')
  })

  it('errorLog allows create for authenticated users', () => {
    const idx = rules.indexOf('match /errorLog/{docId}')
    const section = rules.slice(idx, idx + 200)
    expect(section).toContain('allow create: if isAuthenticated()')
  })

  it('has auditLog rule', () => {
    expect(rules).toContain('match /auditLog/{docId}')
  })

  it('auditLog allows read only for management', () => {
    const idx = rules.indexOf('match /auditLog/{docId}')
    const section = rules.slice(idx, idx + 200)
    expect(section).toContain('allow read: if isManagement()')
    expect(section).not.toContain('allow read: if isAuthenticated()')
  })

  it('auditLog allows create for authenticated users', () => {
    const idx = rules.indexOf('match /auditLog/{docId}')
    const section = rules.slice(idx, idx + 200)
    expect(section).toContain('allow create: if isAuthenticated()')
  })
})
