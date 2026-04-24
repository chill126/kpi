import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StudyForm } from '@/components/studies/StudyForm'
import type { Investigator } from '@/types'

vi.mock('@/lib/studies', () => ({
  createStudy: vi.fn(),
  updateStudy: vi.fn(),
}))

import * as studiesLib from '@/lib/studies'

const investigators: Investigator[] = [
  {
    id: 'inv-1',
    name: 'Dr. Wilson',
    credentials: 'MD',
    role: 'PI',
    siteId: 'tampa',
    weeklyCapacityHours: 40,
    siteBaselinePct: 15,
    assignedStudies: [],
  },
]

describe('StudyForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders all required fields', () => {
    render(
      <StudyForm
        open={true}
        onOpenChange={vi.fn()}
        investigators={investigators}
        siteId="tampa"
        onSave={vi.fn()}
      />,
    )
    expect(screen.getByLabelText(/study name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sponsor/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/therapeutic area/i)).toBeInTheDocument()
  })

  it('shows validation error when name is empty on submit', async () => {
    render(
      <StudyForm
        open={true}
        onOpenChange={vi.fn()}
        investigators={investigators}
        siteId="tampa"
        onSave={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
  })

  it('calls createStudy and onSave on valid create submit', async () => {
    vi.mocked(studiesLib.createStudy).mockResolvedValue('new-study-id')
    const onSave = vi.fn()

    render(
      <StudyForm
        open={true}
        onOpenChange={vi.fn()}
        investigators={investigators}
        siteId="tampa"
        onSave={onSave}
      />,
    )

    await userEvent.type(screen.getByLabelText(/study name/i), 'Study Beta')
    await userEvent.type(screen.getByLabelText(/sponsor/i), 'Pharma Corp')
    await userEvent.selectOptions(screen.getByLabelText(/therapeutic area/i), 'Neurology')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(studiesLib.createStudy).toHaveBeenCalled()
      expect(onSave).toHaveBeenCalledWith('new-study-id')
    })
  })
})
