import { describe, it, expect, vi, beforeEach } from 'vitest'
import { subscribeSiteVisits } from '@/lib/visits'
import { subscribeSiteAssessments } from '@/lib/assessments'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col-ref'),
  doc: vi.fn(() => 'doc-ref'),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(() => 'query-ref'),
  where: vi.fn(),
  orderBy: vi.fn(),
  arrayUnion: vi.fn((val) => ({ __arrayUnion: val })),
  writeBatch: vi.fn(() => ({ set: vi.fn(), commit: vi.fn() })),
}))
vi.mock('@/lib/firebase', () => ({ db: {} }))

import * as firestore from 'firebase/firestore'

const mockVisit = {
  participantId: 'P001', studyId: 'study-1', investigatorId: 'inv-1', siteId: 'tampa',
  visitType: 'Screening', scheduledDate: '2026-04-14', completedDate: '2026-04-14',
  status: 'completed' as const, durationMinutes: 45, actualDurationMinutes: 50, source: 'manual' as const,
}

const mockAssessment = {
  investigatorId: 'inv-1', studyId: 'study-1', siteId: 'tampa',
  visitId: null, scaleType: 'HAMD-17', durationMinutes: 20, date: '2026-04-14',
}

beforeEach(() => vi.clearAllMocks())

describe('subscribeSiteVisits', () => {
  it('subscribes to all site visits and maps data', () => {
    const onData = vi.fn()
    const onError = vi.fn()
    vi.mocked(firestore.onSnapshot).mockImplementation((_q, onNext: any) => {
      onNext({ docs: [{ id: 'v-1', data: () => ({ ...mockVisit }) }] })
      return () => {}
    })

    subscribeSiteVisits('tampa', onData, onError)

    expect(firestore.where).toHaveBeenCalledWith('siteId', '==', 'tampa')
    expect(onData).toHaveBeenCalledWith([{ id: 'v-1', ...mockVisit }])
  })
})

describe('subscribeSiteAssessments', () => {
  it('subscribes to all site assessments and maps data', () => {
    const onData = vi.fn()
    const onError = vi.fn()
    vi.mocked(firestore.onSnapshot).mockImplementation((_q, onNext: any) => {
      onNext({ docs: [{ id: 'a-1', data: () => ({ ...mockAssessment }) }] })
      return () => {}
    })

    subscribeSiteAssessments('tampa', onData, onError)

    expect(firestore.where).toHaveBeenCalledWith('siteId', '==', 'tampa')
    expect(onData).toHaveBeenCalledWith([{ id: 'a-1', ...mockAssessment }])
  })
})
