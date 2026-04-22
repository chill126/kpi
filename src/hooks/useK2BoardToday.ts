import { subscribeK2BoardToday, K2_LIVE_RATE_LIMIT, type K2BoardEntry } from '@/lib/k2Board'
import { useFirestoreSubscription } from './useFirestoreSubscription'

/**
 * Live subscription to today's k2-board participant flow.
 *
 * Uses useFirestoreSubscription so the circuit breaker, rate limiter, and
 * dev-mode dep-churn detection are all active. The subscription has no dynamic
 * deps (empty array) — it's tied to the start-of-today date computed at mount,
 * so exactly one listener is created per component mount.
 */
export function useK2BoardToday(): {
  entries: K2BoardEntry[]
  loading: boolean
  error: Error | null
  /** True if the circuit breaker has paused the subscription due to excessive snapshot rate */
  circuitOpen: boolean
  snapshotCount: number
} {
  const { data, loading, error, circuitOpen, snapshotCount } =
    useFirestoreSubscription<K2BoardEntry[]>(
      subscribeK2BoardToday,
      [], // static — today's start-of-day is fixed for the lifetime of this mount
      {
        rateLimit: K2_LIVE_RATE_LIMIT,
        cooldownMs: 120_000, // 2 min cooldown; more conservative for cross-project reads
        label: 'k2-board/today',
      },
    )

  return {
    entries: data ?? [],
    loading,
    error,
    circuitOpen,
    snapshotCount,
  }
}
