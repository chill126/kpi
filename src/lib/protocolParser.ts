import Anthropic from '@anthropic-ai/sdk'
import type { VisitScheduleEntry } from '@/types'

export interface ParsedProtocol {
  visits: VisitScheduleEntry[]
  assessmentBattery: Record<string, string[]>
  confidence: Record<string, 'high' | 'medium' | 'low'>
}

const EXTRACTION_PROMPT = `You are a clinical trial protocol analysis assistant. Extract the Schedule of Assessments (SoA) from this protocol PDF.

Return ONLY a JSON object with this exact structure — no markdown, no explanation:
{
  "visits": [
    {
      "visitName": "string (e.g. Screening, Visit 1, Week 4)",
      "visitWindow": "string (e.g. Day -28 to -1, Week 4 ±3 days)",
      "investigatorTimeMinutes": number (estimated investigator time in minutes for this visit),
      "coordinatorTimeMinutes": number (estimated coordinator time in minutes),
      "isInvestigatorRequired": boolean (true if a licensed investigator must be present)
    }
  ],
  "assessmentBattery": {
    "visitName": ["ScaleName1", "ScaleName2"]
  },
  "confidence": {
    "visitName": "high" | "medium" | "low"
  }
}

Rules:
- Include ALL visits (screening, treatment, follow-up, unscheduled)
- For investigatorTimeMinutes: sum the duration of all investigator-required procedures at that visit
- For assessmentBattery: list only the scale/test names (e.g. "HAMD-17", "Physical Exam", "MMSE")
- isInvestigatorRequired: true if any procedure requires MD/APRN sign-off
- confidence: "high" if visit details are clearly stated, "medium" if inferred, "low" if uncertain
- If information is ambiguous, use "medium" confidence and your best estimate`

export async function parseProtocolPdf(pdfBase64: string): Promise<ParsedProtocol> {
  const client = new Anthropic({
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true,
  })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          } as any, // document block type not yet in SDK union — required for PDF support
          {
            type: 'text',
            text: EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Failed to parse protocol: no text response from Claude')
  }

  let raw = textBlock.text.trim()
  // Strip markdown code fences if present
  raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')

  try {
    const parsed = JSON.parse(raw) as ParsedProtocol
    if (!Array.isArray(parsed.visits)) {
      throw new Error('Missing visits array')
    }
    return parsed
  } catch {
    throw new Error(`Failed to parse protocol: Claude returned unexpected format`)
  }
}
