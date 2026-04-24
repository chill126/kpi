# Observability — Track B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dual-layer error monitoring (Sentry + Firestore `errorLog` fallback) and a structured `auditLog` for auth events and management data mutations, keeping the Sentry integration within the free tier.

**Architecture:** A thin `src/lib/monitoring.ts` module is the single integration point — it wraps `Sentry.captureException` and conditionally writes critical events to Firestore `errorLog`. Auth and lib functions call `writeAuditLog` after mutations using `auth.currentUser` for uid/email without changing function signatures. The Firestore circuit breaker and chunk error boundary both forward errors to `captureError`.

**Tech Stack:** `@sentry/react`, `@sentry/vite-plugin`, Firebase Firestore, Vitest

---

## File Map

| Action | File |
|---|---|
| Create | `src/lib/monitoring.ts` |
| Create | `src/lib/__tests__/monitoring.test.ts` |
| Create | `src/__tests__/firestore-rules.test.ts` |
| Modify | `src/main.tsx` |
| Modify | `vite.config.ts` |
| Modify | `firestore.rules` |
| Modify | `src/lib/auth.ts` |
| Modify | `src/lib/studies.ts` |
| Modify | `src/lib/investigators.ts` |
| Modify | `src/lib/users.ts` |
| Modify | `src/lib/sites.ts` |
| Modify | `src/hooks/useFirestoreSubscription.ts` |
| Modify | `src/components/shared/ChunkErrorBoundary.tsx` |

---

### Task 1: Create `monitoring.ts` + unit tests

**Files:**
- Create: `src/lib/monitoring.ts`
- Create: `src/lib/__tests__/monitoring.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/monitoring.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }))
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn().mockResolvedValue({ id: 'doc1' }),
  collection: vi.fn((_db, col: string) => col),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}))
vi.mock('../firebase', () => ({ db: {} }))

import * as Sentry from '@sentry/react'
import { addDoc } from 'firebase/firestore'
import { captureError, writeAuditLog } from '../monitoring'

describe('captureError', () => {
  beforeEach(() => vi.clearAllMocks())

  it('always calls Sentry.captureException', () => {
    const err = new Error('test')
    captureError(err, { category: 'firestore' })
    expect(Sentry.captureException).toHaveBeenCalledWith(err, { extra: undefined })
  })

  it('writes to errorLog when critical: true', () => {
    const err = new Error('boom')
    captureError(err, { category: 'auth', critical: true })
    expect(addDoc).toHaveBeenCalledWith(
      'errorLog',
      expect.objectContaining({ level: 'critical', category: 'auth', message: 'boom' }),
    )
  })

  it('does not write to errorLog when critical is false', () => {
    captureError(new Error('minor'), { category: 'render', critical: false })
    expect(addDoc).not.toHaveBeenCalled()
  })

  it('does not write to errorLog when critical is omitted', () => {
    captureError(new Error('minor'), { category: 'firestore' })
    expect(addDoc).not.toHaveBeenCalled()
  })

  it('stringifies non-Error thrown values', () => {
    captureError('string error', { category: 'firestore', critical: true })
    expect(addDoc).toHaveBeenCalledWith(
      'errorLog',
      expect.objectContaining({ message: 'string error' }),
    )
  })

  it('passes context to Sentry extra', () => {
    const err = new Error('ctx')
    captureError(err, { category: 'auth', context: { email: 'a@b.com' } })
    expect(Sentry.captureException).toHaveBeenCalledWith(err, { extra: { email: 'a@b.com' } })
  })
})

describe('writeAuditLog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('writes auditLog doc with required fields', async () => {
    await writeAuditLog('uid123', 'user@test.com', 'auth.sign_in')
    expect(addDoc).toHaveBeenCalledWith(
      'auditLog',
      expect.objectContaining({
        uid: 'uid123',
        email: 'user@test.com',
        action: 'auth.sign_in',
        targetCollection: null,
        targetId: null,
        meta: {},
      }),
    )
  })

  it('passes optional fields through', async () => {
    await writeAuditLog('uid123', 'user@test.com', 'study.create', {
      targetCollection: 'studies',
      targetId: 'study1',
      meta: { studyName: 'ALPHA' },
    })
    expect(addDoc).toHaveBeenCalledWith(
      'auditLog',
      expect.objectContaining({
        targetCollection: 'studies',
        targetId: 'study1',
        meta: { studyName: 'ALPHA' },
      }),
    )
  })

  it('allows null uid for failed sign-in', async () => {
    await writeAuditLog(null, 'user@test.com', 'auth.sign_in_failed')
    expect(addDoc).toHaveBeenCalledWith(
      'auditLog',
      expect.objectContaining({ uid: null }),
    )
  })

  it('writes timestamp from serverTimestamp()', async () => {
    await writeAuditLog('uid1', 'u@t.com', 'auth.sign_out')
    expect(addDoc).toHaveBeenCalledWith(
      'auditLog',
      expect.objectContaining({ timestamp: 'SERVER_TIMESTAMP' }),
    )
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npm test -- --run src/lib/__tests__/monitoring.test.ts
```

