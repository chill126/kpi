import { useEffect, useState } from 'react'
import { subscribeSiteDelegationLogs } from '@/lib/delegationLog'
import { useSite } from '@/hooks/useSite'
import type { DelegationLog } from '@/types'

export function useSiteDelegationLogs(): {
  logs: DelegationLog[]
  loading: boolean
} {
  const { siteId } = useSite()
  const [logs, setLogs] = useState<DelegationLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!siteId) return
    setLoading(true)
    const unsubscribe = subscribeSiteDelegationLogs(
      siteId,
      (data) => {
        setLogs(data)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsubscribe
  }, [siteId])

  return { logs, loading }
}
