import { useEffect, useState } from 'react'
import { subscribeInvestigators } from '@/lib/investigators'
import { useSite } from '@/hooks/useSite'
import type { Investigator } from '@/types'

export function useInvestigators(): {
  investigators: Investigator[]
  loading: boolean
  error: Error | null
} {
  const { siteId } = useSite()
  const [investigators, setInvestigators] = useState<Investigator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeInvestigators(
      siteId,
      (data) => {
        setInvestigators(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [siteId])

  return { investigators, loading, error }
}
