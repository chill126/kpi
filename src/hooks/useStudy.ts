import { useEffect, useState } from 'react'
import { subscribeStudy } from '@/lib/studies'
import type { Study } from '@/types'

export function useStudy(
  studyId: string,
): { study: Study | null; loading: boolean; error: Error | null } {
  const [study, setStudy] = useState<Study | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!studyId) return
    setLoading(true)
    const unsubscribe = subscribeStudy(
      studyId,
      (data) => {
        setStudy(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [studyId])

  return { study, loading, error }
}
