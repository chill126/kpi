# K2 KPI Tracker — Phase 2: Study Management + Workload Tracking

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build fully functional study management (list, detail, CRUD, status toggle, clone, comparison, enrollment funnel), workload tracking (visit/assessment logging, bulk entry, completion tracker, delegation log), and a Claude-powered protocol PDF parser that extracts the Schedule of Assessments into structured visit schedules.

**Architecture:** All Firestore writes go through typed helper functions in `src/lib/`. Real-time UI state is driven by `onSnapshot` hooks in `src/hooks/`. The Claude API is called directly from the browser via `@anthropic-ai/sdk` (internal management tool — key in `.env.local`). PDF bytes are base64-encoded and sent as a `document` block in the Claude message. No Cloud Functions required. `/studies/:id` is management-only; staff delegation log access lives inline in `MyStudies`.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, Firebase Firestore (onSnapshot), `@anthropic-ai/sdk`, React Router v6, Vitest + React Testing Library

**New dependency:** `@anthropic-ai/sdk` — install in Task 21 before implementing the parser.

---

## Reference

**Design spec:** `docs/superpowers/specs/2026-04-19-kpi-tracker-design.md`  
**Phase 1 plan:** `docs/superpowers/plans/2026-04-19-phase1-core-infrastructure.md`  
**Types:** `src/types/index.ts` — extended in Task 1  
**Firestore helpers:** `src/lib/firestore.ts` — `col()`, `withSite()`, `withSiteAndInvestigator()`  
**Auth hook:** `src/hooks/useAuth.ts` — returns `{ user, role, loading }`  
**Site hook:** `src/hooks/useSite.ts` — returns `{ siteId, setActiveSite }`

---

## File Structure

```
src/
├── types/
│   └── index.ts                          MODIFY — add EnrollmentData, StudyStatusHistoryEntry, extend Study
│
├── lib/
│   ├── scaleDefaults.ts                  CREATE — 14 assessment scale types with default durations
│   ├── studies.ts                        CREATE — Firestore CRUD + onSnapshot for studies
│   ├── visits.ts                         CREATE — Firestore CRUD + onSnapshot for visits
│   ├── assessments.ts                    CREATE — Firestore CRUD + onSnapshot for assessments
│   ├── delegationLog.ts                  CREATE — Firestore CRUD + onSnapshot for delegationLog
│   ├── investigators.ts                  CREATE — onSnapshot for investigators (read-only)
│   └── protocolParser.ts                 CREATE — Claude API call, PDF → ParsedProtocol JSON
│
├── hooks/
│   ├── useStudies.ts                     CREATE — real-time studies list for siteId
│   ├── useStudy.ts                       CREATE — single study by id
│   ├── useInvestigators.ts               CREATE — real-time investigators list for siteId
│   ├── useVisits.ts                      CREATE — visits for a study
│   ├── useAssessments.ts                 CREATE — assessments for a study
│   └── useDelegationLog.ts               CREATE — delegation log entries for a study
│
├── components/
│   ├── shared/
│   │   ├── StatusBadge.tsx               CREATE — study status badge (enrolling/paused/etc.)
│   │   └── ConfirmDialog.tsx             CREATE — reusable confirmation modal
│   │
│   ├── studies/
│   │   ├── StudyFilters.tsx              CREATE — status/area/PI filter bar
│   │   ├── StudyTable.tsx                CREATE — filterable table with checkboxes
│   │   ├── StudyForm.tsx                 CREATE — add/edit study modal (Dialog)
│   │   ├── StudyStatusToggle.tsx         CREATE — status dropdown + confirm dialog
│   │   ├── StudyCloneButton.tsx          CREATE — clone button + name prompt + confirm
│   │   └── StudyComparison.tsx           CREATE — side-by-side comparison modal
│   │
│   ├── study-detail/
│   │   ├── StudyDetailHeader.tsx         CREATE — name, sponsor, status, PI, dates, enrollment bar
│   │   ├── VisitScheduleTab.tsx          CREATE — editable visit schedule table
│   │   ├── AssessmentBatteryTab.tsx      CREATE — assessment battery per visit
│   │   ├── InvestigatorsTab.tsx          CREATE — assigned investigators + roles
│   │   ├── EnrollmentTab.tsx             CREATE — enrollment funnel + data entry form
│   │   └── DelegationLogTab.tsx          CREATE — delegation log table + manual entry
│   │
│   ├── protocol-parser/
│   │   ├── ProtocolUpload.tsx            CREATE — PDF file input + upload trigger
│   │   └── ProtocolReviewTable.tsx       CREATE — editable parsed visit/assessment table
│   │
│   └── workload/
│       ├── VisitLogForm.tsx              CREATE — single visit log form
│       ├── BulkVisitLogForm.tsx          CREATE — bulk entry (study+date, N participants)
│       ├── AssessmentLogForm.tsx         CREATE — assessment log form with scale autocomplete
│       └── VisitCompletionTracker.tsx    CREATE — completion % summary table per study
│
├── pages/
│   ├── management/
│   │   ├── Studies.tsx                   MODIFY — replace stub with StudyTable + StudyForm
│   │   └── StudyDetail.tsx               CREATE — tabbed detail page (new file)
│   │
│   └── staff/
│       ├── DataEntry.tsx                 MODIFY — replace stub with VisitLogForm + BulkVisitLogForm + AssessmentLogForm
│       └── MyStudies.tsx                 MODIFY — replace stub with assigned studies list + DelegationLogTab
│
└── router/
    └── index.tsx                         MODIFY — add /studies/:id under management routes
```

**Test files** (colocated with source):
```
src/lib/__tests__/studies.test.ts
src/lib/__tests__/visits.test.ts
src/lib/__tests__/protocolParser.test.ts
src/hooks/__tests__/useStudies.test.tsx
src/hooks/__tests__/useInvestigators.test.tsx
src/hooks/__tests__/useVisits.test.tsx
src/components/shared/__tests__/StatusBadge.test.tsx
src/components/shared/__tests__/ConfirmDialog.test.tsx
src/components/studies/__tests__/StudyFilters.test.tsx
src/components/studies/__tests__/StudyTable.test.tsx
src/components/studies/__tests__/StudyForm.test.tsx
src/components/workload/__tests__/VisitLogForm.test.tsx
src/components/workload/__tests__/BulkVisitLogForm.test.tsx
```

---

## Task 1: Extend TypeScript Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add new interfaces and extend Study**

Open `src/types/index.ts`. Add these interfaces after the existing `AdminOverride` interface, and add two new fields to `Study`:

```typescript
// After AdminOverride interface:

export interface EnrollmentData {
  prescreens: number
  screens: number
  randomizations: number
  active: number
  completions: number
}

export interface StudyStatusHistoryEntry {
  status: StudyStatus
  changedBy: string
  changedAt: string
  note?: string
}
```

Then in the `Study` interface, add two fields after `parsedFromProtocol`:

```typescript
export interface Study {
  id: string
  name: string
  sponsor: string
  sponsorProtocolId: string
  therapeuticArea: string
  phase: StudyPhase
  status: StudyStatus
  siteId: string
  piId: string
  assignedInvestigators: StudyInvestigator[]
  targetEnrollment: number
  startDate: string
  expectedEndDate: string
  visitSchedule: VisitScheduleEntry[]
  assessmentBattery: Record<string, string[]>
  adminOverride: AdminOverride
  parsedFromProtocol: boolean
  enrollmentData: EnrollmentData
  statusHistory: StudyStatusHistoryEntry[]
}
```

- [ ] **Step 2: Verify types compile**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add EnrollmentData and StudyStatusHistoryEntry types, extend Study"
```

---

## Task 2: Assessment Scale Defaults

**Files:**
- Create: `src/lib/scaleDefaults.ts`

- [ ] **Step 1: Create the scale defaults file**

```typescript
// src/lib/scaleDefaults.ts

export const SCALE_DURATIONS: Record<string, number> = {
  'HAMD-17': 20,
  'MADRS': 20,
  'ADAS-Cog': 45,
  'PANSS': 30,
  'CGI': 10,
  'PHQ-9': 10,
  'GAD-7': 10,
  'YMRS': 15,
  'CDR': 30,
  'BPRS': 20,
  'MMSE': 15,
  'Informed Consent Review': 45,
  'Physical Exam': 20,
}

export const SCALE_NAMES = Object.keys(SCALE_DURATIONS)

export function getScaleDuration(scaleType: string): number {
  return SCALE_DURATIONS[scaleType] ?? 15
}
```

- [ ] **Step 2: Verify compile**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/scaleDefaults.ts
git commit -m "feat: add assessment scale defaults (14 scale types with durations)"
```

---

## Task 3: Studies Firestore Layer

**Files:**
- Create: `src/lib/studies.ts`
- Create: `src/lib/__tests__/studies.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/studies.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  subscribeStudies,
  createStudy,
  updateStudy,
  updateStudyStatus,
  cloneStudy,
  updateEnrollmentData,
} from '@/lib/studies'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col-ref'),
  doc: vi.fn(() => 'doc-ref'),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(() => 'query-ref'),
  where: vi.fn(),
  orderBy: vi.fn(),
  arrayUnion: vi.fn((val) => ({ __arrayUnion: val })),
}))

vi.mock('@/lib/firebase', () => ({ db: {} }))

import * as firestore from 'firebase/firestore'

const mockStudy = {
  name: 'Study Alpha',
  sponsor: 'Pharma Co',
  sponsorProtocolId: 'PC-001',
  therapeuticArea: 'Psychiatry',
  phase: 'Phase II' as const,
  status: 'enrolling' as const,
  siteId: 'tampa',
  piId: 'inv-1',
  assignedInvestigators: [],
  targetEnrollment: 20,
  startDate: '2026-01-01',
  expectedEndDate: '2026-12-31',
  visitSchedule: [],
  assessmentBattery: {},
  adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
  parsedFromProtocol: false,
  enrollmentData: { prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0 },
  statusHistory: [],
}

describe('subscribeStudies', () => {
  it('calls onSnapshot with query scoped to siteId', () => {
    const onData = vi.fn()
    const onError = vi.fn()
    vi.mocked(firestore.onSnapshot).mockImplementation((_q, onNext: any) => {
      onNext({ docs: [{ id: 'study-1', data: () => ({ ...mockStudy }) }] })
      return () => {}
    })

    subscribeStudies('tampa', onData, onError)

    expect(onData).toHaveBeenCalledWith([{ id: 'study-1', ...mockStudy }])
  })
})

describe('createStudy', () => {
  it('calls addDoc and returns the new id', async () => {
    vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'new-study-id' } as any)

    const id = await createStudy(mockStudy)

    expect(firestore.addDoc).toHaveBeenCalled()
    expect(id).toBe('new-study-id')
  })
})

describe('updateStudyStatus', () => {
  it('calls updateDoc with new status and appended history entry', async () => {
    vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

    await updateStudyStatus('study-1', 'paused', 'uid-123')

    expect(firestore.updateDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({ status: 'paused' }),
    )
  })
})

describe('cloneStudy', () => {
  it('creates a new study with reset enrollment and On Hold status', async () => {
    vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'cloned-id' } as any)

    const id = await cloneStudy({ id: 'orig', ...mockStudy }, 'Study Alpha (Copy)')

    expect(id).toBe('cloned-id')
    const callArg = vi.mocked(firestore.addDoc).mock.calls[0][1] as any
    expect(callArg.status).toBe('on_hold')
    expect(callArg.name).toBe('Study Alpha (Copy)')
    expect(callArg.enrollmentData.randomizations).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- studies.test
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/lib/studies.ts`**

```typescript
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  arrayUnion,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Study, StudyStatus, StudyStatusHistoryEntry, EnrollmentData } from '@/types'

function toStudy(id: string, data: Record<string, unknown>): Study {
  return { id, ...data } as Study
}

export function subscribeStudies(
  siteId: string,
  onData: (studies: Study[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'studies'),
    where('siteId', '==', siteId),
    orderBy('name'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toStudy(d.id, d.data()))),
    onError,
  )
}

export function subscribeStudy(
  studyId: string,
  onData: (study: Study | null) => void,
  onError: (err: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, 'studies', studyId),
    (snap) => onData(snap.exists() ? toStudy(snap.id, snap.data()) : null),
    onError,
  )
}

export async function createStudy(data: Omit<Study, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'studies'), {
    ...data,
    enrollmentData: data.enrollmentData ?? {
      prescreens: 0,
      screens: 0,
      randomizations: 0,
      active: 0,
      completions: 0,
    },
    statusHistory: data.statusHistory ?? [],
  })
  return ref.id
}

export async function updateStudy(
  studyId: string,
  updates: Partial<Omit<Study, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'studies', studyId), updates as Record<string, unknown>)
}

export async function updateStudyStatus(
  studyId: string,
  status: StudyStatus,
  changedBy: string,
  note?: string,
): Promise<void> {
  const entry: StudyStatusHistoryEntry = {
    status,
    changedBy,
    changedAt: new Date().toISOString(),
    ...(note ? { note } : {}),
  }
  await updateDoc(doc(db, 'studies', studyId), {
    status,
    statusHistory: arrayUnion(entry),
  })
}

export async function cloneStudy(study: Study, newName: string): Promise<string> {
  const { id: _id, ...data } = study
  const ref = await addDoc(collection(db, 'studies'), {
    ...data,
    name: newName,
    status: 'on_hold' as StudyStatus,
    enrollmentData: { prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0 },
    statusHistory: [],
    parsedFromProtocol: false,
    startDate: '',
    expectedEndDate: '',
  })
  return ref.id
}

export async function updateEnrollmentData(
  studyId: string,
  data: EnrollmentData,
): Promise<void> {
  await updateDoc(doc(db, 'studies', studyId), { enrollmentData: data })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- studies.test
```
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/studies.ts src/lib/__tests__/studies.test.ts
git commit -m "feat: add studies Firestore layer (subscribe, create, update, status, clone)"
```

---

## Task 4: Visits + Assessments Firestore Layer

**Files:**
- Create: `src/lib/visits.ts`
- Create: `src/lib/assessments.ts`
- Create: `src/lib/__tests__/visits.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/visits.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createVisit, createVisitBatch, subscribeStudyVisits } from '@/lib/visits'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col-ref'),
  doc: vi.fn(() => 'doc-ref'),
  addDoc: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
  onSnapshot: vi.fn(),
  query: vi.fn(() => 'q-ref'),
  where: vi.fn(),
  orderBy: vi.fn(),
}))
vi.mock('@/lib/firebase', () => ({ db: {} }))

import * as firestore from 'firebase/firestore'

const baseVisit = {
  participantId: 'P001',
  studyId: 'study-1',
  investigatorId: 'inv-1',
  siteId: 'tampa',
  visitType: 'Screening',
  scheduledDate: '2026-05-01',
  completedDate: null,
  status: 'completed' as const,
  durationMinutes: 60,
  actualDurationMinutes: null,
  source: 'manual' as const,
}

describe('createVisit', () => {
  it('calls addDoc and returns the new id', async () => {
    vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'visit-1' } as any)
    const id = await createVisit(baseVisit)
    expect(firestore.addDoc).toHaveBeenCalled()
    expect(id).toBe('visit-1')
  })
})

describe('createVisitBatch', () => {
  it('batches multiple visits in a single commit', async () => {
    const mockBatch = { set: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) }
    vi.mocked(firestore.writeBatch).mockReturnValue(mockBatch as any)

    await createVisitBatch([baseVisit, { ...baseVisit, participantId: 'P002' }])

    expect(mockBatch.set).toHaveBeenCalledTimes(2)
    expect(mockBatch.commit).toHaveBeenCalledTimes(1)
  })
})

