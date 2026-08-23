import type { Text } from '@codemirror/state'
import type { MythicCategory } from '../../types'

export type YamlListParent =
  | 'Skills'
  | 'Conditions'
  | 'Drops'
  | 'Equipment'
  | 'AIGoalSelectors'
  | 'AITargetSelectors'
  | 'Options'
  | 'Exclude'
  | null

export interface YamlEditContext {
  parentKey: YamlListParent
  lineIndent: number
  fileCategory?: MythicCategory
}

function leadingIndent(text: string): number {
  return text.match(/^(\s*)/)?.[1]?.length ?? 0
}

const PARENT_KEY_ALIASES: Record<string, YamlListParent> = {
  skills: 'Skills',
  conditions: 'Conditions',
  drops: 'Drops',
  equipment: 'Equipment',
  aigoalselectors: 'AIGoalSelectors',
  aitargetselectors: 'AITargetSelectors',
  options: 'Options',
  exclude: 'Exclude',
}

/** Normalize YAML parent keys to canonical MythicMobs casing (skills → Skills). */
export function normalizeYamlParentKey(key: string): YamlListParent | null {
  const alias = PARENT_KEY_ALIASES[key.toLowerCase()]
  if (alias) return alias
  const values = Object.values(PARENT_KEY_ALIASES)
  return values.includes(key as YamlListParent) ? (key as YamlListParent) : null
}

export function isSkillsListParent(parentKey: YamlListParent | null): boolean {
  return parentKey === 'Skills'
}

export function isConditionsListParent(parentKey: YamlListParent | null): boolean {
  return parentKey === 'Conditions'
}

/** Walk upward to find the YAML list/block key containing the current line. */
export function detectYamlEditContext(doc: Text, lineNumber: number, fileCategory?: MythicCategory): YamlEditContext {
  const lineIndent = leadingIndent(doc.line(lineNumber).text)
  let parentKey: YamlListParent = null

  for (let i = lineNumber - 1; i >= 1; i--) {
    const text = doc.line(i).text
    const ind = leadingIndent(text)
    if (ind >= lineIndent) continue
    const keyMatch = /^\s*([A-Za-z][A-Za-z0-9_]*):\s*(.*)?$/.exec(text)
    if (keyMatch?.[1]) {
      parentKey = normalizeYamlParentKey(keyMatch[1]) ?? null
      if (parentKey) break
    }
  }

  return { parentKey, lineIndent, fileCategory }
}

export const MOB_BODY_KEYS = [
  'Type', 'Display', 'Health', 'Damage', 'Armor', 'Faction', 'Template', 'Exclude', 'Skills', 'Drops', 'Equipment', 'Options',
  'AIGoalSelectors', 'AITargetSelectors', 'Modules', 'Level', 'KillMessages',
  'Disguise', 'BossBar', 'ThreatTable', 'DamageModifiers', 'ImmunityTables',
]

export const SKILL_BODY_KEYS = ['Skills', 'Conditions', 'Cooldown', 'Options', 'OnCooldownSkill']

export const ITEM_BODY_KEYS = ['Id', 'Display', 'Options', 'Lore', 'NBT', 'Skills', 'Enchantments', 'Model']

export const DROPTABLE_BODY_KEYS = ['Drops', 'Conditions', 'TotalItems', 'MinItems', 'MaxItems']

export const RANDOMSPAWN_BODY_KEYS = ['Action', 'Type', 'Level', 'Chance', 'Worlds', 'Biomes', 'Conditions', 'Priority']

export const EQUIPMENT_SLOTS = ['HEAD', 'CHEST', 'LEGS', 'FEET', 'HAND', 'OFFHAND']

export const DROP_BUILTINS = ['exp', 'money', 'command', 'nothing', 'mcmmo-exp']

export function bodyKeysForCategory(category?: MythicCategory): string[] {
  switch (category) {
    case 'mobs':
      return MOB_BODY_KEYS
    case 'skills':
      return SKILL_BODY_KEYS
    case 'items':
      return ITEM_BODY_KEYS
    case 'droptables':
      return DROPTABLE_BODY_KEYS
    case 'randomspawns':
      return RANDOMSPAWN_BODY_KEYS
    default:
      return []
  }
}
