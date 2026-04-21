import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'
import type { ScreenFailure } from '@/types'

function toScreenFailure(id: string, data: Record<string, unknown>): ScreenFailure {
  return { id, ...data } as ScreenFailure
}

export function subscribeScreenFailures(
  studyId: string,
  siteId: string,
  onData: (failures: ScreenFailure[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'screenFailures'),
    where('siteId', '==', siteId),
    where('studyId', '==', studyId),
    orderBy('date', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toScreenFailure(d.id, d.data()))),
    onError,
  )
}

export function subscribeAllScreenFailures(
  siteId: string,
  onData: (failures: ScreenFailure[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'screenFailures'),
    where('siteId', '==', siteId),
    orderBy('date', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toScreenFailure(d.id, d.data()))),
    onError,
  )
}

export async function createScreenFailure(data: Omit<ScreenFailure, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'screenFailures'), data)
  return ref.id
}

export async function updateScreenFailure(
  id: string,
  updates: Partial<Omit<ScreenFailure, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'screenFailures', id), updates as Record<string, unknown>)
}

export async function deleteScreenFailure(id: string): Promise<void> {
  await deleteDoc(doc(db, 'screenFailures', id))
}