describe('subscribeStudyVisits', () => {
  it('calls onData with mapped visits', () => {
    const onData = vi.fn()
    vi.mocked(firestore.onSnapshot).mockImplementation((_q, onNext: any) => {
      onNext({ docs: [{ id: 'v-1', data: () => ({ ...baseVisit }) }] })
      return () => {}
    })

    subscribeStudyVisits('tampa', 'study-1', onData, vi.fn())

    expect(onData).toHaveBeenCalledWith([{ id: 'v-1', ...baseVisit }])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- visits.test
```
Expected: FAIL.

- [ ] **Step 3: Create `src/lib/visits.ts`**

```typescript
import {
  collection,
  doc,
  addDoc,
  writeBatch,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Visit } from '@/types'

function toVisit(id: string, data: Record<string, unknown>): Visit {
  return { id, ...data } as Visit
}

export function subscribeStudyVisits(
  siteId: string,
  studyId: string,
  onData: (visits: Visit[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'visits'),
    where('siteId', '==', siteId),
    where('studyId', '==', studyId),
    orderBy('scheduledDate', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toVisit(d.id, d.data()))),
    onError,
  )
}

export function subscribeInvestigatorVisits(
  siteId: string,
  investigatorId: string,
  onData: (visits: Visit[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'visits'),
    where('siteId', '==', siteId),
    where('investigatorId', '==', investigatorId),
    orderBy('scheduledDate', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toVisit(d.id, d.data()))),
    onError,
  )
}

export async function createVisit(data: Omit<Visit, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'visits'), data)
  return ref.id
}

export async function createVisitBatch(visits: Omit<Visit, 'id'>[]): Promise<void> {
  const batch = writeBatch(db)
  visits.forEach((v) => {
    const ref = doc(collection(db, 'visits'))
    batch.set(ref, v)
  })
  await batch.commit()
}
```

- [ ] **Step 4: Create `src/lib/assessments.ts`**

```typescript
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Assessment } from '@/types'

function toAssessment(id: string, data: Record<string, unknown>): Assessment {
  return { id, ...data } as Assessment
}

export function subscribeStudyAssessments(
  siteId: string,
  studyId: string,
  onData: (assessments: Assessment[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'assessments'),
    where('siteId', '==', siteId),
    where('studyId', '==', studyId),
    orderBy('date', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toAssessment(d.id, d.data()))),
    onError,
  )
}

export async function createAssessment(data: Omit<Assessment, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'assessments'), data)
  return ref.id
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- visits.test
```
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/visits.ts src/lib/assessments.ts src/lib/__tests__/visits.test.ts
git commit -m "feat: add visits and assessments Firestore layers"
```

---

## Task 5: DelegationLog + Investigators Firestore Layer

**Files:**
- Create: `src/lib/delegationLog.ts`
- Create: `src/lib/investigators.ts`

- [ ] **Step 1: Create `src/lib/delegationLog.ts`**

```typescript
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'
import type { DelegationLog } from '@/types'

function toDelegationLog(id: string, data: Record<string, unknown>): DelegationLog {
  return { id, ...data } as DelegationLog
}

export function subscribeDelegationLog(
  studyId: string,
  onData: (entries: DelegationLog[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'delegationLog'),
    where('studyId', '==', studyId),
    orderBy('effectiveDate', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toDelegationLog(d.id, d.data()))),
    onError,
  )
}

export async function createDelegationEntry(
  data: Omit<DelegationLog, 'id'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'delegationLog'), data)
  return ref.id
}

export async function updateDelegationEntry(
  entryId: string,
  updates: Partial<Omit<DelegationLog, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'delegationLog', entryId), updates as Record<string, unknown>)
}

export async function deleteDelegationEntry(entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'delegationLog', entryId))
}
```

- [ ] **Step 2: Create `src/lib/investigators.ts`**

```typescript
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Investigator } from '@/types'

function toInvestigator(id: string, data: Record<string, unknown>): Investigator {
  return { id, ...data } as Investigator
}

export function subscribeInvestigators(
  siteId: string,
  onData: (investigators: Investigator[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'investigators'),
    where('siteId', '==', siteId),
    orderBy('name'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toInvestigator(d.id, d.data()))),
    onError,
  )
}
```

- [ ] **Step 3: Verify compile**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/delegationLog.ts src/lib/investigators.ts
git commit -m "feat: add delegationLog and investigators Firestore layers"
```

---

## Task 6: useStudies + useStudy Hooks

**Files:**
- Create: `src/hooks/useStudies.ts`
- Create: `src/hooks/useStudy.ts`
- Create: `src/hooks/__tests__/useStudies.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/__tests__/useStudies.test.tsx`:

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStudies } from '@/hooks/useStudies'

vi.mock('@/lib/studies', () => ({ subscribeStudies: vi.fn() }))
vi.mock('@/hooks/useSite', () => ({ useSite: vi.fn() }))

import * as studiesLib from '@/lib/studies'
import * as useSiteModule from '@/hooks/useSite'

const mockStudy = {
  id: 'study-1',
  name: 'Study Alpha',
  sponsor: 'Pharma',
  sponsorProtocolId: 'PC-001',
  therapeuticArea: 'Psychiatry',
  phase: 'Phase II' as const,
  status: 'enrolling' as const,
  siteId: 'tampa',
  piId: 'inv-1',
  assignedInvestigators: [],
  targetEnrollment: 20,
  startDate: '2026-01-01',
  expectedEndDate: '2026-12-31',
  visitSchedule: [],
  assessmentBattery: {},
  adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
  parsedFromProtocol: false,
  enrollmentData: { prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0 },
  statusHistory: [],
}

describe('useStudies', () => {
  beforeEach(() => {
    vi.mocked(useSiteModule.useSite).mockReturnValue({ siteId: 'tampa', setActiveSite: vi.fn() })
  })

  it('starts loading with empty studies', () => {
    vi.mocked(studiesLib.subscribeStudies).mockImplementation(() => () => {})
    const { result } = renderHook(() => useStudies())
    expect(result.current.loading).toBe(true)
    expect(result.current.studies).toEqual([])
  })

  it('sets studies when data arrives', async () => {
    vi.mocked(studiesLib.subscribeStudies).mockImplementation((_siteId, onData) => {
      onData([mockStudy])
      return () => {}
    })

    const { result } = renderHook(() => useStudies())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.studies).toEqual([mockStudy])
  })

  it('sets error when subscription fails', async () => {
    vi.mocked(studiesLib.subscribeStudies).mockImplementation((_siteId, _onData, onError) => {
      onError(new Error('permission denied'))
      return () => {}
    })

    const { result } = renderHook(() => useStudies())

    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.error?.message).toBe('permission denied')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- useStudies.test
```
Expected: FAIL.

- [ ] **Step 3: Create `src/hooks/useStudies.ts`**

```typescript
import { useEffect, useState } from 'react'
import { subscribeStudies } from '@/lib/studies'
import { useSite } from '@/hooks/useSite'
import type { Study } from '@/types'

export function useStudies(): { studies: Study[]; loading: boolean; error: Error | null } {
  const { siteId } = useSite()
  const [studies, setStudies] = useState<Study[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeStudies(
      siteId,
      (data) => {
        setStudies(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [siteId])

  return { studies, loading, error }
}
```

- [ ] **Step 4: Create `src/hooks/useStudy.ts`**

```typescript
import { useEffect, useState } from 'react'
import { subscribeStudy } from '@/lib/studies'
import type { Study } from '@/types'

export function useStudy(
  studyId: string,
): { study: Study | null; loading: boolean; error: Error | null } {
  const [study, setStudy] = useState<Study | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!studyId) return
    setLoading(true)
    const unsubscribe = subscribeStudy(
      studyId,
      (data) => {
        setStudy(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [studyId])

  return { study, loading, error }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- useStudies.test
```
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useStudies.ts src/hooks/useStudy.ts src/hooks/__tests__/useStudies.test.tsx
git commit -m "feat: add useStudies and useStudy real-time hooks with tests"
```

---

## Task 7: useInvestigators Hook

**Files:**
- Create: `src/hooks/useInvestigators.ts`
- Create: `src/hooks/__tests__/useInvestigators.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/__tests__/useInvestigators.test.tsx`:

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useInvestigators } from '@/hooks/useInvestigators'

vi.mock('@/lib/investigators', () => ({ subscribeInvestigators: vi.fn() }))
vi.mock('@/hooks/useSite', () => ({ useSite: vi.fn() }))

import * as investigatorsLib from '@/lib/investigators'
import * as useSiteModule from '@/hooks/useSite'

const mockInvestigator = {
  id: 'inv-1',
  name: 'Dr. Kelley Wilson',
  credentials: 'MD',
  role: 'PI' as const,
  siteId: 'tampa',
  weeklyCapacityHours: 40,
  siteBaselinePct: 15,
  assignedStudies: [],
}

describe('useInvestigators', () => {
  beforeEach(() => {
    vi.mocked(useSiteModule.useSite).mockReturnValue({ siteId: 'tampa', setActiveSite: vi.fn() })
  })

  it('returns investigators when data arrives', async () => {
    vi.mocked(investigatorsLib.subscribeInvestigators).mockImplementation((_siteId, onData) => {
      onData([mockInvestigator])
      return () => {}
    })

    const { result } = renderHook(() => useInvestigators())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.investigators).toEqual([mockInvestigator])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- useInvestigators.test
```
Expected: FAIL.

- [ ] **Step 3: Create `src/hooks/useInvestigators.ts`**

```typescript
import { useEffect, useState } from 'react'
import { subscribeInvestigators } from '@/lib/investigators'
import { useSite } from '@/hooks/useSite'
import type { Investigator } from '@/types'

export function useInvestigators(): {
  investigators: Investigator[]
  loading: boolean
  error: Error | null
} {
  const { siteId } = useSite()
  const [investigators, setInvestigators] = useState<Investigator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeInvestigators(
      siteId,
      (data) => {
        setInvestigators(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [siteId])

  return { investigators, loading, error }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- useInvestigators.test
```
Expected: 1 test passes.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useInvestigators.ts src/hooks/__tests__/useInvestigators.test.tsx
git commit -m "feat: add useInvestigators real-time hook with test"
```

---

## Task 8: useVisits + useAssessments + useDelegationLog Hooks

**Files:**
- Create: `src/hooks/useVisits.ts`
- Create: `src/hooks/useAssessments.ts`
- Create: `src/hooks/useDelegationLog.ts`
- Create: `src/hooks/__tests__/useVisits.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/__tests__/useVisits.test.tsx`:

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useVisits } from '@/hooks/useVisits'

vi.mock('@/lib/visits', () => ({ subscribeStudyVisits: vi.fn() }))
vi.mock('@/hooks/useSite', () => ({ useSite: vi.fn() }))

import * as visitsLib from '@/lib/visits'
import * as useSiteModule from '@/hooks/useSite'

describe('useVisits', () => {
  beforeEach(() => {
    vi.mocked(useSiteModule.useSite).mockReturnValue({ siteId: 'tampa', setActiveSite: vi.fn() })
  })

  it('returns visits for the given study', async () => {
    const mockVisit = {
      id: 'v-1',
      participantId: 'P001',
      studyId: 'study-1',
      investigatorId: 'inv-1',
      siteId: 'tampa',
      visitType: 'Screening',
      scheduledDate: '2026-05-01',
      completedDate: null,
      status: 'completed' as const,
      durationMinutes: 60,
      actualDurationMinutes: null,
      source: 'manual' as const,
    }

    vi.mocked(visitsLib.subscribeStudyVisits).mockImplementation((_s, _sid, onData) => {
      onData([mockVisit])
      return () => {}
    })

    const { result } = renderHook(() => useVisits('study-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.visits).toEqual([mockVisit])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- useVisits.test
```
Expected: FAIL.

- [ ] **Step 3: Create `src/hooks/useVisits.ts`**

```typescript
import { useEffect, useState } from 'react'
import { subscribeStudyVisits } from '@/lib/visits'
import { useSite } from '@/hooks/useSite'
import type { Visit } from '@/types'

export function useVisits(
  studyId: string,
): { visits: Visit[]; loading: boolean; error: Error | null } {
  const { siteId } = useSite()
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!studyId) return
    setLoading(true)
    const unsubscribe = subscribeStudyVisits(
      siteId,
      studyId,
      (data) => {
        setVisits(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [siteId, studyId])

  return { visits, loading, error }
}
```

- [ ] **Step 4: Create `src/hooks/useAssessments.ts`**

```typescript
import { useEffect, useState } from 'react'
import { subscribeStudyAssessments } from '@/lib/assessments'
import { useSite } from '@/hooks/useSite'
import type { Assessment } from '@/types'

export function useAssessments(
  studyId: string,
): { assessments: Assessment[]; loading: boolean; error: Error | null } {
  const { siteId } = useSite()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!studyId) return
    setLoading(true)
    const unsubscribe = subscribeStudyAssessments(
      siteId,
      studyId,
      (data) => {
        setAssessments(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [siteId, studyId])

  return { assessments, loading, error }
}
```

- [ ] **Step 5: Create `src/hooks/useDelegationLog.ts`**

```typescript
import { useEffect, useState } from 'react'
import { subscribeDelegationLog } from '@/lib/delegationLog'
import type { DelegationLog } from '@/types'

export function useDelegationLog(
  studyId: string,
): { entries: DelegationLog[]; loading: boolean; error: Error | null } {
  const [entries, setEntries] = useState<DelegationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!studyId) return
    setLoading(true)
    const unsubscribe = subscribeDelegationLog(
      studyId,
      (data) => {
        setEntries(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [studyId])

  return { entries, loading, error }
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test -- useVisits.test
```
Expected: 1 test passes.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useVisits.ts src/hooks/useAssessments.ts src/hooks/useDelegationLog.ts src/hooks/__tests__/useVisits.test.tsx
git commit -m "feat: add useVisits, useAssessments, useDelegationLog hooks"
```

---

## Task 9: StatusBadge + ConfirmDialog

**Files:**
- Create: `src/components/shared/StatusBadge.tsx`
- Create: `src/components/shared/ConfirmDialog.tsx`
- Create: `src/components/shared/__tests__/StatusBadge.test.tsx`
- Create: `src/components/shared/__tests__/ConfirmDialog.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/shared/__tests__/StatusBadge.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatusBadge } from '@/components/shared/StatusBadge'

