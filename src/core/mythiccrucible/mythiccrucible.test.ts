import { describe, expect, it } from 'vitest'
import {
  generateAugmentTypeYaml,
  generateCrucibleItemYaml,
  generateCrucibleStatYaml,
  generateEquipmentSetYaml,
  generateLoreTemplateYaml,
  generatePlaceholderYaml,
} from './generators'
import {
  AUGMENT_TYPE_PRESETS,
  CRUCIBLE_ITEM_PRESETS,
  CRUCIBLE_STAT_PRESETS,
  emptyCrucibleItem,
  EQUIPMENT_SET_PRESETS,
  LORE_TEMPLATE_PRESETS,
  PLACEHOLDER_PRESETS,
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

  it('emits a single augment slot as object form', () => {
    const yaml = generateCrucibleItemYaml({
      ...emptyCrucibleItem(),
      id: 'ONE_SLOT',
      augmentSlots: [{ type: 'SPARK_GEM', amount: '2', chance: '0.5', maxAmount: '3' }],
    })
    expect(yaml).toContain('AugmentationSlots:')
    expect(yaml).toContain('    Type: SPARK_GEM')
    expect(yaml).toContain('    Amount: 2')
    expect(yaml).toContain('    Chance: 0.5')
    expect(yaml).toContain('    MaxAmount: 3')
    expect(yaml).not.toContain('- Type:')
  })

  it('emits multiple augment slots as list form', () => {
    const yaml = generateCrucibleItemYaml({
      ...emptyCrucibleItem(),
      id: 'MULTI_SLOT',
      augmentSlots: [
        { type: 'SPARK_GEM', amount: '1', chance: '1', maxAmount: '' },
        { type: 'VOID_GEM', amount: '2', chance: '1', maxAmount: '' },
      ],
    })
    expect(yaml).toContain('- Type: SPARK_GEM')
    expect(yaml).toContain('- Type: VOID_GEM')
  })

  it('generates upgrades with equations and descriptions', () => {
    const yaml = generateCrucibleItemYaml({
      ...emptyCrucibleItem(),
      id: 'LEVELED',
      defaultLevel: '1',
      maxLevel: '10',
      setEquipLevel: true,
      defaultLevelDescription: '<gray>Level <level>',
      defaultUpgradeDescription: '<yellow>Upgrade available',
      levelDescriptions: [{ level: '5', text: '<gold>Mid tier' }],
      upgradeDescriptions: [{ level: '10', text: '<aqua>Maxed' }],
      upgradeEquations: 'ATTACK_DAMAGE ADDITIVE v*(1+0.05*l)',
    })
    expect(yaml).toContain('Upgrades:')
    expect(yaml).toContain('DefaultLevel: 1')
    expect(yaml).toContain('MaxLevel: 10')
    expect(yaml).toContain('SetEquipLevel: true')
    expect(yaml).toContain('DefaultLevelDescription:')
    expect(yaml).toContain('LevelDescription:')
    expect(yaml).toContain('UpgradeDescription:')
    expect(yaml).toContain('Equations:')
    expect(yaml).toContain('ATTACK_DAMAGE ADDITIVE v*(1+0.05*l)')
  })

  it('generates FURNACE recipes and SHAPED leftovers', () => {
    const furnace = generateCrucibleItemYaml({
      ...emptyCrucibleItem(),
      id: 'COOKED',
      recipeType: 'FURNACE',
      recipeIngredient: 'RAW_BEEF',
      recipeCookingTime: '200',
      recipeExperience: '0.35',
    })
    expect(furnace).toContain('Type: FURNACE')
    expect(furnace).toContain('Ingredient: RAW_BEEF')
    expect(furnace).toContain('CookingTime: 200')
    expect(furnace).toContain('Experience: 0.35')

    const shaped = generateCrucibleItemYaml({
      ...emptyCrucibleItem(),
      id: 'CRAFTED',
      recipeType: 'SHAPED',
      recipeIngredients: 'iron_ingot | air\nair | stick',
      recipeLeftover: 'bucket',
      recipeCraftSkills: 'message{m=Crafted!} @self',
    })
    expect(shaped).toContain('IngredientsLeftover:')
    expect(shaped).toContain('- bucket')
    expect(shaped).toContain('CraftSkills:')
  })

  it('generates consumable Potion and Food YAML', () => {
    const yaml = generateCrucibleItemYaml(
      CRUCIBLE_ITEM_PRESETS.find((p) => p.id === 'consumable')!.apply(),
    )
    expect(yaml).toContain('Potion:')
    expect(yaml).toContain('Type: REGENERATION')
    expect(yaml).toContain('Food:')
    expect(yaml).toContain('Nutrition:')
    expect(yaml).toContain('~onUse')
  })

  it('generates bag Inventory sounds and NearlyFull', () => {
    const yaml = generateCrucibleItemYaml({
      ...emptyCrucibleItem(true),
      bagSoundOpen: 'block.chest.open',
      bagSoundClose: 'block.chest.close',
      bagSoundVolume: '1',
      bagNearlyFullEnabled: true,
      bagNearlyFullThreshold: '2',
      bagNearlyFullMessage: '<yellow>{slots} left',
      bagBlacklist: 'BEDROCK\nBARRIER',
    })
    expect(yaml).toContain('Sounds:')
    expect(yaml).toContain('Open:')
    expect(yaml).toContain('NearlyFull:')
    expect(yaml).toContain('Threshold: 2')
    expect(yaml).toContain('BlacklistedItems:')
    expect(yaml).toContain('- BEDROCK')
  })

  it('generates a custom stat', () => {
    const yaml = generateCrucibleStatYaml(CRUCIBLE_STAT_PRESETS[0]!.apply())
    expect(yaml).toContain('FOCUS:')
    expect(yaml).toContain('BaseValue: 0')
    expect(yaml).toContain('Formatting:')
    expect(yaml).toContain('Enabled: true')
  })

  it('generates a lore template', () => {
    const yaml = generateLoreTemplateYaml(LORE_TEMPLATE_PRESETS[0]!.apply())
    expect(yaml).toContain('WeaponStats:')
    expect(yaml).toContain('Lines:')
    expect(yaml).toContain('{stats}')
  })

  it('generates placeholder kinds', () => {
    const simple = generatePlaceholderYaml(PLACEHOLDER_PRESETS[0]!.apply())
    expect(simple).toContain('BrandColor:')

    const random = generatePlaceholderYaml({
      id: 'Colors',
      kind: 'random',
      value: '',
      randomValues: 'red\nblue',
      dayValue: '',
      nightValue: '',
      defaultValue: '',
    })
    expect(random).toContain('- "red"')
    expect(random).toContain('- "blue"')

    const conditional = generatePlaceholderYaml({
      id: 'TimeGreeting',
      kind: 'conditional',
      value: '',
      randomValues: '',
      dayValue: 'Good day',
      nightValue: 'Good night',
      defaultValue: 'Hello',
    })
    expect(conditional).toContain('Day:')
    expect(conditional).toContain('Night:')
    expect(conditional).toContain('Default:')
  })
})

