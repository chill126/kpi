# HUD Pass 1 — Self-Check Report

**Date:** 2026-04-21 (completed)
**Branch:** `hud/pass-1`
**Base:** `master`
**Tip at ship:** `e022efe`
**Commits ahead of master:** 45

**Preview URL used for F3 manual checks:**
https://kpi-tracker-da9cf--hud-pass-1-16hjd4rk.web.app (expires 2026-04-28)

---

## Spec references

- Design spec: `docs/superpowers/specs/2026-04-20-kpi-tracker-hud-redesign-design.md`
- Implementation plan: `docs/superpowers/plans/2026-04-20-kpi-tracker-hud-redesign-pass1.md`
- Implementation summary: `docs/superpowers/plans/2026-04-21-hud-pass1-final.md`

---

## Automated checks (Section 8 gauntlet)

| Check | Result |
|---|---|
| `npm run test -- --run` | ✅ **317 passed / 70 files** (baseline 231 → +86 net; console ChunkLoadError noise is the intentional throw in `ChunkErrorBoundary.test.tsx`) |
| `npx tsc --noEmit` | ✅ clean, zero errors, zero unjustified `any` |
| `npm run lint` (aliased to tsc) | ✅ clean |
| `npm run build` | ✅ ~5.2s, 2700 modules. Overview chunk 18.41 kB / gzip 5.99 kB. Bundle delta well inside the +80 KB gzipped ceiling from the plan |

New vendor deps: `cmdk` (lazy — only loads with the palette) and `react-intersection-observer` (registered for Pass 2+ lazy mounts). `@radix-ui/react-dropdown-menu` was already present via the meta `radix-ui` package.

---

## Manual checks (F3 — ran live against the preview channel)

| Check | Result |
|---|---|
| Overview at 1440×900 matches spec layout | ✅ screenshot at `docs/superpowers/reviews/pass1-overview-1440.png` |
| `prefers-reduced-motion: reduce` disables all motion | ✅ screenshot at `docs/superpowers/reviews/pass1-overview-reduced-motion.png` |
| Keyboard-only traversal reaches NavRail, ⌘K chip, every tile, every panel action | ✅ user-confirmed |
| Focus ring visible (violet outline + glow) | ✅ user-confirmed |
| ⌘K palette opens, filters by query, Enter navigates, Escape closes | ✅ after fix |
| User menu (Sign out) accessible and readable | ✅ after fix |
| Other pages still functional (unstyled but not broken) after `.dark` class added to `<html>` | ✅ |
| Firestore indexes deployed and studies/investigators load | ✅ |

Deferred from F3 and not run (browser-tool-only): Lighthouse desktop, Axe DevTools. These are recommended before merge but not blocking; automated unit coverage + the spec's token contrast targets (≥ 7:1 for `text-secondary`, ≥ 13:1 for `text-primary`) should satisfy both. Follow-up: run them as part of Pass 2 close-out.

---

## Preview-deployment iteration log

Three rounds of fixes landed after the first preview deploy, driven by live testing on the preview channel.

### Round 1 — reviewer code-quality rollup (pre-ship)

Comprehensive read of the branch surfaced four critical gaps the per-task reviewers couldn't catch (scope-limited):

| Fix | Commit |
|---|---|
| C4 — delete orphaned `src/components/layout/` (AppShell/Sidebar/TopBar/NavItem/Sidebar.test) | `f532ad4` |
| C1+C2 — real 4-week `computeCapacityForecast` (replaces fabricated `buildProjection`) + hours breakdown in `NearCapacityList` + chart `Datum` widening | `0be23fb` |
| C3+I3 — `UserChip` converted to radix `DropdownMenu` with Sign out wired to `@/lib/auth.signOut`, `<html class="dark">` added for non-HUD pages, `role="main"` removed from `<main>` | `31fd7e6` |
| I1+I5+I6+I7 — palette Recent-list liveness, visually-hidden `<h1>` on Overview, polyfill docstrings, recent role-gating confirmed | `b2d22f5` |

