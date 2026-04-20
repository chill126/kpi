import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { HypotheticalStudy, SimulationResult } from '@/types'

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
