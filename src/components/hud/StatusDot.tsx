type Signal = 'good' | 'warn' | 'alert' | 'info' | 'neutral'

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
  signal?: Signal
  pulse?: boolean
  size?: number
}

const color: Record<Signal, string> = {
  good: 'var(--signal-good)',
  warn: 'var(--signal-warn)',
  alert: 'var(--signal-alert)',
  info: 'var(--accent-info)',
  neutral: 'var(--text-muted)',
}

export function StatusDot({ signal = 'good', pulse = false, size = 8, style, ...rest }: Props) {
  return (
    <span
      {...rest}
      data-signal={signal}
      data-pulse={pulse ? 'true' : undefined}
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: 9999,
        background: color[signal],
        ...style,
      }}
    />
  )
}