Expected: `Cannot find module '../monitoring'` or similar import error.

- [ ] **Step 3: Create `src/lib/monitoring.ts`**

```typescript
import * as Sentry from '@sentry/react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export type ErrorCategory = 'auth' | 'firestore' | 'render'

export function captureError(
  err: unknown,
  options: { category: ErrorCategory; critical?: boolean; context?: Record<string, unknown> } = { category: 'firestore' },
): void {
  Sentry.captureException(err, { extra: options.context })
  if (options.critical) {
    void addDoc(collection(db, 'errorLog'), {
      level: 'critical',
      category: options.category,
      message: err instanceof Error ? err.message : String(err),
      context: options.context ?? {},
      timestamp: serverTimestamp(),
    })
  }
}

export async function writeAuditLog(
  uid: string | null,
  email: string,
  action: string,
  options: { targetCollection?: string; targetId?: string; meta?: Record<string, unknown> } = {},
): Promise<void> {
  await addDoc(collection(db, 'auditLog'), {
    uid,
    email,
    action,
    targetCollection: options.targetCollection ?? null,
    targetId: options.targetId ?? null,
    timestamp: serverTimestamp(),
    meta: options.meta ?? {},
  })
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npm test -- --run src/lib/__tests__/monitoring.test.ts
```

Expected: 10 tests passing.

- [ ] **Step 5: Run full suite**

```bash
npm test -- --run
```

Expected: All existing tests still pass (no existing code changed yet).

- [ ] **Step 6: Commit**

```bash
git add src/lib/monitoring.ts src/lib/__tests__/monitoring.test.ts
git commit -m "feat(observability): add monitoring.ts with captureError and writeAuditLog"
```

---

### Task 2: Install Sentry packages + init

**Files:**
- Modify: `src/main.tsx`
- Modify: `vite.config.ts`

- [ ] **Step 1: Install packages**

```bash
npm install @sentry/react
npm install --save-dev @sentry/vite-plugin
```

Expected: Both install without errors. `package.json` gains `@sentry/react` in `dependencies` and `@sentry/vite-plugin` in `devDependencies`.

- [ ] **Step 2: Replace `src/main.tsx`**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App'

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 3: Replace `vite.config.ts`**

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [sentryVitePlugin({ authToken: process.env.SENTRY_AUTH_TOKEN, org: '<org>', project: '<project>' })]
      : []),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'vendor-recharts'
          }
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase/')) {
            return 'vendor-firebase'
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react'
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

Note: Replace `'<org>'` and `'<project>'` with actual Sentry org/project slugs when the DSN is configured. The plugin is conditionally included so local builds without `SENTRY_AUTH_TOKEN` still succeed.

- [ ] **Step 4: Run type check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Run full test suite**

```bash
npm test -- --run
```

Expected: All tests pass. The `Sentry.init` guard means tests without a DSN env var are unaffected.

- [ ] **Step 6: Commit**

```bash
git add src/main.tsx vite.config.ts package.json package-lock.json
git commit -m "feat(observability): add Sentry init and vite source map upload"
```

---

### Task 3: Firestore rules for errorLog + auditLog

**Files:**
- Modify: `firestore.rules`
- Create: `src/__tests__/firestore-rules.test.ts`

- [ ] **Step 1: Write the failing test first**

Create `src/__tests__/firestore-rules.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const rules = readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf-8')

describe('firestore.rules — observability collections', () => {
  it('has errorLog rule', () => {
    expect(rules).toContain('match /errorLog/{docId}')
  })

  it('errorLog allows read only for management', () => {
    const idx = rules.indexOf('match /errorLog/{docId}')
    const section = rules.slice(idx, idx + 200)
    expect(section).toContain('allow read: if isManagement()')
    expect(section).not.toContain('allow read: if isAuthenticated()')
  })

  it('errorLog allows create for authenticated users', () => {
    const idx = rules.indexOf('match /errorLog/{docId}')
    const section = rules.slice(idx, idx + 200)
    expect(section).toContain('allow create: if isAuthenticated()')
  })

  it('has auditLog rule', () => {
    expect(rules).toContain('match /auditLog/{docId}')
  })

  it('auditLog allows read only for management', () => {
    const idx = rules.indexOf('match /auditLog/{docId}')
    const section = rules.slice(idx, idx + 200)
    expect(section).toContain('allow read: if isManagement()')
    expect(section).not.toContain('allow read: if isAuthenticated()')
  })

  it('auditLog allows create for authenticated users', () => {
    const idx = rules.indexOf('match /auditLog/{docId}')
    const section = rules.slice(idx, idx + 200)
    expect(section).toContain('allow create: if isAuthenticated()')
  })
})
```

