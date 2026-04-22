# KPI Tracker — HUD Redesign (Pass 1)

**Project:** K2 Medical Research Tampa · KPI Tracker
**Scope:** Pass 1 of 3 — Design System + Management Overview page
**Aesthetic:** Aurora Glass, calibrated intensity, tasteful motion, dark-only
**Status:** LOCKED — do not re-debate decisions, build to this spec
**Date:** 2026-04-20

---

## How to use this document

This doc is both a design spec and a prompt. To execute Pass 1, start a fresh Claude Code session in the `kpi-tracker` repo and paste this entire file, prefixed with:

> Build Pass 1 of the KPI Tracker HUD redesign per the attached spec. Follow every section. When you finish, run the Section 8 self-check and report results.

Downstream passes (2 and 3) will reuse Sections 1–5, 7, 8 as their design system; only Section 6 gets replaced with the target page's composition.

---

## 1 · Vision & Intent

The KPI Tracker is a HUD, not a dashboard.

K2 Medical Research Tampa's coordinators and managers open this app fifty times a day. Today it looks like a generic SaaS admin panel — and because it looks generic, it reads as generic, and people stop noticing the numbers. We are rebuilding it to feel like a *command surface*: a calm, dark, luminous interface where the site's health is visible at a glance, where every action has a home, and where the first five seconds communicate *state* before they communicate *data*.

The aesthetic is **Aurora Glass, calibrated**. Deep near-black canvas. A two-color aurora mesh — violet and cyan — diffuses behind everything like backlighting. Content rides on frosted glass panels with thin 1px hairlines. Hero numbers are large, thin, and tabular. Color is used the way a pilot uses it: not for decoration, but to say *this needs you*. Motion is sparing and meaningful — numbers count up once, panels fade in, a hover glows.

Think **Linear's restraint** × **Arc's command palette** × **Vision Pro's depth** × a whisper of **Destiny 2's HUD DNA**. A regulator sees a clinical tool. An investor sees a competent modern product. A coordinator on their fiftieth visit still feels the lights come on.

**What we are NOT building:** a neon cyberpunk skin, a gamified app with XP bars, a playful consumer product, a translucent wash of shadcn defaults in dark mode.

---

## 2 · Design Tokens

All tokens live in `src/index.css` inside the existing `@theme inline` block so they become Tailwind v4 utilities. Every primitive and page composes from this set; no bespoke hex values below this section.

### Canvas (layered darkness)
```css
--color-canvas:          oklch(0.09 0.015 275);
--color-canvas-raised:   oklch(0.13 0.020 275);
--color-canvas-sunken:   oklch(0.07 0.015 275);
```

### Aurora mesh
Fixed positions, no animation in Pass 1. Applied to `body::before`, `pointer-events: none`, `z-index: 0`.
```css
--aurora-violet: radial-gradient(75% 55% at 15% 10%, oklch(0.65 0.20 295 / 0.22), transparent 62%);
--aurora-cyan:   radial-gradient(60% 45% at 85% 15%, oklch(0.75 0.13 220 / 0.16), transparent 62%);
```
Body background = `var(--aurora-violet), var(--aurora-cyan), linear-gradient(180deg, var(--color-canvas) 0%, oklch(0.08 0.018 275) 100%)`.

### Glass treatment — one blessed recipe
```css
.glass {
  background: rgba(255 255 255 / 0.04);
  backdrop-filter: blur(14px) saturate(1.1);
  -webkit-backdrop-filter: blur(14px) saturate(1.1);
  border: 1px solid rgba(255 255 255 / 0.09);
  box-shadow: inset 0 1px 0 rgba(255 255 255 / 0.08),
              0 8px 32px rgba(0 0 0 / 0.35);
  border-radius: var(--radius-lg);
}
.glass-strong {
  background: rgba(255 255 255 / 0.06);
  backdrop-filter: blur(18px) saturate(1.15);
  /* same border + shadow */
}
```

### Accent palette — semantic
```css
--accent-primary: oklch(0.72 0.17 295);   /* violet — brand, active nav, hero ring */
--accent-info:    oklch(0.80 0.12 220);   /* cyan — live indicators, ⌘K chip */
--signal-good:    oklch(0.78 0.15 162);   /* mint — on target / healthy */
--signal-warn:    oklch(0.79 0.16 82);    /* amber — approaching threshold */
--signal-alert:   oklch(0.72 0.17 13);    /* coral — at/over threshold */
```
**Rule:** color carries meaning. Mint means healthy or on-target. Amber means attention. Coral means action required. Never decorative use.

