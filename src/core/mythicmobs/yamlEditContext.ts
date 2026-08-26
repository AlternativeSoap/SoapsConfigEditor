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

/** Mob YAML list blocks that are not skill mechanics lines. */
export function isMobStructureListParent(parentKey: YamlListParent | null): boolean {
  return (
    parentKey === 'DamageModifiers' ||
    parentKey === 'KillMessages' ||
    parentKey === 'AIGoalSelectors' ||
    parentKey === 'AITargetSelectors' ||
    parentKey === 'Drops' ||
    parentKey === 'Exclude'
  )
}

/** Sections whose content is `- entry` lines at the same indent as the header. */
const LIST_DASH_PARENTS = new Set<YamlListParent>([
  'Skills',
  'Conditions',
  'Drops',
  'AIGoalSelectors',
  'AITargetSelectors',
  'Exclude',
  'DamageModifiers',
  'KillMessages',
  'Description',
  'BaseStats',
  'StatModifiers',
  'SpellUnlocks',
])

function isListDashSectionKey(key: string): boolean {
  const normalized = normalizeYamlParentKey(key)
  return normalized !== null && LIST_DASH_PARENTS.has(normalized)
}

function nearestSameIndentAbove(
  doc: { line: (n: number) => { text: string } },
  lineNumber: number,
  lineIndent: number,
): { kind: 'list' | 'map-child' | 'section-header'; key?: string } | null {
  for (let i = lineNumber - 1; i >= 1; i--) {
    const text = doc.line(i).text
    const ind = leadingIndent(text)
    if (ind < lineIndent) break
    if (ind > lineIndent) continue
    if (!text.trim() || text.trim().startsWith('#')) continue
    if (/^\s*-\s+/.test(text)) return { kind: 'list' }
    const bare = /^\s*([A-Za-z][A-Za-z0-9_-]*):\s*$/.exec(text)
    if (bare?.[1]) return { kind: 'section-header', key: bare[1] }
    if (/^\s*[A-Za-z][A-Za-z0-9_-]*:\s+\S/.test(text)) return { kind: 'map-child' }
    return null
  }
  return null
}

/**
 * Nearest YAML block key for the current line.
 * Mythic often uses same-indent children (`DamageModifiers:` / `BossBar:` /
 * `Options:` then `  - entry` or `  Enabled: true` as siblings). Prefer the
 * nearest same-indent bare `Key:` section header, then a less-indent ancestor.
 */
export function findYamlBlockParentKey(
  doc: { line: (n: number) => { text: string } },
  lineNumber: number,
  lineIndent: number,
): string | null {
  const currentLine = doc.line(lineNumber).text
  const onListLine = /^\s*-\s+/.test(currentLine)
  const typingPartialKey =
    /^\s+[A-Za-z][A-Za-z0-9_-]*$/.test(currentLine) && !currentLine.includes(':')

  // Typing a new key without `:` — decide from the nearest same-indent line above.
  if (!onListLine && typingPartialKey) {
    const nearest = nearestSameIndentAbove(doc, lineNumber, lineIndent)
    if (nearest?.kind === 'list') {
      // e.g. DamageMod after AITargetSelectors list, before Skills:
    } else if (
      nearest?.kind === 'map-child' ||
      (nearest?.kind === 'section-header' && nearest.key && !isListDashSectionKey(nearest.key))
    ) {
      for (let i = lineNumber - 1; i >= 1; i--) {
        const text = doc.line(i).text
        const ind = leadingIndent(text)
        if (ind < lineIndent) break
        if (ind > lineIndent) continue
        if (/^\s*-\s+/.test(text)) continue
        const bareSection = /^\s*([A-Za-z][A-Za-z0-9_-]*):\s*$/.exec(text)
        if (bareSection?.[1] && !isListDashSectionKey(bareSection[1])) return bareSection[1]
      }
    } else {
      // Fall through to less-indent scan.
    }
    for (let i = lineNumber - 1; i >= 1; i--) {
      const text = doc.line(i).text
      const ind = leadingIndent(text)
      if (ind >= lineIndent) continue
      const keyMatch = /^\s*([A-Za-z][A-Za-z0-9_-]*):\s*(.*)?$/.exec(text)
      if (keyMatch?.[1]) return keyMatch[1]
    }
    return null
  }

  for (let i = lineNumber - 1; i >= 1; i--) {
    const text = doc.line(i).text
    const ind = leadingIndent(text)
    if (ind < lineIndent) break
    if (ind > lineIndent) continue
    if (/^\s*-\s+/.test(text)) continue
    const bareSection = /^\s*([A-Za-z][A-Za-z0-9_-]*):\s*$/.exec(text)
    if (bareSection?.[1]) {
      if (!onListLine && isListDashSectionKey(bareSection[1])) continue
      return bareSection[1]
    }
    if (/^\s*[A-Za-z][A-Za-z0-9_-]*:\s+\S/.test(text)) continue
    break
  }

  for (let i = lineNumber - 1; i >= 1; i--) {
    const text = doc.line(i).text
    const ind = leadingIndent(text)
    if (ind >= lineIndent) continue
    const keyMatch = /^\s*([A-Za-z][A-Za-z0-9_-]*):\s*(.*)?$/.exec(text)
    if (keyMatch?.[1]) return keyMatch[1]
  }
  return null
}

