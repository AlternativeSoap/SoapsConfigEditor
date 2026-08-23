import { yamlQuoted } from '../mythicmobs/generators'
import { objectiveTypeInfo } from '../../data/soapsquest/objectiveTypes'
import { extractQuestIds } from './questIds'

export interface QuestObjectiveInput {
  type: string
  target: string
  amount: number
  command?: string
  placeholder?: string
  level?: number
  vehicle?: string
  text?: string
  slot?: string
  item?: string
}

export interface QuestItemRewardInput {
  material: string
  amount: number
  name?: string
  chance: number
}

export interface QuestGeneratorInput {
  id: string
  display: string
  material: string
  tier: string
  difficulty: string
  sequential: boolean
  lockToPlayer: boolean
  unlockMinLevel?: number
  unlockPermission?: string
  unlockCost?: number
  unlockSigilCost?: number
  objectives: QuestObjectiveInput[]
  xp: number
  money: number
  sigils: number
  itemRewards: QuestItemRewardInput[]
}

const QUESTS_HEADER = `# SoapsQuest quests (plugins/SoapsQuest/quests.yml).
# Use New → New quest to add one. After editing, run /sq reload on the server.
`

function objectiveYamlLines(obj: QuestObjectiveInput): string[] {
  const info = objectiveTypeInfo(obj.type)
  const mode = info?.mode ?? 'target_amount'
  const lines = [`    - type: ${obj.type}`]

  switch (mode) {
    case 'command':
      lines.push(`      command: ${yamlQuoted((obj.command ?? obj.target).trim() || 'help')}`)
      lines.push(`      amount: ${Math.max(1, Math.floor(obj.amount) || 1)}`)
      break
    case 'placeholder':
      lines.push(`      placeholder: ${(obj.placeholder ?? obj.target).trim() || 'player_level'}`)
      lines.push(`      amount: ${Math.max(1, Math.floor(obj.amount) || 1)}`)
      break
    case 'level_only':
      lines.push(`      level: ${Math.max(1, Math.floor(obj.level ?? obj.amount) || 1)}`)
      break
    case 'vehicle_amount':
      lines.push(`      vehicle: ${(obj.vehicle ?? obj.target).trim() || 'ANY'}`)
      lines.push(`      amount: ${Math.max(1, Math.floor(obj.amount) || 1)}`)
      break
    case 'text_amount':
      lines.push(`      text: ${yamlQuoted((obj.text ?? obj.target).trim() || 'hello')}`)
      lines.push(`      amount: ${Math.max(1, Math.floor(obj.amount) || 1)}`)
      break
    case 'equip':
      lines.push(`      target: ${(obj.target).trim() || 'DIAMOND_CHESTPLATE'}`)
      lines.push(`      slot: ${(obj.slot ?? 'CHEST').trim() || 'CHEST'}`)
      lines.push(`      amount: ${Math.max(1, Math.floor(obj.amount) || 1)}`)
      break
    case 'deliver_npc':
      lines.push(`      target: ${yamlQuoted((obj.target).trim() || '1')}`)
      lines.push(`      item: ${(obj.item ?? 'WHEAT:16').trim() || 'WHEAT:16'}`)
      lines.push(`      amount: ${Math.max(1, Math.floor(obj.amount) || 1)}`)
      break
    case 'land_level':
      lines.push(`      target: ${yamlQuoted((obj.target).trim() || 'MyLand')}`)
      lines.push(`      level: ${Math.max(1, Math.floor(obj.level ?? obj.amount) || 1)}`)
      break
    case 'amount_only':
      lines.push(`      amount: ${Math.max(1, Math.floor(obj.amount) || 1)}`)
      break
    default:
      lines.push(`      target: ${(obj.target).trim() || 'ANY'}`)
      lines.push(`      amount: ${Math.max(1, Math.floor(obj.amount) || 1)}`)
      break
  }

  return lines
}

function conditionsYamlLines(input: QuestGeneratorInput): string[] {
  const lines: string[] = []
  const minLevel = input.unlockMinLevel ?? 0
  if (minLevel > 0) lines.push(`    min-level: ${Math.floor(minLevel)}`)
  const permission = (input.unlockPermission ?? '').trim()
  if (permission) lines.push(`    permission: ${yamlQuoted(permission)}`)
  const cost = input.unlockCost ?? 0
  if (cost > 0) lines.push(`    cost: ${cost}`)
  const sigilCost = input.unlockSigilCost ?? 0
  if (sigilCost > 0) lines.push(`    sigil-cost: ${Math.floor(sigilCost)}`)
  return lines
}

