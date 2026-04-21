import { useEffect, useState } from 'react'
import { subscribeAllProtocolDeviations } from '@/lib/protocolDeviations'
import { useSite } from '@/hooks/useSite'
import type { ProtocolDeviation } from '@/types'

export function useAllProtocolDeviations(): {
  deviations: ProtocolDeviation[]
  loading: boolean
  error: Error | null
} {
  const { siteId } = useSite()
  const [deviations, setDeviations] = useState<ProtocolDeviation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeAllProtocolDeviations(
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
  }, [siteId])

  return { deviations, loading, error }
}
