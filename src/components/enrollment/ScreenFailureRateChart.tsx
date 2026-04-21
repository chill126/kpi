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
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
        Screen Failures per Month
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        Historical screen counts unavailable; showing failure counts per month.
      </p>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400 py-12 text-center">No data to chart.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
