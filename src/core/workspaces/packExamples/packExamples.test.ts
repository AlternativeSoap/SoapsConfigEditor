import { describe, expect, it } from 'vitest'
import { classifyMythicCategory, detectPackName } from '../../mythicmobs/classify'
import { validatePack } from '../../mythicmobs/validate'
import { extractTopLevelIds, parseYaml } from '../../yaml/parseYaml'
import type { FileRecord } from '../../../types'
import { buildLinkedPack } from './buildLinkedPack'
import { scaffoldPack } from '../scaffoldPack'

function withIds(records: FileRecord[], packName: string): FileRecord[] {
  return records.map((file) => {
    const category = classifyMythicCategory(file.path)
    return {
      ...file,
      category,
      pack: detectPackName(file.path, packName),
      ids: extractTopLevelIds(parseYaml(file.content).data),
    }
  })
}

function paths(records: FileRecord[]): string[] {
  return records.map((f) => f.path.replace(/\\/g, '/')).sort()
}

describe('buildLinkedPack', () => {
  it('creates core Galebound files when only MythicMobs is enabled', () => {
    const raw = buildLinkedPack('Demo', { crucible: false, mythicrpg: false })
    const list = paths(raw)
    expect(list.some((p) => p.endsWith('/Skills/galebound_storm.yml'))).toBe(true)
    expect(list.some((p) => p.endsWith('/Mobs/galebound_sentinel.yml'))).toBe(true)
    expect(list.some((p) => p.endsWith('/Items/trinkets.yml'))).toBe(true)
    expect(list.some((p) => p.includes('/Archetypes/'))).toBe(false)
    expect(list.some((p) => p.endsWith('/equipment-sets.yml'))).toBe(false)
    expect(raw.length).toBeGreaterThanOrEqual(9)
  })

  it('adds MythicRPG files when mythicrpg addon is on', () => {
    const raw = buildLinkedPack('Demo', { crucible: false, mythicrpg: true })
    const list = paths(raw)
    expect(list.some((p) => p.endsWith('/reagents.yml'))).toBe(true)
    expect(list.some((p) => p.endsWith('/stats.yml'))).toBe(true)
    expect(list.some((p) => p.endsWith('/Skills/player_galebinder.yml'))).toBe(true)
    expect(list.some((p) => p.endsWith('/Archetypes/classes.yml'))).toBe(true)
  })

  it('adds Crucible files when crucible addon is on', () => {
    const raw = buildLinkedPack('Demo', { crucible: true, mythicrpg: false })
    const list = paths(raw)
    expect(list.some((p) => p.endsWith('/equipment-sets.yml'))).toBe(true)
    expect(list.some((p) => p.endsWith('/augments.yml'))).toBe(true)
    expect(list.some((p) => p.endsWith('/Items/gear.yml'))).toBe(true)
    expect(list.some((p) => p.endsWith('/Items/weapons.yml'))).toBe(true)
  })

  it('passes validatePack for full RPG and Crucible example pack', () => {
    const files = withIds(
      buildLinkedPack('Demo', { crucible: true, mythicrpg: true }),
      'Demo',
    )
    const issues = validatePack(files)
    expect(issues).toEqual([])
  })

  it('links Galebinder unlocks to spell ids', () => {
    const files = withIds(
      buildLinkedPack('Demo', { crucible: false, mythicrpg: true }),
      'Demo',
    )
    const archetypeFile = files.find((f) => f.path.endsWith('/Archetypes/classes.yml'))
    const spellFile = files.find((f) => f.path.endsWith('/Skills/player_galebinder.yml'))
    expect(archetypeFile?.content).toContain('GALE_DART')
    expect(archetypeFile?.content).toContain('MIST_VEIL')
    expect(spellFile?.ids).toContain('GALE_DART')
    expect(spellFile?.ids).toContain('MIST_VEIL')
  })

  it('does not include copied reference pack ids in core tier', () => {
    const blob = buildLinkedPack('Demo', { crucible: false, mythicrpg: false })
      .map((f) => f.content)
      .join('\n')
    expect(blob).not.toContain('FIRE_FIREBALL')
    expect(blob).not.toContain('RIFTBLADE_')
    expect(blob).not.toContain('EMBER_GUARD')
  })
})

describe('scaffoldPack includeExamples', () => {
  it('uses empty stubs when includeExamples is false', () => {
    const files = scaffoldPack('mythicmobs', {
      packName: 'Demo',
      mythicAddons: { crucible: false, mythicrpg: false },
      includeExamples: false,
    })
    expect(paths(files)).toEqual([
      'MythicMobs/Packs/Demo/DropTables/droptables.yml',
      'MythicMobs/Packs/Demo/Items/items.yml',
      'MythicMobs/Packs/Demo/Mobs/mobs.yml',
      'MythicMobs/Packs/Demo/Skills/skills.yml',
      'MythicMobs/Packs/Demo/packinfo.yml',
      'MythicMobs/Packs/Demo/randomspawns/randomspawns.yml',
    ])
  })

  it('delegates to buildLinkedPack when includeExamples is true', () => {
    const files = scaffoldPack('mythicmobs', {
      packName: 'Demo',
      mythicAddons: { crucible: false, mythicrpg: false },
      includeExamples: true,
    })
    expect(files.some((f) => f.path.includes('galebound_sentinel'))).toBe(true)
    expect(files.some((f) => f.path.endsWith('/Mobs/mobs.yml'))).toBe(false)
  })
})
