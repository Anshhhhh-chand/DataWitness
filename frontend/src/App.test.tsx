import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('DataWitness landing page', () => {
  it('explains the investigation workflow', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /find the records behind the result/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /new investigation/i })).not.toHaveLength(0)
    expect(screen.getByText(/deterministic data debugging/i)).toBeInTheDocument()
  })
})
