# Phase 3: Management Dashboards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build five management dashboard views — Overview, Investigators, Workload Planner (capacity heat map), Financial (study ROI), and Reports (utilization + CSV export) — backed by a capacity computation engine that aggregates logged visit and assessment hours against investigator capacity.

**Architecture:** A pure-function capacity engine (`src/lib/capacity.ts`) computes per-investigator, per-week utilization from `Visit` and `Assessment` records. Two new site-scoped Firestore subscriptions feed matching hooks that fetch all site data at once. Management pages replace existing stubs with live Recharts visualizations and computed summaries. No new Firestore collections are required.

**Tech Stack:** Recharts 2.x (BarChart, LineChart), existing Firebase Firestore, existing React hooks pattern (`onSnapshot` → `useState` + `useEffect`), Tailwind CSS v4, shadcn/ui, Vitest + React Testing Library.

---

## File Map

**New lib:**
- `src/lib/capacity.ts` — week boundary helpers + utilization computation (pure functions, fully testable)

**Modified lib (additive only):**
- `src/lib/visits.ts` — add `subscribeSiteVisits`
- `src/lib/assessments.ts` — add `subscribeSiteAssessments`

**New hooks:**
- `src/hooks/useSiteVisits.ts`
- `src/hooks/useSiteAssessments.ts`

**New test files:**
- `src/lib/__tests__/siteSubscriptions.test.ts`
- `src/lib/__tests__/capacity.test.ts`
- `src/hooks/__tests__/useSiteData.test.tsx`
- `src/pages/management/__tests__/Overview.test.tsx`
- `src/pages/management/__tests__/Investigators.test.tsx`
- `src/pages/management/__tests__/WorkloadPlanner.test.tsx`
- `src/pages/management/__tests__/Financial.test.tsx`
- `src/pages/management/__tests__/Reports.test.tsx`

**Modified pages (replace stubs):**
- `src/pages/management/Overview.tsx`
- `src/pages/management/Investigators.tsx`
- `src/pages/management/WorkloadPlanner.tsx`
- `src/pages/management/Financial.tsx`
- `src/pages/management/Reports.tsx`

---

## Task 1: Install Recharts + Site-Level Firestore Subscriptions

**Files:**
- Run: `npm install recharts`
- Modify: `src/lib/visits.ts` (add `subscribeSiteVisits`)
- Modify: `src/lib/assessments.ts` (add `subscribeSiteAssessments`)
- Create: `src/lib/__tests__/siteSubscriptions.test.ts`

- [ ] **Step 1: Install Recharts**

```bash
npm install recharts
```

Expected: `recharts` appears in `package.json` dependencies.

- [ ] **Step 2: Write the failing tests**

Create `src/lib/__tests__/siteSubscriptions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { subscribeSiteVisits } from '@/lib/visits'
import { subscribeSiteAssessments } from '@/lib/assessments'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col-ref'),
  doc: vi.fn(() => 'doc-ref'),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(() => 'query-ref'),
  where: vi.fn(),
  orderBy: vi.fn(),
  arrayUnion: vi.fn((val) => ({ __arrayUnion: val })),
  writeBatch: vi.fn(() => ({ set: vi.fn(), commit: vi.fn() })),
}))
vi.mock('@/lib/firebase', () => ({ db: {} }))

import * as firestore from 'firebase/firestore'

const mockVisit = {
  participantId: 'P001', studyId: 'study-1', investigatorId: 'inv-1', siteId: 'tampa',
  visitType: 'Screening', scheduledDate: '2026-04-14', completedDate: '2026-04-14',
  status: 'completed' as const, durationMinutes: 45, actualDurationMinutes: 50, source: 'manual' as const,
}

const mockAssessment = {
  investigatorId: 'inv-1', studyId: 'study-1', siteId: 'tampa',
  visitId: null, scaleType: 'HAMD-17', durationMinutes: 20, date: '2026-04-14',
}

beforeEach(() => vi.clearAllMocks())

describe('subscribeSiteVisits', () => {
  it('subscribes to all site visits and maps data', () => {
    const onData = vi.fn()
    const onError = vi.fn()
    vi.mocked(firestore.onSnapshot).mockImplementation((_q, onNext: any) => {
      onNext({ docs: [{ id: 'v-1', data: () => ({ ...mockVisit }) }] })
      return () => {}
    })

    subscribeSiteVisits('tampa', onData, onError)

    expect(firestore.where).toHaveBeenCalledWith('siteId', '==', 'tampa')
    expect(onData).toHaveBeenCalledWith([{ id: 'v-1', ...mockVisit }])
  })
})

describe('subscribeSiteAssessments', () => {
  it('subscribes to all site assessments and maps data', () => {
    const onData = vi.fn()
    const onError = vi.fn()
    vi.mocked(firestore.onSnapshot).mockImplementation((_q, onNext: any) => {
      onNext({ docs: [{ id: 'a-1', data: () => ({ ...mockAssessment }) }] })
      return () => {}
    })

    subscribeSiteAssessments('tampa', onData, onError)

    expect(firestore.where).toHaveBeenCalledWith('siteId', '==', 'tampa')
    expect(onData).toHaveBeenCalledWith([{ id: 'a-1', ...mockAssessment }])
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- siteSubscriptions.test
```
Expected: FAIL (functions not exported yet).

- [ ] **Step 4: Add `subscribeSiteVisits` to `src/lib/visits.ts`**

Append after the existing `subscribeInvestigatorVisits` function:

```typescript
export function subscribeSiteVisits(
  siteId: string,
  onData: (visits: Visit[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'visits'),
    where('siteId', '==', siteId),
    orderBy('scheduledDate', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toVisit(d.id, d.data()))),
    onError,
  )
}
```

- [ ] **Step 5: Add `subscribeSiteAssessments` to `src/lib/assessments.ts`**

Append after the existing `subscribeStudyAssessments` function:

```typescript
export function subscribeSiteAssessments(
  siteId: string,
  onData: (assessments: Assessment[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'assessments'),
    where('siteId', '==', siteId),
    orderBy('date', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toAssessment(d.id, d.data()))),
    onError,
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test -- siteSubscriptions.test
```
Expected: 2 tests pass.

- [ ] **Step 7: Run full suite**

```bash
npm test
```
Expected: all 56 tests still pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/visits.ts src/lib/assessments.ts src/lib/__tests__/siteSubscriptions.test.ts package.json package-lock.json
git commit -m "feat: add Recharts, subscribeSiteVisits, subscribeSiteAssessments"
```

---

## Task 2: Capacity Computation Utilities

**Files:**
- Create: `src/lib/capacity.ts`
- Create: `src/lib/__tests__/capacity.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/capacity.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  getWeekStart,
  getWeekEnd,
  recentWeekStarts,
  computeWeekMetrics,
  computeWeekHistory,
  utilizationColor,
  utilizationCellColor,
} from '@/lib/capacity'
import type { Visit, Assessment } from '@/types'

