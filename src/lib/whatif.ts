import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { HypotheticalStudy, SimulationResult, WhatIfScenario } from '@/types'

export function subscribeWhatIfScenarios(
  siteId: string,
  onData: (scenarios: WhatIfScenario[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, 'whatIfScenarios', siteId, 'scenarios'),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WhatIfScenario))),
    onError,
  )
}

export async function saveWhatIfScenario(
  siteId: string,
  study: HypotheticalStudy,
  result: SimulationResult,
): Promise<string> {
  const ref = await addDoc(collection(db, 'whatIfScenarios', siteId, 'scenarios'), {
    siteId,
    createdAt: serverTimestamp(),
    study,
    result,
  })
  return ref.id
}

export async function deleteWhatIfScenario(siteId: string, scenarioId: string): Promise<void> {
  await deleteDoc(doc(db, 'whatIfScenarios', siteId, 'scenarios', scenarioId))
}
