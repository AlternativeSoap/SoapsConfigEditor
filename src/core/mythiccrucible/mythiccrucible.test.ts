import { describe, expect, it } from 'vitest'
import {
  generateAugmentTypeYaml,
  generateCrucibleItemYaml,
  generateEquipmentSetYaml,
} from './generators'
import {
  AUGMENT_TYPE_PRESETS,
  CRUCIBLE_ITEM_PRESETS,
  EQUIPMENT_SET_PRESETS,
} from '../../data/mythiccrucible/presets'
import { CRUCIBLE_MECHANICS } from '../../data/mythiccrucible/mechanics'
import { CRUCIBLE_TRIGGERS } from '../../data/mythiccrucible/triggers'
import { classifyMythicCategory } from '../mythicmobs/classify'
import { resolveMythicCatalogs } from '../mythicmobs/resolveCatalogs'
import { validateCrucibleItemReferences } from '../mythicmobs/validate'
import { MECHANICS } from '../../data/mythicmobs/mechanics'
import { TRIGGERS } from '../../data/mythicmobs/triggers'
import { scaffoldPack } from '../workspaces/scaffoldPack'
import type { FileRecord } from '../../types'

describe('mythiccrucible generators', () => {
  it('generates an equipment set from the Ember Guard preset', () => {
    const yaml = generateEquipmentSetYaml(EQUIPMENT_SET_PRESETS[0]!.apply())
    expect(yaml).toContain('EMBER_GUARD:')
    expect(yaml).toContain('Enabled: true')
    expect(yaml).toContain('Bonuses:')
    expect(yaml).toContain('Pieces: 2')
    expect(yaml).toContain('DEFENSE 10 ADDITIVE')
    expect(yaml).toContain('~onDamaged')
  })

  it('generates an augment type', () => {
    const yaml = generateAugmentTypeYaml(AUGMENT_TYPE_PRESETS[0]!.apply())
    expect(yaml).toContain('SPARK_GEM:')
    expect(yaml).toContain('Formatting:')
    expect(yaml).toContain('Icons:')
    expect(yaml).toContain('ShowEmptySlot: true')
  })

  it('generates a bag item', () => {
    const yaml = generateCrucibleItemYaml(CRUCIBLE_ITEM_PRESETS.find((p) => p.id === 'bag')!.apply())
    expect(yaml).toContain('TRAVELER_SATCHEL:')
    expect(yaml).toContain('Type: BAG')
    expect(yaml).toContain('Inventory:')
    expect(yaml).toContain('Size: 9')
    expect(yaml).toContain('Recipes:')
    expect(yaml).toContain('Type: SHAPED')
  })

  it('generates a gem with Augmentation block', () => {
    const yaml = generateCrucibleItemYaml(CRUCIBLE_ITEM_PRESETS.find((p) => p.id === 'gem')!.apply())
    expect(yaml).toContain('Augmentation:')
    expect(yaml).toContain('Type: SPARK_GEM')
    expect(yaml).toContain('ATTACK_SPEED 0.1 ADDITIVE')
  })

  it('generates a set piece with EquipmentSet and slots', () => {
    const yaml = generateCrucibleItemYaml(
      CRUCIBLE_ITEM_PRESETS.find((p) => p.id === 'set_piece')!.apply(),
    )
    expect(yaml).toContain('EquipmentSet: EMBER_GUARD')
    expect(yaml).toContain('AugmentationSlots:')
    expect(yaml).toContain('Type: SPARK_GEM')
  })

  it('generates a consumable with onUse skills', () => {
    const yaml = generateCrucibleItemYaml(
      CRUCIBLE_ITEM_PRESETS.find((p) => p.id === 'consumable')!.apply(),
    )
    expect(yaml).toContain('~onUse')
    expect(yaml).toContain('consumeuseditem')
    expect(yaml).not.toContain('- -')
    expect(yaml).toContain('  - skill{s=[')
    expect(yaml).toContain('    - potion{type=REGEN;duration=100;level=1}')
    expect(yaml).toContain('    - consumeuseditem{amount=1} @self')
    expect(yaml).toContain('    ]} @self ~onUse')
  })
})

