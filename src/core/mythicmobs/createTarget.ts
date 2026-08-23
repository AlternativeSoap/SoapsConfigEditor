import type { FileRecord, MythicCategory } from '../../types'
import { classifyMythicCategory } from './classify'

/** Canonical MythicMobs folder names under a pack root. */
export const CATEGORY_FOLDER_NAME: Record<
  'mobs' | 'items' | 'skills' | 'droptables' | 'randomspawns',
  string
> = {
  mobs: 'Mobs',
  items: 'Items',
  skills: 'Skills',
  droptables: 'DropTables',
  randomspawns: 'RandomSpawns',
}

export function dirnameOf(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const idx = normalized.lastIndexOf('/')
  return idx >= 0 ? normalized.slice(0, idx) : ''
}

export function joinPath(dir: string, fileName: string): string {
  const d = dir.replace(/\\/g, '/').replace(/\/+$/, '')
  const f = fileName.replace(/\\/g, '/').replace(/^\/+/, '')
  return d ? `${d}/${f}` : f
}

/** Safe YAML file name; adds .yml when missing. */
export function sanitizeYamlFileName(raw: string): string {
  let name = raw.trim().replace(/\\/g, '/').split('/').pop() ?? ''
  name = name.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '')
  if (!name) name = 'new'
  if (!/\.(ya?ml)$/i.test(name)) name = `${name}.yml`
  return name
}

export function defaultYamlFileNameFromId(id: string, fallbackStem: string): string {
  const stem =
    id
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || fallbackStem
  return `${stem}.yml`
}

/**
 * Folder for a new YAML of the given category.
 * Prefers the directory of suggestedPath / existing category files, then pack-relative defaults.
 */
export function resolveCreateFolder(
  category: keyof typeof CATEGORY_FOLDER_NAME,
  files: FileRecord[],
  suggestedPath: string,
): string {
  const folderName = CATEGORY_FOLDER_NAME[category]
  const preferredPaths = [
    suggestedPath,
    ...files.filter((f) => f.category === category).map((f) => f.path),
  ].filter(Boolean)

  for (const path of preferredPaths) {
    if (classifyMythicCategory(path) !== category) continue
    const dir = dirnameOf(path)
    if (dir) return dir
  }

  for (const file of files) {
    const normalized = file.path.replace(/\\/g, '/')
    const packsMatch = normalized.match(/^(.*?\/Packs\/[^/]+)/i)
    if (packsMatch?.[1]) return `${packsMatch[1]}/${folderName}`
    if (file.pack && normalized.startsWith(`${file.pack}/`)) {
      return `${file.pack}/${folderName}`
    }
  }

  return `MythicMobs/Packs/Pack/${folderName}`
}

export function isMythicCreateCategory(
  category: MythicCategory,
): category is keyof typeof CATEGORY_FOLDER_NAME {
  return category in CATEGORY_FOLDER_NAME
}
