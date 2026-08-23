import {
  defaultObjectiveForType,
} from '../../data/soapsquest/objectiveTypes'
import type {
  QuestGeneratorInput,
  QuestItemRewardInput,
  QuestObjectiveInput,
} from './generators'
import { parseYaml } from '../yaml/parseYaml'

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function str(value: unknown, fallback = ''): string {
  if (value == null) return fallback
  return String(value)
}

export function parseObjective(raw: unknown): QuestObjectiveInput | null {
  const o = asRecord(raw)
  if (!o) return null
  const type = str(o.type, 'kill')
  return {
    type,
    target: str(o.target),
    amount: Math.max(1, num(o.amount, 1)),
    command: o.command != null ? str(o.command) : undefined,
    placeholder: o.placeholder != null ? str(o.placeholder) : undefined,
    level: o.level != null ? num(o.level, 1) : undefined,
    vehicle: o.vehicle != null ? str(o.vehicle) : undefined,
    text: o.text != null ? str(o.text) : undefined,
    slot: o.slot != null ? str(o.slot) : undefined,
    item: o.item != null ? str(o.item) : undefined,
  }
}

export function parseQuestFromRecord(
  questId: string,
  raw: unknown,
): QuestGeneratorInput | null {
  const q = asRecord(raw)
  if (!q) return null

  const objectives: QuestObjectiveInput[] = []
  if (Array.isArray(q.objectives)) {
    for (const entry of q.objectives) {
      const parsed = parseObjective(entry)
      if (parsed) objectives.push(parsed)
    }
  }

  const reward = asRecord(q.reward)
  const conditions = asRecord(q.conditions)
  const info = defaultObjectiveForType('kill')

  const itemRewards: QuestItemRewardInput[] = []
  if (Array.isArray(reward?.items)) {
    for (const entry of reward.items) {
      const item = asRecord(entry)
      if (!item) continue
      const material = str(item.material).trim()
      if (!material) continue
      itemRewards.push({
        material,
        amount: Math.max(1, num(item.amount, 1)),
        name: item.name != null ? str(item.name) : undefined,
        chance: num(item.chance, 100),
      })
    }
  }

  const unlockMinLevel = conditions?.['min-level'] != null ? num(conditions['min-level']) : undefined
  const unlockPermission =
    conditions?.permission != null ? str(conditions.permission) : undefined
  const unlockCost = conditions?.cost != null ? num(conditions.cost) : undefined
  const unlockSigilCost =
    conditions?.['sigil-cost'] != null ? num(conditions['sigil-cost']) : undefined

  return {
    id: questId,
    display: str(q.display),
    material: str(q.material, 'PAPER'),
    tier: str(q.tier, 'common'),
    difficulty: str(q.difficulty, 'easy'),
    sequential: q.sequential === true,
    lockToPlayer: q['lock-to-player'] === true,
    unlockMinLevel: unlockMinLevel && unlockMinLevel > 0 ? unlockMinLevel : undefined,
    unlockPermission: unlockPermission?.trim() || undefined,
    unlockCost: unlockCost && unlockCost > 0 ? unlockCost : undefined,
    unlockSigilCost: unlockSigilCost && unlockSigilCost > 0 ? unlockSigilCost : undefined,
    objectives:
      objectives.length > 0 ? objectives : [info],
    xp: num(reward?.xp),
    money: num(reward?.money),
    sigils: num(reward?.sigils),
    itemRewards,
  }
}

export function parseQuestFromFile(content: string, questId: string): QuestGeneratorInput | null {
  const { data } = parseYaml(content)
  const root = asRecord(data)
  if (!root) return null
  const quests = asRecord(root.quests)
  if (!quests || !(questId in quests)) return null
  return parseQuestFromRecord(questId, quests[questId])
}

/** Map of quest id → display string (for sidebar labels). */
export function indexQuestDisplays(content: string): Map<string, string> {
  const out = new Map<string, string>()
  const { data } = parseYaml(content)
  const root = asRecord(data)
  const quests = asRecord(root?.quests)
  if (!quests) return out
  for (const [id, raw] of Object.entries(quests)) {
    const q = asRecord(raw)
    const display = str(q?.display).replace(/<[^>]+>/g, '').trim()
    out.set(id, display || id)
  }
  return out
}
