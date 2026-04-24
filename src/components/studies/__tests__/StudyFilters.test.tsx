import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { StudyFilters, type StudyFilterState } from '@/components/studies/StudyFilters'

const defaultFilters: StudyFilterState = { status: 'all', therapeuticArea: '' }

describe('StudyFilters', () => {
  it('renders status and indication filter controls', () => {
    render(<StudyFilters filters={defaultFilters} onChange={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /therapeutic area/i })).toBeInTheDocument()
  })

  it('calls onChange when indication select changes', async () => {
    const onChange = vi.fn()
    render(<StudyFilters filters={defaultFilters} onChange={onChange} />)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /therapeutic area/i }), 'Psychiatry')
    expect(onChange).toHaveBeenCalled()
  })
})
