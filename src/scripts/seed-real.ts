/**
 * Seed script: imports real K2 Tampa data from docs/DataExport base.xlsx.
 * Creates: 1 site record, 15 active investigators, 31 studies, ~4200 visits.
 * Safe to re-run — visits are keyed on CC Visit ID so duplicates are skipped.
 *
 * Prerequisites:
 *   1. npm install --save-dev firebase-admin
 *   2. Download service account key from Firebase Console → Project Settings →
 *      Service Accounts → Generate new private key → save as serviceAccountKey.json
 *      in the project root.
 *
 * Run with: npx tsx src/scripts/seed-real.ts
 */
import admin from 'firebase-admin'
import XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { config } from 'dotenv'

config({ path: '.env.local' })

const KEY_PATH = path.resolve('serviceAccountKey.json')
if (!fs.existsSync(KEY_PATH)) {
  console.error('ERROR: serviceAccountKey.json not found in project root.')
  console.error('Download it from Firebase Console → Project Settings → Service Accounts.')
  process.exit(1)
}

admin.initializeApp({
  credential: admin.credential.cert(KEY_PATH),
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
})
const db = admin.firestore()
const SITE_ID = 'tampa'
const CHUNK = 400

// ── Helpers ──────────────────────────────────────────────────────────────────

