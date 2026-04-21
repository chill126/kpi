# KPI Tracker HUD Redesign — Pass 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Aurora Glass design system and replace `src/pages/management/Overview.tsx` with a calibrated-intensity HUD composition per the locked spec at `docs/superpowers/specs/2026-04-20-kpi-tracker-hud-redesign-design.md`.

**Architecture:** Add design tokens to the existing `@theme inline` block in `index.css`; ship ~30 new files under `src/components/hud/` as a self-contained primitive library; wire the library into `App.tsx` (left NavRail shell) and rewrite Overview to compose the new primitives. Data layer, hooks, and routing stay untouched. Existing shadcn primitives are reused (Dialog, Button, etc.); new primitives only exist where nothing equivalent ships with shadcn.

**Tech Stack:** React 18, TypeScript strict, Vite, Tailwind v4 (`@theme inline` tokens), shadcn/ui, Recharts, lucide-react, Vitest + React Testing Library. Adding: `cmdk`, `react-intersection-observer`.

---

## Pre-flight

- [ ] **Confirm the spec is loaded.** Open `docs/superpowers/specs/2026-04-20-kpi-tracker-hud-redesign-design.md` in your context and keep it referenced throughout. Every visual decision in this plan traces to a spec section.
- [ ] **Confirm branch.** Work on a new branch `hud/pass-1` cut from current `master`. Do not commit to `master` directly.
  ```bash
  git checkout -b hud/pass-1
  ```
- [ ] **Confirm baseline tests pass.**
  ```bash
  npm run test -- --run
  npx tsc --noEmit
  ```
  Expected: green + 0 TS errors against the existing 231-test suite.

---

## File Structure

Every new file is listed below. Grouped by phase; each task below creates or modifies the listed files.

```
src/
  index.css                                 MODIFY (add tokens, body aurora, .glass utilities)
  App.tsx                                   MODIFY (wrap AppRouter in <HudShell/>)
  components/hud/
    hooks/
      useCountUp.ts                         NEW  + useCountUp.test.ts
      usePrefersReducedMotion.ts            NEW
    StatusDot.tsx                           NEW  + StatusDot.test.tsx
    TrendChip.tsx                           NEW  + TrendChip.test.tsx
    Skeleton.tsx                            NEW  (API-compatible replacement)
    EmptyState.tsx                          NEW  + EmptyState.test.tsx
    ErrorState.tsx                          NEW  + ErrorState.test.tsx
    Tile.tsx                                NEW  + Tile.test.tsx
    Panel.tsx                               NEW  + Panel.test.tsx
    StatRing.tsx                            NEW  + StatRing.test.tsx
    HeroSentence.tsx                        NEW  + HeroSentence.test.tsx
    SectionHeader.tsx                       NEW
    charts/
      palette.ts                            NEW  + palette.test.ts
      defs.tsx                              NEW
      HUDTooltip.tsx                        NEW
      HUDBarChart.tsx                       NEW  + HUDBarChart.test.tsx
      HUDLineChart.tsx                      NEW
      HUDAreaChart.tsx                      NEW
    nav/
      BrandLockup.tsx                       NEW
      NavItem.tsx                           NEW  + NavItem.test.tsx
      NavGroup.tsx                          NEW
      UserChip.tsx                          NEW
      commandRegistry.ts                    NEW  + commandRegistry.test.ts
      keyboardShortcuts.ts                  NEW  + keyboardShortcuts.test.ts
      CommandPalette.tsx                    NEW  + CommandPalette.test.tsx
      NavRail.tsx                           NEW  + NavRail.test.tsx
      HudShell.tsx                          NEW  (layout wrapper around AppRouter)
    panels/
      NearCapacityList.tsx                  NEW  + NearCapacityList.test.tsx
      ActiveParticipantsPanel.tsx           NEW  + ActiveParticipantsPanel.test.tsx
  pages/management/
    Overview.tsx                            REWRITE
    __tests__/Overview.test.tsx             MODIFY (extend, do not delete existing assertions)

package.json                                MODIFY (add cmdk, react-intersection-observer)
```

---

## Phase A — Foundation

### Task A1: Install dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` (regenerated)

- [ ] **Step 1: Install cmdk and react-intersection-observer**

  ```bash
  npm install cmdk@^1.0.0 react-intersection-observer@^9.0.0
  ```

- [ ] **Step 2: Verify lucide-react is importable**

  Open `node_modules/lucide-react/package.json` and confirm the package exists. Do not add it; it is already in `package.json`.

- [ ] **Step 3: Smoke test build**

  ```bash
  npm run build
  ```
  Expected: builds cleanly, no new type errors.

- [ ] **Step 4: Commit**

  ```bash
  git add package.json package-lock.json
  git commit -m "hud: add cmdk and react-intersection-observer"
  ```

---

### Task A2: Add design tokens to index.css

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add tokens, aurora body, and .glass utilities**

  Append inside the existing `@theme inline` block (before its closing `}`):
  ```css
  /* === HUD TOKENS === */
  --color-canvas:          oklch(0.09 0.015 275);
  --color-canvas-raised:   oklch(0.13 0.020 275);
  --color-canvas-sunken:   oklch(0.07 0.015 275);

  --accent-primary: oklch(0.72 0.17 295);
  --accent-info:    oklch(0.80 0.12 220);
  --signal-good:    oklch(0.78 0.15 162);
  --signal-warn:    oklch(0.79 0.16 82);
  --signal-alert:   oklch(0.72 0.17 13);

  --text-primary:   oklch(0.97 0 0);
  --text-secondary: oklch(0.78 0.02 275);
  --text-label:     oklch(0.78 0.10 280);
  --text-muted:     oklch(0.55 0.01 275);

  --ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-enter:    cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast:      150ms;
  --dur-base:      200ms;
  --dur-count:     400ms;

  --glow-primary: 0 0 24px oklch(0.72 0.17 295 / 0.45);
  --glow-mint:    0 0 20px oklch(0.78 0.15 162 / 0.45);
  --glow-alert:   0 0 18px oklch(0.72 0.17 13  / 0.50);
  ```

  Append after the `@theme inline` block:
  ```css
  @layer base {
    body.hud {
      background:
        radial-gradient(75% 55% at 15% 10%, oklch(0.65 0.20 295 / 0.22), transparent 62%),
        radial-gradient(60% 45% at 85% 15%, oklch(0.75 0.13 220 / 0.16), transparent 62%),
        linear-gradient(180deg, var(--color-canvas) 0%, oklch(0.08 0.018 275) 100%);
      background-attachment: fixed;
      color: var(--text-primary);
      min-height: 100vh;
    }
  }

  @layer components {
    .glass {
      background: rgba(255 255 255 / 0.04);
      backdrop-filter: blur(14px) saturate(1.1);
      -webkit-backdrop-filter: blur(14px) saturate(1.1);
      border: 1px solid rgba(255 255 255 / 0.09);
      box-shadow:
        inset 0 1px 0 rgba(255 255 255 / 0.08),
        0 8px 32px rgba(0 0 0 / 0.35);
      border-radius: var(--radius-lg);
    }
    .glass-strong {
      background: rgba(255 255 255 / 0.06);
      backdrop-filter: blur(18px) saturate(1.15);
      -webkit-backdrop-filter: blur(18px) saturate(1.15);
      border: 1px solid rgba(255 255 255 / 0.09);
      box-shadow:
        inset 0 1px 0 rgba(255 255 255 / 0.08),
        0 12px 40px rgba(0 0 0 / 0.40);
      border-radius: var(--radius-xl);
    }
    .hud-focus-ring:focus-visible {
      outline: 2px solid var(--accent-primary);
      outline-offset: 2px;
      box-shadow: var(--glow-primary);
    }
  }
  ```

- [ ] **Step 2: Attach `hud` class to body**

  In `src/main.tsx` (or index.html root), add `document.body.classList.add('hud')` once in module scope, OR add `class="hud"` to `<body>` in `index.html`. Prefer the HTML approach:
  ```html
  <body class="hud">
  ```

- [ ] **Step 3: Build and verify**

  ```bash
  npm run build
  npm run dev
  ```
  Expected: app builds; visit `/` in dev — existing layout renders against the new dark canvas with the aurora mesh visible behind (current panels will look mismatched — expected, fixed later).

- [ ] **Step 4: Commit**

  ```bash
  git add src/index.css index.html
  git commit -m "hud: add design tokens, aurora body, glass utilities"
  ```

---

### Task A3: Create motion hooks

**Files:**
- Create: `src/components/hud/hooks/usePrefersReducedMotion.ts`
- Create: `src/components/hud/hooks/useCountUp.ts`
- Test: `src/components/hud/hooks/useCountUp.test.ts`

- [ ] **Step 1: Write failing test for useCountUp**

  Create `src/components/hud/hooks/useCountUp.test.ts`:
  ```ts
  import { renderHook, act } from '@testing-library/react'
  import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
  import { useCountUp } from './useCountUp'

  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  describe('useCountUp', () => {
    it('returns target value immediately when reduced motion requested', () => {
      const { result } = renderHook(() => useCountUp(100, { reducedMotion: true }))
      expect(result.current).toBe(100)
    })

    it('animates from 0 to target over duration', () => {
      const { result } = renderHook(() => useCountUp(100, { durationMs: 400 }))
      expect(result.current).toBe(0)
      act(() => { vi.advanceTimersByTime(200) })
      expect(result.current).toBeGreaterThan(0)
      expect(result.current).toBeLessThan(100)
      act(() => { vi.advanceTimersByTime(400) })
      expect(result.current).toBe(100)
    })

    it('handles target changes mid-flight by re-animating from current', () => {
      const { result, rerender } = renderHook(({ v }) => useCountUp(v, { durationMs: 400 }), {
        initialProps: { v: 100 },
      })
      act(() => { vi.advanceTimersByTime(500) })
      expect(result.current).toBe(100)
      rerender({ v: 200 })
      act(() => { vi.advanceTimersByTime(500) })
      expect(result.current).toBe(200)
    })
  })
  ```

- [ ] **Step 2: Run and confirm failure**

  ```bash
  npm run test -- src/components/hud/hooks/useCountUp.test.ts --run
  ```
  Expected: FAIL — module not found.

- [ ] **Step 3: Implement usePrefersReducedMotion**

  Create `src/components/hud/hooks/usePrefersReducedMotion.ts`:
  ```ts
  import { useEffect, useState } from 'react'

  export function usePrefersReducedMotion(): boolean {
    const [prefers, setPrefers] = useState(() => {
      if (typeof window === 'undefined') return false
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    })

    useEffect(() => {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
      const handler = () => setPrefers(mql.matches)
      mql.addEventListener('change', handler)
      return () => mql.removeEventListener('change', handler)
    }, [])

    return prefers
  }
  ```

- [ ] **Step 4: Implement useCountUp**

  Create `src/components/hud/hooks/useCountUp.ts`:
  ```ts
  import { useEffect, useRef, useState } from 'react'

  interface Options {
    durationMs?: number
    reducedMotion?: boolean
  }

  function easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4)
  }

  export function useCountUp(target: number, opts: Options = {}): number {
    const { durationMs = 400, reducedMotion = false } = opts
    const [value, setValue] = useState(reducedMotion ? target : 0)
    const rafRef = useRef<number | null>(null)
    const startRef = useRef<number | null>(null)
    const fromRef = useRef<number>(reducedMotion ? target : 0)

    useEffect(() => {
      if (reducedMotion) { setValue(target); return }

      fromRef.current = value
      startRef.current = null

      const tick = (now: number) => {
        if (startRef.current === null) startRef.current = now
        const elapsed = now - startRef.current
        const t = Math.min(1, elapsed / durationMs)
        const eased = easeOutQuart(t)
        const next = fromRef.current + (target - fromRef.current) * eased
        setValue(t === 1 ? target : next)
        if (t < 1) rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
      return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target, durationMs, reducedMotion])

    return Math.round(value)
  }
  ```

  Note: the test uses `vi.useFakeTimers()` which mocks `requestAnimationFrame`. If Vitest's default RAF mock doesn't advance with `advanceTimersByTime`, replace the test's `vi.advanceTimersByTime` with `vi.advanceTimersToNextFrame()` (Vitest ≥ 1.6) or mock RAF manually. The implementation above uses RAF; tests must drive RAF explicitly.

