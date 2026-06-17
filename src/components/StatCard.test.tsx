import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  it('renders the label, value and optional hint', () => {
    render(<StatCard icon="💰" label="Remaining Fund" value="123.00 €" hint="in the pot" />)
    expect(screen.getByText('Remaining Fund')).toBeInTheDocument()
    expect(screen.getByText('123.00 €')).toBeInTheDocument()
    expect(screen.getByText('in the pot')).toBeInTheDocument()
  })
})
