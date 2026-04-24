import { useEffect, useRef, useState } from 'react'
import { captureError } from '@/lib/monitoring'

/** Sliding window for rate-limit tracking */
const WINDOW_MS = 60_000

export interface SubscriptionOptions {
  /** Max snapshots allowed per 60-second window before the circuit opens. Default: 30 */
  rateLimit?: number
  /** Milliseconds to pause before auto-retrying after the circuit opens. Default: 60_000 */
  cooldownMs?: number
  /** Label shown in console warnings and error messages. Default: 'Firestore' */
  label?: string
}

export interface SubscriptionResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  /** True while the circuit breaker is open — subscription is paused due to rate limiting */
  circuitOpen: boolean
  /** Running count of snapshots received since mount */
  snapshotCount: number
}

/**
 * Safe Firestore onSnapshot wrapper with three layers of loop protection:
 *
 * 1. isCancelled guard — prevents stale callbacks from updating state after cleanup
 *    (handles React StrictMode double-invoke and component unmount during async auth)
 *
 * 2. Circuit breaker — if snapshots exceed `rateLimit` per 60s, the subscription is
 *    paused and `error` is set with a clear message. Auto-retries after `cooldownMs`.
 *    `retryCount` state increment forces the effect to re-run after cooldown without
 *    the caller needing to do anything.
 *
 * 3. Dev-mode dep-churn detection — warns in console if the effect fires more than
 *    3 times in 10 seconds, which indicates an unstable (non-primitive) dependency
 *    causing runaway listener churn.
 */
export function useFirestoreSubscription<T>(
  subscribe: (
    onData: (data: T) => void,
    onError: (err: Error) => void,
  ) => () => void,
  // deps controls when the subscription is torn down and recreated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: readonly any[],
  options: SubscriptionOptions = {},
): SubscriptionResult<T> {
  const { rateLimit = 30, cooldownMs = 60_000, label = 'Firestore' } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [circuitOpen, setCircuitOpen] = useState(false)
  const [snapshotCount, setSnapshotCount] = useState(0)
  // Incrementing this forces a re-run of the effect after cooldown without dep changes
  const [retryCount, setRetryCount] = useState(0)

  // Refs are mutable inside snapshot callbacks without triggering renders
  const circuitOpenRef = useRef(false)
  const snapshotTimestampsRef = useRef<number[]>([])
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Dev-mode: detect unstable deps causing listener churn
  const depChangeCountRef = useRef(0)
  const depWindowStartRef = useRef<number | null>(null)

  useEffect(() => {
    if (import.meta.env.DEV) {
      const now = Date.now()
      if (depWindowStartRef.current === null || now - depWindowStartRef.current > 10_000) {
        depChangeCountRef.current = 1
        depWindowStartRef.current = now
      } else {
        depChangeCountRef.current += 1
        if (depChangeCountRef.current > 3) {
          console.warn(
            `[useFirestoreSubscription/${label}] listener recreated ${depChangeCountRef.current}× in <10s — ` +
              `check for unstable dep values (objects/arrays created inline cause this)`,
          )
        }
      }
    }

    // While circuit is open the cooldown timer is running; don't subscribe
    if (circuitOpenRef.current) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let cancelled = false
    let unsubFn: (() => void) | null = null

    const tripCircuit = (count: number) => {
      if (unsubFn) {
        unsubFn()
        unsubFn = null
      }
      circuitOpenRef.current = true
      setCircuitOpen(true)
      setLoading(false)
      const msg =
        `[${label}] Circuit opened — rate limit exceeded: ${count} snapshots in 60s (max ${rateLimit}). ` +
        `Subscription paused for ${cooldownMs / 1_000}s then auto-retrying.`
      console.error(msg)
      captureError(new Error(msg), { category: 'firestore', critical: true })
      setError(new Error(msg))

      cooldownTimerRef.current = setTimeout(() => {
        if (cancelled) return
        circuitOpenRef.current = false
        setCircuitOpen(false)
        snapshotTimestampsRef.current = []
        setError(null)
        // Force effect re-run so a fresh subscription is created
        setRetryCount((c) => c + 1)
      }, cooldownMs)
    }

    unsubFn = subscribe(
      (incoming) => {
        if (cancelled || circuitOpenRef.current) return

        const now = Date.now()
        snapshotTimestampsRef.current = snapshotTimestampsRef.current.filter(
          (t) => now - t < WINDOW_MS,
        )
        snapshotTimestampsRef.current.push(now)
        setSnapshotCount((c) => c + 1)

        if (snapshotTimestampsRef.current.length > rateLimit) {
          tripCircuit(snapshotTimestampsRef.current.length)
          return
        }

        setData(incoming)
        setLoading(false)
      },
      (err) => {
        if (!cancelled) {
          captureError(err, { category: 'firestore', critical: true })
          setError(err)
          setLoading(false)
        }
      },
    )

    return () => {
      cancelled = true
      if (unsubFn) {
        unsubFn()
        unsubFn = null
      }
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current)
        cooldownTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, retryCount])

  return { data, loading, error, circuitOpen, snapshotCount }
}
