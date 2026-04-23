import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CATEGORY_LABELS } from './ScreenFailureForm'
import { Panel } from '@/components/hud/Panel'
import { EmptyState } from '@/components/hud/EmptyState'
import { chartPalette } from '@/components/hud/charts/palette'
import type { ScreenFailure } from '@/types'

interface Props {
  failures: ScreenFailure[]
}

export function ScreenFailureReasonChart({ failures }: Props) {
  const data = useMemo(() => {
    const counts = new Map<string, number>()
    for (const f of failures) {
      for (const r of f.reasons) {
        const label = CATEGORY_LABELS[r.category] ?? r.category
        counts.set(label, (counts.get(label) ?? 0) + 1)
      }
    }
    return Array.from(counts.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([reason, count]) => ({ reason, count }))
  }, [failures])

  return (
    <Panel title="Failure Reasons">
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, marginTop: -4 }}>
        Aggregated across all recorded failures.
      </p>
      {data.length === 0 ? (
        <EmptyState title="No data" body="No data to chart yet." />
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(240, data.length * 36)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 0, left: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }} />
            <YAxis
              dataKey="reason"
              type="category"
              tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }}
              width={140}
            />
            <Tooltip />
            <Bar dataKey="count" fill={chartPalette.series[0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panel>
  )
}
