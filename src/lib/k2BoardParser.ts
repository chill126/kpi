import type { BoardSessionEntry, BoardSessionMetrics } from '@/types'

/** Raw row from a k2-board XLSX export — column headers are the keys */
export interface K2RawRow {
  'Subject ID'?: unknown
  'CRIO ID'?: unknown
  'Study'?: unknown
  'Status'?: unknown
  'Investigator'?: unknown
  'Arrival Time'?: unknown
  'Exit Time'?: unknown
  [key: string]: unknown
}

// Statuses that mean the participant arrived and is (or was) active
const ARRIVED_STATUSES = new Set([
  'Checked In',
  'With Coordinator',
  'In Ratings/Scales',
  'In Procedures',
  'IP / Dosing',
  'Observation',
  'Discharge Ready',
  'Left',
])

function parseHHMM(val: unknown): string | undefined {
  if (!val || typeof val !== 'string') return undefined
  const trimmed = val.trim()
  return /^\d{1,2}:\d{2}$/.test(trimmed) ? trimmed : undefined
}

function durationMin(arrival?: string, exit?: string): number | null {
  if (!arrival || !exit) return null
  const [ah, am] = arrival.split(':').map(Number)
  const [lh, lm] = exit.split(':').map(Number)
  const d = lh * 60 + lm - (ah * 60 + am)
  return d > 0 ? d : null
}

export interface ParseK2Result {
  entries: BoardSessionEntry[]
  errors: string[]
}

/**
 * Parses raw XLSX rows from a k2-board export into typed BoardSessionEntry objects.
 * Pure function — no side effects, no Firebase dependencies.
 */
export function parseK2BoardRows(rows: K2RawRow[]): ParseK2Result {
  if (rows.length === 0) {
    return { entries: [], errors: ['File contains no rows.'] }
  }

  const sample = rows[0]
  const errors: string[] = []
  if (!('Subject ID' in sample)) errors.push('Missing "Subject ID" column — is this a k2-board export?')
  if (!('Study' in sample)) errors.push('Missing "Study" column.')
  if (!('Status' in sample)) errors.push('Missing "Status" column.')
  if (errors.length > 0) return { entries: [], errors }

  const entries: BoardSessionEntry[] = rows
    .map((row): BoardSessionEntry => {
      const status = String(row['Status'] ?? '').trim()
      const investigatorStr = String(row['Investigator'] ?? '').trim()
      const investigatorNames = investigatorStr
        ? investigatorStr.split(',').map((n) => n.trim()).filter(Boolean)
        : []
      const arrivalTime = parseHHMM(row['Arrival Time'])
      const leftTime = parseHHMM(row['Exit Time'])
      return {
        subjectId: String(row['Subject ID'] ?? '').trim(),
        crioId: String(row['CRIO ID'] ?? '').trim() || undefined,
        study: String(row['Study'] ?? '').trim(),
        investigatorNames,
        status,
        arrivalTime,
        leftTime,
        visitDurationMin: durationMin(arrivalTime, leftTime),
        wasNoShow: status === 'No Show',
        wasCompleted: status === 'Left',
      }
    })
    .filter((e) => e.subjectId.length > 0)

  return { entries, errors: [] }
}

/**
 * Derives BoardSessionMetrics from parsed entries.
 * Pure function — safe to call during preview without any side effects.
 */
export function computeBoardSessionMetrics(entries: BoardSessionEntry[]): BoardSessionMetrics {
  const arrived = entries.filter(
    (e) => ARRIVED_STATUSES.has(e.status) || e.arrivalTime !== undefined,
  )
  const completed = entries.filter((e) => e.wasCompleted)
  const noShows = entries.filter((e) => e.wasNoShow)

  const durations = completed
    .map((e) => e.visitDurationMin)
    .filter((d): d is number => d !== null)
  const avgVisitDurationMin =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null

  const byStudy: BoardSessionMetrics['byStudy'] = {}
  const byInvestigator: BoardSessionMetrics['byInvestigator'] = {}

  for (const e of entries) {
    const study = e.study || 'Unknown'
    if (!byStudy[study]) {
      byStudy[study] = { scheduled: 0, arrivals: 0, noShows: 0, avgDurationMin: null }
    }
    byStudy[study].scheduled++
    if (ARRIVED_STATUSES.has(e.status) || e.arrivalTime !== undefined) byStudy[study].arrivals++
    if (e.wasNoShow) byStudy[study].noShows++

    for (const inv of e.investigatorNames) {
      if (!byInvestigator[inv]) byInvestigator[inv] = { visits: 0 }
      if (e.wasCompleted || ARRIVED_STATUSES.has(e.status)) byInvestigator[inv].visits++
    }
  }

  // Per-study avg duration computed from completed entries only
  for (const study of Object.keys(byStudy)) {
    const studyDurations = completed
      .filter((e) => e.study === study)
      .map((e) => e.visitDurationMin)
      .filter((d): d is number => d !== null)
    byStudy[study].avgDurationMin =
      studyDurations.length > 0
        ? Math.round(studyDurations.reduce((a, b) => a + b, 0) / studyDurations.length)
        : null
  }

  return {
    totalScheduled: entries.length,
    arrivals: arrived.length,
    completedVisits: completed.length,
    noShows: noShows.length,
    avgVisitDurationMin,
    byStudy,
    byInvestigator,
  }
}

/** Extracts YYYY-MM-DD from a filename like K2_Participant_Flow_2026-04-22.xlsx. Falls back to today. */
export function extractDateFromFilename(filename: string): string {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : new Date().toISOString().split('T')[0]
}
