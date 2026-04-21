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
import type { ProtocolDeviation } from '@/types'

function toDeviation(id: string, data: Record<string, unknown>): ProtocolDeviation {
  return { id, ...data } as ProtocolDeviation
}

export function subscribeProtocolDeviations(
  studyId: string,
  siteId: string,
  onData: (deviations: ProtocolDeviation[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'protocolDeviations'),
    where('siteId', '==', siteId),
    where('studyId', '==', studyId),
    orderBy('date', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toDeviation(d.id, d.data()))),
    onError,
  )
}

export function subscribeAllProtocolDeviations(
  siteId: string,
  onData: (deviations: ProtocolDeviation[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'protocolDeviations'),
    where('siteId', '==', siteId),
    orderBy('date', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toDeviation(d.id, d.data()))),
    onError,
  )
}

export async function createProtocolDeviation(
  data: Omit<ProtocolDeviation, 'id'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'protocolDeviations'), data)
  return ref.id
}

export async function updateProtocolDeviation(
  id: string,
  updates: Partial<Omit<ProtocolDeviation, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'protocolDeviations', id), updates as Record<string, unknown>)
}

export async function deleteProtocolDeviation(id: string): Promise<void> {
  await deleteDoc(doc(db, 'protocolDeviations', id))
}
