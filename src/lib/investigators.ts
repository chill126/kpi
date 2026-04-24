import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, auth } from './firebase'
import { writeAuditLog } from './monitoring'
import type { Investigator } from '@/types'

function toInvestigator(id: string, data: Record<string, unknown>): Investigator {
  return { id, ...data } as Investigator
}

export function subscribeInvestigators(
  siteId: string,
  onData: (investigators: Investigator[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'investigators'),
    where('siteId', '==', siteId),
    orderBy('name'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toInvestigator(d.id, d.data()))),
    onError,
  )
}

export async function createInvestigator(
  data: Omit<Investigator, 'id'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'investigators'), data)
  const user = auth.currentUser
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'investigator.create', {
      targetCollection: 'investigators',
      targetId: ref.id,
    }).catch(console.error)
  }
  return ref.id
}

export async function updateInvestigator(
  id: string,
  updates: Partial<Omit<Investigator, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'investigators', id), updates as Record<string, unknown>)
  const user = auth.currentUser
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'investigator.update', {
      targetCollection: 'investigators',
      targetId: id,
    }).catch(console.error)
  }
}

export async function deleteInvestigator(id: string): Promise<void> {
  await deleteDoc(doc(db, 'investigators', id))
  const user = auth.currentUser
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'investigator.delete', {
      targetCollection: 'investigators',
      targetId: id,
    }).catch(console.error)
  }
}
