import type { FileRecord } from '../../types'
import {
  DEFAULT_DIFFICULTY_IDS,
  DEFAULT_TIER_IDS,
} from '../../data/soapsquest/defaults'
import { extractDifficultyIds, extractQuestIds, extractTierIds } from './questIds'
import type { SoapsQuestCatalog } from './autocomplete'

function findFile(files: FileRecord[], name: string): FileRecord | undefined {
  return files.find((f) => {
    const n = f.path.replace(/\\/g, '/').toLowerCase()
    return n === name || n.endsWith(`/${name}`)
  })
}

/** Tier, difficulty, and quest ids from the open workspace for YAML autocomplete. */
export function buildSoapsQuestCatalog(files: FileRecord[]): SoapsQuestCatalog {
  const tiers = extractTierIds(findFile(files, 'tiers.yml')?.content ?? '')
  const difficulties = extractDifficultyIds(findFile(files, 'difficulties.yml')?.content ?? '')
  const questsFile = findFile(files, 'quests.yml')
  const questIds = questsFile ? extractQuestIds(questsFile.content) : []

  return {
    tierIds: tiers.length > 0 ? tiers : [...DEFAULT_TIER_IDS],
    difficultyIds: difficulties.length > 0 ? difficulties : [...DEFAULT_DIFFICULTY_IDS],
    questIds,
  }
}
