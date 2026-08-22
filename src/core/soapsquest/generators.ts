import { yamlQuoted } from '../mythicmobs/generators'
import { extractQuestIds } from './questIds'

export interface QuestObjectiveInput {
  type: string
  target: string
  amount: number
}

export interface QuestGeneratorInput {
  id: string
  display: string
  material: string
  tier: string
  difficulty: string
  sequential: boolean
  lockToPlayer: boolean
  objectives: QuestObjectiveInput[]
  xp: number
  money: number
  sigils: number
}

const QUESTS_HEADER = `# SoapsQuest quests (plugins/SoapsQuest/quests.yml).
# Use New → New quest to add one. After editing, run /sq reload on the server.
`

/** YAML for a single quest entry (no top-level quests: wrapper). */
export function generateQuestYaml(input: QuestGeneratorInput): string {
  const id = input.id.trim()
  const lines: string[] = [
    `${id}:`,
    `  display: ${yamlQuoted(input.display)}`,
    `  material: ${input.material.trim() || 'PAPER'}`,
    `  tier: ${input.tier.trim() || 'common'}`,
    `  difficulty: ${input.difficulty.trim() || 'easy'}`,
    `  sequential: ${input.sequential}`,
    `  lock-to-player: ${input.lockToPlayer}`,
    `  objectives:`,
  ]

  for (const obj of input.objectives) {
    lines.push(`    - type: ${obj.type}`)
    lines.push(`      target: ${obj.target.trim()}`)
    lines.push(`      amount: ${Math.max(1, Math.floor(obj.amount) || 1)}`)
  }

  lines.push(`  reward:`)
  const rewardLines: string[] = []
  if (input.xp > 0) rewardLines.push(`    xp: ${input.xp}`)
  if (input.money > 0) rewardLines.push(`    money: ${input.money}`)
  if (input.sigils > 0) rewardLines.push(`    sigils: ${input.sigils}`)
  if (rewardLines.length === 0) {
    rewardLines.push(`    xp: 1`)
  }
  lines.push(...rewardLines)

  return `${lines.join('\n')}\n`
}

export type MergeQuestsResult =
  | { ok: true; content: string; created: boolean }
  | { ok: false; error: string }

/**
 * Insert a quest block under `quests:` in an existing or new quests.yml.
 * Does not overwrite an existing quest id.
 */
export function mergeIntoQuestsYml(
  existingContent: string | null,
  questYaml: string,
  questId: string,
): MergeQuestsResult {
  const id = questId.trim()
  if (!id) {
    return { ok: false, error: 'Quest id is required.' }
  }

  if (existingContent == null || !existingContent.trim()) {
    return {
      ok: true,
      created: true,
      content: `${QUESTS_HEADER}\nquests:\n${indentBlock(questYaml.trimEnd(), 2)}\n\ncitizens-npcs: {}\n`,
    }
  }

  const existingIds = extractQuestIds(existingContent)
  if (existingIds.some((q) => q.toLowerCase() === id.toLowerCase())) {
    return {
      ok: false,
      error: `Quest ${id} already exists in quests.yml. Choose a different id.`,
    }
  }

  const questsKey = findQuestsKeyLine(existingContent)
  if (questsKey == null) {
    const base = existingContent.trimEnd()
    return {
      ok: true,
      created: false,
      content: `${base}\n\nquests:\n${indentBlock(questYaml.trimEnd(), 2)}\n`,
    }
  }

  const insertAt = findInsertOffsetAfterQuestsMap(existingContent, questsKey)
  const indented = `\n${indentBlock(questYaml.trimEnd(), 2)}\n`
  const next =
    existingContent.slice(0, insertAt) + indented + existingContent.slice(insertAt)

  return { ok: true, created: false, content: next }
}

function indentBlock(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  return text
    .split('\n')
    .map((line) => (line.length ? pad + line : line))
    .join('\n')
}

/** Index of the line that starts `quests:` (0-based line start offset). */
function findQuestsKeyLine(content: string): { lineStart: number; lineEnd: number } | null {
  const re = /^quests:\s*(?:#.*)?$/m
  const match = re.exec(content)
  if (!match || match.index === undefined) return null
  const lineStart = match.index
  const lineEnd = lineStart + match[0].length
  return { lineStart, lineEnd }
}

/**
 * Find where to insert a new quest: before the next top-level key after `quests:`,
 * or at end of file if quests is the last section.
 */
function findInsertOffsetAfterQuestsMap(
  content: string,
  questsKey: { lineStart: number; lineEnd: number },
): number {
  const afterKey = questsKey.lineEnd
  const rest = content.slice(afterKey)
  // Top-level keys start at column 0 (immediately after a newline).
  const topLevelKey = /\n([A-Za-z0-9_-]+):/g
  let match: RegExpExecArray | null
  while ((match = topLevelKey.exec(rest)) !== null) {
    const key = match[1]
    if (key === 'quests') continue
    return afterKey + match.index
  }
  return content.length
}