function makeVisit(overrides: Partial<Omit<Visit, 'id'>> & { id: string }): Visit {
  return {
    participantId: 'P001', studyId: 'study-1', investigatorId: 'inv-1', siteId: 'tampa',
    visitType: 'Screening', scheduledDate: '2026-04-14', completedDate: '2026-04-14',
    status: 'completed', durationMinutes: 60, actualDurationMinutes: null, source: 'manual',
    ...overrides,
  }
}

function makeAssessment(overrides: Partial<Omit<Assessment, 'id'>> & { id: string }): Assessment {
  return {
    investigatorId: 'inv-1', studyId: 'study-1', siteId: 'tampa',
    visitId: null, scaleType: 'HAMD-17', durationMinutes: 20, date: '2026-04-14',
    ...overrides,
  }
}

// 2026-04-13 is a Monday; 2026-04-14 is a Tuesday; 2026-04-19 is a Sunday; 2026-04-20 is a Monday
describe('getWeekStart', () => {
  it('returns the Monday for a Tuesday', () => {
    expect(getWeekStart(new Date('2026-04-14T12:00:00Z'))).toBe('2026-04-13')
  })

  it('returns Monday when given a Monday', () => {
    expect(getWeekStart(new Date('2026-04-13T00:00:00Z'))).toBe('2026-04-13')
  })

  it('returns preceding Monday for a Sunday', () => {
    expect(getWeekStart(new Date('2026-04-19T23:59:59Z'))).toBe('2026-04-13')
  })
})

describe('getWeekEnd', () => {
  it('returns the Sunday for a given Monday', () => {
    expect(getWeekEnd('2026-04-13')).toBe('2026-04-19')
  })
})

describe('recentWeekStarts', () => {
  it('returns the correct number of Monday dates', () => {
    const weeks = recentWeekStarts(12)
    expect(weeks).toHaveLength(12)
  })

  it('every entry is a Monday (UTCDay === 1)', () => {
    recentWeekStarts(8).forEach((w) => {
      expect(new Date(w + 'T00:00:00Z').getUTCDay()).toBe(1)
    })
  })

  it('weeks are ordered newest first', () => {
    const [first, second] = recentWeekStarts(2)
    expect(first >= second).toBe(true)
  })
})

describe('computeWeekMetrics', () => {
  it('sums only completed visits using actualDurationMinutes when present', () => {
    const visits = [
      makeVisit({ id: 'v-1', scheduledDate: '2026-04-14', status: 'completed', durationMinutes: 60, actualDurationMinutes: 45 }),
      makeVisit({ id: 'v-2', scheduledDate: '2026-04-14', status: 'missed', durationMinutes: 30, actualDurationMinutes: null }),
    ]
    const metrics = computeWeekMetrics('inv-1', 2400, visits, [], '2026-04-13')
    expect(metrics.visitMinutes).toBe(45)
    expect(metrics.assessmentMinutes).toBe(0)
    expect(metrics.totalMinutes).toBe(45)
  })

  it('falls back to durationMinutes when actualDurationMinutes is null', () => {
    const visits = [
      makeVisit({ id: 'v-1', scheduledDate: '2026-04-14', status: 'completed', durationMinutes: 60, actualDurationMinutes: null }),
    ]
    const metrics = computeWeekMetrics('inv-1', 2400, visits, [], '2026-04-13')
    expect(metrics.visitMinutes).toBe(60)
  })

  it('sums assessment minutes', () => {
    const assessments = [
      makeAssessment({ id: 'a-1', date: '2026-04-15', durationMinutes: 20 }),
      makeAssessment({ id: 'a-2', date: '2026-04-17', durationMinutes: 30 }),
    ]
    const metrics = computeWeekMetrics('inv-1', 2400, [], assessments, '2026-04-13')
    expect(metrics.assessmentMinutes).toBe(50)
  })

  it('excludes visits outside the week', () => {
    const visits = [
      makeVisit({ id: 'v-1', scheduledDate: '2026-04-06', status: 'completed', durationMinutes: 60, actualDurationMinutes: null }),
    ]
    const metrics = computeWeekMetrics('inv-1', 2400, visits, [], '2026-04-13')
    expect(metrics.visitMinutes).toBe(0)
  })

  it('excludes visits for a different investigator', () => {
    const visits = [
      makeVisit({ id: 'v-1', scheduledDate: '2026-04-14', investigatorId: 'inv-2', status: 'completed', durationMinutes: 60, actualDurationMinutes: null }),
    ]
    const metrics = computeWeekMetrics('inv-1', 2400, visits, [], '2026-04-13')
    expect(metrics.visitMinutes).toBe(0)
  })

  it('computes utilizationPct correctly', () => {
    const visits = [
      makeVisit({ id: 'v-1', scheduledDate: '2026-04-14', status: 'completed', durationMinutes: 120, actualDurationMinutes: null }),
    ]
    // 120 minutes / 2400 minutes capacity = 5%
    const metrics = computeWeekMetrics('inv-1', 2400, visits, [], '2026-04-13')
    expect(metrics.utilizationPct).toBe(5)
  })

  it('returns 0 utilization when capacity is 0', () => {
    const visits = [makeVisit({ id: 'v-1', scheduledDate: '2026-04-14', status: 'completed', durationMinutes: 60, actualDurationMinutes: null })]
    const metrics = computeWeekMetrics('inv-1', 0, visits, [], '2026-04-13')
    expect(metrics.utilizationPct).toBe(0)
  })
})

describe('computeWeekHistory', () => {
  it('returns the correct number of weeks', () => {
    expect(computeWeekHistory('inv-1', 2400, [], [], 12)).toHaveLength(12)
  })
})

describe('utilizationColor', () => {
  it('returns green for < 75%', () => {
    expect(utilizationColor(50)).toContain('green')
  })

  it('returns amber for 75–89%', () => {
    expect(utilizationColor(80)).toContain('amber')
  })

  it('returns red for >= 90%', () => {
    expect(utilizationColor(95)).toContain('red')
  })
})