- [ ] **Step 2: Run the test — confirm it fails**

```bash
npm test -- --run src/__tests__/firestore-rules.test.ts
```

Expected: Tests for `errorLog` and `auditLog` presence fail since those rules don't exist yet.

- [ ] **Step 3: Add rules to `firestore.rules`**

Append the following two match blocks inside the outer `match /databases/{database}/documents {` block, before its closing `}` on line 95. The end of the file should become:

```
    match /boardSessions/{docId} {
      allow read: if isAuthenticated() && (isManagement() || isSameSite(resource.data.siteId));
      allow create: if isManagement() && request.resource.data.keys().hasAll(['siteId', 'sessionDate']);
      allow update, delete: if isManagement();
    }

    match /errorLog/{docId} {
      allow read: if isManagement();
      allow create: if isAuthenticated();
    }

    match /auditLog/{docId} {
      allow read: if isManagement();
      allow create: if isAuthenticated();
    }
  }
}
```

- [ ] **Step 4: Run the test — confirm it passes**

```bash
npm test -- --run src/__tests__/firestore-rules.test.ts
```

Expected: 6 tests passing.

- [ ] **Step 5: Run full suite**

```bash
npm test -- --run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add firestore.rules src/__tests__/firestore-rules.test.ts
git commit -m "feat(observability): add Firestore rules for errorLog and auditLog"
```

---

### Task 4: Instrument `src/lib/auth.ts`

**Files:**
- Modify: `src/lib/auth.ts`

`signIn` currently discards the `UserCredential`. Wrap it in try/catch: capture the credential for the success audit log, call `captureError` in the catch, re-throw so callers still see the error. Capture `auth.currentUser` before `signOut` since it will be null after.

- [ ] **Step 1: Replace `src/lib/auth.ts`**

```typescript
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { captureError, writeAuditLog } from './monitoring'
import type { AppUser, Role } from '@/types'

export async function signIn(email: string, password: string): Promise<void> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    writeAuditLog(cred.user.uid, cred.user.email ?? '', 'auth.sign_in').catch(console.error)
  } catch (err) {
    captureError(err, { category: 'auth', critical: true, context: { email } })
    writeAuditLog(null, email, 'auth.sign_in_failed', { meta: { error: String(err) } }).catch(console.error)
    throw err
  }
}

export async function signOut(): Promise<void> {
  const user = auth.currentUser
  await firebaseSignOut(auth)
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'auth.sign_out').catch(console.error)
  }
}

export async function getAppUser(user: User): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', user.uid))
  if (!snap.exists()) return null
  return { uid: user.uid, email: user.email ?? '', ...snap.data() } as AppUser
}

export async function createUserRecord(
  uid: string,
  email: string,
  displayName: string,
  role: Role,
  siteId: string,
): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    email,
    displayName,
    role,
    siteId,
    assignedStudies: [],
  })
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Run full test suite**

```bash
npm test -- --run
```

Expected: All tests pass. `signIn` still re-throws on failure so any test expecting a throw works unchanged. `writeAuditLog` calls are fire-and-forget and don't change the return type.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat(observability): instrument auth.ts with captureError and writeAuditLog"
```

---

### Task 5: Instrument studies.ts, investigators.ts, users.ts, sites.ts

**Files:**
- Modify: `src/lib/studies.ts`
- Modify: `src/lib/investigators.ts`
- Modify: `src/lib/users.ts`
- Modify: `src/lib/sites.ts`

All audit writes use `auth.currentUser` to get uid/email. All are `.catch(console.error)` fire-and-forget. No function signatures change.

- [ ] **Step 1: Replace `src/lib/studies.ts`**

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
import { db, auth } from './firebase'
import { writeAuditLog } from './monitoring'
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

export function subscribeAllStudies(
  onData: (studies: Study[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(collection(db, 'studies'), orderBy('name'))
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toStudy(d.id, d.data()))),
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
  const user = auth.currentUser
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'study.create', {
      targetCollection: 'studies',
      targetId: ref.id,
      meta: { studyName: data.name },
    }).catch(console.error)
  }
  return ref.id
}

