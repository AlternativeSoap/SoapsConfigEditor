import type {
  AugmentTypeGeneratorInput,
  CrucibleItemGeneratorInput,
  EquipmentSetGeneratorInput,
} from '../../types'

export interface NamedPreset<T> {
  id: string
  label: string
  apply: () => T
}

export const EQUIPMENT_SET_PRESETS: NamedPreset<EquipmentSetGeneratorInput>[] = [
  {
    id: 'ember_guard',
    label: 'Ember Guard set',
    apply: () => ({
      id: 'EMBER_GUARD',
      display: '<gold>Ember Guard',
      enabled: true,
      lore: '<yellow>[2]: <gray>+10 Defense\n<yellow>[4]: <gray>Chance to ignite attackers',
      bonuses: [
        { pieces: 2, stats: 'DEFENSE 10 ADDITIVE', skills: '' },
        {
          pieces: 4,
          stats: 'CRITICAL_STRIKE_DAMAGE 0.1 ADDITIVE',
          skills: 'ignite @trigger ~onDamaged 0.2',
        },
      ],
    }),
  },
]

export const AUGMENT_TYPE_PRESETS: NamedPreset<AugmentTypeGeneratorInput>[] = [
  {
    id: 'spark_gem',
    label: 'Spark gem type',
    apply: () => ({
      id: 'SPARK_GEM',
      display: 'Spark Gem',
      enabled: true,
      emptyFormat: '<augment.icon> Empty <augment.type> Slot',
      filledFormat: '<augment.icon> <augment.type>: <augment.tooltip>',
      showEmptySlot: true,
      iconEmpty: '◇',
      iconFilled: '◆',
      iconInvalid: '✗',
    }),
  },
]

function baseItem(): CrucibleItemGeneratorInput {
  return {
    id: 'MY_ITEM',
    material: 'IRON_SWORD',
    display: 'My Item',
    group: '',
    itemKind: 'ITEM',
    role: 'standard',
    lore: '{stats}\n{stats}<gray>Stats:\n{stats-each}<white><stat.display>',
    loreTemplate: '',
    stats: 'ATTACK_DAMAGE 5 ADDITIVE',
    equipmentSet: '',
    skills: '',
    optionsCancelDamage: false,
    optionsKeepOnDeath: false,
    optionsPreventDropping: false,
    optionsPlaceable: true,
    optionsPreventEnchanting: false,
    optionsPreventStacking: false,
    optionsRepairable: true,
    itemUpdaterVersion: 0,
    maxDurability: '',
    durability: '',
    defaultLevel: '',
    maxLevel: '',
    augmentSlotType: '',
    augmentSlotAmount: '1',
    augmentSlotChance: '1',
    augmentSlotMaxAmount: '',
    augmentType: '',
    augmentTooltip: '',
    augmentRemoverDestroySocket: false,
    augmentRemoverReturnAugment: true,
    augmentSocketMaxSockets: 1,
    bagSize: 9,
    bagTitle: '',
    bagPreventNesting: true,
    bagSaveOnUpdate: true,
    bagAutoPickup: false,
    recipeType: '',
    recipeIngredients: '',
  }
}

export const CRUCIBLE_ITEM_PRESETS: NamedPreset<CrucibleItemGeneratorInput>[] = [
  {
    id: 'blade',
    label: 'Stat weapon',
    apply: () => ({
      ...baseItem(),
      id: 'EMBER_BLADE',
      material: 'IRON_SWORD',
      display: '<gold>Ember Blade',
      group: 'weapons',
      stats: 'ATTACK_DAMAGE 8 ADDITIVE\nCRITICAL_STRIKE_CHANCE 0.05 ADDITIVE',
      skills: 'ignite{t=40} @target ~onHit',
    }),
  },
  {
    id: 'consumable',
    label: 'Consumable',
    apply: () => ({
      ...baseItem(),
      id: 'RECOVERY_FEATHER',
      material: 'FEATHER',
      display: '<light_purple>Recovery Feather',
      group: 'consumables',
      lore: '<gray>Right-click to restore health.',
      stats: '',
      optionsPreventStacking: false,
      skills: 'skill{s=[\n  - potion{type=REGEN;duration=100;level=1}\n  - consumeuseditem{amount=1} @self\n]} @self ~onUse',
    }),
  },
  {
    id: 'bag',
    label: 'Small bag',
    apply: () => ({
      ...baseItem(),
      id: 'TRAVELER_SATCHEL',
      material: 'BUNDLE',
      display: '<green>Traveler Satchel',
      group: 'bags',
      itemKind: 'BAG',
      lore: '<gray>A compact satchel for the road.',
      stats: '',
      optionsPlaceable: false,
      optionsRepairable: false,
      bagSize: 9,
      bagTitle: 'Traveler Satchel',
      bagAutoPickup: true,
      recipeType: 'SHAPED',
      recipeIngredients: 'leather | string\nstring | leather',
    }),
  },
  {
    id: 'gem',
    label: 'Augment gem',
    apply: () => ({
      ...baseItem(),
      id: 'SPARK_SHARD',
      material: 'AMETHYST_SHARD',
      display: '<aqua>Spark Shard',
      group: 'gems',
      role: 'gem',
      lore: '',
      stats: 'ATTACK_SPEED 0.1 ADDITIVE',
      optionsPlaceable: false,
      itemUpdaterVersion: 0,
      augmentType: 'SPARK_GEM',
      augmentTooltip: '<aqua>+0.1 Attack Speed',
      skills: '',
    }),
  },
  {
    id: 'set_piece',
    label: 'Set piece',
    apply: () => ({
      ...baseItem(),
      id: 'EMBER_GUARD_HELMET',
      material: 'IRON_HELMET',
      display: '<gold>Ember Guard Helmet',
      group: 'ember_guard',
      lore: '{stats}\n{stats}<gray>Stats:\n{stats-each}<white><stat.display>\n{equipment-set}',
      stats: 'DEFENSE 4 ADDITIVE',
      equipmentSet: 'EMBER_GUARD',
      augmentSlotType: 'SPARK_GEM',
      augmentSlotAmount: '1',
      augmentSlotChance: '1',
    }),
  },
]
