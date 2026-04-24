import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'
import type { DelegationLog } from '@/types'

function toDelegationLog(id: string, data: Record<string, unknown>): DelegationLog {
  return { id, ...data } as DelegationLog
}

export function subscribeDelegationLog(
  studyId: string,
  onData: (entries: DelegationLog[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'delegationLog'),
    where('studyId', '==', studyId),
    orderBy('effectiveDate', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toDelegationLog(d.id, d.data()))),
    onError,
  )
}

export function subscribeSiteDelegationLogs(
  siteId: string,
  onData: (entries: DelegationLog[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'delegationLog'),
    where('siteId', '==', siteId),
    orderBy('effectiveDate', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toDelegationLog(d.id, d.data()))),
    onError,
  )
}

export async function createDelegationEntry(
  data: Omit<DelegationLog, 'id'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'delegationLog'), data)
  return ref.id
}

export async function updateDelegationEntry(
  entryId: string,
  updates: Partial<Omit<DelegationLog, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'delegationLog', entryId), updates as Record<string, unknown>)
}

export async function deleteDelegationEntry(entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'delegationLog', entryId))
}
