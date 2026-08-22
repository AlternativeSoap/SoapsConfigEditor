import { parseYaml } from '../yaml/parseYaml'

/** Quest IDs under the top-level `quests:` map in quests.yml. */
export function extractQuestIds(content: string): string[] {
  const { data } = parseYaml(content)
  if (!data || typeof data !== 'object' || Array.isArray(data)) return []
  const root = data as Record<string, unknown>
  const quests = root.quests
  if (!quests || typeof quests !== 'object' || Array.isArray(quests)) return []
  return Object.keys(quests as Record<string, unknown>)
}

/** Tier IDs under the top-level `tiers:` map. */
export function extractTierIds(content: string): string[] {
  const { data } = parseYaml(content)
  if (!data || typeof data !== 'object' || Array.isArray(data)) return []
  const tiers = (data as Record<string, unknown>).tiers
  if (!tiers || typeof tiers !== 'object' || Array.isArray(tiers)) return []
  return Object.keys(tiers as Record<string, unknown>)
}

/** Difficulty IDs under the top-level `difficulties:` map. */
export function extractDifficultyIds(content: string): string[] {
  const { data } = parseYaml(content)
  if (!data || typeof data !== 'object' || Array.isArray(data)) return []
  const difficulties = (data as Record<string, unknown>).difficulties
  if (!difficulties || typeof difficulties !== 'object' || Array.isArray(difficulties)) {
    return []
  }
  return Object.keys(difficulties as Record<string, unknown>)
}
