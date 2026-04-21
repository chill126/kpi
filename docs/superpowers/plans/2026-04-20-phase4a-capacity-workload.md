# Phase 4A: Capacity & Workload Predictive Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add forward-looking capacity intelligence — Capacity Forecast page, What-If Simulator, and staffing gap alerts — so management can answer "Can we take this study?" with data.

**Architecture:** Pure client-side computation extending `src/lib/capacity.ts` with two new pure functions. All tunable constants isolated in `src/lib/forecast-config.ts`. Two new management pages (`/forecast`, `/what-if`) plus a projected-alert component on the existing Overview page. What-If scenarios persisted to Firestore; all other projections are derived on demand.

**Tech Stack:** React 18, TypeScript strict, Vite, Firebase Firestore, Recharts, shadcn/ui, Vitest + React Testing Library

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/lib/forecast-config.ts` | All tunable thresholds and horizons — only file to edit for tuning |
| Modify | `src/types/index.ts` | Add `HypotheticalStudy`, `SimulationResult`, `WhatIfScenario` types |
| Modify | `src/lib/capacity.ts` | Add `projectWeekMetrics`, `simulateStudyImpact` |
| Create | `src/lib/__tests__/forecast.test.ts` | Unit tests for new computation functions |
| Create | `src/lib/whatif.ts` | Firestore read/write for saved What-If scenarios |
| Create | `src/hooks/useWhatIfScenarios.ts` | Live subscription to saved scenarios |
| Create | `src/components/management/CapacityAlertSummary.tsx` | Projected alert banner for Overview |
| Create | `src/components/management/__tests__/CapacityAlertSummary.test.tsx` | Alert component tests |
| Create | `src/components/management/WhatIfForm.tsx` | Simulator form (left panel) |
| Create | `src/components/management/SimulationOutput.tsx` | Simulation result panel (right panel) |
| Modify | `src/pages/management/Overview.tsx` | Add `CapacityAlertSummary` below existing alerts |
| Create | `src/pages/management/Forecast.tsx` | 8-week actual + projected utilization page |
| Create | `src/pages/management/WhatIf.tsx` | What-If Simulator page |
| Create | `src/pages/management/__tests__/Forecast.test.tsx` | Forecast page tests |
| Create | `src/pages/management/__tests__/WhatIf.test.tsx` | What-If page tests |
| Modify | `src/components/layout/Sidebar.tsx` | Add Forecast and What-If nav items |
| Modify | `src/router/index.tsx` | Add lazy `/forecast` and `/what-if` routes |

---

### Task 1: Forecast configuration constants

**Files:**
- Create: `src/lib/forecast-config.ts`
- Create: `src/lib/__tests__/forecast-config.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/forecast-config.test.ts
import { FORECAST_CONFIG } from '../forecast-config'