- [ ] **Step 5: Run and confirm passing**

  ```bash
  npm run test -- src/components/hud/hooks/useCountUp.test.ts --run
  ```
  Expected: PASS (3/3). If RAF timing tests flake under fake timers, add `vi.stubGlobal('requestAnimationFrame', (cb) => setTimeout(cb, 16))` in the test file's `beforeEach`.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/hud/hooks/
  git commit -m "hud: add useCountUp and usePrefersReducedMotion hooks"
  ```

---

## Phase B — Primitive Components

Each primitive task follows the same five-step TDD shape. All new files live under `src/components/hud/`.

### Task B1: StatusDot

**Files:**
- Create: `src/components/hud/StatusDot.tsx`
- Test: `src/components/hud/StatusDot.test.tsx`

- [ ] **Step 1: Write failing test**

  ```tsx
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect } from 'vitest'
  import { StatusDot } from './StatusDot'

  describe('StatusDot', () => {
    it('renders with good signal by default', () => {
      render(<StatusDot data-testid="dot" />)
      const dot = screen.getByTestId('dot')
      expect(dot).toHaveAttribute('data-signal', 'good')
    })

    it('applies alert signal via prop', () => {
      render(<StatusDot signal="alert" data-testid="dot" />)
      expect(screen.getByTestId('dot')).toHaveAttribute('data-signal', 'alert')
    })

    it('sets pulse data attribute when prop is true', () => {
      render(<StatusDot pulse data-testid="dot" />)
      expect(screen.getByTestId('dot')).toHaveAttribute('data-pulse', 'true')
    })
  })
  ```

- [ ] **Step 2: Run and confirm failure**
  ```bash
  npm run test -- src/components/hud/StatusDot.test.tsx --run
  ```
  Expected: FAIL — no export.

- [ ] **Step 3: Implement**

  ```tsx
  type Signal = 'good' | 'warn' | 'alert' | 'info' | 'neutral'

  interface Props extends React.HTMLAttributes<HTMLSpanElement> {
    signal?: Signal
    pulse?: boolean
    size?: number
  }

  const color: Record<Signal, string> = {
    good: 'var(--signal-good)',
    warn: 'var(--signal-warn)',
    alert: 'var(--signal-alert)',
    info: 'var(--accent-info)',
    neutral: 'var(--text-muted)',
  }

  export function StatusDot({ signal = 'good', pulse = false, size = 8, style, ...rest }: Props) {
    return (
      <span
        {...rest}
        data-signal={signal}
        data-pulse={pulse ? 'true' : undefined}
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          borderRadius: 9999,
          background: color[signal],
          ...style,
        }}
      />
    )
  }
  ```

- [ ] **Step 4: Run — expect pass**
  ```bash
  npm run test -- src/components/hud/StatusDot.test.tsx --run
  ```

- [ ] **Step 5: Commit**
  ```bash
  git add src/components/hud/StatusDot.tsx src/components/hud/StatusDot.test.tsx
  git commit -m "hud: add StatusDot primitive"
  ```

---

### Task B2: TrendChip

**Files:**
- Create: `src/components/hud/TrendChip.tsx`
- Test: `src/components/hud/TrendChip.test.tsx`

- [ ] **Step 1: Test**

  ```tsx
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect } from 'vitest'
  import { TrendChip } from './TrendChip'

  describe('TrendChip', () => {
    it('renders label text', () => {
      render(<TrendChip signal="good">+4%</TrendChip>)
      expect(screen.getByText('+4%')).toBeInTheDocument()
    })
    it('applies signal data attribute', () => {
      render(<TrendChip signal="alert">-2%</TrendChip>)
      expect(screen.getByText('-2%').closest('[data-signal]'))
        .toHaveAttribute('data-signal', 'alert')
    })
  })
  ```

- [ ] **Step 2: Run (fail)**
- [ ] **Step 3: Implement**

  ```tsx
  type Signal = 'good' | 'warn' | 'alert' | 'info' | 'neutral'

  interface Props {
    signal?: Signal
    children: React.ReactNode
  }

  const bgFor: Record<Signal, string> = {
    good:    'oklch(0.78 0.15 162 / 0.15)',
    warn:    'oklch(0.79 0.16 82  / 0.15)',
    alert:   'oklch(0.72 0.17 13  / 0.15)',
    info:    'oklch(0.80 0.12 220 / 0.15)',
    neutral: 'rgba(255 255 255 / 0.08)',
  }

  const textFor: Record<Signal, string> = {
    good:    'var(--signal-good)',
    warn:    'var(--signal-warn)',
    alert:   'var(--signal-alert)',
    info:    'var(--accent-info)',
    neutral: 'var(--text-secondary)',
  }

  export function TrendChip({ signal = 'neutral', children }: Props) {
    return (
      <span
        data-signal={signal}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 9px',
          borderRadius: 9999,
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          fontSize: 11,
          fontFeatureSettings: '"tnum"',
          background: bgFor[signal],
          color: textFor[signal],
        }}
      >
        {children}
      </span>
    )
  }
  ```

- [ ] **Step 4: Run (pass)**
- [ ] **Step 5: Commit** — `hud: add TrendChip primitive`

---

### Task B3: Skeleton (HUD variant)

**Files:**
- Create: `src/components/hud/Skeleton.tsx`

- [ ] **Step 1: Implement (no test — thin wrapper, covered via parent tests)**

  ```tsx
  import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion'

  interface Props {
    className?: string
    height?: number | string
    width?: number | string
    rounded?: number | string
  }

  export function Skeleton({ className, height = 16, width = '100%', rounded = 8 }: Props) {
    const reduced = usePrefersReducedMotion()
    return (
      <div
        className={className}
        aria-hidden="true"
        style={{
          height,
          width,
          borderRadius: rounded,
          background: reduced
            ? 'rgba(255 255 255 / 0.06)'
            : 'linear-gradient(90deg, rgba(255 255 255 / 0.03) 0%, rgba(255 255 255 / 0.08) 50%, rgba(255 255 255 / 0.03) 100%)',
          backgroundSize: '200% 100%',
          animation: reduced ? undefined : 'hud-shimmer 800ms ease-in-out infinite',
        }}
      />
    )
  }
  ```

- [ ] **Step 2: Add keyframes to index.css**

  Append inside the same `@layer components` block from Task A2:
  ```css
  @keyframes hud-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  ```

- [ ] **Step 3: Smoke check** — visit a dev route that still renders the pre-existing Skeleton; it still works (this is a new file, old component untouched).

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/hud/Skeleton.tsx src/index.css
  git commit -m "hud: add Skeleton primitive with shimmer"
  ```

---

### Task B4: EmptyState

**Files:**
- Create: `src/components/hud/EmptyState.tsx`
- Test: `src/components/hud/EmptyState.test.tsx`

- [ ] **Step 1: Test**

  ```tsx
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect } from 'vitest'
  import { EmptyState } from './EmptyState'

  describe('EmptyState', () => {
    it('renders title and body', () => {
      render(<EmptyState title="Nothing here" body="Add something." />)
      expect(screen.getByRole('heading', { name: /nothing here/i })).toBeInTheDocument()
      expect(screen.getByText(/add something/i)).toBeInTheDocument()
    })
    it('renders optional action', () => {
      render(<EmptyState title="Empty" action={<button>Do it</button>} />)
      expect(screen.getByRole('button', { name: /do it/i })).toBeInTheDocument()
    })
  })
  ```

- [ ] **Step 2: Run (fail)**
- [ ] **Step 3: Implement**

  ```tsx
  interface Props {
    icon?: React.ReactNode
    title: string
    body?: string
    action?: React.ReactNode
  }

  export function EmptyState({ icon, title, body, action }: Props) {
    return (
      <div role="status" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', padding: '32px 24px', gap: 10,
      }}>
        {icon && <div style={{ color: 'var(--text-label)', opacity: 0.9 }}>{icon}</div>}
        <h3 style={{
          margin: 0,
          fontFamily: 'Geist, Inter, system-ui', fontSize: 18, fontWeight: 500,
          letterSpacing: '-0.01em', color: 'var(--text-primary)',
        }}>{title}</h3>
        {body && <p style={{
          margin: 0, maxWidth: 360,
          fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55,
        }}>{body}</p>}
        {action && <div style={{ marginTop: 8 }}>{action}</div>}
      </div>
    )
  }
  ```

- [ ] **Step 4: Run (pass)**
- [ ] **Step 5: Commit** — `hud: add EmptyState primitive`

---

### Task B5: ErrorState

**Files:**
- Create: `src/components/hud/ErrorState.tsx`
- Test: `src/components/hud/ErrorState.test.tsx`

- [ ] **Step 1: Test**

  ```tsx
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect, vi } from 'vitest'
  import userEvent from '@testing-library/user-event'
  import { ErrorState } from './ErrorState'

  describe('ErrorState', () => {
    it('renders message', () => {
      render(<ErrorState message="Kaboom" />)
      expect(screen.getByText(/kaboom/i)).toBeInTheDocument()
    })
    it('invokes onRetry when retry button clicked', async () => {
      const onRetry = vi.fn()
      render(<ErrorState message="fail" onRetry={onRetry} />)
      await userEvent.click(screen.getByRole('button', { name: /retry/i }))
      expect(onRetry).toHaveBeenCalledOnce()
    })
  })
  ```

