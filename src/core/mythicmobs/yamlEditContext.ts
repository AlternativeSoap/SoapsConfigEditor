import type { Text } from '@codemirror/state'
import type { MythicCategory } from '../../types'
import {
  bodyKeyDefsForCategory,
  bodyKeyIndentForCategory,
  DROPTABLE_BODY_DEFS,
  ITEM_BODY_DEFS,
  MOB_BODY_DEFS,
  RANDOMSPAWN_BODY_DEFS,
  SKILL_BODY_DEFS,
} from '../yaml/bodyKeyCatalogs'
import { defsToKeys } from '../yaml/bodyKeyDefs'

export type { BodyKeyDef } from '../yaml/bodyKeyDefs'
export {
  bodyKeyDefsForCategory,
  bodyKeyIndentForCategory,
  MOB_BODY_DEFS,
  SKILL_BODY_DEFS,
  ITEM_BODY_DEFS,
  DROPTABLE_BODY_DEFS,
  RANDOMSPAWN_BODY_DEFS,
} from '../yaml/bodyKeyCatalogs'

export type YamlListParent =
  | 'Skills'
  | 'Conditions'
  | 'Drops'
  | 'Equipment'
  | 'AIGoalSelectors'
  | 'AITargetSelectors'
  | 'Options'
  | 'Exclude'
  | 'DamageModifiers'
  | 'KillMessages'
  | 'Description'
  | 'BaseStats'
  | 'StatModifiers'
  | 'SpellUnlocks'
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
  damagemodifiers: 'DamageModifiers',
  killmessages: 'KillMessages',
  description: 'Description',
  basestats: 'BaseStats',
  statmodifiers: 'StatModifiers',
  spellunlocks: 'SpellUnlocks',
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

/** @deprecated Prefer MOB_BODY_DEFS */
export const MOB_BODY_KEYS = defsToKeys(MOB_BODY_DEFS)

/** @deprecated Prefer SKILL_BODY_DEFS */
export const SKILL_BODY_KEYS = defsToKeys(SKILL_BODY_DEFS)

/** @deprecated Prefer ITEM_BODY_DEFS */
export const ITEM_BODY_KEYS = defsToKeys(ITEM_BODY_DEFS)

/** @deprecated Prefer DROPTABLE_BODY_DEFS */
export const DROPTABLE_BODY_KEYS = defsToKeys(DROPTABLE_BODY_DEFS)

/** @deprecated Prefer RANDOMSPAWN_BODY_DEFS */
export const RANDOMSPAWN_BODY_KEYS = defsToKeys(RANDOMSPAWN_BODY_DEFS)

export const EQUIPMENT_SLOTS = ['HEAD', 'CHEST', 'LEGS', 'FEET', 'HAND', 'OFFHAND']

export const DROP_BUILTINS = ['exp', 'money', 'command', 'nothing', 'mcmmo-exp'] as const

export const DROP_BUILTIN_APPLY: Record<(typeof DROP_BUILTINS)[number], string> = {
  exp: 'exp 5',
  money: 'money 10',
  command: 'command{c="say hi"}',
  nothing: 'nothing',
  'mcmmo-exp': 'mcmmo-exp 10',
}

export function bodyKeysForCategory(category?: MythicCategory): string[] {
  return defsToKeys(bodyKeyDefsForCategory(category))
}

/** Collect sibling body keys at a given indent under the same entity block. */
export function collectSiblingBodyKeys(
  doc: { line: (n: number) => { text: string }; lines: number },
  lineNumber: number,
  indent: number,
): Set<string> {
  const present = new Set<string>()
  for (let i = 1; i <= doc.lines; i++) {
    if (i === lineNumber) continue
    const text = doc.line(i).text
    const ind = leadingIndent(text)
    if (ind !== indent) continue
    const m = /^\s*([A-Za-z][A-Za-z0-9_-]*):/.exec(text)
    if (m?.[1]) present.add(m[1])
  }
  return present
}

/** Nearest YAML key ancestor with less indent than the current line. */
export function findNearestYamlParentKey(
  doc: { line: (n: number) => { text: string } },
  lineNumber: number,
  lineIndent: number,
): string | null {
  for (let i = lineNumber - 1; i >= 1; i--) {
    const text = doc.line(i).text
    const ind = leadingIndent(text)
    if (ind >= lineIndent) continue
    const keyMatch = /^\s*([A-Za-z][A-Za-z0-9_-]*):\s*(.*)?$/.exec(text)
    if (keyMatch?.[1]) return keyMatch[1]
  }
  return null
}
