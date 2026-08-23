import { parseYaml } from '../yaml/parseYaml'
import {
  collectMobsFromFiles,
  deepEqualYaml,
  getMobField,
  mergeInherited,
  omitMobFields,
  parseExcludeList,
  parseTemplateRefs,
  resolveMob,
  type MobBody,
  type YamlValue,
} from './templates'

export type TemplateHintKind = 'use_existing_template' | 'extract_template' | 'missing_template'

export interface TemplateHint {
  kind: TemplateHintKind
  /** Mobs that would gain Template: (children). For missing_template, the mob with the bad ref. */
  mobIds: string[]
  /** Keys in the shared block (empty for missing_template). */
  keys: string[]
  /** Existing or proposed template mob id. */
  templateId: string
  /** True when apply should append a new template definition. */
  createTemplate: boolean
  score: number
  message: string
  /** Shared values for apply/preview (key → value). */
  sharedValues: Record<string, YamlValue>
  /** File path for primary navigation (first child or missing ref mob). */
  filePath?: string
}

/** Keys that can form a template cluster (never identity-only). */
export const TEMPLATE_WORTHY_KEYS = [
  'Faction',
  'Options',
  'AIGoalSelectors',
  'AITargetSelectors',
  'DamageModifiers',
  'KillMessages',
  'Skills',
  'Modules',
] as const

const IDENTITY_KEYS = new Set(['display', 'health', 'damage', 'type'])

const META_KEYS = new Set(['template', 'exclude'])

function isPlainObject(value: unknown): value is Record<string, YamlValue> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function canonicalKey(body: MobBody, name: string): string | null {
  if (Object.prototype.hasOwnProperty.call(body, name)) return name
  const found = Object.keys(body).find((k) => k.toLowerCase() === name.toLowerCase())
  return found ?? null
}

function optionsEntryCount(value: YamlValue | undefined): number {
  if (!isPlainObject(value)) return 0
  return Object.keys(value).length
}

function skillsLineCount(value: YamlValue | undefined): number {
  if (Array.isArray(value)) return value.length
  if (typeof value === 'string') {
    return value.split(/\n|,(?![^{]*})/).map((s) => s.trim()).filter(Boolean).length
  }
  return 0
}

export function keyWeight(key: string, value: YamlValue | undefined): number {
  const lower = key.toLowerCase()
  if (lower === 'options') return Math.max(1, optionsEntryCount(value))
  if (lower === 'skills') return Math.max(1, skillsLineCount(value))
  if (lower === 'modules') return Math.max(1, optionsEntryCount(value))
  return 1
}

export function clusterMeetsMinWeight(keys: string[], values: Record<string, YamlValue>): boolean {
  if (keys.length >= 2) return true
  if (keys.length === 1) {
    const k = keys[0]!
    const w = keyWeight(k, values[k])
    const lower = k.toLowerCase()
    if (lower === 'options' && optionsEntryCount(values[k]) >= 3) return true
    if (lower === 'skills' && skillsLineCount(values[k]) >= 3) return true
    if (lower === 'modules' && optionsEntryCount(values[k]) >= 3) return true
    return w >= 3
  }
  return false
}

/** Local keys not already explained by template inheritance (identical value). */
export function localCandidateBody(mobId: string, allMobs: Record<string, MobBody>): MobBody {
  const self = allMobs[mobId]
  if (!self) return {}

  const templateRefs = parseTemplateRefs(getMobField(self, 'Template'))
  let inherited: MobBody = {}
  if (templateRefs.length) {
    for (const ref of templateRefs) {
      if (!allMobs[ref]) continue
      const resolved = resolveMob(ref, allMobs)
      inherited = mergeInherited(inherited, omitMobFields(resolved.body, ['Template', 'Exclude']))
    }
    const exclude = parseExcludeList(getMobField(self, 'Exclude'))
    if (exclude.length) inherited = omitMobFields(inherited, exclude)
  }

  const out: MobBody = {}
  for (const [key, value] of Object.entries(self)) {
    if (META_KEYS.has(key.toLowerCase())) continue
    if (IDENTITY_KEYS.has(key.toLowerCase())) continue
    const inhKey = canonicalKey(inherited, key)
    if (inhKey !== null && deepEqualYaml(inherited[inhKey], value)) {
      continue
    }
    out[key] = value
  }
  return out
}

function worthyFromBody(body: MobBody): { keys: string[]; values: Record<string, YamlValue> } {
  const keys: string[] = []
  const values: Record<string, YamlValue> = {}
  for (const worthy of TEMPLATE_WORTHY_KEYS) {
    const ck = canonicalKey(body, worthy)
    if (!ck) continue
    keys.push(worthy)
    values[worthy] = body[ck]!
  }
  return { keys, values }
}

