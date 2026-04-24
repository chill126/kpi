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
import { db, auth } from './firebase'
import { writeAuditLog } from './monitoring'
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
    onError,
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
  const user = auth.currentUser
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'study.create', {
      targetCollection: 'studies',
      targetId: ref.id,
      meta: { studyName: data.name },
    }).catch(console.error)
  }
  return ref.id
}

export async function updateStudy(
  studyId: string,
  updates: Partial<Omit<Study, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'studies', studyId), updates as Record<string, unknown>)
  const user = auth.currentUser
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'study.update', {
      targetCollection: 'studies',
      targetId: studyId,
    }).catch(console.error)
  }
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
  const user = auth.currentUser
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'study.status_change', {
      targetCollection: 'studies',
      targetId: studyId,
      meta: { status, ...(note ? { note } : {}) },
    }).catch(console.error)
  }
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
  const user = auth.currentUser
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'study.create', {
      targetCollection: 'studies',
      targetId: ref.id,
      meta: { studyName: newName, clonedFrom: study.id },
    }).catch(console.error)
  }
  return ref.id
}

export async function updateEnrollmentData(
  studyId: string,
  data: EnrollmentData,
): Promise<void> {
  await updateDoc(doc(db, 'studies', studyId), { enrollmentData: data })
  const user = auth.currentUser
  if (user) {
    writeAuditLog(user.uid, user.email ?? '', 'study.update', {
      targetCollection: 'studies',
      targetId: studyId,
    }).catch(console.error)
  }
}
