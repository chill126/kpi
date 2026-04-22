import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion'

interface Props {
  className?: string
  height?: number | string
  width?: number | string
  rounded?: number | string
}

export function Skeleton({ className, height = 16, width = '100%', rounded = 8 }: Props) {
  const reduced = usePrefersReducedMotion()
  return (
    <div
      className={className}
      aria-hidden="true"
      style={{
        height,
        width,
        borderRadius: rounded,
        background: reduced
          ? 'rgba(255 255 255 / 0.06)'
          : 'linear-gradient(90deg, rgba(255 255 255 / 0.03) 0%, rgba(255 255 255 / 0.08) 50%, rgba(255 255 255 / 0.03) 100%)',
        backgroundSize: '200% 100%',
        animation: reduced ? undefined : 'hud-shimmer 800ms ease-in-out infinite',
      }}
    />
  )
}
