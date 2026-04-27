import { Input } from '@/components/ui/input'
import { FORECAST_CONFIG } from '@/lib/forecast-config'
import { buildRampFromRate } from '@/lib/capacity'
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

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: 'var(--text-label)',
  marginBottom: 4, display: 'block',
}

const sectionStyle: React.CSSProperties = {
  paddingTop: 16,
  borderTop: '1px solid rgba(255 255 255 / 0.06)',
}

export function WhatIfForm({ value, onChange, investigators }: Props) {
  const simpleMode = value.simpleMode !== false // default true
  const set = (patch: Partial<HypotheticalStudy>) => onChange({ ...value, ...patch })

  function toggleInvestigator(id: string) {
    const ids = value.assignedInvestigatorIds.includes(id)
      ? value.assignedInvestigatorIds.filter((i) => i !== id)
      : [...value.assignedInvestigatorIds, id]
    set({ assignedInvestigatorIds: ids })
  }

  function setSimple(field: 'monthlyEnrollmentRate' | 'rampUpWeeks', val: number) {
    const rate = field === 'monthlyEnrollmentRate' ? val : (value.monthlyEnrollmentRate ?? 0)
    const ramp = field === 'rampUpWeeks' ? val : (value.rampUpWeeks ?? 4)
    set({
      [field]: val,
      enrollmentRamp: buildRampFromRate(rate, ramp, value.targetEnrollment),
    })
  }

  function setTargetEnrollment(val: number) {
    const patch: Partial<HypotheticalStudy> = { targetEnrollment: val }
    if (simpleMode) {
      patch.enrollmentRamp = buildRampFromRate(value.monthlyEnrollmentRate ?? 0, value.rampUpWeeks ?? 4, val)
    }
    set(patch)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Study name */}
      <div>
        <label style={labelStyle} htmlFor="wif-name">Study name</label>
        <Input
          id="wif-name"
          value={value.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="e.g. Sponsor XYZ Phase II"
        />
      </div>

      {/* Investigators */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Assigned investigators</span>
        {investigators.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>No investigators found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            {investigators.map((inv) => (
              <label
                key={inv.id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--text-primary)' }}
              >
                <input
                  type="checkbox"
                  checked={value.assignedInvestigatorIds.includes(inv.id)}
                  onChange={() => toggleInvestigator(inv.id)}
                  style={{ accentColor: 'var(--accent-primary)', width: 14, height: 14, flexShrink: 0 }}
                />
                <span>{inv.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  {inv.weeklyCapacityHours}h/wk
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Target enrollment + duration */}
      <div style={{ ...sectionStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle} htmlFor="wif-enrollment">Target enrollment</label>
          <Input
            id="wif-enrollment"
            type="number"
            min={1}
            value={value.targetEnrollment || ''}
            onChange={(e) => setTargetEnrollment(num(e.target.value))}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="wif-duration">Duration (weeks)</label>
          <Input
            id="wif-duration"
            type="number"
            min={1}
            max={FORECAST_CONFIG.SIMULATOR_WEEKS}
            value={value.durationWeeks || ''}
            onChange={(e) => set({ durationWeeks: num(e.target.value) })}
          />
        </div>
      </div>

      {/* Enrollment ramp */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={labelStyle}>Enrollment ramp</span>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255 255 255 / 0.12)' }}>
            {(['Simple', 'Advanced'] as const).map((mode) => {
              const active = (mode === 'Simple') === simpleMode
              return (
                <button
                  key={mode}
                  onClick={() => {
                    if (mode === 'Simple') {
                      set({
                        simpleMode: true,
                        enrollmentRamp: buildRampFromRate(value.monthlyEnrollmentRate ?? 0, value.rampUpWeeks ?? 4, value.targetEnrollment),
                      })
                    } else {
                      set({ simpleMode: false })
                    }
                  }}
                  style={{
                    padding: '3px 12px', fontSize: 11, fontFamily: 'inherit',
                    cursor: 'pointer', border: 'none', fontWeight: active ? 500 : 400,
                    background: active ? 'var(--accent-primary)' : 'transparent',
                    color: active ? '#fff' : 'var(--text-muted)',
                    transition: 'all 120ms',
                  }}
                >
                  {mode}
                </button>
              )
            })}
          </div>
        </div>

        {simpleMode ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle} htmlFor="wif-rate">Patients / month (at peak)</label>
              <Input
                id="wif-rate"
                type="number"
                min={0}
                step={0.5}
                value={value.monthlyEnrollmentRate || ''}
                onChange={(e) => setSimple('monthlyEnrollmentRate', num(e.target.value))}
              />
            </div>
            <div>
              <label style={labelStyle} htmlFor="wif-rampwks">Ramp-up period (weeks)</label>
              <Input
                id="wif-rampwks"
                type="number"
                min={0}
                max={26}
                value={value.rampUpWeeks ?? 4}
                onChange={(e) => setSimple('rampUpWeeks', num(e.target.value))}
              />
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px' }}>
              Cumulative enrolled participants at each week from study start
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {FORECAST_CONFIG.RAMP_CHECKPOINTS.map((week) => (
                <div key={week}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>
                    Wk {week}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={value.enrollmentRamp[week] ?? ''}
                    onChange={(e) =>
                      set({ enrollmentRamp: { ...value.enrollmentRamp, [week]: num(e.target.value) } })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Visit time inputs */}
      <div style={{ ...sectionStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle} htmlFor="wif-inv-min">Investigator time / visit (min)</label>
          <Input
            id="wif-inv-min"
            type="number"
            min={0}
            value={value.avgInvestigatorMinutesPerVisit || ''}
            onChange={(e) => set({ avgInvestigatorMinutesPerVisit: num(e.target.value) })}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="wif-coord-min">Coordinator time / visit (min)</label>
          <Input
            id="wif-coord-min"
            type="number"
            min={0}
            value={value.avgAssessmentMinutesPerVisit || ''}
            onChange={(e) => set({ avgAssessmentMinutesPerVisit: num(e.target.value) })}
          />
        </div>
      </div>

      {/* Visits / month + start date */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle} htmlFor="wif-visits">Visits / participant / month</label>
          <Input
            id="wif-visits"
            type="number"
            min={0}
            step={0.5}
            value={value.visitsPerParticipantPerMonth || ''}
            onChange={(e) => set({ visitsPerParticipantPerMonth: num(e.target.value) })}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="wif-start">Projected start date</label>
          <Input
            id="wif-start"
            type="date"
            value={value.startDate}
            onChange={(e) => set({ startDate: e.target.value })}
          />
        </div>
      </div>

      {/* Contract value + coordinator capacity */}
      <div style={{ ...sectionStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle} htmlFor="wif-contract">Estimated contract value ($)</label>
          <Input
            id="wif-contract"
            type="number"
            min={0}
            step={1000}
            value={value.estimatedContractValue || ''}
            onChange={(e) => set({ estimatedContractValue: num(e.target.value) })}
            placeholder="$0"
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="wif-coord-cap">Coordinator pool capacity (h/wk)</label>
          <Input
            id="wif-coord-cap"
            type="number"
            min={0}
            step={4}
            value={value.coordinatorCapacityHoursPerWeek ?? 40}
            onChange={(e) => set({ coordinatorCapacityHoursPerWeek: num(e.target.value) })}
          />
        </div>
      </div>

    </div>
  )
}
