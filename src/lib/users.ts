import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, auth } from './firebase'
import { writeAuditLog } from './monitoring'
import type { AppUser } from '@/types'

function toAppUser(uid: string, data: Record<string, unknown>): AppUser {
  return { uid, ...data } as AppUser
}

export function subscribeUsers(
  siteId: string,
  onData: (users: AppUser[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(collection(db, 'users'), where('siteId', '==', siteId))
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toAppUser(d.id, d.data()))),
    onError,
  )
}

export function subscribeUser(
  uid: string,
  onData: (user: AppUser | null) => void,
  onError: (err: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => onData(snap.exists() ? toAppUser(snap.id, snap.data()) : null),
    onError,
  )
}

export async function updateUser(
  uid: string,
  updates: Partial<Omit<AppUser, 'uid'>>,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), updates as Record<string, unknown>)
  const user = auth.currentUser
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'user.update', {
      targetCollection: 'users',
      targetId: uid,
    }).catch(console.error)
  }
}
