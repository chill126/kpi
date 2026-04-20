import type { ParsedProtocol } from '@/lib/protocolParser'

interface Props {
  onParsed: (result: ParsedProtocol) => void
  onError: (msg: string) => void
}

export function ProtocolUpload(_props: Props) {
  return <button disabled className="text-xs text-slate-400 border border-dashed border-slate-300 rounded px-3 py-1.5">Upload PDF (coming soon)</button>
}
