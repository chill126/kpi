# K2 Medical Research — Clinical Site KPI Tracker & Resource Management Tool
## Complete Design Specification
**Date:** 2026-04-19  
**Site:** K2 Medical Research, Tampa (multi-site framework, Tampa active)  
**Stack:** React 18 + Vite + TypeScript + Tailwind CSS + Firebase + Recharts + Claude API  
**Status:** Ready for implementation planning

---

## Table of Contents

1. [Context & Problem Statement](#1-context--problem-statement)
2. [System Decomposition — 5 Phases](#2-system-decomposition--5-phases)
3. [Phase 1: Core Infrastructure](#3-phase-1-core-infrastructure)
4. [Phase 2: Study Management + Workload Tracking](#4-phase-2-study-management--workload-tracking)
5. [Phase 3: Management Dashboards](#5-phase-3-management-dashboards)
6. [Phase 4: Predictive Engine](#6-phase-4-predictive-engine)
7. [Phase 5: Import Pipeline](#7-phase-5-import-pipeline)
8. [Full Feature Inventory](#8-full-feature-inventory)
9. [Data Model Summary](#9-data-model-summary)
10. [Tech Stack Details](#10-tech-stack-details)
11. [UI/UX Design System](#11-uiux-design-system)
12. [Verification Plan](#12-verification-plan)

---

## 1. Context & Problem Statement

K2 Medical Research Tampa runs a multi-therapeutic-area clinical research site with ~3 investigators (Dr. Kelley Wilson MD/PI, Dr. Raj Patel MD/PI, Melissa Belardo APRN/Investigator) across psychiatry, psychedelics, Alzheimer's, and general medicine studies. The existing prototype (single-file HTML/React) tracks KPI entry, study metrics, and basic assessments but lacks:

- Management-facing capacity planning and resource demand visibility
- Per-investigator workload analysis across concurrent studies
- Financial/ROI tracking per study
- Predictive tools to determine if a new study can be taken on
- Imports from Clinical Conductor (CTMS) and Advarra eReg (delegation logs)
- Protocol-aware study setup (Schedule of Assessments parser)

**The three management questions this tool must answer:**
1. Can we take on a new study without overloading an investigator?
2. How much revenue is each study generating vs. the time it costs us?
3. Which investigator is closest to capacity right now?

---

## 2. System Decomposition — 5 Phases

Each phase is independently deployable and produces immediate value.

| Phase | Scope | Key Output |
|---|---|---|
| 1 | Core infrastructure: auth, roles, navigation, data migration, site framework | Working app with login, roles, Tampa data migrated |
| 2 | Study management + workload tracking + protocol parser agent | Studies fully configured, investigator time tracked |
| 3 | Management dashboards: capacity, utilization, ROI | All 3 management questions answered |
| 4 | Predictive engine: what-if simulator, forecasts, alerts | Forward-looking capacity and revenue planning |
| 5 | Import pipeline: Clinical Conductor CSV, Advarra eReg, protocol PDF | Automated data ingestion, historical seeding |

---

## 3. Phase 1: Core Infrastructure

### Goals
- Replace single-file prototype with proper Vite + TypeScript build
- Firebase Auth with two roles (management / staff)
- Multi-site framework with Tampa as active site
- Migrate all existing data from prototype's localStorage/Firestore structure
- Navigation shell with role-gated views
- Tailwind-based design system (replaces inline styles)

### Auth & Roles
- Firebase Auth: email/password login
- No self-registration — management creates accounts in Settings
- Firestore `users/{uid}` stores: `role` (`management` | `staff`), `displayName`, `siteId`
- Firebase custom claims mirror role for client-side route gating
- Session persists across browser sessions

**Management role:** Full access — all investigators, all studies, all financials, all reports, Settings  
**Staff role:** Own dashboard, data entry, assigned studies (read-only, no financials), own profile

### Navigation Shell

**Management sidebar:**
- Overview Dashboard
- Investigators
- Studies
- Enrollment
- Workload Planner
- Financial
- Reports
- Import
- Settings

**Staff sidebar:**
- My Dashboard
- Data Entry
- My Studies
- My Profile

Top bar: active site badge (Tampa), user display name + role, sync status indicator (Synced / Syncing / Offline), light/dark mode toggle.

### Multi-Site Framework
- All Firestore queries scoped by `siteId`
- Site selector in top bar (management only) — shows Tampa as active, others visible but locked with "Coming soon"
- Sites collection: `{ id, name, location, active, timezone }`
- Enables Winter Garden, The Villages, Phase One to be added later with zero architectural changes

### Data Migration
One-time migration script run at Phase 1 deploy:
- `entries` → `visits` collection (add `siteId: "tampa"`, `source: "legacy"`)
- `assessmentEntries` → `assessments` collection
- `studyData` → populate `studies` monthly metrics
- `studyDetailsData` → populate `studies.visitSchedule` and `studies.assessmentBattery`
- `investigators` list → `investigators` collection with placeholder `weeklyCapacityHours: 40`
- `participantData` → carried into `studies.enrollmentData`
- All existing Firebase project credentials and config reused

### Verification
- Login as management: see full nav, all data
- Login as staff: see restricted nav, own data only
- All legacy data visible and correct after migration
- Site selector shows Tampa active, others locked
- Sync indicator updates on write

---

## 4. Phase 2: Study Management + Workload Tracking

### Study Data Model

```
studies/{id}:
  name: string
  sponsor: string
  sponsorProtocolId: string
  therapeuticArea: string
  phase: string (Phase I / II / III / IV / Observational)
  status: 'enrolling' | 'paused' | 'maintenance' | 'completed' | 'on_hold'
  siteId: string
  piId: string (investigatorId)
  assignedInvestigators: [{ investigatorId, role: 'PI' | 'Sub-I' | 'Provider' }]
  targetEnrollment: number
  startDate: date
  expectedEndDate: date
  visitSchedule: [{ 
    visitName, visitWindow, investigatorTimeMinutes, 
    coordinatorTimeMinutes, isInvestigatorRequired 
  }]
  assessmentBattery: { [visitName]: [scaleType] }
  adminOverride: {
    perStudyWeeklyHours: number
    perParticipantOverheadPct: number
  }
  contractPlaceholder: { ... }
  parsedFromProtocol: boolean
```

### Study Views

**Study List** — filterable table:
- Columns: name, sponsor, status badge, therapeutic area, phase, PI, active participants, enrollment %, weekly investigator hours
- Filters: status, therapeutic area, PI, site
- Actions: add study, toggle status, open detail, clone, archive

**Study Detail Page:**
- Header: name, sponsor, status, PI, dates, enrollment progress bar
- Tabs: Overview | Visit Schedule | Assessment Battery | Investigators | Enrollment | Delegation Log

**Study Comparison View:**
- Select 2 studies side by side
- Compare: weekly hours demand, active participants, enrollment pace, assessment burden per visit, investigator allocation

**Enrollment Funnel:**
- Per-study funnel: Prescreens → Screens → Randomizations → Active → Completions
- Screen failure rate, randomization rate auto-calculated
- Trend sparkline week over week

**Status Toggle:**
- One-click status change with confirmation modal
- Status history logged (who changed it, when)

**Clone Study:**
- Copies visit schedule, assessment battery, admin overhead settings
- Clears enrollment data and financial data

### Protocol Parser Agent (Claude API)

Triggered at study creation ("Upload Protocol PDF" button) or from Study Detail > Visit Schedule tab.

**Flow:**
1. User uploads protocol PDF
2. Frontend sends PDF + extraction prompt to Claude API (claude-sonnet-4-6)
3. Prompt instructs Claude to extract all visit names and windows, all assessments per visit marked investigator-required, conditional procedure footnotes
4. Claude returns structured JSON: `{ visits: [...], assessmentBattery: {...}, confidence: {...} }`
5. Review UI: user sees extracted schedule in editable table, low-confidence items highlighted in amber
6. User confirms or edits → saves to `studies.visitSchedule` and `studies.assessmentBattery`
7. Parser result logged to `imports/{id}` for audit trail

**Scale duration defaults** (configurable in Settings):
| Scale | Default Duration |
|---|---|
| HAMD-17 | 20 min |
| MADRS | 20 min |
| ADAS-Cog | 45 min |
| PANSS | 30 min |
| CGI | 10 min |
| PHQ-9 | 10 min |
| GAD-7 | 10 min |
| YMRS | 15 min |
| CDR | 30 min |
| BPRS | 20 min |
| MMSE | 15 min |
| Informed Consent Review | 45 min |
| Physical Exam | 20 min |
| Custom (user-defined) | configurable |

### Workload Tracking

**Visit Logging:**
- Log a visit: investigator, study, visit type, date, status (scheduled / completed / missed / no-show), actual duration (optional override)
- Bulk entry: log multiple participants' visits for the same study/date
- Source field: `manual` | `cc_import`

**Assessment Logging:**
- Link to a visit (optional)
- Scale type auto-suggests duration from defaults
- Override duration for actual time spent

**Visit Completion Tracker per study:**
- Table: participant ID, visit type, scheduled date, status, investigator
- Summary: % completed, % missed, % no-show this month
- No-show trend chart

**Delegation Log:**
- Per-study table: investigator name, delegated tasks, effective date
- Source: `advarra_import` or `manual`
- Read-only after import; manual entries editable

---

## 5. Phase 3: Management Dashboards

### Overview Dashboard (Management landing page)
- 3 summary cards: Site Capacity (% used this week), Studies Active, Revenue vs. Cost Efficiency (placeholder)
- Investigator utilization bar chart (all investigators, this week)
- Study workload distribution donut chart
- Enrollment velocity across all active studies (combined)
- Recent alerts (capacity warnings, missed visit spikes)

### Investigator Detail View
- Capacity gauge: used hours / available hours this week and month
- Breakdown: scheduled visit time + assessment time + admin buffer = total
- Weekly trend chart (last 12 weeks)
- Study-by-study hours breakdown (stacked bar)
- Upcoming scheduled visits (next 2 weeks)
- Role assignments across studies

### Capacity Dashboard
- Grid: investigators × weeks (heat map)
- Color: green < 75%, amber 75–90%, red > 90%
- Click cell: see what's filling that week for that investigator
- Toggle: show scheduled only vs. scheduled + admin buffer

### Study ROI View (Financial — management only)
- Per-study cards: placeholder contract value, investigator hours spent to date, hours/week ongoing, cost efficiency ratio
- When real contract figures added: actual $/hour revenue, breakeven tracker
- Sorted by cost efficiency (most expensive studies per hour flagged)

### Utilization Heat Map Report
- Full-year view: investigator × week grid
- Exportable as PDF or Excel

---

## 6. Phase 4: Predictive Engine

### Capacity Forecast
**Formula per investigator per week:**
```
Scheduled time   = Σ (active participants × visit frequency × avg investigator time/visit)
                 + Σ (scheduled assessments × scale duration)
Admin buffer     = (perStudyWeeklyHours × active studies assigned)
                 + (perParticipantOverheadPct × scheduled time)
Site baseline    = configurable % of weeklyCapacityHours (default 15%)
─────────────────────────────────────────────────────────────────
Total projected  = Scheduled time + Admin buffer + Site baseline
```

Shown as: actual (from logged visits) + projected (from schedule forward) on a rolling 8-week timeline.

### What-If Simulator
- "Add a hypothetical study" modal
- Inputs: expected participants at ramp week 1/2/4/8, visit schedule (from a template or quick entry), assessment battery, admin overhead estimate
- Output: week-by-week projection for each assigned investigator for next 6 months
- Shows: when each investigator hits 75%, 90%, 100%
- Recommends: "Study feasible if assigned to Dr. Patel with current load. Dr. Wilson would exceed capacity by week 6."

### Staffing Gap Alert
- Runs weekly (or on-demand)
- Flags: "At current enrollment velocity, [Investigator] will exceed capacity threshold in approximately [N] weeks"
- Based on enrollment trend × protocol visit demand

### Revenue Forecast
- Projects monthly revenue per study: projected visits × per-visit contract rate (placeholder)
- Stacked area chart: all active studies, 6-month projection

### Enrollment Completion Predictor
- Rolling 4-week average randomizations/week per study
- Projects target enrollment date
- Confidence range shown (± 2 weeks based on variance)
- Burndown chart: remaining slots vs. time

### Screen Failure Intelligence
- Tracks screen failure rate per study over time
- At study setup, compares to historical rate for same therapeutic area
- Flags site-level benchmarks to help set prescreen targets

---

## 7. Phase 5: Import Pipeline

### Clinical Conductor CSV Import
- Upload CSV exported from CC (visit schedule report or participant report)
- Column mapping UI: user maps CC column names to our field names (saved per import type for reuse)
- Preview: first 10 rows shown before committing
- Deduplication: checks against existing visits by participantId + studyId + visitType + date
- Import summary: X rows imported, Y duplicates skipped, Z errors flagged
- Import history log in Settings

**Expected CC fields to map:** Participant ID, Study, Visit Name, Visit Date, Visit Status, Investigator

### Advarra eReg Delegation Log Import
- Upload CSV/Excel exported from Advarra eReg
- Maps to `delegationLog` collection: investigator name → investigatorId (fuzzy matched), study, delegated tasks, effective date
- Review screen before saving — unmatched investigators highlighted for manual resolution
- Existing delegation log entries replaced per study on re-import

### Protocol PDF Parser
- Reused in Phase 5 for batch import of multiple protocols at once

---

## 8. Full Feature Inventory

| Feature | Phase | Role |
|---|---|---|
| Firebase Auth, 2 roles | 1 | Both |
| Multi-site framework | 1 | Management |
| Data migration from prototype | 1 | — |
| Navigation shell | 1 | Both |
| Study list + detail + status toggle | 2 | Both |
| Study comparison view | 2 | Management |
| Study clone | 2 | Management |
| Enrollment funnel per study | 2 | Management |
| Protocol parser agent (Claude API) | 2 | Management |
| Assessment scale library (configurable durations) | 2 | Management |
| Visit logging (scheduled/completed/missed/no-show) | 2 | Staff + Management |
| Assessment logging | 2 | Staff + Management |
| Visit completion tracker | 2 | Both |
| Delegation log (manual + import) | 2 | Management |
| Overview dashboard | 3 | Management |
| Investigator detail + capacity gauge | 3 | Management |
| Capacity heat map | 3 | Management |
| Study ROI view (placeholder financials) | 3 | Management |
| Utilization report (PDF/Excel export) | 3 | Management |
| Capacity forecast engine | 4 | Management |
| What-if simulator | 4 | Management |
| Staffing gap alerts | 4 | Management |
| Revenue forecast (placeholder) | 4 | Management |
| Enrollment completion predictor | 4 | Management |
| Screen failure intelligence | 4 | Management |
| Clinical Conductor CSV import | 5 | Management |
| Advarra eReg import | 5 | Management |
| Protocol batch import | 5 | Management |

---

## 9. Data Model Summary

```
users/{uid}
  role, displayName, siteId, assignedStudies[]

sites/{siteId}
  name, location, active, timezone

investigators/{id}
  name, credentials, role (PI/Sub-I/Provider), siteId
  weeklyCapacityHours, siteBaselinePct, assignedStudies[]

studies/{id}
  (see Phase 2 data model)

visits/{id}
  participantId, studyId, investigatorId, siteId
  visitType, scheduledDate, completedDate
  status (scheduled/completed/missed/no_show)
  durationMinutes, actualDurationMinutes
  source (manual/cc_import)

assessments/{id}
  investigatorId, studyId, siteId, visitId (optional)
  scaleType, durationMinutes, date

delegationLog/{id}
  investigatorId, studyId, delegatedTasks[]
  effectiveDate, source (advarra_import/manual)

contracts/{studyId}
  perVisitRates: { [visitType]: number }
  totalContractValue: number (placeholder)
  milestones: []

imports/{id}
  type (clinical_conductor/advarra_ereg/protocol_pdf)
  uploadedBy, uploadedAt, rowCount
  status (pending/complete/error)
  mappingUsed: {}
  errors: []

capacityConfig/{investigatorId}
  weeklyCapacityHours
  siteBaselinePct (default 15%)
  [overrides per study if needed]
```

---

## 10. Tech Stack Details

| Layer | Choice | Reason |
|---|---|---|
| Build | Vite + TypeScript | Fast HMR, proper type safety |
| UI Framework | React 18 | Existing familiarity, large ecosystem |
| Styling | Tailwind CSS v3 | Utility-first, consistent design system |
| Component Library | shadcn/ui | Tailwind-native, composable, unstyled base |
| Icons | Lucide React | Consistent stroke width, full Tailwind support |
| Charts | Recharts | React-native, lighter than Chart.js, good TypeScript |
| Database | Firebase Firestore | Existing project, real-time sync, offline support |
| Auth | Firebase Auth | Integrated with Firestore, custom claims for roles |
| Hosting | Firebase Hosting | Zero additional infrastructure |
| AI | Claude API (claude-sonnet-4-6) | Protocol PDF parser, prompt caching |
| CSV Parsing | Papa Parse | Battle-tested, handles CC and eReg export formats |
| PDF Parsing | pdf-parse | Extract text from protocol PDFs before sending to Claude |
| Export | xlsx + jsPDF | Excel and PDF report export |

---

## 11. UI/UX Design System

### 11.1 User Personas

#### Persona 1: The Site Director (Management Role)
**Name:** Site Director / Practice Manager  
**Representative user:** The K2 Tampa site director or operations manager  
**Goals:**
- Know at a glance whether the site can take on a new study without burning out investigators
- Track revenue generation and cost efficiency per study
- Spot capacity risks before they become problems
- Produce reports for sponsor calls and internal review

**Pain points:**
- Currently has to mentally calculate investigator load from memory or spreadsheets
- No way to run "what if we add Study X" scenarios before committing
- Financial data (time spent vs. contract revenue) is entirely manual
- Spends 30+ minutes before management meetings assembling capacity numbers

**Usage pattern:** Morning review on desktop (1920×1080), quick mobile check during meetings, deep analysis sessions 2–3× per week

**Key screens:** Overview Dashboard, Capacity Heat Map, What-If Simulator, Study ROI View

---

#### Persona 2: The Clinical Research Coordinator (Staff Role)
**Name:** CRC / Sub-Investigator  
**Representative user:** Research coordinator assigned to 3–5 active studies  
**Goals:**
- Quickly log visit completions without navigating complex menus
- See their own schedule and workload across studies
- Access the delegation log for their assigned studies
- Enter assessment data during or immediately after patient visits

**Pain points:**
- Current prototype requires multiple clicks to log a single visit
- No single view of "my studies today"
- Has to context-switch between Clinical Conductor and the KPI tool constantly
- Data entry errors when logging retrospectively at end of day

**Usage pattern:** Tablet or laptop in clinic throughout the day, quick entries between patient visits, rarely needs reports or financial data

**Key screens:** My Dashboard, Data Entry (bulk visit logging), My Studies

---

#### Persona 3: The Investigator (Staff Role + Read Access)
**Name:** PI or Sub-Investigator (Dr. Wilson, Dr. Patel, Melissa Belardo)  
**Representative user:** Licensed investigator seeing their own capacity and study assignment  
**Goals:**
- See their own capacity gauge and upcoming visit load
- Confirm delegation assignments are correct
- Know what studies they're formally assigned to

**Pain points:**
- Not involved in data entry — only needs to review
- Doesn't want to see financial data or other investigators' load
- Wants a quick weekly summary of their own schedule

**Usage pattern:** Brief weekly check, desktop or mobile, 5–10 minutes

**Key screens:** My Dashboard (capacity gauge + upcoming visits), My Studies (delegation log view)

---

### 11.2 User Journey Maps

#### Journey 1: Management — Evaluating a New Study Opportunity

```
Trigger: Sponsor outreach about a new psychiatry study with 20 participants, 12-visit protocol

Step 1: Open Overview Dashboard
  → Sees current site capacity at 82% (amber warning)
  → Notes Dr. Wilson is at 91% (red) — at risk
  → Dr. Patel at 67% (green) — available headroom

Step 2: Open What-If Simulator
  → Clicks "Add Hypothetical Study"
  → Enters: 20 participants, ramp 5/10/15/20 over 8 weeks, 12 visits/participant over 6 months
  → Selects "Assign to Dr. Patel as PI"
  → Simulator shows: Dr. Patel peaks at 78% by week 6, stays below 90% threshold

Step 3: Review Recommendation
  → Tool confirms: "Feasible — assign to Dr. Patel. Dr. Wilson should not be added to this study."
  → Exports projection as PDF for sponsor call

Step 4: Decision made
  → Site commits to the study
  → Study added in Study Management, Dr. Patel assigned as PI
```

**Key UX requirements:** What-If must be fast (< 2s calculation), output must be visual (week-by-week chart), recommendation text must be clear and unambiguous.

---

#### Journey 2: CRC — Logging Visits After Clinic Day

```
Trigger: End of clinic Tuesday — 4 participants had scheduled visits across 2 studies

Step 1: Navigate to Data Entry
  → Selects "Bulk Visit Log"
  → Filters to today's date and their two active studies

Step 2: Log visits
  → Study A: Participants 001, 004, 007 — Visit 3 — Completed
  → Study B: Participant 012 — Visit 6 — No-Show
  → Duration overrides: 001 took 10 extra minutes (charting)
  → All 4 entries in a single form, one Submit

Step 3: Confirmation
  → Toast: "4 visits logged successfully"
  → Visit Completion Tracker for Study A updates to 71% complete this month

Step 4: Note the no-show
  → No-show for Study B automatically flagged in study's completion tracker
  → Coordinator will schedule make-up visit in Clinical Conductor
```

**Key UX requirements:** Bulk entry must be a single form submit (not 4 separate submits), date picker defaults to today, study selector remembers last selection.

---

#### Journey 3: Management — Monthly Capacity Report

```
Trigger: Monthly site review meeting in 2 days

Step 1: Open Reports section
  → Selects "Utilization Heat Map — Last 3 Months"
  → Heat map shows all 3 investigators, color-coded by capacity %

Step 2: Spot the anomaly
  → Dr. Wilson shows red for weeks 8–11 (December surge from 2 studies ramping up)
  → Clicks week 9 cell — sees the 3 studies driving the overload

Step 3: Export
  → Clicks "Export as PDF"
  → Report generated with site header, investigator legend, date range
  → PDF includes a summary table below the heat map: avg weekly hours, peak week, studies active

Step 4: Bring to meeting
  → Shares PDF in management meeting
  → Discusses whether one study should be reassigned or paused during peak
```

**Key UX requirements:** Heat map must be readable at a glance, click-to-drill-down must be instant, PDF export must include branding and summary table, generation must be < 5 seconds.

---

### 11.3 Design Principles

1. **Data clarity over decoration** — every pixel earns its place by communicating information. No purely decorative gradients, shadows, or animations.
2. **Scannable at a glance** — management users make decisions in 30 seconds. The most important number must be the biggest thing on the screen.
3. **Confidence-inspiring** — clinical research is high-stakes. The UI must feel precise, consistent, and trustworthy — not playful or consumer-app casual.
4. **Low-friction data entry** — staff users are logging data between patient visits. Every unnecessary click is a burden. Defaults, bulk entry, and keyboard-first forms are essential.
5. **Role-appropriate density** — management dashboards are data-dense. Staff screens are focused and task-oriented. Different information densities for different jobs.

---

### 11.4 Color System

#### Brand Palette

| Token | Hex | Tailwind | Use |
|---|---|---|---|
| `color-primary` | `#1E3A5F` | `slate-800` (custom) | Sidebar bg, primary headings |
| `color-accent` | `#0D9488` | `teal-600` | Primary CTA buttons, links, active nav |
| `color-accent-hover` | `#0F766E` | `teal-700` | Button hover states |
| `color-bg` | `#F8FAFC` | `slate-50` | App background |
| `color-surface` | `#FFFFFF` | `white` | Cards, modals, panels |
| `color-border` | `#E2E8F0` | `slate-200` | Card borders, table dividers |
| `color-text-primary` | `#0F172A` | `slate-900` | Body text, table data |
| `color-text-secondary` | `#475569` | `slate-600` | Labels, captions, subtext |
| `color-text-muted` | `#94A3B8` | `slate-400` | Placeholders, disabled text |

#### Semantic / Status Palette

| Token | Hex | Tailwind | Use |
|---|---|---|---|
| `color-success` | `#16A34A` | `green-600` | Capacity < 75%, completed status |
| `color-success-bg` | `#F0FDF4` | `green-50` | Success badge backgrounds |
| `color-warning` | `#D97706` | `amber-600` | Capacity 75–90%, paused status |
| `color-warning-bg` | `#FFFBEB` | `amber-50` | Warning badge backgrounds |
| `color-danger` | `#DC2626` | `red-600` | Capacity > 90%, errors, destructive actions |
| `color-danger-bg` | `#FEF2F2` | `red-50` | Error badge backgrounds |
| `color-info` | `#2563EB` | `blue-600` | Informational callouts |
| `color-info-bg` | `#EFF6FF` | `blue-50` | Info badge backgrounds |

#### Dark Mode
Dark mode uses Tailwind's `dark:` variant. Key mappings:
- Background: `dark:bg-slate-900`
- Surface: `dark:bg-slate-800`
- Border: `dark:border-slate-700`
- Text primary: `dark:text-slate-100`
- Text secondary: `dark:text-slate-400`
- Accent stays `teal-500` (lightened from teal-600 for contrast)

All contrast ratios verified at ≥ 4.5:1 for body text in both modes.

---

### 11.5 Typography

**Primary font:** Inter (Google Fonts, variable font)  
**Monospace font:** JetBrains Mono — used for participant IDs, protocol numbers, numeric data columns

```css
/* Tailwind font config */
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}
```

#### Type Scale

| Role | Size | Weight | Line Height | Tailwind |
|---|---|---|---|---|
| Page title | 24px | 700 | 1.25 | `text-2xl font-bold` |
| Section heading | 18px | 600 | 1.3 | `text-lg font-semibold` |
| Card title | 16px | 600 | 1.4 | `text-base font-semibold` |
| Body / table data | 14px | 400 | 1.5 | `text-sm` |
| Label / caption | 12px | 500 | 1.4 | `text-xs font-medium` |
| Stat/KPI number | 32px | 700 | 1.0 | `text-3xl font-bold tabular-nums` |
| Sub-stat | 20px | 600 | 1.0 | `text-xl font-semibold tabular-nums` |

All numeric KPI values use `font-variant-numeric: tabular-nums` to prevent layout shift as numbers update.

---

### 11.6 Spacing & Layout

**Spacing system:** 4px base unit (Tailwind default).  
Use only: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px.

**Layout structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ Top Bar (64px)  — site badge, user, sync, dark mode toggle  │
├────────────────┬────────────────────────────────────────────┤
│ Sidebar        │ Main Content Area                          │
│ (240px)        │ max-w-7xl, px-6                            │
│                │                                            │
│ nav items      │ Page title + breadcrumb (mb-6)             │
│ 48px tall each │ Content grid                               │
│                │                                            │
└────────────────┴────────────────────────────────────────────┘
```

**Sidebar:** Fixed, 240px, `bg-slate-800 text-white`. Collapses to 64px icon-only on screens < 1280px.  
**Main content:** `flex-1 overflow-auto bg-slate--50 p-6`. Max content width: `max-w-7xl mx-auto`.  
**Cards:** `bg-white rounded-lg border border-slate-200 shadow-sm p-6`.  
**Tables:** Full width, sticky header, alternating row bg (`slate-50`), horizontal dividers only.

**Responsive breakpoints:**
- `sm: 640px` — not a primary breakpoint (tool is desktop/tablet focused)
- `md: 768px` — tablet: sidebar collapses to icon rail
- `lg: 1024px` — primary desktop target
- `xl: 1280px` — optimal dashboard density

---

### 11.7 Component Patterns

#### Navigation Items (Sidebar)
```
Active:   bg-teal-600/20 text-teal-400 rounded-md
Inactive: text-slate-400 hover:bg-slate-700 hover:text-white rounded-md
Icon:     Lucide, 20px, stroke-width 1.5
Label:    text-sm font-medium ml-3
Height:   48px, px-3
```

#### Status Badges
```
Enrolling:   bg-green-50  text-green-700  border border-green-200
Paused:      bg-amber-50  text-amber-700  border border-amber-200
On Hold:     bg-red-50    text-red-700    border border-red-200
Maintenance: bg-blue-50   text-blue-700   border border-blue-200
Completed:   bg-slate-100 text-slate-600  border border-slate-200
```
Style: `text-xs font-medium px-2.5 py-0.5 rounded-full`

#### Capacity Indicators
Capacity % is shown three ways:
1. **Gauge** (circular arc) on investigator detail — Recharts RadialBarChart
2. **Progress bar** on list views — colored fill based on % threshold
3. **Heat map cell** — background color fill, % text centered

Color thresholds:
- `< 75%` → green-500 fill
- `75–89%` → amber-500 fill
- `≥ 90%` → red-500 fill

#### Data Tables
- `<thead>` sticky, `bg-white border-b border-slate-200`
- Column headers: `text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3`
- Rows: `hover:bg-slate-50 transition-colors`, height 52px
- Numeric columns: right-aligned, `font-mono tabular-nums`
- Action columns: right-aligned, icon buttons with tooltip

#### Primary Button
```
bg-teal-600 hover:bg-teal-700 text-white
font-medium text-sm px-4 py-2 rounded-md
transition-colors duration-150
disabled: opacity-50 cursor-not-allowed
loading: show spinner, disable, prevent re-submit
```

#### Destructive Button
```
bg-red-600 hover:bg-red-700 text-white
— always separated from primary actions —
confirmation modal required before execution
```

#### Forms
- All inputs: `border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500`
- Labels: above input, `text-sm font-medium text-slate-700 mb-1`
- Required: asterisk `text-red-500` after label
- Error: `text-red-600 text-xs mt-1` below field, border switches to `border-red-500`
- Helper text: `text-slate-500 text-xs mt-1`
- Select dropdowns: native `<select>` styled via Tailwind, or shadcn/ui Select for complex cases

#### Toasts
- Auto-dismiss after 4 seconds
- Success: `bg-green-50 border border-green-200 text-green-800`
- Error: `bg-red-50 border border-red-200 text-red-800`
- Position: bottom-right, `z-50`
- `aria-live="polite"` for screen reader announcement

#### Modals
- Backdrop: `bg-slate-900/50` (50% opacity)
- Panel: `bg-white rounded-xl shadow-xl max-w-lg w-full`
- Header: title + close `×` button (always present)
- Footer: cancel (ghost) + confirm (primary or destructive)
- Confirmation dialogs for: status change, study clone, import commit, user deletion

---

### 11.8 Chart Specifications

All charts use **Recharts** with K2 color tokens.

#### Capacity Utilization Bar Chart (Overview Dashboard)
- Type: `BarChart` (horizontal)
- X-axis: investigator names
- Y-axis: 0–100%
- Reference line at 75% (amber dashed) and 90% (red dashed)
- Bar fill: capacity color (green/amber/red) based on value
- Tooltip: investigator name, hours used, hours available, %
- Empty state: "No capacity data yet — log visits to populate"

#### Investigator Weekly Trend (Investigator Detail)
- Type: `LineChart`
- X-axis: last 12 weeks (ISO week labels)
- Y-axis: hours
- Two lines: actual logged hours (solid teal) + projected hours (dashed slate)
- Reference band shading: 75% and 90% capacity thresholds
- Tooltip: week, actual, projected

#### Capacity Heat Map (Capacity Dashboard)
- Implementation: custom CSS Grid (not Recharts — Recharts has no native heat map)
- Rows: investigators, Columns: weeks (next 8)
- Cell: colored background + % text centered
- Click handler: opens detail popover showing studies contributing to that cell's load

#### Enrollment Funnel (Study Detail)
- Type: Custom vertical funnel using SVG or `FunnelChart` (Recharts)
- Stages: Prescreens → Screens → Randomizations → Active → Completions
- Labels: count + conversion rate %
- Color: teal gradient darkening with each stage

#### What-If Projection (Predictive Engine)
- Type: `AreaChart` stacked
- X-axis: weeks 1–26
- Y-axis: hours
- Series per investigator, color-coded
- Reference lines: 75% and 90% capacity
- Annotation: week number where threshold is breached

#### Revenue Forecast (Phase 4)
- Type: `AreaChart` stacked
- X-axis: months (next 6)
- Y-axis: $ revenue
- One area per active study
- Tooltip: month, per-study revenue breakdown, total

---

### 11.9 Accessibility

- All interactive elements keyboard-accessible (Tab order = visual order)
- Focus rings: `focus:ring-2 focus:ring-teal-500 focus:ring-offset-2`
- Icons: `aria-hidden="true"` when paired with visible text; `aria-label` when icon-only
- Color is never the sole indicator of state — status badges always include text, capacity cells always show the % number
- All chart data has a screen-reader accessible summary or associated data table
- Contrast: minimum 4.5:1 for all body text, 3:1 for large text and UI elements, verified in both light and dark mode
- Form errors use `role="alert"` for screen reader announcement
- `prefers-reduced-motion`: all transitions/animations disabled or reduced when set

---

### 11.10 Interaction & Animation Standards

- **Micro-interactions:** 150ms, ease-out (entering), ease-in (exiting)
- **Modal open/close:** 200ms fade + scale (0.95 → 1.0 enter, 1.0 → 0.95 exit)
- **Sidebar collapse:** 200ms width transition
- **Table row hover:** 100ms background transition
- **Button press:** scale(0.98) on active, 100ms
- **Toast enter:** slide in from bottom-right, 200ms ease-out
- **Chart entrance:** animate only on mount, 400ms, respect `prefers-reduced-motion`
- **Page transitions:** none — instant navigation (SPA with React Router, no route-level animations)
- Never animate: width/height layout properties, font-size, border-radius changes that cause reflow

---

### 11.11 shadcn/ui Component Usage

Install and use these shadcn/ui components (customized with K2 tokens):

| Component | Use |
|---|---|
| `Button` | All CTAs — configure with K2 teal as primary variant |
| `Table` | All data tables |
| `Dialog` | Modals and confirmation dialogs |
| `Select` | Complex dropdowns (study selector, investigator selector) |
| `Tabs` | Study detail tabs, dashboard tab groups |
| `Badge` | Status badges |
| `Tooltip` | Icon-only button labels, chart data points |
| `Toast` (Sonner) | All success/error feedback |
| `Popover` | Heat map cell drill-down |
| `Skeleton` | Loading states for charts and tables |
| `Sheet` | Mobile sidebar (slides in from left) |
| `Progress` | Enrollment progress bars, capacity progress bars |
| `Input` | All text inputs |
| `Label` | Form field labels |
| `Checkbox` | Bulk selection in tables |

---

## 12. Verification Plan

**Phase 1:**
- [ ] Login as management → full nav visible, Tampa scoped
- [ ] Login as staff → restricted nav, no financials
- [ ] All legacy entries visible and correctly attributed
- [ ] Site selector shows Tampa active, other sites locked
- [ ] Create a new staff user from Settings → they can log in

**Phase 2:**
- [ ] Add a study, toggle status, assign investigators
- [ ] Upload a protocol PDF → SoA table extracted, review UI editable
- [ ] Log a visit as staff → appears in management view
- [ ] Delegation log imported from Advarra CSV → correct mapping
- [ ] Visit completion tracker shows correct scheduled/missed/no-show %

**Phase 3:**
- [ ] Overview dashboard shows correct capacity % for each investigator
- [ ] Capacity heat map updates when visits are logged
- [ ] Study ROI card shows hours spent vs. placeholder contract value

**Phase 4:**
- [ ] What-if: add hypothetical study → projected impact shown per investigator per week
- [ ] Staffing gap alert fires when projected load exceeds 90%
- [ ] Enrollment predictor updates as new randomizations are logged

**Phase 5:**
- [ ] Upload CC CSV → mapping UI → preview → import with deduplication
- [ ] Upload Advarra eReg CSV → delegation log populated
- [ ] Re-import → duplicates skipped, changed records updated
