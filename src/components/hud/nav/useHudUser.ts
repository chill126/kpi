import { useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/auth'

export interface HudUser {
  displayName: string
  email: string
  role: string
}

export interface HudUserContext {
  role: 'management' | 'staff'
  user: HudUser
  signOut: () => Promise<void>
}

export function useHudUser(): HudUserContext | null {
  const { user } = useAuth()
  const handleSignOut = useCallback(() => signOut(), [])

  if (!user) return null
  const role: 'management' | 'staff' = user.role === 'management' ? 'management' : 'staff'
  const roleLabel = role === 'management' ? 'Manager' : 'Coordinator'
  const displayName = user.displayName ?? user.email ?? 'User'
  return {
    role,
    user: { displayName, email: user.email ?? '', role: roleLabel },
    signOut: handleSignOut,
  }
}
