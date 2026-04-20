import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { parseProtocolPdf, type ParsedProtocol } from '@/lib/protocolParser'
import { FileText, Loader2 } from 'lucide-react'

interface Props {
  onParsed: (result: ParsedProtocol) => void
  onError: (msg: string) => void
}

export function ProtocolUpload({ onParsed, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  async function handleFile(file: File) {
    if (file.type !== 'application/pdf') {
      onError('Please upload a PDF file.')
      return
    }
    setLoading(true)
    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      const binary = Array.from(bytes).map((b) => String.fromCharCode(b)).join('')
      const base64 = btoa(binary)
      const result = await parseProtocolPdf(base64)
      onParsed(result)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Protocol parsing failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? (
          <>
            <Loader2 size={14} className="mr-1.5 animate-spin" aria-hidden="true" />
            Parsing PDF…
          </>
        ) : (
          <>
            <FileText size={14} className="mr-1.5" aria-hidden="true" />
            Upload Protocol PDF
          </>
        )}
      </Button>
    </>
  )
}
