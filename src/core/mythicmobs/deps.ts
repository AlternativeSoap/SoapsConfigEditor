import type { FileRecord } from '../../types'

export interface DepLink {
  /** ID being referenced */
  id: string
  /** Category of the referenced ID */
  category: string
  /** File that owns the referenced ID */
  filePath: string
}

export interface FileDeps {
  /** IDs this file's content references */
  uses: DepLink[]
  /** Files that reference IDs defined in this file */
  usedBy: { filePath: string; referencingId: string; targetId: string }[]
}

// Regexes to extract references from YAML text
const SKILL_REF_RX = /skill\{[^}]*s(?:kills)?=([A-Za-z0-9_\-]+)/g
const DROPTABLE_REF_RX = /(?:^|\s)Drops?:\s*\n((?:\s+-\s+\S+\n?)*)/gm
const DROP_ENTRY_RX = /^\s+-\s+([A-Za-z0-9_\-]+)/gm
const SPAWN_TYPE_RX = /Type:\s+([A-Za-z0-9_\-]+)/g
const EQUIPMENT_VAL_RX = /(?:HEAD|CHEST|LEGS|FEET|HAND|OFFHAND):\s+([A-Za-z0-9_\-]+)/g

function extractSkillRefs(text: string): string[] {
  const ids: string[] = []
  let m: RegExpExecArray | null
  const rx = new RegExp(SKILL_REF_RX.source, 'g')
  while ((m = rx.exec(text)) !== null) ids.push(m[1]!)
  return ids
}

function extractDropRefs(text: string): string[] {
  const ids: string[] = []
  let m: RegExpExecArray | null
  const blockRx = new RegExp(DROPTABLE_REF_RX.source, 'gm')
  while ((m = blockRx.exec(text)) !== null) {
    const block = m[1]!
    let em: RegExpExecArray | null
    const entryRx = new RegExp(DROP_ENTRY_RX.source, 'gm')
    while ((em = entryRx.exec(block)) !== null) ids.push(em[1]!)
  }
  return ids
}

function extractMobTypeRefs(text: string): string[] {
  const ids: string[] = []
  let m: RegExpExecArray | null
  const rx = new RegExp(SPAWN_TYPE_RX.source, 'g')
  while ((m = rx.exec(text)) !== null) ids.push(m[1]!)
  return ids
}

function extractEquipmentRefs(text: string): string[] {
  const ids: string[] = []
  let m: RegExpExecArray | null
  const rx = new RegExp(EQUIPMENT_VAL_RX.source, 'g')
  while ((m = rx.exec(text)) !== null) ids.push(m[1]!)
  return ids
}

export function buildFileDeps(file: FileRecord, allFiles: FileRecord[]): FileDeps {
  const text = file.content

  // Build lookup maps
  const byId = new Map<string, { filePath: string; category: string }>()
  for (const f of allFiles) {
    for (const id of f.ids) {
      byId.set(id, { filePath: f.path, category: f.category ?? '' })
    }
  }

  // Collect outgoing references from this file
  const rawRefs: { id: string; expectedCategory: string }[] = []
  if (file.category === 'mobs' || file.category === 'skills') {
    for (const id of extractSkillRefs(text)) rawRefs.push({ id, expectedCategory: 'skills' })
  }
  if (file.category === 'mobs') {
    for (const id of extractDropRefs(text)) rawRefs.push({ id, expectedCategory: 'droptables' })
    for (const id of extractEquipmentRefs(text)) rawRefs.push({ id, expectedCategory: 'items' })
  }
  if (file.category === 'randomspawns') {
    for (const id of extractMobTypeRefs(text)) rawRefs.push({ id, expectedCategory: 'mobs' })
  }

  // Deduplicate
  const seen = new Set<string>()
  const uses: DepLink[] = []
  for (const { id } of rawRefs) {
    if (seen.has(id)) continue
    seen.add(id)
    const info = byId.get(id)
    if (info && info.filePath !== file.path) {
      uses.push({ id, category: info.category, filePath: info.filePath })
    }
  }

  // Find which other files reference IDs defined in this file
  const myIds = new Set(file.ids)
  const usedBy: FileDeps['usedBy'] = []
  for (const other of allFiles) {
    if (other.path === file.path) continue
    const otherText = other.content
    const refs: string[] = []
    if (other.category === 'mobs' || other.category === 'skills') {
      refs.push(...extractSkillRefs(otherText))
    }
    if (other.category === 'mobs') {
      refs.push(...extractDropRefs(otherText))
      refs.push(...extractEquipmentRefs(otherText))
    }
    if (other.category === 'randomspawns') {
      refs.push(...extractMobTypeRefs(otherText))
    }
    for (const refId of refs) {
      if (myIds.has(refId)) {
        usedBy.push({ filePath: other.path, referencingId: other.ids[0] ?? other.path, targetId: refId })
      }
    }
  }

  // Deduplicate usedBy by filePath
  const seenFiles = new Set<string>()
  const deduped = usedBy.filter((u) => {
    if (seenFiles.has(u.filePath)) return false
    seenFiles.add(u.filePath)
    return true
  })

  return { uses, usedBy: deduped }
}
