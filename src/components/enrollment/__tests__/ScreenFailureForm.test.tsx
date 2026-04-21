import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ScreenFailureForm } from '@/components/enrollment/ScreenFailureForm'
import type { ScreenFailure } from '@/types'

vi.mock('@/lib/screenFailures', () => ({
  createScreenFailure: vi.fn(),
  updateScreenFailure: vi.fn(),
}))
vi.mock('@/hooks/useSite', () => ({
  useSite: () => ({ siteId: 'tampa', setActiveSite: vi.fn() }),
}))

import * as screenFailuresLib from '@/lib/screenFailures'

describe('ScreenFailureForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders all form fields', () => {
    render(
      <ScreenFailureForm
        open={true}
        onOpenChange={vi.fn()}
        studyId="study-1"
        siteId="tampa"
      />,
    )
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/source/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/reason category 1/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
  })

  it('shows error when date is missing', async () => {
    render(
      <ScreenFailureForm
        open={true}
        onOpenChange={vi.fn()}
        studyId="study-1"
        siteId="tampa"
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(screen.getByText(/date is required/i)).toBeInTheDocument()
  })

  it('shows error when no reason category is selected', async () => {
    render(
      <ScreenFailureForm
        open={true}
        onOpenChange={vi.fn()}
        studyId="study-1"
        siteId="tampa"
      />,
    )
    await userEvent.type(screen.getByLabelText(/date/i), '2026-04-01')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(screen.getByText(/at least one reason is required/i)).toBeInTheDocument()
  })

  it('calls createScreenFailure with correct data on submit', async () => {
    vi.mocked(screenFailuresLib.createScreenFailure).mockResolvedValue('new-id')
    const onOpenChange = vi.fn()

    render(
      <ScreenFailureForm
        open={true}
        onOpenChange={onOpenChange}
        studyId="study-1"
        siteId="tampa"
      />,
    )

    await userEvent.type(screen.getByLabelText(/date/i), '2026-04-01')
    await userEvent.selectOptions(
      screen.getByLabelText(/reason category 1/i),
      'inclusion_criteria',
    )
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screenFailuresLib.createScreenFailure).toHaveBeenCalledWith({
        studyId: 'study-1',
        siteId: 'tampa',
        date: '2026-04-01',
        reasons: [{ category: 'inclusion_criteria' }],
      })
    })
  })

  it('pre-fills form and calls updateScreenFailure in edit mode', async () => {
    vi.mocked(screenFailuresLib.updateScreenFailure).mockResolvedValue(undefined)
    const existing: ScreenFailure = {
      id: 'sf-1',
      studyId: 'study-1',
      siteId: 'tampa',
      date: '2026-03-15',
      source: 'Main Campus',
      reasons: [{ category: 'lab_values', detail: 'ALT elevated' }],
      notes: 'Repeat next week',
    }

    render(
      <ScreenFailureForm
        open={true}
        onOpenChange={vi.fn()}
        studyId="study-1"
        siteId="tampa"
        failure={existing}
      />,
    )

    expect(screen.getByLabelText(/date/i)).toHaveValue('2026-03-15')
    expect(screen.getByLabelText(/source/i)).toHaveValue('Main Campus')
    expect(screen.getByLabelText(/reason detail 1/i)).toHaveValue('ALT elevated')

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screenFailuresLib.updateScreenFailure).toHaveBeenCalledWith(
        'sf-1',
        expect.objectContaining({
          studyId: 'study-1',
          date: '2026-03-15',
          reasons: [{ category: 'lab_values', detail: 'ALT elevated' }],
          source: 'Main Campus',
          notes: 'Repeat next week',
        }),
      )
    })
  })
})
