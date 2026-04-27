import { useState, useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, LabelList,
} from 'recharts'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { useStudies } from '@/hooks/useStudies'
import { useWhatIfScenarios } from '@/hooks/useWhatIfScenarios'
import { useSite } from '@/hooks/useSite'
import { simulateStudyImpact, findEarliestFeasibleStart } from '@/lib/capacity'
import { saveWhatIfScenario, deleteWhatIfScenario } from '@/lib/whatif'
import { FORECAST_CONFIG } from '@/lib/forecast-config'
import { WhatIfForm } from '@/components/management/WhatIfForm'
import { SimulationOutput } from '@/components/management/SimulationOutput'
import { Skeleton } from '@/components/hud/Skeleton'
import { Panel } from '@/components/hud/Panel'
import type { HypotheticalStudy, WhatIfScenario, FeasibilityVerdict } from '@/types'

function defaultStudy(): HypotheticalStudy {
  return {
    name: '',
    assignedInvestigatorIds: [],
    targetEnrollment: 0,
    enrollmentRamp: Object.fromEntries(FORECAST_CONFIG.RAMP_CHECKPOINTS.map((w) => [w, 0])),
    simpleMode: true,
    monthlyEnrollmentRate: 0,
    rampUpWeeks: 4,
    avgInvestigatorMinutesPerVisit: 0,
    avgAssessmentMinutesPerVisit: 0,
    visitsPerParticipantPerMonth: 0,
    estimatedContractValue: 0,
    coordinatorCapacityHoursPerWeek: 40,
    durationWeeks: 26,
    startDate: new Date().toISOString().split('T')[0],
  }
}

function verdictColor(verdict: FeasibilityVerdict): string {
  if (verdict === 'feasible') return '#34d399'
  if (verdict === 'caution') return '#fbbf24'
  return '#f87171'
}

function verdictBadgeStyle(verdict: FeasibilityVerdict): React.CSSProperties {
  if (verdict === 'feasible') {
    return { background: 'rgba(22,163,74,0.15)', color: 'var(--signal-good)', border: '1px solid rgba(22,163,74,0.25)' }
  }
  if (verdict === 'caution') {
    return { background: 'rgba(217,119,6,0.15)', color: 'var(--signal-warn)', border: '1px solid rgba(217,119,6,0.25)' }
  }
  return { background: 'rgba(220,38,38,0.15)', color: 'var(--signal-alert)', border: '1px solid rgba(220,38,38,0.25)' }
}

function VerdictBadge({ verdict }: { verdict: FeasibilityVerdict }) {
  const label = verdict === 'feasible' ? 'Feasible' : verdict === 'caution' ? 'Caution' : 'Not Feasible'
  return (
    <span style={{
      ...verdictBadgeStyle(verdict),
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
    }}>
      {label}
    </span>
  )
}

function peakUtilization(scenario: WhatIfScenario): number {
  const values = Object.values(scenario.result.byInvestigator).map((r) => r.peakPct)
  return values.length > 0 ? Math.max(...values) : 0
}