function proposeTemplateId(
  sharedValues: Record<string, YamlValue>,
  _clusterMobIds: string[],
  allMobs: Record<string, MobBody>,
  usedIds: Set<string>,
): string {
  const faction = sharedValues.Faction
  if (typeof faction === 'string' && faction.trim()) {
    const base = `${faction.trim().replace(/\s+/g, '_')}_Base`
    if (!usedIds.has(base) && !allMobs[base]) return base
    let i = 2
    while (usedIds.has(`${base}_${i}`) || allMobs[`${base}_${i}`]) i++
    return `${base}_${i}`
  }
  const firstKey = Object.keys(sharedValues)[0] ?? 'Shared'
  const base = `${firstKey}_Base`
  if (!usedIds.has(base) && !allMobs[base]) return base
  let i = 2
  while (usedIds.has(`${base}_${i}`) || allMobs[`${base}_${i}`]) i++
  return `${base}_${i}`
}

function mobLooksLikePureBase(
  _mobId: string,
  sharedKeys: string[],
  local: MobBody,
): boolean {
  const worthy = worthyFromBody(local)
  // Pure base: every worthy local key is in the shared set (no unique worthy overrides)
  return worthy.keys.every((k) => sharedKeys.some((s) => s.toLowerCase() === k.toLowerCase()))
}

function findExactExistingTemplate(
  sharedKeys: string[],
  sharedValues: Record<string, YamlValue>,
  allMobs: Record<string, MobBody>,
  clusterMobIds: string[],
): string | null {
  // Prefer a cluster mob that matches exactly and looks like a pure base
  for (const id of clusterMobIds) {
    const body = allMobs[id]
    if (!body) continue
    const local = localCandidateBody(id, allMobs)
    const worthy = worthyFromBody(local)
    if (worthy.keys.length !== sharedKeys.length) continue
    if (!sharedKeys.every((k) => deepEqualYaml(worthy.values[k], sharedValues[k]))) continue
    if (!mobLooksLikePureBase(id, sharedKeys, local)) continue
    // Also allow identity fields on the base
    return id
  }

  // Any existing mob whose worthy local keys exactly equal the shared block
  for (const id of Object.keys(allMobs)) {
    if (clusterMobIds.includes(id)) continue
    const local = localCandidateBody(id, allMobs)
    const worthy = worthyFromBody(local)
    if (worthy.keys.length !== sharedKeys.length) continue
    if (!sharedKeys.every((k) => deepEqualYaml(worthy.values[k], sharedValues[k]))) continue
    return id
  }
  return null
}

interface RawCluster {
  mobIds: string[]
  keys: string[]
  values: Record<string, YamlValue>
  score: number
}

function detectClusters(
  allMobs: Record<string, MobBody>,
): RawCluster[] {
  const locals = new Map<string, MobBody>()
  for (const id of Object.keys(allMobs)) {
    locals.set(id, localCandidateBody(id, allMobs))
  }

  const mobIds = Object.keys(allMobs)
  const clusters: RawCluster[] = []
  const seen = new Set<string>()

  // For each worthy key, bucket by value fingerprint among mobs that have it locally
  for (const worthy of TEMPLATE_WORTHY_KEYS) {
    const buckets = new Map<string, string[]>()
    for (const id of mobIds) {
      const local = locals.get(id)!
      const ck = canonicalKey(local, worthy)
      if (!ck) continue
      const fp = JSON.stringify(local[ck] ?? null)
      const list = buckets.get(fp) ?? []
      list.push(id)
      buckets.set(fp, list)
    }

    for (const ids of buckets.values()) {
      if (ids.length < 2) continue

      // Expand to all worthy keys shared identically across this group
      const firstLocal = locals.get(ids[0]!)!
      const sharedKeys: string[] = []
      const sharedValues: Record<string, YamlValue> = {}
      for (const key of TEMPLATE_WORTHY_KEYS) {
        const ck0 = canonicalKey(firstLocal, key)
        if (!ck0) continue
        const v0 = firstLocal[ck0]!
        const allMatch = ids.every((id) => {
          const loc = locals.get(id)!
          const ck = canonicalKey(loc, key)
          return ck !== null && deepEqualYaml(loc[ck], v0)
        })
        if (allMatch) {
          sharedKeys.push(key)
          sharedValues[key] = v0
        }
      }

      if (!clusterMeetsMinWeight(sharedKeys, sharedValues)) continue

      const sig = `${[...ids].sort().join(',')}|${sharedKeys.join(',')}`
      if (seen.has(sig)) continue
      seen.add(sig)

      const weight = sharedKeys.reduce((sum, k) => sum + keyWeight(k, sharedValues[k]), 0)
      clusters.push({
        mobIds: [...ids],
        keys: sharedKeys,
        values: sharedValues,
        score: ids.length * weight,
      })
    }
  }

  // Drop overlapping weaker clusters (same mob set or key subset with lower score)
  clusters.sort((a, b) => b.score - a.score)
  const kept: RawCluster[] = []
  for (const c of clusters) {
    const overlapsWeaker = kept.some((k) => {
      const sameMobs =
        k.mobIds.length === c.mobIds.length &&
        k.mobIds.every((id) => c.mobIds.includes(id))
      const keysCovered = c.keys.every((key) => k.keys.includes(key))
      return sameMobs || (keysCovered && k.mobIds.filter((id) => c.mobIds.includes(id)).length >= 2)
    })
    if (overlapsWeaker) continue
    kept.push(c)
  }
  return kept
}

