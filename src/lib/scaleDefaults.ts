export const SCALE_DURATIONS: Record<string, number> = {
  'HAMD-17': 20,
  'MADRS': 20,
  'ADAS-Cog': 45,
  'PANSS': 30,
  'CGI': 10,
  'PHQ-9': 10,
  'GAD-7': 10,
  'YMRS': 15,
  'CDR': 30,
  'BPRS': 20,
  'MMSE': 15,
  'Informed Consent Review': 45,
  'Physical Exam': 20,
}

export const SCALE_NAMES = Object.keys(SCALE_DURATIONS)

export function getScaleDuration(scaleType: string): number {
  return SCALE_DURATIONS[scaleType] ?? 15
}