function excelDateToISO(serial: number): string {
  const d = new Date((Math.floor(serial) - 25569) * 86400 * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function excelDurationMinutes(start: number, end: number): number {
  return Math.max(0, Math.round((end - start) * 24 * 60))
}

function invId(ccKey: string): string {
  // 'Grant, B' or 'Grant, B, Walker, K' → take first person → 'grant_b'
  const parts = ccKey.trim().split(',').map((s: string) => s.trim())
  const last = parts[0] ?? ''
  const init = parts[1]?.[0] ?? ''
  return (last + '_' + init).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

function studyId(ccName: string): string {
  return ccName.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

// ── Data Definitions ─────────────────────────────────────────────────────────

const INVESTIGATORS = [
  { key: 'Yokum, K',         name: 'Kelley Yokum',             role: 'PI',                weeklyCapacityHours: 40 },
  { key: 'Wick, N',          name: 'Natasha Wick',             role: 'Investigator',       weeklyCapacityHours: 40 },
  { key: 'Patel, R',         name: 'Raj Patel',                role: 'Investigator',       weeklyCapacityHours: 40 },
  { key: 'Hill, C',          name: 'Chris Hill',               role: 'Investigator',       weeklyCapacityHours: 40 },
  { key: 'Delgado, P',       name: 'Patricia Delgado',         role: 'Investigator',       weeklyCapacityHours: 10 },
  { key: 'Chaykin, J',       name: 'Jillian Chaykin',          role: 'Dedicated Rater',    weeklyCapacityHours: 40 },
  { key: 'Jorgensen, A',     name: 'Amanda Jorgensen',         role: 'Infusion Nurse',     weeklyCapacityHours: 40 },
  { key: 'Grant, B',         name: 'Brianna Grant',            role: 'Study Coordinator',  weeklyCapacityHours: 40 },
  { key: 'Navarro, A',       name: 'Angelica Navarro',         role: 'Study Coordinator',  weeklyCapacityHours: 40 },
  { key: 'Turner, K',        name: 'Kaitlyn Turner',           role: 'Study Coordinator',  weeklyCapacityHours: 40 },
  { key: 'Moreno, W',        name: 'Wendy Moreno',             role: 'Study Coordinator',  weeklyCapacityHours: 40 },
  { key: 'Naik, S',          name: 'Shreya Naik',              role: 'Study Coordinator',  weeklyCapacityHours: 40 },
  { key: 'Osorio, L',        name: 'Liz Osorio',               role: 'Study Coordinator',  weeklyCapacityHours: 40 },
  { key: 'Perez, K',         name: 'Karina Perez',             role: 'Study Coordinator',  weeklyCapacityHours: 40 },
  { key: 'DelRioFigueroa, V', name: 'Valeria DelRioFigueroa', role: 'Study Coordinator',  weeklyCapacityHours: 40 },
]

const PI_ID = invId('Yokum, K') // 'yokum_k'

interface StudyDef {
  ccName: string
  sponsor: string
  protocolId: string
  status: string
  therapeuticArea: string
  phase: string
}

const STUDIES: StudyDef[] = [
  // ── Enrolling ──────────────────────────────────────────────────────────────
  { ccName: 'Axsome Therapeutics - AXS-14-FM-301 - K2 Tampa',            sponsor: 'Axsome Therapeutics',     protocolId: 'AXS-14-FM-301',          status: 'enrolling', therapeuticArea: 'Psychiatry',   phase: 'Phase III' },
  { ccName: 'Eli Lilly - J2S-MC-GZME - K2 Tampa',                         sponsor: 'Eli Lilly',               protocolId: 'J2S-MC-GZME',            status: 'enrolling', therapeuticArea: 'Psychiatry',   phase: 'Phase III' },
  { ccName: 'Eli Lilly - J2S-MC-GZMP - K2 Tampa',                         sponsor: 'Eli Lilly',               protocolId: 'J2S-MC-GZMP',            status: 'enrolling', therapeuticArea: 'Psychiatry',   phase: 'Phase III' },
  { ccName: 'Eli Lilly - JS2-MC-GZMH - K2 Tampa',                         sponsor: 'Eli Lilly',               protocolId: 'JS2-MC-GZMH',            status: 'enrolling', therapeuticArea: 'Psychiatry',   phase: 'Phase III' },
  { ccName: 'Merck - MK-2214-004 - K2 Tampa',                              sponsor: 'Merck',                   protocolId: 'MK-2214-004',            status: 'enrolling', therapeuticArea: 'CNS',          phase: 'Phase II'  },
  { ccName: 'Newleos Therapeutics - NTX 1472-201 - K2 Tampa',              sponsor: 'Newleos Therapeutics',    protocolId: 'NTX 1472-201',           status: 'enrolling', therapeuticArea: 'Psychiatry',   phase: 'Phase II'  },
  { ccName: 'LifeKey - K2 Medical Research Tampa',                         sponsor: 'K2 Medical Research',    protocolId: 'LifeKey',                status: 'enrolling', therapeuticArea: 'Neurology',    phase: 'Observational' },
  { ccName: 'Cybin - CYB003-002 - K2 Medical Research Tampa',              sponsor: 'Cybin',                   protocolId: 'CYB003-002',             status: 'enrolling', therapeuticArea: 'Psychiatry',   phase: 'Phase II'  },
  { ccName: 'Intracellular - ITI-1284-301 - K2 Tampa',                     sponsor: 'Intracellular',           protocolId: 'ITI-1284-301',           status: 'enrolling', therapeuticArea: 'Psychiatry',   phase: 'Phase III' },
  { ccName: 'Neurocrine - NBI-1065845-MDD3028 - K2 Tampa',                 sponsor: 'Neurocrine',              protocolId: 'NBI-1065845-MDD3028',    status: 'enrolling', therapeuticArea: 'Psychiatry',   phase: 'Phase III' },
  { ccName: 'Neurocrine Biosciences - 1065845-MDD3025 - K2 Tampa',         sponsor: 'Neurocrine Biosciences',  protocolId: '1065845-MDD3025',        status: 'enrolling', therapeuticArea: 'Psychiatry',   phase: 'Phase III' },
  // ── Open ───────────────────────────────────────────────────────────────────
  { ccName: 'Carmot Therapeutics, Inc (Roche) - CT-388-104 - K2 Tampa',   sponsor: 'Carmot / Roche',          protocolId: 'CT-388-104',             status: 'open',      therapeuticArea: 'Metabolic',    phase: 'Phase II'  },
  { ccName: 'Acumen Pharmaceuticals - ACU193-201 - K2 Tampa',              sponsor: 'Acumen Pharmaceuticals',  protocolId: 'ACU193-201',             status: 'open',      therapeuticArea: 'Neurology',    phase: 'Phase II'  },
  { ccName: 'Eli Lilly - I5T-MC-AACM - Tampa',                             sponsor: 'Eli Lilly',               protocolId: 'I5T-MC-AACM',            status: 'open',      therapeuticArea: 'Neurology',    phase: 'Phase III' },
  { ccName: 'Eli Lilly - I5T-MC-AACQ - K2 Tampa',                          sponsor: 'Eli Lilly',               protocolId: 'I5T-MC-AACQ',            status: 'open',      therapeuticArea: 'Neurology',    phase: 'Phase III' },
  { ccName: 'Eli Lilly - I8P-MC-OXAH - K2 Tampa',                          sponsor: 'Eli Lilly',               protocolId: 'I8P-MC-OXAH',            status: 'open',      therapeuticArea: 'Metabolic',    phase: 'Phase III' },
  { ccName: 'Merck - MK-1167-008 - K2 Tampa',                              sponsor: 'Merck',                   protocolId: 'MK-1167-008',            status: 'open',      therapeuticArea: 'CNS',          phase: 'Phase II'  },
  { ccName: 'Neumora NMRA-335140-302 - K2 Tampa',                          sponsor: 'Neumora',                 protocolId: 'NMRA-335140-302',        status: 'open',      therapeuticArea: 'Psychiatry',   phase: 'Phase III' },
  { ccName: 'Neumora NMRA-335140-501 - 302 EXT - K2 Tampa',                sponsor: 'Neumora',                 protocolId: 'NMRA-335140-501 302 EXT',status: 'open',      therapeuticArea: 'Psychiatry',   phase: 'Phase III' },
  // ── Completed ──────────────────────────────────────────────────────────────
  { ccName: 'Biohaven - BHV7000-203 EXT - K2 Tampa',                       sponsor: 'Biohaven',                protocolId: 'BHV7000-203 EXT',        status: 'completed', therapeuticArea: 'Psychiatry',   phase: 'Phase III' },
  { ccName: 'Biohaven - BHV7000-305 - K2 Tampa',                           sponsor: 'Biohaven',                protocolId: 'BHV7000-305',            status: 'completed', therapeuticArea: 'Psychiatry',   phase: 'Phase III' },
  { ccName: 'Bionomics - BNC210.014 - K2 Tampa',                           sponsor: 'Bionomics',               protocolId: 'BNC210.014',             status: 'completed', therapeuticArea: 'Psychiatry',   phase: 'Phase II'  },
  { ccName: 'BMS - CN008-0003 - Tampa',                                     sponsor: 'BMS',                     protocolId: 'CN008-0003',             status: 'completed', therapeuticArea: 'Psychiatry',   phase: 'Phase II'  },
  { ccName: 'Janssen - MDD3007 - Tampa',                                    sponsor: 'Janssen',                 protocolId: 'MDD3007',                status: 'completed', therapeuticArea: 'Psychiatry',   phase: 'Phase III' },
  { ccName: 'Janssen - 64042056ALZ2001 - K2 Tampa',                        sponsor: 'Janssen',                 protocolId: '64042056ALZ2001',        status: 'completed', therapeuticArea: 'Neurology',    phase: 'Phase III' },
  { ccName: 'Karuna Pharmaceuticals - KAR-031 - K2 Tampa',                 sponsor: 'Karuna Pharmaceuticals',  protocolId: 'KAR-031',                status: 'completed', therapeuticArea: 'Psychiatry',   phase: 'Phase III' },
  { ccName: 'Lundbeck 20297A - K2 Tampa',                                   sponsor: 'Lundbeck',                protocolId: '20297A',                 status: 'completed', therapeuticArea: 'Psychiatry',   phase: 'Phase III' },
  { ccName: 'Neumora NMRA-335140-501 - 301 EXT - Tampa',                   sponsor: 'Neumora',                 protocolId: 'NMRA-335140-501 301 EXT',status: 'completed', therapeuticArea: 'Psychiatry',   phase: 'Phase III' },
  { ccName: 'Otsuka - 382-201-00001 - Tampa',                               sponsor: 'Otsuka',                  protocolId: '382-201-00001',          status: 'completed', therapeuticArea: 'Psychiatry',   phase: 'Phase III' },
  { ccName: 'Sunovion - SEP 361-226 - Tampa',                               sponsor: 'Sunovion',                protocolId: 'SEP 361-226',            status: 'completed', therapeuticArea: 'Psychiatry',   phase: 'Phase III' },
  { ccName: 'Clarivate OPP-00676533 - K2 Tampa',                           sponsor: 'Clarivate',               protocolId: 'OPP-00676533',           status: 'completed', therapeuticArea: 'CNS',          phase: 'Phase II'  },
]

// Build lookup: CC name → Firestore study doc ID
const studyIdMap: Record<string, string> = {}
STUDIES.forEach((s) => { studyIdMap[s.ccName] = studyId(s.ccName) })

// Build lookup: coordinator key → Firestore investigator doc ID
const invIdMap: Record<string, string> = {}
INVESTIGATORS.forEach((i) => { invIdMap[i.key] = invId(i.key) })

// ── Seed Functions ────────────────────────────────────────────────────────────

async function seedSite() {
  console.log('Seeding site...')
  await db.collection('sites').doc(SITE_ID).set({
    id: SITE_ID,
    name: 'K2 Medical Research Tampa',
    location: 'Tampa, FL',
    timezone: 'America/New_York',
    active: true,
  }, { merge: true })
  console.log('  Done.')
}

async function seedInvestigators() {
  console.log(`Seeding ${INVESTIGATORS.length} investigators...`)
  const batch = db.batch()
  for (const inv of INVESTIGATORS) {
    const id = invId(inv.key)
    batch.set(db.collection('investigators').doc(id), {
      id,
      name: inv.name,
      role: inv.role,
      credentials: inv.role === 'PI' ? 'MD' : '',
      siteId: SITE_ID,
      weeklyCapacityHours: inv.weeklyCapacityHours,
      siteBaselinePct: 15,
      assignedStudies: [],
    }, { merge: true })
  }
  await batch.commit()
  console.log('  Done.')
}

async function seedStudies() {
  console.log(`Seeding ${STUDIES.length} studies...`)
  const batch = db.batch()
  for (const s of STUDIES) {
    const id = studyId(s.ccName)
    batch.set(db.collection('studies').doc(id), {
      id,
      name: s.ccName,
      sponsor: s.sponsor,
      sponsorProtocolId: s.protocolId,
      therapeuticArea: s.therapeuticArea,
      phase: s.phase,
      status: s.status,
      siteId: SITE_ID,
      piId: PI_ID,
      assignedInvestigators: [],
      targetEnrollment: 0,
      startDate: '',
      expectedEndDate: '',
      visitSchedule: [],
      assessmentBattery: {},
      adminOverride: { perStudyWeeklyHours: 8, perParticipantOverheadPct: 15 },
      parsedFromProtocol: false,
      enrollmentData: { prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0 },
      statusHistory: [],
    }, { merge: true })
  }
  await batch.commit()
  console.log('  Done.')
}

async function seedVisits() {
  console.log('Reading XLSX...')
  const wb = XLSX.readFile(path.resolve('docs/DataExport base.xlsx'))
  const raw: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1'], { header: 1 }) as unknown[][]
  const rows = (raw as unknown[][]).slice(4).filter((r) => Array.isArray(r) && r.length > 3 && r[14])

  console.log(`Seeding ${rows.length} visits...`)
  let created = 0
  let skipped = 0

  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = db.batch()
    const chunk = rows.slice(i, i + CHUNK)

    for (const r of chunk) {
      const ccVisitId = r[22]
      if (!ccVisitId) { skipped++; continue }

      const docId = `cc-${String(ccVisitId)}`
      const ccStudyName = String(r[14] ?? '').trim()
      const mappedStudyId = studyIdMap[ccStudyName] ?? studyId(ccStudyName)

      const coordRaw = String(r[1] ?? '').trim()
      const coordKey = (() => {
        const parts = coordRaw.split(',').map((s: string) => s.trim())
        return parts[0] + ', ' + (parts[1]?.[0] ?? '')
      })()
      const mappedInvId = invIdMap[coordKey] ?? invId(coordRaw)

      const plannedStart = typeof r[2] === 'number' ? r[2] : 0
      const plannedEnd   = typeof r[4] === 'number' ? r[4] : 0
      const actualStart  = typeof r[3] === 'number' ? r[3] : 0
      const actualEnd    = typeof r[5] === 'number' ? r[5] : 0

      const scheduledDate = plannedStart > 0 ? excelDateToISO(plannedStart) : ''
      const durationMinutes = plannedStart > 0 && plannedEnd > 0 ? excelDurationMinutes(plannedStart, plannedEnd) : 0
      const actualDurationMinutes = actualStart > 0 && actualEnd > actualStart
        ? excelDurationMinutes(actualStart, actualEnd)
        : null

      const ccStatus = String(r[6] ?? '').trim()
      const status = ccStatus === 'Completed' ? 'completed' : 'scheduled'

      const screenNum  = String(r[12] ?? '').trim()
      const randomNum  = String(r[13] ?? '').trim()
      const participantId = randomNum || screenNum || String(r[7] ?? '')

      batch.set(db.collection('visits').doc(docId), {
        id: docId,
        siteId: SITE_ID,
        studyId: mappedStudyId,
        investigatorId: mappedInvId,
        visitType: String(r[15] ?? '').trim() || 'Standard Visit',
        participantId,
        scheduledDate,
        completedDate: status === 'completed' ? scheduledDate : null,
        status,
        durationMinutes,
        actualDurationMinutes,
        source: 'cc-import',
        ccVisitId: String(ccVisitId),
      }, { merge: false })
      created++
    }

    await batch.commit()
    process.stdout.write(`  ${Math.min(i + CHUNK, rows.length)}/${rows.length}\r`)
  }

  console.log(`\n  Created: ${created}, Skipped: ${skipped}`)
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('K2 Tampa real-data seed\n')
  await seedSite()
  await seedInvestigators()
  await seedStudies()
  await seedVisits()
  console.log('\nSeed complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
