import { useEffect, useState } from 'react'
import { subscribeScreenFailures } from '@/lib/screenFailures'
import { useSite } from '@/hooks/useSite'
import type { ScreenFailure } from '@/types'

export function useScreenFailures(
  studyId: string,
): { failures: ScreenFailure[]; loading: boolean; error: Error | null } {
  const { siteId } = useSite()
  const [failures, setFailures] = useState<ScreenFailure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!studyId) {
      setFailures([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe = subscribeScreenFailures(
      studyId,
      siteId,
      (data) => {
        setFailures(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [studyId, siteId])

  return { failures, loading, error }
}
