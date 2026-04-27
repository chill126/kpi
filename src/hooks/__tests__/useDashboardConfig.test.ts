import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/context/AuthContext', () => ({
  useAuthContext: vi.fn(),
}))
vi.mock('@/lib/users', () => ({
  subscribeUser: vi.fn(),
  updateUser: vi.fn().mockResolvedValue(undefined),
}))

import * as authCtx from '@/context/AuthContext'
import * as usersLib from '@/lib/users'
import { useDashboardConfig, DEFAULT_DASHBOARD_CONFIG, mergeDashboardConfig, ALL_TILE_IDS } from '@/hooks/useDashboardConfig'
import type { AppUser } from '@/types'

const mockManagementUser: AppUser = {
  uid: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'management',
  siteId: 'tampa',
  assignedStudies: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(authCtx.useAuthContext).mockReturnValue({
    user: mockManagementUser,
    role: 'management',
    loading: false,
  })
  vi.mocked(usersLib.subscribeUser).mockReturnValue(() => {})
})

describe('mergeDashboardConfig', () => {
  it('keeps all tile IDs when stored config is complete', () => {
    const result = mergeDashboardConfig(DEFAULT_DASHBOARD_CONFIG)
    expect(result.tiles).toHaveLength(ALL_TILE_IDS.length)
    expect(result.tiles.map(t => t.id).sort()).toEqual([...ALL_TILE_IDS].sort())
  })

  it('adds missing tile IDs with visible:true appended at end', () => {
    const partial = { tiles: [{ id: 'studies' as const, visible: true, order: 0 }] }
    const result = mergeDashboardConfig(partial)
    expect(result.tiles).toHaveLength(ALL_TILE_IDS.length)
    expect(result.tiles.map(t => t.id)).toContain('today-activity')
    expect(result.tiles.map(t => t.id)).toContain('enrollment')
    const added = result.tiles.find(t => t.id === 'today-activity')!
    expect(added.visible).toBe(true)
  })

  it('strips unknown tile IDs from stored config', () => {
    const withUnknown = {
      tiles: [
        { id: 'studies' as const, visible: false, order: 0 },
        { id: 'mystery-tile' as unknown as 'studies', visible: true, order: 1 },
      ],
    }
    const result = mergeDashboardConfig(withUnknown)
    expect(result.tiles.map(t => t.id)).not.toContain('mystery-tile')
  })

  it('preserves visible:false on stored tiles', () => {
    const partial = {
      tiles: ALL_TILE_IDS.map((id, i) => ({ id, visible: id === 'today-activity' ? false : true, order: i })),
    }
    const result = mergeDashboardConfig(partial)
    const tile = result.tiles.find(t => t.id === 'today-activity')!
    expect(tile.visible).toBe(false)
  })
})

describe('useDashboardConfig', () => {
  it('returns DEFAULT_DASHBOARD_CONFIG on initial render', () => {
    const { result } = renderHook(() => useDashboardConfig())
    expect(result.current.config.tiles).toHaveLength(ALL_TILE_IDS.length)
    expect(result.current.config.tiles.every(t => t.visible)).toBe(true)
  })

  it('subscribes to user doc using uid from AuthContext', () => {
    renderHook(() => useDashboardConfig())
    expect(usersLib.subscribeUser).toHaveBeenCalledWith(
      'user-1',
      expect.any(Function),
      expect.any(Function),
    )
  })

  it('unsubscribes on unmount', () => {
    const unsub = vi.fn()
    vi.mocked(usersLib.subscribeUser).mockReturnValue(unsub)
    const { unmount } = renderHook(() => useDashboardConfig())
    unmount()
    expect(unsub).toHaveBeenCalled()
  })

  it('saveConfig calls updateUser with dashboardConfig', async () => {
    const { result } = renderHook(() => useDashboardConfig())
    await act(async () => {
      await result.current.saveConfig(DEFAULT_DASHBOARD_CONFIG)
    })
    expect(usersLib.updateUser).toHaveBeenCalledWith('user-1', {
      dashboardConfig: DEFAULT_DASHBOARD_CONFIG,
    })
  })

  it('saveConfig is a no-op when user is null', async () => {
    vi.mocked(authCtx.useAuthContext).mockReturnValue({ user: null, role: null, loading: false })
    const { result } = renderHook(() => useDashboardConfig())
    await act(async () => {
      await result.current.saveConfig(DEFAULT_DASHBOARD_CONFIG)
    })
    expect(usersLib.updateUser).not.toHaveBeenCalled()
  })
})
