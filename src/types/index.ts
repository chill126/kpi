export type Role = 'management' | 'staff'

export type SyncStatus = 'synced' | 'syncing' | 'offline'

export interface AppUser {
  uid: string
  email: string
  displayName: string
  role: Role
  siteId: string
  assignedStudies: string[]
}

export interface Site {
  id: string
  name: string
  location: string
  active: boolean
  timezone: string
}

export type InvestigatorRole = 'PI' | 'Sub-I' | 'Provider'

export interface Investigator {
  id: string
  name: string
  credentials: string
  role: InvestigatorRole
  siteId: string
  weeklyCapacityHours: number
  siteBaselinePct: number
  assignedStudies: string[]
}

export type StudyStatus = 'enrolling' | 'paused' | 'maintenance' | 'completed' | 'on_hold'
export type StudyPhase = 'Phase I' | 'Phase II' | 'Phase III' | 'Phase IV' | 'Observational'

export interface StudyInvestigator {
  investigatorId: string
  role: InvestigatorRole
}

export interface VisitScheduleEntry {
  visitName: string
  visitWindow: string
  investigatorTimeMinutes: number
  coordinatorTimeMinutes: number
  isInvestigatorRequired: boolean
}

export interface AdminOverride {
  perStudyWeeklyHours: number
  perParticipantOverheadPct: number
}

export interface Study {
  id: string
  name: string
  sponsor: string
  sponsorProtocolId: string
  therapeuticArea: string
  phase: StudyPhase
  status: StudyStatus
  siteId: string
  piId: string
  assignedInvestigators: StudyInvestigator[]
  targetEnrollment: number
  startDate: string
  expectedEndDate: string
  visitSchedule: VisitScheduleEntry[]
  assessmentBattery: Record<string, string[]>
  adminOverride: AdminOverride
  parsedFromProtocol: boolean
}

export type VisitStatus = 'scheduled' | 'completed' | 'missed' | 'no_show'
export type VisitSource = 'manual' | 'cc_import'

export interface Visit {
  id: string
  participantId: string
  studyId: string
  investigatorId: string
  siteId: string
  visitType: string
  scheduledDate: string
  completedDate: string | null
  status: VisitStatus
  durationMinutes: number
  actualDurationMinutes: number | null
  source: VisitSource
}

export interface Assessment {
  id: string
  investigatorId: string
  studyId: string
  siteId: string
  visitId: string | null
  scaleType: string
  durationMinutes: number
  date: string
}

export type DelegationSource = 'advarra_import' | 'manual'

export interface DelegationLog {
  id: string
  investigatorId: string
  studyId: string
  delegatedTasks: string[]
  effectiveDate: string
  source: DelegationSource
}

export interface Import {
  id: string
  type: 'clinical_conductor' | 'advarra_ereg' | 'protocol_pdf'
  uploadedBy: string
  uploadedAt: string
  rowCount: number
  status: 'pending' | 'complete' | 'error'
  mappingUsed: Record<string, string>
  errors: string[]
}

export interface CapacityConfig {
  investigatorId: string
  weeklyCapacityHours: number
  siteBaselinePct: number
}
