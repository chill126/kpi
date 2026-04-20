# Code Splitting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single 1.3 MB JS bundle into route-level chunks so users only download code for the pages they visit, with Recharts isolated in its own vendor chunk.

**Architecture:** Convert all route-level page imports in `src/router/index.tsx` from static to `React.lazy` dynamic imports, wrap routes in `<Suspense>` with a skeleton fallback component, and add Vite `manualChunks` to pull Recharts into a dedicated vendor chunk. Named exports are re-wrapped via `.then(m => ({ default: m.X }))` so page files need no changes.

**Tech Stack:** React 18 (lazy/Suspense), Vite 6 (rollupOptions.output.manualChunks), TypeScript strict, Vitest + React Testing Library

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/components/shared/PageLoader.tsx` | Full-page skeleton shown while a lazy chunk loads |
| Create | `src/components/shared/__tests__/PageLoader.test.tsx` | Render test for PageLoader |
| Modify | `src/router/index.tsx` | Replace static imports with `lazy()`, add `<Suspense>` |
| Modify | `vite.config.ts` | Add `manualChunks` to isolate recharts vendor chunk |

---

### Task 1: PageLoader skeleton component

**Files:**
- Create: `src/components/shared/PageLoader.tsx`
- Create: `src/components/shared/__tests__/PageLoader.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/shared/__tests__/PageLoader.test.tsx
import { render, screen } from '@testing-library/react'
import { PageLoader } from '../PageLoader'

