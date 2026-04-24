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
    }).catch((e: unknown) => console.error('[monitoring] errorLog write failed', e))
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
