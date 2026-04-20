import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'

vi.mock('@/lib/visits', () => ({ subscribeSiteVisits: vi.fn() }))
vi.mock('@/lib/assessments', () => ({ subscribeSiteAssessments: vi.fn() }))
vi.mock('@/hooks/useSite', () => ({ useSite: vi.fn() }))

import * as visitsLib from '@/lib/visits'
import * as assessmentsLib from '@/lib/assessments'
import * as useSiteModule from '@/hooks/useSite'

const mockVisit = {
  id: 'v-1', participantId: 'P001', studyId: 'study-1', investigatorId: 'inv-1', siteId: 'tampa',
  visitType: 'Screening', scheduledDate: '2026-04-14', completedDate: '2026-04-14',
  status: 'completed' as const, durationMinutes: 45, actualDurationMinutes: null, source: 'manual' as const,
}

const mockAssessment = {
  id: 'a-1', investigatorId: 'inv-1', studyId: 'study-1', siteId: 'tampa',
  visitId: null, scaleType: 'HAMD-17', durationMinutes: 20, date: '2026-04-14',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useSiteModule.useSite).mockReturnValue({ siteId: 'tampa', setActiveSite: vi.fn() })
})

describe('useSiteVisits', () => {
  it('starts loading with empty visits', () => {
    vi.mocked(visitsLib.subscribeSiteVisits).mockImplementation(() => () => {})
    const { result } = renderHook(() => useSiteVisits())
    expect(result.current.loading).toBe(true)
    expect(result.current.visits).toEqual([])
  })

  it('sets visits when data arrives', async () => {
    vi.mocked(visitsLib.subscribeSiteVisits).mockImplementation((_siteId, onData) => {
      onData([mockVisit])
      return () => {}
    })
    const { result } = renderHook(() => useSiteVisits())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.visits).toEqual([mockVisit])
  })

  it('sets error when subscription fails', async () => {
    vi.mocked(visitsLib.subscribeSiteVisits).mockImplementation((_siteId, _onData, onError) => {
      onError(new Error('permission denied'))
      return () => {}
    })
    const { result } = renderHook(() => useSiteVisits())
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.error?.message).toBe('permission denied')
  })
})

describe('useSiteAssessments', () => {
  it('starts loading with empty assessments', () => {
    vi.mocked(assessmentsLib.subscribeSiteAssessments).mockImplementation(() => () => {})
    const { result } = renderHook(() => useSiteAssessments())
    expect(result.current.loading).toBe(true)
    expect(result.current.assessments).toEqual([])
  })

  it('sets assessments when data arrives', async () => {
    vi.mocked(assessmentsLib.subscribeSiteAssessments).mockImplementation((_siteId, onData) => {
      onData([mockAssessment])
      return () => {}
    })
    const { result } = renderHook(() => useSiteAssessments())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.assessments).toEqual([mockAssessment])
  })
})
