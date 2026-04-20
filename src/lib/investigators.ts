import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'
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
