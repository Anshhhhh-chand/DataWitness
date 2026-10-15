import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChangesPage } from './ChangesPage'

const { getChanges, getFindings, replayWitness } = vi.hoisted(() => ({
  getChanges: vi.fn(),
  getFindings: vi.fn(),
  replayWitness: vi.fn(),
}))

vi.mock('../api/endpoints', () => ({ getChanges, getFindings, replayWitness }))

describe('changes inspector', () => {
  beforeEach(() => {
    getChanges.mockResolvedValue({ items: [
      { id: 'change-a', record_id: 'A-100', kind: 'modified', changed_columns: ['amount'], before_values: { amount: 10 }, after_values: { amount: 20 }, heuristic_impact: 10, in_minimal_set: true },
      { id: 'change-b', record_id: 'B-200', kind: 'added', changed_columns: ['amount'], before_values: null, after_values: { amount: 5 }, heuristic_impact: 5, in_minimal_set: false },
    ], total: 2 })
    getFindings.mockResolvedValue([{ id: 'finding-a', change_id: 'change-a', record_id: 'A-100', rank: 1, score: 10, explanation: 'Removing this row changes the output.', in_minimal_set: true, output_without_change: 10, estimated_effect: 10 }])
    replayWitness.mockResolvedValue({ matches_target: true })
  })

  it('filters records and opens before/after evidence', async () => {
    const user = userEvent.setup()
    render(<ChangesPage id="investigation-1" onBack={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('A-100')).toBeInTheDocument())
    expect(screen.getByText('Verified')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: /search record ids/i }), 'B-200')
    expect(screen.queryByText('A-100')).not.toBeInTheDocument()
    expect(screen.getByText('B-200')).toBeInTheDocument()
    await user.clear(screen.getByRole('textbox', { name: /search record ids/i }))
    await user.click(screen.getByText('A-100'))
    expect(screen.getByRole('heading', { name: 'A-100' })).toBeInTheDocument()
    expect(screen.getByText(/Removing this row changes the output/i)).toBeInTheDocument()
  })
})