### Text
```css
--text-primary:   oklch(0.97 0 0);
--text-secondary: oklch(0.78 0.02 275);
--text-label:     oklch(0.78 0.10 280);   /* violety label */
--text-muted:     oklch(0.55 0.01 275);
```

### Typography
Already loaded: Geist (variable), Inter, JetBrains Mono. Roles:

| Role | Font | Size | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `display-xl` | Geist | 56 | 300 | -0.03em | Single-number panels (Active Participants hero) |
| `display-l` | Geist | 42 | 200 | -0.02em | Hero tile numbers (Capacity) |
| `display-m` | Geist | 32 | 300 | -0.02em | Hero sentence, secondary tile numbers |
| `heading` | Geist | 18 | 500 | -0.01em | Panel titles |
| `body` | Inter | 14 | 400 | 0 | Default copy |
| `subtitle` | Inter | 13 | 400 | 0 | Tile subs, helper text |
| `label` | Inter | 10.5 | 500 | 0.14em UPPER | Panel labels, tile labels, section markers |
| `mono` | JetBrains Mono | 12.5 | 400 | tnum | Tooltips, percentages in lists, timestamps |

Expose as Tailwind utilities: `text-display-xl`, `text-display-l`, …, `font-mono-tabular`.

### Spacing — 4px base
`1=4 · 2=8 · 3=12 · 4=16 · 5=20 · 6=24 · 8=32 · 12=48 · 16=64`.
Panel padding is always `5` (20px). Tile padding is `4` (16px) with `5` on large screens. Grid gap between tiles/panels is always `3.5` (14px).

### Radii
```css
--radius-sm:  8px;
--radius-md:  12px;
--radius-lg:  14px;    /* panels, tiles */
--radius-xl:  18px;    /* hero tile, command palette */
--radius-2xl: 24px;
--radius-full: 999px;  /* chips, pills */
```

### Motion
```css
--ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
--ease-enter:    cubic-bezier(0.16, 1, 0.3, 1);
--dur-fast:      150ms;   /* hover, focus */
--dur-base:      200ms;   /* page / panel fades */
--dur-count:     400ms;   /* number count-ups, ring/bar fills on mount */
```
Entry animation: `opacity 0→1 + translateY 8px→0, 200ms ease-enter`. Count-ups: easeOutQuart 400ms. **Nothing loops in Pass 1.** All motion respects `prefers-reduced-motion: reduce` by collapsing to instant.

### Glow — sparingly
```css
--glow-primary: 0 0 24px oklch(0.72 0.17 295 / 0.45);
--glow-mint:    0 0 20px oklch(0.78 0.15 162 / 0.45);
--glow-alert:   0 0 18px oklch(0.72 0.17 13  / 0.50);
```
Used only on: active NavItem accent bar, focus outlines, hero tile ring.

---

## 3 · Primitive Components

Eleven primitives. Every page in Pass 1 and every later page composes these — nothing bespoke. Each lives in `src/components/hud/` as a named export with a matching `.test.tsx`.

### `<Tile>` — the workhorse stat tile
```tsx
<Tile
  label="Capacity"
  value={67}
  suffix="%"
  sub="avg across 18 investigators"
  signal="good" | "warn" | "alert" | "neutral"
  trend={{ delta: "+4%", direction: "up" | "down" }}
  variant="default" | "hero"
/>
```
Layout: `label` (top), `value` (display-l, tabular-nums, count-up on mount via `useCountUp` hook), `sub` (subtitle muted), trend chip (absolute top-right). `variant="hero"` applies `.glass-strong` + a thin violet inset ring (`box-shadow: inset 0 0 0 1px oklch(0.72 0.17 295 / 0.35)`). Max one hero per page. `signal` tints only the `value` color and `<TrendChip>` — never the whole tile background.

### `<Panel>` — the glass container for everything that isn't a Tile
```tsx
<Panel title="Investigator Utilization" action={<WeekPicker/>}>
  {children}
</Panel>
```
`.glass`, 20px padding, rounded-lg. Title uses `heading` role but styled with `label` token (uppercase, violety, 10.5px 500 0.14em). Optional right-side action slot. Children get a 12px top margin.

