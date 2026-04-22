import { useEffect, useRef, useState } from 'react'

interface Options {
  durationMs?: number
  reducedMotion?: boolean
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

export function useCountUp(target: number, opts: Options = {}): number {
  const { durationMs = 400, reducedMotion = false } = opts
  const [value, setValue] = useState(reducedMotion ? target : 0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const fromRef = useRef<number>(reducedMotion ? target : 0)

  useEffect(() => {
    if (reducedMotion) { setValue(target); return }

    fromRef.current = value
    startRef.current = null

    const tick = () => {
      const now = performance.now()
      if (startRef.current === null) startRef.current = now
      const elapsed = now - startRef.current
      const t = Math.min(1, elapsed / durationMs)
      const eased = easeOutQuart(t)
      const next = fromRef.current + (target - fromRef.current) * eased
      setValue(t === 1 ? target : next)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, reducedMotion])

  return Math.round(value)
}
