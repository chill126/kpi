import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }))
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn().mockResolvedValue({ id: 'doc1' }),
  collection: vi.fn((_db, col: string) => col),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}))
vi.mock('../firebase', () => ({ db: {} }))

import * as Sentry from '@sentry/react'
import { addDoc } from 'firebase/firestore'
import { captureError, writeAuditLog } from '../monitoring'

describe('captureError', () => {
  beforeEach(() => vi.clearAllMocks())

  it('always calls Sentry.captureException', () => {
    const err = new Error('test')
    captureError(err, { category: 'firestore' })
    expect(Sentry.captureException).toHaveBeenCalledWith(err, { extra: undefined })
  })

  it('writes to errorLog when critical: true', () => {
    const err = new Error('boom')
    captureError(err, { category: 'auth', critical: true })
    expect(addDoc).toHaveBeenCalledWith(
      'errorLog',
      expect.objectContaining({ level: 'critical', category: 'auth', message: 'boom' }),
    )
  })

  it('does not write to errorLog when critical is false', () => {
    captureError(new Error('minor'), { category: 'render', critical: false })
    expect(addDoc).not.toHaveBeenCalled()
  })

  it('does not write to errorLog when critical is omitted', () => {
    captureError(new Error('minor'), { category: 'firestore' })
    expect(addDoc).not.toHaveBeenCalled()
  })

  it('stringifies non-Error thrown values', () => {
    captureError('string error', { category: 'firestore', critical: true })
    expect(addDoc).toHaveBeenCalledWith(
      'errorLog',
      expect.objectContaining({ message: 'string error' }),
    )
  })

  it('passes context to Sentry extra', () => {
    const err = new Error('ctx')
    captureError(err, { category: 'auth', context: { email: 'a@b.com' } })
    expect(Sentry.captureException).toHaveBeenCalledWith(err, { extra: { email: 'a@b.com' } })
  })
})

describe('writeAuditLog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('writes auditLog doc with required fields', async () => {
    await writeAuditLog('uid123', 'user@test.com', 'auth.sign_in')
    expect(addDoc).toHaveBeenCalledWith(
      'auditLog',
      expect.objectContaining({
        uid: 'uid123',
        email: 'user@test.com',
        action: 'auth.sign_in',
        targetCollection: null,
        targetId: null,
        meta: {},
      }),
    )
  })

  it('passes optional fields through', async () => {
    await writeAuditLog('uid123', 'user@test.com', 'study.create', {
      targetCollection: 'studies',
      targetId: 'study1',
      meta: { studyName: 'ALPHA' },
    })
    expect(addDoc).toHaveBeenCalledWith(
      'auditLog',
      expect.objectContaining({
        targetCollection: 'studies',
        targetId: 'study1',
        meta: { studyName: 'ALPHA' },
      }),
    )
  })

  it('allows null uid for failed sign-in', async () => {
    await writeAuditLog(null, 'user@test.com', 'auth.sign_in_failed')
    expect(addDoc).toHaveBeenCalledWith(
      'auditLog',
      expect.objectContaining({ uid: null }),
    )
  })

  it('writes timestamp from serverTimestamp()', async () => {
    await writeAuditLog('uid1', 'u@t.com', 'auth.sign_out')
    expect(addDoc).toHaveBeenCalledWith(
      'auditLog',
      expect.objectContaining({ timestamp: 'SERVER_TIMESTAMP' }),
    )
  })
})