### `<SectionHeader>`
Uppercase `label` color, thin hairline beneath (`border-bottom: 1px solid rgba(255 255 255 / 0.06)`), optional right-side action. Used rarely — only when a page groups multiple panels under a header.

### `<NavRail>` — left sidebar shell
- 240px fixed width, full-height `.glass` panel. Offset 12px from viewport top/bottom/left.
- Slots (top to bottom): `<BrandLockup>`, flexible `<NavGroup>` children, `<UserChip>`.
- Collapses to 64px icon-only below 1280px viewport.

### `<NavItem>`
```tsx
<NavItem icon={<LayoutDashboard/>} to="/overview" label="Overview" count={3} />
```
Rendered as `<NavLink>` from react-router. Active state: 2px glowing violet accent bar on left edge (`box-shadow: inset 2px 0 0 var(--accent-primary), var(--glow-primary)`), `text-primary`, glass-strong fill. Inactive: `text-secondary`, transparent. Hover: fill rises to `rgba(255 255 255 / 0.04)` over 150ms. Optional count pill uses `mono` on `signal-alert` chip when `count > 0`.

### `<NavGroup>`
Renders a `label`-token group header above its children. 12px vertical gap between groups.

### `<BrandLockup>`
28px rounded-md `.glass-strong` chip containing "K2" in Geist 600, flanked by a `signal-good` dot (no pulse). Below, in `label` token: "K2 MEDICAL · TAMPA". Props: `mode: "sidebar" | "inline"` (inline variant is horizontal for TopBar use).

### `<UserChip>`
40px avatar circle (initials over violet→cyan gradient), name in `body`, role in `subtitle muted`. Click opens a `.glass-strong` DropdownMenu (shadcn primitive restyled).

### `<CommandPalette>`
Built on `cmdk`. Trigger chip at top-right of TopBar: pill-shaped, "⌘K Search" in `label` token, `.glass` fill. Modal: centered, `.glass-strong` over 40% canvas backdrop (`rgba(8 7 15 / 0.4)`), 640px × max-70vh, rounded-xl. Input row 48px, `body` placeholder "Search or jump to…", no border below focus (focus outline instead). Sections: *Pages*, *Actions*, *Recent*. Keyboard-first; mouse tolerated.

### `<StatusDot>`
6–10px colored dot, `signal`-tinted. Prop `pulse` is wired but **defaults off** per Pass 1 motion contract.

### `<TrendChip>`
Pill, `.signal`-tinted at 15% bg / 100% text. Number in `mono`. Absolute-positioned top-right of parent Tile by default; also usable inline.

### `<StatRing>`
SVG conic ring, 2px stroke, `signal`-colored. Inner text `display-m` tabular. Animates on mount once (400ms count-up synchronized with stroke-dashoffset transition).

### `<Skeleton>` / `<EmptyState>` / `<ErrorState>`
- `Skeleton` — `.glass` tile/panel shape with an 800ms `ease-in-out` gradient-sweep shimmer. Reduced-motion → static 6% fill.
- `EmptyState` — centered `icon` (lucide, 32px, `text-label`) + `heading` title + `subtitle` body + optional `action` button.
- `ErrorState` — same layout; icon in `signal-alert`; body includes error message + "Retry" action.

### Intentionally NOT new primitives
`Button`, `Input`, `Dialog`, `DropdownMenu`, `Tabs` — we extend the existing shadcn primitives via token overrides and a `hud` variant, not a replacement.

---

## 4 · Chart Theme Contract

Every Recharts chart in the app renders through a single `<HUDChart>` wrapper. Pass 1 replaces defaults everywhere Overview uses them.

### Palette
```ts
export const chartPalette = {
  series: [
    'oklch(0.72 0.17 295)',  // violet
    'oklch(0.80 0.12 220)',  // cyan
    'oklch(0.78 0.15 162)',  // mint
    'oklch(0.79 0.16 82)',   // amber
    'oklch(0.72 0.17 13)',   // coral
  ],
  signalBar: (pct: number) =>
    pct >= 90 ? 'oklch(0.72 0.17 13)'
  : pct >= 75 ? 'oklch(0.79 0.16 82)'
  :             'oklch(0.78 0.15 162)',
  grid:   'rgba(255 255 255 / 0.06)',
  axis:   'oklch(0.55 0.01 275)',
  tooltip:{
    bg:     'oklch(0.13 0.020 275)',
    border: 'rgba(255 255 255 / 0.09)',
    text:   'oklch(0.97 0 0)',
    font:   'JetBrains Mono',
  },
}
```

