import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { FORECAST_CONFIG } from '@/lib/forecast-config'
import type { SimulationResult, Investigator, FeasibilityVerdict } from '@/types'

interface Props {
  result: SimulationResult | null
  investigators: Investigator[]
  onSave: () => void
  saving: boolean
}

const COLORS = ['#6366f1', '#0d9488', '#f59e0b', '#ec4899', '#14b8a6']

function VerdictBadge({ verdict }: { verdict: FeasibilityVerdict }) {
  const styles: Record<FeasibilityVerdict, string> = {
    feasible: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
    caution: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    infeasible: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
  }
  const labels: Record<FeasibilityVerdict, string> = {
    feasible: '✓ Feasible',
    caution: '⚠ Caution',
    infeasible: '✗ Not Feasible',
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${styles[verdict]}`}>
      {labels[verdict]}
    </span>
  )
}

export function SimulationOutput({ result, investigators, onSave, saving }: Props) {
  if (!result) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Fill in the form to see the projection.
      </div>
    )
  }

  const invMap = Object.fromEntries(investigators.map((i) => [i.id, i]))

  const chartData = Array.from({ length: FORECAST_CONFIG.SIMULATOR_WEEKS }, (_, w) => {
    const entry: Record<string, string | number> = { week: `W${w + 1}` }
    for (const [invId, simResult] of Object.entries(result.byInvestigator)) {
      const name = invMap[invId]?.name ?? invId
      entry[name] = simResult.weeklyUtilizationPct[w] ?? 0
    }
    return entry
  })

  return (
    <div className="space-y-4">
      {/* Overall verdict */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Overall verdict:</span>
        <VerdictBadge verdict={result.overallVerdict} />
      </div>

      {/* Per-investigator verdict */}
      <div className="space-y-2">
        {Object.entries(result.byInvestigator).map(([invId, simResult]) => {
          const name = invMap[invId]?.name ?? invId
          return (
            <div key={invId} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-700 dark:text-slate-300">{name}</span>
                <VerdictBadge verdict={simResult.feasibilityVerdict} />
              </div>
              <span className="text-slate-500 text-xs tabular-nums">
                Peak {simResult.peakPct}% at wk {simResult.peakWeek}
                {simResult.criticalWeek !== null && ` · hits 90% at wk ${simResult.criticalWeek}`}
                {simResult.cautionWeek !== null && simResult.criticalWeek === null && ` · hits 75% at wk ${simResult.cautionWeek}`}
              </span>
            </div>
          )
        })}
      </div>

      {/* Revenue */}
      <div className="rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm">
        <span className="text-slate-500">Estimated revenue: </span>
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          ${result.estimatedRevenue.toLocaleString()}
        </span>
        <span className="text-xs text-slate-400 ml-2">(placeholder)</span>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
          26-week utilization projection
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="week" tick={{ fontSize: 10 }} interval={3} />
            <YAxis unit="%" domain={[0, 110]} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [`${Number(v)}%`, '']} />
            <Legend />
            <ReferenceLine y={FORECAST_CONFIG.WARNING_THRESHOLD_PCT} stroke="#f59e0b" strokeDasharray="4 2" />
            <ReferenceLine y={FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT} stroke="#dc2626" strokeDasharray="4 2" />
            {Object.keys(result.byInvestigator).map((invId, idx) => {
              const name = invMap[invId]?.name ?? invId
              return (
                <Area
                  key={invId}
                  type="monotone"
                  dataKey={name}
                  stroke={COLORS[idx % COLORS.length]}
                  fill={COLORS[idx % COLORS.length]}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              )
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save scenario'}
      </button>
    </div>
  )
}
