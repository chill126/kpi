// Workaround: recharts 3.x TooltipProps generics are strict; using custom interface instead
interface Payload {
  name?: string
  dataKey?: string | number
  value?: number | string
}

interface Props {
  active?: boolean
  payload?: Payload[]
  label?: string | number
  valueFormatter?: (v: number) => string
}

export function HUDTooltip({ active, payload, label, valueFormatter }: Props) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div
      role="tooltip"
      className="glass-strong"
      style={{ padding: 12, minWidth: 160 }}
    >
      {label && <div style={{
        fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--text-label)', marginBottom: 8, fontWeight: 500,
      }}>{label}</div>}
      {payload.map((p) => (
        <div key={String(p.dataKey ?? p.name)} style={{
          display: 'flex', justifyContent: 'space-between', gap: 14,
          fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12.5,
          color: 'var(--text-primary)', fontFeatureSettings: '"tnum"',
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
          <span>{valueFormatter ? valueFormatter(p.value as number) : String(p.value)}</span>
        </div>
      ))}
    </div>
  )
}
