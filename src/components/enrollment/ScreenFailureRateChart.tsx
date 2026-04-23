import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Panel } from '@/components/hud/Panel'
import { EmptyState } from '@/components/hud/EmptyState'
import { chartPalette } from '@/components/hud/charts/palette'
import type { ScreenFailure, Study } from '@/types'

interface Props {
  failures: ScreenFailure[]
  study: Study
}

function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function ScreenFailureRateChart({ failures, study }: Props) {
  const data = useMemo(() => {
    const counts = new Map<string, number>()
    for (const f of failures) {
      if (f.studyId !== study.id) continue
      const key = monthKey(f.date)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }))
  }, [failures, study.id])

  return (
    <Panel title="Screen Failures per Month">
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, marginTop: -4 }}>
        Historical screen counts unavailable; showing failure counts per month.
      </p>
      {data.length === 0 ? (
        <EmptyState title="No data" body="No data to chart yet." />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} />
            <XAxis dataKey="month" tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke={chartPalette.series[0]} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Panel>
  )
}
