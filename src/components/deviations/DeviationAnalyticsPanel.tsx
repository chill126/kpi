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
import { DEVIATION_CATEGORY_LABELS } from './DeviationForm'
import type { DeviationCategory, ProtocolDeviation } from '@/types'

interface Props {
  deviations: ProtocolDeviation[]
}

export function DeviationAnalyticsPanel({ deviations }: Props) {
  const openCount = deviations.filter((d) => d.status === 'open').length
  const reviewedCount = deviations.filter((d) => d.status === 'pi_reviewed').length
  const closedCount = deviations.filter((d) => d.status === 'closed').length

  const categoryData = useMemo(() => {
    const counts: Partial<Record<DeviationCategory, number>> = {}
    for (const dev of deviations) {
      counts[dev.category] = (counts[dev.category] ?? 0) + 1
    }
    return (Object.entries(counts) as [DeviationCategory, number][])
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({
        name: DEVIATION_CATEGORY_LABELS[cat] ?? cat,
        count,
      }))
  }, [deviations])

  if (deviations.length === 0) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
          Deviations by Category
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={categoryData} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: '#64748b' }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={48}
            />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 6 }}
              formatter={(v) => [v, 'Deviations']}
            />
            <Bar dataKey="count" fill="#0d9488" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col gap-3">
        <StatCard label="Open" value={openCount} color="amber" />
        <StatCard label="PI Reviewed" value={reviewedCount} color="blue" />
        <StatCard label="Closed" value={closedCount} color="emerald" />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'amber' | 'blue' | 'emerald'
}) {
  const colorMap = {
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
  }
  return (
    <div className={`flex-1 rounded-lg border p-3 ${colorMap[color]}`}>
      <p className="text-xs font-medium uppercase">{label}</p>
      <p className="text-3xl font-bold tabular-nums mt-1">{value}</p>
    </div>
  )
}
