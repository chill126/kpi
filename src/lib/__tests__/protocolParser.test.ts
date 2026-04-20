import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseProtocolPdf } from '@/lib/protocolParser'

vi.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = vi.fn(function () {
    return {
      messages: {
        create: vi.fn(),
      },
    }
  })
  return { default: MockAnthropic, Anthropic: MockAnthropic }
})

import Anthropic from '@anthropic-ai/sdk'

const mockResponse = {
  visits: [
    {
      visitName: 'Screening',
      visitWindow: 'Day -28 to -1',
      investigatorTimeMinutes: 45,
      coordinatorTimeMinutes: 60,
      isInvestigatorRequired: true,
    },
  ],
  assessmentBattery: {
    Screening: ['HAMD-17', 'MADRS'],
  },
  confidence: {
    Screening: 'high',
  },
}

describe('parseProtocolPdf', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls Anthropic with a document block and returns parsed result', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
    })
    vi.mocked(Anthropic).mockImplementation(function () {
      return { messages: { create: mockCreate } } as any
    })

    const result = await parseProtocolPdf('base64pdfdata==')

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-6',
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({ type: 'document' }),
            ]),
          }),
        ]),
      }),
    )
    expect(result.visits).toHaveLength(1)
    expect(result.visits[0].visitName).toBe('Screening')
    expect(result.assessmentBattery['Screening']).toContain('HAMD-17')
  })

  it('throws a readable error when Claude returns malformed JSON', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Sorry, I cannot process this.' }],
    })
    vi.mocked(Anthropic).mockImplementation(function () {
      return { messages: { create: mockCreate } } as any
    })

    await expect(parseProtocolPdf('base64data==')).rejects.toThrow(/failed to parse/i)
  })
})
