import { useEffect, useState } from 'react'
import { subscribeSiteVisits } from '@/lib/visits'
import { useSite } from '@/hooks/useSite'
import type { Visit } from '@/types'

export function useSiteVisits(): { visits: Visit[]; loading: boolean; error: Error | null } {
  const { siteId } = useSite()
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeSiteVisits(
      siteId,
      (data) => { setVisits(data); setLoading(false) },
      (err) => { setError(err); setLoading(false) },
    )
    return unsubscribe
  }, [siteId])

  return { visits, loading, error }
}
