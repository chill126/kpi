import { useEffect, useState } from 'react'
import { subscribeStudyAssessments } from '@/lib/assessments'
import { useSite } from '@/hooks/useSite'
import type { Assessment } from '@/types'

export function useAssessments(
  studyId: string,
): { assessments: Assessment[]; loading: boolean; error: Error | null } {
  const { siteId } = useSite()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!studyId) return
    setLoading(true)
    const unsubscribe = subscribeStudyAssessments(
      siteId,
      studyId,
      (data) => {
        setAssessments(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [siteId, studyId])

  return { assessments, loading, error }
}
