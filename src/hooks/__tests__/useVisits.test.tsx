import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useVisits } from '@/hooks/useVisits'

vi.mock('@/lib/visits', () => ({ subscribeStudyVisits: vi.fn() }))
vi.mock('@/hooks/useSite', () => ({ useSite: vi.fn() }))

import * as visitsLib from '@/lib/visits'
import * as useSiteModule from '@/hooks/useSite'

describe('useVisits', () => {
  beforeEach(() => {
    vi.mocked(useSiteModule.useSite).mockReturnValue({ siteId: 'tampa', setActiveSite: vi.fn() })
  })

  it('returns visits for the given study', async () => {
    const mockVisit = {
      id: 'v-1',
      participantId: 'P001',
      studyId: 'study-1',
      investigatorId: 'inv-1',
      siteId: 'tampa',
      visitType: 'Screening',
      scheduledDate: '2026-05-01',
      completedDate: null,
      status: 'completed' as const,
      durationMinutes: 60,
      actualDurationMinutes: null,
      source: 'manual' as const,
    }

    vi.mocked(visitsLib.subscribeStudyVisits).mockImplementation((_s, _sid, onData) => {
      onData([mockVisit])
      return () => {}
    })

    const { result } = renderHook(() => useVisits('study-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.visits).toEqual([mockVisit])
  })
})
