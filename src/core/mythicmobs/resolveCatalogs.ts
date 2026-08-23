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

function mergeById<T extends { id: string }>(base: T[], extra: T[]): T[] {
  const seen = new Set(base.map((e) => e.id.toLowerCase()))
  const added = extra.filter((e) => !seen.has(e.id.toLowerCase()))
  return added.length === 0 ? base : [...base, ...added]
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
      conditions: mergeById(CONDITIONS, CRUCIBLE_CONDITIONS),
      triggers: mergeById(TRIGGERS, CRUCIBLE_TRIGGERS),
    }
  }
  return crucibleCatalogs
}
