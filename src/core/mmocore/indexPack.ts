import { extractTopLevelIds, parseYaml } from '../yaml/parseYaml'
import type { FileRecord, SkillModifierValues } from '../../types'
import { classifyMMOCoreCategory } from './classify'

export interface MythicLibSkillInfo {
  id: string
  name: string
  icon: string
  categories: string[]
  source: string
  path: string
  parameters: Record<string, SkillModifierValues>
}

export interface MMOCorePackIndex {
  classIds: string[]
  classPaths: string[]
  defaultClassIds: string[]
  expCurves: string[]
  mythicLibSkills: MythicLibSkillInfo[]
  mythicMobsSkillIds: string[]
  skillTreeHints: string[]
  hasMythicLib: boolean
  hasMythicMobs: boolean
  hasMMOCore: boolean
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value)
  return fallback
}

function readModifier(raw: unknown): SkillModifierValues | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const player = (obj.player && typeof obj.player === 'object' ? obj.player : obj) as Record<
    string,
    unknown
  >
  return {
    base: asNumber(player.base),
    perLevel: asNumber(player['per-level'] ?? player.perLevel),
    min: player.min !== undefined ? asNumber(player.min) : undefined,
    max: player.max !== undefined ? asNumber(player.max) : undefined,
  }
}

export function parseMythicLibSkills(file: FileRecord): MythicLibSkillInfo[] {
  if (classifyMMOCoreCategory(file.path) !== 'skills') return []
  if (!file.path.replace(/\\/g, '/').toLowerCase().includes('mythiclib')) return []

  const parsed = parseYaml(file.content)
  if (!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) return []

  const out: MythicLibSkillInfo[] = []
  for (const [id, raw] of Object.entries(parsed.data as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object') continue
    const skill = raw as Record<string, unknown>
    const categories = Array.isArray(skill.categories)
      ? skill.categories.map(String)
      : []
    const parameters: Record<string, SkillModifierValues> = {}
    if (skill.parameters && typeof skill.parameters === 'object') {
      for (const [key, val] of Object.entries(skill.parameters as Record<string, unknown>)) {
        const mod = readModifier(val)
        if (mod) parameters[key] = mod
      }
    }
    out.push({
      id,
      name: typeof skill.name === 'string' ? skill.name : id,
      icon: typeof skill.icon === 'string' ? skill.icon : 'BOOK',
      categories,
      source: typeof skill.source === 'string' ? skill.source : '',
      path: file.path,
      parameters,
    })
  }
  return out
}

function isDefaultClass(content: string): boolean {
  return /options:\s*[\s\S]*?default:\s*true/i.test(content)
}

export function indexMMOCorePack(files: FileRecord[]): MMOCorePackIndex {
  const classFiles = files.filter((f) => classifyMMOCoreCategory(f.path) === 'classes')
  const classIds: string[] = []
  const classPaths: string[] = []
  const defaultClassIds: string[] = []

  for (const file of classFiles) {
    // Prefer filename stem as class id (Elementals pattern)
    const stem = file.name.replace(/\.ya?ml$/i, '')
    if (stem.startsWith('.')) continue
    classIds.push(stem)
    classPaths.push(file.path)
    if (isDefaultClass(file.content)) defaultClassIds.push(stem)
  }

  const expCurves = files
    .filter((f) => classifyMMOCoreCategory(f.path) === 'exp-curves')
    .map((f) => f.name.replace(/\.(txt|ya?ml)$/i, ''))

  const mythicLibSkills = files.flatMap(parseMythicLibSkills)

  const mythicMobsSkillIds: string[] = []
  for (const file of files) {
    const p = file.path.replace(/\\/g, '/').toLowerCase()
    if (!p.includes('mythicmobs')) continue
    if (!p.includes('/skills/') && !p.includes('/skill/')) continue
    mythicMobsSkillIds.push(...extractTopLevelIds(parseYaml(file.content).data))
  }

  const paths = files.map((f) => f.path)
  return {
    classIds,
    classPaths,
    defaultClassIds,
    expCurves,
    mythicLibSkills,
    mythicMobsSkillIds: [...new Set(mythicMobsSkillIds)],
    skillTreeHints: [],
    hasMythicLib: paths.some((p) => p.replace(/\\/g, '/').toLowerCase().includes('mythiclib')),
    hasMythicMobs: paths.some((p) => p.replace(/\\/g, '/').toLowerCase().includes('mythicmobs')),
    hasMMOCore: paths.some((p) => {
      const n = p.replace(/\\/g, '/').toLowerCase()
      return n.includes('mmocore') || n.includes('/classes/')
    }),
  }
}
