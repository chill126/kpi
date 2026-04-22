import { TrendChip } from './TrendChip'
import { useCountUp } from './hooks/useCountUp'
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion'

type Signal = 'good' | 'warn' | 'alert' | 'info' | 'neutral'

interface TrendProp { delta: string; direction: 'up' | 'down' }

interface Props extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  label: string
  value: number | string
  suffix?: string
  sub?: string
  signal?: Signal
  trend?: TrendProp
  variant?: 'default' | 'hero'
}

export function Tile({
  label, value, suffix, sub,
  signal = 'neutral', trend, variant = 'default',
  style, ...rest
}: Props) {
  const reduced = usePrefersReducedMotion()
  const numeric = typeof value === 'number' ? value : null
  const animated = useCountUp(numeric ?? 0, { reducedMotion: reduced || numeric === null })
  const displayValue = numeric === null ? value : animated

  const valueColor =
    signal === 'good'  ? 'var(--signal-good)'
  : signal === 'warn'  ? 'var(--signal-warn)'
  : signal === 'alert' ? 'var(--signal-alert)'
  :                      'var(--text-primary)'

  const glyph =
    signal === 'alert' ? '⚠ '
  : signal === 'warn'  ? '▲ '
  : ''

  return (
    <div
      {...rest}
      role="group"
      data-variant={variant}
      aria-label={`${label}: ${String(value)}${suffix ?? ''}${sub ? `, ${sub}` : ''}`}
      className={variant === 'hero' ? 'glass-strong' : 'glass'}
      style={{
        position: 'relative',
        padding: variant === 'hero' ? '18px 20px 20px' : '16px 18px 18px',
        boxShadow: variant === 'hero'
          ? 'inset 0 0 0 1px oklch(0.72 0.17 295 / 0.35), inset 0 1px 0 rgba(255 255 255 / 0.08), 0 8px 32px rgba(0 0 0 / 0.35)'
          : undefined,
        ...style,
      }}
    >
      {trend && (
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <TrendChip signal={trend.direction === 'up' ? 'good' : 'alert'}>
            {trend.delta}
          </TrendChip>
        </div>
      )}
      <div style={{
        fontFamily: 'Inter, system-ui', fontSize: 10.5, fontWeight: 500,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--text-label)',
      }}>{glyph}{label}</div>
      <div style={{
        marginTop: 2,
        fontFamily: 'Geist, Inter, system-ui',
        fontSize: variant === 'hero' ? 42 : 32,
        fontWeight: variant === 'hero' ? 200 : 300,
        letterSpacing: '-0.02em', lineHeight: 1,
        color: valueColor,
        fontFeatureSettings: '"tnum"',
      }}>
        {displayValue}
        {suffix && <span style={{
          marginLeft: 1,
          fontSize: variant === 'hero' ? 20 : 16,
          color: 'var(--text-secondary)', fontWeight: 300,
        }}>{suffix}</span>}
      </div>
      {sub && <div style={{
        marginTop: 6, fontSize: 11.5, color: 'var(--text-muted)',
      }}>{sub}</div>}
    </div>
  )
}
