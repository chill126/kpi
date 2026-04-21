import { useAuth } from '@/hooks/useAuth'

export function useHudUser(): {
  role: 'management' | 'staff'
  user: { displayName: string; role: string }
} | null {
  const { user } = useAuth()
  if (!user) return null
  const role: 'management' | 'staff' = user.role === 'management' ? 'management' : 'staff'
  const roleLabel = role === 'management' ? 'Manager' : 'Coordinator'
  const displayName = user.displayName ?? user.email ?? 'User'
  return { role, user: { displayName, role: roleLabel } }
}
