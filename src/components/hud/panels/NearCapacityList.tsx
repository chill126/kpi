import { CheckCircle } from 'lucide-react'
import { Panel } from '../Panel'
import { EmptyState } from '../EmptyState'

export interface UtilizationEntry {
  name: string
  utilization: number
  totalHours: number
  capacityHours: number
}

interface Props { entries: UtilizationEntry[] }

function signalFor(pct: number): string {
  if (pct >= 90) return 'var(--signal-alert)'
  if (pct >= 75) return 'var(--signal-warn)'
  return 'var(--signal-good)'
}

export function NearCapacityList({ entries }: Props) {
  const rows = entries
    .filter(e => e.utilization >= 75)
    .sort((a, b) => b.utilization - a.utilization)

  return (
    <Panel title="At or Near Capacity">
      {rows.length === 0 ? (
        <EmptyState
          icon={<CheckCircle size={32} />}
          title="All under capacity"
          body="No investigators at or near 75% this week."
        />
      ) : (
        <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {rows.map((r) => (
            <li
              key={r.name}
              role="listitem"
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                gap: 12, padding: '10px 0',
                borderBottom: '1px solid rgba(255 255 255 / 0.06)',
                fontSize: 13,
              }}
            >
              <span style={{
                color: 'var(--text-secondary)', flex: 1, minWidth: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{r.name}</span>
              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                  fontSize: 11.5,
                  color: 'var(--text-muted)',
                  fontFeatureSettings: '"tnum"',
                }}>
                  {r.totalHours}h / {r.capacityHours}h
                </span>
                <span style={{
                  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                  fontSize: 12.5,
                  color: signalFor(r.utilization),
                  fontFeatureSettings: '"tnum"',
                  minWidth: 40,
                  textAlign: 'right',
                }}>
                  {Math.round(r.utilization)}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
