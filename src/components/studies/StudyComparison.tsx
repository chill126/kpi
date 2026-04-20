import type { Investigator, Study } from '@/types'

interface Props {
  studyIds: [string, string]
  studies: Study[]
  investigators: Investigator[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StudyComparison(_props: Props) {
  return null
}
