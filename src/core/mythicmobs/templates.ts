/** MythicMobs mob Template / Exclude inheritance helpers (apply & preview only). */

export type YamlValue = string | number | boolean | null | YamlValue[] | { [key: string]: YamlValue }

export type MobBody = Record<string, YamlValue>

const LIST_MERGE_KEYS = new Set([
  'skills',
  'killmessages',
  'drops',
  'aigoalselectors',
  'aitargetselectors',
])

const MAP_MERGE_KEYS = new Set(['options', 'modules'])

const SLOT_MERGE_KEYS = new Set(['equipment', 'damagemodifiers'])

function isPlainObject(value: unknown): value is Record<string, YamlValue> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/** Parse Template field: string, comma-separated, or YAML list → ordered ids. */
export function parseTemplateRefs(value: unknown): string[] {
  if (value == null) return []
  if (Array.isArray(value)) {
    return value
      .map((v) => String(v).trim())
      .filter(Boolean)
      .flatMap((v) => v.split(',').map((p) => p.trim()).filter(Boolean))
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
  }
  return []
}

/** Parse Exclude list of element names. */
export function parseExcludeList(value: unknown): string[] {
  if (value == null) return []
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
  }
  return []
}

export function deepEqualYaml(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (a == null || b == null) return a === b
  if (typeof a !== typeof b) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((v, i) => deepEqualYaml(v, b[i]))
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a)
    const bKeys = Object.keys(b)
    if (aKeys.length !== bKeys.length) return false
    return aKeys.every((k) => deepEqualYaml(a[k], b[k]))
  }
  return false
}

function slotKey(entry: unknown): string | null {
  if (typeof entry !== 'string') return null
  const parts = entry.trim().split(/\s+/)
  if (parts.length < 2) return parts[0]?.toUpperCase() ?? null
  const last = parts[parts.length - 1]!.toUpperCase()
  if (/^(HEAD|CHEST|LEGS|FEET|HAND|OFFHAND)$/.test(last)) return last
  return parts[0]!.toUpperCase()
}

function mergeSlotLists(base: YamlValue[], overlay: YamlValue[]): YamlValue[] {
  const map = new Map<string, YamlValue>()
  const order: string[] = []
  const unkeyed: YamlValue[] = []
  for (const entry of [...base, ...overlay]) {
    const key = slotKey(entry)
    if (!key) {
      unkeyed.push(entry)
      continue
    }
    if (!map.has(key)) order.push(key)
    map.set(key, entry)
  }
  return [...order.map((k) => map.get(k)!), ...unkeyed]
}

function mergeMaps(
  base: Record<string, YamlValue>,
  overlay: Record<string, YamlValue>,
): Record<string, YamlValue> {
  const out: Record<string, YamlValue> = { ...base }
  for (const [key, value] of Object.entries(overlay)) {
    const existing = out[key]
    if (isPlainObject(existing) && isPlainObject(value)) {
      out[key] = mergeMaps(existing, value)
    } else if (Array.isArray(existing) && Array.isArray(value)) {
      out[key] = [...existing, ...value]
    } else {
      out[key] = value
    }
  }
  return out
}

function findKey(body: MobBody, name: string): string | undefined {
  if (Object.prototype.hasOwnProperty.call(body, name)) return name
  return Object.keys(body).find((k) => k.toLowerCase() === name.toLowerCase())
}

/**
 * Approximate Mythic inheritance merge for preview/apply.
 * Overlay (child) wins for scalars; lists concat template→mob; Options-style maps deep-merge.
 */