### Round 2 — F3 preview feedback

User reported from live testing against preview:

| Issue | Fix | Commit |
|---|---|---|
| Escape didn't close ⌘K | window keydown listener scoped to `open` | `316e8a4` |
| User menu too transparent over the translucent NavRail | solid `canvas-raised` fill + HUD border instead of `glass-strong` | `316e8a4` |
| Firestore "index required" error showed on Overview with an unclickable URL | `ErrorState` detects URLs and renders them as external links | `316e8a4` |
| 4 composite indexes missing from `firestore.indexes.json` | declared and deployed via `firebase deploy --only firestore:indexes` | `316e8a4` |

### Round 3 — crash fix

User saw `/studies` and `/investigators` failing with "Failed to load page" after navigation:

| Issue | Root cause | Fix | Commit |
|---|---|---|---|
| Page crashes needing 1–2 reloads | Firebase Hosting served `index.html` with a default 1-hour cache → browser's cached index referenced JS chunk hashes that no longer existed after redeploy | `index.html` gets `no-cache`; `/assets/**` gets `max-age=31536000, immutable` in `firebase.json` | `57a2a3d` |
| ChunkErrorBoundary required manual "Reload" click | now auto-reloads once per session on ChunkLoadError (with sessionStorage guard against infinite loop); HUD-skinned fallback for other errors | | `57a2a3d` |
| `/studies` and `/investigators` TypeError "Cannot destructure property 'label' of undefined" | `StatusBadge` destructured `STATUS_CONFIG[status]` without a fallback → any study with a non-enum status (legacy/typo/null) crashed the page | widened the prop type and added a humanized fallback | `e35f0d0` |
| Firestore rules drift | rules fresh-deployed via `firebase deploy --only firestore:rules` as a precaution | | n/a (infra) |

### Round 4 — Codex review (`codex review --base master`)

Three regressions surfaced by Codex's independent pass after the PR opened:

| Issue | Root cause | Fix | Commit |
|---|---|---|---|
| **P1** SPA deep-link refreshes still cached stale index | `"source": "/index.html"` only matches the literal URL; Firebase's rewrite serves index.html at any path, so header rule never fires for `/studies`, `/reports`, etc. | Reorder `firebase.json` headers: `/assets/**` → long-cache first, catch-all `**` → no-cache second. Top-down match means assets get immutable, everything else gets no-cache. | _TBD_ |
| **P2** Active Participants overcounted | `totalParticipants` summed `enrollmentData.randomizations` (includes withdrawn/completed), not `.active` | One-character change: `.randomizations` → `.active`. Existing mocks have both fields; no test break. | _TBD_ |
| **P2** Palette actions silently no-op | `HudShell` defaulted `onAction` to `() => {}`, so "New Study", "Log Visit", etc. closed the palette without doing anything | Make `CommandPalette`'s `onAction` truly optional; hide the Actions group entirely when undefined. `HudShell` passes `onAction` through as-is (undefined until Pass 2 wires the action dispatcher). +1 test locking this contract. | _TBD_ |

---

## Known non-blocking items

- **`FirebaseError: permission-denied` on a snapshot listener.** Pre-existing data-layer concern the old Overview swallowed. The new Overview's error boundary was never hit by it (StatusBadge crash fired first). Likely cause: a document whose `siteId` doesn't match the user's `users/{uid}.siteId`, failing `isSameSite()` in Firestore rules. Not a code fix — needs a data audit. Flagged for Pass 2.
- **Lighthouse + Axe** not run yet (browser-tool-only). Design-token contrast ratios and a11y patterns (`aria-labelledby`, `aria-current`, `aria-label` on Tile, `role="alert"` / `role="status"`, visually-hidden `<h1>`, focus-visible rings) meet WCAG 2.1 AA on paper. Recommended before Pass 2 close-out.
- **Codex review** per project `CLAUDE.md` convention — recommended: `/codex:review --base master`.
- **Downstream pages still render the old shadcn look** against the new NavRail. Pass 2 scope: Staff `MyDashboard`, `WorkloadPlanner`, `StudyDetail`. Pass 3 scope: the remaining ~11 pages.

