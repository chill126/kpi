import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FORECAST_CONFIG } from '@/lib/forecast-config'
import type { HypotheticalStudy, Investigator } from '@/types'

interface Props {
  value: HypotheticalStudy
  onChange: (study: HypotheticalStudy) => void
  investigators: Investigator[]
}

function num(s: string): number {
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

export function WhatIfForm({ value, onChange, investigators }: Props) {
  const set = (patch: Partial<HypotheticalStudy>) => onChange({ ...value, ...patch })

  const toggleInvestigator = (id: string) => {
    const ids = value.assignedInvestigatorIds.includes(id)
      ? value.assignedInvestigatorIds.filter((i) => i !== id)
      : [...value.assignedInvestigatorIds, id]
    set({ assignedInvestigatorIds: ids })
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="study-name">Study name</Label>
        <Input
          id="study-name"
          value={value.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="e.g. Sponsor XYZ Phase II"
        />
      </div>

      <div>
        <Label>Assigned investigators</Label>
        <div className="mt-1 space-y-1">
          {investigators.map((inv) => (
            <label key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={value.assignedInvestigatorIds.includes(inv.id)}
                onChange={() => toggleInvestigator(inv.id)}
              />
              <span style={{ color: 'var(--text-primary)' }}>{inv.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="target-enrollment">Target enrollment</Label>
          <Input
            id="target-enrollment"
            type="number"
            min={1}
            value={value.targetEnrollment || ''}
            onChange={(e) => set({ targetEnrollment: num(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="duration-weeks">Study duration (weeks)</Label>
          <Input
            id="duration-weeks"
            type="number"
            min={1}
            max={FORECAST_CONFIG.SIMULATOR_WEEKS}
            value={value.durationWeeks || ''}
            onChange={(e) => set({ durationWeeks: num(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <Label>Enrollment ramp (cumulative participants)</Label>
        <div className="mt-1 grid grid-cols-4 gap-2">
          {FORECAST_CONFIG.RAMP_CHECKPOINTS.map((week) => (
            <div key={week}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Wk {week}</span>
              <Input
                type="number"
                min={0}
                value={value.enrollmentRamp[week] || ''}
                onChange={(e) =>
                  set({ enrollmentRamp: { ...value.enrollmentRamp, [week]: num(e.target.value) } })
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="inv-min">Investigator time / visit (min)</Label>
          <Input
            id="inv-min"
            type="number"
            min={0}
            value={value.avgInvestigatorMinutesPerVisit || ''}
            onChange={(e) => set({ avgInvestigatorMinutesPerVisit: num(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="assess-min">Assessment time / visit (min)</Label>
          <Input
            id="assess-min"
            type="number"
            min={0}
            value={value.avgAssessmentMinutesPerVisit || ''}
            onChange={(e) => set({ avgAssessmentMinutesPerVisit: num(e.target.value) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="visit-freq">Visits / participant / month</Label>
          <Input
            id="visit-freq"
            type="number"
            min={0}
            step={0.5}
            value={value.visitsPerParticipantPerMonth || ''}
            onChange={(e) => set({ visitsPerParticipantPerMonth: num(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="start-date">Projected start date</Label>
          <Input
            id="start-date"
            type="date"
            value={value.startDate}
            onChange={(e) => set({ startDate: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="contract-value">{FORECAST_CONFIG.CONTRACT_VALUE_LABEL}</Label>
        <Input
          id="contract-value"
          type="number"
          min={0}
          step={1000}
          value={value.estimatedContractValue || ''}
          onChange={(e) => set({ estimatedContractValue: num(e.target.value) })}
          placeholder="$0"
        />
      </div>
    </div>
  )
}
