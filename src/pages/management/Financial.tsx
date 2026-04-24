import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
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
import type { Study, Visit, ContractMilestone } from '@/types'

interface StudyROI {
  study: Study
  totalHours: string
  activeWeeks: number
  hoursPerWeek: string
  enrollmentPct: number
}

// ── Milestone progress bar + next upcoming milestone ──────────────────────────

function MilestoneSection({ milestones }: { milestones: ContractMilestone[] }) {
  if (milestones.length === 0) {
    return (
      <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
        Milestones: <span style={{ color: 'var(--text-secondary)' }}>not set</span> — add in Study Settings to enable milestone tracking
      </p>
    )
  }

  const achieved = milestones.filter((m) => m.achieved).length
  const total = milestones.length
  const pct = Math.round((achieved / total) * 100)

  const today = new Date().toISOString().split('T')[0]
  const next = milestones
    .filter((m) => !m.achieved && m.expectedDate >= today)
    .sort((a, b) => a.expectedDate.localeCompare(b.expectedDate))[0]
  const overdue = !next
    ? milestones
        .filter((m) => !m.achieved)
        .sort((a, b) => b.expectedDate.localeCompare(a.expectedDate))[0]
    : null
  const upcoming = next ?? overdue

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
          <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {achieved} of {total}
          </span>{' '}
          milestones achieved
        </p>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct}%</span>
      </div>
      {/* thin progress bar */}
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: 'rgba(255 255 255 / 0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--accent-primary)',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      {/* next upcoming milestone */}
      {upcoming && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
          Next:{' '}
          <span style={{ color: 'var(--text-secondary)' }}>{upcoming.name}</span>
          {' · '}
          <span className="tabular-nums">${upcoming.amount.toLocaleString()}</span>
          {' · '}
          <span className="tabular-nums">{upcoming.expectedDate}</span>
          {upcoming.expectedDate < today && (
            <span style={{ color: 'var(--signal-alert)', marginLeft: 4 }}>(overdue)</span>
          )}
        </p>
      )}
    </div>
  )
}

// ── Per-study drill-down panel ────────────────────────────────────────────────

function StudyDrillDown({ study }: { study: Study }) {
  const milestones = study.contract?.milestones ?? []
  const { randomizations, screens, active, prescreens } = study.enrollmentData ?? {
    randomizations: 0, screens: 0, active: 0, prescreens: 0, completions: 0,
  }
  const psf = study.contract?.paidScreenFails

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 12, borderTop: '1px solid rgba(255 255 255 / 0.08)' }}>
      {/* Milestone table */}
      {milestones.length > 0 ? (
        <div>
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-label)',
              marginBottom: 8,
            }}
          >
            Milestones
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {(['Milestone', 'Amount', 'Date', 'Status'] as const).map((h, i) => (
                  <th
                    key={h}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--text-label)',
                      textAlign: i === 0 ? 'left' : 'right',
                      paddingBottom: 6,
                      borderBottom: '1px solid rgba(255 255 255 / 0.08)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {milestones.map((m, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255 255 255 / 0.05)' }}>
                  <td style={{ padding: '6px 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {m.name}
                  </td>
                  <td
                    style={{
                      padding: '6px 0',
                      fontSize: 12,
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--text-primary)',
                    }}
                  >
                    ${m.amount.toLocaleString()}
                  </td>
                  <td
                    style={{
                      padding: '6px 0',
                      fontSize: 11,
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {m.achieved && m.achievedDate ? m.achievedDate : m.expectedDate}
                  </td>
                  <td style={{ padding: '6px 0', textAlign: 'right' }}>
                    {m.achieved ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: 'rgba(52 211 153 / 0.12)',
                          color: 'var(--signal-good)',
                          border: '1px solid rgba(52 211 153 / 0.25)',
                        }}
                      >
                        Achieved ✓
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: 'rgba(255 255 255 / 0.05)',
                          color: 'var(--text-muted)',
                          border: '1px solid rgba(255 255 255 / 0.10)',
                        }}
                      >
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No milestones configured.
        </p>
      )}

      {/* Enrollment stats */}
      <div>
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-label)',
            marginBottom: 8,
          }}
        >
          Enrollment
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Randomized', value: `${randomizations} / ${study.targetEnrollment}` },
            { label: 'Screens', value: String(screens) },
            { label: 'Pre-screens', value: String(prescreens) },
            { label: 'Active', value: String(active) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Paid screen failures */}
      {psf && (psf.ratio != null || psf.maxPaid != null) && (
        <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          Paid screen failures:{' '}
          {psf.ratio != null && (
            <span className="font-semibold tabular-nums">{(psf.ratio * 100).toFixed(0)}% ratio</span>
          )}
          {psf.ratio != null && psf.maxPaid != null && ' · '}
          {psf.maxPaid != null && (
            <span className="font-semibold tabular-nums">max {psf.maxPaid}</span>
          )}
        </p>
      )}
    </div>
  )
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }
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
              const milestones = study.contract?.milestones ?? []
              const isExpanded = expandedIds.has(study.id)
              const ChevronIcon = isExpanded ? ChevronDown : ChevronRight

              return (
                <div
                  key={study.id}
                  className="glass"
                  style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, borderRadius: 12 }}
                >
                  {/* Header row — clickable to expand */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(study.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 8,
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                    }}
                  >
                    <div className="min-w-0" style={{ flex: 1 }}>
                      <p className="font-semibold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                        {study.name}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {study.sponsor} · {study.phase}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <StatusBadge status={study.status} />
                      <ChevronIcon
                        size={14}
                        style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                      />
                    </div>
                  </button>

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

                  {/* Contract value + milestone progress */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {study.contract?.totalValue != null ? (
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        Contract value: <span className="font-semibold tabular-nums">${study.contract.totalValue.toLocaleString()}</span>
                      </p>
                    ) : (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Contract value: <span style={{ color: 'var(--text-secondary)' }}>not set</span> — add in Study Settings to enable ROI tracking
                      </p>
                    )}
                    <MilestoneSection milestones={milestones} />
                  </div>

                  {/* Drill-down panel */}
                  {isExpanded && <StudyDrillDown study={study} />}
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