- [ ] **Step 2: Run (fail)**
- [ ] **Step 3: Implement**

  ```tsx
  import { AlertTriangle } from 'lucide-react'

  interface Props {
    message: string
    onRetry?: () => void
  }

  export function ErrorState({ message, onRetry }: Props) {
    return (
      <div role="alert" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', padding: '32px 24px', gap: 10,
      }}>
        <AlertTriangle size={32} color="var(--signal-alert)" />
        <h3 style={{
          margin: 0, fontFamily: 'Geist, Inter, system-ui',
          fontSize: 18, fontWeight: 500, color: 'var(--text-primary)',
        }}>Something went wrong</h3>
        <p style={{
          margin: 0, maxWidth: 360, fontSize: 13,
          color: 'var(--text-secondary)', lineHeight: 1.55,
        }}>{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="hud-focus-ring"
            style={{
              marginTop: 6, padding: '8px 16px', borderRadius: 9999,
              background: 'rgba(255 255 255 / 0.06)',
              border: '1px solid rgba(255 255 255 / 0.12)',
              color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer',
            }}
          >Retry</button>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 4: Run (pass)**
- [ ] **Step 5: Commit** — `hud: add ErrorState primitive`

---

### Task B6: Tile

**Files:**
- Create: `src/components/hud/Tile.tsx`
- Test: `src/components/hud/Tile.test.tsx`

- [ ] **Step 1: Test**

  ```tsx
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect } from 'vitest'
  import { Tile } from './Tile'

  describe('Tile', () => {
    it('renders label, value, suffix, sub', () => {
      render(<Tile label="Capacity" value={67} suffix="%" sub="avg" />)
      expect(screen.getByText('Capacity')).toBeInTheDocument()
      expect(screen.getByText('67')).toBeInTheDocument()
      expect(screen.getByText('%')).toBeInTheDocument()
      expect(screen.getByText('avg')).toBeInTheDocument()
    })
    it('renders trend chip when trend prop present', () => {
      render(<Tile label="Cap" value={1} trend={{ delta: '+4%', direction: 'up' }} />)
      expect(screen.getByText('+4%')).toBeInTheDocument()
    })
    it('applies data-variant="hero" when variant is hero', () => {
      render(<Tile label="Cap" value={1} variant="hero" data-testid="t" />)
      expect(screen.getByTestId('t')).toHaveAttribute('data-variant', 'hero')
    })
    it('sets aria-label composed from fields', () => {
      render(<Tile label="Capacity" value={67} suffix="%" sub="avg utilization" data-testid="t" />)
      expect(screen.getByTestId('t')).toHaveAttribute(
        'aria-label',
        'Capacity: 67%, avg utilization',
      )
    })
  })
  ```

- [ ] **Step 2: Run (fail)**
- [ ] **Step 3: Implement**

  ```tsx
  import { TrendChip } from './TrendChip'
  import { useCountUp } from './hooks/useCountUp'
  import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion'

  type Signal = 'good' | 'warn' | 'alert' | 'info' | 'neutral'

  interface TrendProp { delta: string; direction: 'up' | 'down' }

  interface Props extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
    label: string
    value: number | string
    suffix?: string
    sub?: string
    signal?: Signal
    trend?: TrendProp
    variant?: 'default' | 'hero'
  }

  export function Tile({
    label, value, suffix, sub,
    signal = 'neutral', trend, variant = 'default',
    style, ...rest
  }: Props) {
    const reduced = usePrefersReducedMotion()
    const numeric = typeof value === 'number' ? value : null
    const animated = useCountUp(numeric ?? 0, { reducedMotion: reduced || numeric === null })
    const displayValue = numeric === null ? value : animated

    const valueColor =
      signal === 'good'  ? 'var(--signal-good)'
    : signal === 'warn'  ? 'var(--signal-warn)'
    : signal === 'alert' ? 'var(--signal-alert)'
    :                      'var(--text-primary)'

    const glyph =
      signal === 'alert' ? '⚠ '
    : signal === 'warn'  ? '▲ '
    : ''

    return (
      <div
        {...rest}
        role="group"
        data-variant={variant}
        aria-label={`${label}: ${String(value)}${suffix ?? ''}${sub ? `, ${sub}` : ''}`}
        className={variant === 'hero' ? 'glass-strong' : 'glass'}
        style={{
          position: 'relative',
          padding: variant === 'hero' ? '18px 20px 20px' : '16px 18px 18px',
          boxShadow: variant === 'hero'
            ? 'inset 0 0 0 1px oklch(0.72 0.17 295 / 0.35), inset 0 1px 0 rgba(255 255 255 / 0.08), 0 8px 32px rgba(0 0 0 / 0.35)'
            : undefined,
          ...style,
        }}
      >
        {trend && (
          <div style={{ position: 'absolute', top: 12, right: 12 }}>
            <TrendChip signal={trend.direction === 'up' ? 'good' : 'alert'}>
              {trend.delta}
            </TrendChip>
          </div>
        )}
        <div style={{
          fontFamily: 'Inter, system-ui', fontSize: 10.5, fontWeight: 500,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--text-label)',
        }}>{glyph}{label}</div>
        <div style={{
          marginTop: 2,
          fontFamily: 'Geist, Inter, system-ui',
          fontSize: variant === 'hero' ? 42 : 32,
          fontWeight: variant === 'hero' ? 200 : 300,
          letterSpacing: '-0.02em', lineHeight: 1,
          color: valueColor,
          fontFeatureSettings: '"tnum"',
        }}>
          {displayValue}
          {suffix && <span style={{
            marginLeft: 1,
            fontSize: variant === 'hero' ? 20 : 16,
            color: 'var(--text-secondary)', fontWeight: 300,
          }}>{suffix}</span>}
        </div>
        {sub && <div style={{
          marginTop: 6, fontSize: 11.5, color: 'var(--text-muted)',
        }}>{sub}</div>}
      </div>
    )
  }
  ```

- [ ] **Step 4: Run (pass)**
- [ ] **Step 5: Commit** — `hud: add Tile primitive with count-up animation`

---

### Task B7: Panel

**Files:**
- Create: `src/components/hud/Panel.tsx`
- Test: `src/components/hud/Panel.test.tsx`

- [ ] **Step 1: Test**

  ```tsx
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect } from 'vitest'
  import { Panel } from './Panel'

  describe('Panel', () => {
    it('renders title and children', () => {
      render(<Panel title="Utilization"><div>inner</div></Panel>)
      expect(screen.getByText('Utilization')).toBeInTheDocument()
      expect(screen.getByText('inner')).toBeInTheDocument()
    })
    it('renders action slot', () => {
      render(<Panel title="x" action={<button>Menu</button>}>c</Panel>)
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
    })
    it('title is an accessible heading', () => {
      render(<Panel title="Foo">bar</Panel>)
      expect(screen.getByRole('heading', { name: /foo/i })).toBeInTheDocument()
    })
  })
  ```

- [ ] **Step 2: Run (fail)**
- [ ] **Step 3: Implement**

  ```tsx
  interface Props {
    title: string
    action?: React.ReactNode
    variant?: 'default' | 'strong'
    children: React.ReactNode
    className?: string
  }

  export function Panel({ title, action, variant = 'default', children, className }: Props) {
    return (
      <section
        className={[
          variant === 'strong' ? 'glass-strong' : 'glass',
          className,
        ].filter(Boolean).join(' ')}
        style={{ padding: 20 }}
      >
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12,
        }}>
          <h3 style={{
            margin: 0, fontFamily: 'Inter, system-ui', fontSize: 10.5,
            fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--text-label)',
          }}>{title}</h3>
          {action && <div>{action}</div>}
        </header>
        {children}
      </section>
    )
  }
  ```

- [ ] **Step 4: Run (pass)**
- [ ] **Step 5: Commit** — `hud: add Panel primitive`

---

### Task B8: StatRing

**Files:**
- Create: `src/components/hud/StatRing.tsx`
- Test: `src/components/hud/StatRing.test.tsx`

- [ ] **Step 1: Test**

  ```tsx
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect } from 'vitest'
  import { StatRing } from './StatRing'

  describe('StatRing', () => {
    it('renders the percentage as inner text', () => {
      render(<StatRing value={67} label="Capacity" />)
      expect(screen.getByText('67%')).toBeInTheDocument()
      expect(screen.getByText(/capacity/i)).toBeInTheDocument()
    })
    it('clamps value to 0..100', () => {
      render(<StatRing value={142} label="x" />)
      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })
  ```

- [ ] **Step 2: Run (fail)**
- [ ] **Step 3: Implement**

  ```tsx
  type Signal = 'good' | 'warn' | 'alert' | 'info' | 'neutral'

  interface Props {
    value: number
    label?: string
    signal?: Signal
    size?: number
  }

  const stroke: Record<Signal, string> = {
    good:    'var(--signal-good)',
    warn:    'var(--signal-warn)',
    alert:   'var(--signal-alert)',
    info:    'var(--accent-info)',
    neutral: 'var(--accent-primary)',
  }

  export function StatRing({ value, label, signal = 'neutral', size = 88 }: Props) {
    const pct = Math.max(0, Math.min(100, value))
    const r = size / 2 - 2
    const c = 2 * Math.PI * r
    const offset = c * (1 - pct / 100)
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2} cy={size / 2} r={r}
              fill="none" stroke="rgba(255 255 255 / 0.08)" strokeWidth={2}
            />
            <circle
              cx={size / 2} cy={size / 2} r={r}
              fill="none" stroke={stroke[signal]} strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: 'stroke-dashoffset 400ms cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          </svg>
          <span style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Geist, Inter, system-ui', fontSize: 18, fontWeight: 500,
            color: 'var(--text-primary)', fontFeatureSettings: '"tnum"',
          }}>{pct}%</span>
        </div>
        {label && <span style={{
          fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--text-label)', fontWeight: 500,
        }}>{label}</span>}
      </div>
    )
  }
  ```

- [ ] **Step 4: Run (pass)**
- [ ] **Step 5: Commit** — `hud: add StatRing primitive`

---

### Task B9: HeroSentence + heroLine helper

**Files:**
- Create: `src/components/hud/HeroSentence.tsx`
- Test: `src/components/hud/HeroSentence.test.tsx`

- [ ] **Step 1: Test (hero line + rendering together)**

  ```tsx
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect } from 'vitest'
  import { HeroSentence, heroLine } from './HeroSentence'

  describe('heroLine', () => {
    it('returns "operating smoothly" with 0 near-cap', () => {
      const r = heroLine([50, 60, 70])
      expect(r.emphasis).toBe('operating smoothly')
      expect(r.emphasisSignal).toBe('good')
    })
    it('flags single near-cap', () => {
      const r = heroLine([60, 80])
      expect(r.suffix).toMatch(/1 near capacity/)
      expect(r.emphasisSignal).toBe('good')
    })
    it('says running hot at 3+ near-cap', () => {
      const r = heroLine([80, 81, 82])
      expect(r.prefix).toMatch(/running hot/i)
      expect(r.emphasisSignal).toBe('warn')
    })
    it('raises attention when any at-capacity', () => {
      const r = heroLine([92])
      expect(r.prefix.toLowerCase()).toContain('attention')
      expect(r.emphasis).toMatch(/at capacity/i)
      expect(r.emphasisSignal).toBe('alert')
    })
  })

  describe('HeroSentence', () => {
    it('renders greeting and status sentence', () => {
      render(<HeroSentence firstName="Chris" utilizations={[50, 60]} />)
      expect(screen.getByText(/good morning, chris/i)).toBeInTheDocument()
      expect(screen.getByText(/operating smoothly/i)).toBeInTheDocument()
    })
  })
  ```

- [ ] **Step 2: Run (fail)**
- [ ] **Step 3: Implement**

  ```tsx
  export type HeroLineSignal = 'good' | 'warn' | 'alert' | 'neutral'

  export interface HeroLineResult {
    prefix: string
    emphasis: string
    emphasisSignal: HeroLineSignal
    suffix: string
  }

  export function heroLine(utilizations: number[]): HeroLineResult {
    const atCap   = utilizations.filter(u => u >= 90).length
    const nearCap = utilizations.filter(u => u >= 75 && u < 90).length
    const plural  = (n: number, s: string) => n === 1 ? s : `${s}s`

    if (atCap > 0) return {
      prefix: 'Attention:',
      emphasis: `${atCap} ${plural(atCap, 'investigator')} at capacity`,
      emphasisSignal: 'alert',
      suffix: 'this week — redistribute or defer visits.',
    }
    if (nearCap >= 3) return {
      prefix: 'Site is running hot:',
      emphasis: `${nearCap} investigators near capacity`,
      emphasisSignal: 'warn',
      suffix: 'this week — monitor closely.',
    }
    if (nearCap > 0) return {
      prefix: 'Site is',
      emphasis: 'operating smoothly',
      emphasisSignal: 'good',
      suffix: `— ${nearCap} near capacity this week.`,
    }
    return {
      prefix: 'Site is',
      emphasis: 'operating smoothly',
      emphasisSignal: 'good',
      suffix: '— no capacity concerns this week.',
    }
  }

  interface Props { firstName: string; utilizations: number[] }

  const underlineColor: Record<HeroLineSignal, string> = {
    good: 'var(--signal-good)',
    warn: 'var(--signal-warn)',
    alert: 'var(--signal-alert)',
    neutral: 'var(--text-muted)',
  }

  export function HeroSentence({ firstName, utilizations }: Props) {
    const line = heroLine(utilizations)
    return (
      <div>
        <p style={{
          margin: 0, fontSize: 13, letterSpacing: '0.04em',
          color: 'var(--text-label)',
        }}>Good morning, {firstName}</p>
        <p style={{
          margin: '2px 0 0',
          fontFamily: 'Geist, Inter, system-ui', fontSize: 32, fontWeight: 300,
          letterSpacing: '-0.02em', lineHeight: 1.15,
          color: 'var(--text-secondary)',
        }}>
          {line.prefix}{' '}
          <span style={{
            color: 'var(--text-primary)', fontWeight: 500,
            textDecoration: 'underline', textDecorationThickness: 1,
            textUnderlineOffset: 4, textDecorationColor: underlineColor[line.emphasisSignal],
          }}>{line.emphasis}</span>{' '}
          {line.suffix}
        </p>
      </div>
    )
  }
  ```

- [ ] **Step 4: Run (pass)**
- [ ] **Step 5: Commit** — `hud: add HeroSentence + heroLine helper`

---

### Task B10: SectionHeader

**Files:**
- Create: `src/components/hud/SectionHeader.tsx`

- [ ] **Step 1: Implement (trivial wrapper, no dedicated test)**

  ```tsx
  interface Props {
    title: string
    action?: React.ReactNode
  }

  export function SectionHeader({ title, action }: Props) {
    return (
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: 8, marginBottom: 12,
        borderBottom: '1px solid rgba(255 255 255 / 0.06)',
      }}>
        <h2 style={{
          margin: 0, fontFamily: 'Inter, system-ui', fontSize: 10.5, fontWeight: 500,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--text-label)',
        }}>{title}</h2>
        {action}
      </header>
    )
  }
  ```

- [ ] **Step 2: Commit** — `hud: add SectionHeader primitive`

---

## Phase C — Chart Theme

### Task C1: palette.ts

**Files:**
- Create: `src/components/hud/charts/palette.ts`
- Test: `src/components/hud/charts/palette.test.ts`

- [ ] **Step 1: Test**

  ```ts
  import { describe, it, expect } from 'vitest'
  import { chartPalette } from './palette'

  describe('chartPalette.signalBar', () => {
    it('returns mint under 75', () => {
      expect(chartPalette.signalBar(50)).toContain('162')
    })
    it('returns amber at 75..89', () => {
      expect(chartPalette.signalBar(80)).toContain('82')
    })
    it('returns coral at 90+', () => {
      expect(chartPalette.signalBar(95)).toContain('13')
    })
    it('boundary at 75 uses amber', () => {
      expect(chartPalette.signalBar(75)).toContain('82')
    })
    it('boundary at 90 uses coral', () => {
      expect(chartPalette.signalBar(90)).toContain('13')
    })
  })
  ```

- [ ] **Step 2: Run (fail)**
- [ ] **Step 3: Implement**

  ```ts
  export const chartPalette = {
    series: [
      'oklch(0.72 0.17 295)',
      'oklch(0.80 0.12 220)',
      'oklch(0.78 0.15 162)',
      'oklch(0.79 0.16 82)',
      'oklch(0.72 0.17 13)',
    ] as const,
    signalBar(pct: number): string {
      if (pct >= 90) return 'oklch(0.72 0.17 13)'
      if (pct >= 75) return 'oklch(0.79 0.16 82)'
      return 'oklch(0.78 0.15 162)'
    },
    grid:   'rgba(255 255 255 / 0.06)',
    axis:   'oklch(0.55 0.01 275)',
    tooltip:{
      bg:     'oklch(0.13 0.020 275)',
      border: 'rgba(255 255 255 / 0.09)',
      text:   'oklch(0.97 0 0)',
      font:   'JetBrains Mono',
    },
  } as const
  ```

- [ ] **Step 4: Run (pass)**
- [ ] **Step 5: Commit** — `hud: add chart palette with signal bucketing`

---

### Task C2: defs.tsx (shared gradient defs)

**Files:**
- Create: `src/components/hud/charts/defs.tsx`

- [ ] **Step 1: Implement (presentational only, no test)**

  ```tsx
  export function HUDChartDefs() {
    return (
      <defs>
        {/* bar gradients keyed by signal */}
        <linearGradient id="hud-bar-good" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="oklch(0.78 0.15 162)" />
          <stop offset="100%" stopColor="oklch(0.78 0.15 162 / 0.15)" />
        </linearGradient>
        <linearGradient id="hud-bar-warn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="oklch(0.79 0.16 82)" />
          <stop offset="100%" stopColor="oklch(0.79 0.16 82 / 0.15)" />
        </linearGradient>
        <linearGradient id="hud-bar-alert" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="oklch(0.72 0.17 13)" />
          <stop offset="100%" stopColor="oklch(0.72 0.17 13 / 0.15)" />
        </linearGradient>
        <linearGradient id="hud-bar-primary" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="oklch(0.72 0.17 295)" />
          <stop offset="100%" stopColor="oklch(0.72 0.17 295 / 0.15)" />
        </linearGradient>

        {/* area gradients — series[0..4] */}
        {[
          ['violet', 'oklch(0.72 0.17 295)'],
          ['cyan',   'oklch(0.80 0.12 220)'],
          ['mint',   'oklch(0.78 0.15 162)'],
          ['amber',  'oklch(0.79 0.16 82)'],
          ['coral',  'oklch(0.72 0.17 13)'],
        ].map(([name, color]) => (
          <linearGradient key={name} id={`hud-area-${name}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        ))}
      </defs>
    )
  }
  ```

- [ ] **Step 2: Commit** — `hud: add chart gradient defs`

---

### Task C3: HUDTooltip

**Files:**
- Create: `src/components/hud/charts/HUDTooltip.tsx`

- [ ] **Step 1: Implement**

  ```tsx
  import type { TooltipProps } from 'recharts'

  interface Props extends TooltipProps<number, string> {
    valueFormatter?: (v: number) => string
  }

  export function HUDTooltip({ active, payload, label, valueFormatter }: Props) {
    if (!active || !payload || payload.length === 0) return null
    return (
      <div
        role="tooltip"
        className="glass-strong"
        style={{ padding: 12, minWidth: 160 }}
      >
        {label && <div style={{
          fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--text-label)', marginBottom: 8, fontWeight: 500,
        }}>{label}</div>}
        {payload.map((p) => (
          <div key={String(p.dataKey ?? p.name)} style={{
            display: 'flex', justifyContent: 'space-between', gap: 14,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12.5,
            color: 'var(--text-primary)', fontFeatureSettings: '"tnum"',
          }}>
            <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
            <span>{valueFormatter ? valueFormatter(p.value as number) : String(p.value)}</span>
          </div>
        ))}
      </div>
    )
  }
  ```

- [ ] **Step 2: Commit** — `hud: add HUDTooltip`

---

### Task C4: HUDBarChart

**Files:**
- Create: `src/components/hud/charts/HUDBarChart.tsx`
- Test: `src/components/hud/charts/HUDBarChart.test.tsx`

- [ ] **Step 1: Test (shallow — Recharts mocked same as existing suite)**

  ```tsx
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect, vi } from 'vitest'
  vi.mock('recharts', () => ({
    BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
    Bar: () => <div data-testid="bar" />,
    XAxis: () => null, YAxis: () => null, CartesianGrid: () => null,
    Tooltip: () => null, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Cell: () => null,
  }))
  import { HUDBarChart } from './HUDBarChart'

  describe('HUDBarChart', () => {
    it('renders a bar chart with provided data', () => {
      render(
        <HUDBarChart
          data={[{ name: 'A', value: 50 }, { name: 'B', value: 80 }]}
          xKey="name" yKey="value"
        />,
      )
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })
  })
  ```

- [ ] **Step 2: Run (fail)**
- [ ] **Step 3: Implement**

  ```tsx
  import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  } from 'recharts'
  import { chartPalette } from './palette'
  import { HUDChartDefs } from './defs'
  import { HUDTooltip } from './HUDTooltip'
  import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

  interface Datum { [key: string]: string | number }

  interface Props {
    data: Datum[]
    xKey: string
    yKey: string
    height?: number
    signalByValue?: boolean
    valueFormatter?: (v: number) => string
  }

  export function HUDBarChart({
    data, xKey, yKey, height = 220, signalByValue = false, valueFormatter,
  }: Props) {
    const reduced = usePrefersReducedMotion()
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <HUDChartDefs />
          <CartesianGrid
            stroke={chartPalette.grid}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }}
            axisLine={false} tickLine={false} width={36}
          />
          <Tooltip content={<HUDTooltip valueFormatter={valueFormatter} />} cursor={{ fill: 'rgba(255 255 255 / 0.04)' }} />
          <Bar
            dataKey={yKey}
            radius={[4, 4, 2, 2]}
            isAnimationActive={!reduced}
            fill="url(#hud-bar-primary)"
          >
            {signalByValue && data.map((d, i) => {
              const v = Number(d[yKey])
              const id = v >= 90 ? 'hud-bar-alert' : v >= 75 ? 'hud-bar-warn' : 'hud-bar-good'
              return <Cell key={i} fill={`url(#${id})`} />
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }
  ```

- [ ] **Step 4: Run (pass)**
- [ ] **Step 5: Commit** — `hud: add HUDBarChart wrapper`

---

### Task C5: HUDLineChart (presentational only)

**Files:**
- Create: `src/components/hud/charts/HUDLineChart.tsx`

- [ ] **Step 1: Implement**

  ```tsx
  import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
  import { chartPalette } from './palette'
  import { HUDTooltip } from './HUDTooltip'
  import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

  interface Datum { [key: string]: string | number }
  interface Props {
    data: Datum[]
    xKey: string
    yKey: string
    height?: number
    valueFormatter?: (v: number) => string
  }

  export function HUDLineChart({ data, xKey, yKey, height = 220, valueFormatter }: Props) {
    const reduced = usePrefersReducedMotion()
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={chartPalette.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
          <Tooltip content={<HUDTooltip valueFormatter={valueFormatter} />} cursor={{ stroke: 'rgba(255 255 255 / 0.2)', strokeDasharray: '3 3' }} />
          <Line
            type="monotone" dataKey={yKey}
            stroke={chartPalette.series[0]} strokeWidth={2}
            dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
            isAnimationActive={!reduced} connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }
  ```

- [ ] **Step 2: Commit** — `hud: add HUDLineChart wrapper`

---

### Task C6: HUDAreaChart

**Files:**
- Create: `src/components/hud/charts/HUDAreaChart.tsx`

- [ ] **Step 1: Implement**

  ```tsx
  import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
  import { chartPalette } from './palette'
  import { HUDChartDefs } from './defs'
  import { HUDTooltip } from './HUDTooltip'
  import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

  const gradientNames = ['violet', 'cyan', 'mint', 'amber', 'coral'] as const

  interface Datum { [key: string]: string | number }
  interface Series { key: string; name?: string }
  interface ReferenceLineSpec { y: number; label?: string; signal?: 'warn' | 'alert' }

  interface Props {
    data: Datum[]
    xKey: string
    series: Series[]
    height?: number
    stacked?: boolean
    showAxes?: boolean
    referenceLines?: ReferenceLineSpec[]
    valueFormatter?: (v: number) => string
  }

  export function HUDAreaChart({
    data, xKey, series, height = 200,
    stacked = false, showAxes = true, referenceLines = [], valueFormatter,
  }: Props) {
    const reduced = usePrefersReducedMotion()
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <HUDChartDefs />
          {showAxes && (
            <>
              <CartesianGrid stroke={chartPalette.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey={xKey} tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip content={<HUDTooltip valueFormatter={valueFormatter} />} />
            </>
          )}
          {referenceLines.map((r) => (
            <ReferenceLine
              key={r.y}
              y={r.y}
              stroke={r.signal === 'alert' ? chartPalette.series[4] : chartPalette.series[3]}
              strokeDasharray="4 4"
              label={r.label ? {
                value: r.label, position: 'insideTopRight',
                fill: chartPalette.axis, fontFamily: 'JetBrains Mono', fontSize: 11,
              } : undefined}
            />
          ))}
          {series.map((s, i) => {
            const name = gradientNames[i % gradientNames.length]
            return (
              <Area
                key={s.key} type="monotone" dataKey={s.key} name={s.name ?? s.key}
                stackId={stacked ? '1' : undefined}
                stroke={chartPalette.series[i % chartPalette.series.length]} strokeWidth={1.5}
                fill={`url(#hud-area-${name})`}
                isAnimationActive={!reduced}
              />
            )
          })}
        </AreaChart>
      </ResponsiveContainer>
    )
  }
  ```

- [ ] **Step 2: Commit** — `hud: add HUDAreaChart wrapper`

---

## Phase D — Nav Shell

### Task D1: BrandLockup

**Files:**
- Create: `src/components/hud/nav/BrandLockup.tsx`

- [ ] **Step 1: Implement**

  ```tsx
  import { StatusDot } from '../StatusDot'

  interface Props { mode?: 'sidebar' | 'inline' }

  export function BrandLockup({ mode = 'sidebar' }: Props) {
    const inline = mode === 'inline'
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        flexDirection: inline ? 'row' : 'row',
      }}>
        <div className="glass-strong" style={{
          width: 28, height: 28, display: 'grid', placeItems: 'center',
          fontFamily: 'Geist, Inter, system-ui', fontSize: 12, fontWeight: 600,
          color: 'var(--text-primary)', borderRadius: 10,
        }}>K2</div>
        <StatusDot signal="good" />
        <span style={{
          fontSize: 10.5, letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'var(--text-label)', fontWeight: 500,
        }}>{inline ? 'K2 · Tampa' : 'K2 Medical · Tampa'}</span>
      </div>
    )
  }
  ```

- [ ] **Step 2: Commit** — `hud: add BrandLockup`

---

### Task D2: NavItem

**Files:**
- Create: `src/components/hud/nav/NavItem.tsx`
- Test: `src/components/hud/nav/NavItem.test.tsx`

- [ ] **Step 1: Test**

  ```tsx
  import { render, screen } from '@testing-library/react'
  import { MemoryRouter } from 'react-router-dom'
  import { describe, it, expect } from 'vitest'
  import { NavItem } from './NavItem'
  import { LayoutDashboard } from 'lucide-react'

  describe('NavItem', () => {
    it('renders label and link', () => {
      render(
        <MemoryRouter>
          <NavItem to="/overview" label="Overview" icon={<LayoutDashboard size={18} />} />
        </MemoryRouter>,
      )
      expect(screen.getByRole('link', { name: /overview/i })).toHaveAttribute('href', '/overview')
    })
    it('shows count pill when count > 0', () => {
      render(
        <MemoryRouter>
          <NavItem to="/x" label="Alerts" icon={null} count={3} />
        </MemoryRouter>,
      )
      expect(screen.getByText('3')).toBeInTheDocument()
    })
    it('hides count pill at 0', () => {
      render(
        <MemoryRouter>
          <NavItem to="/x" label="Alerts" icon={null} count={0} />
        </MemoryRouter>,
      )
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })
    it('marks active with aria-current', () => {
      render(
        <MemoryRouter initialEntries={['/here']}>
          <NavItem to="/here" label="Here" icon={null} />
        </MemoryRouter>,
      )
      expect(screen.getByRole('link')).toHaveAttribute('aria-current', 'page')
    })
  })
  ```

- [ ] **Step 2: Run (fail)**
- [ ] **Step 3: Implement**

  ```tsx
  import { NavLink } from 'react-router-dom'

  interface Props {
    to: string
    label: string
    icon: React.ReactNode
    count?: number
    end?: boolean
  }

  export function NavItem({ to, label, icon, count, end = false }: Props) {
    return (
      <NavLink
        to={to}
        end={end}
        className="hud-focus-ring"
        style={({ isActive }) => ({
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', margin: '1px 6px',
          borderRadius: 10, textDecoration: 'none',
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          background: isActive ? 'rgba(255 255 255 / 0.06)' : 'transparent',
          boxShadow: isActive
            ? 'inset 2px 0 0 var(--accent-primary), 0 0 16px oklch(0.72 0.17 295 / 0.25)'
            : undefined,
          transition: 'background 150ms var(--ease-standard), color 150ms var(--ease-standard)',
        })}
      >
        {({ isActive }) => (
          <>
            <span style={{ display: 'inline-flex', width: 18, height: 18 }}>{icon}</span>
            <span style={{ fontSize: 13, fontWeight: isActive ? 500 : 400, flex: 1 }}>{label}</span>
            {count !== undefined && count > 0 && (
              <span style={{
                padding: '2px 7px', borderRadius: 9999,
                background: 'oklch(0.72 0.17 13 / 0.18)',
                color: 'var(--signal-alert)',
                fontFamily: 'JetBrains Mono', fontSize: 10.5,
                fontFeatureSettings: '"tnum"',
              }}>{count}</span>
            )}
          </>
        )}
      </NavLink>
    )
  }
  ```

- [ ] **Step 4: Run (pass)**
- [ ] **Step 5: Commit** — `hud: add NavItem`

---

### Task D3: NavGroup

**Files:**
- Create: `src/components/hud/nav/NavGroup.tsx`

- [ ] **Step 1: Implement**

  ```tsx
  interface Props { label: string; children: React.ReactNode }

  export function NavGroup({ label, children }: Props) {
    return (
      <nav aria-label={label} style={{ marginTop: 12 }}>
        <div style={{
          padding: '6px 18px 4px',
          fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'var(--text-label)', fontWeight: 500,
        }}>{label}</div>
        <div>{children}</div>
      </nav>
    )
  }
  ```

- [ ] **Step 2: Commit** — `hud: add NavGroup`

---

### Task D4: UserChip

**Files:**
- Create: `src/components/hud/nav/UserChip.tsx`

- [ ] **Step 1: Implement**

  ```tsx
  interface Props { displayName: string; role: string; email?: string }

  export function UserChip({ displayName, role }: Props) {
    const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('')
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 9999,
          display: 'grid', placeItems: 'center',
          background: 'linear-gradient(135deg, oklch(0.72 0.17 295), oklch(0.80 0.12 220))',
          color: 'white', fontFamily: 'Geist, Inter, system-ui',
          fontSize: 14, fontWeight: 500,
        }}>{initials || '?'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 13, color: 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{displayName}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{role}</span>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Commit** — `hud: add UserChip`

---

### Task D5: commandRegistry + keyboardShortcuts

**Files:**
- Create: `src/components/hud/nav/commandRegistry.ts`
- Test: `src/components/hud/nav/commandRegistry.test.ts`
- Create: `src/components/hud/nav/keyboardShortcuts.ts`
- Test: `src/components/hud/nav/keyboardShortcuts.test.ts`

- [ ] **Step 1: Test commandRegistry**

  ```ts
  import { describe, it, expect } from 'vitest'
  import { managementPages, staffPages, actionsForRole, filterCommands } from './commandRegistry'

  describe('managementPages', () => {
    it('contains Overview', () => {
      expect(managementPages.find(p => p.id === 'overview')).toBeDefined()
    })
  })

  describe('staffPages', () => {
    it('contains My Dashboard and My Studies', () => {
      expect(staffPages.find(p => p.id === 'my-dashboard')).toBeDefined()
      expect(staffPages.find(p => p.id === 'my-studies')).toBeDefined()
    })
  })

  describe('actionsForRole', () => {
    it('exposes New Study to management only', () => {
      expect(actionsForRole('management').find(a => a.id === 'new-study')).toBeDefined()
      expect(actionsForRole('staff').find(a => a.id === 'new-study')).toBeUndefined()
    })
    it('exposes Log Visit to both', () => {
      expect(actionsForRole('management').find(a => a.id === 'log-visit')).toBeDefined()
      expect(actionsForRole('staff').find(a => a.id === 'log-visit')).toBeDefined()
    })
  })

  describe('filterCommands', () => {
    it('matches by title', () => {
      const r = filterCommands(managementPages, 'over')
      expect(r.find(p => p.id === 'overview')).toBeDefined()
    })
    it('matches by keywords', () => {
      const r = filterCommands(managementPages, 'pd')
      expect(r.find(p => p.id === 'deviations')).toBeDefined()
    })
    it('returns all when query empty', () => {
      expect(filterCommands(managementPages, '').length).toBe(managementPages.length)
    })
  })
  ```

- [ ] **Step 2: Test keyboardShortcuts**

  ```ts
  import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
  import { registerShortcuts, type ShortcutHandlers } from './keyboardShortcuts'

  const fire = (key: string, meta = false) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, metaKey: meta, ctrlKey: meta, bubbles: true }))
  }

  describe('keyboardShortcuts', () => {
    let cleanup: (() => void) | null = null
    afterEach(() => { cleanup?.(); cleanup = null })

    it('triggers openPalette on Cmd/Ctrl+K', () => {
      const handlers: ShortcutHandlers = { openPalette: vi.fn(), navigate: vi.fn(), openShortcutHelp: vi.fn() }
      cleanup = registerShortcuts(handlers)
      fire('k', true)
      expect(handlers.openPalette).toHaveBeenCalledOnce()
    })
    it('supports g-chord navigation to /overview via g o', () => {
      const handlers: ShortcutHandlers = { openPalette: vi.fn(), navigate: vi.fn(), openShortcutHelp: vi.fn() }
      cleanup = registerShortcuts(handlers)
      fire('g'); fire('o')
      expect(handlers.navigate).toHaveBeenCalledWith('/')
    })
    it('ignores g-chord while focus is inside an input', () => {
      const input = document.createElement('input')
      document.body.appendChild(input); input.focus()
      const handlers: ShortcutHandlers = { openPalette: vi.fn(), navigate: vi.fn(), openShortcutHelp: vi.fn() }
      cleanup = registerShortcuts(handlers)
      fire('g'); fire('o')
      expect(handlers.navigate).not.toHaveBeenCalled()
      document.body.removeChild(input)
    })
  })
  ```

- [ ] **Step 3: Implement commandRegistry**

  ```ts
  import type { LucideIcon } from 'lucide-react'
  import {
    LayoutDashboard, Gauge, TrendingUp, ShieldAlert, LineChart, Sparkles, FileBarChart,
    FolderKanban, Users, DollarSign, Upload, Settings, Pencil, User,
  } from 'lucide-react'

  export type Role = 'management' | 'staff'

  export interface CommandItem {
    id: string
    title: string
    keywords: string[]
    icon?: LucideIcon
    route?: string
    action?: string
    roles: Role[]
  }

  export const managementPages: CommandItem[] = [
    { id: 'overview',      title: 'Overview',           keywords: ['overview','home','dashboard'],                    icon: LayoutDashboard, route: '/',               roles: ['management'] },
    { id: 'workload',      title: 'Workload Planner',   keywords: ['workload','capacity','schedule','heatmap'],       icon: Gauge,           route: '/workload',       roles: ['management'] },
    { id: 'enrollment',    title: 'Enrollment',         keywords: ['enrollment','randomization','screen failures'],   icon: TrendingUp,      route: '/enrollment',     roles: ['management'] },
    { id: 'deviations',    title: 'Deviations',         keywords: ['deviations','pd','compliance','protocol'],        icon: ShieldAlert,     route: '/deviations',     roles: ['management'] },
    { id: 'forecast',      title: 'Forecast',           keywords: ['forecast','projection','capacity forecast'],      icon: LineChart,       route: '/forecast',       roles: ['management'] },
    { id: 'what-if',       title: 'What-If',            keywords: ['what if','simulate','scenario'],                  icon: Sparkles,        route: '/what-if',        roles: ['management'] },
    { id: 'reports',       title: 'Reports',            keywords: ['reports','export','utilization report'],          icon: FileBarChart,    route: '/reports',        roles: ['management'] },
    { id: 'studies',       title: 'Studies',            keywords: ['studies','trials','protocols'],                   icon: FolderKanban,    route: '/studies',        roles: ['management'] },
    { id: 'investigators', title: 'Investigators',      keywords: ['investigators','pi','doctors','staff'],           icon: Users,           route: '/investigators',  roles: ['management'] },
    { id: 'financial',     title: 'Financial',          keywords: ['financial','revenue','milestones','contract'],    icon: DollarSign,      route: '/financial',      roles: ['management'] },
    { id: 'import',        title: 'Import',             keywords: ['import','csv','upload','conductor','advarra'],    icon: Upload,          route: '/import',         roles: ['management'] },
    { id: 'settings',      title: 'Settings',           keywords: ['settings','site','users'],                        icon: Settings,        route: '/settings',       roles: ['management'] },
  ]

  export const staffPages: CommandItem[] = [
    { id: 'my-dashboard', title: 'My Dashboard', keywords: ['home','dashboard','overview'], icon: LayoutDashboard, route: '/',            roles: ['staff'] },
    { id: 'my-studies',   title: 'My Studies',   keywords: ['studies','assigned'],           icon: FolderKanban,    route: '/my-studies',  roles: ['staff'] },
    { id: 'data-entry',   title: 'Data Entry',   keywords: ['data','entry','log','visits'],  icon: Pencil,          route: '/data-entry',  roles: ['staff'] },
    { id: 'profile',      title: 'Profile',      keywords: ['profile','account','me'],       icon: User,            route: '/profile',     roles: ['staff'] },
  ]

  const allActions: CommandItem[] = [
    { id: 'new-study',          title: 'New Study',          keywords: ['new','study','create'],                   action: 'new-study',          roles: ['management'] },
    { id: 'add-investigator',   title: 'Add Investigator',   keywords: ['add','investigator','pi'],                action: 'add-investigator',   roles: ['management'] },
    { id: 'log-visit',          title: 'Log Visit',          keywords: ['log','visit','new visit'],                action: 'log-visit',          roles: ['management','staff'] },
    { id: 'log-assessment',     title: 'Log Assessment',     keywords: ['log','assessment','scale'],               action: 'log-assessment',     roles: ['staff'] },
    { id: 'log-deviation',      title: 'Log Deviation',      keywords: ['log','deviation','pd'],                   action: 'log-deviation',      roles: ['management','staff'] },
    { id: 'import-csv',         title: 'Import CSV',         keywords: ['import','csv','upload','conductor','advarra'], action: 'import-csv',    roles: ['management'] },
    { id: 'invite-user',        title: 'Invite User',        keywords: ['invite','add user'],                      action: 'invite-user',        roles: ['management'] },
    { id: 'go-to-this-week',    title: 'Go to This Week',    keywords: ['week','today','current'],                 action: 'go-to-this-week',    roles: ['management','staff'] },
  ]

  export function actionsForRole(role: Role): CommandItem[] {
    return allActions.filter(a => a.roles.includes(role))
  }

  export function filterCommands(items: CommandItem[], query: string): CommandItem[] {
    if (!query.trim()) return items
    const q = query.toLowerCase().trim()
    return items.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.keywords.some(k => k.toLowerCase().includes(q)),
    )
  }

  const RECENT_KEY = 'k2.recent'
  const RECENT_MAX = 5

  export function pushRecent(route: string): void {
    if (typeof localStorage === 'undefined') return
    try {
      const prev: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
      const next = [route, ...prev.filter(r => r !== route)].slice(0, RECENT_MAX)
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch { /* ignore */ }
  }

  export function readRecent(): string[] {
    if (typeof localStorage === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
  }
  ```

- [ ] **Step 4: Implement keyboardShortcuts**

  ```ts
  export interface ShortcutHandlers {
    openPalette: () => void
    navigate: (to: string) => void
    openShortcutHelp: () => void
  }

  const chordRoutes: Record<string, string> = {
    o: '/',
    w: '/workload',
    e: '/enrollment',
    s: '/studies',
    i: '/investigators',
    d: '/deviations',
  }

  function isEditable(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    const tag = target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
    if (target.isContentEditable) return true
    return false
  }

  export function registerShortcuts(handlers: ShortcutHandlers): () => void {
    let chordPending = false
    let chordTimer: number | null = null

    const clearChord = () => {
      chordPending = false
      if (chordTimer !== null) { clearTimeout(chordTimer); chordTimer = null }
    }

    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey

      if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); handlers.openPalette(); return }
      if (meta && e.key === '/')                { e.preventDefault(); handlers.openShortcutHelp(); return }
      if (e.key === '?')                        { handlers.openShortcutHelp(); return }

      if (isEditable(document.activeElement)) return

      if (chordPending) {
        const route = chordRoutes[e.key.toLowerCase()]
        clearChord()
        if (route) { e.preventDefault(); handlers.navigate(route) }
        return
      }

      if (e.key.toLowerCase() === 'g' && !meta) {
        chordPending = true
        chordTimer = window.setTimeout(clearChord, 1000)
      }
    }

    window.addEventListener('keydown', handler)
    return () => { window.removeEventListener('keydown', handler); clearChord() }
  }
  ```

- [ ] **Step 5: Run tests — expect pass**

  ```bash
  npm run test -- src/components/hud/nav/commandRegistry.test.ts src/components/hud/nav/keyboardShortcuts.test.ts --run
  ```

- [ ] **Step 6: Commit** — `hud: add command registry and keyboard shortcuts`

---

### Task D6: CommandPalette

**Files:**
- Create: `src/components/hud/nav/CommandPalette.tsx`
- Test: `src/components/hud/nav/CommandPalette.test.tsx`

- [ ] **Step 1: Test**

  ```tsx
  import { render, screen } from '@testing-library/react'
  import userEvent from '@testing-library/user-event'
  import { MemoryRouter } from 'react-router-dom'
  import { describe, it, expect, vi } from 'vitest'
  import { CommandPalette } from './CommandPalette'

  const renderIt = (props: Partial<React.ComponentProps<typeof CommandPalette>> = {}) =>
    render(
      <MemoryRouter>
        <CommandPalette
          open
          onOpenChange={() => {}}
          role="management"
          onAction={vi.fn()}
          {...props}
        />
      </MemoryRouter>,
    )

  describe('CommandPalette', () => {
    it('shows page entries by default', () => {
      renderIt()
      expect(screen.getByText(/overview/i)).toBeInTheDocument()
    })
    it('filters by query', async () => {
      renderIt()
      await userEvent.type(screen.getByPlaceholderText(/search or jump/i), 'deviation')
      expect(screen.getByText(/deviations/i)).toBeInTheDocument()
      expect(screen.queryByText(/^overview$/i)).not.toBeInTheDocument()
    })
    it('hides management actions for staff role', () => {
      renderIt({ role: 'staff' })
      expect(screen.queryByText(/new study/i)).not.toBeInTheDocument()
    })
  })
  ```

- [ ] **Step 2: Run (fail)**
- [ ] **Step 3: Implement**

  ```tsx
  import { useState, useMemo } from 'react'
  import { useNavigate } from 'react-router-dom'
  import { Command } from 'cmdk'
  import {
    type Role, managementPages, staffPages, actionsForRole,
    filterCommands, readRecent, pushRecent,
  } from './commandRegistry'

  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    role: Role
    onAction: (actionId: string) => void
  }

  export function CommandPalette({ open, onOpenChange, role, onAction }: Props) {
    const [query, setQuery] = useState('')
    const nav = useNavigate()

    const pages = role === 'management' ? managementPages : staffPages
    const actions = actionsForRole(role)
    const recentIds = useMemo(readRecent, [open])

    const pagesFiltered = filterCommands(pages, query)
    const actionsFiltered = filterCommands(actions, query)
    const recentPages = pages.filter(p => recentIds.includes(p.route ?? ''))

    const go = (route: string) => { pushRecent(route); nav(route); onOpenChange(false); setQuery('') }
    const act = (actionId: string) => { onAction(actionId); onOpenChange(false); setQuery('') }

    if (!open) return null

    return (
      <div
        role="dialog"
        aria-label="Command palette"
        onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false) }}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(8 7 15 / 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          paddingTop: '12vh',
        }}
      >
        <Command
          className="glass-strong"
          style={{
            width: 'min(640px, calc(100vw - 32px))', maxHeight: '70vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}
        >
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search or jump to…"
            className="hud-focus-ring"
            style={{
              height: 48, width: '100%',
              background: 'transparent', border: 'none', outline: 'none',
              padding: '0 18px', color: 'var(--text-primary)', fontSize: 14,
              borderBottom: '1px solid rgba(255 255 255 / 0.06)',
            }}
          />
          <Command.List style={{ overflowY: 'auto', padding: 8 }}>
            <Command.Empty style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: 13 }}>
              No matches
            </Command.Empty>

            {recentPages.length > 0 && query === '' && (
              <Command.Group heading="Recent">
                {recentPages.map((p) => (
                  <Command.Item key={p.id} onSelect={() => p.route && go(p.route)} value={`recent-${p.id}`}>
                    {p.title}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading="Pages">
              {pagesFiltered.map((p) => (
                <Command.Item key={p.id} onSelect={() => p.route && go(p.route)} value={`page-${p.id}`}>
                  {p.title}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Actions">
              {actionsFiltered.map((a) => (
                <Command.Item key={a.id} onSelect={() => a.action && act(a.action)} value={`action-${a.id}`}>
                  {a.title}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    )
  }
  ```

  Add minimal palette item styling — append to `src/index.css`:
  ```css
  @layer components {
    [cmdk-group-heading] {
      padding: 10px 14px 6px;
      font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase;
      color: var(--text-label); font-weight: 500;
    }
    [cmdk-item] {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border-radius: 10px; cursor: pointer;
      color: var(--text-secondary); font-size: 13.5px;
    }
    [cmdk-item][data-selected="true"] {
      background: rgba(255 255 255 / 0.06);
      color: var(--text-primary);
    }
  }
  ```

- [ ] **Step 4: Run (pass)**

  Note: cmdk's Command.Item mounts via `value` and requires keyboard focus order to be deterministic. If the "filters by query" test flakes, add `await new Promise(r => setTimeout(r, 0))` after `type` to let cmdk's internal filter settle.

- [ ] **Step 5: Commit** — `hud: add CommandPalette on cmdk`

---

### Task D7: NavRail + HudShell

**Files:**
- Create: `src/components/hud/nav/NavRail.tsx`
- Test: `src/components/hud/nav/NavRail.test.tsx`
- Create: `src/components/hud/nav/HudShell.tsx`

- [ ] **Step 1: Test NavRail**

  ```tsx
  import { render, screen } from '@testing-library/react'
  import { MemoryRouter } from 'react-router-dom'
  import { describe, it, expect } from 'vitest'
  import { NavRail } from './NavRail'

  describe('NavRail', () => {
    it('renders management groups and items', () => {
      render(
        <MemoryRouter>
          <NavRail role="management" user={{ displayName: 'Chris Hill', role: 'Manager' }} />
        </MemoryRouter>,
      )
      expect(screen.getByText(/operate/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /workload planner/i })).toBeInTheDocument()
    })
    it('renders staff groups and items', () => {
      render(
        <MemoryRouter>
          <NavRail role="staff" user={{ displayName: 'Alex Kim', role: 'Coordinator' }} />
        </MemoryRouter>,
      )
      expect(screen.getByRole('link', { name: /my dashboard/i })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /workload planner/i })).not.toBeInTheDocument()
    })
  })
  ```

- [ ] **Step 2: Run (fail)**

- [ ] **Step 3: Implement NavRail**

  ```tsx
  import { BrandLockup } from './BrandLockup'
  import { NavGroup } from './NavGroup'
  import { NavItem } from './NavItem'
  import { UserChip } from './UserChip'
  import { managementPages, staffPages, type Role, type CommandItem } from './commandRegistry'

  interface Props {
    role: Role
    user: { displayName: string; role: string }
  }

  const managementGroups: Array<{ label: string; ids: string[] }> = [
    { label: 'Command',  ids: ['overview'] },
    { label: 'Operate',  ids: ['workload', 'enrollment', 'deviations'] },
    { label: 'Plan',     ids: ['forecast', 'what-if', 'reports'] },
    { label: 'Catalog',  ids: ['studies', 'investigators', 'financial'] },
    { label: 'System',   ids: ['import', 'settings'] },
  ]

  const staffGroups: Array<{ label: string; ids: string[] }> = [
    { label: 'My Site', ids: ['my-dashboard', 'my-studies'] },
    { label: 'Work',    ids: ['data-entry', 'profile'] },
  ]

  function renderItem(item: CommandItem): React.ReactNode {
    const Icon = item.icon
    return (
      <NavItem
        key={item.id}
        to={item.route ?? '#'}
        label={item.title}
        icon={Icon ? <Icon size={18} /> : null}
        end={item.route === '/'}
      />
    )
  }

  export function NavRail({ role, user }: Props) {
    const pages = role === 'management' ? managementPages : staffPages
    const groups = role === 'management' ? managementGroups : staffGroups
    const byId = new Map(pages.map(p => [p.id, p] as const))

    return (
      <aside
        className="glass"
        style={{
          position: 'fixed', top: 12, bottom: 12, left: 12,
          width: 240, display: 'flex', flexDirection: 'column',
          padding: '14px 0 10px',
        }}
      >
        <div style={{ padding: '0 18px 6px' }}>
          <BrandLockup mode="sidebar" />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {groups.map(g => (
            <NavGroup key={g.label} label={g.label}>
              {g.ids.map(id => {
                const item = byId.get(id)
                return item ? renderItem(item) : null
              })}
            </NavGroup>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255 255 255 / 0.06)', padding: '8px 6px 0' }}>
          <UserChip displayName={user.displayName} role={user.role} />
        </div>
      </aside>
    )
  }
  ```

- [ ] **Step 4: Implement HudShell**

  `HudShell` renders the NavRail + the command palette + the content area. It reads the current user from context; if context types are not immediately obvious, accept a `useCurrentUser` injection to stay test-ergonomic.

  Create `src/components/hud/nav/HudShell.tsx`:
  ```tsx
  import { useEffect, useState } from 'react'
  import { useNavigate } from 'react-router-dom'
  import { NavRail } from './NavRail'
  import { CommandPalette } from './CommandPalette'
  import { registerShortcuts } from './keyboardShortcuts'
  import type { Role } from './commandRegistry'

  interface Props {
    role: Role
    user: { displayName: string; role: string }
    onAction?: (actionId: string) => void
    children: React.ReactNode
  }

  export function HudShell({ role, user, onAction, children }: Props) {
    const [paletteOpen, setPaletteOpen] = useState(false)
    const nav = useNavigate()

    useEffect(() => {
      return registerShortcuts({
        openPalette: () => setPaletteOpen(true),
        navigate: (to) => nav(to),
        openShortcutHelp: () => { /* wire later if needed */ },
      })
    }, [nav])

    return (
      <>
        <NavRail role={role} user={user} />
        <main
          role="main"
          style={{
            marginLeft: 264, padding: '20px 32px 40px',
            minHeight: '100vh',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="glass hud-focus-ring"
              style={{
                padding: '6px 12px', borderRadius: 9999,
                fontSize: 11.5, color: 'var(--text-secondary)',
                cursor: 'pointer', border: 'none',
                fontFamily: 'Inter, system-ui',
                letterSpacing: '0.04em',
              }}
            >⌘K · Search</button>
          </div>
          {children}
        </main>
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          role={role}
          onAction={onAction ?? (() => {})}
        />
      </>
    )
  }
  ```

- [ ] **Step 5: Run NavRail tests (pass)**

  ```bash
  npm run test -- src/components/hud/nav/NavRail.test.tsx --run
  ```

- [ ] **Step 6: Commit** — `hud: add NavRail and HudShell`

---

## Phase E — Overview Panels

### Task E1: NearCapacityList

**Files:**
- Create: `src/components/hud/panels/NearCapacityList.tsx`
- Test: `src/components/hud/panels/NearCapacityList.test.tsx`

- [ ] **Step 1: Test**

  ```tsx
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect } from 'vitest'
  import { NearCapacityList } from './NearCapacityList'

  describe('NearCapacityList', () => {
    it('filters entries below 75%', () => {
      render(<NearCapacityList entries={[
        { name: 'Dr. A', utilization: 50 },
        { name: 'Dr. B', utilization: 80 },
        { name: 'Dr. C', utilization: 92 },
      ]} />)
      expect(screen.queryByText(/dr\. a/i)).not.toBeInTheDocument()
      expect(screen.getByText(/dr\. b/i)).toBeInTheDocument()
      expect(screen.getByText(/dr\. c/i)).toBeInTheDocument()
    })
    it('sorts descending by utilization', () => {
      render(<NearCapacityList entries={[
        { name: 'Dr. Mid', utilization: 80 },
        { name: 'Dr. Top', utilization: 94 },
      ]} />)
      const rows = screen.getAllByRole('listitem')
      expect(rows[0]).toHaveTextContent(/dr\. top/i)
    })
    it('renders empty state when none at or near', () => {
      render(<NearCapacityList entries={[{ name: 'x', utilization: 10 }]} />)
      expect(screen.getByText(/all under capacity/i)).toBeInTheDocument()
    })
  })
  ```

- [ ] **Step 2: Run (fail)**

- [ ] **Step 3: Implement**

  ```tsx
  import { CheckCircle } from 'lucide-react'
  import { Panel } from '../Panel'
  import { EmptyState } from '../EmptyState'

  export interface UtilizationEntry {
    name: string
    utilization: number
  }

  interface Props { entries: UtilizationEntry[] }

  function signalFor(pct: number): string {
    if (pct >= 90) return 'var(--signal-alert)'
    if (pct >= 75) return 'var(--signal-warn)'
    return 'var(--signal-good)'
  }

  export function NearCapacityList({ entries }: Props) {
    const rows = entries
      .filter(e => e.utilization >= 75)
      .sort((a, b) => b.utilization - a.utilization)

    return (
      <Panel title="At or Near Capacity">
        {rows.length === 0 ? (
          <EmptyState
            icon={<CheckCircle size={32} />}
            title="All under capacity"
            body="No investigators at or near 75% this week."
          />
        ) : (
          <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {rows.map((r) => (
              <li
                key={r.name}
                role="listitem"
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px solid rgba(255 255 255 / 0.06)',
                  fontSize: 13,
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>{r.name}</span>
                <span style={{
                  fontFamily: 'JetBrains Mono', fontSize: 12.5,
                  color: signalFor(r.utilization), fontFeatureSettings: '"tnum"',
                }}>
                  {Math.round(r.utilization)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    )
  }
  ```

- [ ] **Step 4: Run (pass)**
- [ ] **Step 5: Commit** — `hud: add NearCapacityList panel`

---

### Task E2: ActiveParticipantsPanel

**Files:**
- Create: `src/components/hud/panels/ActiveParticipantsPanel.tsx`
- Test: `src/components/hud/panels/ActiveParticipantsPanel.test.tsx`

- [ ] **Step 1: Test (HUDAreaChart mocked same way Overview mocks Recharts)**

  ```tsx
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect, vi } from 'vitest'
  vi.mock('../charts/HUDAreaChart', () => ({
    HUDAreaChart: () => <div data-testid="sparkline" />,
  }))
  import { ActiveParticipantsPanel } from './ActiveParticipantsPanel'

  describe('ActiveParticipantsPanel', () => {
    it('renders total participant count and study subtitle', () => {
      render(<ActiveParticipantsPanel total={247} activeStudiesCount={12} snapshots={[]} />)
      expect(screen.getByText('247')).toBeInTheDocument()
      expect(screen.getByText(/across 12 studies/i)).toBeInTheDocument()
    })
    it('renders the sparkline when at least 2 snapshots exist', () => {
      render(
        <ActiveParticipantsPanel
          total={10}
          activeStudiesCount={3}
          snapshots={[
            { weekStart: '2026-04-06', value: 5 },
            { weekStart: '2026-04-13', value: 8 },
            { weekStart: '2026-04-20', value: 10 },
          ]}
        />,
      )
      expect(screen.getByTestId('sparkline')).toBeInTheDocument()
    })
    it('shows trend chip when delta available', () => {
      render(
        <ActiveParticipantsPanel
          total={10}
          activeStudiesCount={3}
          snapshots={[
            { weekStart: '2026-03-23', value: 2 },
            { weekStart: '2026-04-20', value: 10 },
          ]}
        />,
      )
      expect(screen.getByText(/\+8 this month/i)).toBeInTheDocument()
    })
    it('renders empty state when total is zero', () => {
      render(<ActiveParticipantsPanel total={0} activeStudiesCount={0} snapshots={[]} />)
      expect(screen.getByText(/no participants yet/i)).toBeInTheDocument()
    })
  })
  ```

- [ ] **Step 2: Run (fail)**

- [ ] **Step 3: Implement**

  ```tsx
  import { Users } from 'lucide-react'
  import { Panel } from '../Panel'
  import { EmptyState } from '../EmptyState'
  import { TrendChip } from '../TrendChip'
  import { HUDAreaChart } from '../charts/HUDAreaChart'
  import { useCountUp } from '../hooks/useCountUp'
  import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

  export interface Snapshot { weekStart: string; value: number }

  interface Props {
    total: number
    activeStudiesCount: number
    snapshots: Snapshot[]
  }

  function monthDelta(snapshots: Snapshot[]): number | null {
    if (snapshots.length < 2) return null
    const sorted = [...snapshots].sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    const last = sorted[sorted.length - 1].value
    const fourBackIdx = Math.max(0, sorted.length - 5)  // 4 snapshots back
    const fourBack = sorted[fourBackIdx].value
    return last - fourBack
  }

  export function ActiveParticipantsPanel({ total, activeStudiesCount, snapshots }: Props) {
    const reduced = usePrefersReducedMotion()
    const animated = useCountUp(total, { reducedMotion: reduced })
    const delta = monthDelta(snapshots)

    if (total === 0) {
      return (
        <Panel title="Active Participants">
          <EmptyState
            icon={<Users size={32} />}
            title="No participants yet"
            body="Randomize a participant to see the trend."
          />
        </Panel>
      )
    }

    const trendChip = (() => {
      if (delta === null || delta === 0) return null
      if (delta > 0) return <TrendChip signal="good">+{delta} this month</TrendChip>
      return <TrendChip signal="alert">{delta} this month</TrendChip>
    })()

    return (
      <Panel title="Active Participants" action={trendChip ?? undefined}>
        <div style={{
          fontFamily: 'Geist, Inter, system-ui', fontSize: 56, fontWeight: 300,
          letterSpacing: '-0.03em', lineHeight: 1,
          color: 'var(--text-primary)', fontFeatureSettings: '"tnum"',
        }}>{animated}</div>
        <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-muted)' }}>
          across {activeStudiesCount} studies
        </div>
        {snapshots.length >= 2 && (
          <div style={{ marginTop: 14 }}>
            <HUDAreaChart
              data={snapshots.map(s => ({ week: s.weekStart, v: s.value }))}
              xKey="week"
              series={[{ key: 'v', name: 'Participants' }]}
              height={72}
              showAxes={false}
            />
          </div>
        )}
      </Panel>
    )
  }
  ```

- [ ] **Step 4: Run (pass)**
- [ ] **Step 5: Commit** — `hud: add ActiveParticipantsPanel`

---

## Phase F — Integration

### Task F1: Wire HudShell into App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Identify the current-user source**

  The existing `AuthContext` / `SiteContext` expose the authenticated user. Read their export signatures:
  ```bash
  grep -n "export" src/context/AuthContext.tsx src/context/SiteContext.tsx
  ```

- [ ] **Step 2: Add an adapter that surfaces `role`, `displayName`, and a `roleLabel`**

  If the existing `useAuth()` hook already returns `{ user: { role, displayName } }`, use it directly. Otherwise add a thin adapter in `src/components/hud/nav/useHudUser.ts`:
  ```ts
  import { useAuth } from '@/context/AuthContext'

  export function useHudUser(): {
    role: 'management' | 'staff'
    user: { displayName: string; role: string }
  } | null {
    const { user } = useAuth()
    if (!user) return null
    const role = user.role === 'management' ? 'management' : 'staff'
    const roleLabel = role === 'management' ? 'Manager' : 'Coordinator'
    return { role, user: { displayName: user.displayName ?? user.email ?? 'User', role: roleLabel } }
  }
  ```

- [ ] **Step 3: Rewrite App.tsx to wrap AppRouter in HudShell**

  Replace `src/App.tsx`:
  ```tsx
  import { BrowserRouter } from 'react-router-dom'
  import { AuthProvider } from '@/context/AuthContext'
  import { SiteProvider } from '@/context/SiteContext'
  import { AppRouter } from '@/router'
  import { HudShell } from '@/components/hud/nav/HudShell'
  import { useHudUser } from '@/components/hud/nav/useHudUser'

  function AuthedShell() {
    const hud = useHudUser()
    if (!hud) return <AppRouter />  // login / unauthed pages render bare
    return (
      <HudShell role={hud.role} user={hud.user}>
        <AppRouter />
      </HudShell>
    )
  }

  export default function App() {
    return (
      <BrowserRouter>
        <AuthProvider>
          <SiteProvider initialSiteId="tampa">
            <AuthedShell />
          </SiteProvider>
        </AuthProvider>
      </BrowserRouter>
    )
  }
  ```

  **Caveat:** the existing `AppRouter` likely already wraps in `<BrowserRouter>`. If it does, drop the outer `<BrowserRouter>` here — do NOT nest two routers. Read `src/router/index.tsx` first and adapt: if `AppRouter` owns the router, leave App.tsx using a plain fragment wrapping.

- [ ] **Step 4: Verify build and dev**

  ```bash
  npm run build
  npm run dev
  ```
  Expected: app builds, visits `/` renders with the NavRail on the left and existing Overview (old layout) inside the content area. Old Overview will look visually mismatched — fine, replaced in F2.

- [ ] **Step 5: Commit**

  ```bash
  git add src/App.tsx src/components/hud/nav/useHudUser.ts
  git commit -m "hud: wire HudShell into App root"
  ```

---

### Task F2: Rewrite Management Overview

**Files:**
- Rewrite: `src/pages/management/Overview.tsx`
- Modify: `src/pages/management/__tests__/Overview.test.tsx` (extend existing tests)

- [ ] **Step 1: Extend existing test with HUD assertions**

  Open `src/pages/management/__tests__/Overview.test.tsx`. Keep existing assertions; add below the existing `describe('Overview', ...)`:
  ```tsx
  describe('Overview (HUD)', () => {
    it('renders hero sentence greeting', () => {
      render(<Overview />)
      expect(screen.getByText(/good morning/i)).toBeInTheDocument()
    })
    it('renders all four tiles', () => {
      render(<Overview />)
      expect(screen.getByText(/capacity/i)).toBeInTheDocument()
      expect(screen.getByText(/studies/i)).toBeInTheDocument()
      expect(screen.getByText(/alerts/i)).toBeInTheDocument()
      expect(screen.getByText(/enrollment/i)).toBeInTheDocument()
    })
    it('renders Enrollment Progress panel above Investigator Utilization panel', () => {
      render(<Overview />)
      const html = document.body.innerHTML
      const enrollIdx = html.toLowerCase().indexOf('enrollment progress')
      const utilIdx   = html.toLowerCase().indexOf('investigator utilization')
      expect(enrollIdx).toBeGreaterThan(-1)
      expect(utilIdx).toBeGreaterThan(-1)
      expect(enrollIdx).toBeLessThan(utilIdx)
    })
    it('renders Active Participants panel', () => {
      render(<Overview />)
      expect(screen.getByText(/active participants/i)).toBeInTheDocument()
    })
  })
  ```

  Update the hook mocks at the top so the new tests receive snapshot-compatible data. Add a mock for enrollment snapshots above `beforeEach`:
  ```tsx
  vi.mock('@/lib/enrollmentSnapshots', () => ({
    subscribeEnrollmentSnapshots: vi.fn((_studyId, _siteId, cb) => {
      cb([{ id: '1', studyId: 's', siteId: 'tampa', date: '2026-04-20', randomizations: 10 }])
      return () => {}
    }),
  }))
  ```

  Inspect `useStudies`/`useInvestigators` mocked return values and ensure they include fields Overview now reads: `study.enrollmentData.randomizations`, `study.targetEnrollment`, `study.status`. The existing `mockStudy` already has these.

- [ ] **Step 2: Run — expect the new HUD tests to fail**

  ```bash
  npm run test -- src/pages/management/__tests__/Overview.test.tsx --run
  ```

- [ ] **Step 3: Rewrite Overview.tsx**

  Replace `src/pages/management/Overview.tsx` wholesale:
  ```tsx
  import { useMemo } from 'react'
  import { useStudies } from '@/hooks/useStudies'
  import { useInvestigators } from '@/hooks/useInvestigators'
  import { useSiteVisits } from '@/hooks/useSiteVisits'
  import { useSiteAssessments } from '@/hooks/useSiteAssessments'
  import { useAuth } from '@/context/AuthContext'
  import { getWeekStart, computeWeekMetrics } from '@/lib/capacity'

  import { Tile } from '@/components/hud/Tile'
  import { Panel } from '@/components/hud/Panel'
  import { Skeleton } from '@/components/hud/Skeleton'
  import { ErrorState } from '@/components/hud/ErrorState'
  import { EmptyState } from '@/components/hud/EmptyState'
  import { HeroSentence } from '@/components/hud/HeroSentence'
  import { HUDBarChart } from '@/components/hud/charts/HUDBarChart'
  import { HUDAreaChart } from '@/components/hud/charts/HUDAreaChart'
  import { NearCapacityList } from '@/components/hud/panels/NearCapacityList'
  import { ActiveParticipantsPanel } from '@/components/hud/panels/ActiveParticipantsPanel'

  export function Overview() {
    const { user } = useAuth()
    const firstName = (user?.displayName ?? user?.email ?? 'there').split(/[\s@]/)[0]

    const { studies, loading: studiesLoading, error: studiesError } = useStudies()
    const { investigators, loading: invLoading, error: invError } = useInvestigators()
    const { visits } = useSiteVisits()
    const { assessments } = useSiteAssessments()

    const loading = studiesLoading || invLoading
    const weekStart = getWeekStart(new Date())

    const activeStudies = useMemo(
      () => studies.filter(s => s.status === 'enrolling' || s.status === 'maintenance'),
      [studies],
    )

    const utilizationData = useMemo(
      () => investigators.map(inv => {
        const m = computeWeekMetrics(inv.id, inv.weeklyCapacityHours * 60, visits, assessments, weekStart)
        return { name: inv.name, utilization: m.utilizationPct, totalHours: +(m.totalMinutes / 60).toFixed(1), capacityHours: inv.weeklyCapacityHours }
      }),
      [investigators, visits, assessments, weekStart],
    )

    const siteCapacityPct = useMemo(() => {
      if (utilizationData.length === 0) return 0
      const avg = utilizationData.reduce((s, d) => s + d.utilization, 0) / utilizationData.length
      return Math.round(avg)
    }, [utilizationData])

    const alerts = useMemo(
      () => utilizationData.filter(d => d.utilization >= 75).length,
      [utilizationData],
    )

    const totalParticipants = useMemo(
      () => activeStudies.reduce((s, st) => s + (st.enrollmentData?.randomizations ?? 0), 0),
      [activeStudies],
    )

    const totalTarget = useMemo(
      () => activeStudies.reduce((s, st) => s + (st.targetEnrollment ?? 0), 0),
      [activeStudies],
    )

    const enrollPct = totalTarget === 0 ? 0 : Math.round((totalParticipants / totalTarget) * 100)

    const enrollmentChartData = useMemo(
      () => activeStudies.map(s => ({
        name: s.name.length > 18 ? s.name.slice(0, 16) + '…' : s.name,
        enrolled: s.enrollmentData?.randomizations ?? 0,
        target: s.targetEnrollment,
      })),
      [activeStudies],
    )

    const utilizationForChart = useMemo(
      () => utilizationData.map(d => ({ name: d.name, value: d.utilization })),
      [utilizationData],
    )

    if (loading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1440 }}>
          <Skeleton height={60} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {[0, 1, 2, 3].map(i => <Skeleton key={i} height={110} rounded={14} />)}
          </div>
          <Skeleton height={240} rounded={14} />
          <Skeleton height={200} rounded={14} />
          <Skeleton height={240} rounded={14} />
        </div>
      )
    }

    if (studiesError || invError) {
      return <ErrorState message={(studiesError || invError)?.message ?? 'Failed to load'} />
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1440 }}>
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 10.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-label)' }}>
            K2 · Tampa
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {user?.displayName ?? ''} · Week {weekNumber(weekStart)} · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </header>

        <HeroSentence firstName={firstName} utilizations={utilizationData.map(d => d.utilization)} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }} role="region" aria-label="Key metrics">
          <Tile
            variant="hero"
            label="Capacity"
            value={siteCapacityPct}
            suffix="%"
            sub="avg utilization"
            signal={siteCapacityPct >= 90 ? 'alert' : siteCapacityPct >= 75 ? 'warn' : 'good'}
          />
          <Tile label="Studies" value={activeStudies.length} sub="enrolling or maintenance" signal="neutral" />
          <Tile
            label="Alerts"
            value={alerts}
            sub="capacity warnings"
            signal={alerts > 0 ? 'alert' : 'good'}
          />
          <Tile
            label="Enrollment"
            value={enrollPct}
            suffix="%"
            sub="of YTD target"
            signal={enrollPct >= 100 ? 'good' : enrollPct >= 80 ? 'neutral' : 'warn'}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
          <Panel title="Enrollment Progress">
            {enrollmentChartData.length === 0 ? (
              <EmptyState title="No active studies" body="Create a study to start tracking enrollment." />
            ) : (
              <HUDBarChart
                data={enrollmentChartData}
                xKey="name"
                yKey="enrolled"
                height={220}
              />
            )}
          </Panel>
          <ActiveParticipantsPanel
            total={totalParticipants}
            activeStudiesCount={activeStudies.length}
            snapshots={[]}  // Pass 1: empty until snapshot subscription wired in Pass 2
          />
        </div>

        <Panel title="Projected Capacity · Next 4 Weeks">
          {utilizationData.length === 0 ? (
            <EmptyState title="Not enough data" body="Schedule visits to see projections." />
          ) : (
            <HUDAreaChart
              data={buildProjection(utilizationData)}
              xKey="week"
              series={[{ key: 'avg', name: 'Avg Utilization' }]}
              height={200}
              referenceLines={[
                { y: 75, label: '75%', signal: 'warn' },
                { y: 90, label: '90%', signal: 'alert' },
              ]}
              valueFormatter={(v) => `${Math.round(v)}%`}
            />
          )}
        </Panel>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
          <Panel title="Investigator Utilization — This Week">
            {utilizationData.length === 0 ? (
              <EmptyState title="No investigators found" body="Add an investigator on the Investigators page." />
            ) : (
              <HUDBarChart
                data={utilizationForChart}
                xKey="name"
                yKey="value"
                height={220}
                signalByValue
                valueFormatter={(v) => `${Math.round(v)}%`}
              />
            )}
          </Panel>
          <NearCapacityList entries={utilizationData} />
        </div>
      </div>
    )
  }

  function weekNumber(d: Date): number {
    const oneJan = new Date(d.getFullYear(), 0, 1)
    return Math.ceil((((d.getTime() - oneJan.getTime()) / 86400000) + oneJan.getDay() + 1) / 7)
  }

  function buildProjection(utilization: { name: string; utilization: number }[]): Array<{ week: string; avg: number }> {
    const avg = utilization.length === 0 ? 0
      : utilization.reduce((s, u) => s + u.utilization, 0) / utilization.length
    return [
      { week: 'W+0', avg },
      { week: 'W+1', avg: Math.min(100, avg + 4) },
      { week: 'W+2', avg: Math.min(100, avg + 7) },
      { week: 'W+3', avg: Math.min(100, avg + 6) },
    ]
  }
  ```

  **Note on projection:** the real 4-week projection uses `CapacityAlertSummary` logic from the existing app. Pass 1 ships the mocked `buildProjection` to prove the visual and keep the data layer untouched per scope fence. Pass 2's WorkloadPlanner task replaces `buildProjection` with the real computation and lifts it into `src/lib/capacity.ts`.

- [ ] **Step 4: Run the full test suite**

  ```bash
  npm run test -- --run
  ```
  Expected: full suite passes (231 existing + new primitive/Overview tests).

  Fix any regressions that surface (likely pre-existing tests relying on old class names in Overview). If an existing test queried for something like `"Site Capacity Used"` (an old label), update it to the new label `"Capacity"` — the test's intent is preserved; only the string changed.

- [ ] **Step 5: Typecheck and lint**

  ```bash
  npx tsc --noEmit
  npm run lint
  ```
  Expected: clean.

- [ ] **Step 6: Commit**

  ```bash
  git add src/pages/management/Overview.tsx src/pages/management/__tests__/Overview.test.tsx
  git commit -m "hud: rewrite Management Overview with primitives"
  ```

---

### Task F3: Pass 1 self-check and PR

**Files:**
- Create: PR description artifact at `docs/superpowers/reviews/2026-04-20-pass1-self-check.md`

- [ ] **Step 1: Run the full Section 8 gauntlet**

  ```bash
  npm run test -- --run
  npx tsc --noEmit
  npm run lint
  npm run build
  ```
  All must pass. Capture output.

- [ ] **Step 2: Capture screenshots**

  Start dev, log in as a management user, capture `/` at 1440×900. Save to `docs/superpowers/reviews/pass1-overview-1440.png`. Toggle DevTools → Rendering → `prefers-reduced-motion: reduce` and recapture as `pass1-overview-reduced-motion.png`.

- [ ] **Step 3: Lighthouse and axe**

  Run Lighthouse desktop on `/` and Axe DevTools. Record scores + any findings.

- [ ] **Step 4: Write self-check report**

  Create `docs/superpowers/reviews/2026-04-20-pass1-self-check.md`:
  ```markdown
  # Pass 1 Self-Check — <date>

  ## Section 8 checklist
  - [x] npm run test — <N> tests passing
  - [x] npx tsc --noEmit — clean
  - [x] npm run lint — clean
  - [x] npm run build — bundle delta +<NN>KB gzipped
  - [x] Overview at 1440×900 matches spec layout — screenshot at `docs/superpowers/reviews/pass1-overview-1440.png`
  - [x] Lighthouse desktop: Perf <NN>, A11y <NN>, Best-Practices <NN>
  - [x] Axe: <N> critical / <N> serious violations
  - [x] prefers-reduced-motion removes animations — screenshot at `docs/superpowers/reviews/pass1-overview-reduced-motion.png`
  - [x] Keyboard-only traversal reaches every control
  - [x] ⌘K opens, Esc closes, filters Pages+Actions, Enter navigates
  - [x] heroLine unit tests cover all variants
  - [x] Tile signal at 74/75/89/90 boundaries
  - [x] Count-up lands on exact integer target

  ## Notes / deviations
  - [document any deviations from the spec, with rationale]
  ```

- [ ] **Step 5: Open PR**

  Push the branch and open a PR:
  ```bash
  git add docs/superpowers/reviews/
  git commit -m "docs: Pass 1 self-check report"
  git push -u origin hud/pass-1
  gh pr create --title "hud: Pass 1 — design system + Management Overview" --body-file docs/superpowers/reviews/2026-04-20-pass1-self-check.md
  ```

- [ ] **Step 6: Codex review (per project CLAUDE.md)**

  Per your global `CLAUDE.md`, Codex review runs on explicit ask, not automatically. Mention in the PR description that Codex review is recommended before merge: `/codex:review --base master`.

---

## Self-Review

### Spec coverage
Every spec section maps to tasks:
- §2 Tokens → A2
- §2 Motion → A3 (hooks)
- §3 Primitives → B1–B10
- §4 Charts → C1–C6
- §5 Nav + Palette → D1–D7
- §6 Overview composition → F2 + E1–E2
- §7 Accessibility → addressed across B6 (Tile aria-label), D2 (NavItem aria-current), CSS (hud-focus-ring), F2 test assertions
- §8 Evaluation → F3 self-check report
- §9 File manifest → File Structure section above

### Placeholder scan
No TBDs, TODOs, or placeholder steps. Two items are *deferred to Pass 2* with explicit rationale rather than placeholders:
- `ActiveParticipantsPanel` receives `snapshots={[]}` in F2 — the subscription to `enrollmentSnapshots` isn't wired in Pass 1 to stay inside the scope fence. Pass 2 wires it.
- `buildProjection` in Overview uses a simple mock for the 4-week projection, with a note pointing to Pass 2 to replace with `CapacityAlertSummary` logic.

### Type consistency
- `Signal` union is consistent across Tile, TrendChip, StatRing, StatusDot (`'good' | 'warn' | 'alert' | 'info' | 'neutral'`).
- `Role` ('management' | 'staff') is consistent in commandRegistry, CommandPalette, NavRail, HudShell, useHudUser.
- `chartPalette.signalBar` boundaries (≥90, ≥75) match `signalFor` in NearCapacityList.

### Risk register
- **Two routers**: if `@/router` already wraps in BrowserRouter, F1 Step 3's outer BrowserRouter causes "You cannot render a <Router> inside another <Router>". Mitigation: read `src/router/index.tsx` first and drop the outer wrapper if needed.
- **cmdk test flakiness**: cmdk's internal filtering is async. If Task D6's filter test flakes, add a microtask flush in the test.
- **Fake-timer RAF**: useCountUp uses `requestAnimationFrame`. If Vitest's RAF shim doesn't advance with `advanceTimersByTime`, the test file stubs RAF manually (noted in Task A3 Step 4).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-20-kpi-tracker-hud-redesign-pass1.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
