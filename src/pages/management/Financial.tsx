import { useMemo } from 'react'
import { useStudies } from '@/hooks/useStudies'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Study, Visit } from '@/types'

interface StudyROI {
  study: Study
  totalHours: string
  activeWeeks: number
  hoursPerWeek: string
  enrollmentPct: number
}

function computeStudyROI(study: Study, visits: Visit[]): StudyROI {
  const studyVisits = visits.filter((v) => v.studyId === study.id && v.status === 'completed')
  const totalMinutes = studyVisits.reduce(
    (sum, v) => sum + (v.actualDurationMinutes ?? v.durationMinutes),
    0,
  )
  const totalHours = (totalMinutes / 60).toFixed(1)

  const uniqueWeeks = new Set(
    studyVisits.map((v) => {
      const d = new Date(v.scheduledDate + 'T00:00:00Z')
      const day = d.getUTCDay()
      const diff = day === 0 ? -6 : 1 - day
      d.setUTCDate(d.getUTCDate() + diff)
      return d.toISOString().split('T')[0]
    }),
  )
  const activeWeeks = uniqueWeeks.size || 1
  const hoursPerWeek = (parseFloat(totalHours) / activeWeeks).toFixed(1)

  const enrolled = study.enrollmentData?.randomizations ?? 0
  const enrollmentPct =
    study.targetEnrollment > 0 ? Math.round((enrolled / study.targetEnrollment) * 100) : 0

  return { study, totalHours, activeWeeks, hoursPerWeek, enrollmentPct }
}

export function Financial() {
  const { studies, loading } = useStudies()
  const { visits } = useSiteVisits()

  const roiData = useMemo(
    () =>
      studies
        .map((s) => computeStudyROI(s, visits))
        .sort((a, b) => parseFloat(b.hoursPerWeek) - parseFloat(a.hoursPerWeek)),
    [studies, visits],
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-32 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Financial</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Study workload cost tracking. Contract values can be added when available.
        </p>
      </div>

      {roiData.length === 0 && (
        <p className="text-sm text-slate-400 py-8 text-center">No studies found.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {roiData.map(({ study, totalHours, hoursPerWeek, enrollmentPct }) => {
          const enrolled = study.enrollmentData?.randomizations ?? 0
          return (
            <div
              key={study.id}
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 leading-tight truncate">
                    {study.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{study.sponsor} · {study.phase}</p>
                </div>
                <StatusBadge status={study.status} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase">Hours Logged</p>
                  <p className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">
                    {`${totalHours}h logged`}
                  </p>
                  <p className="text-xs text-slate-400">{`${hoursPerWeek}h/week avg`}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase">Enrollment</p>
                  <p className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">
                    {`${enrolled} / ${study.targetEnrollment}`}
                  </p>
                  <p className="text-xs text-slate-400">{enrollmentPct}% of target</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 italic">
                  Contract value: <span className="text-slate-500">not set</span> — add in Study Settings to enable ROI tracking
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
