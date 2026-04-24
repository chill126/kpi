export type Role = 'management' | 'staff'

export type OverviewTileId =
  | 'capacity'
  | 'studies'
  | 'alerts'
  | 'enrollment'
  | 'today-activity'

export interface DashboardTile {
  id: OverviewTileId
  visible: boolean
  order: number
}

export interface DashboardConfig {
  tiles: DashboardTile[]
}

export type SyncStatus = 'synced' | 'syncing' | 'offline'

export interface AppUser {
  uid: string
  email: string
  displayName: string
  role: Role
  siteId: string
  assignedStudies: string[]
  dashboardConfig?: DashboardConfig
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
  /** Display name as it appears in k2-board (e.g. 'Wilson'). Used for board session cross-referencing. */
  boardName?: string
}

export type StudyStatus = 'pending' | 'enrolling' | 'paused' | 'open' | 'completed'
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

export interface EnrollmentData {
  prescreens: number
  screens: number
  randomizations: number
  active: number
  completions: number
}

export const SCREEN_FAILURE_CATEGORIES = [
  'inclusion_criteria',
  'exclusion_criteria',
  'lab_values',
  'scales',
  'prohibited_con_meds',
  'consent',
  'logistical',
  'lost_to_follow_up',
  'investigator_decision',
] as const

export type ScreenFailureCategory = typeof SCREEN_FAILURE_CATEGORIES[number]

export interface ScreenFailureReason {
  category: ScreenFailureCategory | string
  detail?: string
}

export interface ScreenFailure {
  id: string
  studyId: string
  siteId: string
  source?: string
  date: string
  reasons: ScreenFailureReason[]
  notes?: string
}

export interface EnrollmentSnapshot {
  id: string
  studyId: string
  siteId: string
  date: string
  prescreens: number
  screens: number
  randomizations: number
  active: number
  completions: number
}

export interface ContractMilestone {
  name: string
  amount: number
  expectedDate: string
  achieved: boolean
  achievedDate?: string
}

export interface PaidScreenFails {
  ratio?: number
  maxPaid?: number
}

export interface StudyContract {
  totalValue?: number
  milestones?: ContractMilestone[]
  paidScreenFails?: PaidScreenFails
}

export interface StudyStatusHistoryEntry {
  status: StudyStatus
  changedBy: string
  changedAt: string
  note?: string
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
  enrollmentData: EnrollmentData
  statusHistory: StudyStatusHistoryEntry[]
  contract?: StudyContract
  customScreenFailureReasons?: string[]
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
  siteId: string
  investigatorId: string
  studyId: string
  delegatedTasks: string[]
  effectiveDate: string
  source: DelegationSource
}

export interface Import {
  id: string
  siteId: string
  type: 'clinical_conductor' | 'advarra_ereg' | 'enrollment_snapshot' | 'protocol_pdf' | 'k2_board_export'
  uploadedBy: string
  uploadedAt: string
  rowCount: number
  status: 'pending' | 'complete' | 'error'
  mappingUsed: Record<string, string>
  errors: string[]
}

export const DEVIATION_CATEGORIES = [
  'procedural',
  'inclusion_exclusion',
  'consent',
  'prohibited_con_med',
  'missed_visit',
  'assessment',
  'other',
] as const

export type DeviationCategory = typeof DEVIATION_CATEGORIES[number]

export type DeviationStatus = 'open' | 'pi_reviewed' | 'closed'

export interface ProtocolDeviation {
  id: string
  siteId: string
  studyId: string
  subjectId: string
  date: string
  category: DeviationCategory
  description: string
  correctiveAction: string
  piReviewed: boolean
  piReviewDate?: string
  status: DeviationStatus
  reportedBy: string
  createdAt: string
}

export interface CapacityConfig {
  investigatorId: string
  weeklyCapacityHours: number
  siteBaselinePct: number
}

export interface HypotheticalStudy {
  name: string
  assignedInvestigatorIds: string[]
  targetEnrollment: number
  enrollmentRamp: Record<number, number>  // week-from-start → cumulative participants
  avgInvestigatorMinutesPerVisit: number
  avgAssessmentMinutesPerVisit: number
  visitsPerParticipantPerMonth: number
  estimatedContractValue: number
  durationWeeks: number
  startDate: string                        // ISO date string
}

export type FeasibilityVerdict = 'feasible' | 'caution' | 'infeasible'

export interface InvestigatorSimResult {
  weeklyUtilizationPct: number[]   // length = SIMULATOR_WEEKS
  peakWeek: number
  peakPct: number
  feasibilityVerdict: FeasibilityVerdict
  cautionWeek: number | null
  criticalWeek: number | null
}

export interface SimulationResult {
  byInvestigator: Record<string, InvestigatorSimResult>
  estimatedRevenue: number
  overallVerdict: FeasibilityVerdict
}

// ─── Board Session (k2-board daily import) ───────────────────────────────────

export interface BoardSessionEntry {
  subjectId: string
  crioId?: string
  study: string
  investigatorNames: string[]
  status: string
  arrivalTime?: string
  leftTime?: string
  visitDurationMin: number | null
  wasNoShow: boolean
  wasCompleted: boolean
}

export interface BoardSessionMetrics {
  totalScheduled: number
  arrivals: number
  completedVisits: number
  noShows: number
  avgVisitDurationMin: number | null
  byStudy: Record<string, { scheduled: number; arrivals: number; noShows: number; avgDurationMin: number | null }>
  byInvestigator: Record<string, { visits: number }>
}

export interface BoardSession {
  id: string
  siteId: string
  sessionDate: string
  importedAt: string
  importedBy: string
  entryCount: number
  metrics: BoardSessionMetrics
  entries: BoardSessionEntry[]
}

export interface WhatIfScenario {
  id: string
  siteId: string
  createdAt: string
  study: HypotheticalStudy
  result: SimulationResult
}
