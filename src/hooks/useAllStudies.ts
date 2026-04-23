import { useCallback } from 'react'
import { useFirestoreSubscription } from '@/hooks/useFirestoreSubscription'
import { subscribeAllStudies } from '@/lib/studies'
import type { Study } from '@/types'

export function useAllStudies(): { studies: Study[]; loading: boolean; error: Error | null } {
  const subscribe = useCallback(
    (onData: (s: Study[]) => void, onError: (e: Error) => void) =>
      subscribeAllStudies(onData, onError),
    [],
  )
  const { data, loading, error } = useFirestoreSubscription<Study[]>(
    subscribe,
    [],
    { rateLimit: 30, label: 'all-studies' },
  )
  return { studies: data ?? [], loading, error }
}