export async function updateStudy(
  studyId: string,
  updates: Partial<Omit<Study, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'studies', studyId), updates as Record<string, unknown>)
  const user = auth.currentUser
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'study.update', {
      targetCollection: 'studies',
      targetId: studyId,
    }).catch(console.error)
  }
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
  const user = auth.currentUser
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'study.update', {
      targetCollection: 'studies',
      targetId: studyId,
      meta: { status },
    }).catch(console.error)
  }
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
  const user = auth.currentUser
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'study.create', {
      targetCollection: 'studies',
      targetId: ref.id,
      meta: { studyName: newName, clonedFrom: study.id },
    }).catch(console.error)
  }
  return ref.id
}

export async function updateEnrollmentData(
  studyId: string,
  data: EnrollmentData,
): Promise<void> {
  await updateDoc(doc(db, 'studies', studyId), { enrollmentData: data })
  const user = auth.currentUser
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'study.update', {
      targetCollection: 'studies',
      targetId: studyId,
    }).catch(console.error)
  }
}
```

- [ ] **Step 2: Replace `src/lib/investigators.ts`**

```typescript
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, auth } from './firebase'
import { writeAuditLog } from './monitoring'
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

export async function createInvestigator(
  data: Omit<Investigator, 'id'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'investigators'), data)
  const user = auth.currentUser
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'investigator.create', {
      targetCollection: 'investigators',
      targetId: ref.id,
    }).catch(console.error)
  }
  return ref.id
}

export async function updateInvestigator(
  id: string,
  updates: Partial<Omit<Investigator, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'investigators', id), updates as Record<string, unknown>)
  const user = auth.currentUser
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'investigator.update', {
      targetCollection: 'investigators',
      targetId: id,
    }).catch(console.error)
  }
}

export async function deleteInvestigator(id: string): Promise<void> {
  await deleteDoc(doc(db, 'investigators', id))
  const user = auth.currentUser
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'investigator.delete', {
      targetCollection: 'investigators',
      targetId: id,
    }).catch(console.error)
  }
}
```

- [ ] **Step 3: Replace `src/lib/users.ts`**

```typescript
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, auth } from './firebase'
import { writeAuditLog } from './monitoring'
import type { AppUser } from '@/types'

function toAppUser(uid: string, data: Record<string, unknown>): AppUser {
  return { uid, ...data } as AppUser
}

export function subscribeUsers(
  siteId: string,
  onData: (users: AppUser[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(collection(db, 'users'), where('siteId', '==', siteId))
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toAppUser(d.id, d.data()))),
    onError,
  )
}

export function subscribeUser(
  uid: string,
  onData: (user: AppUser | null) => void,
  onError: (err: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => onData(snap.exists() ? toAppUser(snap.id, snap.data()) : null),
    onError,
  )
}

export async function updateUser(
  uid: string,
  updates: Partial<Omit<AppUser, 'uid'>>,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), updates as Record<string, unknown>)
  const user = auth.currentUser
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'user.update', {
      targetCollection: 'users',
      targetId: uid,
    }).catch(console.error)
  }
}
```

- [ ] **Step 4: Replace `src/lib/sites.ts`**

```typescript
import { addDoc, collection, doc, getDoc, onSnapshot, query, updateDoc } from 'firebase/firestore'
import { db, auth } from './firebase'
import { writeAuditLog } from './monitoring'
import type { Site } from '@/types'

function toSite(id: string, data: Record<string, unknown>): Site {
  return { id, ...data } as Site
}

export async function getSite(siteId: string): Promise<Site | null> {
  const snap = await getDoc(doc(db, 'sites', siteId))
  if (!snap.exists()) return null
  return toSite(snap.id, snap.data())
}

export async function updateSite(
  siteId: string,
  updates: Partial<Omit<Site, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'sites', siteId), updates as Record<string, unknown>)
  const user = auth.currentUser
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'site.update', {
      targetCollection: 'sites',
      targetId: siteId,
    }).catch(console.error)
  }
}

export function subscribeSite(
  siteId: string,
  onData: (site: Site | null) => void,
  onError: (err: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, 'sites', siteId),
    (snap) => onData(snap.exists() ? toSite(snap.id, snap.data()) : null),
    onError,
  )
}

export async function createSite(data: Omit<Site, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'sites'), data)
  const user = auth.currentUser
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'site.create', {
      targetCollection: 'sites',
      targetId: ref.id,
    }).catch(console.error)
  }
  return ref.id
}

