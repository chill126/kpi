import { useState } from 'react'
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { FORECAST_CONFIG } from '@/lib/forecast-config'
import { Button } from '@/components/ui/button'
import type { SimulationResult, Investigator, FeasibilityVerdict } from '@/types'

interface Props {
  result: SimulationResult | null
  investigators: Investigator[]
  onSave: () => void
  saving: boolean
  sensitivityUp?: SimulationResult | null
  sensitivityDown?: SimulationResult | null
}

const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f472b6', '#22d3ee']

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

export function SimulationOutput({ result, investigators, onSave, saving, sensitivityUp, sensitivityDown }: Props) {
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

  // Build chart data — base always included, sensitivity lines included when toggled on
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Overall verdict */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Overall verdict:</span>
        <VerdictBadge verdict={result.overallVerdict} />
      </div>

      {/* Per-investigator verdict */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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

      {/* Estimated revenue */}
      <div style={{ borderRadius: 8, background: 'rgba(255 255 255 / 0.04)', border: '1px solid rgba(255 255 255 / 0.08)', padding: '10px 14px', fontSize: 13 }}>
        <span style={{ color: 'var(--text-secondary)' }}>Estimated contract value: </span>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
          ${result.estimatedRevenue.toLocaleString()}
        </span>
      </div>

      {/* Utilization chart */}
      <div style={{ borderRadius: 8, border: '1px solid rgba(255 255 255 / 0.08)', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {FORECAST_CONFIG.SIMULATOR_WEEKS}-week utilization projection
          </p>
          {hasSensitivity && (
            <button
              onClick={() => setShowSensitivity((v) => !v)}
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: '3px 10px',
                borderRadius: 6,
                border: `1px solid ${showSensitivity ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.12)'}`,
                background: showSensitivity ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: showSensitivity ? '#818cf8' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {showSensitivity ? 'Hide sensitivity' : 'Show sensitivity (±20%)'}
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
                  <Line
                    key={`${invId}-base`}
                    type="monotone"
                    dataKey={name}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    name={name}
                  />,
                  <Line
                    key={`${invId}-up`}
                    type="monotone"
                    dataKey={`${name} +20%`}
                    stroke={color}
                    strokeWidth={1}
                    strokeDasharray="5 3"
                    dot={false}
                    name={`${name} +20%`}
                    opacity={0.55}
                  />,
                  <Line
                    key={`${invId}-down`}
                    type="monotone"
                    dataKey={`${name} -20%`}
                    stroke={color}
                    strokeWidth={1}
                    strokeDasharray="5 3"
                    dot={false}
                    name={`${name} -20%`}
                    opacity={0.55}
                  />,
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
                  <Area
                    key={invId}
                    type="monotone"
                    dataKey={name}
                    stroke={COLORS[idx % COLORS.length]}
                    fill={COLORS[idx % COLORS.length]}
                    fillOpacity={0.08}
                    strokeWidth={2}
                  />
                )
              })}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      <Button variant="outline" onClick={onSave} disabled={saving} style={{ width: '100%' }}>
        {saving ? 'Saving…' : 'Save scenario'}
      </Button>
    </div>
  )
}
