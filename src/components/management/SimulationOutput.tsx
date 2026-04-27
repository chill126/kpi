import { useState } from 'react'
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { FORECAST_CONFIG } from '@/lib/forecast-config'
import { interpolateRamp } from '@/lib/capacity'
import type { SimulationResult, Investigator, FeasibilityVerdict, HypotheticalStudy } from '@/types'

interface Props {
  result: SimulationResult | null
  study: HypotheticalStudy
  investigators: Investigator[]
  onSave: () => void
  saving: boolean
  sensitivityUp?: SimulationResult | null
  sensitivityDown?: SimulationResult | null
  earliestFeasibleStart?: { date: string; weeksFromNow: number } | null
}

const COLORS = ['oklch(0.65 0.26 222)', 'oklch(0.78 0.15 162)', 'oklch(0.79 0.16 82)', 'oklch(0.80 0.20 330)', 'oklch(0.80 0.12 185)']

function VerdictBadge({ verdict }: { verdict: FeasibilityVerdict }) {
  const style =
    verdict === 'feasible'
      ? { background: 'rgba(22, 163, 74, 0.15)', color: 'var(--signal-good)', border: '1px solid rgba(22, 163, 74, 0.25)' }
      : verdict === 'caution'
      ? { background: 'rgba(217, 119, 6, 0.15)', color: 'var(--signal-warn)', border: '1px solid rgba(217, 119, 6, 0.25)' }
      : { background: 'rgba(220, 38, 38, 0.15)', color: 'var(--signal-alert)', border: '1px solid rgba(220, 38, 38, 0.25)' }
  const label = verdict === 'feasible' ? 'Feasible' : verdict === 'caution' ? 'Caution' : 'Not Feasible'
  return (
    <span style={{ ...style, display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
      {label}
    </span>
  )
}

function MetricRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
        {sub && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>{sub}</span>}
      </span>
    </div>
  )
}

