import {
  collection,
  doc,
  addDoc,
  writeBatch,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Visit } from '@/types'

function toVisit(id: string, data: Record<string, unknown>): Visit {
  return { id, ...data } as Visit
}

export function subscribeStudyVisits(
  siteId: string,
  studyId: string,
  onData: (visits: Visit[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'visits'),
    where('siteId', '==', siteId),
    where('studyId', '==', studyId),
    orderBy('scheduledDate', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toVisit(d.id, d.data()))),
    onError,
  )
}

export function subscribeInvestigatorVisits(
  siteId: string,
  investigatorId: string,
  onData: (visits: Visit[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'visits'),
    where('siteId', '==', siteId),
    where('investigatorId', '==', investigatorId),
    orderBy('scheduledDate', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toVisit(d.id, d.data()))),
    onError,
  )
}

export async function createVisit(data: Omit<Visit, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'visits'), data)
  return ref.id
}

export async function createVisitBatch(visits: Omit<Visit, 'id'>[]): Promise<void> {
  const batch = writeBatch(db)
  visits.forEach((v) => {
    const ref = doc(collection(db, 'visits'))
    batch.set(ref, v)
  })
  await batch.commit()
}
