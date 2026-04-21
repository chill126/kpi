import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DeviationTable } from '@/components/deviations/DeviationTable'
import type { ProtocolDeviation } from '@/types'

vi.mock('@/lib/protocolDeviations', () => ({
  deleteProtocolDeviation: vi.fn().mockResolvedValue(undefined),
}))

import * as deviationsLib from '@/lib/protocolDeviations'

function makeDeviation(overrides: Partial<ProtocolDeviation> = {}): ProtocolDeviation {
  return {
    id: 'dev-1',
    siteId: 'site-1',
    studyId: 'study-1',
    subjectId: 'K2-001',
    date: '2026-04-01',
    category: 'procedural',
    description: 'Missed PK draw window',
    correctiveAction: 'Retrained staff',
    piReviewed: false,
    status: 'open',
    reportedBy: 'Alice',
    createdAt: '2026-04-01T10:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DeviationTable', () => {
  it('shows empty state when no deviations', () => {
    render(
      <DeviationTable deviations={[]} canManage={false} onEdit={vi.fn()} />,
    )
    expect(screen.getByText(/no protocol deviations logged/i)).toBeInTheDocument()
  })

  it('renders deviation rows', () => {
    render(
      <DeviationTable deviations={[makeDeviation()]} canManage={false} onEdit={vi.fn()} />,
    )
    expect(screen.getByText('K2-001')).toBeInTheDocument()
    expect(screen.getByText('Missed PK draw window')).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('shows study column when studyNameById provided', () => {
    render(
      <DeviationTable
        deviations={[makeDeviation()]}
        canManage={false}
        onEdit={vi.fn()}
        studyNameById={{ 'study-1': 'Study Alpha' }}
      />,
    )
    expect(screen.getByText('Study Alpha')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /study/i })).toBeInTheDocument()
  })

  it('does not show study column without studyNameById', () => {
    render(
      <DeviationTable deviations={[makeDeviation()]} canManage={false} onEdit={vi.fn()} />,
    )
    expect(screen.queryByRole('columnheader', { name: /study/i })).not.toBeInTheDocument()
  })

  it('shows edit and delete buttons when canManage', () => {
    render(
      <DeviationTable deviations={[makeDeviation()]} canManage={true} onEdit={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('hides action buttons when canManage is false', () => {
    render(
      <DeviationTable deviations={[makeDeviation()]} canManage={false} onEdit={vi.fn()} />,
    )
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
  })

  it('calls onEdit when Edit is clicked', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const dev = makeDeviation()
    render(<DeviationTable deviations={[dev]} canManage={true} onEdit={onEdit} />)
    await user.click(screen.getByRole('button', { name: /edit/i }))
    expect(onEdit).toHaveBeenCalledWith(dev)
  })

  it('calls deleteProtocolDeviation when Delete is clicked', async () => {
    const user = userEvent.setup()
    render(
      <DeviationTable deviations={[makeDeviation()]} canManage={true} onEdit={vi.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: /delete/i }))
    expect(deviationsLib.deleteProtocolDeviation).toHaveBeenCalledWith('dev-1')
  })

  it('shows PI review date when piReviewed and piReviewDate set', () => {
    render(
      <DeviationTable
        deviations={[makeDeviation({ piReviewed: true, piReviewDate: '2026-04-10' })]}
        canManage={false}
        onEdit={vi.fn()}
      />,
    )
    expect(screen.getByText(/Apr 10/i)).toBeInTheDocument()
  })

  it('shows PI Reviewed status badge', () => {
    render(
      <DeviationTable
        deviations={[makeDeviation({ status: 'pi_reviewed' })]}
        canManage={false}
        onEdit={vi.fn()}
      />,
    )
    expect(screen.getByText('PI Reviewed')).toBeInTheDocument()
  })

  it('shows Closed status badge', () => {
    render(
      <DeviationTable
        deviations={[makeDeviation({ status: 'closed' })]}
        canManage={false}
        onEdit={vi.fn()}
      />,
    )
    expect(screen.getByText('Closed')).toBeInTheDocument()
  })
})
