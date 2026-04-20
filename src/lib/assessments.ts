import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Assessment } from '@/types'

function toAssessment(id: string, data: Record<string, unknown>): Assessment {
  return { id, ...data } as Assessment
}

export function subscribeStudyAssessments(
  siteId: string,
  studyId: string,
  onData: (assessments: Assessment[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'assessments'),
    where('siteId', '==', siteId),
    where('studyId', '==', studyId),
    orderBy('date', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toAssessment(d.id, d.data()))),
    onError,
  )
}

export async function createAssessment(data: Omit<Assessment, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'assessments'), data)
  return ref.id
}

export function subscribeSiteAssessments(
  siteId: string,
  onData: (assessments: Assessment[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'assessments'),
    where('siteId', '==', siteId),
    orderBy('date', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toAssessment(d.id, d.data()))),
    onError,
  )
}
