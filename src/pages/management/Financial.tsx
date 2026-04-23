import { useMemo, useState } from 'react'
import { useStudies } from '@/hooks/useStudies'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/hud/Skeleton'
import { EmptyState } from '@/components/hud/EmptyState'
import { HUDTabBar } from '@/components/hud/TabBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RevenueForecastChart } from '@/components/financial/RevenueForecastChart'
import type { Study, Visit } from '@/types'

interface StudyROI {
  study: Study
  totalHours: string
  activeWeeks: number
  hoursPerWeek: string
  enrollmentPct: number
}

type RangeMode = '3m' | '6m' | '12m' | 'custom'

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

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

function addMonthsIso(isoDate: string, months: number): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  const targetMonth = d.getUTCMonth() + months
  d.setUTCMonth(targetMonth)
  return d.toISOString().split('T')[0]
}

export function Financial() {
  const { studies, loading } = useStudies()
  const { visits } = useSiteVisits()

  const [tab, setTab] = useState('workload')
  const [rangeMode, setRangeMode] = useState<RangeMode>('6m')
  const today = todayIso()
  const [customStart, setCustomStart] = useState<string>(today)
  const [customEnd, setCustomEnd] = useState<string>(addMonthsIso(today, 6))

  const { startDate, endDate } = useMemo(() => {
    if (rangeMode === 'custom') {
      return { startDate: customStart, endDate: customEnd }
    }
    const months = rangeMode === '3m' ? 3 : rangeMode === '12m' ? 12 : 6
    return { startDate: today, endDate: addMonthsIso(today, months) }
  }, [rangeMode, customStart, customEnd, today])

  const roiData = useMemo(
    () =>
      studies
        .map((s) => computeStudyROI(s, visits))
        .sort((a, b) => parseFloat(b.hoursPerWeek) - parseFloat(a.hoursPerWeek)),
    [studies, visits],
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton height={28} width={260} />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => <Skeleton key={n} height={128} />)}
        </div>
      </div>
    )
  }

  const presets: { value: Exclude<RangeMode, 'custom'>; label: string }[] = [
    { value: '3m', label: '3 months' },
    { value: '6m', label: '6 months' },
    { value: '12m', label: '12 months' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
          Financial
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
          Study workload cost tracking and contract revenue forecasting.
        </p>
      </div>

      <HUDTabBar
        tabs={[
          { value: 'workload', label: 'Workload' },
          { value: 'revenue', label: 'Revenue Forecast' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'workload' && (
        <div className="space-y-6 pt-4">
          {roiData.length === 0 && (
            <EmptyState title="No studies yet" />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {roiData.map(({ study, totalHours, hoursPerWeek, enrollmentPct }) => {
              const enrolled = study.enrollmentData?.randomizations ?? 0
              return (
                <div
                  key={study.id}
                  className="glass"
                  style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, borderRadius: 12 }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                        {study.name}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {study.sponsor} · {study.phase}
                      </p>
                    </div>
                    <StatusBadge status={study.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Hours Logged</p>
                      <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                        {`${totalHours}h logged`}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{`${hoursPerWeek}h/week avg`}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Enrollment</p>
                      <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                        {`${enrolled} / ${study.targetEnrollment}`}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{enrollmentPct}% of target</p>
                    </div>
                  </div>

                  <div>
                    {study.contract?.totalValue != null ? (
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        Contract value: <span className="font-semibold tabular-nums">${study.contract.totalValue.toLocaleString()}</span>
                      </p>
                    ) : (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Contract value: <span style={{ color: 'var(--text-secondary)' }}>not set</span> — add in Study Settings to enable ROI tracking
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {tab === 'revenue' && (
        <div className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {presets.map((p) => {
              const active = rangeMode === p.value
              return (
                <Button
                  key={p.value}
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  style={active ? { background: 'var(--accent-primary)', border: 'none', color: 'oklch(0.09 0.015 275)' } : undefined}
                  onClick={() => setRangeMode(p.value)}
                >
                  {p.label}
                </Button>
              )
            })}
            <Button
              size="sm"
              variant={rangeMode === 'custom' ? 'default' : 'outline'}
              style={rangeMode === 'custom' ? { background: 'var(--accent-primary)', border: 'none', color: 'oklch(0.09 0.015 275)' } : undefined}
              onClick={() => setRangeMode('custom')}
            >
              Custom
            </Button>

            {rangeMode === 'custom' && (
              <div className="flex items-center gap-2 ml-2">
                <Label htmlFor="revenue-start" className="text-xs text-slate-500">
                  Start
                </Label>
                <Input
                  id="revenue-start"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-8 w-auto"
                />
                <Label htmlFor="revenue-end" className="text-xs text-slate-500">
                  End
                </Label>
                <Input
                  id="revenue-end"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-8 w-auto"
                />
              </div>
            )}
          </div>

          <RevenueForecastChart studies={studies} startDate={startDate} endDate={endDate} />
        </div>
      )}
    </div>
  )
}