describe('utilizationCellColor', () => {
  it('returns slate for 0%', () => {
    expect(utilizationCellColor(0)).toContain('slate')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- capacity.test
```
Expected: FAIL.

- [ ] **Step 3: Create `src/lib/capacity.ts`**

```typescript
import type { Visit, Assessment } from '@/types'

export interface WeekMetrics {
  weekStart: string
  visitMinutes: number
  assessmentMinutes: number
  totalMinutes: number
  capacityMinutes: number
  utilizationPct: number
}

/** Returns ISO date (YYYY-MM-DD) of the Monday for the week containing `date`. */
export function getWeekStart(date: Date): string {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  const day = d.getUTCDay() // 0=Sun, 1=Mon … 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

/** Returns ISO date of the Sunday ending the week that starts on `weekStartIso`. */
export function getWeekEnd(weekStartIso: string): string {
  const d = new Date(weekStartIso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 6)
  return d.toISOString().split('T')[0]
}

/** Returns ISO date strings for the Monday of each of the last `numWeeks` weeks, newest first. */
export function recentWeekStarts(numWeeks: number): string[] {
  const now = new Date()
  return Array.from({ length: numWeeks }, (_, i) => {
    const d = new Date(now)
    d.setUTCDate(now.getUTCDate() - i * 7)
    return getWeekStart(d)
  })
}

function inWeek(dateIso: string, weekStartIso: string): boolean {
  return dateIso >= weekStartIso && dateIso <= getWeekEnd(weekStartIso)
}

export function computeWeekMetrics(
  investigatorId: string,
  capacityMinutes: number,
  visits: Visit[],
  assessments: Assessment[],
  weekStartIso: string,
): WeekMetrics {
  const visitMinutes = visits
    .filter(
      (v) =>
        v.investigatorId === investigatorId &&
        v.status === 'completed' &&
        inWeek(v.scheduledDate, weekStartIso),
    )
    .reduce((sum, v) => sum + (v.actualDurationMinutes ?? v.durationMinutes), 0)

  const assessmentMinutes = assessments
    .filter((a) => a.investigatorId === investigatorId && inWeek(a.date, weekStartIso))
    .reduce((sum, a) => sum + a.durationMinutes, 0)

  const totalMinutes = visitMinutes + assessmentMinutes
  const utilizationPct =
    capacityMinutes > 0 ? Math.round((totalMinutes / capacityMinutes) * 100) : 0

  return { weekStart: weekStartIso, visitMinutes, assessmentMinutes, totalMinutes, capacityMinutes, utilizationPct }
}

export function computeWeekHistory(
  investigatorId: string,
  capacityMinutes: number,
  visits: Visit[],
  assessments: Assessment[],
  numWeeks: number,
): WeekMetrics[] {
  return recentWeekStarts(numWeeks).map((weekStart) =>
    computeWeekMetrics(investigatorId, capacityMinutes, visits, assessments, weekStart),
  )
}

export function utilizationColor(pct: number): string {
  if (pct < 75) return 'text-green-600 dark:text-green-400'
  if (pct < 90) return 'text-amber-500 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

export function utilizationBarColor(pct: number): string {
  if (pct < 75) return '#16a34a'
  if (pct < 90) return '#f59e0b'
  return '#dc2626'
}

export function utilizationCellColor(pct: number): string {
  if (pct === 0) return 'bg-slate-50 dark:bg-slate-800/50 text-slate-400'
  if (pct < 75) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
  if (pct < 90) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
  return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- capacity.test
```
Expected: 12 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/capacity.ts src/lib/__tests__/capacity.test.ts
git commit -m "feat: add capacity computation utilities with week boundary helpers"
```

---

## Task 3: useSiteVisits + useSiteAssessments Hooks

**Files:**
- Create: `src/hooks/useSiteVisits.ts`
- Create: `src/hooks/useSiteAssessments.ts`
- Create: `src/hooks/__tests__/useSiteData.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/__tests__/useSiteData.test.tsx`:

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'

vi.mock('@/lib/visits', () => ({ subscribeSiteVisits: vi.fn() }))
vi.mock('@/lib/assessments', () => ({ subscribeSiteAssessments: vi.fn() }))
vi.mock('@/hooks/useSite', () => ({ useSite: vi.fn() }))

import * as visitsLib from '@/lib/visits'
import * as assessmentsLib from '@/lib/assessments'
import * as useSiteModule from '@/hooks/useSite'

const mockVisit = {
  id: 'v-1', participantId: 'P001', studyId: 'study-1', investigatorId: 'inv-1', siteId: 'tampa',
  visitType: 'Screening', scheduledDate: '2026-04-14', completedDate: '2026-04-14',
  status: 'completed' as const, durationMinutes: 45, actualDurationMinutes: null, source: 'manual' as const,
}

const mockAssessment = {
  id: 'a-1', investigatorId: 'inv-1', studyId: 'study-1', siteId: 'tampa',
  visitId: null, scaleType: 'HAMD-17', durationMinutes: 20, date: '2026-04-14',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useSiteModule.useSite).mockReturnValue({ siteId: 'tampa', setActiveSite: vi.fn() })
})

describe('useSiteVisits', () => {
  it('starts loading with empty visits', () => {
    vi.mocked(visitsLib.subscribeSiteVisits).mockImplementation(() => () => {})
    const { result } = renderHook(() => useSiteVisits())
    expect(result.current.loading).toBe(true)
    expect(result.current.visits).toEqual([])
  })

  it('sets visits when data arrives', async () => {
    vi.mocked(visitsLib.subscribeSiteVisits).mockImplementation((_siteId, onData) => {
      onData([mockVisit])
      return () => {}
    })
    const { result } = renderHook(() => useSiteVisits())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.visits).toEqual([mockVisit])
  })

  it('sets error when subscription fails', async () => {
    vi.mocked(visitsLib.subscribeSiteVisits).mockImplementation((_siteId, _onData, onError) => {
      onError(new Error('permission denied'))
      return () => {}
    })
    const { result } = renderHook(() => useSiteVisits())
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.error?.message).toBe('permission denied')
  })
})

describe('useSiteAssessments', () => {
  it('starts loading with empty assessments', () => {
    vi.mocked(assessmentsLib.subscribeSiteAssessments).mockImplementation(() => () => {})
    const { result } = renderHook(() => useSiteAssessments())
    expect(result.current.loading).toBe(true)
    expect(result.current.assessments).toEqual([])
  })

  it('sets assessments when data arrives', async () => {
    vi.mocked(assessmentsLib.subscribeSiteAssessments).mockImplementation((_siteId, onData) => {
      onData([mockAssessment])
      return () => {}
    })
    const { result } = renderHook(() => useSiteAssessments())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.assessments).toEqual([mockAssessment])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- useSiteData.test
```
Expected: FAIL.

- [ ] **Step 3: Create `src/hooks/useSiteVisits.ts`**

```typescript
import { useEffect, useState } from 'react'
import { subscribeSiteVisits } from '@/lib/visits'
import { useSite } from '@/hooks/useSite'
import type { Visit } from '@/types'

export function useSiteVisits(): { visits: Visit[]; loading: boolean; error: Error | null } {
  const { siteId } = useSite()
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeSiteVisits(
      siteId,
      (data) => { setVisits(data); setLoading(false) },
      (err) => { setError(err); setLoading(false) },
    )
    return unsubscribe
  }, [siteId])

  return { visits, loading, error }
}
```

- [ ] **Step 4: Create `src/hooks/useSiteAssessments.ts`**

```typescript
import { useEffect, useState } from 'react'
import { subscribeSiteAssessments } from '@/lib/assessments'
import { useSite } from '@/hooks/useSite'
import type { Assessment } from '@/types'

export function useSiteAssessments(): { assessments: Assessment[]; loading: boolean; error: Error | null } {
  const { siteId } = useSite()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeSiteAssessments(
      siteId,
      (data) => { setAssessments(data); setLoading(false) },
      (err) => { setError(err); setLoading(false) },
    )
    return unsubscribe
  }, [siteId])

  return { assessments, loading, error }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- useSiteData.test
```
Expected: 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useSiteVisits.ts src/hooks/useSiteAssessments.ts src/hooks/__tests__/useSiteData.test.tsx
git commit -m "feat: add useSiteVisits and useSiteAssessments hooks"
```

---

## Task 4: Overview Dashboard Page

**Files:**
- Modify: `src/pages/management/Overview.tsx` (replace stub)
- Create: `src/pages/management/__tests__/Overview.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/management/__tests__/Overview.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Overview } from '@/pages/management/Overview'

vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => null,
}))

vi.mock('@/hooks/useStudies', () => ({ useStudies: vi.fn() }))
vi.mock('@/hooks/useInvestigators', () => ({ useInvestigators: vi.fn() }))
vi.mock('@/hooks/useSiteVisits', () => ({ useSiteVisits: vi.fn() }))
vi.mock('@/hooks/useSiteAssessments', () => ({ useSiteAssessments: vi.fn() }))

import * as studiesModule from '@/hooks/useStudies'
import * as investigatorsModule from '@/hooks/useInvestigators'
import * as siteVisitsModule from '@/hooks/useSiteVisits'
import * as siteAssessmentsModule from '@/hooks/useSiteAssessments'
import type { Study, Investigator, Visit } from '@/types'

const mockStudy: Study = {
  id: 'study-1', name: 'Study Alpha', sponsor: 'P', sponsorProtocolId: '',
  therapeuticArea: 'Psychiatry', phase: 'Phase II', status: 'enrolling',
  siteId: 'tampa', piId: 'inv-1', assignedInvestigators: [{ investigatorId: 'inv-1', role: 'PI' }],
  targetEnrollment: 20, startDate: '', expectedEndDate: '',
  visitSchedule: [], assessmentBattery: {},
  adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
  parsedFromProtocol: false,
  enrollmentData: { prescreens: 5, screens: 3, randomizations: 2, active: 2, completions: 0 },
  statusHistory: [],
}

const mockInvestigator: Investigator = {
  id: 'inv-1', name: 'Dr. Wilson', credentials: 'MD', role: 'PI',
  siteId: 'tampa', weeklyCapacityHours: 40, siteBaselinePct: 15, assignedStudies: ['study-1'],
}

const today = new Date().toISOString().split('T')[0]

const mockVisit: Visit = {
  id: 'v-1', participantId: 'P001', studyId: 'study-1', investigatorId: 'inv-1', siteId: 'tampa',
  visitType: 'Screening', scheduledDate: today, completedDate: today,
  status: 'completed', durationMinutes: 60, actualDurationMinutes: null, source: 'manual',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(studiesModule.useStudies).mockReturnValue({ studies: [mockStudy], loading: false, error: null })
  vi.mocked(investigatorsModule.useInvestigators).mockReturnValue({ investigators: [mockInvestigator], loading: false, error: null })
  vi.mocked(siteVisitsModule.useSiteVisits).mockReturnValue({ visits: [mockVisit], loading: false, error: null })
  vi.mocked(siteAssessmentsModule.useSiteAssessments).mockReturnValue({ assessments: [], loading: false, error: null })
})

describe('Overview', () => {
  it('renders the page heading', () => {
    render(<Overview />)
    expect(screen.getByRole('heading', { name: /overview/i })).toBeInTheDocument()
  })

  it('renders active studies count card', () => {
    render(<Overview />)
    expect(screen.getByText(/active studies/i)).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders investigator utilization section', () => {
    render(<Overview />)
    expect(screen.getByText(/investigator utilization/i)).toBeInTheDocument()
    expect(screen.getByText('Dr. Wilson')).toBeInTheDocument()
  })

  it('renders enrollment summary section', () => {
    render(<Overview />)
    expect(screen.getByText(/enrollment/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- Overview.test
```
Expected: FAIL.

- [ ] **Step 3: Replace `src/pages/management/Overview.tsx`**

```typescript
import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useStudies } from '@/hooks/useStudies'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { getWeekStart, computeWeekMetrics, utilizationColor, utilizationBarColor } from '@/lib/capacity'
import { Skeleton } from '@/components/ui/skeleton'

export function Overview() {
  const { studies, loading: studiesLoading } = useStudies()
  const { investigators, loading: invLoading } = useInvestigators()
  const { visits } = useSiteVisits()
  const { assessments } = useSiteAssessments()

  const loading = studiesLoading || invLoading

  const currentWeekStart = getWeekStart(new Date())

  const activeStudies = useMemo(
    () => studies.filter((s) => s.status === 'enrolling' || s.status === 'maintenance'),
    [studies],
  )

  const utilizationData = useMemo(
    () =>
      investigators.map((inv) => {
        const m = computeWeekMetrics(
          inv.id,
          inv.weeklyCapacityHours * 60,
          visits,
          assessments,
          currentWeekStart,
        )
        return {
          name: inv.name,
          utilization: m.utilizationPct,
          fill: utilizationBarColor(m.utilizationPct),
          totalHours: +(m.totalMinutes / 60).toFixed(1),
          capacityHours: inv.weeklyCapacityHours,
        }
      }),
    [investigators, visits, assessments, currentWeekStart],
  )

  const siteCapacityPct = useMemo(() => {
    if (utilizationData.length === 0) return 0
    const avg = utilizationData.reduce((sum, d) => sum + d.utilization, 0) / utilizationData.length
    return Math.round(avg)
  }, [utilizationData])

  const enrollmentData = useMemo(
    () =>
      activeStudies.map((s) => ({
        name: s.name.length > 20 ? s.name.slice(0, 18) + '…' : s.name,
        enrolled: s.enrollmentData?.randomizations ?? 0,
        target: s.targetEnrollment,
      })),
    [activeStudies],
  )

  const alerts = useMemo(() => {
    const result: string[] = []
    utilizationData.forEach((d) => {
      if (d.utilization >= 90) result.push(`${d.name} is at ${d.utilization}% capacity this week`)
      else if (d.utilization >= 75) result.push(`${d.name} is approaching capacity (${d.utilization}%)`)
    })
    return result
  }, [utilizationData])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => <Skeleton key={n} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Overview</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Site capacity and workload summary for the current week.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Site Capacity Used</p>
          <p className={`text-3xl font-bold tabular-nums mt-1 ${utilizationColor(siteCapacityPct)}`}>
            {siteCapacityPct}%
          </p>
          <p className="text-xs text-slate-400 mt-0.5">avg across all investigators this week</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Active Studies</p>
          <p className="text-3xl font-bold tabular-nums mt-1 text-slate-800 dark:text-slate-100">
            {activeStudies.length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">enrolling or in maintenance</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Investigators</p>
          <p className="text-3xl font-bold tabular-nums mt-1 text-slate-800 dark:text-slate-100">
            {investigators.length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">active at this site</p>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-2 text-sm text-amber-800 dark:text-amber-300"
            >
              <span className="font-medium">⚠</span>
              {alert}
            </div>
          ))}
        </div>
      )}

      {/* Investigator Utilization Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
          Investigator Utilization — This Week
        </h2>
        {utilizationData.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No investigators found.</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={utilizationData} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number, _name: string, props: { payload?: { totalHours: number; capacityHours: number } }) => [
                  `${value}% (${props.payload?.totalHours ?? 0}h / ${props.payload?.capacityHours ?? 0}h)`,
                  'Utilization',
                ]}
              />
              <Bar dataKey="utilization" radius={[4, 4, 0, 0]}>
                {utilizationData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Enrollment Summary Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
          Enrollment Summary — Active Studies
        </h2>
        {enrollmentData.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No active studies.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={enrollmentData} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="target" name="Target" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="enrolled" name="Enrolled" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- Overview.test
```
Expected: 4 tests pass.

- [ ] **Step 5: Run full suite**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/management/Overview.tsx src/pages/management/__tests__/Overview.test.tsx
git commit -m "feat: implement Overview dashboard with capacity cards, utilization chart, enrollment summary"
```

---

## Task 5: Investigators Page

**Files:**
- Modify: `src/pages/management/Investigators.tsx` (replace stub)
- Create: `src/pages/management/__tests__/Investigators.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/management/__tests__/Investigators.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Investigators } from '@/pages/management/Investigators'

vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/hooks/useInvestigators', () => ({ useInvestigators: vi.fn() }))
vi.mock('@/hooks/useSiteVisits', () => ({ useSiteVisits: vi.fn() }))
vi.mock('@/hooks/useSiteAssessments', () => ({ useSiteAssessments: vi.fn() }))
vi.mock('@/hooks/useStudies', () => ({ useStudies: vi.fn() }))

import * as investigatorsModule from '@/hooks/useInvestigators'
import * as siteVisitsModule from '@/hooks/useSiteVisits'
import * as siteAssessmentsModule from '@/hooks/useSiteAssessments'
import * as studiesModule from '@/hooks/useStudies'
import type { Investigator } from '@/types'

const mockInvestigator: Investigator = {
  id: 'inv-1', name: 'Dr. Wilson', credentials: 'MD', role: 'PI',
  siteId: 'tampa', weeklyCapacityHours: 40, siteBaselinePct: 15, assignedStudies: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(investigatorsModule.useInvestigators).mockReturnValue({ investigators: [mockInvestigator], loading: false, error: null })
  vi.mocked(siteVisitsModule.useSiteVisits).mockReturnValue({ visits: [], loading: false, error: null })
  vi.mocked(siteAssessmentsModule.useSiteAssessments).mockReturnValue({ assessments: [], loading: false, error: null })
  vi.mocked(studiesModule.useStudies).mockReturnValue({ studies: [], loading: false, error: null })
})

describe('Investigators', () => {
  it('renders the page heading', () => {
    render(<Investigators />)
    expect(screen.getByRole('heading', { name: /investigators/i })).toBeInTheDocument()
  })

  it('renders each investigator name', () => {
    render(<Investigators />)
    expect(screen.getByText('Dr. Wilson')).toBeInTheDocument()
  })

  it('shows utilization percentage', () => {
    render(<Investigators />)
    expect(screen.getByText(/0%/)).toBeInTheDocument()
  })

  it('expands detail view when investigator row is clicked', async () => {
    render(<Investigators />)
    await userEvent.click(screen.getByText('Dr. Wilson'))
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- Investigators.test
```
Expected: FAIL.

- [ ] **Step 3: Replace `src/pages/management/Investigators.tsx`**

```typescript
import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { useStudies } from '@/hooks/useStudies'
import {
  getWeekStart,
  computeWeekMetrics,
  computeWeekHistory,
  utilizationColor,
  utilizationBarColor,
} from '@/lib/capacity'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { Investigator, Study } from '@/types'

function CapacityBar({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${capped}%`, backgroundColor: utilizationBarColor(pct) }}
        />
      </div>
      <span className={`text-xs font-semibold tabular-nums w-10 text-right ${utilizationColor(pct)}`}>
        {pct}%
      </span>
    </div>
  )
}

function InvestigatorDetail({
  investigator,
  visits,
  assessments,
  studies,
}: {
  investigator: Investigator
  visits: ReturnType<typeof import('@/hooks/useSiteVisits').useSiteVisits>['visits']
  assessments: ReturnType<typeof import('@/hooks/useSiteAssessments').useSiteAssessments>['assessments']
  studies: Study[]
}) {
  const capacityMinutes = investigator.weeklyCapacityHours * 60
  const history = useMemo(
    () => computeWeekHistory(investigator.id, capacityMinutes, visits, assessments, 12),
    [investigator.id, capacityMinutes, visits, assessments],
  )

  const chartData = history
    .slice()
    .reverse()
    .map((m) => ({
      week: m.weekStart.slice(5), // MM-DD
      utilization: m.utilizationPct,
      hours: +(m.totalMinutes / 60).toFixed(1),
    }))

  const assignedStudies = studies.filter((s) =>
    s.assignedInvestigators.some((a) => a.investigatorId === investigator.id),
  )

  const currentWeek = history[0]

  return (
    <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600 space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase">This Week</p>
          <p className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">
            {+(currentWeek.totalMinutes / 60).toFixed(1)}h
            <span className="text-sm font-normal text-slate-400"> / {investigator.weeklyCapacityHours}h</span>
          </p>
          <p className="text-xs text-slate-500">
            {+(currentWeek.visitMinutes / 60).toFixed(1)}h visits + {+(currentWeek.assessmentMinutes / 60).toFixed(1)}h assessments
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase">Role</p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-0.5">
            {investigator.credentials} · {investigator.role}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase">Assigned Studies</p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-0.5">
            {assignedStudies.length}
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">Weekly Utilization — Last 12 Weeks</p>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="week" tick={{ fontSize: 10 }} />
            <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 10 }} width={35} />
            <Tooltip formatter={(v: number) => [`${v}%`, 'Utilization']} />
            <Line type="monotone" dataKey="utilization" stroke="#0d9488" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {assignedStudies.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Study Assignments</p>
          <div className="space-y-1">
            {assignedStudies.map((s) => {
              const role = s.assignedInvestigators.find((a) => a.investigatorId === investigator.id)?.role
              return (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-200">{s.name}</span>
                  <div className="flex items-center gap-2">
                    {role && <span className="text-xs text-slate-400">{role}</span>}
                    <StatusBadge status={s.status} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function Investigators() {
  const { investigators, loading } = useInvestigators()
  const { visits } = useSiteVisits()
  const { assessments } = useSiteAssessments()
  const { studies } = useStudies()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const currentWeekStart = getWeekStart(new Date())

  const rows = useMemo(
    () =>
      investigators.map((inv) => {
        const m = computeWeekMetrics(
          inv.id,
          inv.weeklyCapacityHours * 60,
          visits,
          assessments,
          currentWeekStart,
        )
        return { investigator: inv, metrics: m }
      }),
    [investigators, visits, assessments, currentWeekStart],
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((n) => <Skeleton key={n} className="h-16 w-full" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Investigators</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {investigators.length} investigators · current week utilization
        </p>
      </div>

      <div className="space-y-2">
        {rows.map(({ investigator: inv, metrics }) => (
          <div
            key={inv.id}
            className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
          >
            <button
              className="w-full text-left"
              onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{inv.name}</p>
                  <p className="text-xs text-slate-500">{inv.credentials} · {inv.role}</p>
                </div>
                <div className="w-48">
                  <CapacityBar pct={metrics.utilizationPct} />
                </div>
                <div className="text-xs text-slate-400 w-32 text-right">
                  {+(metrics.totalMinutes / 60).toFixed(1)}h / {inv.weeklyCapacityHours}h this week
                </div>
              </div>
            </button>

            {expandedId === inv.id && (
              <InvestigatorDetail
                investigator={inv}
                visits={visits}
                assessments={assessments}
                studies={studies}
              />
            )}
          </div>
        ))}

        {investigators.length === 0 && (
          <p className="text-sm text-slate-400 py-8 text-center">
            No investigators found for this site.
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- Investigators.test
```
Expected: 4 tests pass.

- [ ] **Step 5: Run full suite**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/management/Investigators.tsx src/pages/management/__tests__/Investigators.test.tsx
git commit -m "feat: implement Investigators page with utilization bars and expandable weekly trend"
```

---

## Task 6: WorkloadPlanner — Capacity Heat Map

**Files:**
- Modify: `src/pages/management/WorkloadPlanner.tsx` (replace stub)
- Create: `src/pages/management/__tests__/WorkloadPlanner.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/management/__tests__/WorkloadPlanner.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WorkloadPlanner } from '@/pages/management/WorkloadPlanner'
import type { Investigator } from '@/types'

vi.mock('@/hooks/useInvestigators', () => ({ useInvestigators: vi.fn() }))
vi.mock('@/hooks/useSiteVisits', () => ({ useSiteVisits: vi.fn() }))
vi.mock('@/hooks/useSiteAssessments', () => ({ useSiteAssessments: vi.fn() }))

import * as investigatorsModule from '@/hooks/useInvestigators'
import * as siteVisitsModule from '@/hooks/useSiteVisits'
import * as siteAssessmentsModule from '@/hooks/useSiteAssessments'

const mockInvestigator: Investigator = {
  id: 'inv-1', name: 'Dr. Wilson', credentials: 'MD', role: 'PI',
  siteId: 'tampa', weeklyCapacityHours: 40, siteBaselinePct: 15, assignedStudies: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(investigatorsModule.useInvestigators).mockReturnValue({ investigators: [mockInvestigator], loading: false, error: null })
  vi.mocked(siteVisitsModule.useSiteVisits).mockReturnValue({ visits: [], loading: false, error: null })
  vi.mocked(siteAssessmentsModule.useSiteAssessments).mockReturnValue({ assessments: [], loading: false, error: null })
})

describe('WorkloadPlanner', () => {
  it('renders the page heading', () => {
    render(<WorkloadPlanner />)
    expect(screen.getByRole('heading', { name: /workload planner/i })).toBeInTheDocument()
  })

  it('renders investigator names in the heat map', () => {
    render(<WorkloadPlanner />)
    expect(screen.getByText('Dr. Wilson')).toBeInTheDocument()
  })

  it('renders 13 week columns', () => {
    render(<WorkloadPlanner />)
    // 13 week header cells (not counting the name column)
    const cells = screen.getAllByText(/\d{2}-\d{2}/)
    expect(cells.length).toBe(13)
  })

  it('renders 0% cells when no visits are logged', () => {
    render(<WorkloadPlanner />)
    const zeroCells = screen.getAllByText('0%')
    expect(zeroCells.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- WorkloadPlanner.test
```
Expected: FAIL.

- [ ] **Step 3: Replace `src/pages/management/WorkloadPlanner.tsx`**

```typescript
import { useMemo } from 'react'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { recentWeekStarts, computeWeekMetrics, utilizationCellColor } from '@/lib/capacity'
import { Skeleton } from '@/components/ui/skeleton'

const NUM_WEEKS = 13

export function WorkloadPlanner() {
  const { investigators, loading } = useInvestigators()
  const { visits } = useSiteVisits()
  const { assessments } = useSiteAssessments()

  const weekStarts = useMemo(() => recentWeekStarts(NUM_WEEKS).reverse(), [])

  const grid = useMemo(
    () =>
      investigators.map((inv) => ({
        investigator: inv,
        weeks: weekStarts.map((ws) =>
          computeWeekMetrics(inv.id, inv.weeklyCapacityHours * 60, visits, assessments, ws),
        ),
      })),
    [investigators, visits, assessments, weekStarts],
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Workload Planner</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Capacity utilization per investigator over the last {NUM_WEEKS} weeks.
          <span className="ml-2 inline-flex gap-2 text-xs">
            <span className="text-green-600">■ &lt;75%</span>
            <span className="text-amber-500">■ 75–89%</span>
            <span className="text-red-600">■ ≥90%</span>
          </span>
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-xs">
          <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase w-40">
                Investigator
              </th>
              {weekStarts.map((ws) => (
                <th key={ws} className="px-2 py-3 text-center text-xs font-medium text-slate-400 w-16">
                  {ws.slice(5)} {/* MM-DD */}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {grid.map(({ investigator: inv, weeks }) => (
              <tr key={inv.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{inv.name}</p>
                  <p className="text-slate-400">{inv.weeklyCapacityHours}h/wk</p>
                </td>
                {weeks.map((m) => (
                  <td key={m.weekStart} className="px-1 py-1 text-center">
                    <span
                      className={`block rounded px-1 py-1 text-xs font-medium tabular-nums ${utilizationCellColor(m.utilizationPct)}`}
                    >
                      {m.utilizationPct}%
                    </span>
                  </td>
                ))}
              </tr>
            ))}
            {investigators.length === 0 && (
              <tr>
                <td colSpan={NUM_WEEKS + 1} className="py-8 text-center text-sm text-slate-400">
                  No investigators found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- WorkloadPlanner.test
```
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/management/WorkloadPlanner.tsx src/pages/management/__tests__/WorkloadPlanner.test.tsx
git commit -m "feat: implement WorkloadPlanner capacity heat map (13-week × investigator grid)"
```

---

## Task 7: Financial Page — Study ROI Cards

**Files:**
- Modify: `src/pages/management/Financial.tsx` (replace stub)
- Create: `src/pages/management/__tests__/Financial.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/management/__tests__/Financial.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Financial } from '@/pages/management/Financial'
import type { Study, Visit } from '@/types'

vi.mock('@/hooks/useStudies', () => ({ useStudies: vi.fn() }))
vi.mock('@/hooks/useSiteVisits', () => ({ useSiteVisits: vi.fn() }))

import * as studiesModule from '@/hooks/useStudies'
import * as siteVisitsModule from '@/hooks/useSiteVisits'

const mockStudy: Study = {
  id: 'study-1', name: 'Study Alpha', sponsor: 'Pharma Co', sponsorProtocolId: 'PC-001',
  therapeuticArea: 'Psychiatry', phase: 'Phase II', status: 'enrolling',
  siteId: 'tampa', piId: 'inv-1', assignedInvestigators: [],
  targetEnrollment: 20, startDate: '2026-01-01', expectedEndDate: '2026-12-31',
  visitSchedule: [], assessmentBattery: {},
  adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
  parsedFromProtocol: false,
  enrollmentData: { prescreens: 5, screens: 3, randomizations: 2, active: 2, completions: 0 },
  statusHistory: [],
}

const mockVisit: Visit = {
  id: 'v-1', participantId: 'P001', studyId: 'study-1', investigatorId: 'inv-1', siteId: 'tampa',
  visitType: 'Screening', scheduledDate: '2026-04-14', completedDate: '2026-04-14',
  status: 'completed', durationMinutes: 60, actualDurationMinutes: null, source: 'manual',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(studiesModule.useStudies).mockReturnValue({ studies: [mockStudy], loading: false, error: null })
  vi.mocked(siteVisitsModule.useSiteVisits).mockReturnValue({ visits: [mockVisit], loading: false, error: null })
})

describe('Financial', () => {
  it('renders the page heading', () => {
    render(<Financial />)
    expect(screen.getByRole('heading', { name: /financial/i })).toBeInTheDocument()
  })

  it('renders a card for each study', () => {
    render(<Financial />)
    expect(screen.getByText('Study Alpha')).toBeInTheDocument()
  })

  it('shows total logged hours for a study', () => {
    render(<Financial />)
    expect(screen.getByText(/1\.0h logged/i)).toBeInTheDocument()
  })

  it('shows enrollment progress', () => {
    render(<Financial />)
    expect(screen.getByText(/2 \/ 20/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- Financial.test
```
Expected: FAIL.

- [ ] **Step 3: Replace `src/pages/management/Financial.tsx`**

```typescript
import { useMemo } from 'react'
import { useStudies } from '@/hooks/useStudies'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Study, Visit } from '@/types'

interface StudyROI {
  study: Study
  totalHours: number
  activeWeeks: number
  hoursPerWeek: number
  enrollmentPct: number
}

function computeStudyROI(study: Study, visits: Visit[]): StudyROI {
  const studyVisits = visits.filter((v) => v.studyId === study.id && v.status === 'completed')
  const totalMinutes = studyVisits.reduce(
    (sum, v) => sum + (v.actualDurationMinutes ?? v.durationMinutes),
    0,
  )
  const totalHours = +(totalMinutes / 60).toFixed(1)

  const uniqueWeeks = new Set(
    studyVisits.map((v) => {
      const d = new Date(v.scheduledDate + 'T00:00:00Z')
      const day = d.getUTCDay()
      const diff = day === 0 ? -6 : 1 - day
      d.setUTCDate(d.getUTCDate() + diff)
      return d.toISOString().split('T')[0]
    }),
  )
  const activeWeeks = uniqueWeeks.size || 1
  const hoursPerWeek = +(totalHours / activeWeeks).toFixed(1)

  const enrolled = study.enrollmentData?.randomizations ?? 0
  const enrollmentPct =
    study.targetEnrollment > 0 ? Math.round((enrolled / study.targetEnrollment) * 100) : 0

  return { study, totalHours, activeWeeks, hoursPerWeek, enrollmentPct }
}

export function Financial() {
  const { studies, loading } = useStudies()
  const { visits } = useSiteVisits()

  const roiData = useMemo(
    () =>
      studies
        .map((s) => computeStudyROI(s, visits))
        .sort((a, b) => b.hoursPerWeek - a.hoursPerWeek),
    [studies, visits],
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-32 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Financial</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Study workload cost tracking. Contract values can be added when available.
        </p>
      </div>

      {roiData.length === 0 && (
        <p className="text-sm text-slate-400 py-8 text-center">No studies found.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {roiData.map(({ study, totalHours, hoursPerWeek, enrollmentPct }) => {
          const enrolled = study.enrollmentData?.randomizations ?? 0
          return (
            <div
              key={study.id}
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 leading-tight truncate">
                    {study.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{study.sponsor} · {study.phase}</p>
                </div>
                <StatusBadge status={study.status} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase">Hours Logged</p>
                  <p className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">
                    {totalHours}h <span className="text-xs font-normal text-slate-400">logged</span>
                  </p>
                  <p className="text-xs text-slate-400">{hoursPerWeek}h/week avg</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase">Enrollment</p>
                  <p className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">
                    {enrolled} / {study.targetEnrollment}
                  </p>
                  <p className="text-xs text-slate-400">{enrollmentPct}% of target</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 italic">
                  Contract value: <span className="text-slate-500">not set</span> — add in Study Settings to enable ROI tracking
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- Financial.test
```
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/management/Financial.tsx src/pages/management/__tests__/Financial.test.tsx
git commit -m "feat: implement Financial page with per-study hours logged and enrollment progress"
```

---

## Task 8: Reports Page — Utilization Table + CSV Export

**Files:**
- Modify: `src/pages/management/Reports.tsx` (replace stub)
- Create: `src/pages/management/__tests__/Reports.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/management/__tests__/Reports.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Reports } from '@/pages/management/Reports'
import type { Investigator } from '@/types'

vi.mock('@/hooks/useInvestigators', () => ({ useInvestigators: vi.fn() }))
vi.mock('@/hooks/useSiteVisits', () => ({ useSiteVisits: vi.fn() }))
vi.mock('@/hooks/useSiteAssessments', () => ({ useSiteAssessments: vi.fn() }))

import * as investigatorsModule from '@/hooks/useInvestigators'
import * as siteVisitsModule from '@/hooks/useSiteVisits'
import * as siteAssessmentsModule from '@/hooks/useSiteAssessments'

const mockInvestigator: Investigator = {
  id: 'inv-1', name: 'Dr. Wilson', credentials: 'MD', role: 'PI',
  siteId: 'tampa', weeklyCapacityHours: 40, siteBaselinePct: 15, assignedStudies: [],
}

// Mock URL.createObjectURL and revokeObjectURL for CSV download test
Object.defineProperty(globalThis, 'URL', {
  value: { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() },
  writable: true,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(investigatorsModule.useInvestigators).mockReturnValue({ investigators: [mockInvestigator], loading: false, error: null })
  vi.mocked(siteVisitsModule.useSiteVisits).mockReturnValue({ visits: [], loading: false, error: null })
  vi.mocked(siteAssessmentsModule.useSiteAssessments).mockReturnValue({ assessments: [], loading: false, error: null })
})

describe('Reports', () => {
  it('renders the page heading', () => {
    render(<Reports />)
    expect(screen.getByRole('heading', { name: /reports/i })).toBeInTheDocument()
  })

  it('renders investigator names in the table', () => {
    render(<Reports />)
    expect(screen.getByText('Dr. Wilson')).toBeInTheDocument()
  })

  it('renders a Download CSV button', () => {
    render(<Reports />)
    expect(screen.getByRole('button', { name: /download csv/i })).toBeInTheDocument()
  })

  it('clicking Download CSV triggers a file download', async () => {
    // Spy on document.createElement to intercept the anchor click
    const createElementSpy = vi.spyOn(document, 'createElement')
    const mockAnchor = { href: '', download: '', click: vi.fn(), style: { display: '' } }
    createElementSpy.mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor as unknown as HTMLElement
      return document.createElement.call(document, tag) as HTMLElement
    })

    render(<Reports />)
    await userEvent.click(screen.getByRole('button', { name: /download csv/i }))

    expect(mockAnchor.click).toHaveBeenCalled()
    createElementSpy.mockRestore()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- Reports.test
```
Expected: FAIL.

- [ ] **Step 3: Replace `src/pages/management/Reports.tsx`**

```typescript
import { useMemo } from 'react'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSiteVisits } from '@/hooks/useSiteVisits'
import { useSiteAssessments } from '@/hooks/useSiteAssessments'
import { recentWeekStarts, computeWeekMetrics, utilizationCellColor } from '@/lib/capacity'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const NUM_WEEKS = 26 // ~6 months

export function Reports() {
  const { investigators, loading } = useInvestigators()
  const { visits } = useSiteVisits()
  const { assessments } = useSiteAssessments()

  const weekStarts = useMemo(() => recentWeekStarts(NUM_WEEKS).reverse(), [])

  const grid = useMemo(
    () =>
      investigators.map((inv) => ({
        investigator: inv,
        weeks: weekStarts.map((ws) =>
          computeWeekMetrics(inv.id, inv.weeklyCapacityHours * 60, visits, assessments, ws),
        ),
      })),
    [investigators, visits, assessments, weekStarts],
  )

  function downloadCsv() {
    const header = ['Investigator', ...weekStarts].join(',')
    const rows = grid.map(({ investigator: inv, weeks }) =>
      [inv.name, ...weeks.map((m) => `${m.utilizationPct}%`)].join(','),
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `utilization-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Investigator utilization — last {NUM_WEEKS} weeks. Use browser Print (Ctrl+P) to save as PDF.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadCsv}>
          Download CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-xs">
          <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase sticky left-0 bg-white dark:bg-slate-800 w-40">
                Investigator
              </th>
              {weekStarts.map((ws) => (
                <th key={ws} className="px-1 py-3 text-center text-xs font-medium text-slate-400 w-14">
                  {ws.slice(5)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {grid.map(({ investigator: inv, weeks }) => (
              <tr key={inv.id}>
                <td className="px-4 py-2 sticky left-0 bg-white dark:bg-slate-800">
                  <p className="font-medium text-slate-700 dark:text-slate-200">{inv.name}</p>
                  <p className="text-slate-400">{inv.weeklyCapacityHours}h</p>
                </td>
                {weeks.map((m) => (
                  <td key={m.weekStart} className="px-0.5 py-0.5 text-center">
                    <span
                      className={`block rounded text-xs font-medium tabular-nums px-0.5 py-1 ${utilizationCellColor(m.utilizationPct)}`}
                    >
                      {m.utilizationPct}%
                    </span>
                  </td>
                ))}
              </tr>
            ))}
            {investigators.length === 0 && (
              <tr>
                <td colSpan={NUM_WEEKS + 1} className="py-8 text-center text-sm text-slate-400">
                  No investigators found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- Reports.test
```
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/management/Reports.tsx src/pages/management/__tests__/Reports.test.tsx
git commit -m "feat: implement Reports page with 26-week utilization table and CSV export"
```

---

## Task 9: Build Verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```
Expected: all tests pass (previously 56, now 56 + 2 + 12 + 5 + 4 + 4 + 4 + 4 + 4 = 95+).

- [ ] **Step 2: Run lint + type check**

```bash
npm run lint && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Run production build**

```bash
npm run build
```
Expected: success, `dist/` created.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: Phase 3 complete — management dashboards with capacity metrics, heat map, ROI, and reports"
```

---

## Self-Review

### Spec Coverage

| Feature | Spec Requirement | Task |
|---|---|---|
| Overview Dashboard — summary cards | Site Capacity %, Active Studies | Task 4 |
| Overview Dashboard — utilization chart | Investigator utilization bar chart (this week) | Task 4 |
| Overview Dashboard — enrollment velocity | Enrollment vs target per study | Task 4 |
| Overview Dashboard — alerts | Capacity warnings (≥75%, ≥90%) | Task 4 |
| Investigator detail — capacity gauge | Utilization bar + hours/week | Task 5 |
| Investigator detail — weekly trend | LineChart last 12 weeks | Task 5 |
| Investigator detail — study assignments | Assigned studies with roles | Task 5 |
| Capacity heat map | investigators × 13 weeks grid | Task 6 |
| Heat map color coding | green/amber/red thresholds | Task 6 |
| Study ROI view | Hours logged, enrollment progress | Task 7 |
| Utilization report | Full 26-week table | Task 8 |
| Export (CSV) | Download CSV button | Task 8 |
| Export (PDF) | Browser print (Ctrl+P) instruction | Task 8 |

**Spec items intentionally deferred:** "Study ROI contract value input" (placeholder note shown; actual contract value field is Phase 4 scope). Recharts `PieChart` donut for workload distribution was removed — a stacked bar of enrolled/target per study communicates the same signal more clearly and doesn't require the donut chart complexity.

### No Placeholder Scan

All code blocks are complete. All imports are from files created in this plan or already existing in the codebase (Phase 1–2). No "TBD" or "TODO" comments.

### Type Consistency

- `WeekMetrics` defined in `src/lib/capacity.ts` Task 2, consumed in Tasks 4–8.
- `computeWeekMetrics(investigatorId, capacityMinutes, visits, assessments, weekStartIso)` — 5 args, consistent across all usages.
- `recentWeekStarts(n)` returns `string[]` (ISO dates, newest first) — reversed where needed.
- `useSiteVisits()` returns `{ visits, loading, error }` — consistent with `useVisits` pattern.
- `useSiteAssessments()` returns `{ assessments, loading, error }` — consistent with `useAssessments` pattern.
