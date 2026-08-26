import type {
  AugmentTypeGeneratorInput,
  CrucibleItemGeneratorInput,
  CrucibleLoreTemplateGeneratorInput,
  CruciblePlaceholderGeneratorInput,
  CrucibleStatGeneratorInput,
  EquipmentSetGeneratorInput,
} from '../../types'
import { DEFAULT_SET_PIECE_LORE, DEFAULT_WEAPON_STATS_LORE } from './itemCompletions'

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

export const CRUCIBLE_STAT_PRESETS: NamedPreset<CrucibleStatGeneratorInput>[] = [
  {
    id: 'focus',
    label: 'Focus (simple)',
    apply: () => ({
      id: 'FOCUS',
      display: 'Focus',
      baseValue: 0,
      formattingEnabled: true,
      nameFormat: '<stat.icon> <stat.name>',
      valueFormat: '<stat.value>',
    }),
  },
]

export const LORE_TEMPLATE_PRESETS: NamedPreset<CrucibleLoreTemplateGeneratorInput>[] = [
  {
    id: 'weapon_stats',
    label: 'Weapon with stats',
    apply: () => ({
      id: 'WeaponStats',
      lines: DEFAULT_SET_PIECE_LORE,
    }),
  },
]

export const PLACEHOLDER_PRESETS: NamedPreset<CruciblePlaceholderGeneratorInput>[] = [
  {
    id: 'simple_color',
    label: 'Simple color text',
    apply: () => ({
      id: 'BrandColor',
      kind: 'simple',
      value: '<gold>',
      randomValues: '',
      dayValue: '',
      nightValue: '',
      defaultValue: '',
    }),
  },
]

export function emptyCrucibleItem(asBag = false): CrucibleItemGeneratorInput {
  return {
    id: asBag ? 'TRAVELER_SATCHEL' : 'MY_ITEM',
    material: asBag ? 'BUNDLE' : 'IRON_SWORD',
    display: asBag ? '<green>Traveler Satchel' : 'My Item',
    group: asBag ? 'bags' : '',
    itemKind: asBag ? 'BAG' : 'ITEM',
    role: 'standard',
    lore: asBag ? '<gray>A compact satchel for the road.' : DEFAULT_WEAPON_STATS_LORE,
    loreTemplate: '',
    stats: asBag ? '' : 'ATTACK_DAMAGE 5 ADDITIVE',
    equipmentSet: '',
    skills: '',
    optionsCancelDamage: false,
    optionsKeepOnDeath: false,
    optionsPreventDropping: false,
    optionsPlaceable: !asBag,
    optionsPreventEnchanting: false,
    optionsPreventStacking: false,
    optionsRepairable: !asBag,
    itemUpdaterVersion: 0,
    maxDurability: '',
    durability: '',
    defaultLevel: '',
    maxLevel: '',
    setEquipLevel: false,
    defaultLevelDescription: '',
    defaultUpgradeDescription: '',
    levelDescriptions: [],
    upgradeDescriptions: [],
    upgradeEquations: '',
    augmentSlots: [],
    augmentType: '',
    augmentTooltip: '',
    augmentRemoverDestroySocket: false,
    augmentRemoverReturnAugment: true,
    augmentSocketMaxSockets: 1,
    consumableMode: 'none',
    potionType: 'REGENERATION',
    potionDuration: '100',
    potionAmplifier: '0',
    potionAmbient: false,
    potionParticles: true,
    foodNutrition: '4',
    foodSaturation: '0.5',
    foodCanAlwaysEat: false,
    bagSize: 9,
    bagTitle: asBag ? 'Traveler Satchel' : '',
    bagPreventNesting: true,
    bagSaveOnUpdate: true,
    bagAutoPickup: asBag,
    bagAutoPickupOnlyWhenFull: false,
    bagSoundOpen: '',
    bagSoundClose: '',
    bagSoundPickup: '',
    bagSoundVolume: '',
    bagSoundPitch: '',
    bagNearlyFullEnabled: false,
    bagNearlyFullThreshold: '2',
    bagNearlyFullMessage: '<yellow>Bag nearly full! {slots} slots left.',
    bagBlacklist: '',
    bagWhitelist: '',
    recipeType: asBag ? 'SHAPED' : '',
    recipeAmount: 1,
    recipeIngredients: asBag ? 'leather | string\nstring | leather' : '',
    recipeIngredient: '',
    recipeCookingTime: '',
    recipeExperience: '',
    recipeInputItem: '',
    recipeSmithingTemplate: '',
    recipeLeftover: '',
    recipeConditions: '',
    recipeCraftSkills: '',
  }
}

export const CRUCIBLE_ITEM_PRESETS: NamedPreset<CrucibleItemGeneratorInput>[] = [
  {
    id: 'blade',
    label: 'Stat weapon',
    apply: () => ({
      ...emptyCrucibleItem(),
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
      ...emptyCrucibleItem(),
      id: 'HEALING_BREW',
      material: 'POTION',
      display: '<light_purple>Healing Brew',
      group: 'consumables',
      role: 'consumable',
      lore: '<gray>Drink to restore health.',
      stats: '',
      optionsPreventStacking: false,
      consumableMode: 'both',
      potionType: 'REGENERATION',
      potionDuration: '100',
      potionAmplifier: '0',
      foodNutrition: '2',
      foodSaturation: '0.2',
      skills: 'consumeuseditem{amount=1} @self ~onUse',
    }),
  },
  {
    id: 'bag',
    label: 'Small bag',
    apply: () => emptyCrucibleItem(true),
  },
  {
    id: 'gem',
    label: 'Augment gem',
    apply: () => ({
      ...emptyCrucibleItem(),
      id: 'SPARK_SHARD',
      material: 'AMETHYST_SHARD',
      display: '<aqua>Spark Shard',
      group: 'gems',
      role: 'gem',
      lore: '',
      stats: 'ATTACK_SPEED 0.1 ADDITIVE',
      optionsPlaceable: false,
      augmentType: 'SPARK_GEM',
      augmentTooltip: '<aqua>+0.1 Attack Speed',
      skills: '',
    }),
  },
  {
    id: 'set_piece',
    label: 'Set piece',
    apply: () => ({
      ...emptyCrucibleItem(),
      id: 'EMBER_GUARD_HELMET',
      material: 'IRON_HELMET',
      display: '<gold>Ember Guard Helmet',
      group: 'ember_guard',
      lore: DEFAULT_SET_PIECE_LORE,
      stats: 'DEFENSE 4 ADDITIVE',
      equipmentSet: 'EMBER_GUARD',
      augmentSlots: [
        { type: 'SPARK_GEM', amount: '1', chance: '1', maxAmount: '' },
      ],
    }),
  },
]
