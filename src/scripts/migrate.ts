/**
 * One-time migration script: transforms legacy prototype data into the new schema.
 *
 * Legacy shape (single Firestore document):
 *   kpi_data/{DATA_DOC} → {
 *     investigators: string[]           // array of name strings, e.g. ["Dr. Smith"]
 *     entries: Array<{                  // visit/KPI entries
 *       id: number,
 *       investigator: string,
 *       study: string,
 *       date: string,                   // "YYYY-MM-DD"
 *       'Participants Seen': string,
 *       'Screens': string,
 *       'Prescreens': string,
 *       'Screen Fail': string,
 *       'Randomize': string,
 *       'Time for Visit (min)': string,
 *       // ...any additional dynamic metric fields
 *     }>
 *     assessmentEntries: Array<{        // scale/assessment entries
 *       id: number,
 *       investigator: string,
 *       assessment: string,             // scale name, e.g. "MADRS"
 *       study: string,
 *       duration: string,              // minutes as string
 *       date: string,                   // "YYYY-MM-DD"
 *     }>
 *     studies: string[]                // array of study names
 *     // ...studyData, randomizationData, studyDetailsData ignored by this migration
 *   }
 *
 * Run with: npx tsx src/scripts/migrate.ts
 * Safe to re-run — skips documents that already have siteId set.
 * Archive this file after migration is confirmed.
 */
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore'

// Load env vars from .env.local
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

const SITE_ID = 'tampa'

// The legacy prototype stored everything in one document under this path.
const LEGACY_COLLECTION = 'kpi_data'
const LEGACY_DOC_ID = 'data' // adjust if the prototype used a different doc id

async function migrateSite() {
  console.log('Ensuring Tampa site record exists...')
  await setDoc(
    doc(db, 'sites', SITE_ID),
    {
      id: SITE_ID,
      name: 'K2 Medical Research Tampa',
      location: 'Tampa, FL',
      active: true,
      timezone: 'America/New_York',
    },
    { merge: true },
  )
  console.log('  Done.')
}

/**
 * The legacy `investigators` field is a plain string[] of display names.
 * We convert each to an Investigator document keyed by a slug of the name.
 */
async function migrateInvestigators(legacyInvestigators: string[]) {
  console.log(`Migrating ${legacyInvestigators.length} investigator(s)...`)
  let migrated = 0
  let skipped = 0
  const batch = writeBatch(db)

  for (const name of legacyInvestigators) {
    const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const docRef = doc(db, 'investigators', id)
    const existing = await getDoc(docRef)

    if (existing.exists() && existing.data()?.siteId) {
      skipped++
      continue
    }

    batch.set(docRef, {
      id,
      name,
      siteId: SITE_ID,
      weeklyCapacityHours: 40,
      siteBaselinePct: 15,
      assignedStudies: [],
      credentials: '',
      role: 'PI',
    })
    migrated++
  }

  await batch.commit()
  console.log(`  Migrated: ${migrated}, Skipped: ${skipped}`)
}

/**
 * Legacy `entries` are KPI/visit records with string-keyed metric fields.
 * Each becomes a document in the new `visits` collection.
 *
 * Field mapping:
 *   entry.investigator        → investigatorId (name used as id slug; same slug logic as above)
 *   entry.study               → studyId
 *   entry.date                → scheduledDate / completedDate
 *   entry['Time for Visit (min)'] → durationMinutes
 *   entry.id                  → used as Firestore doc id (stringified)
 */
async function migrateEntries(
  entries: Array<Record<string, unknown>>,
) {
  console.log(`Migrating ${entries.length} entries → visits...`)
  let migrated = 0
  let skipped = 0

  // Firestore batches are capped at 500 writes; chunk accordingly.
  const CHUNK = 400
  for (let i = 0; i < entries.length; i += CHUNK) {
    const batch = writeBatch(db)
    const chunk = entries.slice(i, i + CHUNK)

    for (const data of chunk) {
      const docId = String(data.id ?? `${Date.now()}_${Math.random()}`)
      const docRef = doc(db, 'visits', docId)
      const existing = await getDoc(docRef)

      if (existing.exists() && existing.data()?.siteId) {
        skipped++
        continue
      }

      const investigatorName = String(data.investigator ?? '')
      const investigatorId = investigatorName
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')

      const rawDuration = data['Time for Visit (min)']
      const durationMinutes = rawDuration != null ? parseInt(String(rawDuration), 10) || 0 : 0
      const dateStr = String(data.date ?? '')

      batch.set(docRef, {
        ...data,
        id: docId,
        siteId: SITE_ID,
        source: 'legacy',
        investigatorId,
        studyId: data.study ?? '',
        visitType: data.visitType ?? data.type ?? 'standard',
        status: data.status ?? 'completed',
        scheduledDate: data.scheduledDate ?? dateStr,
        completedDate: data.completedDate ?? dateStr,
        durationMinutes,
        actualDurationMinutes: data.actualDurationMinutes ?? null,
        participantId: data.participantId ?? '',
      })
      migrated++
    }

    await batch.commit()
  }

  console.log(`  Migrated: ${migrated}, Skipped: ${skipped}`)
}