function describeHint(
  kind: TemplateHintKind,
  mobCount: number,
  keys: string[],
  templateId: string,
): string {
  const keysLabel =
    keys.length === 0
      ? ''
      : keys.length === 1
        ? keys[0]!
        : keys.length === 2
          ? `${keys[0]} and ${keys[1]}`
          : `${keys.slice(0, -1).join(', ')}, and ${keys[keys.length - 1]}`

  if (kind === 'missing_template') {
    return `Template "${templateId}" was not found. Check the id or add that mob to the pack.`
  }
  if (kind === 'use_existing_template') {
    return `${mobCount} mobs share the same ${keysLabel}. Use Template: ${templateId} so you only edit those fields in one place.`
  }
  return `${mobCount} mobs share the same ${keysLabel}. Review a shared template so you only edit those fields in one place.`
}

export function detectTemplateHints(
  files: { path: string; category?: string; content: string; ids?: string[] }[],
): TemplateHint[] {
  const { mobs, fileByMobId } = collectMobsFromFiles(files, parseYaml)
  const hints: TemplateHint[] = []

  // missing_template
  for (const [mobId, body] of Object.entries(mobs)) {
    const refs = parseTemplateRefs(getMobField(body, 'Template'))
    for (const ref of refs) {
      if (!mobs[ref]) {
        hints.push({
          kind: 'missing_template',
          mobIds: [mobId],
          keys: [],
          templateId: ref,
          createTemplate: false,
          score: 1,
          message: describeHint('missing_template', 1, [], ref),
          sharedValues: {},
          filePath: fileByMobId[mobId],
        })
      }
    }
  }

  const clusters = detectClusters(mobs)
  const usedProposed = new Set<string>()

  for (const cluster of clusters) {
    const existing = findExactExistingTemplate(
      cluster.keys,
      cluster.values,
      mobs,
      cluster.mobIds,
    )

    if (existing) {
      const children = cluster.mobIds.filter((id) => id !== existing)
      if (children.length === 0) continue
      // If existing is outside cluster, all cluster mobs are children
      const mobIds = cluster.mobIds.includes(existing)
        ? children
        : cluster.mobIds
      hints.push({
        kind: 'use_existing_template',
        mobIds,
        keys: cluster.keys,
        templateId: existing,
        createTemplate: false,
        score: cluster.score,
        message: describeHint('use_existing_template', cluster.mobIds.length, cluster.keys, existing),
        sharedValues: cluster.values,
        filePath: fileByMobId[mobIds[0]!],
      })
      continue
    }

    // Prefer promoting a pure-base cluster mob
    let templateId: string | null = null
    let createTemplate = true
    for (const id of cluster.mobIds) {
      const local = localCandidateBody(id, mobs)
      if (mobLooksLikePureBase(id, cluster.keys, local)) {
        const worthy = worthyFromBody(local)
        if (
          worthy.keys.length === cluster.keys.length &&
          cluster.keys.every((k) => deepEqualYaml(worthy.values[k], cluster.values[k]))
        ) {
          templateId = id
          createTemplate = false
          break
        }
      }
    }

    if (!templateId) {
      templateId = proposeTemplateId(cluster.values, cluster.mobIds, mobs, usedProposed)
      usedProposed.add(templateId)
      createTemplate = true
    }

    const children = createTemplate
      ? cluster.mobIds
      : cluster.mobIds.filter((id) => id !== templateId)

    if (children.length < (createTemplate ? 2 : 1)) continue

    hints.push({
      kind: 'extract_template',
      mobIds: children,
      keys: cluster.keys,
      templateId,
      createTemplate,
      score: cluster.score,
      message: describeHint('extract_template', cluster.mobIds.length, cluster.keys, templateId),
      sharedValues: cluster.values,
      filePath: fileByMobId[children[0]!],
    })
  }

  hints.sort((a, b) => b.score - a.score || a.kind.localeCompare(b.kind))
  return hints.slice(0, 5)
}
