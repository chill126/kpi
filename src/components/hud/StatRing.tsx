type Signal = 'good' | 'warn' | 'alert' | 'info' | 'neutral'

interface Props {
  value: number
  label?: string
  signal?: Signal
  size?: number
}

const stroke: Record<Signal, string> = {
  good:    'var(--signal-good)',
  warn:    'var(--signal-warn)',
  alert:   'var(--signal-alert)',
  info:    'var(--accent-info)',
  neutral: 'var(--accent-primary)',
}

export function StatRing({ value, label, signal = 'neutral', size = 88 }: Props) {
  const pct = Math.max(0, Math.min(100, value))
  const r = size / 2 - 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct / 100)
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="rgba(255 255 255 / 0.08)" strokeWidth={2}
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={stroke[signal]} strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 400ms cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        </svg>
        <span style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Geist, Inter, system-ui', fontSize: 18, fontWeight: 500,
          color: 'var(--text-primary)', fontFeatureSettings: '"tnum"',
        }}>{pct}%</span>
      </div>
      {label && <span style={{
        fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--text-label)', fontWeight: 500,
      }}>{label}</span>}
    </div>
  )
}