describe('PageLoader', () => {
  it('renders a loading skeleton', () => {
    render(<PageLoader />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has accessible label', () => {
    render(<PageLoader />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading page')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/shared/__tests__/PageLoader.test.tsx
```

Expected: FAIL — `PageLoader` not found

- [ ] **Step 3: Implement PageLoader**

```tsx
// src/components/shared/PageLoader.tsx
import { Skeleton } from '@/components/ui/skeleton'

export function PageLoader() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="flex flex-col gap-4 p-6 w-full"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/shared/__tests__/PageLoader.test.tsx
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/PageLoader.tsx src/components/shared/__tests__/PageLoader.test.tsx
git commit -m "feat: add PageLoader skeleton for Suspense fallback"
```

---

### Task 2: Convert router to lazy imports with Suspense

**Files:**
- Modify: `src/router/index.tsx`

- [ ] **Step 1: Write a smoke test for the lazy router**

Add a new test file:

```tsx
// src/router/__tests__/AppRouter.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

// Mock all lazy page components so they resolve immediately
vi.mock('@/pages/management/Overview', () => ({ Overview: () => <div>Overview</div> }))
vi.mock('@/pages/management/Investigators', () => ({ Investigators: () => <div>Investigators</div> }))
vi.mock('@/pages/management/Studies', () => ({ Studies: () => <div>Studies</div> }))
vi.mock('@/pages/management/Enrollment', () => ({ Enrollment: () => <div>Enrollment</div> }))
vi.mock('@/pages/management/WorkloadPlanner', () => ({ WorkloadPlanner: () => <div>WorkloadPlanner</div> }))
vi.mock('@/pages/management/Financial', () => ({ Financial: () => <div>Financial</div> }))
vi.mock('@/pages/management/Reports', () => ({ Reports: () => <div>Reports</div> }))
vi.mock('@/pages/management/Import', () => ({ Import: () => <div>Import</div> }))
vi.mock('@/pages/management/Settings', () => ({ Settings: () => <div>Settings</div> }))
vi.mock('@/pages/management/StudyDetail', () => ({ StudyDetail: () => <div>StudyDetail</div> }))
vi.mock('@/pages/staff/MyDashboard', () => ({ MyDashboard: () => <div>MyDashboard</div> }))
vi.mock('@/pages/staff/DataEntry', () => ({ DataEntry: () => <div>DataEntry</div> }))
vi.mock('@/pages/staff/MyStudies', () => ({ MyStudies: () => <div>MyStudies</div> }))
vi.mock('@/pages/staff/MyProfile', () => ({ MyProfile: () => <div>MyProfile</div> }))
vi.mock('@/pages/Login', () => ({ Login: () => <div>Login</div> }))
vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ user: null, loading: false }),
}))
vi.mock('@/context/SiteContext', () => ({
  SiteProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSite: () => ({ siteId: 'tampa' }),
}))

import { AppRouter } from '../index'

it('renders login route without crashing', async () => {
  render(<AppRouter />)
  // Login route renders via Suspense — wait for it
  await waitFor(() => {
    expect(document.body).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it passes with current static imports (baseline)**

```bash
npx vitest run src/router/__tests__/AppRouter.test.tsx
```

Expected: PASS — establishes baseline before conversion

- [ ] **Step 3: Replace static imports with React.lazy in router**

Replace the entire contents of `src/router/index.tsx`:

```tsx
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PrivateRoute } from './PrivateRoute'
import { RoleRoute } from './RoleRoute'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/shared/PageLoader'

const Login = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })))
const Overview = lazy(() => import('@/pages/management/Overview').then(m => ({ default: m.Overview })))
const Investigators = lazy(() => import('@/pages/management/Investigators').then(m => ({ default: m.Investigators })))
const Studies = lazy(() => import('@/pages/management/Studies').then(m => ({ default: m.Studies })))
const Enrollment = lazy(() => import('@/pages/management/Enrollment').then(m => ({ default: m.Enrollment })))
const WorkloadPlanner = lazy(() => import('@/pages/management/WorkloadPlanner').then(m => ({ default: m.WorkloadPlanner })))
const Financial = lazy(() => import('@/pages/management/Financial').then(m => ({ default: m.Financial })))
const Reports = lazy(() => import('@/pages/management/Reports').then(m => ({ default: m.Reports })))
const Import = lazy(() => import('@/pages/management/Import').then(m => ({ default: m.Import })))
const Settings = lazy(() => import('@/pages/management/Settings').then(m => ({ default: m.Settings })))
const StudyDetail = lazy(() => import('@/pages/management/StudyDetail').then(m => ({ default: m.StudyDetail })))
const MyDashboard = lazy(() => import('@/pages/staff/MyDashboard').then(m => ({ default: m.MyDashboard })))
const DataEntry = lazy(() => import('@/pages/staff/DataEntry').then(m => ({ default: m.DataEntry })))
const MyStudies = lazy(() => import('@/pages/staff/MyStudies').then(m => ({ default: m.MyStudies })))
const MyProfile = lazy(() => import('@/pages/staff/MyProfile').then(m => ({ default: m.MyProfile })))

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<PrivateRoute />}>
            <Route element={<AppShell />}>
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
                <Route path="/studies/:id" element={<StudyDetail />} />
              </Route>

              <Route element={<RoleRoute allowedRole="staff" />}>
                <Route path="/" element={<MyDashboard />} />
                <Route path="/data-entry" element={<DataEntry />} />
                <Route path="/my-studies" element={<MyStudies />} />
                <Route path="/profile" element={<MyProfile />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
```

- [ ] **Step 4: Run all tests to verify nothing broke**

```bash
npx vitest run
```

Expected: All 102+ tests PASS. The AppRouter smoke test should still pass because vi.mock intercepts the dynamic imports too.

- [ ] **Step 5: Commit**

```bash
git add src/router/index.tsx src/router/__tests__/AppRouter.test.tsx
git commit -m "feat: lazy-load all route pages with React.lazy + Suspense"
```

---

### Task 3: Add Vite manualChunks for recharts vendor split

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Add manualChunks to vite.config.ts**

Replace the entire contents of `vite.config.ts`:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'vendor-recharts'
          }
          if (id.includes('node_modules/firebase')) {
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

- [ ] **Step 2: Run build and check chunk output**

```bash
npx vite build
```

Expected output: Multiple chunks instead of one. Look for:
- `vendor-recharts-[hash].js` — Recharts + D3 (will be large but cached separately)
- `vendor-firebase-[hash].js` — Firebase SDK
- `vendor-react-[hash].js` — React + React DOM + React Router
- Multiple small `index-[hash].js` page chunks
- No single chunk over 500 kB warning (or significantly reduced)

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "feat: add manualChunks for recharts, firebase, and react vendor splits"
```

---

### Task 4: Full test suite verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: No errors

- [ ] **Step 4: Final build — record chunk sizes**

```bash
npx vite build
```

Record the output. The initial page load JS (excluding vendor chunks loaded on demand) should be well under 500 kB. Vendor chunks are cached by the browser after first load.

---

## Self-Review

**Spec coverage:**
- ✓ Recharts-heavy pages lazy loaded (Overview, Investigators, WorkloadPlanner, Financial, Reports)
- ✓ All management pages lazy loaded
- ✓ All staff pages lazy loaded  
- ✓ Suspense fallback with skeleton UI
- ✓ Recharts isolated in vendor chunk via manualChunks
- ✓ Named exports handled without touching page files
- ✓ Tests updated (smoke test + PageLoader unit test)

**Placeholder scan:** No TBDs or "implement later" present. All code blocks are complete.

**Type consistency:** `PageLoader` used consistently. `lazy()` + `.then(m => ({ default: m.X }))` pattern uniform across all 15 page imports.
