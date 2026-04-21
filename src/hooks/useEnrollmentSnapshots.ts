import { useEffect, useState } from 'react'
import { subscribeEnrollmentSnapshots } from '@/lib/enrollmentSnapshots'
import { useSite } from '@/hooks/useSite'
import type { EnrollmentSnapshot } from '@/types'

export function useEnrollmentSnapshots(
  studyId: string,
): { snapshots: EnrollmentSnapshot[]; loading: boolean; error: Error | null } {
  const { siteId } = useSite()
  const [snapshots, setSnapshots] = useState<EnrollmentSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!studyId) {
      setSnapshots([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe = subscribeEnrollmentSnapshots(
      studyId,
      siteId,
      (data) => {
        setSnapshots(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [studyId, siteId])

  return { snapshots, loading, error }
}