export function subscribeAllSites(
  onData: (sites: Site[]) => void,
  onError: (err: Error) => void,
): () => void {
  return onSnapshot(
    query(collection(db, 'sites')),
    (snap) => onData(snap.docs.map((d) => toSite(d.id, d.data()))),
    onError,
  )
}
```

- [ ] **Step 5: Run type check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Run full test suite**

```bash
npm test -- --run
```

Expected: All tests pass. Audit log calls are fire-and-forget and don't affect return values or throw behavior.

- [ ] **Step 7: Commit**

```bash
git add src/lib/studies.ts src/lib/investigators.ts src/lib/users.ts src/lib/sites.ts
git commit -m "feat(observability): add audit logging to studies, investigators, users, sites"
```

---

### Task 6: Instrument useFirestoreSubscription + ChunkErrorBoundary

**Files:**
- Modify: `src/hooks/useFirestoreSubscription.ts`
- Modify: `src/components/shared/ChunkErrorBoundary.tsx`

- [ ] **Step 1: Edit `src/hooks/useFirestoreSubscription.ts`**

Add this import as the second line (after the React import):

```typescript
import { captureError } from '@/lib/monitoring'
```

In the `tripCircuit` function, the current line 109 is:
```typescript
      console.error(msg)
```

Change it to:
```typescript
      console.error(msg)
      captureError(new Error(msg), { category: 'firestore', critical: true })
```

In the `onError` callback, the current lines 142-147 are:
```typescript
      (err) => {
        if (!cancelled) {
          setError(err)
          setLoading(false)
        }
      },
```

Change to:
```typescript
      (err) => {
        if (!cancelled) {
          captureError(err, { category: 'firestore', critical: true })
          setError(err)
          setLoading(false)
        }
      },
```

- [ ] **Step 2: Edit `src/components/shared/ChunkErrorBoundary.tsx`**

Add this import as the second line (after the React import):

```typescript
import { captureError } from '@/lib/monitoring'
```

The current `componentDidCatch` at line 27 starts:
```typescript
  componentDidCatch(error: unknown): void {
    // For chunk-load errors...
    if (!isChunkLoadError(error)) return
```

Change to:
```typescript
  componentDidCatch(error: unknown): void {
    captureError(error, { category: 'render', critical: false })
    // For chunk-load errors (stale index.html referencing old asset hashes after a
    // deploy), auto-reload once per session so the user doesn't have to click
    // Reload manually. The sessionStorage flag prevents infinite reload loops
    // if the error actually persists after a fresh index fetch.
    if (!isChunkLoadError(error)) return
```

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Run full test suite**

```bash
npm test -- --run
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useFirestoreSubscription.ts src/components/shared/ChunkErrorBoundary.tsx
git commit -m "feat(observability): instrument circuit breaker and error boundary with captureError"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Section 1 — Sentry.init with DSN guard, tracesSampleRate: 0, replays disabled | Task 2 |
| Section 1 — sentryVitePlugin conditional on SENTRY_AUTH_TOKEN, sourcemap: true | Task 2 |
| Section 2 — `monitoring.ts` captureError: always calls Sentry, writes errorLog only when critical | Task 1 |
| Section 2 — Call site: useFirestoreSubscription tripCircuit | Task 6 |
| Section 2 — Call site: auth.ts signIn catch | Task 4 |
| Section 2 — Call site: ChunkErrorBoundary componentDidCatch | Task 6 |
| Section 3 — errorLog Firestore rule (read: management, create: authenticated) | Task 3 |
| Section 4 — writeAuditLog helper | Task 1 |
| Section 4 — auth.sign_in, auth.sign_out, auth.sign_in_failed | Task 4 |
| Section 4 — study.create, study.update | Task 5 |
| Section 4 — investigator.create, investigator.update, investigator.delete | Task 5 |
| Section 4 — user.update | Task 5 |
| Section 4 — site.create, site.update | Task 5 |
| Section 4 — auditLog Firestore rule (read: management, create: authenticated) | Task 3 |
| Section 5 — monitoring.test.ts, mocked Sentry and addDoc | Task 1 |
| Section 5 — Existing tests unchanged | Validated: fire-and-forget pattern doesn't affect return values |

**Placeholder scan:** None. All code blocks are complete.

**Type consistency:**
- `captureError(err, { category, critical?, context? })` — same signature used in Tasks 1, 4, 6
- `writeAuditLog(uid | null, email, action, options?)` — same signature used in Tasks 1, 4, 5
- `auth.currentUser` — used consistently in Tasks 4 and 5; `auth` is exported from `./firebase`
- `useFirestoreSubscription` onError callback passes `err: Error` — matches `captureError`'s `unknown` parameter (accepts Error)
