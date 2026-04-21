import { useEffect, useState } from 'react'
import { subscribeSite } from '@/lib/sites'
import { useSite } from '@/hooks/useSite'
import type { Site } from '@/types'

export function useSiteData(): {
  site: Site | null
  loading: boolean
  error: Error | null
} {
  const { siteId } = useSite()
  const [site, setSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeSite(
      siteId,
      (data) => {
        setSite(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [siteId])

  return { site, loading, error }
}