export function SimulationOutput({ result, study, investigators, onSave, saving, sensitivityUp, sensitivityDown, earliestFeasibleStart }: Props) {
  const [showSensitivity, setShowSensitivity] = useState(false)

  if (!result) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '0 24px' }}>
        Assign investigators and fill in the study parameters to see the capacity projection.
      </div>
    )
  }

  const invMap = Object.fromEntries(investigators.map((i) => [i.id, i]))
  const hasSensitivity = Boolean(sensitivityUp && sensitivityDown)

  // ── Coordinator impact ──────────────────────────────────────────────────────
  const peakParticipants = Math.min(
    interpolateRamp(study.enrollmentRamp, 8),
    study.targetEnrollment,
  )
  const visitsPerWeekAtPeak = (study.visitsPerParticipantPerMonth / 4.33) * Math.max(peakParticipants, study.targetEnrollment * 0.8)
  const peakCoordHoursPerWeek = (visitsPerWeekAtPeak * study.avgAssessmentMinutesPerVisit) / 60
  const coordCapacity = study.coordinatorCapacityHoursPerWeek ?? 40
  const coordPct = coordCapacity > 0 ? Math.round((peakCoordHoursPerWeek / coordCapacity) * 100) : 0
  const coordVerdict: FeasibilityVerdict =
    coordPct >= FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT ? 'infeasible'
    : coordPct >= FORECAST_CONFIG.WARNING_THRESHOLD_PCT ? 'caution'
    : 'feasible'

  // ── Financial breakdown ─────────────────────────────────────────────────────
  const perPatientRate = study.targetEnrollment > 0 && study.estimatedContractValue > 0
    ? Math.round(study.estimatedContractValue / study.targetEnrollment)
    : null

  // ── Chart data ──────────────────────────────────────────────────────────────
  const chartData = Array.from({ length: FORECAST_CONFIG.SIMULATOR_WEEKS }, (_, w) => {
    const entry: Record<string, string | number> = { week: `W${w + 1}` }
    for (const [invId, simResult] of Object.entries(result.byInvestigator)) {
      const name = invMap[invId]?.name ?? invId
      entry[name] = simResult.weeklyUtilizationPct[w] ?? 0
      if (showSensitivity && sensitivityUp && sensitivityDown) {
        entry[`${name} +20%`] = sensitivityUp.byInvestigator[invId]?.weeklyUtilizationPct[w] ?? 0
        entry[`${name} -20%`] = sensitivityDown.byInvestigator[invId]?.weeklyUtilizationPct[w] ?? 0
      }
    }
    return entry
  })

  const panelStyle: React.CSSProperties = {
    borderRadius: 10, border: '1px solid rgba(255 255 255 / 0.08)', padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 8,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Earliest feasible start ── */}
      {result.overallVerdict !== 'feasible' && (
        <div style={{
          borderRadius: 10, padding: '10px 14px', fontSize: 13,
          background: earliestFeasibleStart
            ? 'rgba(245 158 11 / 0.10)'
            : 'rgba(248 113 113 / 0.10)',
          border: earliestFeasibleStart
            ? '1px solid rgba(245 158 11 / 0.25)'
            : '1px solid rgba(248 113 113 / 0.25)',
        }}>
          {earliestFeasibleStart ? (
            <>
              <span style={{ fontWeight: 600, color: 'var(--signal-warn)' }}>Capacity conflict</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {' '}— earliest feasible start:{' '}
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {earliestFeasibleStart.date}
                </span>
                {earliestFeasibleStart.weeksFromNow === 0
                  ? ' (today)'
                  : ` (${earliestFeasibleStart.weeksFromNow} week${earliestFeasibleStart.weeksFromNow !== 1 ? 's' : ''} from now)`}
              </span>
            </>
          ) : (
            <>
              <span style={{ fontWeight: 600, color: 'var(--signal-alert)' }}>No feasible window</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {' '}found within 20 weeks — consider reducing study load or adding investigator capacity.
              </span>
            </>
          )}
        </div>
      )}
      {result.overallVerdict === 'feasible' && (
        <div style={{ borderRadius: 10, padding: '10px 14px', fontSize: 13, background: 'rgba(52 211 153 / 0.10)', border: '1px solid rgba(52 211 153 / 0.2)' }}>
          <span style={{ fontWeight: 600, color: 'var(--signal-good)' }}>Feasible at selected start date</span>
          <span style={{ color: 'var(--text-secondary)' }}> — current workload can absorb this study.</span>
        </div>
      )}

      {/* ── Overall + per-investigator verdict ── */}
      <div style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Overall verdict</span>
          <VerdictBadge verdict={result.overallVerdict} />
        </div>
        {Object.entries(result.byInvestigator).map(([invId, simResult]) => {
          const name = invMap[invId]?.name ?? invId
          return (
            <div key={invId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{name}</span>
                <VerdictBadge verdict={simResult.feasibilityVerdict} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                Peak {simResult.peakPct}% wk {simResult.peakWeek}
                {simResult.criticalWeek !== null && ` · 90% at wk ${simResult.criticalWeek}`}
                {simResult.cautionWeek !== null && simResult.criticalWeek === null && ` · 75% at wk ${simResult.cautionWeek}`}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Coordinator impact ── */}
      {study.avgAssessmentMinutesPerVisit > 0 && (
        <div style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Coordinator impact</span>
            <VerdictBadge verdict={coordVerdict} />
          </div>
          <MetricRow
            label="Peak coordinator demand"
            value={`${peakCoordHoursPerWeek.toFixed(1)} h/wk`}
            sub={`of ${coordCapacity}h capacity (${coordPct}%)`}
          />
          <MetricRow
            label="FTE equivalent"
            value={`${(peakCoordHoursPerWeek / 40).toFixed(2)} FTE`}
            sub="based on 40h/wk"
          />
          {coordPct > 0 && (
            <div style={{ marginTop: 4, height: 4, background: 'rgba(255 255 255 / 0.08)', borderRadius: 9999, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(coordPct, 100)}%`,
                borderRadius: 9999,
                background: coordVerdict === 'infeasible' ? 'var(--signal-alert)'
                  : coordVerdict === 'caution' ? 'var(--signal-warn)'
                  : 'var(--signal-good)',
                transition: 'width 0.3s ease',
              }} />
            </div>
          )}
        </div>
      )}

      {/* ── Financial breakdown ── */}
      {study.estimatedContractValue > 0 && (
        <div style={panelStyle}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 2 }}>Financial</span>
          <MetricRow label="Total contract value" value={`$${study.estimatedContractValue.toLocaleString()}`} />
          {perPatientRate !== null && (
            <MetricRow label="Per-patient rate" value={`$${perPatientRate.toLocaleString()}`} sub="/ patient enrolled" />
          )}
          <MetricRow
            label="Projected at current ramp"
            value={`$${result.estimatedRevenue.toLocaleString()}`}
            sub={study.estimatedContractValue > 0
              ? `(${Math.round((result.estimatedRevenue / study.estimatedContractValue) * 100)}% of contract)`
              : undefined}
          />
        </div>
      )}

      {/* ── Utilization chart ── */}
      <div style={{ borderRadius: 10, border: '1px solid rgba(255 255 255 / 0.08)', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {FORECAST_CONFIG.SIMULATOR_WEEKS}-week PI utilization projection
          </p>
          {hasSensitivity && (
            <button
              onClick={() => setShowSensitivity((v) => !v)}
              style={{
                fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                border: `1px solid ${showSensitivity ? 'rgba(30 120 255 / 0.5)' : 'rgba(255,255,255,0.12)'}`,
                background: showSensitivity ? 'rgba(30 120 255 / 0.15)' : 'transparent',
                color: showSensitivity ? 'var(--accent-primary)' : 'var(--text-muted)',
                transition: 'all 0.15s', fontFamily: 'inherit',
              }}
            >
              {showSensitivity ? 'Hide sensitivity' : 'Show ±20% sensitivity'}
            </button>
          )}
        </div>

        <ResponsiveContainer width="100%" height={220}>
          {showSensitivity ? (
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} interval={3} />
              <YAxis unit="%" domain={[0, 110]} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
              <Tooltip
                contentStyle={{ background: 'rgba(12,12,28,0.95)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${Number(v)}%`, '']}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={FORECAST_CONFIG.WARNING_THRESHOLD_PCT} stroke="rgba(217,119,6,0.6)" strokeDasharray="4 2" />
              <ReferenceLine y={FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT} stroke="rgba(220,38,38,0.6)" strokeDasharray="4 2" />
              {Object.keys(result.byInvestigator).map((invId, idx) => {
                const name = invMap[invId]?.name ?? invId
                const color = COLORS[idx % COLORS.length]
                return [
                  <Line key={`${invId}-base`} type="monotone" dataKey={name} stroke={color} strokeWidth={2} dot={false} name={name} />,
                  <Line key={`${invId}-up`} type="monotone" dataKey={`${name} +20%`} stroke={color} strokeWidth={1} strokeDasharray="5 3" dot={false} name={`${name} +20%`} opacity={0.5} />,
                  <Line key={`${invId}-dn`} type="monotone" dataKey={`${name} -20%`} stroke={color} strokeWidth={1} strokeDasharray="5 3" dot={false} name={`${name} -20%`} opacity={0.5} />,
                ]
              })}
            </LineChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} interval={3} />
              <YAxis unit="%" domain={[0, 110]} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
              <Tooltip
                contentStyle={{ background: 'rgba(12,12,28,0.95)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${Number(v)}%`, '']}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={FORECAST_CONFIG.WARNING_THRESHOLD_PCT} stroke="rgba(217,119,6,0.6)" strokeDasharray="4 2" />
              <ReferenceLine y={FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT} stroke="rgba(220,38,38,0.6)" strokeDasharray="4 2" />
              {Object.keys(result.byInvestigator).map((invId, idx) => {
                const name = invMap[invId]?.name ?? invId
                return (
                  <Area key={invId} type="monotone" dataKey={name} stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} fillOpacity={0.08} strokeWidth={2} />
                )
              })}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* ── Save button ── */}
      <button
        onClick={onSave}
        disabled={saving}
        style={{
          width: '100%', height: 36, borderRadius: 8,
          background: 'rgba(255 255 255 / 0.06)',
          border: '1px solid rgba(255 255 255 / 0.12)',
          color: 'var(--text-secondary)', fontSize: 13,
          cursor: saving ? 'default' : 'pointer',
          fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
          transition: 'background 150ms',
        }}
        onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = 'rgba(255 255 255 / 0.10)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255 255 255 / 0.06)' }}
      >
        {saving ? 'Saving…' : 'Save scenario'}
      </button>
    </div>
  )
}
