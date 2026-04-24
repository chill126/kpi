# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server
npm run build        # tsc + vite build
npm run test         # Vitest (watch mode)
npm run lint         # tsc --noEmit (type-check only — no ESLint)
npm run migrate      # Run Firestore migration script

# Run a single test file
npx vitest run src/path/to/test.test.tsx

# Vitest interactive UI
npm run test:ui
```

Firebase config is read from `.env.local` — all variables use the `VITE_FIREBASE_` prefix.

## Architecture

**K2 Medical Research KPI Tracker** — clinical site resource management tool built with React 18 + Vite + TypeScript + Tailwind + Firebase + Recharts. The Anthropic SDK (`@anthropic-ai/sdk`) powers AI-assisted protocol parsing.

### Auth & Site Context

Two global contexts wrap the entire app:

- `context/AuthContext.tsx` — Firebase Auth listener. Resolves `AppUser` (includes `role: 'management' | 'staff'`, `siteId`, `assignedStudies`) from Firestore on login. No self-registration; management creates accounts in Settings.
- `context/SiteContext.tsx` — holds the active `siteId` (defaults to `'tampa'`). `SiteSync` component syncs it to `user.siteId` after login.

`hooks/useAuth.ts` and `hooks/useSite.ts` are thin re-exports of these contexts — import from the hooks, not the context files directly.

### Data Access Pattern

All Firestore access flows: `lib/` subscription function → custom hook → component.

`lib/firestore.ts` provides query builders used by every lib function:
- `col(name)` — typed collection ref
- `withSite(collection, siteId)` — all queries are site-scoped
- `withSiteAndInvestigator(collection, siteId, investigatorId)`

Hook pattern (representative):
```ts
// hooks/useStudies.ts
export function useStudies() {
  const { siteId } = useSite()
  const [studies, setStudies] = useState<Study[]>([])
  useEffect(() => {
    return subscribeStudies(siteId, setStudies, setError)  // returns unsubscribe
  }, [siteId])
}
```

Every hook subscribes via a real-time Firestore listener and returns `{ data, loading, error }`. Cleanup is handled by returning the `unsubscribe` function from `useEffect`.

### Routing & Role Gating

- `router/PrivateRoute.tsx` — redirects unauthenticated users to `/login`
- `router/RoleRoute.tsx` — gates management-only views; staff see a subset

Pages split strictly by role:
- `pages/management/` — Overview, Studies, StudyDetail, Investigators, Enrollment, Financial, Forecast, WhatIf, WorkloadPlanner, Operations, Deviations, Reports, Import, Settings
- `pages/staff/` — MyDashboard, MyStudies, DataEntry, MyProfile

### Component Organization

```
components/
  ui/              # shadcn/ui primitives — do not modify
  shared/          # Cross-cutting: ConfirmDialog, PageLoader, SyncIndicator
  studies/         # Study list, filters, form, clone, comparison, status toggle
  study-detail/    # Tabs: Enrollment, Investigators, VisitSchedule, AssessmentBattery, Contract
  workload/        # Visit log forms, bulk log, assessment log, completion tracker
  enrollment/      # Screen failure form/table, burndown chart
  financial/       # Revenue forecast chart
  management/      # Capacity alert summary
  protocol-parser/ # Protocol upload + review table (AI-assisted)
```

### Key Domain Concepts

- **Investigator capacity** — each investigator has `weeklyCapacityHours` and `siteBaselinePct`. Workload is computed from visit logs and study assignments.
- **Visit schedule** — `VisitScheduleEntry[]` on each Study records time per visit per role. Drives capacity forecasting.
- **Protocol parser** — `lib/protocolParser.ts` + `lib/scaleDefaults.ts` parse Schedule of Assessments uploads (PDF/CSV) using the Anthropic SDK to extract visit structure.
- **Forecasting** — `lib/forecast.ts` + `lib/forecast-config.ts` project capacity and revenue forward. `pages/management/Forecast.tsx` and `WhatIf.tsx` consume these.
- **Import pipeline** — `pages/management/Import.tsx` + `lib/imports.ts` handle Clinical Conductor CSV and Advarra eReg delegation log ingestion.
- **Screen failures** — tracked per study with categorized reasons (`SCREEN_FAILURE_CATEGORIES` in `types/index.ts`).
- **Enrollment snapshots** — time-series enrollment data stored in `enrollmentSnapshots` collection for burndown charts.

### Types

All shared types live in `src/types/index.ts`. Key interfaces: `AppUser`, `Site`, `Investigator`, `Study`, `StudyInvestigator`, `VisitScheduleEntry`, `EnrollmentData`, `ScreenFailure`, `EnrollmentSnapshot`.

### Testing

Tests live in `__tests__/` subdirectories colocated with the code they test. Mock pattern:
```ts
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, role: null, loading: false })),
}))
```

Firestore and Firebase Auth are always mocked in tests — never hit live services.

### Path Alias

`@/` maps to `src/`. Use this for all internal imports.
