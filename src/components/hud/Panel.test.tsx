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
  it('exposes the region landmark with the heading as its accessible name', () => {
    render(<Panel title="Named Panel">body</Panel>)
    expect(screen.getByRole('region', { name: /named panel/i })).toBeInTheDocument()
  })
  it('applies glass-strong class when variant is strong', () => {
    const { container } = render(<Panel title="x" variant="strong">c</Panel>)
    const section = container.querySelector('section')
    expect(section).toHaveClass('glass-strong')
    expect(section).not.toHaveClass('glass')
  })
  it('merges a custom className with the base glass class', () => {
    const { container } = render(<Panel title="x" className="extra-cls">c</Panel>)
    const section = container.querySelector('section')
    expect(section).toHaveClass('glass')
    expect(section).toHaveClass('extra-cls')
  })
})
