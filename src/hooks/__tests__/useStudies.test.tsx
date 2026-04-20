import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStudies } from '@/hooks/useStudies'

vi.mock('@/lib/studies', () => ({ subscribeStudies: vi.fn() }))
vi.mock('@/hooks/useSite', () => ({ useSite: vi.fn() }))

import * as studiesLib from '@/lib/studies'
import * as useSiteModule from '@/hooks/useSite'

const mockStudy = {
  id: 'study-1',
  name: 'Study Alpha',
  sponsor: 'Pharma',
  sponsorProtocolId: 'PC-001',
  therapeuticArea: 'Psychiatry',
  phase: 'Phase II' as const,
  status: 'enrolling' as const,
  siteId: 'tampa',
  piId: 'inv-1',
  assignedInvestigators: [],
  targetEnrollment: 20,
  startDate: '2026-01-01',
  expectedEndDate: '2026-12-31',
  visitSchedule: [],
  assessmentBattery: {},
  adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
  parsedFromProtocol: false,
  enrollmentData: { prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0 },
  statusHistory: [],
}

describe('useStudies', () => {
  beforeEach(() => {
    vi.mocked(useSiteModule.useSite).mockReturnValue({ siteId: 'tampa', setActiveSite: vi.fn() })
  })

  it('starts loading with empty studies', () => {
    vi.mocked(studiesLib.subscribeStudies).mockImplementation(() => () => {})
    const { result } = renderHook(() => useStudies())
    expect(result.current.loading).toBe(true)
    expect(result.current.studies).toEqual([])
  })

  it('sets studies when data arrives', async () => {
    vi.mocked(studiesLib.subscribeStudies).mockImplementation((_siteId, onData) => {
      onData([mockStudy])
      return () => {}
    })

    const { result } = renderHook(() => useStudies())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.studies).toEqual([mockStudy])
  })

  it('sets error when subscription fails', async () => {
    vi.mocked(studiesLib.subscribeStudies).mockImplementation((_siteId, _onData, onError) => {
      onError(new Error('permission denied'))
      return () => {}
    })

    const { result } = renderHook(() => useStudies())

    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.error?.message).toBe('permission denied')
  })
})
