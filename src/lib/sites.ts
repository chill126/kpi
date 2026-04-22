import { addDoc, collection, doc, getDoc, onSnapshot, query, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { Site } from '@/types'

function toSite(id: string, data: Record<string, unknown>): Site {
  return { id, ...data } as Site
}

export async function getSite(siteId: string): Promise<Site | null> {
  const snap = await getDoc(doc(db, 'sites', siteId))
  if (!snap.exists()) return null
  return toSite(snap.id, snap.data())
}

export async function updateSite(
  siteId: string,
  updates: Partial<Omit<Site, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'sites', siteId), updates as Record<string, unknown>)
}

export function subscribeSite(
  siteId: string,
  onData: (site: Site | null) => void,
  onError: (err: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, 'sites', siteId),
    (snap) => onData(snap.exists() ? toSite(snap.id, snap.data()) : null),
    onError,
  )
}

export async function createSite(data: Omit<Site, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'sites'), data)
  return ref.id
}

export function subscribeAllSites(
  onData: (sites: Site[]) => void,
  onError: (err: Error) => void,
): () => void {
  return onSnapshot(
    query(collection(db, 'sites')),
    (snap) => onData(snap.docs.map((d) => toSite(d.id, d.data()))),
    onError,
  )
}
