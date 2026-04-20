import { describe, it, expect, vi } from 'vitest'
import { createVisit, createVisitBatch, subscribeStudyVisits } from '@/lib/visits'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col-ref'),
  doc: vi.fn(() => 'doc-ref'),
  addDoc: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
  onSnapshot: vi.fn(),
  query: vi.fn(() => 'q-ref'),
  where: vi.fn(),
  orderBy: vi.fn(),
}))
vi.mock('@/lib/firebase', () => ({ db: {} }))

import * as firestore from 'firebase/firestore'

const baseVisit = {
  participantId: 'P001',
  studyId: 'study-1',
  investigatorId: 'inv-1',
  siteId: 'tampa',
  visitType: 'Screening',
  scheduledDate: '2026-05-01',
  completedDate: null,
  status: 'completed' as const,
  durationMinutes: 60,
  actualDurationMinutes: null,
  source: 'manual' as const,
}

describe('createVisit', () => {
  it('calls addDoc and returns the new id', async () => {
    vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'visit-1' } as any)
    const id = await createVisit(baseVisit)
    expect(firestore.addDoc).toHaveBeenCalled()
    expect(id).toBe('visit-1')
  })
})

describe('createVisitBatch', () => {
  it('batches multiple visits in a single commit', async () => {
    const mockBatch = { set: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) }
    vi.mocked(firestore.writeBatch).mockReturnValue(mockBatch as any)

    await createVisitBatch([baseVisit, { ...baseVisit, participantId: 'P002' }])

    expect(mockBatch.set).toHaveBeenCalledTimes(2)
    expect(mockBatch.commit).toHaveBeenCalledTimes(1)
  })
})

describe('subscribeStudyVisits', () => {
  it('calls onData with mapped visits', () => {
    const onData = vi.fn()
    vi.mocked(firestore.onSnapshot).mockImplementation((_q, onNext: any) => {
      onNext({ docs: [{ id: 'v-1', data: () => ({ ...baseVisit }) }] })
      return () => {}
    })

    subscribeStudyVisits('tampa', 'study-1', onData, vi.fn())

    expect(onData).toHaveBeenCalledWith([{ id: 'v-1', ...baseVisit }])
  })
})
