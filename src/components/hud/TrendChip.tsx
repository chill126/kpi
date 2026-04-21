type Signal = 'good' | 'warn' | 'alert' | 'info' | 'neutral'

interface Props {
  signal?: Signal
  children: React.ReactNode
}

const bgFor: Record<Signal, string> = {
  good:    'oklch(0.78 0.15 162 / 0.15)',
  warn:    'oklch(0.79 0.16 82  / 0.15)',
  alert:   'oklch(0.72 0.17 13  / 0.15)',
  info:    'oklch(0.80 0.12 220 / 0.15)',
  neutral: 'rgba(255 255 255 / 0.08)',
}

const textFor: Record<Signal, string> = {
  good:    'var(--signal-good)',
  warn:    'var(--signal-warn)',
  alert:   'var(--signal-alert)',
  info:    'var(--accent-info)',
  neutral: 'var(--text-secondary)',
}

export function TrendChip({ signal = 'neutral', children }: Props) {
  return (
    <span
      data-signal={signal}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: 9999,
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontSize: 11,
        fontFeatureSettings: '"tnum"',
        background: bgFor[signal],
        color: textFor[signal],
      }}
    >
      {children}
    </span>
  )
}