describe('mythiccrucible classify and scaffold', () => {
  it('classifies equipment-sets, augments, lore-templates, and placeholders', () => {
    expect(classifyMythicCategory('Packs/Demo/equipment-sets.yml')).toBe('equipment-sets')
    expect(classifyMythicCategory('Packs/Demo/augments.yml')).toBe('augments')
    expect(classifyMythicCategory('Packs/Demo/lore-templates.yml')).toBe('lore-templates')
    expect(classifyMythicCategory('Packs/Demo/placeholders.yml')).toBe('placeholders')
    expect(classifyMythicCategory('Packs/Demo/stats.yml')).toBe('stats')
  })

  it('scaffolds Crucible files when Crucible addon is on', () => {
    const files = scaffoldPack('mythicmobs', {
      packName: 'Demo',
      mythicAddons: { crucible: true, mythicrpg: false },
    })
    expect(files.some((f) => f.path.endsWith('equipment-sets.yml'))).toBe(true)
    expect(files.some((f) => f.path.endsWith('augments.yml'))).toBe(true)
    expect(files.some((f) => f.path.endsWith('stats.yml'))).toBe(true)
    expect(files.some((f) => f.path.endsWith('lore-templates.yml'))).toBe(true)
    expect(files.some((f) => f.path.endsWith('placeholders.yml'))).toBe(true)
  })

  it('does not scaffold Crucible files when Crucible addon is off', () => {
    const files = scaffoldPack('mythicmobs', {
      packName: 'Demo',
      mythicAddons: { crucible: false, mythicrpg: false },
    })
    expect(files.some((f) => f.path.endsWith('equipment-sets.yml'))).toBe(false)
    expect(files.some((f) => f.path.endsWith('augments.yml'))).toBe(false)
    expect(files.some((f) => f.path.endsWith('lore-templates.yml'))).toBe(false)
    expect(files.some((f) => f.path.endsWith('placeholders.yml'))).toBe(false)
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
    const hasitem = catalogs.conditions.find((c) => c.id === 'hasitem')
    expect(hasitem?.insertSnippet).toContain('item=')
    expect(hasitem?.insertSnippet).not.toContain('material=')
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
