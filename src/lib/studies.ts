import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  arrayUnion,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Study, StudyStatus, StudyStatusHistoryEntry, EnrollmentData } from '@/types'

function toStudy(id: string, data: Record<string, unknown>): Study {
  return { id, ...data } as Study
}

export function subscribeStudies(
  siteId: string,
  onData: (studies: Study[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'studies'),
    where('siteId', '==', siteId),
    orderBy('name'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toStudy(d.id, d.data()))),
    onError,
  )
}

export function subscribeStudy(
  studyId: string,
  onData: (study: Study | null) => void,
  onError: (err: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, 'studies', studyId),
    (snap) => onData(snap.exists() ? toStudy(snap.id, snap.data()) : null),
    onError,
  )
}

export function subscribeAllStudies(
  onData: (studies: Study[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(collection(db, 'studies'), orderBy('name'))
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toStudy(d.id, d.data()))),
    (err) => onError(err),
  )
}

export async function createStudy(data: Omit<Study, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'studies'), {
    ...data,
    enrollmentData: data.enrollmentData ?? {
      prescreens: 0,
      screens: 0,
      randomizations: 0,
      active: 0,
      completions: 0,
    },
    statusHistory: data.statusHistory ?? [],
  })
  return ref.id
}

export async function updateStudy(
  studyId: string,
  updates: Partial<Omit<Study, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'studies', studyId), updates as Record<string, unknown>)
}

export async function updateStudyStatus(
  studyId: string,
  status: StudyStatus,
  changedBy: string,
  note?: string,
): Promise<void> {
  const entry: StudyStatusHistoryEntry = {
    status,
    changedBy,
    changedAt: new Date().toISOString(),
    ...(note ? { note } : {}),
  }
  await updateDoc(doc(db, 'studies', studyId), {
    status,
    statusHistory: arrayUnion(entry),
  })
}

export async function cloneStudy(study: Study, newName: string): Promise<string> {
  const { id: _id, ...data } = study
  const ref = await addDoc(collection(db, 'studies'), {
    ...data,
    name: newName,
    status: 'on_hold' as StudyStatus,
    enrollmentData: { prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0 },
    statusHistory: [],
    parsedFromProtocol: false,
    startDate: '',
    expectedEndDate: '',
  })
  return ref.id
}

export async function updateEnrollmentData(
  studyId: string,
  data: EnrollmentData,
): Promise<void> {
  await updateDoc(doc(db, 'studies', studyId), { enrollmentData: data })
}
