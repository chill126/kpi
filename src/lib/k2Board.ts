import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { k2BoardDb, ensureK2BoardAuth } from './k2BoardApp'

// Mirrors k2-board's COLLECTION_PATH_BASE + COLLECTION_ENTRIES
// Path: artifacts/{projectId}/public/data/k2_participants
// Alternates col/doc/col/doc/col — valid Firestore subcollection path
const K2_COLLECTION = 'k2_participants'
const K2_PATH = ['artifacts', 'k2-board', 'public', 'data'] as const

// Hard cap: a clinic day rarely has >300 participants; caps max Firestore reads
const MAX_ENTRIES_PER_DAY = 300

// Conservative rate limit for a cross-project subscription
export const K2_LIVE_RATE_LIMIT = 10

export type K2BoardStatus =
  | 'scheduled'
  | 'checked_in'
  | 'with_coordinator'
  | 'in_ratings'
  | 'in_procedures'
  | 'ip_dosing'
  | 'observation'
  | 'discharge_ready'
  | 'left'
  | 'ooo_appts'
  | 'no_show'

export interface K2BoardEntry {
  id: string
  subjectId: string
  crioId?: string
  study: string
  status: K2BoardStatus
  investigatorIds: string[]
  owner?: string
  urgency: 'normal' | 'soon' | 'waiting'
  roomId?: string
  // All time fields are 'HH:MM' strings — no date component.
  // Use createdAt (Firestore Timestamp) to determine which calendar day this entry belongs to.
  scheduledTime?: string
  arrivalTime?: string
  takenBackTime?: string
  dischargeReadyTime?: string
  leftTime?: string
  phoneCallStartTime?: string
  vitalsStartTime?: string
  labsStartTime?: string
  pharmacyStartTime?: string
  ekgStartTime?: string
  raterStartTime?: string
  coordinatorStartTime?: string
  waitingOnInvestigator?: boolean
  waitingOnCoordinator?: boolean
  waitingOnVitals?: boolean
  waitingOnLabs?: boolean
  waitingOnPharmacy?: boolean
  waitingOnEKG?: boolean
  waitingOnRater?: boolean
  didNotQualify?: boolean
  createdAt: Timestamp
  createdBy: string
  updatedBy?: string
}

/**
 * Maps k2-board's hardcoded investigator IDs to display names.
 * These names are matched against kpi-tracker Investigator.boardName to cross-reference records.
 */
export const K2_INVESTIGATOR_NAMES: Record<string, string> = {
  inv_wilson: 'Wilson',
  inv_wick: 'Wick',
  inv_hill: 'Hill',
  inv_delgado: 'Delgado',
  inv_patel: 'Patel',
}

/**
 * Derives visit duration in minutes from two 'HH:MM' strings.
 * Returns null if either value is absent or the result is non-positive.
 */
export function computeVisitDurationMin(
  arrivalTime?: string,
  leftTime?: string,
): number | null {
  if (!arrivalTime || !leftTime) return null
  const [ah, am] = arrivalTime.split(':').map(Number)
  const [lh, lm] = leftTime.split(':').map(Number)
  const mins = lh * 60 + lm - (ah * 60 + am)
  return mins > 0 ? mins : null
}

/**
 * Reconstructs a full Date from a Firestore Timestamp (for the date) and an 'HH:MM' string
 * (for the time). Required because k2-board stores times without dates.
 */
export function reconstructDateTime(date: Timestamp, timeStr: string): Date {
  const base = date.toDate()
  const [h, m] = timeStr.split(':').map(Number)
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0)
}

/**
 * Subscribe to today's k2-board participant entries.
 *
 * Guardrails baked in:
 * - Date-scoped query (createdAt >= start of today) — only reads today's documents
 * - Hard limit of MAX_ENTRIES_PER_DAY (300) — caps Firestore reads per snapshot
 * - Async anonymous auth resolved before listener is registered
 * - cancelled flag prevents callbacks firing after cleanup
 *
 * Pair with useFirestoreSubscription (which adds the circuit breaker) rather than
 * calling onSnapshot directly.
 */
export function subscribeK2BoardToday(
  onData: (entries: K2BoardEntry[]) => void,
  onError: (err: Error) => void,
): () => void {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const q = query(
    collection(k2BoardDb, K2_PATH[0], K2_PATH[1], K2_PATH[2], K2_PATH[3], K2_COLLECTION),
    where('createdAt', '>=', Timestamp.fromDate(startOfToday)),
    orderBy('createdAt', 'asc'),
    limit(MAX_ENTRIES_PER_DAY),
  )

  let cancelled = false
  let unsubFn: (() => void) | null = null

  ensureK2BoardAuth()
    .then(() => {
      if (cancelled) return
      unsubFn = onSnapshot(
        q,
        (snap) => {
          if (cancelled) return
          onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as K2BoardEntry)))
        },
        (err) => {
          if (!cancelled) onError(err)
        },
      )
    })
    .catch((err: unknown) => {
      if (!cancelled)
        onError(err instanceof Error ? err : new Error(`k2-board auth failed: ${String(err)}`))
    })

  return () => {
    cancelled = true
    if (unsubFn) unsubFn()
  }
}
