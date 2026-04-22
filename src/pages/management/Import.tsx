import { useState } from 'react'
import { FileSpreadsheet, FileText, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useImports } from '@/hooks/useImports'
import { ClinicalConductorImportDialog } from '@/components/imports/ClinicalConductorImportDialog'
import { AdvarraImportDialog } from '@/components/imports/AdvarraImportDialog'
import { EnrollmentSnapshotImportDialog } from '@/components/imports/EnrollmentSnapshotImportDialog'
import { ProtocolPdfImportDialog } from '@/components/imports/ProtocolPdfImportDialog'
import { K2BoardImportDialog } from '@/components/imports/K2BoardImportDialog'
import type { Import as ImportRecord } from '@/types'

type DialogKey =
  | 'clinical_conductor'
  | 'advarra_ereg'
  | 'enrollment_snapshot'
  | 'protocol_pdf'
  | 'k2_board_export'
  | null

interface CardConfig {
  key: Exclude<DialogKey, null>
  title: string
  description: string
  icon: typeof FileSpreadsheet
}

const CARDS: CardConfig[] = [
  {
    key: 'clinical_conductor',
    title: 'Clinical Conductor',
    description: 'Import visit history exported from Clinical Conductor CTMS.',
    icon: FileSpreadsheet,
  },
  {
    key: 'advarra_ereg',
    title: 'Advarra e-Reg',
    description: 'Import delegation of authority logs from Advarra e-Reg.',
    icon: FileSpreadsheet,
  },
  {
    key: 'enrollment_snapshot',
    title: 'Enrollment Snapshots',
    description: 'Import historical enrollment snapshots for a study.',
    icon: FileSpreadsheet,
  },
  {
    key: 'protocol_pdf',
    title: 'Protocol PDF',
    description: 'Parse a protocol PDF into a visit schedule and assessment battery.',
    icon: FileText,
  },
  {
    key: 'k2_board_export',
    title: 'k2 Board Session',
    description: 'Import a daily participant-flow session exported from the k2 clinic board.',
    icon: LayoutGrid,
  },
]

const TYPE_LABELS: Record<ImportRecord['type'], string> = {
  clinical_conductor: 'Clinical Conductor',
  advarra_ereg: 'Advarra e-Reg',
  enrollment_snapshot: 'Enrollment Snapshots',
  protocol_pdf: 'Protocol PDF',
  k2_board_export: 'k2 Board Session',
}

function statusBadgeClass(status: ImportRecord['status']): string {
  if (status === 'complete')
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
  if (status === 'error')
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200'
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const datePart = d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
  const timePart = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${datePart} ${timePart}`
}

export function Import() {
  const { imports, loading } = useImports()
  const [openDialog, setOpenDialog] = useState<DialogKey>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Import</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Import data from external sources into the KPI tracker
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CARDS.map(({ key, title, description, icon: Icon }) => (
          <div
            key={key}
            className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-3"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-teal-50 dark:bg-teal-900/30 p-2 text-teal-600 dark:text-teal-300">
                <Icon size={20} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {description}
                </p>
              </div>
            </div>
            <div>
              <Button
                size="sm"
                onClick={() => setOpenDialog(key)}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                Import
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">
          Import History
        </h2>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : imports.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No imports yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Uploaded By</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2 text-right">Rows</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {imports.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-3 py-2 text-slate-800 dark:text-slate-100">
                      {TYPE_LABELS[record.type]}
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                      {record.uploadedBy}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300 tabular-nums">
                      {formatDateTime(record.uploadedAt)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">
                      {record.rowCount}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(record.status)}`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                      {record.errors.length === 0 ? '—' : `${record.errors.length} issue${record.errors.length === 1 ? '' : 's'}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ClinicalConductorImportDialog
        open={openDialog === 'clinical_conductor'}
        onOpenChange={(next) => setOpenDialog(next ? 'clinical_conductor' : null)}
      />
      <AdvarraImportDialog
        open={openDialog === 'advarra_ereg'}
        onOpenChange={(next) => setOpenDialog(next ? 'advarra_ereg' : null)}
      />
      <EnrollmentSnapshotImportDialog
        open={openDialog === 'enrollment_snapshot'}
        onOpenChange={(next) => setOpenDialog(next ? 'enrollment_snapshot' : null)}
      />
      <ProtocolPdfImportDialog
        open={openDialog === 'protocol_pdf'}
        onOpenChange={(next) => setOpenDialog(next ? 'protocol_pdf' : null)}
      />
      <K2BoardImportDialog
        open={openDialog === 'k2_board_export'}
        onOpenChange={(next) => setOpenDialog(next ? 'k2_board_export' : null)}
      />
    </div>
  )
}
