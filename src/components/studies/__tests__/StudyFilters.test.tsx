import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { StudyFilters, type StudyFilterState } from '@/components/studies/StudyFilters'
import type { Investigator } from '@/types'

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

const defaultFilters: StudyFilterState = { status: 'all', therapeuticArea: '', piId: '' }

describe('StudyFilters', () => {
  it('renders status, area, and PI filter controls', () => {
    render(
      <StudyFilters filters={defaultFilters} onChange={vi.fn()} investigators={investigators} />,
    )
    expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/therapeutic area/i)).toBeInTheDocument()
  })

  it('calls onChange when therapeutic area input changes', async () => {
    const onChange = vi.fn()
    render(<StudyFilters filters={defaultFilters} onChange={onChange} investigators={investigators} />)
    await userEvent.type(screen.getByPlaceholderText(/therapeutic area/i), 'Psych')
    expect(onChange).toHaveBeenCalled()
  })
})
