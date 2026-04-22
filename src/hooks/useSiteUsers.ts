import { useEffect, useState } from 'react'
import { subscribeUsers } from '@/lib/users'
import { useSite } from '@/hooks/useSite'
import type { AppUser } from '@/types'

export function useSiteUsers(): {
  users: AppUser[]
  loading: boolean
  error: Error | null
} {
  const { siteId } = useSite()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeUsers(
      siteId,
      (data) => {
        setUsers(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [siteId])

  return { users, loading, error }
}