describe('StatusBadge', () => {
  it('renders "Enrolling" for enrolling status', () => {
    render(<StatusBadge status="enrolling" />)
    expect(screen.getByText('Enrolling')).toBeInTheDocument()
  })

  it('renders "Paused" for paused status', () => {
    render(<StatusBadge status="paused" />)
    expect(screen.getByText('Paused')).toBeInTheDocument()
  })

  it('renders "On Hold" for on_hold status', () => {
    render(<StatusBadge status="on_hold" />)
    expect(screen.getByText('On Hold')).toBeInTheDocument()
  })

  it('renders "Completed" for completed status', () => {
    render(<StatusBadge status="completed" />)
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('renders "Maintenance" for maintenance status', () => {
    render(<StatusBadge status="maintenance" />)
    expect(screen.getByText('Maintenance')).toBeInTheDocument()
  })
})
```

Create `src/components/shared/__tests__/ConfirmDialog.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders title and description when open', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        title="Archive Study"
        description="This cannot be undone."
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.getByText('Archive Study')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        title="Delete"
        description="Sure?"
        onConfirm={onConfirm}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onOpenChange(false) when Cancel is clicked', async () => {
    const onOpenChange = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Delete"
        description="Sure?"
        onConfirm={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- StatusBadge.test ConfirmDialog.test
```
Expected: FAIL.

- [ ] **Step 3: Create `src/components/shared/StatusBadge.tsx`**

```typescript
import type { StudyStatus } from '@/types'

interface Props {
  status: StudyStatus
}

const STATUS_CONFIG: Record<StudyStatus, { label: string; className: string }> = {
  enrolling: {
    label: 'Enrolling',
    className: 'bg-green-50 text-green-700 border border-green-200',
  },
  paused: {
    label: 'Paused',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  on_hold: {
    label: 'On Hold',
    className: 'bg-red-50 text-red-700 border border-red-200',
  },
  maintenance: {
    label: 'Maintenance',
    className: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-slate-100 text-slate-600 border border-slate-200',
  },
}

export function StatusBadge({ status }: Props) {
  const { label, className } = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  )
}
```

- [ ] **Step 4: Create `src/components/shared/ConfirmDialog.tsx`**

```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
}: Props) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={loading}
            onClick={handleConfirm}
          >
            {loading ? 'Working…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- StatusBadge.test ConfirmDialog.test
```
Expected: 8 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/
git commit -m "feat: add StatusBadge and ConfirmDialog shared components with tests"
```

---

## Task 10: StudyFilters Component

**Files:**
- Create: `src/components/studies/StudyFilters.tsx`
- Create: `src/components/studies/__tests__/StudyFilters.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/studies/__tests__/StudyFilters.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { StudyFilters, type StudyFilterState } from '@/components/studies/StudyFilters'
import type { Investigator } from '@/types'

const investigators: Investigator[] = [
  {
    id: 'inv-1',
    name: 'Dr. Wilson',
    credentials: 'MD',
    role: 'PI',
    siteId: 'tampa',
    weeklyCapacityHours: 40,
    siteBaselinePct: 15,
    assignedStudies: [],
  },
]

const defaultFilters: StudyFilterState = { status: 'all', therapeuticArea: '', piId: '' }

describe('StudyFilters', () => {
  it('renders status, area, and PI filter controls', () => {
    render(
      <StudyFilters filters={defaultFilters} onChange={vi.fn()} investigators={investigators} />,
    )
    expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/therapeutic area/i)).toBeInTheDocument()
  })

  it('calls onChange when therapeutic area input changes', async () => {
    const onChange = vi.fn()
    render(<StudyFilters filters={defaultFilters} onChange={onChange} investigators={investigators} />)
    await userEvent.type(screen.getByPlaceholderText(/therapeutic area/i), 'Psych')
    expect(onChange).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- StudyFilters.test
```
Expected: FAIL.

- [ ] **Step 3: Create `src/components/studies/StudyFilters.tsx`**

```typescript
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Investigator, StudyStatus } from '@/types'

export interface StudyFilterState {
  status: StudyStatus | 'all'
  therapeuticArea: string
  piId: string
}

interface Props {
  filters: StudyFilterState
  onChange: (filters: StudyFilterState) => void
  investigators: Investigator[]
}

const STATUS_OPTIONS: { value: StudyStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'enrolling', label: 'Enrolling' },
  { value: 'paused', label: 'Paused' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
]

export function StudyFilters({ filters, onChange, investigators }: Props) {
  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-status" className="text-xs font-medium text-slate-500">
          Status
        </Label>
        <select
          id="filter-status"
          aria-label="Status"
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value as StudyFilterState['status'] })}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-area" className="text-xs font-medium text-slate-500">
          Therapeutic Area
        </Label>
        <Input
          id="filter-area"
          placeholder="Therapeutic area…"
          value={filters.therapeuticArea}
          onChange={(e) => onChange({ ...filters, therapeuticArea: e.target.value })}
          className="h-9 w-48"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-pi" className="text-xs font-medium text-slate-500">
          PI
        </Label>
        <select
          id="filter-pi"
          value={filters.piId}
          onChange={(e) => onChange({ ...filters, piId: e.target.value })}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
        >
          <option value="">All PIs</option>
          {investigators.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.name}
            </option>
          ))}
        </select>
      </div>

      {(filters.status !== 'all' || filters.therapeuticArea || filters.piId) && (
        <button
          onClick={() => onChange({ status: 'all', therapeuticArea: '', piId: '' })}
          className="h-9 px-3 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- StudyFilters.test
```
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/studies/StudyFilters.tsx src/components/studies/__tests__/StudyFilters.test.tsx
git commit -m "feat: add StudyFilters component with status/area/PI filters"
```

---

## Task 11: StudyTable Component

**Files:**
- Create: `src/components/studies/StudyTable.tsx`
- Create: `src/components/studies/__tests__/StudyTable.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/studies/__tests__/StudyTable.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { StudyTable } from '@/components/studies/StudyTable'
import type { Study, Investigator } from '@/types'
import type { StudyFilterState } from '@/components/studies/StudyFilters'

const investigator: Investigator = {
  id: 'inv-1',
  name: 'Dr. Wilson',
  credentials: 'MD',
  role: 'PI',
  siteId: 'tampa',
  weeklyCapacityHours: 40,
  siteBaselinePct: 15,
  assignedStudies: [],
}

const study: Study = {
  id: 'study-1',
  name: 'Study Alpha',
  sponsor: 'Pharma Co',
  sponsorProtocolId: 'PC-001',
  therapeuticArea: 'Psychiatry',
  phase: 'Phase II',
  status: 'enrolling',
  siteId: 'tampa',
  piId: 'inv-1',
  assignedInvestigators: [{ investigatorId: 'inv-1', role: 'PI' }],
  targetEnrollment: 20,
  startDate: '2026-01-01',
  expectedEndDate: '2026-12-31',
  visitSchedule: [],
  assessmentBattery: {},
  adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
  parsedFromProtocol: false,
  enrollmentData: { prescreens: 5, screens: 4, randomizations: 3, active: 3, completions: 0 },
  statusHistory: [],
}

const noFilters: StudyFilterState = { status: 'all', therapeuticArea: '', piId: '' }

const renderTable = (filters = noFilters) =>
  render(
    <MemoryRouter>
      <StudyTable
        studies={[study]}
        investigators={[investigator]}
        filters={filters}
        selectedIds={[]}
        onSelectChange={vi.fn()}
        onViewDetail={vi.fn()}
      />
    </MemoryRouter>,
  )

describe('StudyTable', () => {
  it('renders study name and sponsor', () => {
    renderTable()
    expect(screen.getByText('Study Alpha')).toBeInTheDocument()
    expect(screen.getByText('Pharma Co')).toBeInTheDocument()
  })

  it('renders PI name', () => {
    renderTable()
    expect(screen.getByText('Dr. Wilson')).toBeInTheDocument()
  })

  it('filters out studies that do not match status filter', () => {
    renderTable({ status: 'paused', therapeuticArea: '', piId: '' })
    expect(screen.queryByText('Study Alpha')).not.toBeInTheDocument()
  })

  it('calls onViewDetail when row is clicked', async () => {
    const onViewDetail = vi.fn()
    render(
      <MemoryRouter>
        <StudyTable
          studies={[study]}
          investigators={[investigator]}
          filters={noFilters}
          selectedIds={[]}
          onSelectChange={vi.fn()}
          onViewDetail={onViewDetail}
        />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByText('Study Alpha'))
    expect(onViewDetail).toHaveBeenCalledWith('study-1')
  })

  it('shows enrollment percentage', () => {
    renderTable()
    expect(screen.getByText('15%')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- StudyTable.test
```
Expected: FAIL.

- [ ] **Step 3: Create `src/components/studies/StudyTable.tsx`**

```typescript
import type { Investigator, Study } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { StudyFilterState } from './StudyFilters'

interface Props {
  studies: Study[]
  investigators: Investigator[]
  filters: StudyFilterState
  selectedIds: string[]
  onSelectChange: (ids: string[]) => void
  onViewDetail: (studyId: string) => void
}

function applyFilters(studies: Study[], filters: StudyFilterState): Study[] {
  return studies.filter((s) => {
    if (filters.status !== 'all' && s.status !== filters.status) return false
    if (
      filters.therapeuticArea &&
      !s.therapeuticArea.toLowerCase().includes(filters.therapeuticArea.toLowerCase())
    )
      return false
    if (filters.piId && s.piId !== filters.piId) return false
    return true
  })
}

export function StudyTable({
  studies,
  investigators,
  filters,
  selectedIds,
  onSelectChange,
  onViewDetail,
}: Props) {
  const invMap = Object.fromEntries(investigators.map((i) => [i.id, i]))
  const filtered = applyFilters(studies, filters)

  function toggleSelect(id: string) {
    if (selectedIds.includes(id)) {
      onSelectChange(selectedIds.filter((x) => x !== id))
    } else if (selectedIds.length < 2) {
      onSelectChange([...selectedIds, id])
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th className="w-10 px-4 py-3 text-left">
              <span className="sr-only">Select</span>
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Study
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Sponsor
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Area
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Phase
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              PI
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
              Enrolled
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {filtered.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">
                No studies match the current filters.
              </td>
            </tr>
          )}
          {filtered.map((study) => {
            const pi = invMap[study.piId]
            const enrolled = study.enrollmentData?.randomizations ?? 0
            const pct =
              study.targetEnrollment > 0
                ? Math.round((enrolled / study.targetEnrollment) * 100)
                : 0
            const isSelected = selectedIds.includes(study.id)

            return (
              <tr
                key={study.id}
                className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isSelected ? 'bg-teal-50 dark:bg-teal-900/20' : ''}`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(study.id)}
                    aria-label={`Select ${study.name}`}
                    className="rounded border-slate-300"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onViewDetail(study.id)}
                    className="font-medium text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 text-left"
                  >
                    {study.name}
                  </button>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{study.sponsor}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={study.status} />
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {study.therapeuticArea}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{study.phase}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {pi?.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                  {enrolled}/{study.targetEnrollment}{' '}
                  <span className="text-slate-400 text-xs">({pct}%)</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- StudyTable.test
```
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/studies/StudyTable.tsx src/components/studies/__tests__/StudyTable.test.tsx
git commit -m "feat: add StudyTable with filtering, selection, and enrollment percentage"
```

---

## Task 12: StudyForm (Add/Edit Modal)

**Files:**
- Create: `src/components/studies/StudyForm.tsx`
- Create: `src/components/studies/__tests__/StudyForm.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/studies/__tests__/StudyForm.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StudyForm } from '@/components/studies/StudyForm'
import type { Investigator } from '@/types'

vi.mock('@/lib/studies', () => ({
  createStudy: vi.fn(),
  updateStudy: vi.fn(),
}))

import * as studiesLib from '@/lib/studies'

const investigators: Investigator[] = [
  {
    id: 'inv-1',
    name: 'Dr. Wilson',
    credentials: 'MD',
    role: 'PI',
    siteId: 'tampa',
    weeklyCapacityHours: 40,
    siteBaselinePct: 15,
    assignedStudies: [],
  },
]

describe('StudyForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders all required fields', () => {
    render(
      <StudyForm
        open={true}
        onOpenChange={vi.fn()}
        investigators={investigators}
        siteId="tampa"
        onSave={vi.fn()}
      />,
    )
    expect(screen.getByLabelText(/study name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sponsor/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/therapeutic area/i)).toBeInTheDocument()
  })

  it('shows validation error when name is empty on submit', async () => {
    render(
      <StudyForm
        open={true}
        onOpenChange={vi.fn()}
        investigators={investigators}
        siteId="tampa"
        onSave={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
  })

  it('calls createStudy and onSave on valid create submit', async () => {
    vi.mocked(studiesLib.createStudy).mockResolvedValue('new-study-id')
    const onSave = vi.fn()

    render(
      <StudyForm
        open={true}
        onOpenChange={vi.fn()}
        investigators={investigators}
        siteId="tampa"
        onSave={onSave}
      />,
    )

    await userEvent.type(screen.getByLabelText(/study name/i), 'Study Beta')
    await userEvent.type(screen.getByLabelText(/sponsor/i), 'Pharma Corp')
    await userEvent.type(screen.getByLabelText(/therapeutic area/i), 'Neurology')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(studiesLib.createStudy).toHaveBeenCalled()
      expect(onSave).toHaveBeenCalledWith('new-study-id')
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- StudyForm.test
```
Expected: FAIL.

- [ ] **Step 3: Create `src/components/studies/StudyForm.tsx`**

```typescript
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createStudy, updateStudy } from '@/lib/studies'
import type { Investigator, Study, StudyPhase, StudyStatus } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  study?: Study
  investigators: Investigator[]
  siteId: string
  onSave: (studyId: string) => void
}

const PHASES: StudyPhase[] = ['Phase I', 'Phase II', 'Phase III', 'Phase IV', 'Observational']
const STATUSES: StudyStatus[] = ['enrolling', 'paused', 'maintenance', 'on_hold', 'completed']

interface FormState {
  name: string
  sponsor: string
  sponsorProtocolId: string
  therapeuticArea: string
  phase: StudyPhase
  status: StudyStatus
  piId: string
  targetEnrollment: string
  startDate: string
  expectedEndDate: string
  perStudyWeeklyHours: string
  perParticipantOverheadPct: string
}

const EMPTY: FormState = {
  name: '',
  sponsor: '',
  sponsorProtocolId: '',
  therapeuticArea: '',
  phase: 'Phase II',
  status: 'enrolling',
  piId: '',
  targetEnrollment: '20',
  startDate: '',
  expectedEndDate: '',
  perStudyWeeklyHours: '2',
  perParticipantOverheadPct: '10',
}

function studyToForm(s: Study): FormState {
  return {
    name: s.name,
    sponsor: s.sponsor,
    sponsorProtocolId: s.sponsorProtocolId,
    therapeuticArea: s.therapeuticArea,
    phase: s.phase,
    status: s.status,
    piId: s.piId,
    targetEnrollment: String(s.targetEnrollment),
    startDate: s.startDate,
    expectedEndDate: s.expectedEndDate,
    perStudyWeeklyHours: String(s.adminOverride.perStudyWeeklyHours),
    perParticipantOverheadPct: String(s.adminOverride.perParticipantOverheadPct),
  }
}

export function StudyForm({ open, onOpenChange, study, investigators, siteId, onSave }: Props) {
  const [form, setForm] = useState<FormState>(study ? studyToForm(study) : EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) setForm(study ? studyToForm(study) : EMPTY)
  }, [open, study])

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function handleSave() {
    const next: typeof errors = {}
    if (!form.name.trim()) next.name = 'Name is required'
    if (!form.sponsor.trim()) next.sponsor = 'Sponsor is required'
    if (!form.therapeuticArea.trim()) next.therapeuticArea = 'Therapeutic area is required'
    if (!form.piId) next.piId = 'PI is required'
    if (Object.keys(next).length) { setErrors(next); return }

    setLoading(true)
    try {
      const data = {
        name: form.name.trim(),
        sponsor: form.sponsor.trim(),
        sponsorProtocolId: form.sponsorProtocolId.trim(),
        therapeuticArea: form.therapeuticArea.trim(),
        phase: form.phase,
        status: form.status,
        siteId,
        piId: form.piId,
        assignedInvestigators: [{ investigatorId: form.piId, role: 'PI' as const }],
        targetEnrollment: Number(form.targetEnrollment) || 0,
        startDate: form.startDate,
        expectedEndDate: form.expectedEndDate,
        visitSchedule: study?.visitSchedule ?? [],
        assessmentBattery: study?.assessmentBattery ?? {},
        adminOverride: {
          perStudyWeeklyHours: Number(form.perStudyWeeklyHours) || 2,
          perParticipantOverheadPct: Number(form.perParticipantOverheadPct) || 10,
        },
        parsedFromProtocol: study?.parsedFromProtocol ?? false,
        enrollmentData: study?.enrollmentData ?? {
          prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0,
        },
        statusHistory: study?.statusHistory ?? [],
      }

      let id: string
      if (study) {
        await updateStudy(study.id, data)
        id = study.id
      } else {
        id = await createStudy(data)
      }
      onSave(id)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{study ? 'Edit Study' : 'Add Study'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2 space-y-1">
            <Label htmlFor="sf-name">Study Name *</Label>
            <Input id="sf-name" value={form.name} onChange={(e) => set('name', e.target.value)} />
            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-sponsor">Sponsor *</Label>
            <Input id="sf-sponsor" value={form.sponsor} onChange={(e) => set('sponsor', e.target.value)} />
            {errors.sponsor && <p className="text-xs text-red-600">{errors.sponsor}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-protocol">Sponsor Protocol ID</Label>
            <Input id="sf-protocol" value={form.sponsorProtocolId} onChange={(e) => set('sponsorProtocolId', e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-area">Therapeutic Area *</Label>
            <Input id="sf-area" value={form.therapeuticArea} onChange={(e) => set('therapeuticArea', e.target.value)} />
            {errors.therapeuticArea && <p className="text-xs text-red-600">{errors.therapeuticArea}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-phase">Phase</Label>
            <select
              id="sf-phase"
              value={form.phase}
              onChange={(e) => set('phase', e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            >
              {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-status">Status</Label>
            <select
              id="sf-status"
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-pi">Principal Investigator *</Label>
            <select
              id="sf-pi"
              value={form.piId}
              onChange={(e) => set('piId', e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            >
              <option value="">Select PI…</option>
              {investigators.map((inv) => (
                <option key={inv.id} value={inv.id}>{inv.name}</option>
              ))}
            </select>
            {errors.piId && <p className="text-xs text-red-600">{errors.piId}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-target">Target Enrollment</Label>
            <Input id="sf-target" type="number" min="1" value={form.targetEnrollment} onChange={(e) => set('targetEnrollment', e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-start">Start Date</Label>
            <Input id="sf-start" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-end">Expected End Date</Label>
            <Input id="sf-end" type="date" value={form.expectedEndDate} onChange={(e) => set('expectedEndDate', e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-weekly">Admin Hours/Week</Label>
            <Input id="sf-weekly" type="number" min="0" step="0.5" value={form.perStudyWeeklyHours} onChange={(e) => set('perStudyWeeklyHours', e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="sf-overhead">Participant Overhead %</Label>
            <Input id="sf-overhead" type="number" min="0" max="100" value={form.perParticipantOverheadPct} onChange={(e) => set('perParticipantOverheadPct', e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={loading} onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-white">
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- StudyForm.test
```
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/studies/StudyForm.tsx src/components/studies/__tests__/StudyForm.test.tsx
git commit -m "feat: add StudyForm modal for creating and editing studies"
```

---

## Task 13: StudyStatusToggle + StudyCloneButton

**Files:**
- Create: `src/components/studies/StudyStatusToggle.tsx`
- Create: `src/components/studies/StudyCloneButton.tsx`

- [ ] **Step 1: Create `src/components/studies/StudyStatusToggle.tsx`**

```typescript
import { useState } from 'react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { updateStudyStatus } from '@/lib/studies'
import type { AppUser, Study, StudyStatus } from '@/types'

interface Props {
  study: Study
  currentUser: AppUser
}

const STATUS_OPTIONS: StudyStatus[] = [
  'enrolling',
  'paused',
  'maintenance',
  'on_hold',
  'completed',
]

export function StudyStatusToggle({ study, currentUser }: Props) {
  const [pending, setPending] = useState<StudyStatus | null>(null)

  return (
    <>
      <div className="flex items-center gap-2">
        <StatusBadge status={study.status} />
        <select
          value={study.status}
          onChange={(e) => setPending(e.target.value as StudyStatus)}
          className="h-7 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
          aria-label="Change status"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => { if (!open) setPending(null) }}
        title="Change Study Status"
        description={`Change "${study.name}" from ${study.status.replace('_', ' ')} to ${pending?.replace('_', ' ')}?`}
        confirmLabel="Change Status"
        onConfirm={async () => {
          if (pending) await updateStudyStatus(study.id, pending, currentUser.uid)
          setPending(null)
        }}
      />
    </>
  )
}
```

- [ ] **Step 2: Create `src/components/studies/StudyCloneButton.tsx`**

```typescript
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cloneStudy } from '@/lib/studies'
import type { Study } from '@/types'
import { Copy } from 'lucide-react'

interface Props {
  study: Study
  onCloned: (newStudyId: string) => void
}

export function StudyCloneButton({ study, onCloned }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleOpen() {
    setName(`${study.name} (Copy)`)
    setError('')
    setOpen(true)
  }

  async function handleClone() {
    if (!name.trim()) { setError('Name is required'); return }
    setLoading(true)
    try {
      const id = await cloneStudy(study, name.trim())
      onCloned(id)
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <Copy size={14} className="mr-1.5" aria-hidden="true" />
        Clone
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Study</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="clone-name">New Study Name</Label>
            <Input
              id="clone-name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <p className="text-xs text-slate-500">
              Visit schedule, assessment battery, and admin settings are copied. Enrollment data is reset.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={loading} onClick={handleClone} className="bg-teal-600 hover:bg-teal-700 text-white">
              {loading ? 'Cloning…' : 'Clone Study'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 3: Verify compile**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/studies/StudyStatusToggle.tsx src/components/studies/StudyCloneButton.tsx
git commit -m "feat: add StudyStatusToggle and StudyCloneButton components"
```

---

## Task 14: Studies Page (Replace Stub)

**Files:**
- Modify: `src/pages/management/Studies.tsx`

- [ ] **Step 1: Replace the stub**

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudies } from '@/hooks/useStudies'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useSite } from '@/hooks/useSite'
import { StudyTable } from '@/components/studies/StudyTable'
import { StudyFilters, type StudyFilterState } from '@/components/studies/StudyFilters'
import { StudyForm } from '@/components/studies/StudyForm'
import { StudyComparison } from '@/components/studies/StudyComparison'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, GitCompareArrows } from 'lucide-react'

export function Studies() {
  const navigate = useNavigate()
  const { siteId } = useSite()
  const { studies, loading: studiesLoading } = useStudies()
  const { investigators, loading: invLoading } = useInvestigators()
  const [filters, setFilters] = useState<StudyFilterState>({
    status: 'all',
    therapeuticArea: '',
    piId: '',
  })
  const [formOpen, setFormOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const loading = studiesLoading || invLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Studies</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {studies.length} {studies.length === 1 ? 'study' : 'studies'} at this site
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length === 2 && (
            <Button variant="outline" size="sm" onClick={() => setCompareOpen(true)}>
              <GitCompareArrows size={14} className="mr-1.5" aria-hidden="true" />
              Compare
            </Button>
          )}
          <Button
            onClick={() => setFormOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Plus size={16} className="mr-1.5" aria-hidden="true" />
            Add Study
          </Button>
        </div>
      </div>

      <StudyFilters filters={filters} onChange={setFilters} investigators={investigators} />

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => <Skeleton key={n} className="h-12 w-full rounded-md" />)}
        </div>
      ) : (
        <StudyTable
          studies={studies}
          investigators={investigators}
          filters={filters}
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          onViewDetail={(id) => navigate(`/studies/${id}`)}
        />
      )}

      <StudyForm
        open={formOpen}
        onOpenChange={setFormOpen}
        investigators={investigators}
        siteId={siteId}
        onSave={(id) => {
          setFormOpen(false)
          navigate(`/studies/${id}`)
        }}
      />

      {selectedIds.length === 2 && (
        <StudyComparison
          studyIds={selectedIds as [string, string]}
          studies={studies}
          investigators={investigators}
          open={compareOpen}
          onOpenChange={setCompareOpen}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: no errors (StudyComparison not yet created — if lint fails on missing module, create a stub `src/components/studies/StudyComparison.tsx` that exports `export function StudyComparison() { return null }`).

- [ ] **Step 3: Create stub for StudyComparison (if lint requires it)**

```typescript
// src/components/studies/StudyComparison.tsx — temporary stub, replaced in Task 29
import type { Investigator, Study } from '@/types'

interface Props {
  studyIds: [string, string]
  studies: Study[]
  investigators: Investigator[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StudyComparison(_props: Props) {
  return null
}
```

- [ ] **Step 4: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/management/Studies.tsx src/components/studies/StudyComparison.tsx
git commit -m "feat: replace Studies stub with live StudyTable, filters, and add/compare actions"
```

---

## Task 15: Router Update + StudyDetail Page Shell

**Files:**
- Modify: `src/router/index.tsx`
- Create: `src/pages/management/StudyDetail.tsx`

- [ ] **Step 1: Add `/studies/:id` to the management routes**

In `src/router/index.tsx`, add the import and route:

```typescript
// Add this import after existing page imports:
import { StudyDetail } from '@/pages/management/StudyDetail'

// Inside the management RoleRoute section, add after the /settings route:
<Route path="/studies/:id" element={<StudyDetail />} />
```

The full updated management route block becomes:

```typescript
<Route element={<RoleRoute allowedRole="management" />}>
  <Route path="/" element={<Overview />} />
  <Route path="/investigators" element={<Investigators />} />
  <Route path="/studies" element={<Studies />} />
  <Route path="/studies/:id" element={<StudyDetail />} />
  <Route path="/enrollment" element={<Enrollment />} />
  <Route path="/workload" element={<WorkloadPlanner />} />
  <Route path="/financial" element={<Financial />} />
  <Route path="/reports" element={<Reports />} />
  <Route path="/import" element={<Import />} />
  <Route path="/settings" element={<Settings />} />
</Route>
```

- [ ] **Step 2: Create `src/pages/management/StudyDetail.tsx` (shell)**

This is the page shell. It will be fully assembled in Task 20. For now:

```typescript
import { useParams, useNavigate } from 'react-router-dom'
import { useStudy } from '@/hooks/useStudy'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useAuth } from '@/hooks/useAuth'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StudyDetailHeader } from '@/components/study-detail/StudyDetailHeader'
import { VisitScheduleTab } from '@/components/study-detail/VisitScheduleTab'
import { AssessmentBatteryTab } from '@/components/study-detail/AssessmentBatteryTab'
import { InvestigatorsTab } from '@/components/study-detail/InvestigatorsTab'
import { EnrollmentTab } from '@/components/study-detail/EnrollmentTab'
import { DelegationLogTab } from '@/components/study-detail/DelegationLogTab'
import { ChevronLeft } from 'lucide-react'

export function StudyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { study, loading } = useStudy(id ?? '')
  const { investigators } = useInvestigators()
  const { role } = useAuth()

  const canEdit = role === 'management'

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!study) {
    return (
      <div className="text-center py-12 text-slate-500">
        Study not found.{' '}
        <button onClick={() => navigate('/studies')} className="underline text-teal-600">
          Back to studies
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/studies')}
        className="text-slate-500 hover:text-slate-700 -ml-2"
      >
        <ChevronLeft size={16} aria-hidden="true" className="mr-1" />
        Studies
      </Button>

      <StudyDetailHeader study={study} investigators={investigators} />

      <Tabs defaultValue="visit-schedule">
        <TabsList className="border-b border-slate-200 dark:border-slate-700 w-full justify-start rounded-none bg-transparent h-auto p-0 gap-0">
          {['visit-schedule', 'assessment-battery', 'investigators', 'enrollment', 'delegation-log'].map(
            (tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:text-teal-600 pb-3 px-4 text-sm font-medium capitalize"
              >
                {tab.replace(/-/g, ' ')}
              </TabsTrigger>
            ),
          )}
        </TabsList>

        <div className="pt-6">
          <TabsContent value="visit-schedule">
            <VisitScheduleTab study={study} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="assessment-battery">
            <AssessmentBatteryTab study={study} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="investigators">
            <InvestigatorsTab study={study} investigators={investigators} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="enrollment">
            <EnrollmentTab study={study} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="delegation-log">
            <DelegationLogTab studyId={study.id} investigators={investigators} canEdit={canEdit} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```
Expected: errors for missing study-detail components — create stubs for each.

- [ ] **Step 4: Create stubs for all study-detail components**

Create each file:

`src/components/study-detail/StudyDetailHeader.tsx`:
```typescript
import type { Investigator, Study } from '@/types'
export function StudyDetailHeader(_props: { study: Study; investigators: Investigator[] }) {
  return <div data-stub="StudyDetailHeader" />
}
```

`src/components/study-detail/VisitScheduleTab.tsx`:
```typescript
import type { Study } from '@/types'
export function VisitScheduleTab(_props: { study: Study; canEdit: boolean }) {
  return <div data-stub="VisitScheduleTab" />
}
```

`src/components/study-detail/AssessmentBatteryTab.tsx`:
```typescript
import type { Study } from '@/types'
export function AssessmentBatteryTab(_props: { study: Study; canEdit: boolean }) {
  return <div data-stub="AssessmentBatteryTab" />
}
```

`src/components/study-detail/InvestigatorsTab.tsx`:
```typescript
import type { Investigator, Study } from '@/types'
export function InvestigatorsTab(_props: { study: Study; investigators: Investigator[]; canEdit: boolean }) {
  return <div data-stub="InvestigatorsTab" />
}
```

`src/components/study-detail/EnrollmentTab.tsx`:
```typescript
import type { Study } from '@/types'
export function EnrollmentTab(_props: { study: Study; canEdit: boolean }) {
  return <div data-stub="EnrollmentTab" />
}
```

`src/components/study-detail/DelegationLogTab.tsx`:
```typescript
import type { Investigator } from '@/types'
export function DelegationLogTab(_props: { studyId: string; investigators: Investigator[]; canEdit: boolean }) {
  return <div data-stub="DelegationLogTab" />
}
```

- [ ] **Step 5: Run lint to verify it passes**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/router/index.tsx src/pages/management/StudyDetail.tsx src/components/study-detail/
git commit -m "feat: add /studies/:id route, StudyDetail page shell, and study-detail component stubs"
```

---

## Task 16: StudyDetailHeader

**Files:**
- Modify: `src/components/study-detail/StudyDetailHeader.tsx` (replace stub)

- [ ] **Step 1: Replace the stub**

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { StudyStatusToggle } from '@/components/studies/StudyStatusToggle'
import { StudyCloneButton } from '@/components/studies/StudyCloneButton'
import { StudyForm } from '@/components/studies/StudyForm'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useSite } from '@/hooks/useSite'
import type { Investigator, Study } from '@/types'
import { Pencil } from 'lucide-react'

interface Props {
  study: Study
  investigators: Investigator[]
}

export function StudyDetailHeader({ study, investigators }: Props) {
  const { user, role } = useAuth()
  const { siteId } = useSite()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)

  const pi = investigators.find((i) => i.id === study.piId)
  const enrolled = study.enrollmentData?.randomizations ?? 0
  const pct =
    study.targetEnrollment > 0 ? Math.round((enrolled / study.targetEnrollment) * 100) : 0

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{study.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {study.sponsor}
            {study.sponsorProtocolId ? ` · ${study.sponsorProtocolId}` : ''}
          </p>
        </div>

        {role === 'management' && user && (
          <div className="flex items-center gap-2 shrink-0">
            <StudyStatusToggle study={study} currentUser={user} />
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil size={14} className="mr-1.5" aria-hidden="true" />
              Edit
            </Button>
            <StudyCloneButton
              study={study}
              onCloned={(id) => navigate(`/studies/${id}`)}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Phase</p>
          <p className="mt-0.5 text-slate-700 dark:text-slate-200">{study.phase}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Area</p>
          <p className="mt-0.5 text-slate-700 dark:text-slate-200">{study.therapeuticArea}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">PI</p>
          <p className="mt-0.5 text-slate-700 dark:text-slate-200">{pi?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Dates</p>
          <p className="mt-0.5 text-slate-700 dark:text-slate-200">
            {study.startDate || '—'} → {study.expectedEndDate || '—'}
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Enrollment</span>
          <span>
            {enrolled} / {study.targetEnrollment} ({pct}%)
          </span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      {role === 'management' && user && (
        <StudyForm
          open={editOpen}
          onOpenChange={setEditOpen}
          study={study}
          investigators={investigators}
          siteId={siteId}
          onSave={() => setEditOpen(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/study-detail/StudyDetailHeader.tsx
git commit -m "feat: implement StudyDetailHeader with status toggle, edit, and enrollment bar"
```

---

## Task 17: VisitScheduleTab + AssessmentBatteryTab

**Files:**
- Modify: `src/components/study-detail/VisitScheduleTab.tsx` (replace stub)
- Modify: `src/components/study-detail/AssessmentBatteryTab.tsx` (replace stub)

- [ ] **Step 1: Replace `VisitScheduleTab` stub**

```typescript
import { useState } from 'react'
import { updateStudy } from '@/lib/studies'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProtocolUpload } from '@/components/protocol-parser/ProtocolUpload'
import { ProtocolReviewTable } from '@/components/protocol-parser/ProtocolReviewTable'
import type { Study, VisitScheduleEntry } from '@/types'
import type { ParsedProtocol } from '@/lib/protocolParser'
import { Plus, Trash2 } from 'lucide-react'

interface Props {
  study: Study
  canEdit: boolean
}

export function VisitScheduleTab({ study, canEdit }: Props) {
  const [rows, setRows] = useState<VisitScheduleEntry[]>(study.visitSchedule)
  const [saving, setSaving] = useState(false)
  const [parsed, setParsed] = useState<ParsedProtocol | null>(null)
  const [parseError, setParseError] = useState('')
  const dirty = JSON.stringify(rows) !== JSON.stringify(study.visitSchedule)

  function addRow() {
    setRows((r) => [
      ...r,
      {
        visitName: '',
        visitWindow: '',
        investigatorTimeMinutes: 30,
        coordinatorTimeMinutes: 30,
        isInvestigatorRequired: true,
      },
    ])
  }

  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx))
  }

  function updateRow(idx: number, field: keyof VisitScheduleEntry, value: string | number | boolean) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, [field]: value } : row)))
  }

  async function save() {
    setSaving(true)
    try {
      await updateStudy(study.id, { visitSchedule: rows })
    } finally {
      setSaving(false)
    }
  }

  if (parsed) {
    return (
      <ProtocolReviewTable
        parsed={parsed}
        onConfirm={async (visits, battery) => {
          await updateStudy(study.id, { visitSchedule: visits, assessmentBattery: battery, parsedFromProtocol: true })
          setRows(visits)
          setParsed(null)
        }}
        onCancel={() => setParsed(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Visit Schedule</h2>
        {canEdit && (
          <div className="flex items-center gap-2">
            <ProtocolUpload
              onParsed={setParsed}
              onError={setParseError}
            />
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus size={14} className="mr-1" aria-hidden="true" />
              Add Visit
            </Button>
            {dirty && (
              <Button size="sm" onClick={save} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
                {saving ? 'Saving…' : 'Save'}
              </Button>
            )}
          </div>
        )}
      </div>

      {parseError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {parseError}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">
          No visits defined.{canEdit ? ' Add visits manually or upload a protocol PDF.' : ''}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Visit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Window</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Inv. Min</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Coord. Min</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Inv. Required</th>
                {canEdit && <th className="w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-2">
                    {canEdit ? (
                      <Input
                        value={row.visitName}
                        onChange={(e) => updateRow(idx, 'visitName', e.target.value)}
                        className="h-7 text-sm"
                      />
                    ) : row.visitName}
                  </td>
                  <td className="px-4 py-2">
                    {canEdit ? (
                      <Input
                        value={row.visitWindow}
                        onChange={(e) => updateRow(idx, 'visitWindow', e.target.value)}
                        className="h-7 text-sm w-28"
                      />
                    ) : row.visitWindow}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {canEdit ? (
                      <Input
                        type="number"
                        value={row.investigatorTimeMinutes}
                        onChange={(e) => updateRow(idx, 'investigatorTimeMinutes', Number(e.target.value))}
                        className="h-7 text-sm w-20 text-right"
                      />
                    ) : row.investigatorTimeMinutes}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {canEdit ? (
                      <Input
                        type="number"
                        value={row.coordinatorTimeMinutes}
                        onChange={(e) => updateRow(idx, 'coordinatorTimeMinutes', Number(e.target.value))}
                        className="h-7 text-sm w-20 text-right"
                      />
                    ) : row.coordinatorTimeMinutes}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {canEdit ? (
                      <input
                        type="checkbox"
                        checked={row.isInvestigatorRequired}
                        onChange={(e) => updateRow(idx, 'isInvestigatorRequired', e.target.checked)}
                        className="rounded border-slate-300"
                      />
                    ) : row.isInvestigatorRequired ? '✓' : '—'}
                  </td>
                  {canEdit && (
                    <td className="px-2 py-2">
                      <button
                        onClick={() => removeRow(idx)}
                        aria-label="Remove visit"
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create stubs for ProtocolUpload + ProtocolReviewTable + protocolParser (required by VisitScheduleTab imports)**

`src/lib/protocolParser.ts` (stub — replaced in Task 21):
```typescript
import type { VisitScheduleEntry } from '@/types'

export interface ParsedProtocol {
  visits: VisitScheduleEntry[]
  assessmentBattery: Record<string, string[]>
  confidence: Record<string, 'high' | 'medium' | 'low'>
}

export async function parseProtocolPdf(_pdfBase64: string): Promise<ParsedProtocol> {
  throw new Error('Not implemented — install @anthropic-ai/sdk first (Task 21)')
}
```

`src/components/protocol-parser/ProtocolUpload.tsx` (stub — replaced in Task 22):
```typescript
import type { ParsedProtocol } from '@/lib/protocolParser'

interface Props {
  onParsed: (result: ParsedProtocol) => void
  onError: (msg: string) => void
}

export function ProtocolUpload(_props: Props) {
  return <button disabled className="text-xs text-slate-400 border border-dashed border-slate-300 rounded px-3 py-1.5">Upload PDF (coming in Task 22)</button>
}
```

`src/components/protocol-parser/ProtocolReviewTable.tsx` (stub — replaced in Task 22):
```typescript
import type { ParsedProtocol } from '@/lib/protocolParser'
import type { VisitScheduleEntry } from '@/types'

interface Props {
  parsed: ParsedProtocol
  onConfirm: (visits: VisitScheduleEntry[], battery: Record<string, string[]>) => void
  onCancel: () => void
}

export function ProtocolReviewTable(_props: Props) {
  return <div data-stub="ProtocolReviewTable" />
}
```

- [ ] **Step 3: Replace `AssessmentBatteryTab` stub**

```typescript
import { useState } from 'react'
import { updateStudy } from '@/lib/studies'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SCALE_NAMES } from '@/lib/scaleDefaults'
import type { Study } from '@/types'
import { Plus, Trash2, X } from 'lucide-react'

interface Props {
  study: Study
  canEdit: boolean
}

export function AssessmentBatteryTab({ study, canEdit }: Props) {
  const [battery, setBattery] = useState<Record<string, string[]>>(study.assessmentBattery)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(battery) !== JSON.stringify(study.assessmentBattery)

  const visitNames = study.visitSchedule.map((v) => v.visitName).filter(Boolean)

  function addScale(visitName: string, scale: string) {
    if (!scale.trim()) return
    setBattery((b) => ({
      ...b,
      [visitName]: [...(b[visitName] ?? []), scale.trim()],
    }))
  }

  function removeScale(visitName: string, scaleIdx: number) {
    setBattery((b) => ({
      ...b,
      [visitName]: (b[visitName] ?? []).filter((_, i) => i !== scaleIdx),
    }))
  }

  async function save() {
    setSaving(true)
    try {
      await updateStudy(study.id, { assessmentBattery: battery })
    } finally {
      setSaving(false)
    }
  }

  if (visitNames.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-8 text-center">
        Define visits in the Visit Schedule tab before adding assessments.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Assessment Battery</h2>
        {canEdit && dirty && (
          <Button size="sm" onClick={save} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {visitNames.map((visitName) => {
          const scales = battery[visitName] ?? []
          return (
            <div key={visitName} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-2">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">{visitName}</h3>
              <div className="flex flex-wrap gap-2">
                {scales.map((scale, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2.5 py-1"
                  >
                    {scale}
                    {canEdit && (
                      <button onClick={() => removeScale(visitName, idx)} aria-label={`Remove ${scale}`}>
                        <X size={10} aria-hidden="true" />
                      </button>
                    )}
                  </span>
                ))}
                {scales.length === 0 && (
                  <span className="text-xs text-slate-400">No assessments</span>
                )}
              </div>
              {canEdit && (
                <AddScaleInput onAdd={(scale) => addScale(visitName, scale)} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AddScaleInput({ onAdd }: { onAdd: (scale: string) => void }) {
  const [value, setValue] = useState('')

  return (
    <div className="flex items-center gap-2 mt-1">
      <datalist id="scale-suggestions">
        {SCALE_NAMES.map((s) => <option key={s} value={s} />)}
      </datalist>
      <Input
        list="scale-suggestions"
        placeholder="Add scale…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) {
            onAdd(value.trim())
            setValue('')
          }
        }}
        className="h-7 text-sm w-48"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => { if (value.trim()) { onAdd(value.trim()); setValue('') } }}
        className="h-7 px-2"
      >
        <Plus size={12} aria-hidden="true" />
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/study-detail/VisitScheduleTab.tsx src/components/study-detail/AssessmentBatteryTab.tsx src/lib/protocolParser.ts src/components/protocol-parser/
git commit -m "feat: implement VisitScheduleTab and AssessmentBatteryTab with inline editing"
```

---

## Task 18: InvestigatorsTab + EnrollmentTab

**Files:**
- Modify: `src/components/study-detail/InvestigatorsTab.tsx` (replace stub)
- Modify: `src/components/study-detail/EnrollmentTab.tsx` (replace stub)

- [ ] **Step 1: Replace `InvestigatorsTab` stub**

```typescript
import { useState } from 'react'
import { updateStudy } from '@/lib/studies'
import { Button } from '@/components/ui/button'
import type { Investigator, InvestigatorRole, Study, StudyInvestigator } from '@/types'
import { UserPlus, Trash2 } from 'lucide-react'

interface Props {
  study: Study
  investigators: Investigator[]
  canEdit: boolean
}

const ROLES: InvestigatorRole[] = ['PI', 'Sub-I', 'Provider']

export function InvestigatorsTab({ study, investigators, canEdit }: Props) {
  const [assignments, setAssignments] = useState<StudyInvestigator[]>(study.assignedInvestigators)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(assignments) !== JSON.stringify(study.assignedInvestigators)

  const invMap = Object.fromEntries(investigators.map((i) => [i.id, i]))
  const assignedIds = assignments.map((a) => a.investigatorId)
  const available = investigators.filter((i) => !assignedIds.includes(i.id))

  function addInvestigator(investigatorId: string) {
    setAssignments((a) => [...a, { investigatorId, role: 'Sub-I' }])
  }

  function updateRole(idx: number, role: InvestigatorRole) {
    setAssignments((a) => a.map((item, i) => (i === idx ? { ...item, role } : item)))
  }

  function remove(idx: number) {
    setAssignments((a) => a.filter((_, i) => i !== idx))
  }

  async function save() {
    setSaving(true)
    try {
      await updateStudy(study.id, { assignedInvestigators: assignments })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Investigators</h2>
        <div className="flex items-center gap-2">
          {canEdit && available.length > 0 && (
            <select
              onChange={(e) => { if (e.target.value) { addInvestigator(e.target.value); e.target.value = '' } }}
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600"
            >
              <option value="">Add investigator…</option>
              {available.map((inv) => (
                <option key={inv.id} value={inv.id}>{inv.name}</option>
              ))}
            </select>
          )}
          {canEdit && dirty && (
            <Button size="sm" onClick={save} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Credentials</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role on Study</th>
              {canEdit && <th className="w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {assignments.map((a, idx) => {
              const inv = invMap[a.investigatorId]
              return (
                <tr key={a.investigatorId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    {inv?.name ?? a.investigatorId}
                    {a.investigatorId === study.piId && (
                      <span className="ml-2 text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2 py-0.5">PI</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{inv?.credentials ?? '—'}</td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <select
                        value={a.role}
                        onChange={(e) => updateRole(idx, e.target.value as InvestigatorRole)}
                        className="h-7 rounded border border-slate-200 bg-white px-2 text-xs dark:bg-slate-800 dark:border-slate-700"
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : a.role}
                  </td>
                  {canEdit && (
                    <td className="px-2">
                      <button
                        onClick={() => remove(idx)}
                        aria-label={`Remove ${inv?.name ?? a.investigatorId}`}
                        disabled={a.investigatorId === study.piId}
                        className="text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </td>
                  )}
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

- [ ] **Step 2: Replace `EnrollmentTab` stub**

```typescript
import { useState } from 'react'
import { updateEnrollmentData } from '@/lib/studies'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { EnrollmentData, Study } from '@/types'

interface Props {
  study: Study
  canEdit: boolean
}

function conversionRate(numerator: number, denominator: number): string {
  if (denominator === 0) return '—'
  return `${Math.round((numerator / denominator) * 100)}%`
}

export function EnrollmentTab({ study, canEdit }: Props) {
  const data = study.enrollmentData ?? {
    prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0,
  }
  const [form, setForm] = useState<EnrollmentData>(data)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(form) !== JSON.stringify(data)

  function set(field: keyof EnrollmentData, value: string) {
    setForm((f) => ({ ...f, [field]: Number(value) || 0 }))
  }

  async function save() {
    setSaving(true)
    try {
      await updateEnrollmentData(study.id, form)
    } finally {
      setSaving(false)
    }
  }

  const stages: { label: string; key: keyof EnrollmentData; value: number }[] = [
    { label: 'Prescreens', key: 'prescreens', value: form.prescreens },
    { label: 'Screens', key: 'screens', value: form.screens },
    { label: 'Randomizations', key: 'randomizations', value: form.randomizations },
    { label: 'Active', key: 'active', value: form.active },
    { label: 'Completions', key: 'completions', value: form.completions },
  ]

  const maxValue = Math.max(...stages.map((s) => s.value), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Enrollment Funnel</h2>
        {canEdit && dirty && (
          <Button size="sm" onClick={save} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {stages.map((stage, idx) => (
          <div key={stage.key} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-2 text-center">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{stage.label}</p>
            {canEdit ? (
              <Input
                type="number"
                min="0"
                value={form[stage.key]}
                onChange={(e) => set(stage.key, e.target.value)}
                className="text-center text-2xl font-bold h-12 tabular-nums"
              />
            ) : (
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {stage.value}
              </p>
            )}
            <div
              className="h-1.5 rounded-full bg-teal-500 mx-auto"
              style={{ width: `${Math.round((stage.value / maxValue) * 100)}%`, minWidth: stage.value > 0 ? '8px' : '0' }}
            />
            {idx > 0 && (
              <p className="text-xs text-slate-400">
                {conversionRate(stage.value, stages[idx - 1].value)} from prev
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs text-slate-400">Screen Failure Rate</p>
          <p className="font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
            {conversionRate(form.screens - form.randomizations, form.screens)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Randomization Rate</p>
          <p className="font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
            {conversionRate(form.randomizations, form.screens)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Enrollment Progress</p>
          <p className="font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
            {conversionRate(form.randomizations, study.targetEnrollment)}
          </p>
        </div>
      </div>

      {canEdit && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {stages.map((stage) => (
            <div key={stage.key} className="space-y-1">
              <Label htmlFor={`enroll-${stage.key}`} className="text-xs">{stage.label}</Label>
              <Input
                id={`enroll-${stage.key}`}
                type="number"
                min="0"
                value={form[stage.key]}
                onChange={(e) => set(stage.key, e.target.value)}
                className="h-8 text-sm tabular-nums"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/study-detail/InvestigatorsTab.tsx src/components/study-detail/EnrollmentTab.tsx
git commit -m "feat: implement InvestigatorsTab and EnrollmentTab with funnel and conversion rates"
```

---

## Task 19: DelegationLogTab

**Files:**
- Modify: `src/components/study-detail/DelegationLogTab.tsx` (replace stub)

- [ ] **Step 1: Replace the stub**

```typescript
import { useState } from 'react'
import { useDelegationLog } from '@/hooks/useDelegationLog'
import { createDelegationEntry, deleteDelegationEntry } from '@/lib/delegationLog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { Investigator } from '@/types'
import { Plus, Trash2 } from 'lucide-react'

interface Props {
  studyId: string
  investigators: Investigator[]
  canEdit: boolean
}

interface NewEntryForm {
  investigatorId: string
  delegatedTasks: string
  effectiveDate: string
}

const EMPTY_FORM: NewEntryForm = { investigatorId: '', delegatedTasks: '', effectiveDate: '' }

export function DelegationLogTab({ studyId, investigators, canEdit }: Props) {
  const { entries, loading } = useDelegationLog(studyId)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<NewEntryForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<NewEntryForm>>({})

  const invMap = Object.fromEntries(investigators.map((i) => [i.id, i]))

  function set(field: keyof NewEntryForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function handleAdd() {
    const next: typeof errors = {}
    if (!form.investigatorId) next.investigatorId = 'Required'
    if (!form.delegatedTasks.trim()) next.delegatedTasks = 'Required'
    if (!form.effectiveDate) next.effectiveDate = 'Required'
    if (Object.keys(next).length) { setErrors(next); return }

    setSaving(true)
    try {
      await createDelegationEntry({
        investigatorId: form.investigatorId,
        studyId,
        delegatedTasks: form.delegatedTasks.split(',').map((t) => t.trim()).filter(Boolean),
        effectiveDate: form.effectiveDate,
        source: 'manual',
      })
      setForm(EMPTY_FORM)
      setShowAdd(false)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="space-y-2">{[1, 2].map((n) => <Skeleton key={n} className="h-10 w-full" />)}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Delegation Log</h2>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setShowAdd((s) => !s)}>
            <Plus size={14} className="mr-1" aria-hidden="true" />
            Add Entry
          </Button>
        )}
      </div>

      {showAdd && canEdit && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="dl-inv" className="text-xs">Investigator *</Label>
              <select
                id="dl-inv"
                value={form.investigatorId}
                onChange={(e) => set('investigatorId', e.target.value)}
                className="w-full h-8 rounded-md border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600"
              >
                <option value="">Select…</option>
                {investigators.map((inv) => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
              </select>
              {errors.investigatorId && <p className="text-xs text-red-600">{errors.investigatorId}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="dl-tasks" className="text-xs">Delegated Tasks * <span className="font-normal text-slate-400">(comma-separated)</span></Label>
              <Input
                id="dl-tasks"
                value={form.delegatedTasks}
                onChange={(e) => set('delegatedTasks', e.target.value)}
                placeholder="Informed consent, Physical exam…"
                className="h-8 text-sm"
              />
              {errors.delegatedTasks && <p className="text-xs text-red-600">{errors.delegatedTasks}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="dl-date" className="text-xs">Effective Date *</Label>
              <Input
                id="dl-date"
                type="date"
                value={form.effectiveDate}
                onChange={(e) => set('effectiveDate', e.target.value)}
                className="h-8 text-sm"
              />
              {errors.effectiveDate && <p className="text-xs text-red-600">{errors.effectiveDate}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM) }}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? 'Saving…' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">No delegation log entries.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Investigator</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Delegated Tasks</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Effective Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Source</th>
                {canEdit && <th className="w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    {invMap[entry.investigatorId]?.name ?? entry.investigatorId}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {entry.delegatedTasks.join(', ')}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-xs">
                    {entry.effectiveDate}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${entry.source === 'manual' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                      {entry.source === 'manual' ? 'Manual' : 'Advarra Import'}
                    </span>
                  </td>
                  {canEdit && entry.source === 'manual' && (
                    <td className="px-2">
                      <button
                        onClick={() => setDeleteId(entry.id)}
                        aria-label="Delete entry"
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </td>
                  )}
                  {canEdit && entry.source !== 'manual' && <td />}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Delete Delegation Entry"
        description="This will permanently remove this delegation log entry."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (deleteId) await deleteDelegationEntry(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/study-detail/DelegationLogTab.tsx
git commit -m "feat: implement DelegationLogTab with manual entry and delete"
```

---

## Task 20: Run All Tests + Verify StudyDetail Renders

- [ ] **Step 1: Run all tests**

```bash
npm test
```
Expected: all existing tests pass (18+).

- [ ] **Step 2: Start dev server and verify StudyDetail renders**

```bash
npm run dev
```

Login as management. Navigate to `/studies`. If the Firestore `studies` collection has data, the table loads. Click any study row → navigates to `/studies/:id`. The detail page renders with:
- Header (name, sponsor, status, enrollment bar)
- Tabs: Visit Schedule, Assessment Battery, Investigators, Enrollment, Delegation Log
- Each tab renders without crashing

Expected: no runtime errors in browser console.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: Phase 2 study management complete — detail page, all 6 tabs implemented"
```

---

## Task 21: Protocol Parser Library

**Files:**
- Modify: `src/lib/protocolParser.ts` (replace stub with full implementation)
- Create: `src/lib/__tests__/protocolParser.test.ts`
- Modify: `.env.example` (add VITE_ANTHROPIC_API_KEY)

**Prerequisite — install SDK:**

```bash
npm install @anthropic-ai/sdk
```

- [ ] **Step 1: Add key to `.env.example`**

Add this line to `.env.example` and `.env.local`:
```
VITE_ANTHROPIC_API_KEY=
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/__tests__/protocolParser.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseProtocolPdf } from '@/lib/protocolParser'

vi.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = vi.fn(() => ({
    messages: {
      create: vi.fn(),
    },
  }))
  return { default: MockAnthropic, Anthropic: MockAnthropic }
})

import Anthropic from '@anthropic-ai/sdk'

const mockResponse = {
  visits: [
    {
      visitName: 'Screening',
      visitWindow: 'Day -28 to -1',
      investigatorTimeMinutes: 45,
      coordinatorTimeMinutes: 60,
      isInvestigatorRequired: true,
    },
  ],
  assessmentBattery: {
    Screening: ['HAMD-17', 'MADRS'],
  },
  confidence: {
    Screening: 'high',
  },
}

describe('parseProtocolPdf', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls Anthropic with a document block and returns parsed result', async () => {
    const mockClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
        }),
      },
    }
    vi.mocked(Anthropic).mockReturnValue(mockClient as any)

    const result = await parseProtocolPdf('base64pdfdata==')

    expect(mockClient.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-6',
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({ type: 'document' }),
            ]),
          }),
        ]),
      }),
    )
    expect(result.visits).toHaveLength(1)
    expect(result.visits[0].visitName).toBe('Screening')
    expect(result.assessmentBattery['Screening']).toContain('HAMD-17')
  })

  it('throws a readable error when Claude returns malformed JSON', async () => {
    const mockClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Sorry, I cannot process this.' }],
        }),
      },
    }
    vi.mocked(Anthropic).mockReturnValue(mockClient as any)

    await expect(parseProtocolPdf('base64data==')).rejects.toThrow(/failed to parse/i)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- protocolParser.test
```
Expected: FAIL.

- [ ] **Step 4: Replace `src/lib/protocolParser.ts` stub with full implementation**

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { VisitScheduleEntry } from '@/types'

export interface ParsedProtocol {
  visits: VisitScheduleEntry[]
  assessmentBattery: Record<string, string[]>
  confidence: Record<string, 'high' | 'medium' | 'low'>
}

const EXTRACTION_PROMPT = `You are a clinical trial protocol analysis assistant. Extract the Schedule of Assessments (SoA) from this protocol PDF.

Return ONLY a JSON object with this exact structure — no markdown, no explanation:
{
  "visits": [
    {
      "visitName": "string (e.g. Screening, Visit 1, Week 4)",
      "visitWindow": "string (e.g. Day -28 to -1, Week 4 ±3 days)",
      "investigatorTimeMinutes": number (estimated investigator time in minutes for this visit),
      "coordinatorTimeMinutes": number (estimated coordinator time in minutes),
      "isInvestigatorRequired": boolean (true if a licensed investigator must be present)
    }
  ],
  "assessmentBattery": {
    "visitName": ["ScaleName1", "ScaleName2"]
  },
  "confidence": {
    "visitName": "high" | "medium" | "low"
  }
}

Rules:
- Include ALL visits (screening, treatment, follow-up, unscheduled)
- For investigatorTimeMinutes: sum the duration of all investigator-required procedures at that visit
- For assessmentBattery: list only the scale/test names (e.g. "HAMD-17", "Physical Exam", "MMSE")
- isInvestigatorRequired: true if any procedure requires MD/APRN sign-off
- confidence: "high" if visit details are clearly stated, "medium" if inferred, "low" if uncertain
- If information is ambiguous, use "medium" confidence and your best estimate`

export async function parseProtocolPdf(pdfBase64: string): Promise<ParsedProtocol> {
  const client = new Anthropic({
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true,
  })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          } as Parameters<typeof client.messages.create>[0]['messages'][0]['content'][0],
          {
            type: 'text',
            text: EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Failed to parse protocol: no text response from Claude')
  }

  let raw = textBlock.text.trim()
  // Strip markdown code fences if present
  raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')

  try {
    const parsed = JSON.parse(raw) as ParsedProtocol
    if (!Array.isArray(parsed.visits)) {
      throw new Error('Missing visits array')
    }
    return parsed
  } catch {
    throw new Error(`Failed to parse protocol: Claude returned unexpected format`)
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- protocolParser.test
```
Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/protocolParser.ts src/lib/__tests__/protocolParser.test.ts .env.example package.json package-lock.json
git commit -m "feat: add Claude-powered protocol PDF parser with SoA extraction"
```

---

## Task 22: ProtocolUpload + ProtocolReviewTable (Full Implementation)

**Files:**
- Modify: `src/components/protocol-parser/ProtocolUpload.tsx` (replace stub)
- Modify: `src/components/protocol-parser/ProtocolReviewTable.tsx` (replace stub)

- [ ] **Step 1: Replace `ProtocolUpload.tsx` stub**

```typescript
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { parseProtocolPdf, type ParsedProtocol } from '@/lib/protocolParser'
import { FileText, Loader2 } from 'lucide-react'

interface Props {
  onParsed: (result: ParsedProtocol) => void
  onError: (msg: string) => void
}

export function ProtocolUpload({ onParsed, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  async function handleFile(file: File) {
    if (file.type !== 'application/pdf') {
      onError('Please upload a PDF file.')
      return
    }
    setLoading(true)
    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      const binary = Array.from(bytes).map((b) => String.fromCharCode(b)).join('')
      const base64 = btoa(binary)
      const result = await parseProtocolPdf(base64)
      onParsed(result)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Protocol parsing failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? (
          <>
            <Loader2 size={14} className="mr-1.5 animate-spin" aria-hidden="true" />
            Parsing PDF…
          </>
        ) : (
          <>
            <FileText size={14} className="mr-1.5" aria-hidden="true" />
            Upload Protocol PDF
          </>
        )}
      </Button>
    </>
  )
}
```

- [ ] **Step 2: Replace `ProtocolReviewTable.tsx` stub**

```typescript
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ParsedProtocol } from '@/lib/protocolParser'
import type { VisitScheduleEntry } from '@/types'

interface Props {
  parsed: ParsedProtocol
  onConfirm: (visits: VisitScheduleEntry[], battery: Record<string, string[]>) => void | Promise<void>
  onCancel: () => void
}

const CONFIDENCE_STYLES = {
  high: 'text-green-700 bg-green-50 border border-green-200',
  medium: 'text-amber-700 bg-amber-50 border border-amber-200',
  low: 'text-red-700 bg-red-50 border border-red-200',
}

export function ProtocolReviewTable({ parsed, onConfirm, onCancel }: Props) {
  const [visits, setVisits] = useState<VisitScheduleEntry[]>(parsed.visits)
  const [battery, setBattery] = useState<Record<string, string[]>>(parsed.assessmentBattery)
  const [saving, setSaving] = useState(false)

  function updateVisit(idx: number, field: keyof VisitScheduleEntry, value: string | number | boolean) {
    setVisits((v) => v.map((row, i) => (i === idx ? { ...row, [field]: value } : row)))
  }

  async function handleConfirm() {
    setSaving(true)
    try {
      await onConfirm(visits, battery)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Review Extracted Protocol
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and edit the extracted schedule before saving. Amber/red rows have lower confidence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {saving ? 'Saving…' : `Confirm ${visits.length} Visits`}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Confidence</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Visit Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Window</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Inv. Min</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Coord. Min</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Inv. Req.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Assessments</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {visits.map((visit, idx) => {
              const conf = parsed.confidence[visit.visitName] ?? 'high'
              const rowBg = conf === 'high' ? '' : conf === 'medium' ? 'bg-amber-50/30' : 'bg-red-50/30'
              const assessments = battery[visit.visitName] ?? []

              return (
                <tr key={idx} className={`${rowBg} hover:bg-slate-50 dark:hover:bg-slate-700/50`}>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CONFIDENCE_STYLES[conf]}`}>
                      {conf}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      value={visit.visitName}
                      onChange={(e) => updateVisit(idx, 'visitName', e.target.value)}
                      className="h-7 text-sm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      value={visit.visitWindow}
                      onChange={(e) => updateVisit(idx, 'visitWindow', e.target.value)}
                      className="h-7 text-sm w-32"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      value={visit.investigatorTimeMinutes}
                      onChange={(e) => updateVisit(idx, 'investigatorTimeMinutes', Number(e.target.value))}
                      className="h-7 text-sm w-20 text-right"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      value={visit.coordinatorTimeMinutes}
                      onChange={(e) => updateVisit(idx, 'coordinatorTimeMinutes', Number(e.target.value))}
                      className="h-7 text-sm w-20 text-right"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={visit.isInvestigatorRequired}
                      onChange={(e) => updateVisit(idx, 'isInvestigatorRequired', e.target.checked)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {assessments.length > 0 ? assessments.join(', ') : '—'}
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

- [ ] **Step 3: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/protocol-parser/
git commit -m "feat: implement ProtocolUpload and ProtocolReviewTable for PDF → SoA extraction"
```

---

## Task 23: VisitLogForm

**Files:**
- Create: `src/components/workload/VisitLogForm.tsx`
- Create: `src/components/workload/__tests__/VisitLogForm.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/workload/__tests__/VisitLogForm.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VisitLogForm } from '@/components/workload/VisitLogForm'
import type { Investigator, Study } from '@/types'

vi.mock('@/lib/visits', () => ({ createVisit: vi.fn() }))
import * as visitsLib from '@/lib/visits'

const investigator: Investigator = {
  id: 'inv-1', name: 'Dr. Wilson', credentials: 'MD', role: 'PI',
  siteId: 'tampa', weeklyCapacityHours: 40, siteBaselinePct: 15, assignedStudies: [],
}

const study: Study = {
  id: 'study-1', name: 'Study Alpha', sponsor: 'P', sponsorProtocolId: '',
  therapeuticArea: 'Psychiatry', phase: 'Phase II', status: 'enrolling',
  siteId: 'tampa', piId: 'inv-1', assignedInvestigators: [{ investigatorId: 'inv-1', role: 'PI' }],
  targetEnrollment: 20, startDate: '', expectedEndDate: '',
  visitSchedule: [{ visitName: 'Screening', visitWindow: '', investigatorTimeMinutes: 45, coordinatorTimeMinutes: 60, isInvestigatorRequired: true }],
  assessmentBattery: {}, adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
  parsedFromProtocol: false, enrollmentData: { prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0 }, statusHistory: [],
}

describe('VisitLogForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders study, investigator, and visit type selectors', () => {
    render(<VisitLogForm studies={[study]} investigators={[investigator]} siteId="tampa" onSaved={vi.fn()} />)
    expect(screen.getByLabelText(/study/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/investigator/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/participant id/i)).toBeInTheDocument()
  })

  it('shows validation error when participant ID is missing', async () => {
    render(<VisitLogForm studies={[study]} investigators={[investigator]} siteId="tampa" onSaved={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /log visit/i }))
    expect(screen.getByText(/participant id is required/i)).toBeInTheDocument()
  })

  it('calls createVisit and onSaved on valid submit', async () => {
    vi.mocked(visitsLib.createVisit).mockResolvedValue('v-1')
    const onSaved = vi.fn()

    render(<VisitLogForm studies={[study]} investigators={[investigator]} siteId="tampa" onSaved={onSaved} />)

    const studySel = screen.getByLabelText(/study/i)
    await userEvent.selectOptions(studySel, 'study-1')

    const invSel = screen.getByLabelText(/investigator/i)
    await userEvent.selectOptions(invSel, 'inv-1')

    await userEvent.type(screen.getByLabelText(/participant id/i), 'P001')

    await userEvent.click(screen.getByRole('button', { name: /log visit/i }))

    await waitFor(() => {
      expect(visitsLib.createVisit).toHaveBeenCalled()
      expect(onSaved).toHaveBeenCalledTimes(1)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- VisitLogForm.test
```
Expected: FAIL.

- [ ] **Step 3: Create `src/components/workload/VisitLogForm.tsx`**

```typescript
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createVisit } from '@/lib/visits'
import type { Investigator, Study, VisitStatus } from '@/types'

interface Props {
  studies: Study[]
  investigators: Investigator[]
  siteId: string
  preselectedStudyId?: string
  onSaved: () => void
}

const STATUSES: VisitStatus[] = ['completed', 'scheduled', 'missed', 'no_show']

interface FormState {
  studyId: string
  investigatorId: string
  participantId: string
  visitType: string
  scheduledDate: string
  status: VisitStatus
  actualDurationMinutes: string
}

export function VisitLogForm({
  studies,
  investigators,
  siteId,
  preselectedStudyId,
  onSaved,
}: Props) {
  const [form, setForm] = useState<FormState>({
    studyId: preselectedStudyId ?? '',
    investigatorId: '',
    participantId: '',
    visitType: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    status: 'completed',
    actualDurationMinutes: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const selectedStudy = studies.find((s) => s.id === form.studyId)
  const visitTypes = selectedStudy?.visitSchedule.map((v) => v.visitName) ?? []
  const defaultDuration =
    selectedStudy?.visitSchedule.find((v) => v.visitName === form.visitType)
      ?.investigatorTimeMinutes ?? 30

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function handleSubmit() {
    const next: typeof errors = {}
    if (!form.studyId) next.studyId = 'Study is required'
    if (!form.investigatorId) next.investigatorId = 'Investigator is required'
    if (!form.participantId.trim()) next.participantId = 'Participant ID is required'
    if (!form.scheduledDate) next.scheduledDate = 'Date is required'
    if (Object.keys(next).length) { setErrors(next); return }

    setLoading(true)
    try {
      await createVisit({
        participantId: form.participantId.trim(),
        studyId: form.studyId,
        investigatorId: form.investigatorId,
        siteId,
        visitType: form.visitType || 'Unspecified',
        scheduledDate: form.scheduledDate,
        completedDate: form.status === 'completed' ? form.scheduledDate : null,
        status: form.status,
        durationMinutes: defaultDuration,
        actualDurationMinutes: form.actualDurationMinutes ? Number(form.actualDurationMinutes) : null,
        source: 'manual',
      })
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setForm((f) => ({ ...f, participantId: '', visitType: '', actualDurationMinutes: '' }))
        onSaved()
      }, 1500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Log Visit</h2>

      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          Visit logged successfully.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="vl-study">Study *</Label>
          <select
            id="vl-study"
            value={form.studyId}
            onChange={(e) => set('studyId', e.target.value)}
            className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="">Select study…</option>
            {studies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {errors.studyId && <p className="text-xs text-red-600">{errors.studyId}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="vl-inv">Investigator *</Label>
          <select
            id="vl-inv"
            value={form.investigatorId}
            onChange={(e) => set('investigatorId', e.target.value)}
            className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="">Select investigator…</option>
            {investigators.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          {errors.investigatorId && <p className="text-xs text-red-600">{errors.investigatorId}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="vl-pid">Participant ID *</Label>
          <Input
            id="vl-pid"
            value={form.participantId}
            onChange={(e) => set('participantId', e.target.value)}
            placeholder="e.g. P001"
            className="font-mono"
          />
          {errors.participantId && <p className="text-xs text-red-600">{errors.participantId}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="vl-visittype">Visit Type</Label>
          <select
            id="vl-visittype"
            value={form.visitType}
            onChange={(e) => set('visitType', e.target.value)}
            className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="">Select visit type…</option>
            {visitTypes.map((vt) => <option key={vt} value={vt}>{vt}</option>)}
            <option value="Unscheduled">Unscheduled</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="vl-date">Date *</Label>
          <Input
            id="vl-date"
            type="date"
            value={form.scheduledDate}
            onChange={(e) => set('scheduledDate', e.target.value)}
          />
          {errors.scheduledDate && <p className="text-xs text-red-600">{errors.scheduledDate}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="vl-status">Status</Label>
          <select
            id="vl-status"
            value={form.status}
            onChange={(e) => set('status', e.target.value as VisitStatus)}
            className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="vl-duration">
            Actual Duration (min) <span className="text-slate-400 font-normal text-xs">optional override</span>
          </Label>
          <Input
            id="vl-duration"
            type="number"
            min="1"
            value={form.actualDurationMinutes}
            onChange={(e) => set('actualDurationMinutes', e.target.value)}
            placeholder={String(defaultDuration)}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={loading || success}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          {loading ? 'Logging…' : 'Log Visit'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- VisitLogForm.test
```
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/workload/VisitLogForm.tsx src/components/workload/__tests__/VisitLogForm.test.tsx
git commit -m "feat: add VisitLogForm with validation and Firestore write"
```

---

## Task 24: BulkVisitLogForm

**Files:**
- Create: `src/components/workload/BulkVisitLogForm.tsx`
- Create: `src/components/workload/__tests__/BulkVisitLogForm.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/workload/__tests__/BulkVisitLogForm.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BulkVisitLogForm } from '@/components/workload/BulkVisitLogForm'
import type { Investigator, Study } from '@/types'

vi.mock('@/lib/visits', () => ({ createVisitBatch: vi.fn() }))
import * as visitsLib from '@/lib/visits'

const investigator: Investigator = {
  id: 'inv-1', name: 'Dr. Wilson', credentials: 'MD', role: 'PI',
  siteId: 'tampa', weeklyCapacityHours: 40, siteBaselinePct: 15, assignedStudies: [],
}

const study: Study = {
  id: 'study-1', name: 'Study Alpha', sponsor: 'P', sponsorProtocolId: '',
  therapeuticArea: 'Psychiatry', phase: 'Phase II', status: 'enrolling',
  siteId: 'tampa', piId: 'inv-1', assignedInvestigators: [{ investigatorId: 'inv-1', role: 'PI' }],
  targetEnrollment: 20, startDate: '', expectedEndDate: '',
  visitSchedule: [{ visitName: 'Visit 3', visitWindow: '', investigatorTimeMinutes: 30, coordinatorTimeMinutes: 30, isInvestigatorRequired: true }],
  assessmentBattery: {}, adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
  parsedFromProtocol: false, enrollmentData: { prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0 }, statusHistory: [],
}

describe('BulkVisitLogForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders study selector and Add Participant button', () => {
    render(<BulkVisitLogForm studies={[study]} investigators={[investigator]} siteId="tampa" onSaved={vi.fn()} />)
    expect(screen.getByLabelText(/study/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add participant/i })).toBeInTheDocument()
  })

  it('adds a participant row when Add Participant is clicked', async () => {
    render(<BulkVisitLogForm studies={[study]} investigators={[investigator]} siteId="tampa" onSaved={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /add participant/i }))
    expect(screen.getAllByPlaceholderText(/P\d+/i).length).toBeGreaterThan(0)
  })

  it('calls createVisitBatch with all participant rows on submit', async () => {
    vi.mocked(visitsLib.createVisitBatch).mockResolvedValue(undefined)
    const onSaved = vi.fn()

    render(<BulkVisitLogForm studies={[study]} investigators={[investigator]} siteId="tampa" onSaved={onSaved} />)

    await userEvent.selectOptions(screen.getByLabelText(/study/i), 'study-1')
    await userEvent.selectOptions(screen.getByLabelText(/investigator/i), 'inv-1')

    await userEvent.click(screen.getByRole('button', { name: /add participant/i }))
    await userEvent.click(screen.getByRole('button', { name: /add participant/i }))

    const pidInputs = screen.getAllByPlaceholderText(/P\d+/i)
    await userEvent.type(pidInputs[0], 'P001')
    await userEvent.type(pidInputs[1], 'P002')

    await userEvent.click(screen.getByRole('button', { name: /log \d+ visits?/i }))

    await waitFor(() => {
      expect(visitsLib.createVisitBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ participantId: 'P001' }),
          expect.objectContaining({ participantId: 'P002' }),
        ]),
      )
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- BulkVisitLogForm.test
```
Expected: FAIL.

- [ ] **Step 3: Create `src/components/workload/BulkVisitLogForm.tsx`**

```typescript
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createVisitBatch } from '@/lib/visits'
import type { Investigator, Study, VisitStatus } from '@/types'
import { Plus, Trash2 } from 'lucide-react'

interface ParticipantRow {
  participantId: string
  status: VisitStatus
  actualDurationMinutes: string
}

interface Props {
  studies: Study[]
  investigators: Investigator[]
  siteId: string
  onSaved: () => void
}

const STATUSES: VisitStatus[] = ['completed', 'scheduled', 'missed', 'no_show']

export function BulkVisitLogForm({ studies, investigators, siteId, onSaved }: Props) {
  const [studyId, setStudyId] = useState('')
  const [investigatorId, setInvestigatorId] = useState('')
  const [visitType, setVisitType] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [rows, setRows] = useState<ParticipantRow[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)

  const selectedStudy = studies.find((s) => s.id === studyId)
  const visitTypes = selectedStudy?.visitSchedule.map((v) => v.visitName) ?? []
  const defaultDuration =
    selectedStudy?.visitSchedule.find((v) => v.visitName === visitType)
      ?.investigatorTimeMinutes ?? 30

  function addRow() {
    setRows((r) => [...r, { participantId: '', status: 'completed', actualDurationMinutes: '' }])
  }

  function updateRow(idx: number, field: keyof ParticipantRow, value: string) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, [field]: value } : row)))
  }

  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx))
  }

  async function handleSubmit() {
    const next: Record<string, string> = {}
    if (!studyId) next.studyId = 'Study is required'
    if (!investigatorId) next.investigatorId = 'Investigator is required'
    if (!date) next.date = 'Date is required'
    if (rows.length === 0) next.rows = 'Add at least one participant'

    rows.forEach((row, idx) => {
      if (!row.participantId.trim()) next[`pid-${idx}`] = 'Required'
    })

    if (Object.keys(next).length) { setErrors(next); return }

    setLoading(true)
    try {
      const visits = rows.map((row) => ({
        participantId: row.participantId.trim(),
        studyId,
        investigatorId,
        siteId,
        visitType: visitType || 'Unspecified',
        scheduledDate: date,
        completedDate: row.status === 'completed' ? date : null,
        status: row.status as VisitStatus,
        durationMinutes: defaultDuration,
        actualDurationMinutes: row.actualDurationMinutes ? Number(row.actualDurationMinutes) : null,
        source: 'manual' as const,
      }))
      await createVisitBatch(visits)
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setRows([])
        onSaved()
      }, 1500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Bulk Visit Log</h2>

      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {rows.length} visit{rows.length !== 1 ? 's' : ''} logged successfully.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label htmlFor="bvl-study">Study *</Label>
          <select
            id="bvl-study"
            value={studyId}
            onChange={(e) => { setStudyId(e.target.value); setVisitType('') }}
            className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="">Select study…</option>
            {studies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {errors.studyId && <p className="text-xs text-red-600">{errors.studyId}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="bvl-inv">Investigator *</Label>
          <select
            id="bvl-inv"
            value={investigatorId}
            onChange={(e) => setInvestigatorId(e.target.value)}
            className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="">Select investigator…</option>
            {investigators.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          {errors.investigatorId && <p className="text-xs text-red-600">{errors.investigatorId}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="bvl-visittype">Visit Type</Label>
          <select
            id="bvl-visittype"
            value={visitType}
            onChange={(e) => setVisitType(e.target.value)}
            className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="">Select visit…</option>
            {visitTypes.map((vt) => <option key={vt} value={vt}>{vt}</option>)}
            <option value="Unscheduled">Unscheduled</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="bvl-date">Date *</Label>
          <Input id="bvl-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {errors.date && <p className="text-xs text-red-600">{errors.date}</p>}
        </div>
      </div>

      {errors.rows && <p className="text-xs text-red-600">{errors.rows}</p>}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Participant ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Actual Duration (min)</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2">
                    <Input
                      value={row.participantId}
                      onChange={(e) => updateRow(idx, 'participantId', e.target.value)}
                      placeholder={`P${String(idx + 1).padStart(3, '0')}`}
                      className={`h-7 text-sm font-mono ${errors[`pid-${idx}`] ? 'border-red-500' : ''}`}
                    />
                    {errors[`pid-${idx}`] && <p className="text-xs text-red-600">{errors[`pid-${idx}`]}</p>}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.status}
                      onChange={(e) => updateRow(idx, 'status', e.target.value)}
                      className="h-7 rounded border border-slate-200 bg-white px-2 text-xs dark:bg-slate-800 dark:border-slate-700"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="1"
                      value={row.actualDurationMinutes}
                      onChange={(e) => updateRow(idx, 'actualDurationMinutes', e.target.value)}
                      placeholder={String(defaultDuration)}
                      className="h-7 text-sm w-24"
                    />
                  </td>
                  <td className="px-2">
                    <button
                      onClick={() => removeRow(idx)}
                      aria-label="Remove row"
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus size={14} className="mr-1" aria-hidden="true" />
          Add Participant
        </Button>
        {rows.length > 0 && (
          <Button
            onClick={handleSubmit}
            disabled={loading || success}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {loading ? 'Logging…' : `Log ${rows.length} Visit${rows.length !== 1 ? 's' : ''}`}
          </Button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- BulkVisitLogForm.test
```
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/workload/BulkVisitLogForm.tsx src/components/workload/__tests__/BulkVisitLogForm.test.tsx
git commit -m "feat: add BulkVisitLogForm for logging multiple participant visits in one submit"
```

---

## Task 25: AssessmentLogForm

**Files:**
- Create: `src/components/workload/AssessmentLogForm.tsx`

- [ ] **Step 1: Create `src/components/workload/AssessmentLogForm.tsx`**

```typescript
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createAssessment } from '@/lib/assessments'
import { SCALE_NAMES, getScaleDuration } from '@/lib/scaleDefaults'
import type { Investigator, Study } from '@/types'

interface Props {
  studies: Study[]
  investigators: Investigator[]
  siteId: string
  onSaved: () => void
}

interface FormState {
  studyId: string
  investigatorId: string
  participantId: string
  scaleType: string
  date: string
  durationMinutes: string
}

export function AssessmentLogForm({ studies, investigators, siteId, onSaved }: Props) {
  const [form, setForm] = useState<FormState>({
    studyId: '',
    investigatorId: '',
    participantId: '',
    scaleType: '',
    date: new Date().toISOString().split('T')[0],
    durationMinutes: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function set(field: keyof FormState, value: string) {
    const next = { ...form, [field]: value }
    if (field === 'scaleType' && value) {
      next.durationMinutes = String(getScaleDuration(value))
    }
    setForm(next)
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function handleSubmit() {
    const next: typeof errors = {}
    if (!form.studyId) next.studyId = 'Study is required'
    if (!form.investigatorId) next.investigatorId = 'Investigator is required'
    if (!form.participantId.trim()) next.participantId = 'Participant ID is required'
    if (!form.scaleType.trim()) next.scaleType = 'Scale type is required'
    if (!form.date) next.date = 'Date is required'
    if (Object.keys(next).length) { setErrors(next); return }

    setLoading(true)
    try {
      await createAssessment({
        investigatorId: form.investigatorId,
        studyId: form.studyId,
        siteId,
        visitId: null,
        scaleType: form.scaleType.trim(),
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : getScaleDuration(form.scaleType),
        date: form.date,
      })
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setForm((f) => ({ ...f, participantId: '', scaleType: '', durationMinutes: '' }))
        onSaved()
      }, 1500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Log Assessment</h2>

      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          Assessment logged successfully.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="al-study">Study *</Label>
          <select
            id="al-study"
            value={form.studyId}
            onChange={(e) => set('studyId', e.target.value)}
            className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="">Select study…</option>
            {studies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {errors.studyId && <p className="text-xs text-red-600">{errors.studyId}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="al-inv">Investigator *</Label>
          <select
            id="al-inv"
            value={form.investigatorId}
            onChange={(e) => set('investigatorId', e.target.value)}
            className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="">Select investigator…</option>
            {investigators.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          {errors.investigatorId && <p className="text-xs text-red-600">{errors.investigatorId}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="al-pid">Participant ID *</Label>
          <Input
            id="al-pid"
            value={form.participantId}
            onChange={(e) => set('participantId', e.target.value)}
            placeholder="e.g. P001"
            className="font-mono"
          />
          {errors.participantId && <p className="text-xs text-red-600">{errors.participantId}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="al-scale">Scale / Assessment *</Label>
          <datalist id="scale-list">
            {SCALE_NAMES.map((s) => <option key={s} value={s} />)}
          </datalist>
          <Input
            id="al-scale"
            list="scale-list"
            value={form.scaleType}
            onChange={(e) => set('scaleType', e.target.value)}
            placeholder="e.g. HAMD-17"
          />
          {errors.scaleType && <p className="text-xs text-red-600">{errors.scaleType}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="al-date">Date *</Label>
          <Input
            id="al-date"
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
          />
          {errors.date && <p className="text-xs text-red-600">{errors.date}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="al-duration">
            Duration (min) <span className="text-slate-400 font-normal text-xs">auto-filled from scale</span>
          </Label>
          <Input
            id="al-duration"
            type="number"
            min="1"
            value={form.durationMinutes}
            onChange={(e) => set('durationMinutes', e.target.value)}
            placeholder={form.scaleType ? String(getScaleDuration(form.scaleType)) : '15'}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={loading || success}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          {loading ? 'Logging…' : 'Log Assessment'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/workload/AssessmentLogForm.tsx
git commit -m "feat: add AssessmentLogForm with scale auto-duration from defaults"
```

---

## Task 26: VisitCompletionTracker

**Files:**
- Create: `src/components/workload/VisitCompletionTracker.tsx`

- [ ] **Step 1: Create `src/components/workload/VisitCompletionTracker.tsx`**

```typescript
import { useMemo } from 'react'
import { useVisits } from '@/hooks/useVisits'
import { Skeleton } from '@/components/ui/skeleton'
import type { VisitStatus } from '@/types'

interface Props {
  studyId: string
}

const STATUS_LABELS: Record<VisitStatus, string> = {
  completed: 'Completed',
  scheduled: 'Scheduled',
  missed: 'Missed',
  no_show: 'No Show',
}

const STATUS_COLORS: Record<VisitStatus, string> = {
  completed: 'text-green-700',
  scheduled: 'text-blue-600',
  missed: 'text-amber-600',
  no_show: 'text-red-600',
}

export function VisitCompletionTracker({ studyId }: Props) {
  const { visits, loading } = useVisits(studyId)

  const summary = useMemo(() => {
    const counts: Record<VisitStatus, number> = {
      completed: 0, scheduled: 0, missed: 0, no_show: 0,
    }
    visits.forEach((v) => {
      counts[v.status] = (counts[v.status] ?? 0) + 1
    })
    const total = visits.length
    return { counts, total }
  }, [visits])

  const byParticipant = useMemo(() => {
    const map: Record<string, { participantId: string; latest: string; status: VisitStatus; visitType: string }[]> = {}
    visits.forEach((v) => {
      if (!map[v.participantId]) map[v.participantId] = []
      map[v.participantId].push({
        participantId: v.participantId,
        latest: v.scheduledDate,
        status: v.status,
        visitType: v.visitType,
      })
    })
    return Object.entries(map).map(([pid, visits]) => ({
      participantId: pid,
      visits: visits.sort((a, b) => b.latest.localeCompare(a.latest)),
    }))
  }, [visits])

  if (loading) {
    return <div className="space-y-2">{[1, 2, 3].map((n) => <Skeleton key={n} className="h-8 w-full" />)}</div>
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {(Object.entries(STATUS_LABELS) as [VisitStatus, string][]).map(([status, label]) => {
          const count = summary.counts[status]
          const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0
          return (
            <div
              key={status}
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-center"
            >
              <p className="text-xs font-medium text-slate-400 uppercase">{label}</p>
              <p className={`text-2xl font-bold tabular-nums mt-1 ${STATUS_COLORS[status]}`}>
                {count}
              </p>
              <p className="text-xs text-slate-400">{pct}%</p>
            </div>
          )
        })}
      </div>

      {byParticipant.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Participant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Latest Visit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Visit Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {byParticipant.map(({ participantId, visits: pVisits }) => (
                <tr key={participantId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-100">
                    {participantId}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-xs">
                    {pVisits[0]?.latest ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {pVisits[0]?.visitType ?? '—'}
                  </td>
                  <td className={`px-4 py-3 font-medium text-sm ${STATUS_COLORS[pVisits[0]?.status ?? 'scheduled']}`}>
                    {STATUS_LABELS[pVisits[0]?.status ?? 'scheduled']}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300 tabular-nums">
                    {pVisits.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {byParticipant.length === 0 && (
        <p className="text-sm text-slate-400 py-6 text-center">No visits logged for this study yet.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/workload/VisitCompletionTracker.tsx
git commit -m "feat: add VisitCompletionTracker with status summary cards and per-participant table"
```

---

## Task 27: DataEntry Page (Staff)

**Files:**
- Modify: `src/pages/staff/DataEntry.tsx`

- [ ] **Step 1: Replace the stub**

```typescript
import { useState } from 'react'
import { useStudies } from '@/hooks/useStudies'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useAuth } from '@/hooks/useAuth'
import { useSite } from '@/hooks/useSite'
import { VisitLogForm } from '@/components/workload/VisitLogForm'
import { BulkVisitLogForm } from '@/components/workload/BulkVisitLogForm'
import { AssessmentLogForm } from '@/components/workload/AssessmentLogForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function DataEntry() {
  const { user } = useAuth()
  const { siteId } = useSite()
  const { studies } = useStudies()
  const { investigators } = useInvestigators()
  const [refreshKey, setRefreshKey] = useState(0)

  // Staff see only their assigned studies
  const visibleStudies =
    user?.role === 'staff'
      ? studies.filter((s) => user.assignedStudies.includes(s.id))
      : studies

  function handleSaved() {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Data Entry</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Log visits and assessments for your assigned studies.
        </p>
      </div>

      <Tabs defaultValue="single-visit">
        <TabsList>
          <TabsTrigger value="single-visit">Single Visit</TabsTrigger>
          <TabsTrigger value="bulk-visit">Bulk Visit Log</TabsTrigger>
          <TabsTrigger value="assessment">Assessment</TabsTrigger>
        </TabsList>

        <div className="pt-6">
          <TabsContent value="single-visit" key={`sv-${refreshKey}`}>
            <VisitLogForm
              studies={visibleStudies}
              investigators={investigators}
              siteId={siteId}
              onSaved={handleSaved}
            />
          </TabsContent>

          <TabsContent value="bulk-visit" key={`bv-${refreshKey}`}>
            <BulkVisitLogForm
              studies={visibleStudies}
              investigators={investigators}
              siteId={siteId}
              onSaved={handleSaved}
            />
          </TabsContent>

          <TabsContent value="assessment" key={`as-${refreshKey}`}>
            <AssessmentLogForm
              studies={visibleStudies}
              investigators={investigators}
              siteId={siteId}
              onSaved={handleSaved}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/staff/DataEntry.tsx
git commit -m "feat: replace DataEntry stub with tabbed visit/assessment logging forms"
```

---

## Task 28: MyStudies Page (Staff)

**Files:**
- Modify: `src/pages/staff/MyStudies.tsx`

- [ ] **Step 1: Replace the stub**

```typescript
import { useStudies } from '@/hooks/useStudies'
import { useInvestigators } from '@/hooks/useInvestigators'
import { useAuth } from '@/hooks/useAuth'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DelegationLogTab } from '@/components/study-detail/DelegationLogTab'
import { VisitCompletionTracker } from '@/components/workload/VisitCompletionTracker'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { useState } from 'react'

export function MyStudies() {
  const { user } = useAuth()
  const { studies, loading } = useStudies()
  const { investigators } = useInvestigators()
  const [activeStudyId, setActiveStudyId] = useState<string | null>(null)

  const myStudies = user
    ? studies.filter((s) => user.assignedStudies.includes(s.id))
    : []

  const selected = myStudies.find((s) => s.id === activeStudyId) ?? myStudies[0] ?? null

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
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Studies</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {myStudies.length} assigned {myStudies.length === 1 ? 'study' : 'studies'}
        </p>
      </div>

      {myStudies.length === 0 && (
        <p className="text-slate-400 text-sm py-8 text-center">
          You have no assigned studies. Contact your site manager to be assigned to a study.
        </p>
      )}

      {myStudies.length > 0 && (
        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-1 space-y-2">
            {myStudies.map((study) => (
              <button
                key={study.id}
                onClick={() => setActiveStudyId(study.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  (selected?.id ?? myStudies[0]?.id) === study.id
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-tight">
                  {study.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{study.sponsor}</p>
                <div className="mt-1.5">
                  <StatusBadge status={study.status} />
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="col-span-3 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {selected.name}
                </h2>
                <p className="text-sm text-slate-500">
                  {selected.sponsor} · {selected.therapeuticArea} · {selected.phase}
                </p>
              </div>

              <Tabs defaultValue="visits">
                <TabsList>
                  <TabsTrigger value="visits">Visit Completion</TabsTrigger>
                  <TabsTrigger value="delegation">Delegation Log</TabsTrigger>
                </TabsList>
                <div className="pt-4">
                  <TabsContent value="visits">
                    <VisitCompletionTracker studyId={selected.id} />
                  </TabsContent>
                  <TabsContent value="delegation">
                    <DelegationLogTab
                      studyId={selected.id}
                      investigators={investigators}
                      canEdit={false}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/staff/MyStudies.tsx
git commit -m "feat: replace MyStudies stub with assigned studies list, visit tracker, and delegation log"
```

---

## Task 29: StudyComparison Modal

**Files:**
- Modify: `src/components/studies/StudyComparison.tsx` (replace stub with full implementation)

- [ ] **Step 1: Replace the stub**

```typescript
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { Investigator, Study } from '@/types'

interface Props {
  studyIds: [string, string]
  studies: Study[]
  investigators: Investigator[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CompareRow {
  label: string
  getValue: (study: Study, invMap: Record<string, Investigator>) => string
}

const ROWS: CompareRow[] = [
  { label: 'Sponsor', getValue: (s) => s.sponsor },
  { label: 'Phase', getValue: (s) => s.phase },
  { label: 'Therapeutic Area', getValue: (s) => s.therapeuticArea },
  { label: 'Status', getValue: (s) => s.status.replace('_', ' ') },
  { label: 'PI', getValue: (s, im) => im[s.piId]?.name ?? '—' },
  { label: 'Target Enrollment', getValue: (s) => String(s.targetEnrollment) },
  { label: 'Enrolled', getValue: (s) => String(s.enrollmentData?.randomizations ?? 0) },
  {
    label: 'Enrollment %',
    getValue: (s) =>
      s.targetEnrollment > 0
        ? `${Math.round(((s.enrollmentData?.randomizations ?? 0) / s.targetEnrollment) * 100)}%`
        : '—',
  },
  {
    label: 'Active Participants',
    getValue: (s) => String(s.enrollmentData?.active ?? 0),
  },
  {
    label: 'Weekly Inv. Hours',
    getValue: (s) => {
      const totalMins = s.visitSchedule.reduce((sum, v) => sum + v.investigatorTimeMinutes, 0)
      return totalMins > 0 ? `${Math.round(totalMins / 60 * 10) / 10}h/visit` : '—'
    },
  },
  {
    label: 'Assigned Investigators',
    getValue: (s, im) =>
      s.assignedInvestigators
        .map((a) => `${im[a.investigatorId]?.name ?? a.investigatorId} (${a.role})`)
        .join(', ') || '—',
  },
  { label: 'Start Date', getValue: (s) => s.startDate || '—' },
  { label: 'Expected End', getValue: (s) => s.expectedEndDate || '—' },
  {
    label: 'Admin hrs/week',
    getValue: (s) => `${s.adminOverride.perStudyWeeklyHours}h`,
  },
  {
    label: 'Participant Overhead',
    getValue: (s) => `${s.adminOverride.perParticipantOverheadPct}%`,
  },
]

export function StudyComparison({ studyIds, studies, investigators, open, onOpenChange }: Props) {
  const invMap = Object.fromEntries(investigators.map((i) => [i.id, i]))
  const [studyA, studyB] = studyIds.map((id) => studies.find((s) => s.id === id))

  if (!studyA || !studyB) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Study Comparison</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="py-3 pr-4 text-left text-xs font-medium text-slate-400 uppercase w-40" />
                <th className="py-3 px-4 text-left">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{studyA.name}</p>
                    <StatusBadge status={studyA.status} />
                  </div>
                </th>
                <th className="py-3 px-4 text-left">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{studyB.name}</p>
                    <StatusBadge status={studyB.status} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {ROWS.map((row) => {
                const valA = row.getValue(studyA, invMap)
                const valB = row.getValue(studyB, invMap)
                const differ = valA !== valB

                return (
                  <tr key={row.label} className={differ ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''}>
                    <td className="py-2.5 pr-4 text-xs font-medium text-slate-400 uppercase tracking-wide">
                      {row.label}
                    </td>
                    <td className={`py-2.5 px-4 text-slate-700 dark:text-slate-200 ${differ ? 'font-medium' : ''}`}>
                      {valA}
                    </td>
                    <td className={`py-2.5 px-4 text-slate-700 dark:text-slate-200 ${differ ? 'font-medium' : ''}`}>
                      {valB}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/studies/StudyComparison.tsx
git commit -m "feat: implement StudyComparison modal with side-by-side diff highlighting"
```

---

## Task 30: Final Integration + Build Verification

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```
Expected: all tests pass (30+ tests).

- [ ] **Step 2: Run type check**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Run production build**

```bash
npm run build
```
Expected: builds successfully, `dist/` folder created with no TypeScript errors.

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

Open `http://localhost:5173`. Verify:

**Management user:**
- [ ] `/studies` — StudyTable renders, filters work, "Add Study" opens form
- [ ] Add a study → form saves → navigates to study detail
- [ ] Study detail — all 6 tabs render without errors
- [ ] Visit Schedule tab — Add Visit row, edit inline, Save
- [ ] Enrollment tab — update numbers, Save
- [ ] Delegation Log tab — Add Entry form saves
- [ ] Status toggle on study detail header — confirm dialog appears
- [ ] Clone button → dialog → navigates to cloned study
- [ ] Check 2 studies → Compare button → comparison modal with diff highlighting
- [ ] Upload Protocol PDF button visible on Visit Schedule tab (parsing requires API key in .env.local)

**Staff user:**
- [ ] `/data-entry` — Single Visit, Bulk Visit Log, Assessment tabs render
- [ ] `/my-studies` — assigned studies listed in sidebar, Visit Completion and Delegation Log tabs work

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: Phase 2 complete — study management, workload tracking, protocol parser, study comparison"
```

---

## Self-Review

### Spec Coverage

| Feature | Phase 2 Spec | Task |
|---|---|---|
| Study list + filterable table | ✓ | Tasks 10, 11, 14 |
| Study detail page + 6 tabs | ✓ | Tasks 15–19 |
| Status toggle with confirmation | ✓ | Task 13 |
| Study clone | ✓ | Task 13 |
| Study comparison view | ✓ | Task 29 |
| Enrollment funnel per study | ✓ | Task 18 |
| Protocol parser agent (Claude API) | ✓ | Tasks 21–22 |
| Assessment scale library (13 defaults) | ✓ | Task 2 |
| Visit logging (single + bulk) | ✓ | Tasks 23–24 |
| Assessment logging | ✓ | Task 25 |
| Visit completion tracker | ✓ | Task 26 |
| Delegation log (manual entry + delete) | ✓ | Task 19 |
| Staff Data Entry page | ✓ | Task 27 |
| Staff My Studies page | ✓ | Task 28 |

### Type Consistency Checks

- `EnrollmentData` interface defined in Task 1, used in `Study`, `EnrollmentTab`, `updateEnrollmentData`
- `StudyStatusHistoryEntry` defined in Task 1, used in `updateStudyStatus` (lib/studies.ts)
- `ParsedProtocol` defined in `src/lib/protocolParser.ts`, imported in `VisitScheduleTab`, `ProtocolUpload`, `ProtocolReviewTable`
- `StudyFilterState` exported from `StudyFilters.tsx`, imported in `StudyTable.tsx` and `Studies.tsx`
- `ConfirmDialog` props: `open`, `onOpenChange`, `title`, `description`, `confirmLabel?`, `destructive?`, `onConfirm` — consistent across all usages
- `subscribeStudies` / `subscribeStudy` signatures: `(siteId/studyId, onData, onError) => () => void` — consistent in lib and hooks

### No Placeholders Scan

- All tasks contain complete code
- All imports are fully resolvable from earlier tasks
- No "TBD" or "implement later" comments
- Every function referenced in a later task was defined in an earlier task