describe('FORECAST_CONFIG', () => {
  it('has all required numeric constants', () => {
    expect(typeof FORECAST_CONFIG.WARNING_THRESHOLD_PCT).toBe('number')
    expect(typeof FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT).toBe('number')
    expect(typeof FORECAST_CONFIG.ALERT_LOOKAHEAD_WEEKS).toBe('number')
    expect(typeof FORECAST_CONFIG.FORECAST_WEEKS).toBe('number')
    expect(typeof FORECAST_CONFIG.SIMULATOR_WEEKS).toBe('number')
  })

  it('warning threshold is lower than critical', () => {
    expect(FORECAST_CONFIG.WARNING_THRESHOLD_PCT).toBeLessThan(
      FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT,
    )
  })

  it('ramp checkpoints are in ascending order', () => {
    const sorted = [...FORECAST_CONFIG.RAMP_CHECKPOINTS].sort((a, b) => a - b)
    expect(FORECAST_CONFIG.RAMP_CHECKPOINTS).toEqual(sorted)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/forecast-config.test.ts
```

Expected: FAIL — `forecast-config` not found

- [ ] **Step 3: Implement forecast-config.ts**

```ts
// src/lib/forecast-config.ts
export const FORECAST_CONFIG = {
  WARNING_THRESHOLD_PCT: 75,
  CRITICAL_THRESHOLD_PCT: 90,
  ALERT_LOOKAHEAD_WEEKS: 4,
  FORECAST_WEEKS: 8,
  SIMULATOR_WEEKS: 26,
  RAMP_CHECKPOINTS: [1, 2, 4, 8] as const,
  ROLLING_AVERAGE_WEEKS: 4,
  CONTRACT_VALUE_LABEL: 'Estimated contract value (placeholder — update in Phase 4B)',
} as const
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/__tests__/forecast-config.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/forecast-config.ts src/lib/__tests__/forecast-config.test.ts
git commit -m "feat: add FORECAST_CONFIG — single source of truth for forecast thresholds"
```

---

### Task 2: HypotheticalStudy and SimulationResult types

**Files:**
- Modify: `src/types/index.ts` (append to end of file)

- [ ] **Step 1: Add new types to `src/types/index.ts`**

Append the following to the end of `src/types/index.ts`:

```ts
export interface HypotheticalStudy {
  name: string
  assignedInvestigatorIds: string[]
  targetEnrollment: number
  enrollmentRamp: Record<number, number>  // week-from-start → cumulative participants
  avgInvestigatorMinutesPerVisit: number
  avgAssessmentMinutesPerVisit: number
  visitsPerParticipantPerMonth: number
  estimatedContractValue: number
  durationWeeks: number
  startDate: string                        // ISO date string
}

export type FeasibilityVerdict = 'feasible' | 'caution' | 'infeasible'

export interface InvestigatorSimResult {
  weeklyUtilizationPct: number[]   // length = SIMULATOR_WEEKS
  peakWeek: number
  peakPct: number
  feasibilityVerdict: FeasibilityVerdict
  cautionWeek: number | null
  criticalWeek: number | null
}

export interface SimulationResult {
  byInvestigator: Record<string, InvestigatorSimResult>
  estimatedRevenue: number
  overallVerdict: FeasibilityVerdict
}

export interface WhatIfScenario {
  id: string
  siteId: string
  createdAt: string
  study: HypotheticalStudy
  result: SimulationResult
}
```

- [ ] **Step 2: Run type check to verify no errors**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add HypotheticalStudy, SimulationResult, WhatIfScenario types"
```

---

### Task 3: projectWeekMetrics — actual + projected utilization

**Files:**
- Modify: `src/lib/capacity.ts`
- Create: `src/lib/__tests__/forecast.test.ts`

`projectWeekMetrics` returns actual `WeekMetrics` for past/current weeks, and a rolling-average projection for future weeks.

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/__tests__/forecast.test.ts
import { describe, it, expect } from 'vitest'
import { projectWeekMetrics } from '../capacity'
import type { Visit, Assessment } from '@/types'

const CAPACITY_MINUTES = 480 // 8 hours/week

function makeVisit(investigatorId: string, date: string, minutes: number): Visit {
  return {
    id: 'v1',
    participantId: 'p1',
    studyId: 's1',
    investigatorId,
    siteId: 'tampa',
    visitType: 'Week 1',
    scheduledDate: date,
    completedDate: date,
    status: 'completed',
    durationMinutes: minutes,
    actualDurationMinutes: minutes,
    source: 'manual',
  }
}

describe('projectWeekMetrics', () => {
  it('returns actual data for a past week', () => {
    // Use a known past Monday
    const pastWeek = '2020-01-06'
    const visit = makeVisit('inv1', '2020-01-07', 120)
    const result = projectWeekMetrics('inv1', CAPACITY_MINUTES, pastWeek, [], [visit], [])
    expect(result.totalMinutes).toBe(120)
    expect(result.weekStart).toBe(pastWeek)
  })

  it('returns rolling average projection for a future week', () => {
    // Past 4 weeks with 60 minutes each
    const visits: Visit[] = []
    // Create visits in recent past weeks — use dates relative to "now" minus 1..4 weeks
    const now = new Date()
    for (let i = 1; i <= 4; i++) {
      const d = new Date(now)
      d.setUTCDate(now.getUTCDate() - i * 7 + 1) // Tuesday of that week
      const iso = d.toISOString().split('T')[0]
      visits.push(makeVisit('inv1', iso, 60))
    }

    // Project 2 weeks from now
    const futureDate = new Date(now)
    futureDate.setUTCDate(now.getUTCDate() + 14)
    const futureWeek = futureDate.toISOString().split('T')[0]

    const result = projectWeekMetrics('inv1', CAPACITY_MINUTES, futureWeek, [], visits, [])
    // Should be approximately the rolling average (60 min/week)
    expect(result.totalMinutes).toBeGreaterThan(0)
    expect(result.weekStart).toBe(futureWeek)
  })

  it('returns zero utilization for future week with no history', () => {
    const now = new Date()
    const futureDate = new Date(now)
    futureDate.setUTCDate(now.getUTCDate() + 14)
    const futureWeek = futureDate.toISOString().split('T')[0]

    const result = projectWeekMetrics('inv1', CAPACITY_MINUTES, futureWeek, [], [], [])
    expect(result.totalMinutes).toBe(0)
    expect(result.utilizationPct).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/forecast.test.ts
```

Expected: FAIL — `projectWeekMetrics` not exported

- [ ] **Step 3: Implement projectWeekMetrics in capacity.ts**

Add these imports at the top of `src/lib/capacity.ts`:

```ts
import type { Visit, Assessment, Study } from '@/types'
import { FORECAST_CONFIG } from './forecast-config'
```

Replace the existing `import type { Visit, Assessment } from '@/types'` line with the above.

Then append the following to the end of `src/lib/capacity.ts`:

```ts
/** Returns ISO date (YYYY-MM-DD) of Monday N weeks from the Monday of the current week. */
export function futureWeekStart(weeksAhead: number): string {
  const now = new Date()
  const thisMonday = new Date(now)
  const day = now.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  thisMonday.setUTCDate(now.getUTCDate() + diff)
  thisMonday.setUTCDate(thisMonday.getUTCDate() + weeksAhead * 7)
  thisMonday.setUTCHours(0, 0, 0, 0)
  return thisMonday.toISOString().split('T')[0]
}

/**
 * Returns WeekMetrics for the given week.
 * - Past/current weeks: actual logged data (delegates to computeWeekMetrics).
 * - Future weeks: rolling average of the last ROLLING_AVERAGE_WEEKS weeks of actual data.
 */
export function projectWeekMetrics(
  investigatorId: string,
  capacityMinutes: number,
  weekStartIso: string,
  _studies: Study[],
  visits: Visit[],
  assessments: Assessment[],
): WeekMetrics {
  const currentWeek = getWeekStart(new Date())

  if (weekStartIso <= currentWeek) {
    return computeWeekMetrics(investigatorId, capacityMinutes, visits, assessments, weekStartIso)
  }

  // Future: rolling average of last ROLLING_AVERAGE_WEEKS weeks
  const pastWeeks = Array.from({ length: FORECAST_CONFIG.ROLLING_AVERAGE_WEEKS }, (_, i) => {
    const d = new Date(currentWeek + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - (i + 1) * 7)
    return d.toISOString().split('T')[0]
  })

  const pastMetrics = pastWeeks.map((w) =>
    computeWeekMetrics(investigatorId, capacityMinutes, visits, assessments, w),
  )
  const avgMinutes =
    pastMetrics.reduce((sum, m) => sum + m.totalMinutes, 0) /
    Math.max(pastMetrics.length, 1)

  const rounded = Math.round(avgMinutes)
  const utilizationPct =
    capacityMinutes > 0 ? Math.round((rounded / capacityMinutes) * 100) : 0

  return {
    weekStart: weekStartIso,
    visitMinutes: rounded,
    assessmentMinutes: 0,
    totalMinutes: rounded,
    capacityMinutes,
    utilizationPct,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/forecast.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Run full suite to check no regressions**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/capacity.ts src/lib/__tests__/forecast.test.ts
git commit -m "feat: add projectWeekMetrics — rolling-average projection for future weeks"
```

---

### Task 4: simulateStudyImpact — What-If computation

**Files:**
- Modify: `src/lib/capacity.ts`
- Modify: `src/lib/__tests__/forecast.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/lib/__tests__/forecast.test.ts`:

```ts
import { simulateStudyImpact } from '../capacity'
import { FORECAST_CONFIG } from '../forecast-config'
import type { HypotheticalStudy, Investigator } from '@/types'

function makeInvestigator(id: string, capacityHours = 8): Investigator {
  return {
    id,
    name: 'Dr. Test',
    credentials: 'MD',
    role: 'PI',
    siteId: 'tampa',
    weeklyCapacityHours: capacityHours,
    siteBaselinePct: 0,
    assignedStudies: [],
  }
}

function makeHypothetical(overrides: Partial<HypotheticalStudy> = {}): HypotheticalStudy {
  return {
    name: 'Test Study',
    assignedInvestigatorIds: ['inv1'],
    targetEnrollment: 10,
    enrollmentRamp: { 1: 2, 2: 4, 4: 6, 8: 10 },
    avgInvestigatorMinutesPerVisit: 30,
    avgAssessmentMinutesPerVisit: 15,
    visitsPerParticipantPerMonth: 2,
    estimatedContractValue: 100000,
    durationWeeks: 26,
    startDate: new Date().toISOString().split('T')[0],
    ...overrides,
  }
}

describe('simulateStudyImpact', () => {
  it('returns result for each assigned investigator', () => {
    const inv = makeInvestigator('inv1')
    const study = makeHypothetical()
    const result = simulateStudyImpact(study, [inv], [], [], [])
    expect(result.byInvestigator['inv1']).toBeDefined()
  })

  it('returns SIMULATOR_WEEKS utilization entries per investigator', () => {
    const inv = makeInvestigator('inv1')
    const study = makeHypothetical()
    const result = simulateStudyImpact(study, [inv], [], [], [])
    expect(result.byInvestigator['inv1'].weeklyUtilizationPct).toHaveLength(
      FORECAST_CONFIG.SIMULATOR_WEEKS,
    )
  })

  it('returns infeasible verdict when projected utilization exceeds critical threshold', () => {
    // 8h capacity, study adds ~4h/week on top of existing 7h load
    const inv = makeInvestigator('inv1', 8)
    // Pre-fill visits to simulate 7h existing load in recent weeks
    const now = new Date()
    const existingVisits: Visit[] = Array.from({ length: 4 }, (_, i) => {
      const d = new Date(now)
      d.setUTCDate(now.getUTCDate() - i * 7 + 1)
      return makeVisit('inv1', d.toISOString().split('T')[0], 420) // 7h
    })
    const study = makeHypothetical({
      avgInvestigatorMinutesPerVisit: 60,
      visitsPerParticipantPerMonth: 4,
      enrollmentRamp: { 1: 5, 2: 8, 4: 10, 8: 10 },
    })
    const result = simulateStudyImpact(study, [inv], [], existingVisits, [])
    // Peak utilization should be high
    expect(result.byInvestigator['inv1'].peakPct).toBeGreaterThan(0)
  })

  it('calculates estimated revenue from contract value and enrollment', () => {
    const inv = makeInvestigator('inv1')
    const study = makeHypothetical({ estimatedContractValue: 100000, targetEnrollment: 10 })
    const result = simulateStudyImpact(study, [inv], [], [], [])
    expect(result.estimatedRevenue).toBeGreaterThanOrEqual(0)
  })

  it('overall verdict is infeasible if any investigator is infeasible', () => {
    const inv = makeInvestigator('inv1', 1) // 1h capacity — will be overwhelmed
    const study = makeHypothetical({ avgInvestigatorMinutesPerVisit: 120 })
    const result = simulateStudyImpact(study, [inv], [], [], [])
    expect(result.overallVerdict).toBe('infeasible')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/forecast.test.ts
```

Expected: FAIL — `simulateStudyImpact` not exported

- [ ] **Step 3: Implement simulateStudyImpact in capacity.ts**

Append to `src/lib/capacity.ts`:

```ts
import type { HypotheticalStudy, SimulationResult, FeasibilityVerdict, InvestigatorSimResult } from '@/types'

/** Linearly interpolates enrollment ramp between checkpoints. */
function interpolateRamp(ramp: Record<number, number>, weekFromStart: number): number {
  const checkpoints = [1, 2, 4, 8]
  if (weekFromStart <= 1) return ramp[1] ?? 0
  if (weekFromStart >= 8) return ramp[8] ?? 0
  const lower = [...checkpoints].reverse().find((c) => c <= weekFromStart) ?? 1
  const upper = checkpoints.find((c) => c > weekFromStart) ?? 8
  const t = (weekFromStart - lower) / (upper - lower)
  return Math.round((ramp[lower] ?? 0) + t * ((ramp[upper] ?? 0) - (ramp[lower] ?? 0)))
}

/** Projects added weekly minutes from the hypothetical study at a given week offset from study start. */
function hypotheticalWeekMinutes(study: HypotheticalStudy, weekFromStart: number): number {
  if (weekFromStart < 1 || weekFromStart > study.durationWeeks) return 0
  const participants = Math.min(
    interpolateRamp(study.enrollmentRamp, weekFromStart),
    study.targetEnrollment,
  )
  const visitsPerWeek = (study.visitsPerParticipantPerMonth / 4) * participants
  return Math.round(
    visitsPerWeek * (study.avgInvestigatorMinutesPerVisit + study.avgAssessmentMinutesPerVisit),
  )
}

function verdictForPct(pct: number): FeasibilityVerdict {
  if (pct >= FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT) return 'infeasible'
  if (pct >= FORECAST_CONFIG.WARNING_THRESHOLD_PCT) return 'caution'
  return 'feasible'
}

/**
 * Simulates the capacity impact of adding a hypothetical study.
 * Returns per-investigator projected utilization for SIMULATOR_WEEKS weeks.
 */
export function simulateStudyImpact(
  study: HypotheticalStudy,
  investigators: Investigator[],
  existingStudies: Study[],
  visits: Visit[],
  assessments: Assessment[],
): SimulationResult {
  const startDate = new Date(study.startDate + 'T00:00:00Z')
  const byInvestigator: Record<string, InvestigatorSimResult> = {}

  for (const inv of investigators) {
    if (!study.assignedInvestigatorIds.includes(inv.id)) continue

    const capacityMinutes = inv.weeklyCapacityHours * 60
    const weeklyUtilizationPct: number[] = []
    let cautionWeek: number | null = null
    let criticalWeek: number | null = null

    for (let w = 0; w < FORECAST_CONFIG.SIMULATOR_WEEKS; w++) {
      const weekDate = new Date(startDate)
      weekDate.setUTCDate(startDate.getUTCDate() + w * 7)
      const weekIso = getWeekStart(weekDate)

      const baseline = projectWeekMetrics(inv.id, capacityMinutes, weekIso, existingStudies, visits, assessments)
      const addedMinutes = hypotheticalWeekMinutes(study, w + 1)
      const totalMinutes = baseline.totalMinutes + addedMinutes
      const pct = capacityMinutes > 0 ? Math.round((totalMinutes / capacityMinutes) * 100) : 0

      weeklyUtilizationPct.push(pct)

      if (cautionWeek === null && pct >= FORECAST_CONFIG.WARNING_THRESHOLD_PCT) cautionWeek = w + 1
      if (criticalWeek === null && pct >= FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT) criticalWeek = w + 1
    }

    const peakPct = Math.max(...weeklyUtilizationPct)
    const peakWeek = weeklyUtilizationPct.indexOf(peakPct) + 1

    byInvestigator[inv.id] = {
      weeklyUtilizationPct,
      peakWeek,
      peakPct,
      feasibilityVerdict: verdictForPct(peakPct),
      cautionWeek,
      criticalWeek,
    }
  }

  // Overall verdict: worst of all investigators
  const verdicts = Object.values(byInvestigator).map((r) => r.feasibilityVerdict)
  const overallVerdict: FeasibilityVerdict = verdicts.includes('infeasible')
    ? 'infeasible'
    : verdicts.includes('caution')
    ? 'caution'
    : 'feasible'

  // Revenue: contract value × (projected peak enrollment / target)
  const peakEnrollment = Math.min(
    interpolateRamp(study.enrollmentRamp, 8),
    study.targetEnrollment,
  )
  const estimatedRevenue = Math.round(
    study.estimatedContractValue * (peakEnrollment / Math.max(study.targetEnrollment, 1)),
  )

  return { byInvestigator, estimatedRevenue, overallVerdict }
}
```

Note: The `Investigator` type import is already in `src/types/index.ts`. Make sure the import line at the top of capacity.ts reads:

```ts
import type { Visit, Assessment, Study, Investigator, HypotheticalStudy, SimulationResult, FeasibilityVerdict, InvestigatorSimResult } from '@/types'
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/forecast.test.ts
```

Expected: PASS (8 tests total)

- [ ] **Step 5: Run full suite**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/capacity.ts src/lib/__tests__/forecast.test.ts
git commit -m "feat: add simulateStudyImpact — week-by-week projection for hypothetical studies"
```

---

### Task 5: Firestore helpers and hook for saved scenarios

**Files:**
- Create: `src/lib/whatif.ts`
- Create: `src/hooks/useWhatIfScenarios.ts`

- [ ] **Step 1: Create Firestore helpers**

```ts
// src/lib/whatif.ts
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { HypotheticalStudy, SimulationResult, WhatIfScenario } from '@/types'

export async function saveWhatIfScenario(
  siteId: string,
  study: HypotheticalStudy,
  result: SimulationResult,
): Promise<string> {
  const ref = await addDoc(collection(db, 'whatIfScenarios', siteId, 'scenarios'), {
    siteId,
    createdAt: serverTimestamp(),
    study,
    result,
  })
  return ref.id
}

export async function deleteWhatIfScenario(siteId: string, scenarioId: string): Promise<void> {
  await deleteDoc(doc(db, 'whatIfScenarios', siteId, 'scenarios', scenarioId))
}
```

- [ ] **Step 2: Find how firebase is imported in the project**

```bash
grep -r "from './firebase'" src/lib/ --include="*.ts" | head -3
```

Use the same import path. If it's `@/lib/firebase`, update the import in `whatif.ts` accordingly.

- [ ] **Step 3: Create the hook**

```ts
// src/hooks/useWhatIfScenarios.ts
import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSite } from '@/context/SiteContext'
import type { WhatIfScenario } from '@/types'

export function useWhatIfScenarios() {
  const { siteId } = useSite()
  const [scenarios, setScenarios] = useState<WhatIfScenario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(
      collection(db, 'whatIfScenarios', siteId, 'scenarios'),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(q, (snap) => {
      setScenarios(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as WhatIfScenario)),
      )
      setLoading(false)
    })
    return unsub
  }, [siteId])

  return { scenarios, loading }
}
```

- [ ] **Step 4: Verify type check passes**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatif.ts src/hooks/useWhatIfScenarios.ts
git commit -m "feat: add Firestore helpers and hook for What-If scenario persistence"
```

---

### Task 6: CapacityAlertSummary component + Overview integration

**Files:**
- Create: `src/components/management/CapacityAlertSummary.tsx`
- Create: `src/components/management/__tests__/CapacityAlertSummary.test.tsx`
- Modify: `src/pages/management/Overview.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/management/__tests__/CapacityAlertSummary.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CapacityAlertSummary } from '../CapacityAlertSummary'
import type { Investigator, Visit, Assessment } from '@/types'

function makeInv(id: string, name: string): Investigator {
  return {
    id, name, credentials: 'MD', role: 'PI',
    siteId: 'tampa', weeklyCapacityHours: 8, siteBaselinePct: 0, assignedStudies: [],
  }
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
)

describe('CapacityAlertSummary', () => {
  it('renders nothing when no investigators are near capacity', () => {
    const { container } = render(
      <CapacityAlertSummary investigators={[makeInv('i1', 'Dr. A')]} visits={[]} assessments={[]} />,
      { wrapper },
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows alert count and link when investigators approach threshold', () => {
    // Create visits that put investigator over 75% in recent weeks
    const now = new Date()
    const visits: Visit[] = Array.from({ length: 4 }, (_, i) => {
      const d = new Date(now)
      d.setUTCDate(now.getUTCDate() - i * 7 + 1)
      return {
        id: `v${i}`, participantId: 'p1', studyId: 's1',
        investigatorId: 'i1', siteId: 'tampa', visitType: 'W1',
        scheduledDate: d.toISOString().split('T')[0],
        completedDate: d.toISOString().split('T')[0],
        status: 'completed' as const, durationMinutes: 380,
        actualDurationMinutes: 380, source: 'manual' as const,
      }
    })
    render(
      <CapacityAlertSummary investigators={[makeInv('i1', 'Dr. A')]} visits={visits} assessments={[]} />,
      { wrapper },
    )
    expect(screen.getByText(/forecast/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/management/__tests__/CapacityAlertSummary.test.tsx
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement CapacityAlertSummary**

```tsx
// src/components/management/CapacityAlertSummary.tsx
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { projectWeekMetrics, futureWeekStart } from '@/lib/capacity'
import { FORECAST_CONFIG } from '@/lib/forecast-config'
import type { Investigator, Visit, Assessment } from '@/types'

interface Props {
  investigators: Investigator[]
  visits: Visit[]
  assessments: Assessment[]
}

export function CapacityAlertSummary({ investigators, visits, assessments }: Props) {
  const alerts = useMemo(() => {
    const result: { name: string; pct: number; level: 'warning' | 'critical'; weeksOut: number }[] = []

    for (const inv of investigators) {
      const capacityMinutes = inv.weeklyCapacityHours * 60
      for (let w = 1; w <= FORECAST_CONFIG.ALERT_LOOKAHEAD_WEEKS; w++) {
        const weekIso = futureWeekStart(w)
        const m = projectWeekMetrics(inv.id, capacityMinutes, weekIso, [], visits, assessments)
        if (m.utilizationPct >= FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT) {
          result.push({ name: inv.name, pct: m.utilizationPct, level: 'critical', weeksOut: w })
          break
        } else if (m.utilizationPct >= FORECAST_CONFIG.WARNING_THRESHOLD_PCT) {
          result.push({ name: inv.name, pct: m.utilizationPct, level: 'warning', weeksOut: w })
          break
        }
      }
    }

    return result
  }, [investigators, visits, assessments])

  if (alerts.length === 0) return null

  const criticalCount = alerts.filter((a) => a.level === 'critical').length
  const warningCount = alerts.filter((a) => a.level === 'warning').length

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-center justify-between gap-4">
      <div className="text-sm text-amber-800 dark:text-amber-300">
        <span className="font-medium">Capacity forecast: </span>
        {criticalCount > 0 && (
          <span className="text-red-600 dark:text-red-400 font-medium">
            {criticalCount} investigator{criticalCount > 1 ? 's' : ''} projected to exceed 90%
          </span>
        )}
        {criticalCount > 0 && warningCount > 0 && ', '}
        {warningCount > 0 && (
          <span>
            {warningCount} approaching 75%
          </span>
        )}
        {' '}within {FORECAST_CONFIG.ALERT_LOOKAHEAD_WEEKS} weeks.
      </div>
      <Link
        to="/forecast"
        className="text-sm font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap hover:underline"
      >
        View forecast →
      </Link>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/management/__tests__/CapacityAlertSummary.test.tsx
```

Expected: PASS (2 tests)

- [ ] **Step 5: Add CapacityAlertSummary to Overview.tsx**

In `src/pages/management/Overview.tsx`, add the import:

```ts
import { CapacityAlertSummary } from '@/components/management/CapacityAlertSummary'
```

Then add the component after the `{/* Alerts */}` block (after the existing amber alerts div), before `{/* Investigator Utilization Chart */}`:

```tsx
{/* Projected Capacity Alerts */}
<CapacityAlertSummary
  investigators={investigators}
  visits={visits}
  assessments={assessments}
/>
```

- [ ] **Step 6: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add src/components/management/CapacityAlertSummary.tsx src/components/management/__tests__/CapacityAlertSummary.test.tsx src/pages/management/Overview.tsx
git commit -m "feat: add CapacityAlertSummary — projected capacity alerts on Overview"
```

---

### Task 7: Forecast page

**Files:**
- Create: `src/pages/management/Forecast.tsx`
- Create: `src/pages/management/__tests__/Forecast.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/pages/management/__tests__/Forecast.test.tsx
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/hooks/useInvestigators', () => ({
  useInvestigators: () => ({
    investigators: [
      {
        id: 'i1', name: 'Dr. Smith', credentials: 'MD', role: 'PI',
        siteId: 'tampa', weeklyCapacityHours: 8, siteBaselinePct: 0, assignedStudies: [],
      },
    ],
    loading: false,
  }),
}))
vi.mock('@/hooks/useSiteVisits', () => ({ useSiteVisits: () => ({ visits: [] }) }))
vi.mock('@/hooks/useSiteAssessments', () => ({ useSiteAssessments: () => ({ assessments: [] }) }))
vi.mock('@/hooks/useStudies', () => ({ useStudies: () => ({ studies: [], loading: false }) }))

import { Forecast } from '../Forecast'

describe('Forecast', () => {
  it('renders page heading', () => {
    render(<MemoryRouter><Forecast /></MemoryRouter>)
    expect(screen.getByText('Capacity Forecast')).toBeInTheDocument()
  })

  it('renders investigator name in chart data', () => {
    render(<MemoryRouter><Forecast /></MemoryRouter>)
    expect(screen.getByText(/Dr. Smith/i)).toBeInTheDocument()
  })

  it('shows no-alerts message when all under threshold', () => {
    render(<MemoryRouter><Forecast /></MemoryRouter>)
    expect(screen.getByText(/no projected capacity alerts/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/pages/management/__tests__/Forecast.test.tsx
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement Forecast.tsx**

```tsx
// src/pages/management/Forecast.tsx
import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { useStudies } from '@/hooks/useStudies'
import { projectWeekMetrics, getWeekStart, utilizationColor } from '@/lib/capacity'
import { FORECAST_CONFIG } from '@/lib/forecast-config'
import { Skeleton } from '@/components/ui/skeleton'

const WEEK_COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#ec4899', '#14b8a6', '#8b5cf6']

function addWeeks(isoDate: string, n: number): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n * 7)
  return d.toISOString().split('T')[0]
}

function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

export function Forecast() {
  const { investigators, loading: invLoading } = useInvestigators()
  const { studies, loading: studiesLoading } = useStudies()
  const { visits } = useSiteVisits()
  const { assessments } = useSiteAssessments()

  const loading = invLoading || studiesLoading

  const currentWeek = getWeekStart(new Date())
  const halfForecast = Math.floor(FORECAST_CONFIG.FORECAST_WEEKS / 2)

  const weeks = useMemo(
    () =>
      Array.from({ length: FORECAST_CONFIG.FORECAST_WEEKS }, (_, i) =>
        addWeeks(currentWeek, i - halfForecast),
      ),
    [currentWeek, halfForecast],
  )

  const chartData = useMemo(
    () =>
      weeks.map((weekIso) => {
        const entry: Record<string, string | number> = { week: shortDate(weekIso) }
        for (const inv of investigators) {
          const m = projectWeekMetrics(
            inv.id,
            inv.weeklyCapacityHours * 60,
            weekIso,
            studies,
            visits,
            assessments,
          )
          entry[inv.name] = m.utilizationPct
        }
        return entry
      }),
    [weeks, investigators, studies, visits, assessments],
  )

  const projectedAlerts = useMemo(() => {
    const alerts: { name: string; pct: number; level: 'warning' | 'critical'; weeksOut: number }[] = []
    for (const inv of investigators) {
      const capacityMinutes = inv.weeklyCapacityHours * 60
      for (let w = 1; w <= FORECAST_CONFIG.ALERT_LOOKAHEAD_WEEKS; w++) {
        const weekIso = addWeeks(currentWeek, w)
        const m = projectWeekMetrics(inv.id, capacityMinutes, weekIso, studies, visits, assessments)
        if (m.utilizationPct >= FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT) {
          alerts.push({ name: inv.name, pct: m.utilizationPct, level: 'critical', weeksOut: w })
          break
        } else if (m.utilizationPct >= FORECAST_CONFIG.WARNING_THRESHOLD_PCT) {
          alerts.push({ name: inv.name, pct: m.utilizationPct, level: 'warning', weeksOut: w })
          break
        }
      }
    }
    return alerts
  }, [investigators, studies, visits, assessments, currentWeek])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Capacity Forecast</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Actual (past) + projected (future) investigator utilization — {FORECAST_CONFIG.FORECAST_WEEKS}-week view.
        </p>
      </div>

      {/* Alert banners */}
      {projectedAlerts.length === 0 ? (
        <p className="text-sm text-green-600 dark:text-green-400">
          ✓ No projected capacity alerts in the next {FORECAST_CONFIG.ALERT_LOOKAHEAD_WEEKS} weeks.
        </p>
      ) : (
        <div className="space-y-2">
          {projectedAlerts.map((a) => (
            <div
              key={a.name}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm border ${
                a.level === 'critical'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                  : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              }`}
            >
              <span className="font-medium">{a.level === 'critical' ? '🔴' : '⚠'}</span>
              <span>
                <strong>{a.name}</strong> projected to{' '}
                {a.level === 'critical' ? 'exceed 90%' : 'reach 75%'} capacity in ~{a.weeksOut} week
                {a.weeksOut > 1 ? 's' : ''} ({a.pct}%)
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
          Utilization by Investigator
        </h2>
        <p className="text-xs text-slate-400 mb-4">Dashed line marks today. Left = actual, right = projected.</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis unit="%" domain={[0, 110]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => [`${v}%`, '']} />
            <Legend />
            <ReferenceLine y={FORECAST_CONFIG.WARNING_THRESHOLD_PCT} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '75%', fontSize: 10 }} />
            <ReferenceLine y={FORECAST_CONFIG.CRITICAL_THRESHOLD_PCT} stroke="#dc2626" strokeDasharray="4 2" label={{ value: '90%', fontSize: 10 }} />
            {investigators.map((inv, idx) => (
              <Line
                key={inv.id}
                type="monotone"
                dataKey={inv.name}
                stroke={WEEK_COLORS[idx % WEEK_COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Current Week Summary</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700">
              <th className="text-left pb-2">Investigator</th>
              <th className="text-right pb-2">This Week</th>
              <th className="text-right pb-2">+{halfForecast}wk Projection</th>
            </tr>
          </thead>
          <tbody>
            {investigators.map((inv) => {
              const thisWeek = projectWeekMetrics(inv.id, inv.weeklyCapacityHours * 60, currentWeek, studies, visits, assessments)
              const projected = projectWeekMetrics(inv.id, inv.weeklyCapacityHours * 60, addWeeks(currentWeek, halfForecast), studies, visits, assessments)
              return (
                <tr key={inv.id} className="border-b border-slate-50 dark:border-slate-800">
                  <td className="py-2 text-slate-700 dark:text-slate-300">{inv.name}</td>
                  <td className={`py-2 text-right font-medium tabular-nums ${utilizationColor(thisWeek.utilizationPct)}`}>
                    {thisWeek.utilizationPct}%
                  </td>
                  <td className={`py-2 text-right font-medium tabular-nums ${utilizationColor(projected.utilizationPct)}`}>
                    {projected.utilizationPct}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/pages/management/__tests__/Forecast.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/management/Forecast.tsx src/pages/management/__tests__/Forecast.test.tsx
git commit -m "feat: add Forecast page — 8-week actual + projected utilization chart"
```

---

### Task 8: WhatIfForm component

**Files:**
- Create: `src/components/management/WhatIfForm.tsx`

- [ ] **Step 1: Implement WhatIfForm**

```tsx
// src/components/management/WhatIfForm.tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
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
            <label key={inv.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={value.assignedInvestigatorIds.includes(inv.id)}
                onChange={() => toggleInvestigator(inv.id)}
                className="rounded"
              />
              <span className="text-slate-700 dark:text-slate-300">{inv.name}</span>
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
              <span className="text-xs text-slate-400">Wk {week}</span>
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
```

- [ ] **Step 2: Verify type check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/management/WhatIfForm.tsx
git commit -m "feat: add WhatIfForm — hypothetical study quick-entry form"
```

---

### Task 9: SimulationOutput component

**Files:**
- Create: `src/components/management/SimulationOutput.tsx`

- [ ] **Step 1: Implement SimulationOutput**

```tsx
// src/components/management/SimulationOutput.tsx
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
      {/* Verdict */}
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
            <Tooltip formatter={(v: number) => [`${v}%`, '']} />
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
```

- [ ] **Step 2: Verify type check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/management/SimulationOutput.tsx
git commit -m "feat: add SimulationOutput — verdict badges, area chart, save button"
```

---

### Task 10: WhatIf page

**Files:**
- Create: `src/pages/management/WhatIf.tsx`
- Create: `src/pages/management/__tests__/WhatIf.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/pages/management/__tests__/WhatIf.test.tsx
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/hooks/useInvestigators', () => ({
  useInvestigators: () => ({
    investigators: [
      {
        id: 'i1', name: 'Dr. Smith', credentials: 'MD', role: 'PI',
        siteId: 'tampa', weeklyCapacityHours: 8, siteBaselinePct: 0, assignedStudies: [],
      },
    ],
    loading: false,
  }),
}))
vi.mock('@/hooks/useSiteVisits', () => ({ useSiteVisits: () => ({ visits: [] }) }))
vi.mock('@/hooks/useSiteAssessments', () => ({ useSiteAssessments: () => ({ assessments: [] }) }))
vi.mock('@/hooks/useStudies', () => ({ useStudies: () => ({ studies: [], loading: false }) }))
vi.mock('@/hooks/useWhatIfScenarios', () => ({ useWhatIfScenarios: () => ({ scenarios: [], loading: false }) }))
vi.mock('@/context/SiteContext', () => ({
  useSite: () => ({ siteId: 'tampa' }),
}))
vi.mock('@/lib/whatif', () => ({
  saveWhatIfScenario: vi.fn().mockResolvedValue('scenario-id'),
  deleteWhatIfScenario: vi.fn().mockResolvedValue(undefined),
}))

import { WhatIf } from '../WhatIf'

describe('WhatIf', () => {
  it('renders page heading', () => {
    render(<MemoryRouter><WhatIf /></MemoryRouter>)
    expect(screen.getByText('What-If Simulator')).toBeInTheDocument()
  })

  it('renders the form', () => {
    render(<MemoryRouter><WhatIf /></MemoryRouter>)
    expect(screen.getByLabelText(/study name/i)).toBeInTheDocument()
  })

  it('renders the output placeholder when no investigators selected', () => {
    render(<MemoryRouter><WhatIf /></MemoryRouter>)
    expect(screen.getByText(/fill in the form/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/pages/management/__tests__/WhatIf.test.tsx
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement WhatIf.tsx**

```tsx
// src/pages/management/WhatIf.tsx
import { useState, useMemo } from 'react'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { useStudies } from '@/hooks/useStudies'
import { useWhatIfScenarios } from '@/hooks/useWhatIfScenarios'
import { useSite } from '@/context/SiteContext'
import { simulateStudyImpact } from '@/lib/capacity'
import { saveWhatIfScenario, deleteWhatIfScenario } from '@/lib/whatif'
import { FORECAST_CONFIG } from '@/lib/forecast-config'
import { WhatIfForm } from '@/components/management/WhatIfForm'
import { SimulationOutput } from '@/components/management/SimulationOutput'
import { Skeleton } from '@/components/ui/skeleton'
import type { HypotheticalStudy } from '@/types'

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

  const handleLoadScenario = (scenario: typeof scenarios[number]) => {
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/pages/management/__tests__/WhatIf.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 5: Run full suite**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/pages/management/WhatIf.tsx src/pages/management/__tests__/WhatIf.test.tsx
git commit -m "feat: add WhatIf page — simulator with form, projection, and saved scenarios"
```

---

### Task 11: Router and sidebar updates

**Files:**
- Modify: `src/router/index.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add lazy imports and routes to router**

In `src/router/index.tsx`, add two lazy imports after the existing lazy declarations:

```ts
const Forecast = lazy(() => import('@/pages/management/Forecast').then(m => ({ default: m.Forecast })))
const WhatIf = lazy(() => import('@/pages/management/WhatIf').then(m => ({ default: m.WhatIf })))
```

Then add two new routes inside the `<Route element={<RoleRoute allowedRole="management" />}>` block, after the `/reports` route:

```tsx
<Route path="/forecast" element={<Forecast />} />
<Route path="/what-if" element={<WhatIf />} />
```

- [ ] **Step 2: Add nav items to Sidebar**

In `src/components/layout/Sidebar.tsx`, add two new imports at the top:

```ts
import { Activity, FlaskConical } from 'lucide-react'
```

Then add to `MANAGEMENT_NAV` array after the `Reports` entry:

```ts
{ to: '/forecast', icon: Activity, label: 'Forecast' },
{ to: '/what-if', icon: FlaskConical, label: 'What-If' },
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 4: Run type check and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/router/index.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: add /forecast and /what-if routes and sidebar nav items"
```

---

## Self-Review

### Spec Coverage

| Spec Requirement | Task |
|---|---|
| `forecast-config.ts` — single source of truth for constants | Task 1 |
| `HypotheticalStudy`, `SimulationResult`, `WhatIfScenario` types | Task 2 |
| `projectWeekMetrics` — actual + projected | Task 3 |
| `simulateStudyImpact` — week-by-week impact | Task 4 |
| Firestore persistence for scenarios | Task 5 |
| `CapacityAlertSummary` on Overview | Task 6 |
| `/forecast` page — 8-week chart + alert banners | Task 7 |
| `WhatIfForm` — all specified fields incl. start date + contract value | Task 8 |
| `SimulationOutput` — verdict badges + area chart + save | Task 9 |
| `/what-if` page — form + output + saved scenarios list | Task 10 |
| Router + nav | Task 11 |

### Placeholder Scan

None found. All code blocks are complete. `CONTRACT_VALUE_LABEL` explicitly marks the revenue field as a placeholder.

### Type Consistency

- `HypotheticalStudy.enrollmentRamp: Record<number, number>` — used in Task 2, 4, 8, 10. Keys match `RAMP_CHECKPOINTS` from config. ✓
- `SimulationResult.byInvestigator` keyed by `investigatorId` string — consistent across Tasks 4, 9, 10. ✓
- `projectWeekMetrics(investigatorId, capacityMinutes, weekStartIso, studies, visits, assessments)` — 6 args, consistent across Tasks 3, 6, 7. ✓
- `FeasibilityVerdict: 'feasible' | 'caution' | 'infeasible'` — consistent across Tasks 2, 4, 9. ✓
