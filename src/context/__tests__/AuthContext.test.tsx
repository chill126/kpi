import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuth } from '@/hooks/useAuth'
import { AuthProvider } from '@/context/AuthContext'
import type { ReactNode } from 'react'

vi.mock('@/lib/firebase', () => ({
  auth: {
    onAuthStateChanged: vi.fn(),
    currentUser: null,
  },
}))

vi.mock('@/lib/auth', () => ({
  getAppUser: vi.fn(),
}))

// Grab the mocked modules after hoisting
import * as firebaseModule from '@/lib/firebase'
import * as authModule from '@/lib/auth'

const mockedAuth = vi.mocked(firebaseModule.auth)
const mockedGetAppUser = vi.mocked(authModule.getAppUser)

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts with loading true and no user', () => {
    vi.mocked(mockedAuth.onAuthStateChanged).mockImplementation((_cb: unknown) => {
      return () => {}
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it('sets user to null when not authenticated', async () => {
    vi.mocked(mockedAuth.onAuthStateChanged).mockImplementation((cb: unknown) => {
      ;(cb as (u: null) => void)(null)
      return () => {}
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.user).toBeNull()
  })

  it('sets user when authenticated', async () => {
    const mockAppUser = {
      uid: 'uid123',
      email: 'test@k2.com',
      displayName: 'Test User',
      role: 'management' as const,
      siteId: 'tampa',
      assignedStudies: [],
    }

    vi.mocked(mockedAuth.onAuthStateChanged).mockImplementation((cb: unknown) => {
      ;(cb as (u: { uid: string }) => void)({ uid: 'uid123' })
      return () => {}
    })
    mockedGetAppUser.mockResolvedValue(mockAppUser)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.user).toEqual(mockAppUser)
    expect(result.current.role).toBe('management')
  })
})
