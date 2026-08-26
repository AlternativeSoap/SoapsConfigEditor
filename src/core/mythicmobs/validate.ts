import type { FileRecord, ValidationIssue } from '../../types'
import { MINECRAFT_MATERIALS } from '../../data/minecraft/materials'
import { parseYaml } from '../yaml/parseYaml'
import { collectMobsFromFiles, getMobField, resolveMob, type MobBody } from './templates'
import { DROP_BUILTINS } from './yamlEditContext'

/** Extra drop-type prefixes from the MythicMobs drops wiki (not pack IDs). */
const DROP_TYPE_PREFIXES = [
  'cmd',
  'command',
  'mmoitems',
  'mythicdrop',
  'phatloot',
  'vanillaloottable',
  'itemvariable',
  'heroesexp',
  'champions-exp',
  'skillapi-exp',
] as const

const MATERIAL_SET = new Set(MINECRAFT_MATERIALS.map((m) => m.toUpperCase()))
const DROP_BUILTIN_SET = new Set<string>([
  ...DROP_BUILTINS.map((b) => b.toLowerCase()),
  ...DROP_TYPE_PREFIXES,
])

/** First token of a drop line, without inline `{…}` attributes. */
function dropBaseToken(entry: string): string | null {
  const first = entry.trim().split(/\s+/)[0]
  if (!first) return null
  return first.split('{')[0] || null
}

function isResolvedDropToken(
  token: string,
  itemIds: Set<string>,
  droptableIds: Set<string>,
): boolean {
  const lower = token.toLowerCase()
  if (DROP_BUILTIN_SET.has(lower)) return true
  if (MATERIAL_SET.has(token.toUpperCase())) return true
  if (itemIds.has(token) || itemIds.has(lower)) return true
  // Case-insensitive item lookup
  for (const id of itemIds) {
    if (id.toLowerCase() === lower) return true
  }
  if (droptableIds.has(token)) return true
  for (const id of droptableIds) {
    if (id.toLowerCase() === lower) return true
  }
  return false
}

/** Extract skill IDs from a Skills list entry (bare ID or skill{s=ID}). */
function skillRefFromToken(token: string): string | null {
  const trimmed = token.trim()
  if (!trimmed) return null
  const braced = trimmed.match(/^skill\{[^}]*\bs(?:kills)?\s*=\s*([A-Za-z0-9_\-]+)/i)
  if (braced?.[1]) return braced[1]
  // Bare metaskill ID (legacy). Skip mechanics with attributes.
  if (/^[A-Za-z0-9_\-]+$/.test(trimmed)) return trimmed
  return null
}

function extractSkillRefs(value: unknown): string[] {
  if (!value) return []
  const tokens: string[] = []
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry !== 'string') continue
      const first = entry.trim().split(/\s+/)[0]
      if (first) tokens.push(first)
    }
  } else if (typeof value === 'string') {
    for (const entry of value.split(',')) {
      const first = entry.trim().split(/\s+/)[0]
      if (first) tokens.push(first)
    }
  }
  const refs: string[] = []
  for (const token of tokens) {
    const id = skillRefFromToken(token)
    if (id) refs.push(id)
  }
  return refs
}

/**
 * Drop entry IDs that are not vanilla materials, pack items, builtins, or special
 * drop types — candidates for missing droptable (or missing mythic item) checks.
 * See https://wiki.mythiccraft.io/mythicmobs/drops/Drops
 */
function extractUnresolvedDropRefs(
  value: unknown,
  itemIds: Set<string>,
  droptableIds: Set<string>,
): string[] {
  if (!value) return []
  const lines = Array.isArray(value) ? value : []
  const refs: string[] = []
  for (const entry of lines) {
    if (typeof entry !== 'string') continue
    const token = dropBaseToken(entry)
    if (!token) continue
    if (isResolvedDropToken(token, itemIds, droptableIds)) continue
    refs.push(token)
  }
  return refs
}

export function validateMobSkillReferences(files: FileRecord[]): ValidationIssue[] {
  const skillIds = new Set<string>()
  for (const file of files) {
    if (file.category !== 'skills') continue
    for (const id of file.ids) skillIds.add(id)
  }

  const { mobs, fileByMobId } = collectMobsFromFiles(files, parseYaml)
  const issues: ValidationIssue[] = []
  const seen = new Set<string>()

  for (const mobId of Object.keys(mobs)) {
    const resolved = resolveMob(mobId, mobs)
    const skills = getMobField(resolved.body as MobBody, 'Skills')
    for (const ref of extractSkillRefs(skills)) {
      if (skillIds.has(ref)) continue
      const key = `${mobId}:${ref}`
      if (seen.has(key)) continue
      seen.add(key)
      issues.push({
        type: 'missing_skill_reference',
        filePath: fileByMobId[mobId] ?? '',
        entityId: mobId,
        missingId: ref,
      })
    }
  }
  return issues
}

