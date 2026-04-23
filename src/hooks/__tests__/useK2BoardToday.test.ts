import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Top-level vi.mock is hoisted by Vitest before any imports.
// Avoid importing Firebase types inside the factory — Firebase is not initialized in tests.
vi.mock('@/lib/k2Board', () => ({
  subscribeK2BoardToday: (
    onData: (entries: unknown[]) => void,
    _onError: (e: Error) => void,
  ) => {
    onData([
      {
        id: 'e1',
        subjectId: 'S-001',
        study: 'PINE',
        status: 'checked_in',
        investigatorIds: ['inv_wilson'],
        urgency: 'normal',
        // Plain object stands in for Timestamp — tests never call .toDate()
        createdAt: { seconds: 0, nanoseconds: 0 },
        createdBy: 'anon',
      },
    ])
    return vi.fn()
  },
  K2_LIVE_RATE_LIMIT: 10,
  K2_INVESTIGATOR_NAMES: { inv_wilson: 'Wilson' },
  computeVisitDurationMin: vi.fn().mockReturnValue(null),
  reconstructDateTime: vi.fn().mockReturnValue(new Date()),
}))

import { useK2BoardToday } from '../useK2BoardToday'

describe('useK2BoardToday', () => {
  it('returns entries from the k2-board subscription', () => {
    const { result } = renderHook(() => useK2BoardToday())
    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].study).toBe('PINE')
    expect(result.current.entries[0].subjectId).toBe('S-001')
  })

  it('is not loading after first snapshot arrives', () => {
    const { result } = renderHook(() => useK2BoardToday())
    expect(result.current.loading).toBe(false)
  })

  it('circuit is closed on normal traffic', () => {
    const { result } = renderHook(() => useK2BoardToday())
    expect(result.current.circuitOpen).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('always returns an array (not null) even before data arrives', () => {
    const { result } = renderHook(() => useK2BoardToday())
    expect(Array.isArray(result.current.entries)).toBe(true)
  })
})
