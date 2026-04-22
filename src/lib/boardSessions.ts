import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'
import type { BoardSession } from '@/types'

function toBoardSession(id: string, data: Record<string, unknown>): BoardSession {
  return { id, ...data } as BoardSession
}

export function subscribeBoardSessions(
  siteId: string,
  onData: (sessions: BoardSession[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'boardSessions'),
    where('siteId', '==', siteId),
    orderBy('sessionDate', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toBoardSession(d.id, d.data()))),
    onError,
  )
}

export async function createBoardSession(data: Omit<BoardSession, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'boardSessions'), data)
  return ref.id
}
