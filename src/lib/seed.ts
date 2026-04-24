import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from './firebase'
import { createInvestigator } from './investigators'
import { createStudy } from './studies'
import type {
  AdminOverride,
  EnrollmentData,
  Investigator,
  Study,
  StudyPhase,
  StudyStatus,
  StudyStatusHistoryEntry,
  VisitScheduleEntry,
} from '@/types'

interface SeedInvestigator {
  name: string
  credentials: string
  role: Investigator['role']
  boardName: string
  weeklyCapacityHours: number
  siteBaselinePct: number
}

interface SeedStudy {
  name: string
  sponsor: string
  sponsorProtocolId: string
  therapeuticArea: string
  phase: StudyPhase
  status: StudyStatus
}

const investigators: SeedInvestigator[] = [
  {
    name: 'Dr. James Wilson',
    credentials: 'MD, PhD',
    role: 'PI',
    boardName: 'Wilson',
    weeklyCapacityHours: 40,
    siteBaselinePct: 20,
  },
  {
    name: 'Dr. Sarah Wick',
    credentials: 'MD',
    role: 'Sub-I',
    boardName: 'Wick',
    weeklyCapacityHours: 36,
    siteBaselinePct: 15,
  },
  {
    name: 'Dr. Marcus Hill',
    credentials: 'DO',
    role: 'Sub-I',
    boardName: 'Hill',
    weeklyCapacityHours: 32,
    siteBaselinePct: 15,
  },
  {
    name: 'Dr. Elena Delgado',
    credentials: 'MD',
    role: 'Sub-I',
    boardName: 'Delgado',
    weeklyCapacityHours: 32,
    siteBaselinePct: 15,
  },
  {
    name: 'Dr. Rohan Patel',
    credentials: 'MD, MPH',
    role: 'Sub-I',
    boardName: 'Patel',
    weeklyCapacityHours: 28,
    siteBaselinePct: 10,
  },
]

const studies: SeedStudy[] = [
  {
    name: 'NRX-0092 Phase II Major Depressive Disorder',
    sponsor: 'NeuroRx',
    sponsorProtocolId: 'NRX-0092-202',
    therapeuticArea: 'Psychiatry',
    phase: 'Phase II',
    status: 'enrolling',
  },
  {
    name: 'VTX-4431 Phase III Treatment-Resistant Depression',
    sponsor: 'Vertex Therapeutics',
    sponsorProtocolId: 'VTX-4431-301',
    therapeuticArea: 'Psychiatry',
    phase: 'Phase III',
    status: 'enrolling',
  },
  {
    name: 'ALX-7718 Phase II Generalized Anxiety Disorder',
    sponsor: 'Alx Oncology',
    sponsorProtocolId: 'ALX-7718-201',
    therapeuticArea: 'Psychiatry',
    phase: 'Phase II',
    status: 'enrolling',
  },
  {
    name: 'MCL-2290 Phase I PTSD Biomarker Study',
    sponsor: 'MedCore Labs',
    sponsorProtocolId: 'MCL-2290-101',
    therapeuticArea: 'Psychiatry',
    phase: 'Phase I',
    status: 'enrolling',
  },
  {
    name: 'ZNR-5580 Phase II Bipolar I Maintenance',
    sponsor: 'Zenara Pharma',
    sponsorProtocolId: 'ZNR-5580-205',
    therapeuticArea: 'Psychiatry',
    phase: 'Phase II',
    status: 'paused',
  },
  {
    name: 'PRX-8814 Phase III Schizophrenia Adjunct Therapy',
    sponsor: 'Praxis Bio',
    sponsorProtocolId: 'PRX-8814-303',
    therapeuticArea: 'Psychiatry',
    phase: 'Phase III',
    status: 'open',
  },
]

const defaultAdminOverride: AdminOverride = {
  perStudyWeeklyHours: 8,
  perParticipantOverheadPct: 15,
}

const defaultEnrollmentData: EnrollmentData = {
  prescreens: 0,
  screens: 0,
  randomizations: 0,
  active: 0,
  completions: 0,
}

const defaultVisitSchedule: VisitScheduleEntry[] = []
const defaultAssessmentBattery: Record<string, string[]> = {}
const defaultStatusHistory: StudyStatusHistoryEntry[] = []

export async function seedTampaData(
  siteId: string,
): Promise<{ investigators: number; studies: number }> {
  const investigatorIds: string[] = []
  let newInvestigators = 0
  for (const inv of investigators) {
    const existing = await getDocs(
      query(
        collection(db, 'investigators'),
        where('siteId', '==', siteId),
        where('boardName', '==', inv.boardName),
        limit(1),
      ),
    )
    if (!existing.empty) {
      investigatorIds.push(existing.docs[0].id)
      continue
    }
    const id = await createInvestigator({
      name: inv.name,
      credentials: inv.credentials,
      role: inv.role,
      siteId,
      weeklyCapacityHours: inv.weeklyCapacityHours,
      siteBaselinePct: inv.siteBaselinePct,
      assignedStudies: [],
      boardName: inv.boardName,
    })
    investigatorIds.push(id)
    newInvestigators++
  }

  const piId = investigatorIds[0] ?? ''

  let newStudies = 0
  for (const s of studies) {
    const existing = await getDocs(
      query(
        collection(db, 'studies'),
        where('siteId', '==', siteId),
        where('sponsorProtocolId', '==', s.sponsorProtocolId),
        limit(1),
      ),
    )
    if (!existing.empty) continue
    const study: Omit<Study, 'id'> = {
      name: s.name,
      sponsor: s.sponsor,
      sponsorProtocolId: s.sponsorProtocolId,
      therapeuticArea: s.therapeuticArea,
      phase: s.phase,
      status: s.status,
      siteId,
      piId,
      assignedInvestigators: [],
      targetEnrollment: 30,
      startDate: '2024-01-15',
      expectedEndDate: '2026-06-30',
      visitSchedule: defaultVisitSchedule,
      assessmentBattery: defaultAssessmentBattery,
      adminOverride: defaultAdminOverride,
      parsedFromProtocol: false,
      enrollmentData: defaultEnrollmentData,
      statusHistory: defaultStatusHistory,
    }
    await createStudy(study)
    newStudies++
  }

  return { investigators: newInvestigators, studies: newStudies }
}
