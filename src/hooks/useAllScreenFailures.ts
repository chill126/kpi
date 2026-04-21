import { useEffect, useState } from 'react'
import { subscribeAllScreenFailures } from '@/lib/screenFailures'
import { useSite } from '@/hooks/useSite'
import type { ScreenFailure } from '@/types'

export function useAllScreenFailures(): {
  failures: ScreenFailure[]
  loading: boolean
  error: Error | null
} {
  const { siteId } = useSite()
  const [failures, setFailures] = useState<ScreenFailure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeAllScreenFailures(
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
  }, [siteId])

  return { failures, loading, error }
}
