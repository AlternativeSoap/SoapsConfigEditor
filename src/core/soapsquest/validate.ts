import type { FileRecord } from '../../types'
import { parseYaml } from '../yaml/parseYaml'
import {
  extractDifficultyIds,
  extractQuestIds,
  extractTierIds,
} from './questIds'

export type QuestIssueType =
  | 'missing_display'
  | 'missing_objectives'
  | 'unknown_tier'
  | 'unknown_difficulty'
  | 'missing_quest_reference'

export interface QuestValidationIssue {
  type: QuestIssueType
  filePath: string
  questId: string
  message: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function findQuestsFile(files: FileRecord[]): FileRecord | undefined {
  return files.find((f) => {
    const n = f.path.replace(/\\/g, '/').toLowerCase()
    return n === 'quests.yml' || n.endsWith('/quests.yml')
  })
}

function findTiersContent(files: FileRecord[]): string {
  const f = files.find((file) => {
    const n = file.path.replace(/\\/g, '/').toLowerCase()
    return n === 'tiers.yml' || n.endsWith('/tiers.yml')
  })
  return f?.content ?? ''
}

function findDifficultiesContent(files: FileRecord[]): string {
  const f = files.find((file) => {
    const n = file.path.replace(/\\/g, '/').toLowerCase()
    return n === 'difficulties.yml' || n.endsWith('/difficulties.yml')
  })
  return f?.content ?? ''
}

function collectQuestReferences(raw: unknown, questIds: Set<string>): void {
  const q = asRecord(raw)
  if (!q) return

  const reward = asRecord(q.reward)
  const chain = asRecord(reward?.quest)
  const chainId = chain?.['quest-id']
  if (typeof chainId === 'string' && chainId.trim()) {
    questIds.add(chainId.trim())
  }
}

function collectCitizensReferences(root: Record<string, unknown>): string[] {
  const refs: string[] = []
  const npcs = asRecord(root['citizens-npcs'])
  if (!npcs) return refs
  for (const entry of Object.values(npcs)) {
    const npc = asRecord(entry)
    const questId = npc?.quest
    if (typeof questId === 'string' && questId.trim()) refs.push(questId.trim())
  }
  return refs
}

export function validateSoapsQuest(files: FileRecord[]): QuestValidationIssue[] {
  const questsFile = findQuestsFile(files)
  if (!questsFile) return []

  const issues: QuestValidationIssue[] = []
  const path = questsFile.path
  const content = questsFile.content

  const parseResult = parseYaml(content)
  if (parseResult.issues.length > 0) {
    issues.push({
      type: 'missing_display',
      filePath: path,
      questId: '',
      message: `quests.yml has a YAML syntax error. Fix it before /sq reload.`,
    })
    return issues
  }

  const root = asRecord(parseResult.data)
  const quests = asRecord(root?.quests)
  if (!quests) {
    issues.push({
      type: 'missing_objectives',
      filePath: path,
      questId: '',
      message: 'quests.yml is missing a quests: section.',
    })
    return issues
  }

  const definedIds = new Set(extractQuestIds(content))
  const tierIds = new Set(extractTierIds(findTiersContent(files)))
  const difficultyIds = new Set(extractDifficultyIds(findDifficultiesContent(files)))
  const hasTiers = tierIds.size > 0
  const hasDifficulties = difficultyIds.size > 0

  const idCounts = new Map<string, number>()
  for (const id of Object.keys(quests)) {
    idCounts.set(id, (idCounts.get(id) ?? 0) + 1)
  }

  const referenced = new Set<string>()
  for (const raw of Object.values(quests)) {
    collectQuestReferences(raw, referenced)
  }
  for (const ref of collectCitizensReferences(root ?? {})) {
    referenced.add(ref)
  }

  for (const [questId, raw] of Object.entries(quests)) {
    const q = asRecord(raw)
    if (!q) continue

    if (!str(q.display).trim()) {
      issues.push({
        type: 'missing_display',
        filePath: path,
        questId,
        message: `Quest ${questId} is missing display. /sq reload will reject this entry.`,
      })
    }

    const objectives = q.objectives
    if (!Array.isArray(objectives) || objectives.length === 0) {
      issues.push({
        type: 'missing_objectives',
        filePath: path,
        questId,
        message: `Quest ${questId} has no objectives. Add at least one objective.`,
      })
    }

    const tier = str(q.tier)
    if (tier && hasTiers && !tierIds.has(tier)) {
      issues.push({
        type: 'unknown_tier',
        filePath: path,
        questId,
        message: `Quest ${questId} uses tier "${tier}" which is not in tiers.yml.`,
      })
    }

    const difficulty = str(q.difficulty)
    if (difficulty && hasDifficulties && !difficultyIds.has(difficulty)) {
      issues.push({
        type: 'unknown_difficulty',
        filePath: path,
        questId,
        message: `Quest ${questId} uses difficulty "${difficulty}" which is not in difficulties.yml.`,
      })
    }
  }

  for (const refId of referenced) {
    if (!definedIds.has(refId)) {
      issues.push({
        type: 'missing_quest_reference',
        filePath: path,
        questId: refId,
        message: `Referenced quest "${refId}" is not defined under quests:.`,
      })
    }
  }

  return issues
}

function str(value: unknown): string {
  if (value == null) return ''
  return String(value)
}