### Rules
- **Bars** — vertical gradient: solid signal color at top → `signal / 0.15` at bottom. Rounded top `[4, 4, 2, 2]`.
- **Lines** — 2px stroke, no shadow, `connectNulls={false}`. Points only on hover (active dot: 4px solid core + 8px 30%-opacity halo).
- **Areas** — gradient fill `series[n] @ 0.35 → 0.02`, stroke 1.5px full color.
- **Axes** — X tick every data point; Y at 25/50/75/100% only. Tick font `mono` 11px in `axis` color. `axisLine={false} tickLine={false}`.
- **Gridlines** — horizontal only, `strokeDasharray="3 3"`, `grid` color.
- **Tooltip** — custom `<HUDTooltip>`, `.glass-strong`, 12px padding, `mono` values, `label` series names, 1px border, 100ms fade-in.
- **Legend** — chips at bottom when needed: 10px colored square + `subtitle` label, 14px gap.
- **Empty** — render `<EmptyState>` at identical height; never show a blank axis.
- **Loading** — render `<Skeleton>` matching chart height; never render an empty Recharts frame.
- **Reduced motion** — `isAnimationActive={!prefersReducedMotion}` on every Recharts primitive.

### Files
```
src/components/hud/charts/
  HUDChart.tsx          // root wrapper: injects defs + theme
  HUDBarChart.tsx       // wraps BarChart, applies signalBar coloring
  HUDLineChart.tsx
  HUDAreaChart.tsx
  HUDTooltip.tsx
  defs.tsx              // shared <defs> gradients
  palette.ts
```

---

## 5 · Nav Shell & Command Palette Registry

### Management nav (12 items, 5 groups)

| Group | Item | Route | Icon |
|---|---|---|---|
| Command | Overview | `/` | `LayoutDashboard` |
| Operate | Workload Planner | `/workload` | `Gauge` |
| Operate | Enrollment | `/enrollment` | `TrendingUp` |
| Operate | Deviations | `/deviations` | `ShieldAlert` |
| Plan | Forecast | `/forecast` | `LineChart` |
| Plan | What-If | `/what-if` | `Sparkles` |
| Plan | Reports | `/reports` | `FileBarChart` |
| Catalog | Studies | `/studies` | `FolderKanban` |
| Catalog | Investigators | `/investigators` | `Users` |
| Catalog | Financial | `/financial` | `DollarSign` |
| System | Import | `/import` | `Upload` |
| System | Settings | `/settings` | `Settings` |

### Staff nav (4 items, 2 groups)

| Group | Item | Route | Icon |
|---|---|---|---|
| My Site | My Dashboard | `/` | `LayoutDashboard` |
| My Site | My Studies | `/my-studies` | `FolderKanban` |
| Work | Data Entry | `/data-entry` | `Pencil` |
| Work | Profile | `/profile` | `User` |

Icons from `lucide-react`, 18px strokes, `text-secondary` inactive / `text-primary` active.

### Command Palette registry

**Pages** — every nav item, with fuzzy-match keywords:
- Overview: `overview, home, dashboard`
- Workload Planner: `workload, capacity, schedule, heatmap`
- Enrollment: `enrollment, randomization, screen failures`
- Deviations: `deviations, pd, compliance, protocol deviation`
- Forecast: `forecast, capacity forecast, projection`
- What-If: `what if, simulate, scenario`
- Reports: `reports, export, utilization report`
- Studies: `studies, trials, protocols`
- Investigators: `investigators, pi, doctors, staff`
- Financial: `financial, revenue, milestones, contract`
- Import: `import, csv, upload, conductor, advarra`
- Settings: `settings, site, users`

**Actions** (role-gated):

