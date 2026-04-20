# K2 KPI Tracker — Phase 1: Core Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-file prototype with a production-ready Vite + TypeScript + React app with Firebase Auth (two roles), a role-gated navigation shell, multi-site framework, Tailwind design system, and a one-time data migration from the legacy prototype.

**Architecture:** React Router v6 with two role-gated route trees (management / staff). Firebase Auth custom claims gate routes at the component level. All Firestore reads/writes are scoped to `siteId` via a SiteContext. Phase 1 pages are stubs — real content comes in Phases 2–5.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS v3, shadcn/ui, Lucide React, Firebase v10 (Auth + Firestore + Hosting), React Router v6, Vitest, React Testing Library

---

## Reference

**Full design spec:** `docs/superpowers/specs/2026-04-19-kpi-tracker-design.md`  
**Legacy prototype:** `public/investigator-kpi-tracker.html` (read-only reference — do not modify)  
**Firebase project:** Reuse existing credentials from the prototype's `firebaseConfig` block

---

## File Structure

```
kpi-tracker/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.ts
├── postcss.config.js
├── components.json                    # shadcn/ui config
├── package.json
├── .env.example                       # VITE_FIREBASE_* vars
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── .firebaserc
│
└── src/
    ├── main.tsx                       # React root mount
    ├── App.tsx                        # Router setup
    │
    ├── types/
    │   └── index.ts                   # ALL TypeScript types for the entire project
    │
    ├── lib/
    │   ├── firebase.ts                # Firebase app init + exports (auth, db)
    │   ├── auth.ts                    # signIn, signOut, getCurrentUser, setUserRole
    │   └── firestore.ts              # withSite() scope helper, collection refs
    │
    ├── hooks/
    │   ├── useAuth.ts                 # Auth state: user, role, loading
    │   └── useSite.ts                 # Active siteId, setActiveSite
    │
    ├── context/
    │   ├── AuthContext.tsx            # Provides useAuth hook
    │   └── SiteContext.tsx            # Provides useSite hook
    │
    ├── router/
    │   ├── index.tsx                  # All routes defined here
    │   ├── PrivateRoute.tsx           # Redirect to /login if not authed
    │   └── RoleRoute.tsx              # Redirect if role doesn't match
    │
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.tsx           # Sidebar + TopBar + <Outlet /> layout
    │   │   ├── Sidebar.tsx            # Role-gated nav links
    │   │   ├── NavItem.tsx            # Single nav item (icon + label + active state)
    │   │   └── TopBar.tsx             # Site badge, user info, sync indicator, dark toggle
    │   │
    │   └── shared/
    │       ├── SiteSwitcher.tsx       # Site selector dropdown (management only)
    │       └── SyncIndicator.tsx      # Synced / Syncing / Offline badge
    │
    ├── pages/
    │   ├── Login.tsx                  # Email/password login form
    │   │
    │   ├── management/
    │   │   ├── Overview.tsx           # Stub: "Overview Dashboard — Phase 3"
    │   │   ├── Investigators.tsx      # Stub
    │   │   ├── Studies.tsx            # Stub
    │   │   ├── Enrollment.tsx         # Stub
    │   │   ├── WorkloadPlanner.tsx    # Stub
    │   │   ├── Financial.tsx          # Stub
    │   │   ├── Reports.tsx            # Stub
    │   │   ├── Import.tsx             # Stub
    │   │   └── Settings.tsx           # User management (create staff accounts)
    │   │
    │   └── staff/
    │       ├── MyDashboard.tsx        # Stub
    │       ├── DataEntry.tsx          # Stub
    │       ├── MyStudies.tsx          # Stub
    │       └── MyProfile.tsx          # Stub
    │
    └── scripts/
        └── migrate.ts                 # One-time legacy data migration (run once, then archive)
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `postcss.config.js`, `tailwind.config.ts`

- [ ] **Step 1: Initialize Vite project**

Run from `C:\users\chill\projects\kpi-tracker`:
```bash
npm create vite@latest . -- --template react-ts
```
When prompted "Current directory is not empty" → select "Ignore files and continue"  
Choose: React, TypeScript

- [ ] **Step 2: Install core dependencies**

```bash
npm install firebase react-router-dom lucide-react
npm install -D tailwindcss postcss autoprefixer @types/node
npx tailwindcss init -p
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init
```
When prompted:
- Style: Default
- Base color: Slate
- CSS variables: Yes

Then install the components we'll use:
```bash
npx shadcn@latest add button input label dialog select tabs badge tooltip toast progress skeleton sheet checkbox
```

- [ ] **Step 4: Install test dependencies**

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 5: Configure `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 6: Create `src/test-setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Configure `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 8: Update `package.json` scripts**

