# K2 Medical Research KPI Tracker — Tile & Panel Reference

> Use this document to walk through each data widget during a review session.
> All data is site-scoped (filtered to the active `siteId`) unless noted otherwise.
> All collections use real-time Firestore listeners (`onSnapshot`) — no manual refresh needed.

---

## Table of Contents

1. [Overview Page](#overview-page)
2. [Investigators Page](#investigators-page)
3. [Enrollment Page](#enrollment-page)
4. [Financial Page](#financial-page)
5. [Capacity Forecast Page](#capacity-forecast-page)
6. [What-If Simulator Page](#what-if-simulator-page)
7. [Operations Page](#operations-page)
8. [Protocol Deviations Page](#protocol-deviations-page)
9. [Studies Page](#studies-page)
10. [Study Detail Page](#study-detail-page)
11. [Capacity Planner Page](#capacity-planner-page)
12. [Reports Page](#reports-page)
13. [Staff — My Dashboard](#staff--my-dashboard)
14. [Staff — My Studies](#staff--my-studies)
15. [Staff — Data Entry](#staff--data-entry)
16. [Data Update Cadence](#data-update-cadence)

---

## Overview Page

The Overview page has two tabs: **My Dashboard** (default) and **Network Overview**.

---

### My Dashboard Tab

#### Hero Sentence

A single auto-generated sentence summarizing current site utilization state. Driven by `utilizationData` (see Investigator Utilization chart below). No separate data source — it reads the same computed utilization percentages.

#### Configurable Tiles (top row)

Up to three tiles appear here. Visibility and order are customizable per management user in **Settings → My Dashboard** (saved to the user's Firestore document). The `enrollment` tile spans two columns when visible.

##### Studies Tile

| Field | Detail |
|-------|--------|
| **Main value** | Total number of studies at this site |
| **Sub-label** | Count of studies with `status == 'enrolling'` |
| **Data source** | `studies` collection, filtered to active `siteId` |

**Example:** "12 · 4 enrolling"

---

##### Enrollment Tile

| Field | Detail |
|-------|--------|
| **Screened** | Sum of `enrollmentData.screens` across active studies |
| **Randomized** | Sum of `enrollmentData.randomizations` across active studies |
| **Active** | Sum of `enrollmentData.active` across active studies (shown in green) |
| **Completed** | Sum of `enrollmentData.completions` across active studies |
| **"Active" scope** | Studies with `status == 'enrolling'` or `status == 'open'` |
| **Data source** | `studies` collection → `enrollmentData` sub-fields |

Displays as a 2×2 grid of four numbers with labels, not a single-value tile.

---

##### Today's Activity Tile

| Field | Detail |
|-------|--------|
| **Main value** | Count of visits scheduled today + assessments dated today |
| **Sub-label** | "visits & assessments" |
| **Visit filter** | `visits` where `scheduledDate == today's ISO date` |
| **Assessment filter** | `assessments` where `date == today's ISO date` |
| **Click action** | Navigates to `/operations` |
| **Data source** | `visits` and `assessments` collections |

---

#### Enrollment Progress (Bar Chart)

| Field | Detail |
|-------|--------|
| **What it shows** | One bar per active study: randomized count vs. target |
| **X-axis** | Study name, truncated to 18 characters |
| **Y-axis** | Enrollment count |
| **Bar value** | `enrollmentData.randomizations` per study |
| **Target** | `study.targetEnrollment` (rendered as a reference context — visible in tooltip) |
| **Scope** | Active studies only (`status == 'enrolling'` or `'open'`) |
| **Data source** | `studies` collection |
| **Click behavior** | Click a bar to navigate to `/studies/{id}` |

---

#### Active Participants Panel

| Field | Detail |
|-------|--------|
| **Main value** | Sum of `enrollmentData.active` across all active studies |
| **Sub-label** | Count of active studies contributing |
| **Data source** | `studies` collection (active studies filtered as above) |

---

#### Projected Capacity — Next 4 Weeks (Area Chart)

| Field | Detail |
|-------|--------|
| **What it shows** | Site-wide capacity utilization forecast for the next 4 calendar weeks |
| **Series 1 — Avg Utilization** | Average utilization % across all PI/Sub-I investigators for each projected week |
| **Series 2 — Peak Investigator** | Highest single-investigator utilization for each projected week |
| **Reference lines** | 75% (warning, amber) and 90% (critical, red) |
| **X-axis** | Week label (e.g. "4/28") |
| **Y-axis** | Utilization % |
| **Data source** | `investigators` (capacity hours) + `visits` + `assessments` (scheduled load) |
| **Computation** | `computeCapacityForecast()` in `src/lib/capacityForecast.ts` |
| **Scope** | PI and Sub-I role investigators only |

---

#### Investigator Utilization — This Week (Bar Chart)

| Field | Detail |
|-------|--------|
| **What it shows** | Current-week utilization % per PI/Sub-I investigator |
| **X-axis** | Investigator name |
| **Y-axis** | Utilization % |
| **Color signal** | Green < 75%, Amber 75–89%, Red ≥ 90% |
| **Data source** | `investigators` (weekly capacity hours) + `visits` + `assessments` logged this week |
| **Computation** | `computeWeekMetrics()` in `src/lib/capacity.ts` — sums visit and assessment minutes for the current Monday–Sunday week, divides by `weeklyCapacityHours * 60` |
| **Scope** | PI and Sub-I role investigators only |

---

### Network Overview Tab

Displayed when "Network Overview" tab is selected. This tab is **not** site-scoped — it queries all sites and all studies.

#### Active Sites Tile

| Field | Detail |
|-------|--------|
| **Main value** | Count of sites where `active == true` |
| **Sub-label** | "in network" |
| **Data source** | `sites` collection (all sites, no `siteId` filter) |

---

#### Studies Tile (Network)

| Field | Detail |
|-------|--------|
| **Main value** | Total study count across all sites |
| **Sub-label** | "across network" |
| **Data source** | `studies` collection with no `siteId` filter |

---

#### Enrolled Tile (Network)

| Field | Detail |
|-------|--------|
| **Main value** | Total `enrollmentData.randomizations` across all sites |
| **Sub-label** | "of X target" where X = sum of all `targetEnrollment` |
| **Signal** | Good if `totalEnrolled >= totalTarget`, Neutral if ≥ 80% of target, Warn if below 80% |
| **Data source** | All studies, summing `enrollmentData.randomizations` and `targetEnrollment` |

---

#### Site Network List

A list of all sites in the network. For each site row:

| Column | Source |
|--------|--------|
| **Site name** | `site.name` |
| **Location** | `site.location` |
| **Study count** | Count of studies where `studyId.siteId == site.id` |
| **Enrolled / Target** | Sum of `randomizations` and `targetEnrollment` for that site's studies |
| **Active badge** | `site.active` — green "active" or grey "inactive" |

---

## Investigators Page

A two-column layout: a scrollable list on the left, a detail panel on the right.

### Investigator List (left column)

Each row shows:

| Element | Source |
|---------|--------|
| **Name** | `investigator.name` |
| **Credentials · Role** | `investigator.credentials` + `investigator.role` |
| **Capacity bar** | Visual bar showing current-week utilization % (color-coded green/amber/red) |
| **Utilization %** | Computed by `computeWeekMetrics()` — total visit + assessment minutes this week ÷ `weeklyCapacityHours * 60` |

**Data sources:** `investigators`, `visits`, `assessments` collections.

---

### Investigator Detail Panel (right column)

Displayed when an investigator is selected from the list.

#### Summary Tiles (3-up row)

| Tile | Value | Source |
|------|-------|--------|
| **This Week** | Total hours logged this week + capacity sub-label | `computeWeekMetrics()` for current Monday |
| **Role** | Investigator role | `investigator.role` |
| **Credentials sub-label** | `investigator.credentials` | — |
| **Studies** | Count of studies where this investigator appears in `assignedInvestigators` | `studies` collection |

Signal on "This Week" tile: Good < 75%, Warn 75–89%, Alert ≥ 90%.

---

#### Weekly Utilization — Last 12 Weeks (Line Chart)

| Field | Detail |
|-------|--------|
| **What it shows** | Utilization % per week for the past 12 weeks, plotted as a line |
| **X-axis** | Week start date (MM-DD format) |
| **Y-axis** | Utilization % |
| **Computation** | `computeWeekHistory()` in `src/lib/capacity.ts` — iterates 12 weeks back, computing `computeWeekMetrics()` for each |
| **Data source** | `visits` and `assessments` collections for this investigator |

---

#### Study Assignments List

A flat list of studies where this investigator appears in `study.assignedInvestigators`.

| Column | Source |
|--------|--------|
| **Study name** | `study.name` |
| **Role on study** | `studyInvestigator.role` (PI / Sub-I / Provider) |
| **Status badge** | `study.status` |

---

#### Delegation Log

Shown only if delegation log entries exist for this investigator across any study.

| Column | Source |
|--------|--------|
| **Study name** | Resolved from `delegationLog.studyId` against `studies` collection |
| **Effective date** | `delegationLog.effectiveDate` |
| **Delegated tasks** | `delegationLog.delegatedTasks[]` — rendered as pills |

**Data source:** `delegationLogs` collection, filtered `investigatorId == this investigator`.

---

## Enrollment Page

A study-scoped page with two tabs: **Screen Failures** and **Completion Predictor**. A study selector at the top filters all content.

### Screen Failures Tab

#### Screen Failure Rate Chart

| Field | Detail |
|-------|--------|
| **What it shows** | Screen failure count over time vs. total screens — rate trend chart |
| **Data source** | `screenFailures` collection filtered by `studyId` + `study.enrollmentData.screens` |
| **X-axis** | Date of screen failure |
| **Y-axis** | Failure count or rate |

---

#### Screen Failure Reason Chart

| Field | Detail |
|-------|--------|
| **What it shows** | Bar chart of screen failure counts broken down by reason category |
| **Categories** | Maps to `SCREEN_FAILURE_CATEGORIES`: inclusion_criteria, exclusion_criteria, lab_values, scales, prohibited_con_meds, consent, logistical, lost_to_follow_up, investigator_decision — plus any custom reasons |
| **Data source** | `screenFailures` collection filtered to selected study — `failure.reasons[].category` |

---

#### Cross-Study Comparison Panel

| Field | Detail |
|-------|--------|
| **What it shows** | Compares screen failure rates and reason distributions across all studies at the site |
| **Data source** | `screenFailures` collection (all failures, no study filter) + `studies` collection |
| **Computation** | Groups failures by `studyId`, calculates rate per study as `failures / study.enrollmentData.screens` |

---

#### Screen Failure Table

A row-per-failure log for the selected study.

| Column | Source |
|--------|--------|
| **Date** | `screenFailure.date` |
| **Reasons** | `screenFailure.reasons[].category` + `reasons[].detail` |
| **Notes** | `screenFailure.notes` |
| **Source** | `screenFailure.source` |

**Data source:** `screenFailures` collection filtered to `studyId` + `siteId`.

---

### Completion Predictor Tab

#### Enrollment Burndown Chart

| Field | Detail |
|-------|--------|
| **What it shows** | Historical enrollment over time vs. projected completion trajectory |
| **X-axis** | Snapshot date |
| **Y-axis** | Cumulative randomizations |
| **Actual line** | `enrollmentSnapshot.randomizations` over time |
| **Target line** | Linear ramp from 0 to `study.targetEnrollment` over study duration |
| **Projected completion** | Extrapolates from current trajectory to predict when target will be reached |
| **Data source** | `enrollmentSnapshots` collection filtered to `studyId` + `siteId`; `study.targetEnrollment` and `study.expectedEndDate` |

---

## Financial Page

Two tabs: **Workload** and **Revenue Forecast**.

### Workload Tab

A card grid — one card per study, sorted by average hours per week (descending).

#### Per-Study Workload Card

| Element | Value | Source |
|---------|-------|--------|
| **Study name** | `study.name` | `studies` |
| **Sponsor · Phase** | `study.sponsor` + `study.phase` | `studies` |
| **Status badge** | `study.status` | `studies` |
| **Hours Logged** | Sum of `actualDurationMinutes ?? durationMinutes` for all `completed` visits on this study ÷ 60 | `visits` filtered `studyId == study.id AND status == 'completed'` |
| **h/week avg** | Total hours ÷ count of distinct calendar weeks that had at least one completed visit | Computed from `visits` |
| **Enrollment** | `randomizations / targetEnrollment` + % | `study.enrollmentData.randomizations`, `study.targetEnrollment` |
| **Contract value** | `study.contract.totalValue` (shown as "not set" if absent) | `studies.contract` |
| **Milestone progress bar** | Achieved milestones ÷ total milestones, as a thin progress bar | `study.contract.milestones[].achieved` |
| **Next milestone** | Name, amount ($), expected date of next unachieved milestone; flags overdue if date < today | `study.contract.milestones[]` sorted by `expectedDate` |

**Expanding a card** reveals a drill-down panel with:

- **Milestone table** — all milestones with name, amount, date, and Achieved/Pending status
- **Enrollment stats** — Randomized/Target, Screens, Pre-screens, Active (from `study.enrollmentData`)
- **Paid screen fails** — `contract.paidScreenFails.ratio` and `.maxPaid` if set

---

### Revenue Forecast Tab

#### Revenue Forecast Chart

| Field | Detail |
|-------|--------|
| **What it shows** | Projected revenue from contract milestones over a date range, visualized as a chart |
| **Date range** | Controlled by preset buttons: 3 months, 6 months (default), 12 months, or custom date range |
| **Data source** | `study.contract.milestones[]` — milestones within the selected date range |
| **Computation** | In `src/components/financial/RevenueForecastChart.tsx` — plots expected milestone payments by `expectedDate`, distinguishing achieved vs. pending |
| **Scope** | All studies at the site with contract milestones defined |

---

## Capacity Forecast Page

### Aggregate Tiles (3-up row)

#### Site Capacity Tile

| Field | Detail |
|-------|--------|
| **Main value** | Sum of `weeklyCapacityHours` across all PI/Sub-I investigators |
| **Sub-label** | Count of PI/Sub-I investigators |
| **Data source** | `investigators` collection filtered to `role == 'PI'` or `'Sub-I'` |

---

#### This Week Load Tile

| Field | Detail |
|-------|--------|
| **Main value** | Average utilization % across all PI/Sub-I investigators for the current week |
| **Sub-label** | "Average across PI/Sub-I" |
| **Signal** | Green < 75%, Amber 75–89%, Red ≥ 90% |
| **Computation** | `projectWeekMetrics()` run for the current Monday for each PI/Sub-I, then averaged |
| **Data source** | `investigators`, `visits`, `assessments`, `studies` |

---

#### 4-Week Outlook Tile

| Field | Detail |
|-------|--------|
| **Main value** | Average projected utilization % four weeks from the current week |
| **Sub-label** | "Projected average load" |
| **Signal** | Green < 75%, Amber 75–89%, Red ≥ 90% |
| **Computation** | `projectWeekMetrics()` run for `currentWeek + 4` for each PI/Sub-I, then averaged |
| **Data source** | `investigators`, `visits`, `assessments`, `studies` |

---

### Projected Alert Cards

Inline alert banners — one per PI/Sub-I investigator who is projected to breach a threshold within the alert lookahead window (default: configured in `FORECAST_CONFIG.ALERT_LOOKAHEAD_WEEKS`).

| Field | Detail |
|-------|--------|
| **Warning alert** | Investigator projected to reach 75% utilization in N weeks |
| **Critical alert** | Investigator projected to exceed 90% utilization in N weeks |
| **Suggested action** | If investigator is on 2+ studies: "Review study assignments to redistribute load." Otherwise: "Consider adjusting enrollment pace." |
| **Data source** | `projectWeekMetrics()` run week-by-week for each PI/Sub-I |

If no projected alerts exist, a green "No projected capacity alerts in the next N weeks" message is shown.

---

### Utilization by Investigator (Stacked Bar Chart)

| Field | Detail |
|-------|--------|
| **What it shows** | Per-investigator utilization % stacked into a single site-aggregate bar, for each week in the forecast window |
| **Window** | `FORECAST_CONFIG.FORECAST_WEEKS` weeks centered on the current week (past weeks show actuals, future weeks show projections) |
| **X-axis** | Week date (M/D format) |
| **Y-axis** | Utilization % (domain 0–110%) |
| **Stacking** | Each investigator's bar is a separate stack segment |
| **Reference lines** | 75% (amber dashed) and 90% (red dashed) |
| **Data source** | All investigators (not just PI/Sub-I) — `projectWeekMetrics()` for each week |

---

### Current Week Summary Table

A table showing each investigator's current-week utilization and a mid-forecast projection.

| Column | Value | Source |
|--------|-------|--------|
| **Investigator** | `investigator.name` | — |
| **This Week** | `projectWeekMetrics()` for current Monday | `visits`, `assessments`, `studies` |
| **+N wk Projection** | `projectWeekMetrics()` for `currentWeek + halfForecast` | Same |

Color-coded per cell: green < 75%, amber 75–89%, red ≥ 90%.

---

## What-If Simulator Page

### Hypothetical Study Form (left panel)

Input panel only — no data display. Allows user to configure a hypothetical study's parameters (name, investigators, enrollment ramp, visit time, duration, contract value). Not documented here as it is a form, not a data display.

---

### Projection Panel (right panel)

Displays simulation results after investigators are assigned and parameters are set. Powered by `simulateStudyImpact()` in `src/lib/capacity.ts`.

| Element | Detail |
|---------|--------|
| **Overall verdict badge** | Feasible / Caution / Not Feasible — based on whether any assigned investigator exceeds 75% (caution) or 90% (infeasible) peak utilization |
| **Per-investigator peak utilization** | Peak week utilization % for each assigned investigator over the simulation window |
| **Estimated revenue** | `study.estimatedContractValue` from the form |
| **Earliest feasible start date** | `findEarliestFeasibleStart()` — scans forward from today to find the first week where none of the assigned investigators would breach the warning threshold |
| **Sensitivity analysis** | Three variants run simultaneously: base scenario, +20% enrollment ramp (upside), -20% enrollment ramp (downside) — shows how verdict changes under different enrollment speeds |

**Data source:** Simulation reads current `visits`, `assessments`, and `studies` to establish baseline load, then projects the hypothetical study on top of it.

---

### Saved Scenarios Table

Shown when at least one scenario has been saved. One row per saved scenario.

| Column | Source |
|--------|--------|
| **Scenario Name** | `scenario.study.name` |
| **Investigators** | `scenario.study.assignedInvestigatorIds.length` |
| **Peak Utilization** | Maximum `peakPct` across all `byInvestigator` results (color-coded) |
| **Est. Revenue** | `scenario.result.estimatedRevenue` |
| **Verdict** | `scenario.result.overallVerdict` badge |

**Data source:** `whatIfScenarios` Firestore collection scoped to `siteId`. Saved via `saveWhatIfScenario()`.

---

### Revenue vs. Capacity Scatter Chart

Shown when 2 or more scenarios are saved.

| Field | Detail |
|-------|--------|
| **What it shows** | Each saved scenario as a dot positioned by peak utilization (X) vs. estimated revenue (Y) |
| **X-axis** | Peak utilization % (0–110%) |
| **Y-axis** | Estimated revenue ($) |
| **Dot color** | Green = feasible, Amber = caution, Red = infeasible |
| **Labels** | Scenario name above each dot |
| **Reference lines** | 75% (caution zone) and 90% (critical zone) vertical lines |

---

### Side-by-Side Comparison Table

Shown when exactly 2 saved scenarios are selected via checkboxes. Highlights the "winning" value in each row.

| Metric | Source |
|--------|--------|
| Overall Verdict | `result.overallVerdict` |
| Peak Utilization | Max `peakPct` across all investigators |
| Est. Revenue | `result.estimatedRevenue` |
| Target Enrollment | `study.targetEnrollment` |
| Duration | `study.durationWeeks` |
| Investigators | `study.assignedInvestigatorIds.length` |
| Visits / pt / mo | `study.visitsPerParticipantPerMonth` |

---

## Operations Page

Three sections: **Live Today**, **Historical Board Sessions**, and **Today's Data Entry**.

### Live Today — k2 Board Section

#### Participant Flow Panel

Displays live board status tiles. Each tile represents one participant status with a count.

| Status tile | Signal |
|-------------|--------|
| Scheduled | Neutral |
| Checked In | Neutral |
| With Coordinator | Neutral |
| In Ratings | Neutral |
| In Procedures | Neutral |
| IP Dosing | Neutral |
| Observation | Neutral |
| Discharge Ready | Warn |
| Left | Neutral |
| OOO / Appts | Neutral |
| No Show | Alert |

Only statuses with count > 0 are shown. Header shows total count and count of "active" participants (not yet scheduled, left, or no-show).

**Data source:** `k2BoardToday` — real-time subscription to today's k2 board entries. Collection: inferred from `useK2BoardToday` hook, populated by k2 Board XLSX imports.

---

### Historical Board Sessions Section

Shown only when board sessions have been imported. All aggregate tiles and charts below are filtered by the **period selector** (1M / 3M / 6M / YTD).

#### Aggregate Tiles (3-up row)

| Tile | Value | Source |
|------|-------|--------|
| **Total Sessions** | Count of imported board sessions | `boardSessions` collection |
| **Avg No-Show Rate** | `sum(noShows) / sum(totalScheduled)` across filtered sessions (%) | `boardSession.metrics.noShows`, `.totalScheduled` |
| **Avg Visit Duration** | Mean of `boardSession.metrics.avgVisitDurationMin` across sessions with duration data | `boardSession.metrics.avgVisitDurationMin` |

Signal on Avg No-Show Rate: Good < 10%, Warn 10–19%, Alert ≥ 20%.

---

#### No-Show Rate Over Time (Line Chart)

| Field | Detail |
|-------|--------|
| **What it shows** | No-show rate % per board session date, oldest to newest |
| **X-axis** | Session date (e.g. "Apr 3") |
| **Y-axis** | No-show % |
| **Computation** | `noShows / totalScheduled * 100` per session |
| **Period filter** | Controlled by period selector (1M/3M/6M/YTD) |
| **Data source** | `boardSessions` collection — `metrics.noShows`, `metrics.totalScheduled` |

---

#### Avg Visit Duration Over Time (Line Chart)

| Field | Detail |
|-------|--------|
| **What it shows** | Average visit duration in minutes per board session date |
| **X-axis** | Session date |
| **Y-axis** | Duration in minutes |
| **Period filter** | Shares the same period selector as No-Show Rate |
| **Data source** | `boardSessions` — `metrics.avgVisitDurationMin` (sessions with null duration are excluded) |

---

#### Arrivals by Study (Bar Chart)

| Field | Detail |
|-------|--------|
| **What it shows** | Arrival counts per study name, top 10 studies |
| **Granularity** | Today / 7d / All — controlled by separate granularity selector |
| **Computation** | Sums `boardSession.metrics.byStudy[studyName].arrivals` across sessions in the selected granularity window |
| **X-axis** | Study name (as recorded in k2 board) |
| **Y-axis** | Arrival count |
| **Data source** | `boardSessions` — `metrics.byStudy` |

---

#### Visits by Investigator (Bar Chart)

| Field | Detail |
|-------|--------|
| **What it shows** | Total visit count per investigator name |
| **Granularity** | Today / 7d / All — separate granularity selector |
| **Computation** | Sums `boardSession.metrics.byInvestigator[name].visits` across sessions |
| **X-axis** | Investigator board name |
| **Y-axis** | Visit count |
| **Data source** | `boardSessions` — `metrics.byInvestigator` |

---

#### Session Log Table

Shows the most recent 20 board sessions.

| Column | Source |
|--------|--------|
| **Date** | `boardSession.sessionDate` |
| **Scheduled** | `boardSession.metrics.totalScheduled` |
| **Arrivals** | `boardSession.metrics.arrivals` |
| **Completed** | `boardSession.metrics.completedVisits` |
| **No-Shows** | `boardSession.metrics.noShows` |
| **No-Show %** | `noShows / totalScheduled * 100` (color-coded: green < 10%, amber 10–19%, red ≥ 20%) |
| **Avg Duration** | `boardSession.metrics.avgVisitDurationMin` (shown as "—" if null) |

---

### Today's Data Entry Section

#### Summary Tiles (3-up row)

| Tile | Value | Source |
|------|-------|--------|
| **Visits Logged** | Count of visits where `status == 'completed'` and `completedDate == today` | `visits` collection |
| **Assessments Logged** | Count of assessments where `date == today` | `assessments` collection |
| **Total Duration** | Sum of all durations (minutes) across today's visits and assessments | `visit.actualDurationMinutes ?? visit.durationMinutes`, `assessment.durationMinutes` |

---

#### Logged Entries Table

Shows all visits completed today and all assessments dated today, sorted by study name.

| Column | Source |
|--------|--------|
| **Type** | "Visit" or "Assessment" badge |
| **Study** | Study name resolved from `visit.studyId` / `assessment.studyId` |
| **Investigator** | Investigator name resolved from `visit.investigatorId` / `assessment.investigatorId` |
| **Visit / Scale** | `visit.visitType` or `assessment.scaleType` |
| **Status** | `visit.status` (always "completed" for today's entries) |
| **Duration** | `visit.actualDurationMinutes ?? visit.durationMinutes` or `assessment.durationMinutes` |

---

## Protocol Deviations Page

### Open Deviation Counter Badge

In the page header: a red badge showing count of deviations with `status == 'open'`. Driven by the same `deviations` dataset as the table.

### Deviation Analytics Panel

Shown when any deviations exist (filtered by the study selector if active).

| Element | Value | Source |
|---------|-------|--------|
| **Open count** | Deviations with `status == 'open'` | `protocolDeviations` |
| **PI Reviewed count** | Deviations with `status == 'pi_reviewed'` | `protocolDeviations` |
| **Closed count** | Deviations with `status == 'closed'` | `protocolDeviations` |
| **By Category bar chart** | Count per `deviation.category`, sorted descending, top 8 | `protocolDeviations` |

**Data source:** `protocolDeviations` collection, scoped to `siteId`. Filtered to selected study when a study filter is applied.

---

### Deviation Log Table

| Column | Source |
|--------|--------|
| **Subject ID** | `deviation.subjectId` |
| **Study** | Study name (shown when "All Studies" filter is active) |
| **Date** | `deviation.date` |
| **Category** | `deviation.category` |
| **Description** | `deviation.description` |
| **Corrective Action** | `deviation.correctiveAction` |
| **PI Reviewed** | `deviation.piReviewed` (boolean) |
| **Status** | `deviation.status` (open / pi_reviewed / closed) |

Record count shown in the panel header. Management users see Edit controls.

---

## Studies Page

### Study Table

A filterable table of all studies at the site. Filters: status (all/pending/enrolling/open/paused/completed), therapeutic area, and "hide completed" toggle.

| Column | Source |
|--------|--------|
| **Study name** | `study.name` |
| **Sponsor** | `study.sponsor` |
| **Phase** | `study.phase` |
| **Status** | `study.status` badge |
| **Enrolled / Target** | `enrollmentData.randomizations` / `targetEnrollment` |
| **PI** | Resolved from `study.piId` against `investigators` |
| **Start → End** | `study.startDate` → `study.expectedEndDate` |

Clicking a row navigates to `/studies/{id}`. Selecting two studies enables a **Compare** button that opens a side-by-side comparison modal.

**Data sources:** `studies` and `investigators` collections.

---

## Study Detail Page

### Study Detail Header

Displayed at the top of every Study Detail view.

| Element | Value | Source |
|---------|-------|--------|
| **Study name** | `study.name` | `studies` |
| **Status badge** | `study.status` | `studies` |
| **Sponsor · Protocol ID** | `study.sponsor` + `study.sponsorProtocolId` | `studies` |
| **Phase** | `study.phase` | `studies` |
| **Indication** | `study.therapeuticArea` | `studies` |
| **PI** | Name resolved from `study.piId` via `investigators` | `investigators` |
| **Dates** | `study.startDate` → `study.expectedEndDate` | `studies` |
| **Primary RC** | `study.primaryCoordinator` | `studies` |
| **Backup RC** | `study.backupCoordinator` | `studies` |
| **Enrollment progress bar** | `randomizations / targetEnrollment` as a horizontal bar; accent/warn/good color by % | `study.enrollmentData` |
| **Enrollment label** | "X / Y (Z%)" | Same |

Management users also see status-toggle and clone buttons (not data displays).

---

### Visit Schedule Tab

A table of all visit types defined for the study.

| Column | Source |
|--------|--------|
| **Visit** | `visitScheduleEntry.visitName` |
| **Window** | `visitScheduleEntry.visitWindow` |
| **Inv. Min** | `visitScheduleEntry.investigatorTimeMinutes` |
| **Coord. Min** | `visitScheduleEntry.coordinatorTimeMinutes` |
| **Inv. Required** | `visitScheduleEntry.isInvestigatorRequired` (✓ or —) |

**Data source:** `study.visitSchedule[]` array on the study document. Editable by management only. Can also be populated from a protocol PDF upload (AI-parsed via Anthropic SDK).

---

### Assessments Tab

Per-visit panels showing the assessment scales assigned to each visit. One panel per visit name defined in the visit schedule.

| Element | Value | Source |
|---------|-------|--------|
| **Visit name header** | `visitScheduleEntry.visitName` | `study.visitSchedule` |
| **Total minutes** | Sum of all scale durations for this visit | `study.scaleDurations[visitName][scaleName]` |
| **Scale list** | Scale names assigned to this visit | `study.assessmentBattery[visitName][]` |
| **Duration per scale** | Minutes for each scale at this visit | `study.scaleDurations[visitName][scaleName]` |

**Data source:** `study.assessmentBattery` (Record<visitName, scaleNames[]>) and `study.scaleDurations` (Record<visitName, Record<scaleName, minutes>>) on the study document.

---

### Protocol Tab

A status card showing whether a protocol PDF has been imported via AI parsing.

| Element | Value | Source |
|---------|-------|--------|
| **Import status** | "Protocol imported" or "No protocol uploaded" | `study.parsedFromProtocol` (boolean) |
| **Visit count** | `study.visitSchedule.length` | `study.visitSchedule` |
| **Scale count** | Sum of all `assessmentBattery` arrays | `study.assessmentBattery` |
| **Visit schedule summary list** | Each visit: name, window, PI minutes, coordinator minutes, scale count badge | `study.visitSchedule[]` + `study.assessmentBattery` |

---

### Investigators Tab

A table of investigators assigned to this study.

| Column | Source |
|--------|--------|
| **Name** | Resolved from `studyInvestigator.investigatorId` via `investigators` |
| **PI badge** | Shown if `investigatorId == study.piId` |
| **Credentials** | `investigator.credentials` |
| **Role on Study** | `studyInvestigator.role` (PI / Sub-I / Provider) |

**Data source:** `study.assignedInvestigators[]` array, resolved against `investigators` collection.

---

### Enrollment Tab

An interactive enrollment funnel — 5 stage columns: Prescreens, Screens, Randomizations, Active, Completions.

| Element | Value | Source |
|---------|-------|--------|
| **Each stage count** | `study.enrollmentData.prescreens / screens / randomizations / active / completions` | `studies.enrollmentData` |
| **Stage bar** | Proportional width bar relative to the largest stage value | Computed |
| **Conversion rate** | "X% from prev" — each stage ÷ preceding stage | Computed from `enrollmentData` |

Management users can edit values directly and save. Staff see read-only values.

---

### Delegation Log Tab

A table of delegation log entries for this study.

| Column | Source |
|--------|--------|
| **Investigator** | Name resolved from `delegationLog.investigatorId` via `investigators` |
| **Delegated Tasks** | `delegationLog.delegatedTasks[]` joined by ", " |
| **Effective Date** | `delegationLog.effectiveDate` |
| **Source** | "Manual" or "Advarra Import" badge — from `delegationLog.source` |

**Data source:** `delegationLogs` collection filtered to `studyId`. Both manual entries and Advarra eReg imports appear here.

---

### Deviations Tab (Study Detail)

A deviation count label and a deviation table scoped to this single study.

| Column | Source |
|--------|--------|
| **Subject ID** | `deviation.subjectId` |
| **Date** | `deviation.date` |
| **Category** | `deviation.category` |
| **Description** | `deviation.description` |
| **Corrective Action** | `deviation.correctiveAction` |
| **Status** | `deviation.status` |

**Data source:** `protocolDeviations` collection filtered to `studyId`.

---

### Study Team Tab

A list of sponsor/CRO team contacts for this study.

| Column | Source |
|--------|--------|
| **Role** | `teamContact.role` |
| **Name** | `teamContact.name` |
| **Email** | `teamContact.email` |
| **Phone** | `teamContact.phone` |
| **Organization** | `teamContact.organization` |
| **Notes** | `teamContact.notes` |

**Data source:** `study.teamContacts[]` array on the study document.

---

### Contract Tab

Management-only tab. Three sections:

#### Contract Summary

| Field | Source |
|-------|--------|
| **Total Contract Value** | `study.contract.totalValue` |
| **Paid Screen Fail Ratio** | `study.contract.paidScreenFails.ratio` |
| **Max Paid Screen Fails** | `study.contract.paidScreenFails.maxPaid` |

#### Milestones Table

| Column | Source |
|--------|--------|
| **Name** | `milestone.name` |
| **Amount** | `milestone.amount` ($) |
| **Expected Date** | `milestone.expectedDate` |
| **Status** | Achieved ✓ or Pending — from `milestone.achieved` |
| **Achieved Date** | `milestone.achievedDate` (if achieved) |

#### Contract Summary (read-only footer)

| Field | Computation |
|-------|-------------|
| **Total Contract Value** | `study.contract.totalValue` |
| **Total Milestone Value** | Sum of `milestone.amount` across all milestones |
| **Achieved to Date** | Sum of `milestone.amount` where `milestone.achieved == true` |
| **Remaining** | `totalValue - achievedValue` |

---

## Capacity Planner Page

### Capacity Heatmap

A scrollable grid showing utilization % for every investigator × week combination.

| Dimension | Detail |
|-----------|--------|
| **Rows** | One per investigator |
| **Row header** | `investigator.name` + `weeklyCapacityHours`h/wk |
| **Columns** | ~43 weeks back (actuals) + current week + 8 weeks ahead (projections) |
| **Column header** | Week start date (MM-DD), current week highlighted with "now" label |
| **Cell value** | Utilization % computed by `computeWeekMetrics()` |
| **Past weeks** | Only `completed` visits counted |
| **Current/future weeks** | `scheduled` and `completed` visits counted |
| **Cell color** | Grey/muted = 0%; Green = < 75%; Amber = 75–89%; Red = ≥ 90% |

**Data sources:** `investigators`, `visits`, `assessments` collections.

---

## Reports Page

Five tabs: Site Summary, Enrollment, Deviations, Visit Quality, Investigator.

### Reports — Site Summary Tab

#### Aggregate Tiles (6-up row)

| Tile | Value | Signal thresholds | Source |
|------|-------|-------------------|--------|
| **Active Studies** | Count of studies with `status == 'enrolling'` or `'open'` | info | `studies` |
| **Site Enrolled** | `totalRandomizations / totalTarget` as % + "X / Y participants" sub-label | Good ≥ 80%, Warn ≥ 50%, Alert < 50% | `studies.enrollmentData.randomizations`, `targetEnrollment` |
| **Screen→Rand** | `totalRandomizations / totalScreens` as % | Good ≥ 60%, Warn ≥ 40%, Alert < 40% | `studies.enrollmentData` |
| **Open Deviations** | Count of deviations with `status == 'open'` | Good = 0, Warn 1–3, Alert > 3 | `protocolDeviations` |
| **Avg Utilization** | Average utilization % across all investigators this week | Good < 75%, Warn 75–89%, Alert ≥ 90% | `investigators`, `visits`, `assessments` |
| **Milestones Achieved** | "X / Y" achieved vs. total milestones across all studies | Good if any achieved, Neutral if none | `studies.contract.milestones` |

---

#### Enrollment by Study Table

A grouped, collapsible table of all studies organized by status group (Pending, Enrolling, Open, Paused, Completed). Each group is collapsible; Enrolling and Open start expanded.

| Column | Source |
|--------|--------|
| **Study** | `study.name` (clickable — navigates to study detail) |
| **Enrolled / Target** | `enrollmentData.randomizations` / `targetEnrollment` |
| **%** | `randomizations / targetEnrollment * 100` (color-coded: good ≥ 80%, warn ≥ 50%, alert < 50%) |
| **Status** | `study.status` badge |

---

#### Deviation Snapshot Panel

| Element | Value | Source |
|---------|-------|--------|
| **Bar chart** | Deviation count per category, top 8, sorted descending | `protocolDeviations.category` |
| **Open count** | `status == 'open'` | `protocolDeviations` |
| **PI Reviewed count** | `status == 'pi_reviewed'` | `protocolDeviations` |
| **Closed count** | `status == 'closed'` | `protocolDeviations` |

---

### Reports — Enrollment Tab

#### Summary Tiles (3-up row)

| Tile | Value | Signal | Source |
|------|-------|--------|--------|
| **Total Prescreens** | Sum of `enrollmentData.prescreens` across all studies | Neutral | `studies` |
| **Screen→Rand Rate** | `totalRandomizations / totalScreens` as % | Good ≥ 60%, Warn ≥ 40%, Alert < 40% | `studies.enrollmentData` |
| **Active Participants** | Sum of `enrollmentData.active` across all studies | Good if > 0, Neutral if 0 | `studies` |

---

#### Enrollment Funnel by Study Table

Full funnel per study, sorted by status order (enrolling first, completed last).

| Column | Source |
|--------|--------|
| **Study** | `study.name` |
| **Prescreens** | `enrollmentData.prescreens` |
| **Screens** | `enrollmentData.screens` |
| **Randomized** | `enrollmentData.randomizations` |
| **Active** | `enrollmentData.active` |
| **Completions** | `enrollmentData.completions` |
| **Screen Fail Rate** | `screenFailures.length / enrollmentData.screens * 100` (Good < 20%, Warn 20–39%, Alert ≥ 40%) |
| **Pct of Target** | `randomizations / targetEnrollment * 100` (Good ≥ 80%, Warn ≥ 50%, Alert < 50%) |

**Data sources:** `studies` and `screenFailures` (all failures for the site).

---

#### Screen Failure Reasons — Site-Wide (Bar Chart)

| Field | Detail |
|-------|--------|
| **What it shows** | Reason category counts across all screen failures at the site |
| **X-axis** | Category label (formatted from `reason.category`) |
| **Y-axis** | Count (aggregated across all `failure.reasons[]` entries) |
| **Data source** | `screenFailures` collection (all studies at site) — iterates `failure.reasons[].category` |

---

### Reports — Deviations Tab

#### Status Tiles (3-up row)

| Tile | Value | Signal | Source |
|------|-------|--------|--------|
| **Open** | Count with `status == 'open'` | Good = 0, Warn 1–2, Alert ≥ 3 | `protocolDeviations` |
| **PI Reviewed** | Count with `status == 'pi_reviewed'` | Neutral | `protocolDeviations` |
| **Closed** | Count with `status == 'closed'` | Good if > 0, Neutral if 0 | `protocolDeviations` |

---

#### By Category (Bar Chart)

| Field | Detail |
|-------|--------|
| **What it shows** | Deviation count by category, sorted descending, top 8 |
| **X-axis** | Formatted category label |
| **Y-axis** | Count |
| **Data source** | `protocolDeviations` — `deviation.category` |

---

#### By Study Table

One row per study that has at least one deviation.

| Column | Source |
|--------|--------|
| **Study Name** | Resolved from `deviation.studyId` |
| **Open** | Count where `status == 'open'` for this study |
| **PI Reviewed** | Count where `status == 'pi_reviewed'` for this study |
| **Closed** | Count where `status == 'closed'` for this study |
| **Total** | All deviations for this study |

Sorted by total count descending.

---

#### Open Deviations — Aging Table

Shows only open deviations, sorted by age descending (oldest first).

| Column | Source |
|--------|--------|
| **Subject** | `deviation.subjectId` |
| **Study** | Study name resolved from `deviation.studyId` |
| **Category** | Formatted `deviation.category` |
| **Date** | `deviation.date` |
| **Days Open** | `floor((now - deviation.createdAt) / 86400000)` — color-coded: green ≤ 14d, amber 15–30d, red > 30d |

---

### Reports — Visit Quality Tab

A date range filter (30 days / 90 days / 6 months / All time) controls all panels below.

#### Site-Wide Tiles (3-up row)

Computed only from visits that are **not** in `scheduled` status (i.e., historical visits only).

| Tile | Value | Signal | Source |
|------|-------|--------|--------|
| **Completion Rate** | `completed / total * 100` | Good ≥ 85%, Warn ≥ 70%, Alert < 70% | `visits` |
| **Missed Rate** | `missed / total * 100` | Good ≤ 5%, Warn ≤ 15%, Alert > 15% | `visits` |
| **No-Show Rate** | `no_show / total * 100` | Good ≤ 5%, Warn ≤ 15%, Alert > 15% | `visits` |

---

#### Visit Quality by Study Table

One row per study that has non-scheduled visit history. Sorted by completion % ascending (lowest performers first).

| Column | Source |
|--------|--------|
| **Study** | `study.name` |
| **Completed** | Count of visits with `status == 'completed'` |
| **Missed** | Count of visits with `status == 'missed'` |
| **No-Show** | Count of visits with `status == 'no_show'` |
| **Total** | All non-scheduled visits for this study |
| **Completion %** | `completed / total * 100` (color-coded) |

---

#### Visit Quality by Staff Member Table

One row per investigator that has non-scheduled visit history. Sorted by completion % ascending.

| Column | Source |
|--------|--------|
| **Investigator** | `investigator.name` |
| **Role** | `investigator.role` |
| **Completed** | Visits with `status == 'completed'` for this investigator |
| **Missed** | Visits with `status == 'missed'` |
| **No-Show** | Visits with `status == 'no_show'` |
| **Completion %** | `completed / total * 100` (color-coded) |

---

#### Duration Accuracy Table

Only studies with ≥ 3 completed visits that have actual duration recorded are included.

| Column | Source |
|--------|--------|
| **Study** | `study.name` |
| **Avg Scheduled (min)** | Mean `visit.durationMinutes` across completed visits with actual data |
| **Avg Actual (min)** | Mean `visit.actualDurationMinutes` |
| **Variance** | `avgActual - avgScheduled` (signed, color-coded: green ≤ ±10, amber ≤ ±20, red > ±20) |

---

### Reports — Investigator Tab

#### Investigator Report Cards

One card per PI/Sub-I investigator. Exportable via "Download CSV" button.

| Element | Value | Source |
|---------|-------|--------|
| **Name** | `investigator.name` | `investigators` |
| **Credentials · Role** | `investigator.credentials` + `investigator.role` | `investigators` |
| **Utilization % (large number)** | Current-week utilization % from `computeWeekMetrics()` | `investigators`, `visits`, `assessments` |
| **Capacity bar** | Visual bar color-coded green/amber/red | Same |
| **Visits (30d)** | Count of visits where `completedDate >= 30 days ago` for this investigator | `visits` |
| **Assessments (30d)** | Count of assessments where `date >= 30 days ago` | `assessments` |
| **Delegated Studies** | Study names where this investigator appears in `assignedInvestigators` | `studies` |

CSV export columns: Investigator, Utilization %, Visits (30d), Assessments (30d).

---

## Staff — My Dashboard

### Stat Tiles (3-up row)

| Tile | Value | Source |
|------|-------|--------|
| **Assigned Studies** | Count of study IDs in `user.assignedStudies` | `users` document for current user |
| **Upcoming Visits (14 days)** | Count of visits in `user.assignedStudies` where `scheduledDate` is within the next 14 days and `status` is not completed/missed | `visits` filtered to assigned study IDs |
| **Delegated Tasks** | Total count of all `delegatedTasks` entries across all delegation log entries for all assigned studies | `delegationLogs` collection, one subscription per assigned study |

Clicking the Assigned Studies tile navigates to `/my-studies`.

---

### Upcoming Visits Tab

A table of all upcoming visits (next 14 days) across assigned studies, sorted by `scheduledDate` ascending.

| Column | Source |
|--------|--------|
| **Study** | Study name resolved from `visit.studyId` |
| **Visit Type** | `visit.visitType` |
| **Scheduled Date** | `visit.scheduledDate` (formatted as "Apr 03, 2025") |
| **Status** | `visit.status` badge (Scheduled / Completed / Missed / No Show) |
| **Duration** | `visit.durationMinutes` in minutes |

**Data source:** `visits` collection filtered to `siteId` — then filtered client-side to assigned study IDs and date window.

---

### Delegation Authority Tab

One card per assigned study showing delegation log entries for that study.

Per study card:

| Element | Source |
|---------|--------|
| **Study name** | `study.name` |
| **Sponsor · Phase** | `study.sponsor` + `study.phase` |
| **Per-entry rows** | Investigator name + delegated tasks (joined) + effective date |

**Data source:** `delegationLogs` collection filtered per `studyId`.

---

### My Studies Summary Tab

A grid of cards — one per assigned study.

Per card:

| Element | Source |
|---------|--------|
| **Study name** | `study.name` |
| **Sponsor · Phase** | `study.sponsor` + `study.phase` |
| **Status badge** | `study.status` |
| **Enrollment bar** | `randomizations / targetEnrollment`, green fill |
| **Enrollment label** | "X / Y" counts |
| **Date range** | `study.startDate` → `study.expectedEndDate` |

---

## Staff — My Studies

A two-column layout: study list on the left, detail panel on the right. Only shows studies in `user.assignedStudies`.

### Study List (left)

Each button shows:
- Study name
- Sponsor
- Status badge

### Detail Panel (right)

Two tabs per selected study: **Visit Completion** and **Delegation Log**.

#### Visit Completion Tab

A completion tracker showing visit log history for the selected study.

| Element | Source |
|---------|--------|
| **Visit log entries** | Visits for this study, grouped or listed by status | `visits` filtered to `studyId` |
| **Completion status** | `visit.status` — scheduled/completed/missed/no_show | `visits` |

Powered by `VisitCompletionTracker` component in `src/components/workload/`.

---

#### Delegation Log Tab (read-only)

Same structure as the Delegation Log Tab in Study Detail, but **read-only** (no add/delete controls).

| Column | Source |
|--------|--------|
| **Investigator** | Name resolved from `delegationLog.investigatorId` |
| **Delegated Tasks** | `delegationLog.delegatedTasks[]` joined |
| **Effective Date** | `delegationLog.effectiveDate` |
| **Source** | "Manual" or "Advarra Import" |

---

## Staff — Data Entry

This page contains only **data entry forms** — no data display panels. It is excluded from this reference per the document scope.

---

## Data Update Cadence

All tiles and panels use real-time Firestore listeners (`onSnapshot`). There is no manual refresh — data updates automatically as staff log visits, import enrollment data, or modify study records.

The `SyncIndicator` in the top navigation bar reflects the current Firestore connection state (synced / syncing / offline).

---

## Tile Visibility & Order

The three configurable Overview tiles (Studies, Enrollment, Today's Activity) can be shown/hidden and reordered per management user. Go to **Settings → My Dashboard** to customize. Changes are saved to `users/{uid}.dashboardConfig` in Firestore and persist across sessions.

---

## Signal Color Key

Used consistently across all tiles and charts:

| Signal | Color | Meaning |
|--------|-------|---------|
| **good** | Green | Healthy — at or above target |
| **warn** | Amber | Approaching a threshold |
| **alert** | Red | Threshold exceeded — attention needed |
| **neutral** | Dim white | Informational — no threshold applies |
| **info** | Blue | Informational with additional context available |
