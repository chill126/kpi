import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEnrollmentSnapshots } from '@/hooks/useEnrollmentSnapshots'

vi.mock('@/lib/enrollmentSnapshots', () => ({ subscribeEnrollmentSnapshots: vi.fn() }))
vi.mock('@/hooks/useSite', () => ({ useSite: vi.fn() }))

import * as snapshotsLib from '@/lib/enrollmentSnapshots'
import * as useSiteModule from '@/hooks/useSite'

const mockSnapshot = {
  id: 'snap-1',
  studyId: 'study-1',
  siteId: 'tampa',
  date: '2026-04-01',
  prescreens: 2,
  screens: 2,
  randomizations: 1,
  active: 1,
  completions: 0,
}

describe('useEnrollmentSnapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSiteModule.useSite).mockReturnValue({ siteId: 'tampa', setActiveSite: vi.fn() })
  })

  it('subscribes on mount with correct studyId and siteId', () => {
    vi.mocked(snapshotsLib.subscribeEnrollmentSnapshots).mockImplementation(() => () => {})
    renderHook(() => useEnrollmentSnapshots('study-1'))
    expect(snapshotsLib.subscribeEnrollmentSnapshots).toHaveBeenCalledWith(
      'study-1',
      'tampa',
      expect.any(Function),
      expect.any(Function),
    )
  })

  it('returns snapshots when data arrives', async () => {
    vi.mocked(snapshotsLib.subscribeEnrollmentSnapshots).mockImplementation(
      (_studyId, _siteId, onData) => {
        onData([mockSnapshot])
        return () => {}
      },
    )
    const { result } = renderHook(() => useEnrollmentSnapshots('study-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.snapshots).toEqual([mockSnapshot])
  })

  it('unsubscribes on unmount', () => {
    const unsubscribe = vi.fn()
    vi.mocked(snapshotsLib.subscribeEnrollmentSnapshots).mockImplementation(() => unsubscribe)
    const { unmount } = renderHook(() => useEnrollmentSnapshots('study-1'))
    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('skips subscription when studyId is empty', () => {
    vi.mocked(snapshotsLib.subscribeEnrollmentSnapshots).mockImplementation(() => () => {})
    renderHook(() => useEnrollmentSnapshots(''))
    expect(snapshotsLib.subscribeEnrollmentSnapshots).not.toHaveBeenCalled()
  })

  it('sets error when subscription fails', async () => {
    vi.mocked(snapshotsLib.subscribeEnrollmentSnapshots).mockImplementation(
      (_studyId, _siteId, _onData, onError) => {
        onError(new Error('permission denied'))
        return () => {}
      },
    )
    const { result } = renderHook(() => useEnrollmentSnapshots('study-1'))
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.error?.message).toBe('permission denied')
  })
})