Add to the `scripts` section:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "tsc --noEmit"
  }
}
```

- [ ] **Step 9: Verify scaffold builds**

```bash
npm run build
```
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 10: Commit**

```bash
git init
git add .
git commit -m "feat: initialize Vite + React + TypeScript scaffold with shadcn/ui and Vitest"
```

---

## Task 2: Tailwind Design System

**Files:**
- Modify: `tailwind.config.ts`
- Create: `src/index.css` (replaces Vite default)

- [ ] **Step 1: Configure `tailwind.config.ts` with K2 design tokens**

```typescript
import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        k2: {
          primary: '#1E3A5F',
          accent: '#0D9488',
          'accent-hover': '#0F766E',
        },
        capacity: {
          safe: '#16A34A',
          'safe-bg': '#F0FDF4',
          warning: '#D97706',
          'warning-bg': '#FFFBEB',
          danger: '#DC2626',
          'danger-bg': '#FEF2F2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'stat': ['2rem', { lineHeight: '1', fontWeight: '700' }],
        'sub-stat': ['1.25rem', { lineHeight: '1', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 2: Replace `src/index.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * { @apply border-border; }
  body { @apply bg-slate-50 text-slate-900 font-sans antialiased; }
  .dark body { @apply bg-slate-900 text-slate-100; }
  [class*="tabular"] { font-variant-numeric: tabular-nums; }
}
```

- [ ] **Step 3: Verify design tokens load**

```bash
npm run dev
```
Open `http://localhost:5173` — page should render with Inter font.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts src/index.css
git commit -m "feat: add K2 design tokens to Tailwind config"
```

---

## Task 3: TypeScript Types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write the types file**

```typescript
// src/types/index.ts

export type Role = 'management' | 'staff'

export type SyncStatus = 'synced' | 'syncing' | 'offline'

export interface AppUser {
  uid: string
  email: string
  displayName: string
  role: Role
  siteId: string
  assignedStudies: string[]
}

export interface Site {
  id: string
  name: string
  location: string
  active: boolean
  timezone: string
}

export type InvestigatorRole = 'PI' | 'Sub-I' | 'Provider'

export interface Investigator {
  id: string
  name: string
  credentials: string
  role: InvestigatorRole
  siteId: string
  weeklyCapacityHours: number
  siteBaselinePct: number
  assignedStudies: string[]
}

export type StudyStatus = 'enrolling' | 'paused' | 'maintenance' | 'completed' | 'on_hold'
export type StudyPhase = 'Phase I' | 'Phase II' | 'Phase III' | 'Phase IV' | 'Observational'

export interface StudyInvestigator {
  investigatorId: string
  role: InvestigatorRole
}

export interface VisitScheduleEntry {
  visitName: string
  visitWindow: string
  investigatorTimeMinutes: number
  coordinatorTimeMinutes: number
  isInvestigatorRequired: boolean
}

export interface AdminOverride {
  perStudyWeeklyHours: number
  perParticipantOverheadPct: number
}

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
}

export type VisitStatus = 'scheduled' | 'completed' | 'missed' | 'no_show'
export type VisitSource = 'manual' | 'cc_import'

export interface Visit {
  id: string
  participantId: string
  studyId: string
  investigatorId: string
  siteId: string
  visitType: string
  scheduledDate: string
  completedDate: string | null
  status: VisitStatus
  durationMinutes: number
  actualDurationMinutes: number | null
  source: VisitSource
}

export interface Assessment {
  id: string
  investigatorId: string
  studyId: string
  siteId: string
  visitId: string | null
  scaleType: string
  durationMinutes: number
  date: string
}

export type DelegationSource = 'advarra_import' | 'manual'

export interface DelegationLog {
  id: string
  investigatorId: string
  studyId: string
  delegatedTasks: string[]
  effectiveDate: string
  source: DelegationSource
}

export interface Import {
  id: string
  type: 'clinical_conductor' | 'advarra_ereg' | 'protocol_pdf'
  uploadedBy: string
  uploadedAt: string
  rowCount: number
  status: 'pending' | 'complete' | 'error'
  mappingUsed: Record<string, string>
  errors: string[]
}

export interface CapacityConfig {
  investigatorId: string
  weeklyCapacityHours: number
  siteBaselinePct: number
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
git commit -m "feat: add core TypeScript types for all collections"
```

---

## Task 4: Firebase Config + Auth Layer

**Files:**
- Create: `.env.example`, `src/lib/firebase.ts`, `src/lib/auth.ts`, `firestore.rules`, `firebase.json`, `.firebaserc`

The Firebase credentials are in the legacy prototype. Open `public/investigator-kpi-tracker.html` and locate the `firebaseConfig` object (search for `apiKey`). Copy those values.

- [ ] **Step 1: Create `.env.example`**

```bash
# Copy this to .env.local and fill in values from the legacy prototype's firebaseConfig
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

- [ ] **Step 2: Create `.env.local`**

Copy `.env.example` to `.env.local` and fill in the actual values from `public/investigator-kpi-tracker.html`.

Add `.env.local` to `.gitignore` (create `.gitignore` if it doesn't exist):
```
node_modules/
dist/
.env.local
.firebase/
```

- [ ] **Step 3: Create `src/lib/firebase.ts`**

```typescript
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
```

- [ ] **Step 4: Create `src/lib/auth.ts`**

```typescript
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import type { AppUser, Role } from '@/types'

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password)
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
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

- [ ] **Step 5: Create `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isManagement() {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'management';
    }

    function isSameSite(siteId) {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.siteId == siteId;
    }

    // Users can read their own record; management can read all users at their site
    match /users/{uid} {
      allow read: if request.auth.uid == uid || isManagement();
      allow write: if isManagement();
    }

    match /sites/{siteId} {
      allow read: if isAuthenticated();
      allow write: if isManagement();
    }

    match /investigators/{docId} {
      allow read: if isAuthenticated() && isSameSite(resource.data.siteId);
      allow write: if isManagement();
    }

    match /studies/{docId} {
      allow read: if isAuthenticated() && isSameSite(resource.data.siteId);
      allow write: if isManagement();
    }

    match /visits/{docId} {
      allow read: if isAuthenticated() && isSameSite(resource.data.siteId);
      allow create: if isAuthenticated() && isSameSite(request.resource.data.siteId);
      allow update, delete: if isManagement();
    }

    match /assessments/{docId} {
      allow read: if isAuthenticated() && isSameSite(resource.data.siteId);
      allow create: if isAuthenticated() && isSameSite(request.resource.data.siteId);
      allow update, delete: if isManagement();
    }

    match /delegationLog/{docId} {
      allow read: if isAuthenticated() && isSameSite(resource.data.siteId);
      allow write: if isManagement();
    }

    match /imports/{docId} {
      allow read, write: if isManagement();
    }

    match /contracts/{docId} {
      allow read, write: if isManagement();
    }

    match /capacityConfig/{docId} {
      allow read: if isAuthenticated();
      allow write: if isManagement();
    }
  }
}
```

- [ ] **Step 6: Create `firebase.json`**

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

- [ ] **Step 7: Create `firestore.indexes.json`**

```json
{
  "indexes": [
    {
      "collectionGroup": "visits",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "siteId", "order": "ASCENDING" },
        { "fieldPath": "investigatorId", "order": "ASCENDING" },
        { "fieldPath": "scheduledDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "visits",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "siteId", "order": "ASCENDING" },
        { "fieldPath": "studyId", "order": "ASCENDING" },
        { "fieldPath": "scheduledDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "assessments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "siteId", "order": "ASCENDING" },
        { "fieldPath": "investigatorId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

- [ ] **Step 8: Create `.firebaserc`**

Replace `YOUR_PROJECT_ID` with the actual Firebase project ID from the legacy prototype:
```json
{
  "projects": {
    "default": "YOUR_PROJECT_ID"
  }
}
```

- [ ] **Step 9: Verify TypeScript compiles**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src/lib/ firestore.rules firebase.json firestore.indexes.json .firebaserc .gitignore .env.example
git commit -m "feat: add Firebase config, auth helpers, and Firestore security rules"
```

---

## Task 5: Firestore Scope Helper

**Files:**
- Create: `src/lib/firestore.ts`

- [ ] **Step 1: Write the Firestore scope helper**

```typescript
import {
  collection,
  CollectionReference,
  DocumentData,
  query,
  where,
  Query,
} from 'firebase/firestore'
import { db } from './firebase'

export function col(name: string): CollectionReference<DocumentData> {
  return collection(db, name)
}

export function withSite(
  collectionName: string,
  siteId: string,
): Query<DocumentData> {
  return query(col(collectionName), where('siteId', '==', siteId))
}

export function withSiteAndInvestigator(
  collectionName: string,
  siteId: string,
  investigatorId: string,
): Query<DocumentData> {
  return query(
    col(collectionName),
    where('siteId', '==', siteId),
    where('investigatorId', '==', investigatorId),
  )
}
```

- [ ] **Step 2: Verify compile**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/firestore.ts
git commit -m "feat: add Firestore collection scope helpers"
```

---

## Task 6: AuthContext + useAuth Hook

**Files:**
- Create: `src/context/AuthContext.tsx`, `src/hooks/useAuth.ts`
- Create: `src/context/__tests__/AuthContext.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/context/__tests__/AuthContext.test.tsx`:
```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuth } from '@/hooks/useAuth'
import { AuthProvider } from '@/context/AuthContext'
import type { ReactNode } from 'react'

// Mock Firebase auth
vi.mock('@/lib/firebase', () => ({
  auth: {
    onAuthStateChanged: vi.fn(),
    currentUser: null,
  },
}))

vi.mock('@/lib/auth', () => ({
  getAppUser: vi.fn(),
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts with loading true and no user', () => {
    const { auth } = require('@/lib/firebase')
    auth.onAuthStateChanged.mockImplementation((cb: (u: null) => void) => {
      // Don't call cb — simulate pending state
      return () => {}
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it('sets user to null when not authenticated', async () => {
    const { auth } = require('@/lib/firebase')
    auth.onAuthStateChanged.mockImplementation((cb: (u: null) => void) => {
      cb(null)
      return () => {}
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.user).toBeNull()
  })

  it('sets user when authenticated', async () => {
    const { auth } = require('@/lib/firebase')
    const { getAppUser } = require('@/lib/auth')

    const mockAppUser = {
      uid: 'uid123',
      email: 'test@k2.com',
      displayName: 'Test User',
      role: 'management' as const,
      siteId: 'tampa',
      assignedStudies: [],
    }

    auth.onAuthStateChanged.mockImplementation(
      (cb: (u: { uid: string }) => void) => {
        cb({ uid: 'uid123' })
        return () => {}
      },
    )
    getAppUser.mockResolvedValue(mockAppUser)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.user).toEqual(mockAppUser)
    expect(result.current.role).toBe('management')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- AuthContext
```
Expected: FAIL — `AuthProvider` and `useAuth` not found.

- [ ] **Step 3: Create `src/context/AuthContext.tsx`**

```typescript
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getAppUser } from '@/lib/auth'
import type { AppUser, Role } from '@/types'

interface AuthContextValue {
  user: AppUser | null
  role: Role | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        setUser(null)
        setLoading(false)
        return
      }
      const appUser = await getAppUser(firebaseUser)
      setUser(appUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ user, role: user?.role ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
```

- [ ] **Step 4: Create `src/hooks/useAuth.ts`**

```typescript
export { useAuthContext as useAuth } from '@/context/AuthContext'
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- AuthContext
```
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/context/AuthContext.tsx src/hooks/useAuth.ts src/context/__tests__/AuthContext.test.tsx
git commit -m "feat: add AuthContext and useAuth hook with tests"
```

---

## Task 7: SiteContext + useSite Hook

**Files:**
- Create: `src/context/SiteContext.tsx`, `src/hooks/useSite.ts`
- Create: `src/context/__tests__/SiteContext.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/context/__tests__/SiteContext.test.tsx`:
```typescript
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SiteProvider } from '@/context/SiteContext'
import { useSite } from '@/hooks/useSite'
import type { ReactNode } from 'react'

const wrapper = ({ children }: { children: ReactNode }) => (
  <SiteProvider initialSiteId="tampa">{children}</SiteProvider>
)

describe('useSite', () => {
  it('returns the initial siteId', () => {
    const { result } = renderHook(() => useSite(), { wrapper })
    expect(result.current.siteId).toBe('tampa')
  })

  it('updates siteId when setActiveSite is called', () => {
    const { result } = renderHook(() => useSite(), { wrapper })

    act(() => {
      result.current.setActiveSite('winter-garden')
    })

    expect(result.current.siteId).toBe('winter-garden')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- SiteContext
```
Expected: FAIL — `SiteProvider` and `useSite` not found.

- [ ] **Step 3: Create `src/context/SiteContext.tsx`**

```typescript
import { createContext, useContext, useState, type ReactNode } from 'react'

interface SiteContextValue {
  siteId: string
  setActiveSite: (siteId: string) => void
}

const SiteContext = createContext<SiteContextValue | null>(null)

export function SiteProvider({
  children,
  initialSiteId = 'tampa',
}: {
  children: ReactNode
  initialSiteId?: string
}) {
  const [siteId, setSiteId] = useState(initialSiteId)

  return (
    <SiteContext.Provider value={{ siteId, setActiveSite: setSiteId }}>
      {children}
    </SiteContext.Provider>
  )
}

export function useSiteContext(): SiteContextValue {
  const ctx = useContext(SiteContext)
  if (!ctx) throw new Error('useSiteContext must be used within SiteProvider')
  return ctx
}
```

- [ ] **Step 4: Create `src/hooks/useSite.ts`**

```typescript
export { useSiteContext as useSite } from '@/context/SiteContext'
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- SiteContext
```
Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/context/SiteContext.tsx src/hooks/useSite.ts src/context/__tests__/SiteContext.test.tsx
git commit -m "feat: add SiteContext and useSite hook with tests"
```

---

## Task 8: Route Guards

**Files:**
- Create: `src/router/PrivateRoute.tsx`, `src/router/RoleRoute.tsx`
- Create: `src/router/__tests__/PrivateRoute.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/router/__tests__/PrivateRoute.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { PrivateRoute } from '@/router/PrivateRoute'
import { RoleRoute } from '@/router/RoleRoute'

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('PrivateRoute', () => {
  it('renders children when user is authenticated', () => {
    const { useAuth } = require('@/hooks/useAuth')
    useAuth.mockReturnValue({ user: { uid: '1' }, role: 'management', loading: false })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('redirects to /login when not authenticated', () => {
    const { useAuth } = require('@/hooks/useAuth')
    useAuth.mockReturnValue({ user: null, role: null, loading: false })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })
})

describe('RoleRoute', () => {
  it('renders children when role matches', () => {
    const { useAuth } = require('@/hooks/useAuth')
    useAuth.mockReturnValue({ user: { uid: '1' }, role: 'management', loading: false })

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route element={<RoleRoute allowedRole="management" />}>
            <Route path="/admin" element={<div>Admin Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Admin Page')).toBeInTheDocument()
  })

  it('redirects to / when role does not match', () => {
    const { useAuth } = require('@/hooks/useAuth')
    useAuth.mockReturnValue({ user: { uid: '1' }, role: 'staff', loading: false })

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route element={<RoleRoute allowedRole="management" />}>
            <Route path="/admin" element={<div>Admin Page</div>} />
          </Route>
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.queryByText('Admin Page')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- PrivateRoute
```
Expected: FAIL — components not found.

- [ ] **Step 3: Create `src/router/PrivateRoute.tsx`**

```typescript
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function PrivateRoute() {
  const { user, loading } = useAuth()

  if (loading) return null

  return user ? <Outlet /> : <Navigate to="/login" replace />
}
```

- [ ] **Step 4: Create `src/router/RoleRoute.tsx`**

```typescript
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { Role } from '@/types'

interface Props {
  allowedRole: Role
}

export function RoleRoute({ allowedRole }: Props) {
  const { role, loading } = useAuth()

  if (loading) return null

  return role === allowedRole ? <Outlet /> : <Navigate to="/" replace />
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- PrivateRoute
```
Expected: 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/router/PrivateRoute.tsx src/router/RoleRoute.tsx src/router/__tests__/PrivateRoute.test.tsx
git commit -m "feat: add PrivateRoute and RoleRoute guards with tests"
```

---

## Task 9: Login Page

**Files:**
- Create: `src/pages/Login.tsx`
- Create: `src/pages/__tests__/Login.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/__tests__/Login.test.tsx`:
```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Login } from '@/pages/Login'

vi.mock('@/lib/auth', () => ({
  signIn: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  )

describe('Login', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders email and password fields and submit button', () => {
    renderLogin()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows error when email is empty on submit', async () => {
    renderLogin()
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(screen.getByText(/email is required/i)).toBeInTheDocument()
  })

  it('shows error when password is empty on submit', async () => {
    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'test@k2.com')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
  })

  it('calls signIn with credentials on valid submit', async () => {
    const { signIn } = require('@/lib/auth')
    signIn.mockResolvedValue(undefined)

    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'test@k2.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('test@k2.com', 'password123')
    })
  })

  it('shows Firebase error message on sign-in failure', async () => {
    const { signIn } = require('@/lib/auth')
    signIn.mockRejectedValue(new Error('auth/invalid-credential'))

    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'test@k2.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- Login.test
```
Expected: FAIL — `Login` not found.

- [ ] **Step 3: Create `src/pages/Login.tsx`**

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const next: typeof errors = {}
    if (!email) next.email = 'Email is required'
    if (!password) next.password = 'Password is required'
    if (Object.keys(next).length) { setErrors(next); return }

    setErrors({})
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/', { replace: true })
    } catch {
      setErrors({ general: 'Invalid email or password' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-sm space-y-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">K2 Medical Research</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sign in to your account</p>
        </div>

        {errors.general && (
          <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={errors.password ? 'border-red-500' : ''}
            />
            {errors.password && (
              <p className="text-xs text-red-600">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- Login.test
```
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Login.tsx src/pages/__tests__/Login.test.tsx
git commit -m "feat: add Login page with validation and error handling"
```

---

## Task 10: NavItem + Sidebar + TopBar

**Files:**
- Create: `src/components/layout/NavItem.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/TopBar.tsx`
- Create: `src/components/shared/SyncIndicator.tsx`
- Create: `src/components/layout/__tests__/Sidebar.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/layout/__tests__/Sidebar.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { Sidebar } from '@/components/layout/Sidebar'

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))

const renderSidebar = (role: 'management' | 'staff') => {
  const { useAuth } = require('@/hooks/useAuth')
  useAuth.mockReturnValue({
    user: { displayName: 'Test User', role },
    role,
    loading: false,
  })
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  )
}

describe('Sidebar', () => {
  it('shows management nav items for management role', () => {
    renderSidebar('management')
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Financial')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('does not show management items for staff role', () => {
    renderSidebar('staff')
    expect(screen.queryByText('Financial')).not.toBeInTheDocument()
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('shows staff nav items for staff role', () => {
    renderSidebar('staff')
    expect(screen.getByText('My Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Data Entry')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- Sidebar.test
```
Expected: FAIL.

- [ ] **Step 3: Create `src/components/layout/NavItem.tsx`**

```typescript
import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

interface Props {
  to: string
  icon: LucideIcon
  label: string
}

export function NavItem({ to, icon: Icon, label }: Props) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
          isActive
            ? 'bg-teal-600/20 text-teal-400'
            : 'text-slate-400 hover:bg-slate-700 hover:text-white',
        ].join(' ')
      }
    >
      <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  )
}
```

- [ ] **Step 4: Create `src/components/layout/Sidebar.tsx`**

```typescript
import {
  LayoutDashboard, Users, BookOpen, TrendingUp,
  Calendar, DollarSign, FileBarChart, Upload,
  Settings, ClipboardList, BookMarked, User,
} from 'lucide-react'
import { NavItem } from './NavItem'
import { useAuth } from '@/hooks/useAuth'

const MANAGEMENT_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/investigators', icon: Users, label: 'Investigators' },
  { to: '/studies', icon: BookOpen, label: 'Studies' },
  { to: '/enrollment', icon: TrendingUp, label: 'Enrollment' },
  { to: '/workload', icon: Calendar, label: 'Workload Planner' },
  { to: '/financial', icon: DollarSign, label: 'Financial' },
  { to: '/reports', icon: FileBarChart, label: 'Reports' },
  { to: '/import', icon: Upload, label: 'Import' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

const STAFF_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'My Dashboard' },
  { to: '/data-entry', icon: ClipboardList, label: 'Data Entry' },
  { to: '/my-studies', icon: BookMarked, label: 'My Studies' },
  { to: '/profile', icon: User, label: 'My Profile' },
]

export function Sidebar() {
  const { role } = useAuth()
  const navItems = role === 'management' ? MANAGEMENT_NAV : STAFF_NAV

  return (
    <aside className="w-60 shrink-0 bg-k2-primary flex flex-col h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-slate-700">
        <span className="text-white font-bold text-lg tracking-tight">K2 Research</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 5: Create `src/components/shared/SyncIndicator.tsx`**

```typescript
import { Cloud, CloudOff, Loader2 } from 'lucide-react'
import type { SyncStatus } from '@/types'

interface Props {
  status: SyncStatus
}

const config: Record<SyncStatus, { icon: typeof Cloud; label: string; className: string }> = {
  synced: { icon: Cloud, label: 'Synced', className: 'text-green-400' },
  syncing: { icon: Loader2, label: 'Syncing', className: 'text-amber-400 animate-spin' },
  offline: { icon: CloudOff, label: 'Offline', className: 'text-red-400' },
}

export function SyncIndicator({ status }: Props) {
  const { icon: Icon, label, className } = config[status]
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${className}`}>
      <Icon size={14} aria-hidden="true" />
      {label}
    </span>
  )
}
```

- [ ] **Step 6: Create `src/components/layout/TopBar.tsx`**

```typescript
import { Moon, Sun, ChevronDown } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSite } from '@/hooks/useSite'
import { SyncIndicator } from '@/components/shared/SyncIndicator'
import type { SyncStatus } from '@/types'

interface Props {
  syncStatus: SyncStatus
  isDark: boolean
  onToggleDark: () => void
}

export function TopBar({ syncStatus, isDark, onToggleDark }: Props) {
  const { user, role } = useAuth()
  const { siteId } = useSite()

  const siteName = siteId === 'tampa' ? 'Tampa' : siteId

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 rounded-full border border-teal-200 dark:border-teal-800">
          {siteName}
        </span>
        {role === 'management' && (
          <button
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="Switch site"
          >
            Switch site <ChevronDown size={12} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <SyncIndicator status={syncStatus} />

        <div className="text-right">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-none">
            {user?.displayName}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize mt-0.5">
            {role}
          </p>
        </div>

        <button
          onClick={onToggleDark}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npm test -- Sidebar.test
```
Expected: 3 tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/
git commit -m "feat: add Sidebar, NavItem, TopBar, and SyncIndicator components"
```

---

## Task 11: AppShell + Dark Mode

**Files:**
- Create: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: Create `src/components/layout/AppShell.tsx`**

```typescript
import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import type { SyncStatus } from '@/types'

interface Props {
  syncStatus?: SyncStatus
}

export function AppShell({ syncStatus = 'synced' }: Props) {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('k2-theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('k2-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          syncStatus={syncStatus}
          isDark={isDark}
          onToggleDark={() => setIsDark((d) => !d)}
        />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat: add AppShell layout with dark mode persistence"
```

---

## Task 12: Stub Pages

**Files:**
- Create: all stub pages in `src/pages/management/` and `src/pages/staff/`

- [ ] **Step 1: Create management stub pages**

Create each file with this pattern (replacing the title for each):

`src/pages/management/Overview.tsx`:
```typescript
export function Overview() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Overview Dashboard</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm">Capacity and workload summary — coming in Phase 3.</p>
    </div>
  )
}
```

Create the same stub structure for:
- `src/pages/management/Investigators.tsx` — title "Investigators"
- `src/pages/management/Studies.tsx` — title "Studies", note "Phase 2"
- `src/pages/management/Enrollment.tsx` — title "Enrollment"
- `src/pages/management/WorkloadPlanner.tsx` — title "Workload Planner"
- `src/pages/management/Financial.tsx` — title "Financial"
- `src/pages/management/Reports.tsx` — title "Reports"
- `src/pages/management/Import.tsx` — title "Import"

`src/pages/management/Settings.tsx` — add a note about user management:
```typescript
export function Settings() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Settings</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm">User management and site configuration — Phase 1 scope: create staff accounts.</p>
    </div>
  )
}
```

- [ ] **Step 2: Create staff stub pages**

`src/pages/staff/MyDashboard.tsx`:
```typescript
export function MyDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">My Dashboard</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm">Your capacity and schedule — coming in Phase 2.</p>
    </div>
  )
}
```

Same pattern for:
- `src/pages/staff/DataEntry.tsx` — title "Data Entry"
- `src/pages/staff/MyStudies.tsx` — title "My Studies"
- `src/pages/staff/MyProfile.tsx` — title "My Profile"

- [ ] **Step 3: Commit**

```bash
git add src/pages/
git commit -m "feat: add stub pages for all management and staff routes"
```

---

## Task 13: Router + App Root

**Files:**
- Create: `src/router/index.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

- [ ] **Step 1: Create `src/router/index.tsx`**

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PrivateRoute } from './PrivateRoute'
import { RoleRoute } from './RoleRoute'
import { AppShell } from '@/components/layout/AppShell'
import { Login } from '@/pages/Login'
import { Overview } from '@/pages/management/Overview'
import { Investigators } from '@/pages/management/Investigators'
import { Studies } from '@/pages/management/Studies'
import { Enrollment } from '@/pages/management/Enrollment'
import { WorkloadPlanner } from '@/pages/management/WorkloadPlanner'
import { Financial } from '@/pages/management/Financial'
import { Reports } from '@/pages/management/Reports'
import { Import } from '@/pages/management/Import'
import { Settings } from '@/pages/management/Settings'
import { MyDashboard } from '@/pages/staff/MyDashboard'
import { DataEntry } from '@/pages/staff/DataEntry'
import { MyStudies } from '@/pages/staff/MyStudies'
import { MyProfile } from '@/pages/staff/MyProfile'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<PrivateRoute />}>
          <Route element={<AppShell />}>
            {/* Management routes */}
            <Route element={<RoleRoute allowedRole="management" />}>
              <Route path="/" element={<Overview />} />
              <Route path="/investigators" element={<Investigators />} />
              <Route path="/studies" element={<Studies />} />
              <Route path="/enrollment" element={<Enrollment />} />
              <Route path="/workload" element={<WorkloadPlanner />} />
              <Route path="/financial" element={<Financial />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/import" element={<Import />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Staff routes */}
            <Route element={<RoleRoute allowedRole="staff" />}>
              <Route path="/" element={<MyDashboard />} />
              <Route path="/data-entry" element={<DataEntry />} />
              <Route path="/my-studies" element={<MyStudies />} />
              <Route path="/profile" element={<MyProfile />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Update `src/App.tsx`**

```typescript
import { AuthProvider } from '@/context/AuthContext'
import { SiteProvider } from '@/context/SiteContext'
import { AppRouter } from '@/router'

export default function App() {
  return (
    <AuthProvider>
      <SiteProvider initialSiteId="tampa">
        <AppRouter />
      </SiteProvider>
    </AuthProvider>
  )
}
```

- [ ] **Step 3: Update `src/main.tsx`**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 4: Run all tests**

```bash
npm test
```
Expected: All tests pass.

- [ ] **Step 5: Run the dev server and verify**

```bash
npm run dev
```

Open `http://localhost:5173`. Expected:
- Redirected to `/login` (not authenticated)
- Login form appears with K2 branding
- Type incorrect credentials → "Invalid email or password" error
- Type correct credentials (from the Firebase project) → redirected to app shell
- Management user: sees full sidebar, Overview Dashboard stub page
- Dark mode toggle works, persists on refresh

- [ ] **Step 6: Commit**

```bash
git add src/router/ src/App.tsx src/main.tsx
git commit -m "feat: wire up React Router with auth and role guards, complete app shell"
```

---

## Task 14: Data Migration Script

**Files:**
- Create: `src/scripts/migrate.ts`

This script runs once against the existing Firebase project to transform the legacy data into the new collection structure. Read the legacy prototype (`public/investigator-kpi-tracker.html`) to understand the existing data shapes before running.

- [ ] **Step 1: Identify legacy data shapes**

Open `public/investigator-kpi-tracker.html` and search for:
- `studyData` or `studyDetailsData` — study config object
- `entries` — visit/assessment entries  
- `assessmentEntries` — assessment records
- `participantData` — enrollment data
- `investigators` — investigator list
- `firebaseConfig` — confirm the project ID matches `.firebaserc`

Note the exact field names — the migration maps them to the new schema.

- [ ] **Step 2: Create `src/scripts/migrate.ts`**

```typescript
/**
 * One-time migration script: transforms legacy prototype data into the new schema.
 * Run with: npx tsx src/scripts/migrate.ts
 * Safe to re-run — skips documents that already have siteId set.
 * Archive this file after the migration is confirmed successful.
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const SITE_ID = 'tampa'

async function migrateEntries() {
  console.log('Migrating entries → visits...')
  const snap = await getDocs(collection(db, 'entries'))
  let migrated = 0
  let skipped = 0

  const batch = writeBatch(db)
  snap.forEach((docSnap) => {
    const data = docSnap.data()
    if (data.siteId) { skipped++; return }

    batch.set(doc(db, 'visits', docSnap.id), {
      ...data,
      siteId: SITE_ID,
      source: 'legacy',
      // Map legacy field names to new schema
      visitType: data.visitType ?? data.type ?? 'unknown',
      status: data.status ?? 'completed',
      scheduledDate: data.date ?? data.scheduledDate ?? '',
      completedDate: data.completedDate ?? data.date ?? null,
      durationMinutes: data.durationMinutes ?? data.duration ?? 0,
      actualDurationMinutes: data.actualDurationMinutes ?? null,
    })
    migrated++
  })

  await batch.commit()
  console.log(`  Migrated: ${migrated}, Skipped (already have siteId): ${skipped}`)
}

async function migrateAssessmentEntries() {
  console.log('Migrating assessmentEntries → assessments...')
  const snap = await getDocs(collection(db, 'assessmentEntries'))
  let migrated = 0

  const batch = writeBatch(db)
  snap.forEach((docSnap) => {
    const data = docSnap.data()
    if (data.siteId) return

    batch.set(doc(db, 'assessments', docSnap.id), {
      ...data,
      siteId: SITE_ID,
      scaleType: data.scaleType ?? data.scale ?? 'unknown',
      durationMinutes: data.durationMinutes ?? data.duration ?? 0,
      visitId: data.visitId ?? null,
    })
    migrated++
  })

  await batch.commit()
  console.log(`  Migrated: ${migrated}`)
}

async function migrateInvestigators() {
  console.log('Migrating investigators...')
  const snap = await getDocs(collection(db, 'investigators'))
  let migrated = 0

  const batch = writeBatch(db)
  snap.forEach((docSnap) => {
    const data = docSnap.data()
    if (data.siteId) return

    batch.set(doc(db, 'investigators', docSnap.id), {
      ...data,
      siteId: SITE_ID,
      weeklyCapacityHours: data.weeklyCapacityHours ?? 40,
      siteBaselinePct: data.siteBaselinePct ?? 15,
      assignedStudies: data.assignedStudies ?? [],
      credentials: data.credentials ?? '',
      role: data.role ?? 'PI',
    })
    migrated++
  })

  await batch.commit()
  console.log(`  Migrated: ${migrated}`)
}

async function migrateSite() {
  console.log('Ensuring Tampa site record exists...')
  await setDoc(doc(db, 'sites', SITE_ID), {
    id: SITE_ID,
    name: 'K2 Medical Research Tampa',
    location: 'Tampa, FL',
    active: true,
    timezone: 'America/New_York',
  }, { merge: true })
  console.log('  Done.')
}

async function main() {
  console.log('Starting K2 legacy data migration...')
  console.log(`Target site: ${SITE_ID}`)
  console.log()

  await migrateSite()
  await migrateInvestigators()
  await migrateEntries()
  await migrateAssessmentEntries()

  console.log()
  console.log('Migration complete. Verify data in Firebase Console before archiving this script.')
}

main().catch(console.error)
```

- [ ] **Step 3: Add tsx to dev dependencies**

```bash
npm install -D tsx
```

- [ ] **Step 4: Add migration script to package.json**

```json
{
  "scripts": {
    "migrate": "tsx src/scripts/migrate.ts"
  }
}
```

- [ ] **Step 5: Test migration dry run (do not commit actual migration)**

Before running against the real Firebase project, open `public/investigator-kpi-tracker.html` and compare the field names in the legacy `entries` collection with what the migration script maps. Adjust the field name mappings in `migrateEntries()` and `migrateAssessmentEntries()` if they differ.

When ready to run:
```bash
npm run migrate
```

Expected output:
```
Starting K2 legacy data migration...
Target site: tampa

Ensuring Tampa site record exists...
  Done.
Migrating investigators...
  Migrated: 3
Migrating entries → visits...
  Migrated: X, Skipped (already have siteId): 0
Migrating assessmentEntries → assessments...
  Migrated: Y
Migration complete. Verify data in Firebase Console before archiving this script.
```

- [ ] **Step 6: Verify migration in Firebase Console**

Open Firebase Console → Firestore for the project. Confirm:
- `sites/tampa` document exists with correct fields
- `investigators` documents have `siteId: "tampa"`
- `visits` documents have `siteId: "tampa"` and `source: "legacy"`
- `assessments` documents have `siteId: "tampa"`

- [ ] **Step 7: Commit**

```bash
git add src/scripts/migrate.ts package.json
git commit -m "feat: add one-time legacy data migration script"
```

---

## Task 15: Firebase Deploy + Phase 1 Verification

- [ ] **Step 1: Install Firebase CLI (if not installed)**

```bash
npm install -g firebase-tools
firebase login
```

- [ ] **Step 2: Build the app**

```bash
npm run build
```
Expected: `dist/` folder created, no TypeScript errors.

- [ ] **Step 3: Deploy Firestore rules and indexes**

```bash
firebase deploy --only firestore
```
Expected: Rules and indexes deployed successfully.

- [ ] **Step 4: Deploy the app**

```bash
firebase deploy --only hosting
```
Expected: App deployed. Copy the Hosting URL from the output.

- [ ] **Step 5: Phase 1 acceptance test checklist**

Open the deployed URL and verify:

**Auth:**
- [ ] Visiting the app unauthenticated → redirected to `/login`
- [ ] Login with wrong credentials → "Invalid email or password" error shown
- [ ] Login with management account → redirected to Overview Dashboard
- [ ] Management sidebar shows: Overview, Investigators, Studies, Enrollment, Workload Planner, Financial, Reports, Import, Settings
- [ ] Login with staff account → redirected to My Dashboard
- [ ] Staff sidebar shows: My Dashboard, Data Entry, My Studies, My Profile
- [ ] Staff account cannot access `/financial` or `/settings` (redirected to `/`)

**Navigation:**
- [ ] All sidebar links navigate correctly to their stub pages
- [ ] Active nav item highlighted in teal
- [ ] Back/forward browser navigation works

**Top Bar:**
- [ ] Tampa site badge visible
- [ ] Logged-in user's name and role displayed
- [ ] Sync indicator shows "Synced"
- [ ] Dark mode toggle works and persists on page refresh

**Multi-site:**
- [ ] Management role sees "Switch site" button in TopBar (clicking it does nothing yet — Phase 2 enhancement)

**Legacy data (after running migration):**
- [ ] Login as management → no errors loading the app (no Firestore permission errors in console)

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: Phase 1 complete — auth, navigation shell, design system, multi-site framework, data migration"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Firebase Auth, 2 roles (management/staff) → Tasks 4, 6, 8
- [x] Multi-site framework (siteId scoping) → Tasks 5, 7, 11
- [x] Navigation shell (role-gated sidebar, top bar) → Tasks 10, 11, 13
- [x] Data migration from prototype → Task 14
- [x] Tailwind design system → Tasks 2, 10
- [x] shadcn/ui component library → Task 1
- [x] Firestore security rules → Task 4
- [x] Login (no self-registration) → Task 9
- [x] Sync status indicator → Task 10
- [x] Dark mode toggle → Task 11
- [x] Stub pages for all routes → Task 12
- [x] Firebase Hosting deploy → Task 15

**Type consistency check:**
- `AppUser.role` is typed as `Role` (`'management' | 'staff'`) consistently across `types/index.ts`, `AuthContext.tsx`, `RoleRoute.tsx`, `Sidebar.tsx`
- `SyncStatus` used in `TopBar.tsx` and `AppShell.tsx` — matches type definition
- `withSite()` returns `Query<DocumentData>` — not yet consumed in Phase 1 stubs, will be used in Phase 2

**No placeholders confirmed:** All task steps contain complete code.

---

> **Phases 2–5 plans:** Written separately after Phase 1 is deployed and verified.  
> Phase 2 plan: Study Management + Workload Tracking + Protocol Parser  
> Phase 3 plan: Management Dashboards  
> Phase 4 plan: Predictive Engine  
> Phase 5 plan: Import Pipeline
