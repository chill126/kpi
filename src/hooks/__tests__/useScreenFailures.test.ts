import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useScreenFailures } from '@/hooks/useScreenFailures'

vi.mock('@/lib/screenFailures', () => ({ subscribeScreenFailures: vi.fn() }))
vi.mock('@/hooks/useSite', () => ({ useSite: vi.fn() }))

import * as screenFailuresLib from '@/lib/screenFailures'
import * as useSiteModule from '@/hooks/useSite'

const mockFailure = {
  id: 'sf-1',
  studyId: 'study-1',
  siteId: 'tampa',
  date: '2026-04-01',
  reasons: [{ category: 'inclusion_criteria' }],
}

describe('useScreenFailures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSiteModule.useSite).mockReturnValue({ siteId: 'tampa', setActiveSite: vi.fn() })
  })

  it('subscribes on mount with correct studyId and siteId', () => {
    vi.mocked(screenFailuresLib.subscribeScreenFailures).mockImplementation(() => () => {})
    renderHook(() => useScreenFailures('study-1'))
    expect(screenFailuresLib.subscribeScreenFailures).toHaveBeenCalledWith(
      'study-1',
      'tampa',
      expect.any(Function),
      expect.any(Function),
    )
  })

  it('returns failures when data arrives', async () => {
    vi.mocked(screenFailuresLib.subscribeScreenFailures).mockImplementation(
      (_studyId, _siteId, onData) => {
        onData([mockFailure])
        return () => {}
      },
    )
    const { result } = renderHook(() => useScreenFailures('study-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.failures).toEqual([mockFailure])
  })

  it('unsubscribes on unmount', () => {
    const unsubscribe = vi.fn()
    vi.mocked(screenFailuresLib.subscribeScreenFailures).mockImplementation(() => unsubscribe)
    const { unmount } = renderHook(() => useScreenFailures('study-1'))
    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('sets error when subscription fails', async () => {
    vi.mocked(screenFailuresLib.subscribeScreenFailures).mockImplementation(
      (_studyId, _siteId, _onData, onError) => {
        onError(new Error('permission denied'))
        return () => {}
      },
    )
    const { result } = renderHook(() => useScreenFailures('study-1'))
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.error?.message).toBe('permission denied')
  })
})
