import type { ParsedProtocol } from '@/lib/protocolParser'
import type { VisitScheduleEntry } from '@/types'

interface Props {
  parsed: ParsedProtocol
  onConfirm: (visits: VisitScheduleEntry[], battery: Record<string, string[]>) => void
  onCancel: () => void
}

export function ProtocolReviewTable(_props: Props) {
  return <div data-stub="ProtocolReviewTable" />
}
