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
      display: 'Magic Missile',
      description: 'Shoots a magic missile dealing {DAMAGE} damage',
      iconMaterial: 'NETHER_STAR',
      castingMode: 'bound',
      clickCombo: '',
      cooldown: 2,
      upgrades: 5,
      costReagent: 'mana',
      costAmount: 40,
      modifierKey: 'DAMAGE',
      modifierBase: 5,
      modifierPerLevel: 2,
      skills: 'damage{a=<spell.modifier.DAMAGE>} @target',
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
      display: 'Heal Self',
      description: 'Restores {HEAL} health to yourself',
      iconMaterial: 'GOLDEN_APPLE',
      castingMode: 'bound',
      clickCombo: '',
      cooldown: 8,
      upgrades: 3,
      costReagent: 'mana',
      costAmount: 25,
      modifierKey: 'HEAL',
      modifierBase: 4,
      modifierPerLevel: 1,
      skills: 'heal{a=<spell.modifier.HEAL>} @self',
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
      display: 'Bonus Health',
      description: 'Passive - Grants bonus maximum health per spell level',
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
    description: 'CLASS archetype with spellcasting XP and a starter spell unlock.',
    apply: () => ({
      id: 'Wizard',
      display: '&5Wizard',
      group: 'CLASS',
      description: 'A scholar of the arcane.',
      iconMaterial: 'ENCHANTED_BOOK',
      minLevel: 1,
      maxLevel: 50,
      experienceCurve: 'STANDARD',
      experienceSource: 'SPELLCASTING',
      spellUnlocks: 'MAGIC_MISSILE',
      baseStatLine: "MAX_MANA '50 + 5*L'",
      statModifierLine: '',
    }),
  },
  {
    id: 'miner',
    label: 'Miner',
    description: 'PROFESSION archetype that levels from mining.',
    apply: () => ({
      id: 'Miner',
      display: '&7Miner',
      group: 'PROFESSION',
      description: 'A profession focused on extracting resources.',
      iconMaterial: 'IRON_PICKAXE',
      minLevel: 1,
      maxLevel: 50,
      experienceCurve: 'SLOW',
      experienceSource: 'MINING',
      spellUnlocks: '',
      baseStatLine: '',
      statModifierLine: 'MAX_HEALTH 1',
    }),
  },
]

export const REAGENT_PRESETS: NamedPreset<ReagentGeneratorInput>[] = [
  {
    id: 'mana',
    label: 'Mana',
    description: 'Global mana reagent capped by a MAX_MANA stat.',
    apply: () => ({
      id: 'Mana',
      display: 'Mana',
      global: true,
      minValue: '0',
      maxValue: 'stat.MAX_MANA',
      scaleWithMaxMana: true,
      includeResourceBar: true,
      writeMaxManaStat: true,
      maxManaBase: 1000,
    }),
  },
  {
    id: 'stamina',
    label: 'Stamina',
    description: 'Global stamina with a fixed 0–100 range.',
    apply: () => ({
      id: 'Stamina',
      display: '&aStamina',
      global: true,
      minValue: '0',
      maxValue: '100',
      scaleWithMaxMana: false,
      includeResourceBar: true,
      writeMaxManaStat: false,
      maxManaBase: 1000,
    }),
  },
]

export type { SpellCastingMode }
