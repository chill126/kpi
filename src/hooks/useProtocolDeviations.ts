import { useEffect, useState } from 'react'
import { subscribeProtocolDeviations } from '@/lib/protocolDeviations'
import { useSite } from '@/hooks/useSite'
import type { ProtocolDeviation } from '@/types'

export function useProtocolDeviations(
  studyId: string,
): { deviations: ProtocolDeviation[]; loading: boolean; error: Error | null } {
  const { siteId } = useSite()
  const [deviations, setDeviations] = useState<ProtocolDeviation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!studyId) {
      setDeviations([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe = subscribeProtocolDeviations(
      studyId,
      siteId,
      (data) => {
        setDeviations(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [studyId, siteId])

  return { deviations, loading, error }
}
