# Phase 4A: Capacity & Workload Predictive Engine — Design Spec

## Overview

Adds forward-looking capacity intelligence to the KPI Tracker management dashboard. Gives site management the tools to answer "Can we take this study?" with data, visualize projected investigator utilization, and be alerted before capacity problems occur.

**Scope:** Group 1 of Phase 4 (Group 2 covers Revenue Forecast, Enrollment Completion Predictor, Screen Failure Intelligence).

**Users:** Management role only.

---

## 1. New Pages & Navigation

Two new management pages added to the sidebar alongside existing management routes:

| Route | Page | Purpose |
|-------|------|---------|
| `/forecast` | Capacity Forecast | Rolling 8-week actual + projected utilization per investigator |
| `/what-if` | What-If Simulator | Quick-entry form for a hypothetical study with live projection |

Alerts surface in two places:
- **Overview page** (`/`) — summary card showing count of investigators with approaching capacity issues, links to `/forecast`
- **Forecast page** (`/forecast`) — inline banners per affected investigator above the chart

---

## 2. Architecture

**Approach:** Pure client-side computation. All forecast logic lives in pure TypeScript functions in `src/lib/`. Pages call these functions with live Firestore data via existing hooks. Nothing written to Firestore except saved What-If scenarios.

**Consistency with existing code:** Extends `src/lib/capacity.ts`. New functions follow the same pure-function, no-side-effect pattern as `computeWeekMetrics` and `recentWeekStarts`.

---

## 3. Configuration

All tunable constants live in a single file. **This is the only place to change thresholds, horizons, or defaults — no other files need touching.**

**`src/lib/forecast-config.ts`**

```ts
export const FORECAST_CONFIG = {
  // Alert thresholds
  WARNING_THRESHOLD_PCT: 75,
  CRITICAL_THRESHOLD_PCT: 90,
  ALERT_LOOKAHEAD_WEEKS: 4,

  // Projection horizons
  FORECAST_WEEKS: 8,       // Capacity Forecast page rolling window
  SIMULATOR_WEEKS: 26,     // What-If Simulator projection horizon

  // Enrollment ramp checkpoints (weeks from study start)
  RAMP_CHECKPOINTS: [1, 2, 4, 8],

  // Revenue placeholder label (displayed on form)
  CONTRACT_VALUE_LABEL: 'Estimated contract value (placeholder — update in Phase 4B)',
} as const
```

---

## 4. Computation Layer

Two new pure functions added to `src/lib/capacity.ts`, importing constants from `forecast-config.ts`:

### `projectWeekMetrics`

```ts
projectWeekMetrics(
  investigatorId: string,
  weekStartIso: string,
  studies: Study[],
  visits: Visit[],
  assessments: Assessment[]
): WeekMetrics
```

- For past/current weeks: delegates to existing `computeWeekMetrics` (actual logged data)
- For future weeks: projects from active participants × visit schedule × `adminOverride` overhead
- Returns the same `WeekMetrics` shape — UI treats actual and projected identically

### `simulateStudyImpact`

```ts
simulateStudyImpact(
  hypothetical: HypotheticalStudy,
  investigators: Investigator[],
  existingStudies: Study[],
  visits: Visit[],
  assessments: Assessment[]
): SimulationResult
```

Returns per-investigator projected utilization (%) for each of the next `FORECAST_CONFIG.SIMULATOR_WEEKS` weeks with and without the hypothetical study. Also returns `feasibilityVerdict` per investigator.

### `HypotheticalStudy` type

```ts
interface HypotheticalStudy {
  name: string
  assignedInvestigatorIds: string[]
  targetEnrollment: number
  enrollmentRamp: Record<number, number>  // week → cumulative participants (keys: 1,2,4,8)
  avgInvestigatorMinutesPerVisit: number
  avgAssessmentMinutesPerVisit: number
  visitsPerParticipantPerMonth: number
  estimatedContractValue: number          // placeholder, $ total
  durationWeeks: number
  startDate: string                       // ISO date — defaults to today
}
```

### `SimulationResult` type

```ts
interface SimulationResult {
  byInvestigator: Record<string, {
    weeklyUtilizationPct: number[]        // length = SIMULATOR_WEEKS
    peakWeek: number
    peakPct: number
    feasibilityVerdict: 'feasible' | 'caution' | 'infeasible'
    cautionWeek: number | null            // first week hitting WARNING threshold
    criticalWeek: number | null           // first week hitting CRITICAL threshold
  }>
  estimatedRevenue: number                // estimatedContractValue × (projectedEnrollment / targetEnrollment)
  overallVerdict: 'feasible' | 'caution' | 'infeasible'
}
```

---

## 5. Capacity Forecast Page (`/forecast`)

**Data:** Uses existing `useSiteVisits`, `useSiteAssessments`, `useInvestigators`, `useStudies` hooks. Calls `projectWeekMetrics` for each investigator × each of the next `FORECAST_WEEKS` weeks.

