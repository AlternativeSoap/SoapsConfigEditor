import { describe, expect, it } from 'vitest'
import {
  generateArchetypeYaml,
  generateMaxManaStatYaml,
  generateReagentYaml,
  generateSpellYaml,
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
    expect(yaml).toContain('Bindable: true')
    expect(yaml).toContain('Trigger: ~onUse')
    expect(yaml).toContain('mana 40')
    expect(yaml).toContain('DAMAGE:')
  })

  it('generates a Wizard archetype', () => {
    const yaml = generateArchetypeYaml(ARCHETYPE_PRESETS[0].apply())
    expect(yaml).toContain('Wizard:')
    expect(yaml).toContain('Group: CLASS')
    expect(yaml).toContain('ExperienceSource: SPELLCASTING')
    expect(yaml).toContain('SpellUnlocks:')
  })

  it('generates mana reagent and max mana stat', () => {
    const reagent = generateReagentYaml(REAGENT_PRESETS[0].apply())
    expect(reagent).toContain('Mana:')
    expect(reagent).toContain('MaxValue: stat.MAX_MANA')
    expect(reagent).toContain('Global: true')
    const stat = generateMaxManaStatYaml(1000)
    expect(stat).toContain('MAX_MANA:')
    expect(stat).toContain('BaseValue: 1000')
  })
})

describe('mythicrpg classify and scaffold', () => {
  it('classifies archetypes and reagents folders', () => {
    expect(classifyMythicCategory('Packs/Demo/Archetypes/classes.yml')).toBe('archetypes')
    expect(classifyMythicCategory('Packs/Demo/reagents.yml')).toBe('reagents')
    expect(classifyMythicCategory('Packs/Demo/Reagents/mana.yml')).toBe('reagents')
  })

  it('scaffolds RPG files when MythicRPG addon is on', () => {
    const files = scaffoldPack('mythicmobs', {
      packName: 'Demo',
      mythicAddons: { crucible: false, mythicrpg: true },
    })
    expect(files.some((f) => f.path.includes('Archetypes/classes.yml'))).toBe(true)
    expect(files.some((f) => f.path.endsWith('reagents.yml'))).toBe(true)
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

describe('legacy mythicrpg workspace migration', () => {
  it('maps mythicrpg storage to mythicmobs', () => {
    expect(parseWorkspaceKind('mythicrpg')).toBe('mythicmobs')
    expect(wasLegacyMythicRpgWorkspace('mythicrpg')).toBe(true)
    expect(wasLegacyMythicRpgWorkspace('mythicmobs')).toBe(false)
  })
})
