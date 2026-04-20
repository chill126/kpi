import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { Role } from '@/types'

interface Props {
  allowedRole: Role
}

export function RoleRoute({ allowedRole }: Props) {
  const { role, loading } = useAuth()

  if (loading) return null

  return role === allowedRole ? <Outlet /> : <Navigate to="/" replace />
}
