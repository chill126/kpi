import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { NearCapacityList } from './NearCapacityList'

describe('NearCapacityList', () => {
  it('filters entries below 75%', () => {
    render(<NearCapacityList entries={[
      { name: 'Dr. A', utilization: 50 },
      { name: 'Dr. B', utilization: 80 },
      { name: 'Dr. C', utilization: 92 },
    ]} />)
    expect(screen.queryByText(/dr\. a/i)).not.toBeInTheDocument()
    expect(screen.getByText(/dr\. b/i)).toBeInTheDocument()
    expect(screen.getByText(/dr\. c/i)).toBeInTheDocument()
  })
  it('sorts descending by utilization', () => {
    render(<NearCapacityList entries={[
      { name: 'Dr. Mid', utilization: 80 },
      { name: 'Dr. Top', utilization: 94 },
    ]} />)
    const rows = screen.getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent(/dr\. top/i)
  })
  it('renders empty state when none at or near', () => {
    render(<NearCapacityList entries={[{ name: 'x', utilization: 10 }]} />)
    expect(screen.getByText(/all under capacity/i)).toBeInTheDocument()
  })
})
