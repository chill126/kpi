import { useEffect, useState } from 'react'
import { subscribeStudyVisits } from '@/lib/visits'
import { useSite } from '@/hooks/useSite'
import type { Visit } from '@/types'

export function useVisits(
  studyId: string,
): { visits: Visit[]; loading: boolean; error: Error | null } {
  const { siteId } = useSite()
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!studyId) return
    setLoading(true)
    const unsubscribe = subscribeStudyVisits(
      siteId,
      studyId,
      (data) => {
        setVisits(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [siteId, studyId])

  return { visits, loading, error }
}
