import { MECHANICS, type MechanicAttr, type MechanicEntry } from '../../data/mythicmobs/mechanics'
import { inferAttrTypeFromName } from './attrRegistry'
import { parseSkillLineParts, stripSkillLineListPrefix } from './skillLineParts'

export interface SkillLineContext {
  /** Canonical mechanic id on the current line, if any. */
  mechanicId: string | null
  /** Lowercase attribute names already present in the mechanic block on this line. */
  presentAttrs: string[]
  /** Lowercase targeter id → attrs present in its `{…}` block on this line. */
  targeters: ReadonlyMap<string, string[]>
  /** Lowercase condition id → attrs present in its inline `{…}` block on this line. */
  conditions: ReadonlyMap<string, string[]>
}

const EMPTY_CONTEXT: SkillLineContext = {
  mechanicId: null,
  presentAttrs: [],
  targeters: new Map(),
  conditions: new Map(),
}

const mechanicById = new Map<string, MechanicEntry>()
const mechanicByAlias = new Map<string, MechanicEntry>()

for (const m of MECHANICS) {
  mechanicById.set(m.id.toLowerCase(), m)
  for (const alias of m.aliases) {
    mechanicByAlias.set(alias.toLowerCase(), m)
  }
}

export function findMechanic(token: string): MechanicEntry | undefined {
  const key = token.toLowerCase()
  return mechanicById.get(key) ?? mechanicByAlias.get(key)
}

/** Parse semicolon-separated keys inside `{…}`. Ignores an incomplete trailing token without `=`. */
export function parseAttrNames(insideBraces: string): Set<string> {
  const names = new Set<string>()
  for (const part of insideBraces.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eq = trimmed.indexOf('=')
    const key = (eq >= 0 ? trimmed.slice(0, eq) : trimmed).trim().toLowerCase()
    if (key && eq >= 0) names.add(key)
  }
  return names
}

export function parseSkillLineContext(lineText: string): SkillLineContext {
  const parts = parseSkillLineParts(lineText)
  let mechanicId: string | null = null
  let presentAttrs: string[] = []
  if (parts.mechanic) {
    const idToken = parts.mechanic.replace(/\{.*$/, '').trim()
    const mechanic = findMechanic(idToken)
    if (mechanic) {
      mechanicId = mechanic.id
      const brace = /\{([^}]*)\}/.exec(parts.mechanic)
      presentAttrs = [...parseAttrNames(brace?.[1] ?? '')]
    }
  }

  const body = stripSkillLineListPrefix(lineText)
  const targeters = new Map<string, string[]>()
  for (const tm of body.matchAll(/@([A-Za-z][A-Za-z0-9_]*)\{([^}]*)\}/g)) {
    targeters.set((tm[1] ?? '').toLowerCase(), [...parseAttrNames(tm[2] ?? '')])
  }

  const conditions = new Map<string, string[]>()
  for (const cm of body.matchAll(/\?([A-Za-z][A-Za-z0-9_]*)\{([^}]*)\}/g)) {
    conditions.set((cm[1] ?? '').toLowerCase(), [...parseAttrNames(cm[2] ?? '')])
  }

  return { mechanicId, presentAttrs, targeters, conditions }
}

export function attrSnippet(attr: MechanicAttr): string {
  return attr.default !== undefined ? `${attr.name}=${attr.default}` : `${attr.name}=`
}

/** Semicolon prefix when appending another attribute inside `{…}`. Avoids `;;` when the block already ends with `;`. */
export function attrInsertPrefix(inside: string): string {
  const trimmed = inside.trimEnd()
  if (!trimmed) return ''
  return trimmed.endsWith(';') ? '' : ';'
}

