import { useEffect, useState } from 'react'
import { subscribeSiteAssessments } from '@/lib/assessments'
import { useSite } from '@/hooks/useSite'
import type { Assessment } from '@/types'

export function useSiteAssessments(): { assessments: Assessment[]; loading: boolean; error: Error | null } {
  const { siteId } = useSite()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeSiteAssessments(
      siteId,
      (data) => { setAssessments(data); setLoading(false) },
      (err) => { setError(err); setLoading(false) },
    )
    return unsubscribe
  }, [siteId])

  return { assessments, loading, error }
}
