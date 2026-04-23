import { useCallback } from 'react'
import { subscribeBoardSessions } from '@/lib/boardSessions'
import { useSite } from '@/hooks/useSite'
import { useFirestoreSubscription } from './useFirestoreSubscription'
import type { BoardSession } from '@/types'

export function useBoardSessions(): {
  sessions: BoardSession[]
  loading: boolean
  error: Error | null
  circuitOpen: boolean
} {
  const { siteId } = useSite()

  const subscribe = useCallback(
    (onData: (data: BoardSession[]) => void, onError: (err: Error) => void) =>
      subscribeBoardSessions(siteId, onData, onError),
    [siteId],
  )

  const { data, loading, error, circuitOpen } = useFirestoreSubscription<BoardSession[]>(
    subscribe,
    [siteId],
    { rateLimit: 30, label: 'boardSessions' },
  )

  return { sessions: data ?? [], loading, error, circuitOpen }
}
