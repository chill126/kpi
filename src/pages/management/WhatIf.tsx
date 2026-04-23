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
import { Skeleton } from '@/components/hud/Skeleton'
import { Panel } from '@/components/hud/Panel'
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
            investigators={assignedInvestigators}
            onSave={handleSave}
            saving={saving}
          />
        </Panel>
      </div>

      {!scenariosLoading && scenarios.length > 0 && (
        <Panel title="Saved Scenarios">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {scenarios.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between text-sm"
                style={{ border: '1px solid rgba(255 255 255 / 0.08)', borderRadius: 6, padding: '8px 12px' }}
              >
                <div className="flex items-center gap-3">
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {s.study.name || 'Untitled'}
                  </span>
                  <span style={
                    s.result.overallVerdict === 'feasible'
                      ? { fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 500, background: 'rgba(22, 163, 74, 0.15)', color: 'var(--signal-good)' }
                      : s.result.overallVerdict === 'caution'
                      ? { fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 500, background: 'rgba(217, 119, 6, 0.15)', color: 'var(--signal-warn)' }
                      : { fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 500, background: 'rgba(220, 38, 38, 0.15)', color: 'var(--signal-alert)' }
                  }>
                    {s.result.overallVerdict}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLoadScenario(s)}
                    style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    style={{ fontSize: 12, color: 'var(--signal-alert)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}