**Layout:**
- Alert banners at top (one per investigator exceeding thresholds within `ALERT_LOOKAHEAD_WEEKS`)
- Stacked bar chart: x-axis = 8 weeks (past 4 + next 4), y-axis = utilization %, one series per investigator
- 75% and 90% threshold reference lines on chart
- Summary table below chart: investigator name, current %, projected peak, trend

**Alert banners:**
- Amber: "⚠ [Name] projected to reach 75% capacity in ~N weeks"
- Red: "🔴 [Name] projected to exceed 90% capacity in ~N weeks"
- Dismissible per session (React state, not persisted)

---

## 6. What-If Simulator Page (`/what-if`)

### Form (left panel)

| Field | Type | Notes |
|-------|------|-------|
| Study name | text | Label only, not saved as real study |
| Assigned investigators | multi-select | From existing investigators list |
| Target enrollment | number | |
| Enrollment ramp | 4 numbers | Participants at weeks 1, 2, 4, 8 (from `RAMP_CHECKPOINTS`) |
| Avg investigator time/visit | number (minutes) | |
| Avg assessment time/visit | number (minutes) | |
| Visit frequency | number (visits/participant/month) | |
| Estimated contract value | number ($) | Labeled with `CONTRACT_VALUE_LABEL` from config |
| Study duration | number (weeks) | Projection horizon capped at `SIMULATOR_WEEKS` |
| Projected start date | date | Defaults to today; shifts enrollment ramp forward |

All fields stored in local React state only. Form updates trigger live recalculation.

### Output panel (right panel)

- **Feasibility verdict badge** — `FEASIBLE` (green) / `CAUTION` (amber) / `NOT FEASIBLE` (red) — overall and per investigator
- **Stacked area chart** — per-investigator utilization % over 26 weeks, with 75%/90% threshold lines
- **Callout list** — "Dr. X hits 90% at week N — consider reassigning or delaying start"
- **Estimated revenue** — single figure derived from contract value × projected fill rate
- **Save scenario button** — saves `HypotheticalStudy` + `SimulationResult` snapshot to Firestore collection `whatIfScenarios/{siteId}/{scenarioId}`

### Saved scenarios

- Listed below the form as named cards with date saved and overall verdict
- Read-only — clicking a saved scenario repopulates the form
- Delete button per scenario

---

## 7. Overview Page Alerts Integration

A new `CapacityAlertSummary` component added to the existing Overview page:

- Hidden when no investigators are within `ALERT_LOOKAHEAD_WEEKS` weeks of a threshold
- When alerts exist: shows amber/red badge with count + "View forecast →" link to `/forecast`
- Recomputes on every Overview page load using the same `projectWeekMetrics` calls

---

## 8. Testing

- **`src/lib/capacity.ts` extensions** — unit tests with fixture data covering: projection matches actual for past weeks, future weeks use schedule-based projection, `simulateStudyImpact` returns correct per-investigator breakdown, feasibility verdict thresholds match `FORECAST_CONFIG`
- **`src/lib/forecast-config.ts`** — smoke test that all required keys are present and numeric
- **What-If form** — fields update state, output recalculates, feasibility verdict reflects thresholds, start date shifts ramp correctly
- **Forecast page** — renders chart with mock data, alert banners appear when thresholds exceeded, no banners when under threshold
- **CapacityAlertSummary** — hidden when no alerts, shows correct count and link when alerts present
- **Saved scenarios** — save writes to Firestore mock, list renders, repopulate form on click

---

## 9. File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/lib/forecast-config.ts` | All tunable constants — single source of truth |
| Modify | `src/lib/capacity.ts` | Add `projectWeekMetrics`, `simulateStudyImpact`, new types |
| Create | `src/lib/__tests__/forecast.test.ts` | Unit tests for new computation functions |
| Create | `src/pages/management/Forecast.tsx` | Capacity Forecast page |
| Create | `src/pages/management/WhatIf.tsx` | What-If Simulator page |
| Create | `src/components/management/CapacityAlertSummary.tsx` | Alert summary for Overview page |
| Create | `src/components/management/WhatIfForm.tsx` | Simulator form (left panel) |
| Create | `src/components/management/SimulationOutput.tsx` | Output panel (right panel) |
| Modify | `src/pages/management/Overview.tsx` | Add `CapacityAlertSummary` |
| Modify | `src/router/index.tsx` | Add `/forecast` and `/what-if` routes |
| Create | `src/pages/management/__tests__/Forecast.test.tsx` | Forecast page tests |
| Create | `src/pages/management/__tests__/WhatIf.test.tsx` | What-If page tests |
| Create | `src/components/management/__tests__/CapacityAlertSummary.test.tsx` | Alert component tests |

---

## 10. Out of Scope (Group 2)

- Revenue Forecast chart (stacked area, 6-month projection)
- Enrollment Completion Predictor (burndown chart, confidence range)
- Screen Failure Intelligence
- Real contract value data (Phase 4B — `estimatedContractValue` is a placeholder)
