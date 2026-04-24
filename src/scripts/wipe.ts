/**
 * Wipe script: deletes all fake/seed data from Firestore.
 * Preserves: sites, users (real accounts).
 * Deletes: studies, investigators, visits, assessments, screenFailures,
 *          protocolDeviations, enrollmentSnapshots, whatIfScenarios,
 *          imports, delegationLog, capacityConfig
 *
 * Run with: npx tsx src/scripts/wipe.ts
 */
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { config } from 'dotenv'

config({ path: '.env.local' })

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const COLLECTIONS_TO_WIPE = [
  'studies',
  'investigators',
  'visits',
  'assessments',
  'screenFailures',
  'protocolDeviations',
  'enrollmentSnapshots',
  'whatIfScenarios',
  'imports',
  'delegationLog',
  'capacityConfig',
]

async function wipeCollection(name: string): Promise<void> {
  const snap = await getDocs(collection(db, name))
  if (snap.empty) {
    console.log(`  ${name}: empty, skipping`)
    return
  }
  const CHUNK = 400
  const docs = snap.docs
  for (let i = 0; i < docs.length; i += CHUNK) {
    await Promise.all(docs.slice(i, i + CHUNK).map((d) => deleteDoc(doc(db, name, d.id))))
  }
  console.log(`  ${name}: deleted ${docs.length} document(s)`)
}

async function main() {
  console.log('Wiping fake/seed data from Firestore...')
  console.log('Preserving: sites, users\n')
  for (const col of COLLECTIONS_TO_WIPE) {
    await wipeCollection(col)
  }
  console.log('\nDone. Firestore is clean.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Wipe failed:', err)
  process.exit(1)
})
