import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NewInvestigationPage } from './NewInvestigationPage'

const { uploadDataset, createInvestigation } = vi.hoisted(() => ({
  uploadDataset: vi.fn(),
  createInvestigation: vi.fn(),
}))

vi.mock('../api/endpoints', () => ({ uploadDataset, createInvestigation }))

const upload = (role: 'before' | 'after') => ({
  upload_id: `${role}-id`, role, filename: `${role}.csv`, size_bytes: 20, sha256: 'hash', row_count: 2,
  columns: [{ name: 'id', dtype: 'String', nullable: false }, { name: 'amount', dtype: 'Int64', nullable: false }],
  preview_rows: [{ id: 'a', amount: 1 }],
})

describe('new investigation form', () => {
  beforeEach(() => {
    uploadDataset.mockReset()
    createInvestigation.mockReset()
    uploadDataset.mockImplementation(async (_file: File, role: 'before' | 'after') => upload(role))
    createInvestigation.mockResolvedValue({ investigation_id: 'investigation-1', status: 'queued' })
  })

  it('uploads both datasets and requires a stable ID before starting', async () => {
    const user = userEvent.setup()
    const onCreated = vi.fn()
    const { container } = render(<NewInvestigationPage onCreated={onCreated} onBack={vi.fn()} />)
    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="file"]'))
    await user.upload(inputs[0], new File(['id,amount\na,1'], 'before.csv', { type: 'text/csv' }))
    await user.upload(inputs[1], new File(['id,amount\na,1'], 'after.csv', { type: 'text/csv' }))
    await waitFor(() => expect(screen.getByText('before.csv')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /start investigation/i })).toBeDisabled()
    await user.selectOptions(screen.getByLabelText(/stable record id/i), 'id')
    expect(screen.getByRole('button', { name: /start investigation/i })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: /start investigation/i }))
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('investigation-1'))
  })
})