export function mergeInherited(base: MobBody, overlay: MobBody): MobBody {
  const out: MobBody = { ...base }
  for (const [rawKey, value] of Object.entries(overlay)) {
    const keyLower = rawKey.toLowerCase()
    if (keyLower === 'template' || keyLower === 'exclude') continue

    const existingKey = findKey(out, rawKey)
    const existing = existingKey !== undefined ? out[existingKey] : undefined

    if (LIST_MERGE_KEYS.has(keyLower) && Array.isArray(existing) && Array.isArray(value)) {
      if (existingKey && existingKey !== rawKey) delete out[existingKey]
      out[rawKey] = [...existing, ...value]
    } else if (MAP_MERGE_KEYS.has(keyLower) && isPlainObject(existing) && isPlainObject(value)) {
      if (existingKey && existingKey !== rawKey) delete out[existingKey]
      out[rawKey] = mergeMaps(existing, value)
    } else if (SLOT_MERGE_KEYS.has(keyLower) && Array.isArray(existing) && Array.isArray(value)) {
      if (existingKey && existingKey !== rawKey) delete out[existingKey]
      out[rawKey] = mergeSlotLists(existing, value)
    } else {
      if (existingKey && existingKey !== rawKey) delete out[existingKey]
      out[rawKey] = value
    }
  }
  return out
}

export function getMobField(body: MobBody, name: string): YamlValue | undefined {
  const key = findKey(body, name)
  return key !== undefined ? body[key] : undefined
}

export function omitMobFields(body: MobBody, names: string[]): MobBody {
  const deny = new Set(names.map((n) => n.toLowerCase()))
  const out: MobBody = {}
  for (const [k, v] of Object.entries(body)) {
    if (deny.has(k.toLowerCase())) continue
    out[k] = v
  }
  return out
}

export interface ResolveMobResult {
  body: MobBody
  /** True when a Template cycle was detected */
  cycle: boolean
  /** Template ids that could not be found */
  missing: string[]
  /** Ordered templates that were applied (left → right) */
  applied: string[]
}

/**
 * Resolve a mob through its Template chain (and multi-template lists).
 * Cycles stop resolution; Exclude drops named elements from the inherited result.
 */
export function resolveMob(
  mobId: string,
  allMobs: Record<string, MobBody>,
  visiting: Set<string> = new Set(),
): ResolveMobResult {
  const self = allMobs[mobId]
  if (!self) {
    return { body: {}, cycle: false, missing: [mobId], applied: [] }
  }

  if (visiting.has(mobId)) {
    return { body: { ...self }, cycle: true, missing: [], applied: [] }
  }

  const nextVisiting = new Set(visiting)
  nextVisiting.add(mobId)

  const templateRefs = parseTemplateRefs(getMobField(self, 'Template'))
  const exclude = parseExcludeList(getMobField(self, 'Exclude'))

  let merged: MobBody = {}
  const missing: string[] = []
  const applied: string[] = []
  let cycle = false

  for (const ref of templateRefs) {
    if (!allMobs[ref]) {
      missing.push(ref)
      continue
    }
    const resolved = resolveMob(ref, allMobs, nextVisiting)
    cycle = cycle || resolved.cycle
    missing.push(...resolved.missing)
    applied.push(...resolved.applied, ref)
    merged = mergeInherited(merged, resolved.body)
  }

  merged = omitMobFields(merged, ['Template', 'Exclude'])
  if (exclude.length) {
    merged = omitMobFields(merged, exclude)
  }

  const childOverlay = omitMobFields(self, ['Template', 'Exclude'])
  const body = mergeInherited(merged, childOverlay)
  return { body, cycle, missing: [...new Set(missing)], applied }
}

/** Collect all mob definitions from pack files (category === 'mobs'). */
export function collectMobsFromFiles(
  files: { path: string; category?: string; content: string }[],
  parse: (content: string) => { data: unknown },
): { mobs: Record<string, MobBody>; fileByMobId: Record<string, string> } {
  const mobs: Record<string, MobBody> = {}
  const fileByMobId: Record<string, string> = {}
  for (const file of files) {
    if (file.category !== 'mobs') continue
    const data = parse(file.content).data
    if (!data || typeof data !== 'object' || Array.isArray(data)) continue
    for (const [id, body] of Object.entries(data as Record<string, unknown>)) {
      if (!isPlainObject(body as YamlValue)) continue
      mobs[id] = body as MobBody
      fileByMobId[id] = file.path
    }
  }
  return { mobs, fileByMobId }
}
