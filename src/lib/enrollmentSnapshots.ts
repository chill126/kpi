import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'
import type { EnrollmentSnapshot } from '@/types'

function toSnapshot(id: string, data: Record<string, unknown>): EnrollmentSnapshot {
  return { id, ...data } as EnrollmentSnapshot
}

export function subscribeEnrollmentSnapshots(
  studyId: string,
  siteId: string,
  onData: (snapshots: EnrollmentSnapshot[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'enrollmentSnapshots'),
    where('siteId', '==', siteId),
    where('studyId', '==', studyId),
    orderBy('date', 'asc'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toSnapshot(d.id, d.data()))),
    onError,
  )
}

export async function createEnrollmentSnapshot(
  data: Omit<EnrollmentSnapshot, 'id'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'enrollmentSnapshots'), data)
  return ref.id
}

export async function bulkCreateEnrollmentSnapshots(
  items: Omit<EnrollmentSnapshot, 'id'>[],
): Promise<void> {
  await Promise.all(items.map((item) => addDoc(collection(db, 'enrollmentSnapshots'), item)))
}
