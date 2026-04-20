import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useInvestigators } from '@/hooks/useInvestigators'

vi.mock('@/lib/investigators', () => ({ subscribeInvestigators: vi.fn() }))
vi.mock('@/hooks/useSite', () => ({ useSite: vi.fn() }))

import * as investigatorsLib from '@/lib/investigators'
import * as useSiteModule from '@/hooks/useSite'

const mockInvestigator = {
  id: 'inv-1',
  name: 'Dr. Kelley Wilson',
  credentials: 'MD',
  role: 'PI' as const,
  siteId: 'tampa',
  weeklyCapacityHours: 40,
  siteBaselinePct: 15,
  assignedStudies: [],
}

describe('useInvestigators', () => {
  beforeEach(() => {
    vi.mocked(useSiteModule.useSite).mockReturnValue({ siteId: 'tampa', setActiveSite: vi.fn() })
  })

  it('returns investigators when data arrives', async () => {
    vi.mocked(investigatorsLib.subscribeInvestigators).mockImplementation((_siteId, onData) => {
      onData([mockInvestigator])
      return () => {}
    })

    const { result } = renderHook(() => useInvestigators())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.investigators).toEqual([mockInvestigator])
  })
})
