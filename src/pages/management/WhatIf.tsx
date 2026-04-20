import { useState, useMemo } from 'react'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { useStudies } from '@/hooks/useStudies'
import { useWhatIfScenarios } from '@/hooks/useWhatIfScenarios'
import { useSite } from '@/hooks/useSite'
import { simulateStudyImpact } from '@/lib/capacity'
import { saveWhatIfScenario, deleteWhatIfScenario } from '@/lib/whatif'
import { FORECAST_CONFIG } from '@/lib/forecast-config'
import { WhatIfForm } from '@/components/management/WhatIfForm'
import { SimulationOutput } from '@/components/management/SimulationOutput'
import { Skeleton } from '@/components/ui/skeleton'
import type { HypotheticalStudy, WhatIfScenario } from '@/types'

function defaultStudy(): HypotheticalStudy {
  return {
    name: '',
    assignedInvestigatorIds: [],
    targetEnrollment: 0,
    enrollmentRamp: Object.fromEntries(FORECAST_CONFIG.RAMP_CHECKPOINTS.map((w) => [w, 0])),
    avgInvestigatorMinutesPerVisit: 0,
    avgAssessmentMinutesPerVisit: 0,
    visitsPerParticipantPerMonth: 0,
    estimatedContractValue: 0,
    durationWeeks: 26,
    startDate: new Date().toISOString().split('T')[0],
  }
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

  const loading = invLoading || studiesLoading

  const assignedInvestigators = useMemo(
    () => investigators.filter((i) => study.assignedInvestigatorIds.includes(i.id)),
    [investigators, study.assignedInvestigatorIds],
  )

  const result = useMemo(() => {
    if (assignedInvestigators.length === 0) return null
    return simulateStudyImpact(study, assignedInvestigators, studies, visits, assessments)
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
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">What-If Simulator</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Model a hypothetical study to see its capacity impact before committing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Form */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Hypothetical Study</h2>
          <WhatIfForm value={study} onChange={setStudy} investigators={investigators} />
        </div>

        {/* Output */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Projection</h2>
          <SimulationOutput
            result={result}
            investigators={assignedInvestigators}
            onSave={handleSave}
            saving={saving}
          />
        </div>
      </div>

      {/* Saved scenarios */}
      {!scenariosLoading && scenarios.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Saved Scenarios</h2>
          <div className="space-y-2">
            {scenarios.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between text-sm border border-slate-100 dark:border-slate-700 rounded px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {s.study.name || 'Untitled'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.result.overallVerdict === 'feasible'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : s.result.overallVerdict === 'caution'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {s.result.overallVerdict}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLoadScenario(s)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
