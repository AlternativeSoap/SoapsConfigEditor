/** Spell, archetype, and reagent form presets for MythicRPG wizards. */

import type {
  ArchetypeGeneratorInput,
  ReagentGeneratorInput,
  SpellCastingMode,
  SpellGeneratorInput,
} from '../../types'

export interface NamedPreset<T> {
  id: string
  label: string
  description: string
  apply: () => T
}

export const SPELL_PRESETS: NamedPreset<SpellGeneratorInput>[] = [
  {
    id: 'magic_missile',
    label: 'Magic Missile',
    description: 'Bound hotbar spell that damages a target.',
    apply: () => ({
      id: 'MAGIC_MISSILE',
      display: '<aqua>Magic Missile',
      description: 'Shoots a magic missile dealing <white><spell.mod.MAGIC_MISSILE.damage.precision.1><gray> damage.',
      iconMaterial: 'NETHER_STAR',
      castingMode: 'bound',
      clickCombo: '',
      cooldown: 2,
      upgrades: 5,
      costReagent: 'Mana',
      costAmount: 40,
      modifierKey: 'damage',
      modifierBase: 5,
      modifierPerLevel: 2,
      skills: 'damage{a=<spell.mod.MAGIC_MISSILE.damage>} @target',
      targeter: '@target',
      bindable: true,
      global: false,
    }),
  },
  {
    id: 'heal_self',
    label: 'Heal Self',
    description: 'Bound hotbar heal that costs mana.',
    apply: () => ({
      id: 'HEAL_SELF',
      display: '<green>Heal Self',
      description: 'Restores <white><spell.mod.HEAL_SELF.heal.precision.1><gray> health to yourself.',
      iconMaterial: 'GOLDEN_APPLE',
      castingMode: 'bound',
      clickCombo: '',
      cooldown: 8,
      upgrades: 3,
      costReagent: 'Mana',
      costAmount: 25,
      modifierKey: 'heal',
      modifierBase: 4,
      modifierPerLevel: 1,
      skills: 'heal{a=<spell.mod.HEAL_SELF.heal>} @self',
      targeter: '@self',
      bindable: true,
      global: false,
    }),
  },
  {
    id: 'passive_health',
    label: 'Passive Health',
    description: 'Global passive that grants bonus health while known.',
    apply: () => ({
      id: 'PASSIVE_HEALTH',
      display: '<red>Bonus Health',
      description: 'Passive. Grants bonus maximum health per spell level.',
      iconMaterial: 'RED_DYE',
      castingMode: 'passive',
      clickCombo: '',
      cooldown: 0,
      upgrades: 3,
      costReagent: '',
      costAmount: 0,
      modifierKey: '',
      modifierBase: 0,
      modifierPerLevel: 0,
      skills: '',
      targeter: '@self',
      bindable: false,
      global: true,
      passiveStatKey: 'HEALTH',
      passiveStatBase: 1,
      passiveStatPerLevel: 1,
      passiveStatMax: 3,
    }),
  },
]

export const ARCHETYPE_PRESETS: NamedPreset<ArchetypeGeneratorInput>[] = [
  {
    id: 'wizard',
    label: 'Wizard',
    description: 'CLASS archetype with spellcasting XP and a starter hotbar binding.',
    apply: () => ({
      id: 'Wizard',
      display: '<dark_purple>Wizard',
      group: 'CLASS',
      description: 'A scholar of the arcane.',
      iconMaterial: 'ENCHANTED_BOOK',
      minLevel: 1,
      maxLevel: 50,
      experienceCurve: 'RPG_LEVEL_50',
      experienceSource: 'SPELLCASTING',
      spellUnlocks: 'MAGIC_MISSILE',
      baseStatLine: '',
      statModifierLine: 'MAX_MANA 50 ADDITIVE',
    }),
  },
  {
    id: 'miner',
    label: 'Miner',
    description: 'PROFESSION archetype that levels from mining.',
    apply: () => ({
      id: 'Miner',
      display: '<gray>Miner',
      group: 'PROFESSION',
      description: 'A profession focused on extracting resources.',
      iconMaterial: 'IRON_PICKAXE',
      minLevel: 1,
      maxLevel: 50,
      experienceCurve: 'SLOW',
      experienceSource: 'MINING',
      spellUnlocks: '',
      baseStatLine: '',
      statModifierLine: 'HEALTH 1 ADDITIVE',
    }),
  },
]

export const REAGENT_PRESETS: NamedPreset<ReagentGeneratorInput>[] = [
  {
    id: 'mana',
    label: 'Mana',
    description: 'Mana reagent capped by the MAX_MANA stat.',
    apply: () => ({
      id: 'Mana',
      display: '<aqua>Mana',
      global: false,
      minValue: '0',
      maxValue: 'stat.MAX_MANA',
      scaleWithMaxMana: true,
      includeResourceBar: false,
      writeMaxManaStat: true,
      maxManaBase: 100,
    }),
  },
  {
    id: 'stamina',
    label: 'Stamina',
    description: 'Stamina with a fixed 0–100 range.',
    apply: () => ({
      id: 'Stamina',
      display: '<green>Stamina',
      global: false,
      minValue: '0',
      maxValue: '100',
      scaleWithMaxMana: false,
      includeResourceBar: false,
      writeMaxManaStat: false,
      maxManaBase: 100,
    }),
  },
]

export type { SpellCastingMode }
