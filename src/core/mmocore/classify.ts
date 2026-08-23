import type { MythicCategory } from '../../types'

const NORM = (p: string) => p.replace(/\\/g, '/').toLowerCase()

export function classifyMMOCoreCategory(path: string): MythicCategory {
  const p = NORM(path)

  if (p.includes('/classes/') || p.startsWith('classes/') || /\/classes\/[^/]+\.ya?ml$/.test(p)) {
    return 'classes'
  }
  if (p.includes('/exp-curves/') || p.includes('/exp_curves/') || p.startsWith('exp-curves/')) {
    return 'exp-curves'
  }
  if (p.includes('/gui/') || p.startsWith('gui/')) {
    return 'gui'
  }
  // MythicLib skill registrations
  if (p.includes('mythiclib/') && (p.includes('/skill/') || p.includes('/skills/'))) {
    return 'skills'
  }
  // MythicMobs skills under class pack
  if (p.includes('mythicmobs/') && (p.includes('/skills/') || p.includes('/skill/'))) {
    return 'skills'
  }
  if (p.includes('/mobs/')) return 'mobs'
  if (p.includes('/items/')) return 'items'
  if (p.includes('/droptables/') || p.includes('/drop-tables/')) return 'droptables'
  if (p.includes('/randomspawns/') || p.includes('/random-spawns/')) return 'randomspawns'
  if (p.includes('/menus/')) return 'menus'
  const base = p.split('/').pop() ?? p
  if (base === 'elements.yml' || base.endsWith('/elements.yml')) {
    return 'elements'
  }
  return 'other'
}

export function detectMMOCorePackName(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/').filter(Boolean)
  const lower = parts.map((p) => p.toLowerCase())

  const mmIdx = lower.findIndex((p) => p === 'mythicmobs')
  if (mmIdx >= 0) {
    const packsIdx = lower.indexOf('packs', mmIdx)
    if (packsIdx >= 0 && parts[packsIdx + 1]) return parts[packsIdx + 1]
    return 'MythicMobs'
  }

  const mlIdx = lower.findIndex((p) => p === 'mythiclib')
  if (mlIdx >= 0) return 'MythicLib'

  const mcIdx = lower.findIndex((p) => p === 'mmocore')
  if (mcIdx >= 0) return 'MMOCore'

  if (parts.length >= 2) return parts[0]
  return 'root'
}

export function hasMMOCoreFolder(paths: string[]): boolean {
  return paths.some((p) => NORM(p).includes('mmocore/') || NORM(p).startsWith('mmocore/') || NORM(p).includes('/classes/'))
}

export function hasMythicLibFolder(paths: string[]): boolean {
  return paths.some((p) => NORM(p).includes('mythiclib/'))
}

export function hasMythicMobsFolder(paths: string[]): boolean {
  return paths.some((p) => NORM(p).includes('mythicmobs/'))
}
