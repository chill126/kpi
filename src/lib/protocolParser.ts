import type { VisitScheduleEntry } from '@/types'

export interface ParsedProtocol {
  visits: VisitScheduleEntry[]
  assessmentBattery: Record<string, string[]>
  confidence: Record<string, 'high' | 'medium' | 'low'>
}

export async function parseProtocolPdf(_pdfBase64: string): Promise<ParsedProtocol> {
  throw new Error('Not implemented — install @anthropic-ai/sdk first (Task 21)')
}