/** Walk upward to find the YAML list/block key containing the current line. */
export function detectYamlEditContext(doc: Text, lineNumber: number, fileCategory?: MythicCategory): YamlEditContext {
  const lineIndent = leadingIndent(doc.line(lineNumber).text)
  const raw = findYamlBlockParentKey(doc, lineNumber, lineIndent)
  const parentKey = raw ? normalizeYamlParentKey(raw) : null
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

export { EQUIPMENT_SLOTS } from '../../data/mythicmobs/equipSlots'

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

/**
 * Collect sibling body keys at a given indent under the same entity/parent block.
 * Scoped between the enclosing parent (indent &lt; target) and the next peer of that parent,
 * so multi-mob / multi-entity files do not hide keys across entities.
 */
export function collectSiblingBodyKeys(
  doc: { line: (n: number) => { text: string }; lines: number },
  lineNumber: number,
  indent: number,
): Set<string> {
  const present = new Set<string>()

  // Indent 0: typical one-class-per-file layout; scan the whole document.
  if (indent === 0) {
    for (let i = 1; i <= doc.lines; i++) {
      if (i === lineNumber) continue
      const text = doc.line(i).text
      if (leadingIndent(text) !== 0) continue
      const m = /^([A-Za-z][A-Za-z0-9_-]*):/.exec(text)
      if (m?.[1]) present.add(m[1])
    }
    return present
  }

  let parentLine = 0
  for (let i = lineNumber - 1; i >= 1; i--) {
    const text = doc.line(i).text
    if (!text.trim() || text.trim().startsWith('#')) continue
    const ind = leadingIndent(text)
    if (ind < indent) {
      parentLine = i
      break
    }
  }

  const parentIndent = parentLine > 0 ? leadingIndent(doc.line(parentLine).text) : -1
  const start = parentLine > 0 ? parentLine + 1 : 1

  for (let i = start; i <= doc.lines; i++) {
    const text = doc.line(i).text
    if (!text.trim() || text.trim().startsWith('#')) continue
    const ind = leadingIndent(text)
    if (ind <= parentIndent) break
    if (i === lineNumber) continue
    if (ind !== indent) continue
    const m = /^\s*([A-Za-z][A-Za-z0-9_-]*):/.exec(text)
    if (m?.[1]) present.add(m[1])
  }
  return present
}

/** True when an ancestor key with indent &lt; lineIndent matches `name` (case-insensitive). */
export function hasYamlAncestorKey(
  doc: { line: (n: number) => { text: string } },
  lineNumber: number,
  lineIndent: number,
  name: string,
): boolean {
  const want = name.toLowerCase()
  for (let i = lineNumber - 1; i >= 1; i--) {
    const text = doc.line(i).text
    if (!text.trim() || text.trim().startsWith('#')) continue
    const ind = leadingIndent(text)
    if (ind >= lineIndent) continue
    const m = /^\s*([A-Za-z][A-Za-z0-9_-]*):/.exec(text)
    if (m?.[1]?.toLowerCase() === want) return true
  }
  return false
}

/** Nearest YAML key ancestor for nested completions (includes same-indent list owners). */
export function findNearestYamlParentKey(
  doc: { line: (n: number) => { text: string } },
  lineNumber: number,
  lineIndent: number,
): string | null {
  return findYamlBlockParentKey(doc, lineNumber, lineIndent)
}