| Action | Keywords | Role |
|---|---|---|
| New Study | new, study, create | management |
| Add Investigator | add, investigator, pi | management |
| Log Visit | log, visit, new visit | both |
| Log Assessment | log, assessment, scale | staff |
| Log Deviation | log, deviation, pd | both |
| Import CSV | import, csv, upload, conductor, advarra | management |
| Invite User | invite, add user | management |
| Go to this week | week, today, current | both |

**Recent** — last 5 visited routes, from `localStorage.k2.recent`, most recent first.

### Keyboard shortcuts

Registered globally via `keyboardShortcuts.ts`; suppressed while a text input is focused.

- `⌘K` / `Ctrl+K` — open palette
- `⌘/` / `Ctrl+/` — show shortcut help (Dialog listing all)
- `Esc` — close palette / dialog
- `g o` Overview · `g w` Workload · `g e` Enrollment · `g s` Studies · `g i` Investigators · `g d` Deviations
- `?` — triggers `⌘/`

### Nav files
```
src/components/hud/nav/
  NavRail.tsx
  NavItem.tsx
  NavGroup.tsx
  BrandLockup.tsx
  UserChip.tsx
  CommandPalette.tsx
  commandRegistry.ts
  keyboardShortcuts.ts
```

---

## 6 · Management Overview — Page Composition

Route `/`, file `src/pages/management/Overview.tsx`. Feature parity with current Overview; only presentation changes. One new surface — the Enrollment tile and the Active Participants panel — both derived from existing data, no new queries.

### Layout grid (desktop ≥1280px)
```
┌──────────┬──────────────────────────────────────────────────┐
│ NavRail  │  TopBar                                          │
│ 240px    │  Hero sentence                                   │
│          │  ┌──────┬──────┬──────┬──────┐                   │
│          │  │ Cap★ │Stdy. │Alert │Enroll│                   │
│          │  └──────┴──────┴──────┴──────┘                   │
│          │  ┌────────────────────────────┬──────────────┐   │
│          │  │ Enrollment Progress (2/3)  │ Active       │   │
│          │  │ per-study bars             │ Participants │   │
│          │  └────────────────────────────┴──────────────┘   │
│          │  ┌───────────────────────────────────────────┐   │
│          │  │ Projected Capacity · Next 4 Weeks         │   │
│          │  └───────────────────────────────────────────┘   │
│          │  ┌────────────────────────────┬──────────────┐   │
│          │  │ Investigator Utilization   │ At or Near   │   │
│          │  │ (bar chart, 2/3)           │ Capacity 1/3 │   │
│          │  └────────────────────────────┴──────────────┘   │
└──────────┴──────────────────────────────────────────────────┘
```
- Content column max-width 1440px, 32px horizontal padding, 24px vertical gaps between rows.
- At 768–1279px: tiles wrap 2×2; 2/3+1/3 rows become single column stacked; NavRail icon-only.

### TopBar (48px)
- Left: `<BrandLockup mode="inline">` — dot + "K2 · Tampa".
- Right: `"Chris · Week 17 · 09:42 EST"`, `subtitle muted`. Time ticks every 60s (not every second — avoid churn).

### Hero sentence
24px below TopBar; 40px below itself (whitespace before the tile row).

- Line 1: `"Good morning, {FirstName}"` — `subtitle` in `text-label` (violety).
- Line 2: dynamic `display-m` status sentence. Pure function:

```ts
export function heroLine(utilizations: number[]): {
  prefix: string
  emphasis: string
  emphasisSignal: 'good' | 'warn' | 'alert' | 'neutral'
  suffix: string
} {
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
```
Render: `<span class="text-secondary">{prefix}</span> <span class="text-primary font-medium underline decoration-[color] decoration-1 underline-offset-4">{emphasis}</span> <span class="text-secondary">{suffix}</span>`. Underline color comes from the signal token.

### Tile row (4 tiles, 14px gap, equal width)

| Pos | Tile |
|---|---|
| 1 | `<Tile variant="hero" label="Capacity" value={siteCapacityPct} suffix="%" sub="avg utilization" signal={siteCapacityPct >= 90 ? 'alert' : siteCapacityPct >= 75 ? 'warn' : 'good'} trend={{ delta: deltaVsLastWeek, direction: delta >= 0 ? 'up' : 'down' }} />` |
| 2 | `<Tile label="Studies" value={activeStudies.length} sub="enrolling or maintenance" signal="neutral" />` |
| 3 | `<Tile label="Alerts" value={alerts.length} sub="capacity warnings" signal={alerts.length > 0 ? 'alert' : 'good'} />` |
| 4 | `<Tile label="Enrollment" value={enrollPct} suffix="%" sub="of YTD target" signal={enrollPct >= 100 ? 'good' : enrollPct >= 80 ? 'neutral' : 'warn'} />` |

