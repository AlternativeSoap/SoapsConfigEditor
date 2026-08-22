import type { ClassGeneratorInput } from '../../types'

const DRAFT_KEY = 'soaps-mmocore-class-wizard-draft'

export interface ClassWizardDraft {
  savedAt: number
  step: number
  input: ClassGeneratorInput
  editingPath: string | null
  slotsAdvanced: boolean
  showAdvancedProgression: boolean
}

export function loadClassWizardDraft(): ClassWizardDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as ClassWizardDraft
    if (!data || typeof data.step !== 'number' || !data.input) return null
    data.input.skills = (data.input.skills ?? []).map((s) => ({
      ...s,
      trigger: s.trigger ?? '',
      timer: s.timer,
    }))
    data.input.keyCombos = data.input.keyCombos ?? {}
    data.input.syncElementRow = data.input.syncElementRow ?? true
    return data
  } catch {
    return null
  }
}

export function saveClassWizardDraft(draft: ClassWizardDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    /* quota / private mode */
  }
}

export function clearClassWizardDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* ignore */
  }
}
