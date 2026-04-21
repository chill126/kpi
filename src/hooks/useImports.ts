import { useEffect, useState } from 'react'
import { subscribeImports } from '@/lib/imports'
import { useSite } from '@/hooks/useSite'
import type { Import } from '@/types'

export function useImports(): {
  imports: Import[]
  loading: boolean
  error: Error | null
} {
  const { siteId } = useSite()
  const [imports, setImports] = useState<Import[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeImports(
      siteId,
      (data) => {
        setImports(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [siteId])

  return { imports, loading, error }
}