- `enrollPct` = `Math.round(100 * sum(study.enrollmentData.randomizations) / sum(study.targetEnrollment))` across studies where `status ∈ {enrolling, maintenance}`.
- Delta trend on Capacity: compare `siteCapacityPct` to last week's value (derived from `capacity` logic applied to last week's visits/assessments).
- If `utilizations.length === 0`, tile 1 renders `"—"` with no signal.

### Enrollment Progress panel (top row, 2/3 column)
`<Panel title="Enrollment Progress" action={<StudyFilterMenu/>}>`
- `<HUDBarChart>` per active study. Two series per study:
  - `target` — glass bar `rgba(255 255 255 / 0.06)`.
  - `enrolled` — violet gradient bar overlaid.
- Height 220px. Study name truncated to 18 chars with ellipsis; full name on hover tooltip.
- `action` slot: `<StudyFilterMenu>` — "All active" (default) / "Enrolling" / "Maintenance".
- Empty state: `<EmptyState icon={<Inbox/>} title="No active studies" body="Create a study to start tracking enrollment." action={<Button>New Study</Button>} />`.

### Active Participants panel (top row, 1/3 column)
`<Panel title="Active Participants">`
- Hero number: `display-xl` (Geist 200, 64px, tabular), `text-primary`, count-up on mount.
  - Value = `sum(study.enrollmentData.randomizations)` for studies with `status ∈ {enrolling, maintenance}`.
- Sub below number: `"across {activeStudies.length} studies"`, `subtitle muted`.
- 12-week sparkline: `<HUDAreaChart>` of weekly cumulative participant count from `enrollmentSnapshots`, 72px tall, no axes, no tooltip. Mint stroke 1.5px, `signal-good → 0.02` gradient fill. Endpoint dot at rightmost point (4px solid + 8px halo) with `mono` label beside it.
- `<TrendChip>` absolute top-right: delta vs. snapshot 4 weeks prior. `+N this month` on `signal-good` if positive, `-N this month` on `signal-alert` if negative, hidden if delta is 0 or fewer than 2 snapshots exist.
- Empty: `<EmptyState icon={<Users/>} title="No participants yet" body="Randomize a participant to see the trend." />`
- Loading: `<Skeleton>` at 220px.

### Projected Capacity panel (full width)
`<Panel title="Projected Capacity · Next 4 Weeks">`
- `<HUDAreaChart>` — stacked series. If ≤ 5 investigators, one series each; else top-5 by projected utilization + "Others" summed series.
- Height 200px. Horizontal reference lines: 75% amber dashed (`strokeDasharray="4 4"`), 90% coral dashed, with right-aligned `mono` labels "75%" / "90%".
- Uses existing `CapacityAlertSummary` computation logic (do not re-derive) — only the visual wrapper changes.
- Empty: `<EmptyState icon={<Calendar/>} title="Not enough scheduled work" body="Schedule visits to see capacity projections." />`

### Investigator Utilization panel (bottom row, 2/3 column)
`<Panel title="Investigator Utilization — This Week" action={<WeekPicker/>}>`
- `<HUDBarChart>` with `signalBar(pct)` coloring per bar. Height 220px.
- Below chart: 3-chip legend row: `● < 75%` (mint) · `● 75–89%` (amber) · `● ≥ 90%` (coral). Chips use `label` token sizing.
- `<WeekPicker>` action: "This week" (default), "Next week", "Last week".
- Empty: `<EmptyState icon={<UserX/>} title="No investigators found" body="Add an investigator on the Investigators page." />`

### Near-Capacity list (bottom row, 1/3 column)
`<Panel title="At or Near Capacity">`
- Filter: `utilizationData.filter(u => u.utilization >= 75).sort(desc)`.
- Each row: investigator name (`body`, `text-secondary`), right-aligned `mono` percentage tinted to signal, hairline divider between rows.
- If empty: `<EmptyState icon={<CheckCircle/>} title="All under capacity" body="No investigators at or near 75% this week." />`

