import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DeviationForm } from '@/components/deviations/DeviationForm'
import type { ProtocolDeviation } from '@/types'

vi.mock('@/lib/protocolDeviations', () => ({
  createProtocolDeviation: vi.fn().mockResolvedValue('new-id'),
  updateProtocolDeviation: vi.fn().mockResolvedValue(undefined),
}))

import * as deviationsLib from '@/lib/protocolDeviations'

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  studyId: 'study-1',
  siteId: 'site-1',
  reportedBy: 'Alice',
  canManage: true,
}

function makeDeviation(overrides: Partial<ProtocolDeviation> = {}): ProtocolDeviation {
  return {
    id: 'dev-1',
    siteId: 'site-1',
    studyId: 'study-1',
    subjectId: 'K2-001',
    date: '2026-04-01',
    category: 'procedural',
    description: 'Missed PK window',
    correctiveAction: 'Retrained staff',
    piReviewed: true,
    piReviewDate: '2026-04-05',
    status: 'pi_reviewed',
    reportedBy: 'Alice',
    createdAt: '2026-04-01T10:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DeviationForm', () => {
  it('renders the dialog when open', () => {
    render(<DeviationForm {...baseProps} />)
    expect(screen.getByRole('dialog', { name: /log protocol deviation/i })).toBeInTheDocument()
  })

  it('disables save when subject ID is empty', () => {
    render(<DeviationForm {...baseProps} />)
    expect(screen.getByRole('button', { name: /log deviation/i })).toBeDisabled()
  })

  it('enables save when subject and description filled', async () => {
    const user = userEvent.setup()
    render(<DeviationForm {...baseProps} />)
    await user.type(screen.getByLabelText(/subject id/i), 'K2-001')
    await user.type(screen.getByLabelText(/description/i), 'Missed window')
    expect(screen.getByRole('button', { name: /log deviation/i })).toBeEnabled()
  })

  it('calls createProtocolDeviation with correct data', async () => {
    const user = userEvent.setup()
    render(<DeviationForm {...baseProps} />)
    await user.type(screen.getByLabelText(/subject id/i), 'K2-002')
    await user.type(screen.getByLabelText(/description/i), 'Consent re-signed late')
    await user.click(screen.getByRole('button', { name: /log deviation/i }))
    expect(deviationsLib.createProtocolDeviation).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectId: 'K2-002',
        description: 'Consent re-signed late',
        studyId: 'study-1',
        siteId: 'site-1',
        reportedBy: 'Alice',
        status: 'open',
      }),
    )
  })

  it('pre-populates fields and shows Edit title in edit mode', () => {
    render(<DeviationForm {...baseProps} deviation={makeDeviation()} />)
    expect(screen.getByRole('dialog', { name: /edit protocol deviation/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/subject id/i)).toHaveValue('K2-001')
    expect(screen.getByLabelText(/description/i)).toHaveValue('Missed PK window')
  })

  it('calls updateProtocolDeviation on edit save', async () => {
    const user = userEvent.setup()
    const dev = makeDeviation()
    render(<DeviationForm {...baseProps} deviation={dev} />)
    await user.clear(screen.getByLabelText(/subject id/i))
    await user.type(screen.getByLabelText(/subject id/i), 'K2-999')
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(deviationsLib.updateProtocolDeviation).toHaveBeenCalledWith(
      'dev-1',
      expect.objectContaining({ subjectId: 'K2-999' }),
    )
  })

  it('shows study picker when studyId is empty and studyOptions provided', () => {
    render(
      <DeviationForm
        {...baseProps}
        studyId=""
        studyOptions={[{ id: 'study-1', name: 'Study Alpha' }]}
      />,
    )
    expect(screen.getByLabelText(/^study/i)).toBeInTheDocument()
    expect(screen.getByText('Study Alpha')).toBeInTheDocument()
  })

  it('shows PI review fields when canManage is true', () => {
    render(<DeviationForm {...baseProps} />)
    expect(screen.getByLabelText(/pi reviewed/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
  })

  it('hides PI review fields when canManage is false', () => {
    render(<DeviationForm {...baseProps} canManage={false} />)
    expect(screen.queryByLabelText(/pi reviewed/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/status/i)).not.toBeInTheDocument()
  })

  it('shows PI review date field when PI Reviewed checked', async () => {
    const user = userEvent.setup()
    render(<DeviationForm {...baseProps} />)
    await user.click(screen.getByLabelText(/pi reviewed/i))
    expect(screen.getByLabelText(/pi review date/i)).toBeInTheDocument()
  })

  it('closes when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<DeviationForm {...baseProps} onOpenChange={onOpenChange} />)
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
