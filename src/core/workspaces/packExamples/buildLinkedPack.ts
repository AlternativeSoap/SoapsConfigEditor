import type { FileRecord } from '../../../types'
import type { MythicAddons } from '../mythicAddons'
import { buildGaleboundCoreFiles } from './galeboundCore'
import { buildGaleboundCrucibleFiles } from './galeboundCrucible'
import { buildGaleboundRpgFiles } from './galeboundRpg'

/** Build the Galebound Covenant linked example pack for MythicMobs workspaces. */
export function buildLinkedPack(packName: string, addons: MythicAddons): FileRecord[] {
  const files: FileRecord[] = [
    ...buildGaleboundCoreFiles(packName, addons),
  ]

  if (addons.mythicrpg) {
    files.push(...buildGaleboundRpgFiles(packName))
  }

  if (addons.crucible) {
    files.push(...buildGaleboundCrucibleFiles(packName))
  }

  return files
}
