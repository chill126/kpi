import { useCallback } from 'react'
import { useFirestoreSubscription } from '@/hooks/useFirestoreSubscription'
import { subscribeWhatIfScenarios } from '@/lib/whatif'
import { useSite } from '@/hooks/useSite'
import type { WhatIfScenario } from '@/types'

export function useWhatIfScenarios(): {
  scenarios: WhatIfScenario[]
  loading: boolean
  error: Error | null
  circuitOpen: boolean
} {
  const { siteId } = useSite()
  const subscribe = useCallback(
    (onData: (s: WhatIfScenario[]) => void, onError: (e: Error) => void) =>
      subscribeWhatIfScenarios(siteId, onData, onError),
    [siteId],
  )
  const { data, loading, error, circuitOpen } = useFirestoreSubscription<WhatIfScenario[]>(
    subscribe, [siteId], { rateLimit: 30, label: 'whatIfScenarios' },
  )
  return { scenarios: data ?? [], loading, error, circuitOpen }
}
