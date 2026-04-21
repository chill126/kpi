import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Panel } from './Panel'

describe('Panel', () => {
  it('renders title and children', () => {
    render(<Panel title="Utilization"><div>inner</div></Panel>)
    expect(screen.getByText('Utilization')).toBeInTheDocument()
    expect(screen.getByText('inner')).toBeInTheDocument()
  })
  it('renders action slot', () => {
    render(<Panel title="x" action={<button>Menu</button>}>c</Panel>)
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
  })
  it('title is an accessible heading', () => {
    render(<Panel title="Foo">bar</Panel>)
    expect(screen.getByRole('heading', { name: /foo/i })).toBeInTheDocument()
  })
})
