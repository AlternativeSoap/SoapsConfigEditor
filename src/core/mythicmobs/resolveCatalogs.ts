import { CRUCIBLE_CONDITIONS } from '../../data/mythiccrucible/conditions'
import { CRUCIBLE_MECHANICS } from '../../data/mythiccrucible/mechanics'
import { CRUCIBLE_TARGETERS } from '../../data/mythiccrucible/targeters'
import { CRUCIBLE_TRIGGERS } from '../../data/mythiccrucible/triggers'
import { CONDITIONS, type ConditionEntry } from '../../data/mythicmobs/conditions'
import { MECHANICS, type MechanicEntry } from '../../data/mythicmobs/mechanics'
import { TARGETERS, type TargeterEntry } from '../../data/mythicmobs/targeters'
import { TRIGGERS, type TriggerEntry } from '../../data/mythicmobs/triggers'

export interface MythicCatalogs {
  mechanics: MechanicEntry[]
  targeters: TargeterEntry[]
  conditions: ConditionEntry[]
  triggers: TriggerEntry[]
}

/** Append extras that are not already in base (by id). */
function mergeById<T extends { id: string }>(base: T[], extra: T[]): T[] {
  const seen = new Set(base.map((e) => e.id.toLowerCase()))
  const added = extra.filter((e) => !seen.has(e.id.toLowerCase()))
  return added.length === 0 ? base : [...base, ...added]
}

/** Merge extras over base when ids collide (Crucible upgrades like hasitem). */
function mergePreferExtra<T extends { id: string }>(base: T[], extra: T[]): T[] {
  const byId = new Map(base.map((e) => [e.id.toLowerCase(), e]))
  for (const e of extra) byId.set(e.id.toLowerCase(), e)
  const order: string[] = []
  const seen = new Set<string>()
  for (const e of base) {
    const key = e.id.toLowerCase()
    if (!seen.has(key)) {
      order.push(key)
      seen.add(key)
    }
  }
  for (const e of extra) {
    const key = e.id.toLowerCase()
    if (!seen.has(key)) {
      order.push(key)
      seen.add(key)
    }
  }
  return order.map((key) => byId.get(key)!)
}

const BASE_CATALOGS: MythicCatalogs = {
  mechanics: MECHANICS,
  targeters: TARGETERS,
  conditions: CONDITIONS,
  triggers: TRIGGERS,
}

let crucibleCatalogs: MythicCatalogs | null = null

/** Resolve MythicMobs catalogs, optionally merging Crucible-only entries. */
export function resolveMythicCatalogs(crucible: boolean): MythicCatalogs {
  if (!crucible) return BASE_CATALOGS
  if (!crucibleCatalogs) {
    crucibleCatalogs = {
      mechanics: mergeById(MECHANICS, CRUCIBLE_MECHANICS),
      targeters: mergeById(TARGETERS, CRUCIBLE_TARGETERS),
      conditions: mergePreferExtra(CONDITIONS, CRUCIBLE_CONDITIONS),
      triggers: mergeById(TRIGGERS, CRUCIBLE_TRIGGERS),
    }
  }
  return crucibleCatalogs
}
