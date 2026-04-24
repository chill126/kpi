# Observability — Track B Design

## Goal

Add dual-layer error monitoring (Sentry + Firestore fallback) and a structured audit log for auth events and management data mutations.

## Architecture

A thin `src/lib/monitoring.ts` module is the single integration point for all error capture. It wraps Sentry and conditionally writes critical events to Firestore `errorLog`. Audit logging is written directly from existing lib functions (`auth.ts`, `studies.ts`, `investigators.ts`, `users.ts`, `sites.ts`). No UI is added in this track — management can query via Firebase Console.

## Tech Stack

`@sentry/react`, `@sentry/vite-plugin`, Firebase Firestore, Vitest

---

## Section 1 — Sentry Error Monitoring

### Installation

```bash
npm install @sentry/react
npm install --save-dev @sentry/vite-plugin
```

### Environment variables

Add to `.env.local`:
```
VITE_SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<project>
```

Add to CI/build environment (not `.env.local`):
```
SENTRY_AUTH_TOKEN=<token>
```

`SENTRY_AUTH_TOKEN` is used only at build time to upload source maps. It must never be committed.

### `src/main.tsx` — Sentry.init()

Initialize before `ReactDOM.createRoot`:

```typescript
import * as Sentry from '@sentry/react'

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  })
}
```

Notes:
- `tracesSampleRate: 0` disables performance tracing (keeps free tier usage minimal — only errors count against quota).
- Replays disabled (Sentry Replay is a paid feature).
- Guard on `VITE_SENTRY_DSN` means local dev without a DSN configured silently skips Sentry — no errors thrown.

### `vite.config.ts` — source map upload

Add `sentryVitePlugin` to the plugins array:

```typescript
import { sentryVitePlugin } from '@sentry/vite-plugin'

// Inside defineConfig:
plugins: [
  react(),
  ...(process.env.SENTRY_AUTH_TOKEN
    ? [sentryVitePlugin({ authToken: process.env.SENTRY_AUTH_TOKEN, org: '<org>', project: '<project>' })]
    : []),
],
build: {
  sourcemap: true,  // required for source map upload
  // existing rollupOptions...
}
```

The plugin is conditionally included so local builds without `SENTRY_AUTH_TOKEN` still succeed (they just won't upload source maps).

---

## Section 2 — `src/lib/monitoring.ts`

Single module that wraps Sentry and Firestore error logging. All other files import from here.

```typescript
import * as Sentry from '@sentry/react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export type ErrorCategory = 'auth' | 'firestore' | 'render'

export function captureError(
  err: unknown,
  options: { category: ErrorCategory; critical?: boolean; context?: Record<string, unknown> } = { category: 'firestore' },
): void {
  // Always report to Sentry
  Sentry.captureException(err, { extra: options.context })

  // Write to Firestore errorLog for critical events (fallback beyond Sentry quota)
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
```

### Call sites

| Location | Event | `critical` |
|---|---|---|
| `src/hooks/useFirestoreSubscription.ts` — `onError` handler | Firestore circuit breaker trip | `true` |
| `src/lib/auth.ts` — `signIn` catch | Auth failure (wrong password, network error) | `true` |
| `src/components/shared/ChunkErrorBoundary.tsx` — `componentDidCatch` | Chunk load failure | `false` |

---

## Section 3 — Firestore `errorLog` Collection

**Schema:**

```
errorLog/{docId}
  level: 'critical'
  category: 'auth' | 'firestore' | 'render'
  message: string
  context: map
  timestamp: timestamp
```

**Firestore rule** (add to `firestore.rules`):

```
match /errorLog/{docId} {
  allow read: if isManagement();
  allow create: if isAuthenticated();
}
```

No `uid` field on the document — `errorLog` may be written before full auth resolves (e.g., a failed sign-in). Keeping it anonymous is intentional.

---

## Section 4 — Firestore `auditLog` Collection

**Schema:**

```
auditLog/{docId}
  uid: string | null   // auth user's uid; null for failed sign-in attempts
  email: string        // auth user's email
  action: string       // e.g. 'auth.sign_in', 'study.create', 'investigator.update'
  targetCollection: string | null   // e.g. 'studies', null for auth events
  targetId: string | null           // Firestore doc ID, null for auth events
  timestamp: timestamp
  meta: map            // optional context (e.g. { studyName } for create, { field, from, to } for update)
```

**Action taxonomy:**

| Action | Trigger |
|---|---|
| `auth.sign_in` | Successful `signInWithEmailAndPassword` |
| `auth.sign_out` | `signOut` |
| `auth.sign_in_failed` | `signInWithEmailAndPassword` catch |
| `study.create` | `createStudy` |
| `study.update` | `updateStudy` |
| `study.delete` | `deleteStudy` |
| `investigator.create` | `createInvestigator` |
| `investigator.update` | `updateInvestigator` |
| `investigator.delete` | `deleteInvestigator` |
| `user.update` | `updateUser` (role/siteId changes) |
| `site.create` | `createSite` |
| `site.update` | `updateSite` |

**Shared helper** in `src/lib/monitoring.ts`:

```typescript
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

**Firestore rule** (add to `firestore.rules`):

```
match /auditLog/{docId} {
  allow read: if isManagement();
  allow create: if isAuthenticated();
}
```

### Write points

**`src/lib/auth.ts`:**

```typescript
// After successful signIn:
writeAuditLog(user.uid, user.email ?? '', 'auth.sign_in').catch(console.error)

// In signIn catch:
captureError(err, { category: 'auth', critical: true, context: { email } })
writeAuditLog(null, email, 'auth.sign_in_failed', { meta: { error: String(err) } }).catch(console.error)

// In signOut:
writeAuditLog(uid, email, 'auth.sign_out').catch(console.error)
```

**`src/lib/studies.ts`, `investigators.ts`, `users.ts`, `sites.ts`:** Each mutating function adds a `writeAuditLog(...).catch(console.error)` call after the Firestore write completes, using the calling user's uid/email passed as parameters.

---

## Section 5 — Testing

- `src/lib/__tests__/monitoring.test.ts` — unit tests for `captureError` and `writeAuditLog` (mock Sentry and Firestore `addDoc`)
- Existing tests for auth, studies, investigators, users, sites are NOT changed — monitoring calls are fire-and-forget (`void`) and don't affect function return values
- No integration tests against real Sentry or Firestore in this track

---

## Out of Scope

- Audit log viewer UI (deferred — query via Firebase Console for now)
- Sentry performance tracing (tracesSampleRate: 0)
- Sentry Session Replay (paid feature)
- Firestore errorLog retention policy (requires Cloud Functions or manual cleanup)
- GDPR data redaction in audit log (deferred)
