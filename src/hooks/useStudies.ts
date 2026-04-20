import { useEffect, useState } from 'react'
import { subscribeStudies } from '@/lib/studies'
import { useSite } from '@/hooks/useSite'
import type { Study } from '@/types'

export function useStudies(): { studies: Study[]; loading: boolean; error: Error | null } {
  const { siteId } = useSite()
  const [studies, setStudies] = useState<Study[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeStudies(
      siteId,
      (data) => {
        setStudies(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [siteId])

  return { studies, loading, error }
}
