import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useFirestoreSubscription } from '../useFirestoreSubscription'

describe('useFirestoreSubscription', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // ── Normal operation ──────────────────────────────────────────────────────

  it('starts in loading state before first snapshot', () => {
    const subscribe = (_onData: (d: string[]) => void, _onError: (e: Error) => void) => vi.fn()
    const { result } = renderHook(() => useFirestoreSubscription(subscribe, [], { label: 'test' }))
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
    expect(result.current.circuitOpen).toBe(false)
  })

  it('delivers data and clears loading on first snapshot', () => {
    const subscribe = (onData: (d: string[]) => void) => {
      onData(['a', 'b'])
      return vi.fn()
    }
    const { result } = renderHook(() => useFirestoreSubscription(subscribe, [], { label: 'test' }))
    expect(result.current.data).toEqual(['a', 'b'])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('increments snapshotCount with each received snapshot', () => {
    let capturedOnData: ((d: string[]) => void) | null = null
    const subscribe = (onData: (d: string[]) => void) => {
      capturedOnData = onData
      return vi.fn()
    }
    const { result } = renderHook(() =>
      useFirestoreSubscription(subscribe, [], { rateLimit: 30, label: 'test' }),
    )
    act(() => { capturedOnData?.(['x']) })
    act(() => { capturedOnData?.(['y']) })
    expect(result.current.snapshotCount).toBe(2)
  })

  it('propagates errors from the subscription', () => {
    const subscribe = (_onData: (d: string[]) => void, onError: (e: Error) => void) => {
      onError(new Error('permission-denied'))
      return vi.fn()
    }
    const { result } = renderHook(() => useFirestoreSubscription(subscribe, [], { label: 'test' }))
    expect(result.current.error?.message).toBe('permission-denied')
    expect(result.current.loading).toBe(false)
  })

  it('calls unsubscribe on unmount', () => {
    const unsub = vi.fn()
    const subscribe = (_onData: (d: string[]) => void) => unsub
    const { unmount } = renderHook(() => useFirestoreSubscription(subscribe, [], { label: 'test' }))
    unmount()
    expect(unsub).toHaveBeenCalledOnce()
  })

  it('does not update state after unmount (isCancelled guard)', () => {
    let capturedOnData: ((d: string[]) => void) | null = null
    const subscribe = (onData: (d: string[]) => void) => {
      capturedOnData = onData
      return vi.fn()
    }
    const { result, unmount } = renderHook(() =>
      useFirestoreSubscription(subscribe, [], { label: 'test' }),
    )
    unmount()
    // Firing onData after unmount must not throw or update state
    expect(() => act(() => { capturedOnData?.(['stale']) })).not.toThrow()
    expect(result.current.data).toBeNull()
  })

  // ── Circuit breaker ───────────────────────────────────────────────────────

  it('opens circuit when snapshot count exceeds rateLimit within 60s', () => {
    const subscribe = (onData: (d: string[]) => void) => {
      // Fire rateLimit + 1 snapshots synchronously (same timestamp under fake timers)
      for (let i = 0; i <= 5; i++) onData([`item-${i}`])
      return vi.fn()
    }
    const { result } = renderHook(() =>
      useFirestoreSubscription(subscribe, [], { rateLimit: 5, cooldownMs: 1_000, label: 'test' }),
    )
    expect(result.current.circuitOpen).toBe(true)
    expect(result.current.error?.message).toMatch(/Circuit opened/)
    expect(result.current.error?.message).toMatch(/rate limit/i)
    expect(result.current.loading).toBe(false)
  })

  it('stops accepting snapshots once circuit is open', () => {
    let capturedOnData: ((d: string[]) => void) | null = null
    const subscribe = (onData: (d: string[]) => void) => {
      capturedOnData = onData
      // Trip the circuit immediately
      for (let i = 0; i <= 5; i++) onData([`item-${i}`])
      return vi.fn()
    }
    const { result } = renderHook(() =>
      useFirestoreSubscription(subscribe, [], { rateLimit: 5, cooldownMs: 1_000, label: 'test' }),
    )
    const dataAtTrip = result.current.data
    // Further snapshots must be ignored
    act(() => { capturedOnData?.(['should-be-ignored']) })
    expect(result.current.data).toEqual(dataAtTrip)
  })

  it('auto-closes circuit and retries after cooldown', async () => {
    let callCount = 0
    const subscribe = (onData: (d: string[]) => void) => {
      callCount++
      if (callCount === 1) {
        // Trip the circuit on first subscription
        for (let i = 0; i <= 5; i++) onData([`trip-${i}`])
      } else {
        // Normal data on retry
        onData(['recovered'])
      }
      return vi.fn()
    }
    const { result } = renderHook(() =>
      useFirestoreSubscription(subscribe, [], { rateLimit: 5, cooldownMs: 1_000, label: 'test' }),
    )
    expect(result.current.circuitOpen).toBe(true)

    await act(async () => { vi.advanceTimersByTime(1_001) })

    expect(result.current.circuitOpen).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.data).toEqual(['recovered'])
    expect(callCount).toBe(2)
  })

  it('resets snapshot window after cooldown so normal traffic passes', async () => {
    let callCount = 0
    let capturedOnData: ((d: string[]) => void) | null = null
    const subscribe = (onData: (d: string[]) => void) => {
      callCount++
      capturedOnData = onData
      if (callCount === 1) {
        for (let i = 0; i <= 5; i++) onData([`trip-${i}`])
      }
      return vi.fn()
    }
    const { result } = renderHook(() =>
      useFirestoreSubscription(subscribe, [], { rateLimit: 5, cooldownMs: 1_000, label: 'test' }),
    )
    await act(async () => { vi.advanceTimersByTime(1_001) })

    // After retry, 3 normal snapshots should NOT reopen the circuit
    act(() => { capturedOnData?.(['ok-1']) })
    act(() => { capturedOnData?.(['ok-2']) })
    act(() => { capturedOnData?.(['ok-3']) })

    expect(result.current.circuitOpen).toBe(false)
    expect(result.current.data).toEqual(['ok-3'])
  })
})