function itemRewardYamlLines(items: QuestItemRewardInput[]): string[] {
  const lines: string[] = ['    items:']
  for (const item of items) {
    const material = item.material.trim()
    if (!material) continue
    lines.push(`      - material: ${material}`)
    const amount = Math.max(1, Math.floor(item.amount) || 1)
    if (amount !== 1) lines.push(`        amount: ${amount}`)
    const name = (item.name ?? '').trim()
    if (name) lines.push(`        name: ${yamlQuoted(name)}`)
    const chance = item.chance ?? 100
    if (chance !== 100) lines.push(`        chance: ${Math.max(0, Math.min(100, chance))}`)
  }
  return lines
}

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
  ]

  const conditionLines = conditionsYamlLines(input)
  if (conditionLines.length > 0) {
    lines.push(`  conditions:`)
    lines.push(...conditionLines)
  }

  lines.push(`  objectives:`)

  for (const obj of input.objectives) {
    lines.push(...objectiveYamlLines(obj))
  }

  lines.push(`  reward:`)
  const rewardLines: string[] = []
  if (input.xp > 0) rewardLines.push(`    xp: ${input.xp}`)
  if (input.money > 0) rewardLines.push(`    money: ${input.money}`)
  if (input.sigils > 0) rewardLines.push(`    sigils: ${input.sigils}`)
  const validItems = (input.itemRewards ?? []).filter((item) => item.material.trim())
  if (validItems.length > 0) {
    rewardLines.push(...itemRewardYamlLines(validItems))
  }
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

export type ReplaceQuestResult =
  | { ok: true; content: string }
  | { ok: false; error: string }

/** Replace an existing quest block, or insert if missing. Used by edit wizard. */
export function replaceQuestInQuestsYml(
  existingContent: string,
  originalQuestId: string,
  questYaml: string,
  newQuestId: string,
): ReplaceQuestResult {
  if (!existingContent.trim()) {
    return mergeIntoQuestsYml(null, questYaml, newQuestId) as ReplaceQuestResult
  }

  const original = originalQuestId.trim()
  const nextId = newQuestId.trim()
  if (!nextId) return { ok: false, error: 'Quest id is required.' }

  const existingIds = extractQuestIds(existingContent)
  if (nextId.toLowerCase() !== original.toLowerCase()) {
    if (existingIds.some((q) => q.toLowerCase() === nextId.toLowerCase())) {
      return {
        ok: false,
        error: `Quest ${nextId} already exists in quests.yml. Choose a different id.`,
      }
    }
  }

  const range = findQuestBlockRange(existingContent, original)
  if (!range) {
    return mergeIntoQuestsYml(existingContent, questYaml, nextId)
  }

  let content = existingContent
  if (nextId.toLowerCase() !== original.toLowerCase()) {
    content = content.slice(0, range.start) + content.slice(range.end)
    return mergeIntoQuestsYml(content, questYaml, nextId)
  }

  const indented = indentBlock(questYaml.trimEnd(), 2)
  const next =
    content.slice(0, range.start) + indented + (content.slice(range.end).startsWith('\n') ? '' : '\n') + content.slice(range.end)
  return { ok: true, content: next }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Range of a quest entry under quests: (start index through end, exclusive). */
export function findQuestBlockRange(
  content: string,
  questId: string,
): { start: number; end: number } | null {
  const re = new RegExp(`^  ${escapeRegex(questId)}:\\s*(?:#.*)?$`, 'm')
  const match = re.exec(content)
  if (!match || match.index === undefined) return null
  const start = match.index
  const afterStart = start + match[0].length
  const rest = content.slice(afterStart)
  const nextBlock = /\n(  [a-z0-9_]+:|[a-z0-9_-]+:)/im.exec(rest)
  const end = nextBlock ? afterStart + nextBlock.index : content.length
  return { start, end }
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
  const topLevelKey = /\n([A-Za-z0-9_-]+):/g
  let match: RegExpExecArray | null
  while ((match = topLevelKey.exec(rest)) !== null) {
    const key = match[1]
    if (key === 'quests') continue
    return afterKey + match.index
  }
  return content.length
}
