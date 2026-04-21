import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SnapshotImportDialog } from '@/components/enrollment/SnapshotImportDialog'

vi.mock('@/lib/enrollmentSnapshots', () => ({
  bulkCreateEnrollmentSnapshots: vi.fn(),
}))

vi.mock('@/lib/imports', () => ({
  createImportRecord: vi.fn().mockResolvedValue('import-1'),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { displayName: 'Test User', uid: 'uid-1' } }),
}))

vi.mock('xlsx', () => {
  return {
    read: vi.fn(),
    utils: { sheet_to_json: vi.fn() },
    SSF: { parse_date_code: vi.fn() },
  }
})

import * as snapshotsLib from '@/lib/enrollmentSnapshots'
import * as XLSX from 'xlsx'

function makeFile(name = 'snapshots.csv'): File {
  return new File(['x'], name, { type: 'text/csv' })
}

describe('SnapshotImportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders file input', () => {
    render(
      <SnapshotImportDialog
        open={true}
        onOpenChange={vi.fn()}
        studyId="study-1"
        siteId="tampa"
      />,
    )
    expect(screen.getByLabelText(/upload snapshots file/i)).toBeInTheDocument()
  })

  it('shows error when file has no date column', async () => {
    vi.mocked(XLSX.read).mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} },
    } as unknown as ReturnType<typeof XLSX.read>)
    vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([{ foo: 1, bar: 2 }])

    render(
      <SnapshotImportDialog
        open={true}
        onOpenChange={vi.fn()}
        studyId="study-1"
        siteId="tampa"
      />,
    )

    const input = screen.getByLabelText(/upload snapshots file/i) as HTMLInputElement
    await userEvent.upload(input, makeFile())

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/no date column found/i)
    })
  })

  it('calls bulkCreateEnrollmentSnapshots on import', async () => {
    vi.mocked(XLSX.read).mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} },
    } as unknown as ReturnType<typeof XLSX.read>)
    vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
      { Date: '2026-04-01', Randomizations: 5, Screens: 8, Prescreens: 10, Active: 5, Completions: 0 },
      { Date: '2026-05-01', Randomizations: 8, Screens: 12, Prescreens: 15, Active: 8, Completions: 0 },
    ])
    vi.mocked(snapshotsLib.bulkCreateEnrollmentSnapshots).mockResolvedValue(undefined)
    const onOpenChange = vi.fn()

    render(
      <SnapshotImportDialog
        open={true}
        onOpenChange={onOpenChange}
        studyId="study-1"
        siteId="tampa"
      />,
    )

    const input = screen.getByLabelText(/upload snapshots file/i) as HTMLInputElement
    await userEvent.upload(input, makeFile())

    const importButton = await screen.findByRole('button', { name: /import 2 rows/i })
    await userEvent.click(importButton)

    await waitFor(() => {
      expect(snapshotsLib.bulkCreateEnrollmentSnapshots).toHaveBeenCalledTimes(1)
    })
    const call = vi.mocked(snapshotsLib.bulkCreateEnrollmentSnapshots).mock.calls[0][0]
    expect(call).toHaveLength(2)
    expect(call[0]).toMatchObject({
      studyId: 'study-1',
      siteId: 'tampa',
      date: '2026-04-01',
      randomizations: 5,
    })
  })
})
