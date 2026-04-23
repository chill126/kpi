import { useCallback } from 'react'
import { useFirestoreSubscription } from '@/hooks/useFirestoreSubscription'
import { subscribeAllSites } from '@/lib/sites'
import type { Site } from '@/types'

export function useSites(): { sites: Site[]; loading: boolean; error: Error | null } {
  const subscribe = useCallback(
    (onData: (s: Site[]) => void, onError: (e: Error) => void) =>
      subscribeAllSites(onData, onError),
    [],
  )
  const { data, loading, error } = useFirestoreSubscription<Site[]>(
    subscribe,
    [],
    { rateLimit: 30, label: 'sites' },
  )
  return { sites: data ?? [], loading, error }
}
