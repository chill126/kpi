import { useState } from 'react'
import { FileSpreadsheet, FileText, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/hud/Skeleton'
import { Panel } from '@/components/hud/Panel'
import { EmptyState } from '@/components/hud/EmptyState'
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

function statusBadgeStyle(status: ImportRecord['status']): React.CSSProperties {
  if (status === 'complete') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: 99,
      padding: '2px 8px',
      fontSize: 11,
      fontWeight: 500,
      background: 'rgba(22 163 74 / 0.15)',
      color: 'var(--signal-good)',
    }
  }
  if (status === 'error') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: 99,
      padding: '2px 8px',
      fontSize: 11,
      fontWeight: 500,
      background: 'rgba(220 38 38 / 0.15)',
      color: 'var(--signal-alert)',
    }
  }
  return {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 99,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 500,
    background: 'rgba(217 119 6 / 0.15)',
    color: 'var(--signal-warn)',
  }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
          Import
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
          Import data from external sources into the KPI tracker
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CARDS.map(({ key, title, description, icon: Icon }) => (
          <div
            key={key}
            className="glass"
            style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div className="flex items-start gap-3">
              <div style={{ borderRadius: 8, background: 'rgba(114 90 193 / 0.15)', padding: 8, color: 'var(--accent-primary)' }}>
                <Icon size={20} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{title}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {description}
                </p>
              </div>
            </div>
            <div>
              <Button
                size="sm"
                onClick={() => setOpenDialog(key)}
                style={{ background: 'var(--accent-primary)', border: 'none', color: 'oklch(0.09 0.015 275)' }}
              >
                Import
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Panel title="Import History">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton height={32} />
            <Skeleton height={32} />
            <Skeleton height={32} />
          </div>
        ) : imports.length === 0 ? (
          <EmptyState title="No imports yet" body="Use the import cards above to import data." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left">
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-3 py-2 text-xs font-medium uppercase" style={{ color: 'var(--text-label)' }}>Type</th>
                  <th className="px-3 py-2 text-xs font-medium uppercase" style={{ color: 'var(--text-label)' }}>Uploaded By</th>
                  <th className="px-3 py-2 text-xs font-medium uppercase" style={{ color: 'var(--text-label)' }}>Date</th>
                  <th className="px-3 py-2 text-xs font-medium uppercase text-right" style={{ color: 'var(--text-label)' }}>Rows</th>
                  <th className="px-3 py-2 text-xs font-medium uppercase" style={{ color: 'var(--text-label)' }}>Status</th>
                  <th className="px-3 py-2 text-xs font-medium uppercase" style={{ color: 'var(--text-label)' }}>Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {imports.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>
                      {TYPE_LABELS[record.type]}
                    </td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>
                      {record.uploadedBy}
                    </td>
                    <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {formatDateTime(record.uploadedAt)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>
                      {record.rowCount}
                    </td>
                    <td className="px-3 py-2">
                      <span style={statusBadgeStyle(record.status)}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {record.errors.length === 0 ? '—' : `${record.errors.length} issue${record.errors.length === 1 ? '' : 's'}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

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