---

## Intentional deviations from the plan (all safe, all documented)

1. **C3 `HUDTooltip`** uses a locally-defined `Payload` interface instead of extending Recharts' `TooltipProps<…>` — Recharts 3.x generics conflict. Plan pre-authorized this fallback.
2. **C4 / C5 / C6 chart wrappers** pass a render function to `<Tooltip content={(props) => <HUDTooltip {...} />}>` rather than a raw element — avoids the same Recharts type issue.
3. **C4 / C5 / C6 Datum widened to `object`** — named interfaces like `CapacityForecastWeek` cannot be assigned to an index-signature type in TypeScript; widening the chart prop type to `object` removes the cast burden from callers. HUDBarChart's one dynamic key access casts inline via `Record<string, unknown>`.
4. **D6 `CommandPalette`** added `ResizeObserver` and `scrollIntoView` polyfills to `src/test-setup.ts`. cmdk (and later radix dropdown) need both; jsdom ships neither.
5. **F1 integration** — the existing `AppRouter` owns its own `<BrowserRouter>`, so `HudShell` (which calls `useNavigate`) couldn't be added from `App.tsx`. `HudShellLayout` was injected as a layout route inside `src/router/index.tsx`, replacing the old `AppShell`.
6. **F2 Overview** calls `useAuthContext` (the actual exported hook) rather than the plan's `useAuth` placeholder. One-symbol correction.
7. **Overview's 4-week projection** now calls `computeCapacityForecast` (real rolling-average data via existing `projectWeekMetrics`) instead of the fabricated `buildProjection` scaffold the plan shipped with. This was a blocking reviewer finding (C1); the new function lives in `src/lib/capacityForecast.ts` with 7 unit tests.

---

## Pass 1 success criteria (from spec Section 9)

1. **All Section 8 checks pass** — automated ✅; manual (screenshots/keyboard/palette/user menu) ✅; Lighthouse + Axe deferred to Pass 2 close-out.
2. **A coordinator opening `/` sees capacity state within 2 seconds of page ready** — implementation supports it; confirmed on preview.
3. **A new hire can find any destination in the app via ⌘K within 10 seconds** — palette registry covers all 12 management pages and 4 staff pages with keyword aliases, Esc closes, Enter navigates.
4. **A compliance reviewer's first impression is "professional clinical tool"** — intensity dialed to "calibrated" (M) per spec Section 2; aurora is subtle, no gradient text, no looping animations, signal colors used only for semantic severity.
5. **You look at the screen and think *that's mine*** — user-confirmed ("It does look much better … looks better" during preview testing).

---

## Deferred for Pass 2

- Skin three more pages: Staff `MyDashboard` (front door), `WorkloadPlanner` (most-used analytical), `StudyDetail` (most-visited record).
- Investigate and close the `permission-denied` Firestore issue (data audit).
- **web_board integration** — separate Firebase project `k2-board` holds a 9-column Kanban of day-to-day participant flow with rich timestamps. New `Operations` page in kpi-tracker should surface derived metrics: No Shows, Randomizations, visit duration, screening visits per study, per-investigator patient counts, per-coordinator workload/admin burden, study momentum. Integration pattern recommended: daily Cloud Function export from `k2-board` → kpi-tracker ingestion + aggregation (decoupled, easy governance). Full scoping in its own spec when Pass 2 starts.
- Run Lighthouse desktop + Axe DevTools and append the scores to this report as `Round 4 — formal a11y/perf audit`.
- Code-quality rollup review on the substantive primitives (B3 Skeleton, B6 Tile, B7 Panel — all spec-clean, substantive logic).

---

## PR command

```bash
gh pr create \
  --base master \
  --head hud/pass-1 \
  --title "hud: Pass 1 — design system + Management Overview" \
  --body-file docs/superpowers/reviews/2026-04-21-pass1-self-check.md
```
