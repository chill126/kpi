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
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
        Cross-Study Comparison
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        Screen failure rate (failures / screens) across studies. Top 10 shown.
      </p>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400 py-12 text-center">No data</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(240, data.length * 36)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 0, left: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" unit="%" tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={160} />
            <Tooltip formatter={(v) => [`${Number(v)}%`, 'Failure Rate']} />
            <Bar dataKey="rate" fill="#0d9488" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
