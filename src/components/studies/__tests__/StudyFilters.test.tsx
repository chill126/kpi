import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StudyFilters, type StudyFilterState } from '@/components/studies/StudyFilters'

const defaultFilters: StudyFilterState = { status: 'all', therapeuticArea: '', hideCompleted: false }

describe('StudyFilters', () => {
  beforeEach(() => {
    // Radix Select uses pointer capture APIs absent in jsdom
    Element.prototype.hasPointerCapture = vi.fn(() => false)
    Element.prototype.setPointerCapture = vi.fn()
    Element.prototype.releasePointerCapture = vi.fn()
  })
  it('renders status and indication filter controls', () => {
    render(<StudyFilters filters={defaultFilters} onChange={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /therapeutic area/i })).toBeInTheDocument()
  })

  it('calls onChange when indication select changes', async () => {
    const onChange = vi.fn()
    render(<StudyFilters filters={defaultFilters} onChange={onChange} />)
    await userEvent.click(screen.getByRole('combobox', { name: /therapeutic area/i }))
    await userEvent.click(screen.getByRole('option', { name: 'Psychiatry' }))
    expect(onChange).toHaveBeenCalled()
  })
})
