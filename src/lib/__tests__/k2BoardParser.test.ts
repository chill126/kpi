import { describe, it, expect } from 'vitest'
import {
  parseK2BoardRows,
  computeBoardSessionMetrics,
  extractDateFromFilename,
} from '../k2BoardParser'
import type { BoardSessionEntry } from '@/types'

const BASE_ROW = {
  'Subject ID': 'S-001',
  'CRIO ID': 'C-001',
  'Study': 'PINE',
  'Status': 'Left',
  'Investigator': 'Wilson',
  'Arrival Time': '08:30',
  'Exit Time': '11:45',
}

// ── parseK2BoardRows ──────────────────────────────────────────────────────────

describe('parseK2BoardRows', () => {
  it('returns error when rows is empty', () => {
    const { entries, errors } = parseK2BoardRows([])
    expect(entries).toHaveLength(0)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('returns error when required columns are missing', () => {
    const { errors } = parseK2BoardRows([{ Investigator: 'Wilson' }])
    expect(errors.some((e) => e.includes('Subject ID'))).toBe(true)
  })

  it('parses a completed visit correctly', () => {
    const { entries, errors } = parseK2BoardRows([BASE_ROW])
    expect(errors).toHaveLength(0)
    expect(entries).toHaveLength(1)
    const e = entries[0]
    expect(e.subjectId).toBe('S-001')
    expect(e.crioId).toBe('C-001')
    expect(e.study).toBe('PINE')
    expect(e.status).toBe('Left')
    expect(e.wasCompleted).toBe(true)
    expect(e.wasNoShow).toBe(false)
    expect(e.arrivalTime).toBe('08:30')
    expect(e.leftTime).toBe('11:45')
    expect(e.visitDurationMin).toBe(195) // 08:30→11:45 = 3h15m = 195 min
  })

  it('parses multiple comma-separated investigator names', () => {
    const { entries } = parseK2BoardRows([{ ...BASE_ROW, Investigator: 'Wilson, Wick' }])
    expect(entries[0].investigatorNames).toEqual(['Wilson', 'Wick'])
  })

  it('flags no-show entries correctly', () => {
    const { entries } = parseK2BoardRows([{ ...BASE_ROW, Status: 'No Show' }])
    expect(entries[0].wasNoShow).toBe(true)
    expect(entries[0].wasCompleted).toBe(false)
  })

  it('returns null visitDurationMin when times are blank', () => {
    const { entries } = parseK2BoardRows([
      { ...BASE_ROW, 'Arrival Time': '', 'Exit Time': '' },
    ])
    expect(entries[0].visitDurationMin).toBeNull()
  })

  it('returns null visitDurationMin for non-HH:MM time strings', () => {
    const { entries } = parseK2BoardRows([
      { ...BASE_ROW, 'Arrival Time': 'N/A', 'Exit Time': 'N/A' },
    ])
    expect(entries[0].visitDurationMin).toBeNull()
  })

  it('skips rows where Subject ID is blank', () => {
    const { entries } = parseK2BoardRows([
      { ...BASE_ROW, 'Subject ID': '' },
      BASE_ROW,
    ])
    expect(entries).toHaveLength(1)
    expect(entries[0].subjectId).toBe('S-001')
  })

  it('omits crioId when the column is blank', () => {
    const { entries } = parseK2BoardRows([{ ...BASE_ROW, 'CRIO ID': '' }])
    expect(entries[0].crioId).toBeUndefined()
  })

  it('handles missing optional columns gracefully', () => {
    const minRow = { 'Subject ID': 'S-001', 'Study': 'PINE', 'Status': 'Left' }
    const { entries, errors } = parseK2BoardRows([minRow])
    expect(errors).toHaveLength(0)
    expect(entries[0].investigatorNames).toEqual([])
    expect(entries[0].arrivalTime).toBeUndefined()
    expect(entries[0].visitDurationMin).toBeNull()
  })
})

// ── computeBoardSessionMetrics ────────────────────────────────────────────────

function makeEntry(overrides: Partial<BoardSessionEntry> = {}): BoardSessionEntry {
  return {
    subjectId: 'S-001',
    study: 'PINE',
    investigatorNames: ['Wilson'],
    status: 'Left',
    arrivalTime: '08:00',
    leftTime: '10:00',
    visitDurationMin: 120,
    wasNoShow: false,
    wasCompleted: true,
    ...overrides,
  }
}

describe('computeBoardSessionMetrics', () => {
  it('counts totals correctly across statuses', () => {
    const entries = [
      makeEntry({ subjectId: 'S-001' }),
      makeEntry({
        subjectId: 'S-002',
        status: 'No Show',
        wasNoShow: true,
        wasCompleted: false,
        arrivalTime: undefined,
        leftTime: undefined,
        visitDurationMin: null,
      }),
      makeEntry({
        subjectId: 'S-003',
        status: 'Scheduled',
        wasCompleted: false,
        arrivalTime: undefined,
        leftTime: undefined,
        visitDurationMin: null,
      }),
    ]
    const m = computeBoardSessionMetrics(entries)
    expect(m.totalScheduled).toBe(3)
    expect(m.completedVisits).toBe(1)
    expect(m.noShows).toBe(1)
    expect(m.arrivals).toBe(1)
  })

  it('computes average visit duration from completed visits only', () => {
    const entries = [
      makeEntry({ visitDurationMin: 100 }),
      makeEntry({ visitDurationMin: 200 }),
      makeEntry({
        status: 'No Show',
        wasNoShow: true,
        wasCompleted: false,
        visitDurationMin: null,
      }),
    ]
    expect(computeBoardSessionMetrics(entries).avgVisitDurationMin).toBe(150)
  })

  it('returns null avgVisitDurationMin when no completed visits have durations', () => {
    const m = computeBoardSessionMetrics([makeEntry({ visitDurationMin: null })])
    expect(m.avgVisitDurationMin).toBeNull()
  })

  it('groups scheduled and no-show counts by study', () => {
    const entries = [
      makeEntry({ study: 'PINE' }),
      makeEntry({ study: 'PINE', status: 'No Show', wasNoShow: true, wasCompleted: false, visitDurationMin: null }),
      makeEntry({ study: 'CEDAR' }),
    ]
    const m = computeBoardSessionMetrics(entries)
    expect(m.byStudy['PINE'].scheduled).toBe(2)
    expect(m.byStudy['PINE'].noShows).toBe(1)
    expect(m.byStudy['CEDAR'].scheduled).toBe(1)
  })

  it('counts per-investigator visits from arrived entries', () => {
    const entries = [
      makeEntry({ investigatorNames: ['Wilson'] }),
      makeEntry({ investigatorNames: ['Wilson', 'Wick'] }),
      makeEntry({
        investigatorNames: ['Wick'],
        status: 'No Show',
        wasNoShow: true,
        wasCompleted: false,
        visitDurationMin: null,
      }),
    ]
    const m = computeBoardSessionMetrics(entries)
    expect(m.byInvestigator['Wilson'].visits).toBe(2)
    expect(m.byInvestigator['Wick'].visits).toBe(1) // no-show not counted
  })

  it('returns empty byStudy and byInvestigator for zero entries', () => {
    const m = computeBoardSessionMetrics([])
    expect(m.totalScheduled).toBe(0)
    expect(Object.keys(m.byStudy)).toHaveLength(0)
    expect(Object.keys(m.byInvestigator)).toHaveLength(0)
  })
})

// ── extractDateFromFilename ───────────────────────────────────────────────────

describe('extractDateFromFilename', () => {
  it('extracts date from a standard k2-board export filename', () => {
    expect(extractDateFromFilename('K2_Participant_Flow_2026-04-22.xlsx')).toBe('2026-04-22')
  })

  it('falls back to today when no date pattern is in the filename', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(extractDateFromFilename('export.xlsx')).toBe(today)
  })

  it('picks up a date anywhere in the filename', () => {
    expect(extractDateFromFilename('board-2025-12-31-export.xlsx')).toBe('2025-12-31')
  })
})
