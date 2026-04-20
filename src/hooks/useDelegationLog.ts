import { useEffect, useState } from 'react'
import { subscribeDelegationLog } from '@/lib/delegationLog'
import type { DelegationLog } from '@/types'

export function useDelegationLog(
  studyId: string,
): { entries: DelegationLog[]; loading: boolean; error: Error | null } {
  const [entries, setEntries] = useState<DelegationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!studyId) return
    setLoading(true)
    const unsubscribe = subscribeDelegationLog(
      studyId,
      (data) => {
        setEntries(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [studyId])

  return { entries, loading, error }
}