export function WhatIf() {
  const { siteId } = useSite()
  const { investigators, loading: invLoading } = useInvestigators()
  const { studies, loading: studiesLoading } = useStudies()
  const { visits } = useSiteVisits()
  const { assessments } = useSiteAssessments()
  const { scenarios, loading: scenariosLoading } = useWhatIfScenarios()

  const [study, setStudy] = useState<HypotheticalStudy>(defaultStudy)
  const [saving, setSaving] = useState(false)
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set())

  const loading = invLoading || studiesLoading

  const assignedInvestigators = useMemo(
    () => investigators.filter((i) => study.assignedInvestigatorIds.includes(i.id)),
    [investigators, study.assignedInvestigatorIds],
  )

  const result = useMemo(() => {
    if (assignedInvestigators.length === 0) return null
    return simulateStudyImpact(study, assignedInvestigators, studies, visits, assessments)
  }, [study, assignedInvestigators, studies, visits, assessments])

  // Sensitivity variants: ramp values scaled ±20%
  const sensitivityUp = useMemo(() => {
    if (assignedInvestigators.length === 0) return null
    const scaledRamp = Object.fromEntries(
      Object.entries(study.enrollmentRamp).map(([k, v]) => [k, Number(v) * 1.2]),
    )
    return simulateStudyImpact(
      { ...study, enrollmentRamp: scaledRamp },
      assignedInvestigators,
      studies,
      visits,
      assessments,
    )
  }, [study, assignedInvestigators, studies, visits, assessments])

  const sensitivityDown = useMemo(() => {
    if (assignedInvestigators.length === 0) return null
    const scaledRamp = Object.fromEntries(
      Object.entries(study.enrollmentRamp).map(([k, v]) => [k, Number(v) * 0.8]),
    )
    return simulateStudyImpact(
      { ...study, enrollmentRamp: scaledRamp },
      assignedInvestigators,
      studies,
      visits,
      assessments,
    )
  }, [study, assignedInvestigators, studies, visits, assessments])

  const earliestFeasibleStart = useMemo(() => {
    if (assignedInvestigators.length === 0) return null
    return findEarliestFeasibleStart(study, assignedInvestigators, studies, visits, assessments)
  }, [study, assignedInvestigators, studies, visits, assessments])

  const handleSave = async () => {
    if (!result) return
    setSaving(true)
    try {
      await saveWhatIfScenario(siteId, study, result)
    } finally {
      setSaving(false)
    }
  }

  const handleLoadScenario = (scenario: WhatIfScenario) => {
    setStudy(scenario.study)
  }

  const handleDelete = async (id: string) => {
    await deleteWhatIfScenario(siteId, id)
    setCompareIds((prev) => { const next = new Set(prev); next.delete(id); return next })
  }

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 2) {
        next.add(id)
      }
      return next
    })
  }

  const compareScenarios = scenarios.filter((s) => compareIds.has(s.id))

  // Scatter data: one point per saved scenario
  const scatterData = useMemo(
    () =>
      scenarios.map((s) => ({
        id: s.id,
        name: s.study.name || 'Untitled',
        x: peakUtilization(s),
        y: s.result.estimatedRevenue,
        verdict: s.result.overallVerdict,
        fill: verdictColor(s.result.overallVerdict),
      })),
    [scenarios],
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton height={28} width={200} />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton height={384} />
          <Skeleton height={384} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>What-If Simulator</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
          Model a hypothetical study to see its capacity impact before committing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Panel title="Hypothetical Study">
          <WhatIfForm value={study} onChange={setStudy} investigators={investigators} />
        </Panel>

        <Panel title="Projection">
          <SimulationOutput
            result={result}
            study={study}
            investigators={assignedInvestigators}
            onSave={handleSave}
            saving={saving}
            sensitivityUp={sensitivityUp}
            sensitivityDown={sensitivityDown}
            earliestFeasibleStart={earliestFeasibleStart}
          />
        </Panel>
      </div>

      {!scenariosLoading && scenarios.length > 0 && (
        <Panel title="Saved Scenarios">
          {/* Comparison table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Compare', 'Scenario Name', 'Investigators', 'Peak Utilization', 'Est. Revenue', 'Verdict', 'Actions'].map((col) => (
                    <th
                      key={col}
                      style={{
                        textAlign: 'left',
                        padding: '6px 12px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-label)',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => {
                  const peak = peakUtilization(s)
                  const invCount = s.study.assignedInvestigatorIds.length
                  return (
                    <tr
                      key={s.id}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <input
                          type="checkbox"
                          checked={compareIds.has(s.id)}
                          onChange={() => toggleCompare(s.id)}
                          disabled={!compareIds.has(s.id) && compareIds.size >= 2}
                          style={{ accentColor: 'var(--accent-primary)', width: 14, height: 14, cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {s.study.name || 'Untitled'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                        {invCount}
                      </td>
                      <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{
                          color: peak >= FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT
                            ? 'var(--signal-alert)'
                            : peak >= FORECAST_CONFIG.WARNING_THRESHOLD_PCT
                            ? 'var(--signal-warn)'
                            : 'var(--signal-good)',
                          fontWeight: 600,
                        }}>
                          {peak}%
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        ${s.result.estimatedRevenue.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <VerdictBadge verdict={s.result.overallVerdict} />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleLoadScenario(s)}
                            style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            style={{ fontSize: 12, color: 'var(--signal-alert)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Revenue vs capacity scatter — only when 2+ scenarios */}
          {scenarios.length >= 2 && (
            <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Revenue vs. Capacity
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart margin={{ top: 8, right: 24, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Peak Utilization"
                    unit="%"
                    domain={[0, 110]}
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }}
                    label={{ value: 'Peak Utilization (%)', position: 'insideBottom', offset: -2, fontSize: 11, fill: 'rgba(255,255,255,0.3)' }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Est. Revenue"
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ background: 'rgba(12,12,28,0.95)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 }}
                    formatter={(value, name) => {
                      if (name === 'Peak Utilization') return [`${value}%`, name]
                      if (name === 'Est. Revenue') return [`$${Number(value).toLocaleString()}`, name]
                      return [value, name]
                    }}
                    cursor={{ strokeDasharray: '3 3' }}
                  />
                  {/* Caution zone reference */}
                  <ReferenceLine
                    x={FORECAST_CONFIG.WARNING_THRESHOLD_PCT}
                    stroke="rgba(217,119,6,0.5)"
                    strokeDasharray="4 2"
                    label={{ value: 'Caution', position: 'top', fontSize: 10, fill: 'rgba(217,119,6,0.7)' }}
                  />
                  {/* Infeasible zone reference */}
                  <ReferenceLine
                    x={FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT}
                    stroke="rgba(220,38,38,0.5)"
                    strokeDasharray="4 2"
                    label={{ value: 'Critical', position: 'top', fontSize: 10, fill: 'rgba(220,38,38,0.7)' }}
                  />
                  <Scatter
                    data={scatterData}
                    shape={(props: { cx?: number; cy?: number; payload?: { fill: string } }) => {
                      const { cx = 0, cy = 0, payload } = props
                      return <circle cx={cx} cy={cy} r={6} fill={payload?.fill ?? '#818cf8'} fillOpacity={0.85} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
                    }}
                  >
                    <LabelList
                      dataKey="name"
                      position="top"
                      style={{ fontSize: 10, fill: 'rgba(255,255,255,0.55)' }}
                    />
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* Scenario comparison panel — shown when exactly 2 selected */}
          {compareScenarios.length === 2 && (() => {
            const [a, b] = compareScenarios
            const peakA = peakUtilization(a)
            const peakB = peakUtilization(b)
            const rows: Array<{ label: string; a: string; b: string; winner?: 'a' | 'b' | 'tie' }> = [
              {
                label: 'Overall Verdict',
                a: a.result.overallVerdict,
                b: b.result.overallVerdict,
                winner:
                  a.result.overallVerdict === b.result.overallVerdict
                    ? 'tie'
                    : a.result.overallVerdict === 'feasible'
                    ? 'a'
                    : b.result.overallVerdict === 'feasible'
                    ? 'b'
                    : a.result.overallVerdict === 'caution'
                    ? 'a'
                    : 'b',
              },
              {
                label: 'Peak Utilization',
                a: `${peakA}%`,
                b: `${peakB}%`,
                winner: peakA < peakB ? 'a' : peakA > peakB ? 'b' : 'tie',
              },
              {
                label: 'Est. Revenue',
                a: `$${a.result.estimatedRevenue.toLocaleString()}`,
                b: `$${b.result.estimatedRevenue.toLocaleString()}`,
                winner:
                  a.result.estimatedRevenue > b.result.estimatedRevenue
                    ? 'a'
                    : a.result.estimatedRevenue < b.result.estimatedRevenue
                    ? 'b'
                    : 'tie',
              },
              {
                label: 'Target Enrollment',
                a: String(a.study.targetEnrollment),
                b: String(b.study.targetEnrollment),
              },
              {
                label: 'Duration',
                a: `${a.study.durationWeeks} wks`,
                b: `${b.study.durationWeeks} wks`,
              },
              {
                label: 'Investigators',
                a: String(a.study.assignedInvestigatorIds.length),
                b: String(b.study.assignedInvestigatorIds.length),
              },
              {
                label: 'Visits / pt / mo',
                a: String(a.study.visitsPerParticipantPerMonth),
                b: String(b.study.visitsPerParticipantPerMonth),
              },
            ]
            const winColor = 'var(--accent-primary)'
            const winBg = 'rgba(14,165,233,0.10)'
            return (
              <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
                <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Side-by-Side Comparison
                </p>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <th style={{ textAlign: 'left', padding: '6px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-label)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Metric</th>
                      <th style={{ textAlign: 'center', padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {a.study.name || 'Scenario A'}
                      </th>
                      <th style={{ textAlign: 'center', padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {b.study.name || 'Scenario B'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.label} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{row.label}</td>
                        <td style={{
                          padding: '8px 12px', textAlign: 'center', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                          color: row.winner === 'a' ? winColor : 'var(--text-primary)',
                          background: row.winner === 'a' ? winBg : 'transparent',
                        }}>
                          {row.a}
                        </td>
                        <td style={{
                          padding: '8px 12px', textAlign: 'center', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                          color: row.winner === 'b' ? winColor : 'var(--text-primary)',
                          background: row.winner === 'b' ? winBg : 'transparent',
                        }}>
                          {row.b}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                  Highlighted cells indicate the better value for that metric.
                </p>
              </div>
            )
          })()}
        </Panel>
      )}
    </div>
  )
}