### State treatments (per panel)
- **Loading** — `<Skeleton>` at each panel's exact height; tile skeletons preserve the 4-col grid. Hero sentence becomes a 60%-width skeleton line.
- **Error** — replace the failing panel only (not the whole page) with `<ErrorState>` + retry. The rest of the page stays interactive.
- **Partial data** — if investigators load but visits don't, utilization panel shows `<ErrorState>` while tiles render what they have.

### Entry choreography (one-shot)
1. TopBar + Hero: 0ms
2. Tile row: 80ms, 40ms stagger L→R
3. Enrollment + Active Participants row: 240ms
4. Projected Capacity: intersection-triggered
5. Utilization + Near-Cap row: intersection-triggered
6. Number count-ups inside each tile complete 400ms after that tile lands

Reduced-motion collapses all of the above to instant.

### Performance floor
Overview first paint under 1.5s on cold cache (Firestore latency dominates; design must not add materially). Lazy-load below-fold panels via `react-intersection-observer` — only bind subscriptions once the panel enters the viewport.

---

## 7 · Accessibility Floor

- **Contrast** — `text-primary` on `canvas` ≥ 13:1; `text-secondary` ≥ 7:1; `text-label` ≥ 4.5:1. Signal colors against `.glass` ≥ 4.5:1. Chart tooltip text on `canvas-raised` ≥ 7:1. Verify with axe on every merged PR.
- **Color independence** — capacity signals are never color-only. Tiles gain a leading glyph when `signal="alert"` (`⚠`) or `signal="warn"` (`▲`). Bar chart tooltips include the percent as mono text.
- **Keyboard paths**
  - Tab order: NavRail items → CommandPalette chip → TopBar user menu → Tile row (each tile `role="group"`) → panel actions → chart filter controls.
  - Focus ring: 2px violet outline, 2px offset, plus outer 4px `--glow-primary` shadow. Never suppressed; never `outline: none` without replacement.
  - Shortcut chords (`g o` etc.) register only when `document.activeElement` is not a text input.
- **ARIA**
  - NavItems: `aria-current="page"` when active.
  - Tiles: `aria-label="{label}: {value}{suffix}, {sub}"`.
  - Panels: `<h2>`/`<h3>` titles (not styled divs).
  - Command palette: `cmdk` primitives' built-in ARIA, verified.
- **Reduced motion** — all count-ups, slides, fades, and chart animations disable when `prefers-reduced-motion: reduce`. Charts set `isAnimationActive={false}`. Numbers render at final value instantly.
- **Zoom** — usable at 200% browser zoom; panels reflow 1-column at that effective width.

---

## 8 · Evaluation Criteria (Claude self-checks after building)

Claude must verify each of these and append the results to the PR description under a "Self-check" heading. If any item fails, fix it before marking Pass 1 complete.

- [ ] `npm run test` — all existing tests pass + every new primitive has a Vitest unit test
- [ ] `npx tsc --noEmit` — zero errors; zero `any` without a justifying comment
- [ ] `npm run lint` — clean
- [ ] `npm run build` — successful; bundle size delta under +80KB gzipped vs `main`
- [ ] Visual: Overview at 1440×900 matches the Section 6 layout (hero sentence visible, 4 tiles in one row, Enrollment Progress + Active Participants row, Projected Capacity, Utilization + Near-Cap row). Attach screenshot to PR.
- [ ] Lighthouse desktop: Performance ≥ 85, Accessibility ≥ 95, Best-Practices ≥ 95 on `/`
- [ ] Axe DevTools: zero critical or serious violations on `/`
- [ ] Reduced-motion verified: Chrome DevTools > Rendering > `prefers-reduced-motion: reduce` removes all animations on `/`
- [ ] Keyboard-only traversal: every interactive control on `/` reachable from page load without mouse
- [ ] Command palette: opens on ⌘K, closes on Esc, filters Pages + Actions by keyword, navigates on Enter
- [ ] Hero sentence: unit tests cover 0 / 1 near-cap / 3 near-cap / 1 at-cap / 2 at-cap scenarios
- [ ] Tile `signal` boundaries: unit tests at 74/75/89/90 utilization cover all transitions
- [ ] Count-up lands on exact numeric value (no off-by-one from easing)

