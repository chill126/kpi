import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Import } from '@/types'

function toImport(id: string, data: Record<string, unknown>): Import {
  return { id, ...data } as Import
}

export function subscribeImports(
  siteId: string,
  onData: (imports: Import[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'imports'),
    where('siteId', '==', siteId),
    orderBy('uploadedAt', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toImport(d.id, d.data()))),
    onError,
  )
}

export async function createImportRecord(
  data: Omit<Import, 'id'> & { siteId: string },
): Promise<string> {
  const ref = await addDoc(collection(db, 'imports'), data)
  return ref.id
}
