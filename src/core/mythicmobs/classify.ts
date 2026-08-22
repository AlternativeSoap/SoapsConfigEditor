import type { MythicCategory } from '../../types'

const CATEGORY_FOLDERS: Record<string, MythicCategory> = {
  mobs: 'mobs',
  items: 'items',
  skills: 'skills',
  droptables: 'droptables',
  randomspawns: 'randomspawns',
  menus: 'menus',
  archetypes: 'archetypes',
  reagents: 'reagents',
}

export function classifyMythicCategory(filePath: string): MythicCategory {
  const normalized = filePath.replace(/\\/g, '/')
  const baseName = normalized.split('/').pop()?.toLowerCase() ?? ''
  if (baseName === 'reagents.yml' || baseName.startsWith('reagents.')) {
    return 'reagents'
  }
  if (baseName === 'stats.yml' || baseName.endsWith('.stat.yml')) {
    return 'other'
  }

  const segments = normalized.split('/').filter(Boolean)
  for (const segment of segments) {
    const mapped = CATEGORY_FOLDERS[segment.toLowerCase()]
    if (mapped) return mapped
  }
  return 'other'
}

export function detectPackName(filePath: string, rootName = ''): string {
  const segments = filePath.replace(/\\/g, '/').split('/').filter(Boolean)
  const packsIndex = segments.findIndex((segment) => segment === 'Packs')
  if (packsIndex >= 0 && segments[packsIndex + 1]) {
    return segments[packsIndex + 1]
  }

  const first = segments[0]?.toLowerCase() ?? ''
  if (first && CATEGORY_FOLDERS[first] && rootName) {
    return rootName
  }

  return segments[0] ?? rootName ?? 'Unknown Pack'
}
