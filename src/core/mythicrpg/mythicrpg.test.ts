import { describe, expect, it } from 'vitest'
import {
  generateArchetypeYaml,
  generateMaxManaStatYaml,
  generateReagentYaml,
  generateSpellYaml,
  yamlHasTopLevelKey,
} from './generators'
import { ARCHETYPE_PRESETS, REAGENT_PRESETS, SPELL_PRESETS } from '../../data/mythicrpg/presets'
import { classifyMythicCategory } from '../mythicmobs/classify'
import { scaffoldPack } from '../workspaces/scaffoldPack'
import { parseWorkspaceKind, wasLegacyMythicRpgWorkspace } from '../workspaces/profiles'

describe('mythicrpg generators', () => {
  it('generates a bound spell from the Magic Missile preset', () => {
    const yaml = generateSpellYaml(SPELL_PRESETS[0].apply())
    expect(yaml).toContain('MAGIC_MISSILE:')
    expect(yaml).toContain('Spell: true')
    expect(yaml).toContain('Type: ACTIVE')
    expect(yaml).toContain('Trigger: USE')
    expect(yaml).toContain('Icon: NETHER_STAR')
    expect(yaml).toContain('Mana{amount=<spell.mod.MAGIC_MISSILE.cost>}')
    expect(yaml).toContain('damage:')
    expect(yaml).toContain('<spell.mod.MAGIC_MISSILE.damage>')
  })

  it('generates a Wizard archetype with Bindings', () => {
    const yaml = generateArchetypeYaml(ARCHETYPE_PRESETS[0]!.apply())
    expect(yaml).toContain('Wizard:')
    expect(yaml).toContain('Group: CLASS')
    expect(yaml).toContain('ExperienceSource: SPELLCASTING')
    expect(yaml).toContain('Bindings:')
    expect(yaml).toContain('1 MAGIC_MISSILE')
    expect(yaml).toContain('PointRewards:')
    expect(yaml).toContain('InitSkills:')
    expect(yaml).not.toContain('SpellUnlocks:')
  })

  it('generates mana reagent and max mana stat', () => {
    const reagent = generateReagentYaml(REAGENT_PRESETS[0].apply())
    expect(reagent).toContain('Mana:')
    expect(reagent).toContain('MaxValue: stat.MAX_MANA')
    expect(reagent).not.toContain('Global:')
    const stat = generateMaxManaStatYaml(100)
    expect(stat).toContain('MAX_MANA:')
    expect(stat).toContain('PlayerBaseValue: 100')
    expect(stat).toContain('Type: STATIC')
    expect(stat).not.toMatch(/^\s*BaseValue:/m)
  })
})

describe('mythicrpg classify and scaffold', () => {
  it('classifies archetypes, reagents, talents, and points', () => {
    expect(classifyMythicCategory('Packs/Demo/Archetypes/classes.yml')).toBe('archetypes')
    expect(classifyMythicCategory('Packs/Demo/reagents.yml')).toBe('reagents')
    expect(classifyMythicCategory('Packs/Demo/Reagents/mana.yml')).toBe('reagents')
    expect(classifyMythicCategory('Packs/Demo/talents.yml')).toBe('talents')
    expect(classifyMythicCategory('Packs/Demo/points.yml')).toBe('points')
  })

  it('scaffolds RPG files when MythicRPG addon is on', () => {
    const files = scaffoldPack('mythicmobs', {
      packName: 'Demo',
      mythicAddons: { crucible: false, mythicrpg: true },
    })
    expect(files.some((f) => f.path.includes('Archetypes/classes.yml'))).toBe(true)
    expect(files.some((f) => f.path.endsWith('reagents.yml'))).toBe(true)
    expect(files.some((f) => f.path.endsWith('stats.yml'))).toBe(true)
    expect(files.some((f) => f.path.endsWith('points.yml'))).toBe(true)
    expect(files.some((f) => f.path.endsWith('talents.yml'))).toBe(true)
    expect(files.some((f) => f.path.endsWith('experience-curves.yml'))).toBe(true)
    expect(files.some((f) => f.path.endsWith('experience-sources.yml'))).toBe(true)
    const sources = files.find((f) => f.path.endsWith('experience-sources.yml'))?.content ?? ''
    expect(sources).toContain('Type: KILL_ENTITY')
    expect(sources).toContain('Type: CAST_SPELL')
    expect(sources).toContain('Type: BLOCK_BREAK')
  })

  it('does not scaffold RPG files when MythicRPG addon is off', () => {
    const files = scaffoldPack('mythicmobs', {
      packName: 'Demo',
      mythicAddons: { crucible: false, mythicrpg: false },
    })
    expect(files.some((f) => f.path.includes('Archetypes'))).toBe(false)
    expect(files.some((f) => f.path.endsWith('reagents.yml'))).toBe(false)
  })
})

describe('yamlHasTopLevelKey', () => {
  it('detects existing top-level ids', () => {
    expect(yamlHasTopLevelKey('Mana:\n  Display: Mana\n', 'Mana')).toBe(true)
    expect(yamlHasTopLevelKey('Mana:\n  Display: Mana\n', 'Stamina')).toBe(false)
  })
})

describe('legacy mythicrpg workspace migration', () => {
  it('maps mythicrpg storage to mythicmobs', () => {
    expect(parseWorkspaceKind('mythicrpg')).toBe('mythicmobs')
    expect(wasLegacyMythicRpgWorkspace('mythicrpg')).toBe(true)
    expect(wasLegacyMythicRpgWorkspace('mythicmobs')).toBe(false)
  })
})
