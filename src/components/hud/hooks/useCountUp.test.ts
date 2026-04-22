import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useCountUp } from './useCountUp'

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(cb, 16) as unknown as number)
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id as unknown as NodeJS.Timeout))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useCountUp', () => {
  it('returns target value immediately when reduced motion requested', () => {
    const { result } = renderHook(() => useCountUp(100, { reducedMotion: true }))
    expect(result.current).toBe(100)
  })

  it('animates from 0 to target over duration', () => {
    const { result } = renderHook(() => useCountUp(100, { durationMs: 400 }))
    expect(result.current).toBe(0)
    act(() => { vi.advanceTimersByTime(200) })
    expect(result.current).toBeGreaterThan(0)
    expect(result.current).toBeLessThan(100)
    act(() => { vi.advanceTimersByTime(400) })
    expect(result.current).toBe(100)
  })

  it('handles target changes mid-flight by re-animating from current', () => {
    const { result, rerender } = renderHook(({ v }) => useCountUp(v, { durationMs: 400 }), {
      initialProps: { v: 100 },
    })
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current).toBe(100)
    rerender({ v: 200 })
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current).toBe(200)
  })
})