export function attrsFromInsertSnippet(snippet: string): MechanicAttr[] {
  const brace = /\{([^}]+)\}/.exec(snippet)
  if (!brace?.[1]) return []
  return brace[1]
    .split(';')
    .map((pair) => {
      const eq = pair.indexOf('=')
      if (eq < 0) return null
      const name = pair.slice(0, eq).trim()
      const defaultVal = pair.slice(eq + 1).trim()
      if (!name) return null
      return {
        name,
        type: inferAttrTypeFromName(name, defaultVal),
        default: defaultVal,
        desc: '',
      }
    })
    .filter((a): a is MechanicAttr => a !== null)
}

export function insertAttrIntoMechanicBlock(
  lineText: string,
  mechanic: MechanicEntry,
  attr: MechanicAttr,
): string | null {
  const names = [mechanic.id, ...mechanic.aliases].map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const match = new RegExp(`^(\\s+-\\s+)(${names.join('|')})\\{([^}]*)\\}`, 'i').exec(lineText)
  if (!match) return null

  const present = parseAttrNames(match[3] ?? '')
  if (present.has(attr.name.toLowerCase())) return null

  const closeIdx = lineText.indexOf('}', match.index)
  if (closeIdx < 0) return null

  const inside = match[3] ?? ''
  const piece = attrSnippet(attr)
  const insertText = `${attrInsertPrefix(inside)}${piece}`
  return lineText.slice(0, closeIdx) + insertText + lineText.slice(closeIdx)
}

export function buildMechanicLine(mechanic: MechanicEntry, attr: MechanicAttr): string {
  return `${mechanic.id}{${attrSnippet(attr)}}`
}

export function isEmptySkillLine(lineText: string): boolean {
  return /^\s+-\s*$/.test(lineText)
}

export function insertAttrIntoBraceBlock(
  lineText: string,
  prefix: '@' | '?',
  blockId: string,
  attr: MechanicAttr,
): string | null {
  const escaped = blockId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(${prefix}${escaped})\\{([^}]*)\\}`, 'i').exec(lineText)
  if (!match) return null

  const present = parseAttrNames(match[2] ?? '')
  if (present.has(attr.name.toLowerCase())) return null

  const openIdx = lineText.indexOf('{', match.index)
  const closeIdx = lineText.indexOf('}', openIdx)
  if (closeIdx < 0) return null

  const inside = match[2] ?? ''
  const piece = attrSnippet(attr)
  const insertText = `${attrInsertPrefix(inside)}${piece}`
  return lineText.slice(0, closeIdx) + insertText + lineText.slice(closeIdx)
}

export function appendBraceBlock(
  lineText: string,
  prefix: '@' | '?',
  blockId: string,
  attr: MechanicAttr,
): string {
  const piece = `${prefix}${blockId}{${attrSnippet(attr)}}`
  const trimmed = lineText.trimEnd()
  return trimmed ? `${trimmed} ${piece}` : piece
}

export { EMPTY_CONTEXT }

const mechanicAttrsCache = new Map<string, MechanicAttr[]>()

function mergeAttrs(formal: MechanicAttr[], fromSnippet: MechanicAttr[]): MechanicAttr[] {
  const byName = new Map<string, MechanicAttr>()
  for (const a of fromSnippet) {
    byName.set(a.name.toLowerCase(), {
      ...a,
      type: inferAttrTypeFromName(a.name, a.default),
    })
  }
  for (const a of formal) {
    byName.set(a.name.toLowerCase(), a)
  }
  return [...byName.values()]
}

/** Formal attributes merged with keys parsed from the mechanic insert snippet. */
export function getMechanicAttrs(mechanic: MechanicEntry): MechanicAttr[] {
  const cached = mechanicAttrsCache.get(mechanic.id)
  if (cached) return cached
  const merged = mergeAttrs(mechanic.attributes ?? [], attrsFromInsertSnippet(mechanic.insertSnippet))
  mechanicAttrsCache.set(mechanic.id, merged)
  return merged
}

for (const m of MECHANICS) {
  getMechanicAttrs(m)
}
