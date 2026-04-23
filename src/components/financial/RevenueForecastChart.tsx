import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { Panel } from '@/components/hud/Panel'
import { EmptyState } from '@/components/hud/EmptyState'
import { chartPalette } from '@/components/hud/charts/palette'
import type { ContractMilestone, Study } from '@/types'

interface Props {
  studies: Study[]
  startDate: string
  endDate: string
}

interface QualifyingStudy {
  study: Study
  milestones: ContractMilestone[]
}

interface MonthSlot {
  key: string
  label: string
  year: number
  month: number
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parseIsoToUtc(iso: string): Date {
  return new Date(iso.slice(0, 10) + 'T00:00:00Z')
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function monthsBetween(startIso: string, endIso: string): MonthSlot[] {
  const start = parseIsoToUtc(startIso)
  const end = parseIsoToUtc(endIso)
  if (end.getTime() < start.getTime()) return []
  const slots: MonthSlot[] = []
  let year = start.getUTCFullYear()
  let month = start.getUTCMonth()
  const endYear = end.getUTCFullYear()
  const endMonth = end.getUTCMonth()
  while (year < endYear || (year === endYear && month <= endMonth)) {
    slots.push({
      key: monthKey(year, month),
      label: `${MONTH_LABELS[month]} ${year}`,
      year,
      month,
    })
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }
  return slots
}

function getQualifyingStudies(studies: Study[]): QualifyingStudy[] {
  const result: QualifyingStudy[] = []
  for (const study of studies) {
    const milestones = study.contract?.milestones ?? []
    const hasMilestones = milestones.length > 0
    const hasTotalValue = study.contract?.totalValue != null
    if (!hasMilestones && !hasTotalValue) continue
    result.push({ study, milestones })
  }
  return result
}

function milestoneEffectiveDate(m: ContractMilestone): string {
  return m.achieved && m.achievedDate ? m.achievedDate : m.expectedDate
}

function computeStudyMonthlyRevenue(
  qs: QualifyingStudy,
  slots: MonthSlot[],
): Record<string, number> {
  const { study, milestones } = qs
  const monthly: Record<string, number> = {}
  for (const slot of slots) monthly[slot.key] = 0

  if (milestones.length > 0) {
    for (const m of milestones) {
      const iso = milestoneEffectiveDate(m)
      if (!iso) continue
      const d = parseIsoToUtc(iso)
      const key = monthKey(d.getUTCFullYear(), d.getUTCMonth())
      if (key in monthly) monthly[key] += m.amount
    }
    return monthly
  }

  const totalValue = study.contract?.totalValue
  if (totalValue == null) return monthly
  if (!study.startDate || !study.expectedEndDate) return monthly

  const studyStart = parseIsoToUtc(study.startDate)
  const studyEnd = parseIsoToUtc(study.expectedEndDate)
  if (studyEnd.getTime() < studyStart.getTime()) return monthly

  const studySlots = monthsBetween(study.startDate, study.expectedEndDate)
  if (studySlots.length === 0) return monthly
  const perMonth = totalValue / studySlots.length

  for (const studySlot of studySlots) {
    if (studySlot.key in monthly) monthly[studySlot.key] += perMonth
  }
  return monthly
}

export function RevenueForecastChart({ studies, startDate, endDate }: Props) {
  const qualifying = useMemo(() => getQualifyingStudies(studies), [studies])

  const slots = useMemo(() => monthsBetween(startDate, endDate), [startDate, endDate])

  const chartData = useMemo(() => {
    return slots.map((slot) => {
      const entry: Record<string, string | number> = { month: slot.label }
      for (const qs of qualifying) {
        const monthly = computeStudyMonthlyRevenue(qs, slots)
        entry[qs.study.name] = Math.round(monthly[slot.key] ?? 0)
      }
      return entry
    })
  }, [slots, qualifying])

  const milestoneRows = useMemo(() => {
    const startMs = parseIsoToUtc(startDate).getTime()
    const endMs = parseIsoToUtc(endDate).getTime()
    const rows: {
      studyId: string
      studyName: string
      name: string
      amount: number
      expectedDate: string
      achieved: boolean
    }[] = []
    for (const qs of qualifying) {
      for (const m of qs.milestones) {
        if (!m.expectedDate) continue
        const d = parseIsoToUtc(m.expectedDate)
        if (Number.isNaN(d.getTime())) continue
        const t = d.getTime()
        if (t < startMs || t > endMs) continue
        rows.push({
          studyId: qs.study.id,
          studyName: qs.study.name,
          name: m.name,
          amount: m.amount,
          expectedDate: m.expectedDate,
          achieved: m.achieved,
        })
      }
    }
    rows.sort((a, b) => a.expectedDate.localeCompare(b.expectedDate))
    return rows
  }, [qualifying, startDate, endDate])

  if (qualifying.length === 0) {
    return (
      <EmptyState
        title="No contract data available"
        body="Add contract values to studies to enable revenue forecasting."
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Panel title="Projected Revenue by Month">
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, marginTop: -4 }}>
          Stacked contributions per study, based on milestone dates or even distribution.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }} stackOffset="none">
            <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} />
            <XAxis dataKey="month" tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }} />
            <YAxis
              tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }}
              tickFormatter={(value: number) => `$${value.toLocaleString()}`}
            />
            <Tooltip formatter={(value, name) => ['$' + Number(value).toLocaleString(), name]} />
            <Legend />
            {qualifying.map((qs, idx) => (
              <Area
                key={qs.study.id}
                type="monotone"
                dataKey={qs.study.name}
                stackId="revenue"
                stroke={chartPalette.series[idx % chartPalette.series.length]}
                fill={chartPalette.series[idx % chartPalette.series.length]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Milestone Timeline">
        {milestoneRows.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '16px 0', textAlign: 'center' }}>
            No milestones scheduled within this range.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255 255 255 / 0.08)' }}>
                <th className="text-left pb-2" style={{ color: 'var(--text-label)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Study</th>
                <th className="text-left pb-2" style={{ color: 'var(--text-label)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Milestone</th>
                <th className="text-right pb-2" style={{ color: 'var(--text-label)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Amount</th>
                <th className="text-right pb-2" style={{ color: 'var(--text-label)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Expected Date</th>
                <th className="text-right pb-2" style={{ color: 'var(--text-label)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {milestoneRows.map((row, idx) => (
                <tr
                  key={`${row.studyId}-${row.name}-${idx}`}
                  style={{ borderBottom: '1px solid rgba(255 255 255 / 0.06)' }}
                >
                  <td className="py-2" style={{ color: 'var(--text-primary)' }}>{row.studyName}</td>
                  <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{row.name}</td>
                  <td className="py-2 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    ${row.amount.toLocaleString()}
                  </td>
                  <td className="py-2 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {row.expectedDate}
                  </td>
                  <td className="py-2 text-right">
                    {row.achieved ? (
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--signal-good)' }}>
                        Achieved ✓
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  )
}
