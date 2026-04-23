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
import { Panel } from '@/components/hud/Panel'
import { EmptyState } from '@/components/hud/EmptyState'
import { chartPalette } from '@/components/hud/charts/palette'
import type { ScreenFailure, Study } from '@/types'

interface Props {
  allFailures: ScreenFailure[]
  studies: Study[]
}

export function CrossStudyComparisonPanel({ allFailures, studies }: Props) {
  const data = useMemo(() => {
    const countsByStudy = new Map<string, number>()
    for (const f of allFailures) {
      countsByStudy.set(f.studyId, (countsByStudy.get(f.studyId) ?? 0) + 1)
    }
    return studies
      .filter((s) => (s.enrollmentData?.screens ?? 0) > 0)
      .map((s) => {
        const failureCount = countsByStudy.get(s.id) ?? 0
        const screens = s.enrollmentData.screens
        const rate = Math.round((failureCount / screens) * 1000) / 10
        return { name: s.name, rate }
      })
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 10)
  }, [allFailures, studies])

  return (
    <Panel title="Cross-Study Comparison">
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, marginTop: -4 }}>
        Screen failure rate (failures / screens) across studies. Top 10 shown.
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
            <XAxis type="number" unit="%" tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }} width={160} />
            <Tooltip formatter={(v) => [`${Number(v)}%`, 'Failure Rate']} />
            <Bar dataKey="rate" fill={chartPalette.series[0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panel>
  )
}
