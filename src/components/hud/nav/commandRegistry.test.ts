import { describe, it, expect } from 'vitest'
import { managementPages, staffPages, actionsForRole, filterCommands } from './commandRegistry'

describe('managementPages', () => {
  it('contains Overview', () => {
    expect(managementPages.find(p => p.id === 'overview')).toBeDefined()
  })
})

describe('staffPages', () => {
  it('contains My Dashboard and My Studies', () => {
    expect(staffPages.find(p => p.id === 'my-dashboard')).toBeDefined()
    expect(staffPages.find(p => p.id === 'my-studies')).toBeDefined()
  })
})

describe('actionsForRole', () => {
  it('exposes New Study to management only', () => {
    expect(actionsForRole('management').find(a => a.id === 'new-study')).toBeDefined()
    expect(actionsForRole('staff').find(a => a.id === 'new-study')).toBeUndefined()
  })
  it('exposes Log Visit to both', () => {
    expect(actionsForRole('management').find(a => a.id === 'log-visit')).toBeDefined()
    expect(actionsForRole('staff').find(a => a.id === 'log-visit')).toBeDefined()
  })
})

describe('filterCommands', () => {
  it('matches by title', () => {
    const r = filterCommands(managementPages, 'over')
    expect(r.find(p => p.id === 'overview')).toBeDefined()
  })
  it('matches by keywords', () => {
    const r = filterCommands(managementPages, 'pd')
    expect(r.find(p => p.id === 'deviations')).toBeDefined()
  })
  it('returns all when query empty', () => {
    expect(filterCommands(managementPages, '').length).toBe(managementPages.length)
  })
})
