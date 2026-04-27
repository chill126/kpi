# KPI Tracker — Roadmap

## Versioning

| Version | Status | Description |
|---------|--------|-------------|
| 0.9.x   | Current | All Tier 1–3 shipped, polish pass in progress |
| 1.0.0   | Target | Polish pass complete, stable, deployed to production |
| 2.0.0   | Planned | Supabase migration, enterprise network management, expanded roles |

---

## v1.0 — Remaining Work

### Tier 1 (quick wins) — COMPLETE
- [x] Settings gear icon in NavRail footer (management only)
- [x] WorkloadPlanner: 10 months back + 2 months ahead
- [x] Custom HUD-styled dropdowns (HUDSelect replaces native `<select>` everywhere)
- [x] Overview enrollment tile: show screens / rands / active / completions breakdown

### Tier 2 (UI rebuild) — COMPLETE
- [x] Study list + StudyDetail drill-down pages → full HUD glass reskin
- [x] Staff page → show delegation log roles per study
- [x] Reports: Site Summary collapsible by status, Investigator report cards, Visit Quality date range

### Tier 3 (new features) — COMPLETE
- [x] Import: Delegation of Authority log (Advarra e-Reg dialog)
- [x] Import: Enrollment numbers spreadsheet update
- [x] Financial: per-study expand/collapse drill-down, milestone progress bars
- [x] Assessment battery: timing field per scale with visit totals
- [x] Forecast rework: stacked bar by investigator, site aggregate tiles, alert suggestions
- [x] What-If rework: scenario comparison table, revenue-vs-capacity scatter, sensitivity bands
- [x] StudyDetail: Protocol tab with parsed status + visit schedule summary
- [x] Electric blue accent theme across all HUD tokens

### Polish / v1.0 gate
- [ ] Bump version to 1.0.0 and tag release once polish is signed off

---

## v2.0 — Planned Architecture

### Backend: Firebase → Supabase
- Migrate Firestore collections to PostgreSQL (Supabase)
- Leverage SQL for cross-collection reporting and analytics
- Row-level security for multi-site data isolation
- Supabase Storage for protocol PDFs and contract documents (replaces Firebase Storage)
- Real-time subscriptions via Supabase Realtime (replaces Firestore onSnapshot)
- Auth migration: Firebase Auth → Supabase Auth

### Site Network Management (expanded)
- Multi-site admin dashboard with enterprise-level network metrics
- Cross-site enrollment comparisons and benchmarking
- Site performance scoring (visit quality, deviation rate, enrollment velocity)
- Network-level capacity planning across all sites

### Expanded User Roles
- Current: `management` | `staff`
- v2 roles: `network-admin` | `site-admin` | `coordinator` | `investigator` | `sponsor-view`
- Network admin: read-only access across all sites in the network
- Sponsor view: limited read-only portal for external sponsor access
- Per-role dashboard customization and feature gating

### Enterprise Features
- Audit trail for all data mutations
- Data export to PDF/Excel for regulatory submissions
- Automated enrollment milestone alerts (email / in-app)
- IRB/expiration date tracking with renewal reminders
- Sponsor-facing enrollment reports

### AI Enhancements
- Protocol deviation auto-classification from narrative text
- Enrollment trajectory predictions using historical site data
- Capacity optimization suggestions based on visit schedule density
