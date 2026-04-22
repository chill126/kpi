import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { NearCapacityList } from './NearCapacityList'

describe('NearCapacityList', () => {
  it('filters entries below 75%', () => {
    render(<NearCapacityList entries={[
      { name: 'Dr. A', utilization: 50, totalHours: 20, capacityHours: 40 },
      { name: 'Dr. B', utilization: 80, totalHours: 32, capacityHours: 40 },
      { name: 'Dr. C', utilization: 92, totalHours: 37, capacityHours: 40 },
    ]} />)
    expect(screen.queryByText(/dr\. a/i)).not.toBeInTheDocument()
    expect(screen.getByText(/dr\. b/i)).toBeInTheDocument()
    expect(screen.getByText(/dr\. c/i)).toBeInTheDocument()
  })
  it('sorts descending by utilization', () => {
    render(<NearCapacityList entries={[
      { name: 'Dr. Mid', utilization: 80, totalHours: 32, capacityHours: 40 },
      { name: 'Dr. Top', utilization: 94, totalHours: 37, capacityHours: 40 },
    ]} />)
    const rows = screen.getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent(/dr\. top/i)
  })
  it('renders empty state when none at or near', () => {
    render(<NearCapacityList entries={[{ name: 'x', utilization: 10, totalHours: 4, capacityHours: 40 }]} />)
    expect(screen.getByText(/all under capacity/i)).toBeInTheDocument()
  })
  it('renders hours breakdown beside the utilization percent', () => {
    render(<NearCapacityList entries={[
      { name: 'Dr. Top', utilization: 94, totalHours: 37.5, capacityHours: 40 },
    ]} />)
    expect(screen.getByText('37.5h / 40h')).toBeInTheDocument()
    expect(screen.getByText('94%')).toBeInTheDocument()
  })
})
