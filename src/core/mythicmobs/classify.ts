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
  if (baseName === 'mobs.yml' || baseName.startsWith('mobs.')) {
    return 'mobs'
  }
  if (baseName === 'reagents.yml' || baseName.startsWith('reagents.')) {
    return 'reagents'
  }
  if (baseName === 'equipment-sets.yml' || baseName.startsWith('equipment-sets.')) {
    return 'equipment-sets'
  }
  if (baseName === 'augments.yml' || baseName.startsWith('augments.')) {
    return 'augments'
  }
  if (baseName === 'lore-templates.yml' || baseName.startsWith('lore-templates.')) {
    return 'lore-templates'
  }
  if (baseName === 'placeholders.yml' || baseName.startsWith('placeholders.')) {
    return 'placeholders'
  }
  if (baseName === 'stats.yml' || baseName.endsWith('.stat.yml')) {
    return 'stats'
  }
  if (baseName === 'experience-curves.yml' || baseName.startsWith('experience-curves.')) {
    return 'experience-curves'
  }
  if (baseName === 'experience-sources.yml' || baseName.startsWith('experience-sources.')) {
    return 'experience-sources'
  }
  if (baseName === 'packinfo.yml' || baseName.startsWith('packinfo.')) {
    return 'packinfo'
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