export function validateDroptableReferences(files: FileRecord[]): ValidationIssue[] {
  const droptableIdsLower = new Set<string>()
  const itemIdsLower = new Set<string>()
  for (const file of files) {
    if (file.category === 'droptables') {
      for (const id of file.ids) droptableIdsLower.add(id.toLowerCase())
    }
    if (file.category === 'items') {
      for (const id of file.ids) itemIdsLower.add(id.toLowerCase())
    }
  }

  const issues: ValidationIssue[] = []
  const seen = new Set<string>()
  for (const file of files) {
    if (file.category !== 'mobs') continue
    const parsed = parseYaml(file.content).data
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue
    const mobs = parsed as Record<string, Record<string, unknown>>
    for (const mobId of Object.keys(mobs)) {
      const mobDef = mobs[mobId]
      for (const ref of extractUnresolvedDropRefs(mobDef?.Drops, itemIdsLower, droptableIdsLower)) {
        const key = `${file.path}:${mobId}:${ref}`
        if (seen.has(key)) continue
        seen.add(key)
        issues.push({
          type: 'missing_droptable_reference',
          filePath: file.path,
          entityId: mobId,
          missingId: ref,
        })
      }
    }
  }
  return issues
}

export function validateRandomSpawnMobReferences(files: FileRecord[]): ValidationIssue[] {
  const mobIds = new Set<string>()
  for (const file of files) {
    if (file.category !== 'mobs') continue
    for (const id of file.ids) mobIds.add(id)
  }

  const issues: ValidationIssue[] = []
  for (const file of files) {
    if (file.category !== 'randomspawns') continue
    const parsed = parseYaml(file.content).data
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue
    const spawns = parsed as Record<string, Record<string, unknown>>
    for (const spawnId of Object.keys(spawns)) {
      const spawnDef = spawns[spawnId]
      const typeVal = spawnDef?.Type
      if (typeof typeVal === 'string' && typeVal.trim()) {
        const mobType = typeVal.trim().split(/\s+/)[0]
        if (mobType && !mobIds.has(mobType)) {
          issues.push({
            type: 'missing_spawn_mob_reference',
            filePath: file.path,
            entityId: spawnId,
            missingId: mobType,
          })
        }
      }
    }
  }
  return issues
}

function idSetLower(ids: Iterable<string>): Set<string> {
  const set = new Set<string>()
  for (const id of ids) set.add(id.toLowerCase())
  return set
}

function collectAugmentTypeRefs(itemDef: Record<string, unknown>): string[] {
  const refs: string[] = []
  const pushType = (block: unknown) => {
    if (!block || typeof block !== 'object' || Array.isArray(block)) return
    const type = (block as Record<string, unknown>).Type
    if (typeof type === 'string' && type.trim()) refs.push(type.trim())
  }

  pushType(itemDef.Augmentation)
  pushType(itemDef.AugmentationSocket)
  pushType(itemDef.AugmentationRemover)

  const slots = itemDef.AugmentationSlots
  if (Array.isArray(slots)) {
    for (const entry of slots) pushType(entry)
  } else {
    pushType(slots)
  }
  return refs
}

/** Item EquipmentSet / augment Type refs against pack set and augment type IDs. */
export function validateCrucibleItemReferences(files: FileRecord[]): ValidationIssue[] {
  const setIds = idSetLower(
    files.filter((f) => f.category === 'equipment-sets').flatMap((f) => f.ids),
  )
  const augmentIds = idSetLower(
    files.filter((f) => f.category === 'augments').flatMap((f) => f.ids),
  )
  if (setIds.size === 0 && augmentIds.size === 0) {
    // Still validate when sets/augments are empty so missing refs surface
  }

  const issues: ValidationIssue[] = []
  const seen = new Set<string>()

  for (const file of files) {
    if (file.category !== 'items') continue
    const parsed = parseYaml(file.content).data
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue
    const items = parsed as Record<string, Record<string, unknown>>
    for (const itemId of Object.keys(items)) {
      const itemDef = items[itemId]
      if (!itemDef || typeof itemDef !== 'object') continue

      const setRef = itemDef.EquipmentSet
      if (typeof setRef === 'string' && setRef.trim()) {
        const id = setRef.trim()
        if (!setIds.has(id.toLowerCase())) {
          const key = `set:${itemId}:${id}`
          if (!seen.has(key)) {
            seen.add(key)
            issues.push({
              type: 'missing_equipment_set_reference',
              filePath: file.path,
              entityId: itemId,
              missingId: id,
            })
          }
        }
      }

      for (const typeRef of collectAugmentTypeRefs(itemDef)) {
        if (augmentIds.has(typeRef.toLowerCase())) continue
        const key = `aug:${itemId}:${typeRef}`
        if (seen.has(key)) continue
        seen.add(key)
        issues.push({
          type: 'missing_augment_type_reference',
          filePath: file.path,
          entityId: itemId,
          missingId: typeRef,
        })
      }
    }
  }
  return issues
}

export function validatePack(files: FileRecord[]): ValidationIssue[] {
  return [
    ...validateMobSkillReferences(files),
    ...validateDroptableReferences(files),
    ...validateRandomSpawnMobReferences(files),
    ...validateCrucibleItemReferences(files),
  ]
}
