import { CheckCircle } from 'lucide-react'
import { Panel } from '../Panel'
import { EmptyState } from '../EmptyState'

export interface UtilizationEntry {
  name: string
  utilization: number
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
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid rgba(255 255 255 / 0.06)',
                fontSize: 13,
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>{r.name}</span>
              <span style={{
                fontFamily: 'JetBrains Mono', fontSize: 12.5,
                color: signalFor(r.utilization), fontFeatureSettings: '"tnum"',
              }}>
                {Math.round(r.utilization)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
