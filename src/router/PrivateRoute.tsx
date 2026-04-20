import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function PrivateRoute() {
  const { user, loading } = useAuth()

  if (loading) return null

  return user ? <Outlet /> : <Navigate to="/login" replace />
}
