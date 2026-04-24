import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  subscribeStudies,
  createStudy,
  updateStudyStatus,
  cloneStudy,
} from '@/lib/studies'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col-ref'),
  doc: vi.fn(() => 'doc-ref'),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(() => 'query-ref'),
  where: vi.fn(),
  orderBy: vi.fn(),
  arrayUnion: vi.fn((val) => ({ __arrayUnion: val })),
}))

vi.mock('@/lib/firebase', () => ({ db: {}, auth: { currentUser: null } }))
vi.mock('@/lib/monitoring', () => ({ writeAuditLog: vi.fn(() => Promise.resolve()) }))

import * as firestore from 'firebase/firestore'

beforeEach(() => vi.clearAllMocks())

const mockStudy = {
  name: 'Study Alpha',
  sponsor: 'Pharma Co',
  sponsorProtocolId: 'PC-001',
  therapeuticArea: 'Psychiatry',
  phase: 'Phase II' as const,
  status: 'enrolling' as const,
  siteId: 'tampa',
  piId: 'inv-1',
  assignedInvestigators: [],
  targetEnrollment: 20,
  startDate: '2026-01-01',
  expectedEndDate: '2026-12-31',
  visitSchedule: [],
  assessmentBattery: {},
  adminOverride: { perStudyWeeklyHours: 2, perParticipantOverheadPct: 10 },
  parsedFromProtocol: false,
  enrollmentData: { prescreens: 0, screens: 0, randomizations: 0, active: 0, completions: 0 },
  statusHistory: [],
}

describe('subscribeStudies', () => {
  it('calls onSnapshot with query scoped to siteId', () => {
    const onData = vi.fn()
    const onError = vi.fn()
    vi.mocked(firestore.onSnapshot).mockImplementation((_q, onNext: any) => {
      onNext({ docs: [{ id: 'study-1', data: () => ({ ...mockStudy }) }] })
      return () => {}
    })

    subscribeStudies('tampa', onData, onError)

    expect(onData).toHaveBeenCalledWith([{ id: 'study-1', ...mockStudy }])
  })
})

describe('createStudy', () => {
  it('calls addDoc and returns the new id', async () => {
    vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'new-study-id' } as any)

    const id = await createStudy(mockStudy)

    expect(firestore.addDoc).toHaveBeenCalled()
    expect(id).toBe('new-study-id')
  })
})

describe('updateStudyStatus', () => {
  it('calls updateDoc with new status and appended history entry', async () => {
    vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

    await updateStudyStatus('study-1', 'paused', 'uid-123')

    expect(firestore.updateDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({ status: 'paused' }),
    )
  })
})

describe('cloneStudy', () => {
  it('creates a new study with reset enrollment and On Hold status', async () => {
    vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'cloned-id' } as any)

    const id = await cloneStudy({ id: 'orig', ...mockStudy }, 'Study Alpha (Copy)')

    expect(id).toBe('cloned-id')
    const callArg = vi.mocked(firestore.addDoc).mock.calls[0][1] as any
    expect(callArg.status).toBe('on_hold')
    expect(callArg.name).toBe('Study Alpha (Copy)')
    expect(callArg.enrollmentData.randomizations).toBe(0)
  })
})