/**
 * Legacy `assessmentEntries` are scale/rating records.
 * Each becomes a document in the new `assessments` collection.
 *
 * Field mapping:
 *   entry.assessment  → scaleType
 *   entry.duration    → durationMinutes (string → number)
 *   entry.date        → date
 *   entry.investigator → investigatorId (slug)
 *   entry.study       → studyId
 */
async function migrateAssessmentEntries(
  assessmentEntries: Array<Record<string, unknown>>,
) {
  console.log(`Migrating ${assessmentEntries.length} assessmentEntries → assessments...`)
  let migrated = 0
  let skipped = 0

  const CHUNK = 400
  for (let i = 0; i < assessmentEntries.length; i += CHUNK) {
    const batch = writeBatch(db)
    const chunk = assessmentEntries.slice(i, i + CHUNK)

    for (const data of chunk) {
      const docId = String(data.id ?? `${Date.now()}_${Math.random()}`)
      const docRef = doc(db, 'assessments', docId)
      const existing = await getDoc(docRef)

      if (existing.exists() && existing.data()?.siteId) {
        skipped++
        continue
      }

      const investigatorName = String(data.investigator ?? '')
      const investigatorId = investigatorName
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')

      const rawDuration = data.duration
      const durationMinutes = rawDuration != null ? parseInt(String(rawDuration), 10) || 0 : 0

      batch.set(docRef, {
        ...data,
        id: docId,
        siteId: SITE_ID,
        source: 'legacy',
        investigatorId,
        studyId: data.study ?? '',
        scaleType: data.assessment ?? data.scaleType ?? data.scale ?? 'unknown',
        durationMinutes,
        visitId: data.visitId ?? null,
        date: data.date ?? '',
      })
      migrated++
    }

    await batch.commit()
  }

  console.log(`  Migrated: ${migrated}, Skipped: ${skipped}`)
}

async function main() {
  console.log('Starting K2 legacy data migration...')
  console.log(`Target site: ${SITE_ID}`)
  console.log(`Source: ${LEGACY_COLLECTION}/${LEGACY_DOC_ID}`)
  console.log()

  // Read the single legacy document that holds all data as nested arrays.
  console.log('Reading legacy document...')
  const legacySnap = await getDoc(doc(db, LEGACY_COLLECTION, LEGACY_DOC_ID))

  if (!legacySnap.exists()) {
    // Fall back: check if any documents exist in the collection at all.
    const collSnap = await getDocs(collection(db, LEGACY_COLLECTION))
    if (collSnap.empty) {
      console.warn(
        `  Warning: No document found at ${LEGACY_COLLECTION}/${LEGACY_DOC_ID}.` +
          ' If the legacy doc uses a different id, update LEGACY_DOC_ID at the top of this script.',
      )
      console.log('  Proceeding with empty data — only the Tampa site record will be created.')
    } else {
      // The collection exists but with an unexpected doc id — log it for the operator.
      console.warn('  Legacy collection exists but not at the expected doc id. Found doc ids:')
      collSnap.forEach((d) => console.warn(`    - ${d.id}`))
      console.error(
        'Update LEGACY_DOC_ID in this script to match the correct id, then re-run.',
      )
      process.exit(1)
    }
  }

  const legacyData = legacySnap.exists() ? legacySnap.data() : {}

  const investigators: string[] = Array.isArray(legacyData.investigators)
    ? (legacyData.investigators as string[])
    : []
  const entries: Array<Record<string, unknown>> = Array.isArray(legacyData.entries)
    ? (legacyData.entries as Array<Record<string, unknown>>)
    : []
  const assessmentEntries: Array<Record<string, unknown>> = Array.isArray(
    legacyData.assessmentEntries,
  )
    ? (legacyData.assessmentEntries as Array<Record<string, unknown>>)
    : []

  console.log(
    `  Found: ${investigators.length} investigators, ${entries.length} entries, ${assessmentEntries.length} assessmentEntries`,
  )
  console.log()

  await migrateSite()
  await migrateInvestigators(investigators)
  await migrateEntries(entries)
  await migrateAssessmentEntries(assessmentEntries)

  console.log()
  console.log(
    'Migration complete. Verify data in Firebase Console before archiving this script.',
  )
  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
