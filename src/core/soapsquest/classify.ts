import type { MythicCategory } from '../../types'

const NORM = (p: string) => p.replace(/\\/g, '/').toLowerCase()

export function classifySoapsQuestCategory(path: string): MythicCategory {
  const p = NORM(path)
  const base = p.split('/').pop() ?? p
  if (base === 'quests.yml' || base.endsWith('/quests.yml')) {
    return 'quests'
  }
  if (base === 'tiers.yml' || base.endsWith('/tiers.yml')) {
    return 'tiers'
  }
  if (base === 'difficulties.yml' || base.endsWith('/difficulties.yml')) {
    return 'difficulties'
  }
  return 'other'
}

export function detectSoapsQuestPackName(_path: string): string {
  return 'SoapsQuest'
}

/** Prefer an existing quests.yml; otherwise workspace-root quests.yml. */
export function findQuestsYmlPath(files: { path: string }[]): string {
  const found = files.find((f) => {
    const n = f.path.replace(/\\/g, '/').toLowerCase()
    return n === 'quests.yml' || n.endsWith('/quests.yml')
  })
  return found?.path.replace(/\\/g, '/') ?? 'quests.yml'
}