describe('mythiccrucible classify and scaffold', () => {
  it('classifies equipment-sets and augments files', () => {
    expect(classifyMythicCategory('Packs/Demo/equipment-sets.yml')).toBe('equipment-sets')
    expect(classifyMythicCategory('Packs/Demo/augments.yml')).toBe('augments')
  })

  it('scaffolds Crucible files when Crucible addon is on', () => {
    const files = scaffoldPack('mythicmobs', {
      packName: 'Demo',
      mythicAddons: { crucible: true, mythicrpg: false },
    })
    expect(files.some((f) => f.path.endsWith('equipment-sets.yml'))).toBe(true)
    expect(files.some((f) => f.path.endsWith('augments.yml'))).toBe(true)
  })

  it('does not scaffold Crucible files when Crucible addon is off', () => {
    const files = scaffoldPack('mythicmobs', {
      packName: 'Demo',
      mythicAddons: { crucible: false, mythicrpg: false },
    })
    expect(files.some((f) => f.path.endsWith('equipment-sets.yml'))).toBe(false)
    expect(files.some((f) => f.path.endsWith('augments.yml'))).toBe(false)
  })
})

describe('resolveMythicCatalogs', () => {
  it('returns base catalogs when Crucible is off', () => {
    const catalogs = resolveMythicCatalogs(false)
    expect(catalogs.mechanics).toBe(MECHANICS)
    expect(catalogs.triggers).toBe(TRIGGERS)
    expect(catalogs.mechanics.some((m) => m.id === 'consumeitem')).toBe(false)
    expect(catalogs.triggers.some((t) => t.id === 'onUse')).toBe(false)
  })

  it('merges Crucible-only entries when Crucible is on', () => {
    const catalogs = resolveMythicCatalogs(true)
    expect(catalogs.mechanics.length).toBe(MECHANICS.length + CRUCIBLE_MECHANICS.length)
    expect(catalogs.mechanics.some((m) => m.id === 'consumeitem')).toBe(true)
    expect(catalogs.mechanics.some((m) => m.id === 'furniturestate')).toBe(true)
    expect(catalogs.triggers.some((t) => t.id === 'onUse')).toBe(true)
    expect(catalogs.triggers.some((t) => t.id === 'onCrouch')).toBe(true)
    expect(catalogs.targeters.some((t) => t.id === 'FurnitureInRadius')).toBe(true)
    expect(catalogs.conditions.some((c) => c.id === 'hasitem')).toBe(true)
    // Shared trigger ids are not duplicated
    const attackCount = catalogs.triggers.filter((t) => t.id === 'onAttack').length
    expect(attackCount).toBe(1)
    expect(catalogs.triggers.length).toBe(TRIGGERS.length + CRUCIBLE_TRIGGERS.length)
  })
})

describe('validateCrucibleItemReferences', () => {
  function file(path: string, category: FileRecord['category'], content: string, ids: string[]): FileRecord {
    return { path, name: path.split('/').pop()!, pack: 'Demo', category, content, ids }
  }

  it('flags missing equipment set and augment type refs', () => {
    const files: FileRecord[] = [
      file(
        'Packs/Demo/Items/gear.yml',
        'items',
        `BAD_HELMET:\n  Id: IRON_HELMET\n  EquipmentSet: MISSING_SET\n  AugmentationSlots:\n    Type: MISSING_GEM\n    Amount: 1\n`,
        ['BAD_HELMET'],
      ),
      file('Packs/Demo/equipment-sets.yml', 'equipment-sets', `REAL_SET:\n  Enabled: true\n`, ['REAL_SET']),
      file('Packs/Demo/augments.yml', 'augments', `REAL_GEM:\n  Enabled: true\n`, ['REAL_GEM']),
    ]
    const issues = validateCrucibleItemReferences(files)
    expect(issues.some((i) => i.type === 'missing_equipment_set_reference' && i.missingId === 'MISSING_SET')).toBe(true)
    expect(issues.some((i) => i.type === 'missing_augment_type_reference' && i.missingId === 'MISSING_GEM')).toBe(true)
  })

  it('accepts matching set and augment refs', () => {
    const files: FileRecord[] = [
      file(
        'Packs/Demo/Items/gear.yml',
        'items',
        `GOOD_HELMET:\n  Id: IRON_HELMET\n  EquipmentSet: REAL_SET\n  Augmentation:\n    Type: REAL_GEM\n`,
        ['GOOD_HELMET'],
      ),
      file('Packs/Demo/equipment-sets.yml', 'equipment-sets', `REAL_SET:\n  Enabled: true\n`, ['REAL_SET']),
      file('Packs/Demo/augments.yml', 'augments', `REAL_GEM:\n  Enabled: true\n`, ['REAL_GEM']),
    ]
    expect(validateCrucibleItemReferences(files)).toEqual([])
  })
})