---

## 9 · File Manifest & Scope Fence

### New files (Pass 1)
```
src/components/hud/
  tokens.css                       # @theme inline additions + .glass utilities
  useCountUp.ts                    + useCountUp.test.ts
  usePrefersReducedMotion.ts
  Tile.tsx                         + Tile.test.tsx
  Panel.tsx                        + Panel.test.tsx
  SectionHeader.tsx
  StatusDot.tsx                    + StatusDot.test.tsx
  TrendChip.tsx                    + TrendChip.test.tsx
  StatRing.tsx                     + StatRing.test.tsx
  HeroSentence.tsx                 + HeroSentence.test.tsx
  Skeleton.tsx                     # API-compatible with shadcn/ui Skeleton
  EmptyState.tsx                   + EmptyState.test.tsx
  ErrorState.tsx                   + ErrorState.test.tsx
  nav/
    NavRail.tsx                    + NavRail.test.tsx
    NavItem.tsx
    NavGroup.tsx
    BrandLockup.tsx
    UserChip.tsx
    CommandPalette.tsx             + CommandPalette.test.tsx
    commandRegistry.ts             + commandRegistry.test.ts
    keyboardShortcuts.ts           + keyboardShortcuts.test.ts
  charts/
    HUDChart.tsx
    HUDBarChart.tsx                + HUDBarChart.test.tsx
    HUDLineChart.tsx
    HUDAreaChart.tsx
    HUDTooltip.tsx
    defs.tsx
    palette.ts                     + palette.test.ts
  panels/
    ActiveParticipantsPanel.tsx    + ActiveParticipantsPanel.test.tsx
    NearCapacityList.tsx           + NearCapacityList.test.tsx
```

### Modified files
```
src/index.css                      # @theme tokens, body aurora background, .glass utilities
src/App.tsx                        # swap layout chrome for <NavRail> + <Outlet/> shell
src/pages/management/Overview.tsx  # complete rewrite using primitives
src/pages/management/__tests__/Overview.test.tsx  # extend existing suite
package.json                       # +cmdk, +lucide-react (verify not present first)
```

### Untouched in Pass 1 (scope fence)
- `src/lib/**` — data layer stays identical. No new queries, no new hooks beyond motion utilities.
- `src/hooks/**` — untouched. Subscriptions, data shapes stay stable.
- `src/stores/**` — untouched.
- Firestore rules, indexes, security — untouched.
- Auth flows, route definitions beyond the layout shell — untouched.
- Any page other than `src/pages/management/Overview.tsx` — untouched. Other pages will look broken against the new NavRail for one commit cycle; that is fine and expected.
- Existing test files other than Overview's — untouched.

### Dependencies to add
- `cmdk` — command palette primitive. Already compatible with shadcn/ui.
- `lucide-react` — icons. Check `package.json` first; install only if missing.
- `react-intersection-observer` — below-fold lazy mount. Check first; install only if missing.

### Commit hygiene
- One commit per primitive (`hud: add <Tile>`), one for tokens (`hud: add design tokens`), one for charts, one for nav, one for the Overview rewrite.
- Conventional commit prefix: `hud:` for all Pass 1 commits.
- Do not squash at merge — history is useful for Passes 2 and 3.

---

## Downstream (not in Pass 1 — here for context only)

**Pass 2:** Apply the system to three more pages in separate sessions:
- `src/pages/staff/MyDashboard.tsx` (staff front door)
- `src/pages/management/WorkloadPlanner.tsx` (most-used analytical page)
- `src/pages/management/StudyDetail.tsx` (most-visited record page)

Each Pass 2 prompt loads Sections 1–5 and 7–9 verbatim, plus the target page's current source, plus a short per-page composition section modeled after Section 6.

**Pass 3:** Skin the remaining 11 pages using a shorter "skinning prompt" template. Can be parallelized across sessions.

---

## Success definition

Pass 1 succeeds when:
1. All Section 8 checks pass.
2. A coordinator opening `/` sees capacity state within 2 seconds of page ready — without scrolling, without reading.
3. A new hire can find any destination in the app via ⌘K within 10 seconds of being told the feature exists.
4. A compliance reviewer's first written impression is "professional clinical tool," not "gamified app."
5. You look at the screen and think *that's mine*.
