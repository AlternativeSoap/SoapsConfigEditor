import type { FileRecord, ValidationIssue } from '../../types'
import { parseYaml } from '../yaml/parseYaml'

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

function extractDropRefs(value: unknown): string[] {
  if (!value) return []
  const lines = Array.isArray(value) ? value : []
  const refs: string[] = []
  const builtins = new Set(['exp', 'money', 'command', 'nothing', 'mcmmo-exp'])
  for (const entry of lines) {
    if (typeof entry !== 'string') continue
    const first = entry.trim().split(/\s+/)[0]
    if (first && !builtins.has(first.toLowerCase())) {
      refs.push(first)
    }
  }
  return refs
}

export function validateMobSkillReferences(files: FileRecord[]): ValidationIssue[] {
  const skillIds = new Set<string>()
  for (const file of files) {
    if (file.category !== 'skills') continue
    for (const id of file.ids) skillIds.add(id)
  }

  const issues: ValidationIssue[] = []
  for (const file of files) {
    if (file.category !== 'mobs') continue
    const parsed = parseYaml(file.content).data
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue
    const mobs = parsed as Record<string, Record<string, unknown>>
    for (const mobId of Object.keys(mobs)) {
      const mobDef = mobs[mobId]
      for (const ref of extractSkillRefs(mobDef?.Skills)) {
        if (!skillIds.has(ref)) {
          issues.push({
            type: 'missing_skill_reference',
            filePath: file.path,
            entityId: mobId,
            missingId: ref,
          })
        }
      }
    }
  }
  return issues
}

export function validateDroptableReferences(files: FileRecord[]): ValidationIssue[] {
  const droptableIds = new Set<string>()
  for (const file of files) {
    if (file.category !== 'droptables') continue
    for (const id of file.ids) droptableIds.add(id)
  }

  const issues: ValidationIssue[] = []
  for (const file of files) {
    if (file.category !== 'mobs') continue
    const parsed = parseYaml(file.content).data
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue
    const mobs = parsed as Record<string, Record<string, unknown>>
    for (const mobId of Object.keys(mobs)) {
      const mobDef = mobs[mobId]
      for (const ref of extractDropRefs(mobDef?.Drops)) {
        if (!droptableIds.has(ref)) {
          issues.push({
            type: 'missing_droptable_reference',
            filePath: file.path,
            entityId: mobId,
            missingId: ref,
          })
        }
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

export function validatePack(files: FileRecord[]): ValidationIssue[] {
  return [
    ...validateMobSkillReferences(files),
    ...validateDroptableReferences(files),
    ...validateRandomSpawnMobReferences(files),
  ]
}
