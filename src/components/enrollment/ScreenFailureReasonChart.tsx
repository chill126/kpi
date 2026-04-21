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
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
        Failure Reasons
      </h2>
      <p className="text-xs text-slate-400 mb-4">Aggregated across all recorded failures.</p>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400 py-12 text-center">No data to chart.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(240, data.length * 36)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 0, left: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis
              dataKey="reason"
              type="category"
              tick={{ fontSize: 11 }}
              width={140}
            />
            <Tooltip />
            <Bar dataKey="count" fill="#0d9488" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
