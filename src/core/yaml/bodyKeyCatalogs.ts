import type { MythicCategory } from '../../types'
import {
  boolKey,
  type BodyKeyDef,
  listKey,
  mapKey,
  scalarKey,
} from './bodyKeyDefs'

/** List block that uses `- entry` lines (DamageModifiers, KillMessages). */
function listDashKey(key: string, detail?: string, starter = ''): BodyKeyDef {
  return { key, detail, apply: `${key}:\n  - ${starter}` }
}

export const MOB_BODY_DEFS: BodyKeyDef[] = [
  scalarKey('Type', 'Entity type'),
  scalarKey('Display', 'Name tag'),
  scalarKey('Health', 'Max health'),
  scalarKey('Damage', 'Attack damage'),
  scalarKey('Armor', 'Armor value'),
  scalarKey('Faction', 'Faction id'),
  scalarKey('Template', 'Inherit from mob'),
  listKey('Exclude', 'Keys to exclude from template'),
  listKey('Skills', 'Skill lines'),
  listKey('Drops', 'Drop table entries'),
  mapKey('Equipment', 'Slot to item id', 4),
  mapKey('Options', 'Mob options', 4),
  listKey('AIGoalSelectors', 'AI goals'),
  listKey('AITargetSelectors', 'AI targets'),
  mapKey('Modules', 'Module toggles', 4),
  scalarKey('Level', 'Mob level'),
  listDashKey('KillMessages', 'Death message lines'),
  mapKey('Disguise', 'Disguise config', 4),
  mapKey('BossBar', 'Boss bar config', 4),
  mapKey('ThreatTable', 'Threat table config', 4),
  listDashKey('DamageModifiers', 'Damage type multipliers', 'FIRE 1'),
  mapKey('ImmunityTables', 'Immunity tables'),
]

export const SKILL_BODY_DEFS: BodyKeyDef[] = [
  listKey('Skills', 'Skill lines'),
  listKey('Conditions', 'Conditions'),
  scalarKey('Cooldown', 'Cooldown seconds'),
  mapKey('Options', 'Skill options', 4),
  scalarKey('OnCooldownSkill', 'Skill while on cooldown'),
]

/** MythicRPG spell keys (same skills/ folder as metaskills). */
export const SPELL_BODY_DEFS: BodyKeyDef[] = [
  scalarKey('Display', 'Spell display name'),
  listDashKey('Description', 'Description lines', '"Short description"'),
  mapKey('Icon', 'Spell icon', 4),
  boolKey('Spell', true, 'Mark as MythicRPG spell'),
  boolKey('Global', false, 'Cast without binding'),
  boolKey('Bindable', true, 'Player can bind spell'),
  scalarKey('Trigger', 'Cast trigger (~onUse)'),
  scalarKey('ClickCombo', 'Click combo (LRR)'),
  scalarKey('Targeter', 'Default targeter'),
  scalarKey('Upgrades', 'Max upgrade level'),
  mapKey('Cost', 'Reagent costs', 4),
  mapKey('Modifiers', 'Spell modifiers', 4),
  mapKey('Stats', 'Passive stats', 4),
]

/** MythicLib skill registration keys (plugins/MythicLib/skill/). */
export const MYTHICLIB_SKILL_BODY_DEFS: BodyKeyDef[] = [
  mapKey('parameters', 'Skill parameters', 4),
  listKey('categories', 'Skill categories'),
  scalarKey('name', 'Skill display name'),
  listKey('lore', 'Skill lore lines'),
  mapKey('icon', 'Icon material', 4),
  scalarKey('source', 'MythicMobs skill source id'),
  scalarKey('trigger', 'Skill trigger'),
]

export const ITEM_BODY_DEFS: BodyKeyDef[] = [
  scalarKey('Id', 'Material id'),
  scalarKey('Display', 'Item name'),
  mapKey('Options', 'Item options', 4),
  listKey('Lore', 'Lore lines'),
  mapKey('NBT', 'NBT data'),
  listKey('Skills', 'Skill lines'),
  listKey('Enchantments', 'Enchantments'),
  scalarKey('Model', 'Custom model data'),
]

export const DROPTABLE_BODY_DEFS: BodyKeyDef[] = [
  listKey('Drops', 'Drop entries'),
  listKey('Conditions', 'Conditions'),
  scalarKey('TotalItems', 'Total items to roll'),
  scalarKey('MinItems', 'Minimum items'),
  scalarKey('MaxItems', 'Maximum items'),
]

export const RANDOMSPAWN_BODY_DEFS: BodyKeyDef[] = [
  scalarKey('Action', 'Spawn action'),
  scalarKey('Type', 'Mob or entity type'),
  scalarKey('Level', 'Mob level'),
  scalarKey('Chance', 'Spawn chance'),
  listKey('Worlds', 'World names'),
  listKey('Biomes', 'Biome names'),
  listKey('Conditions', 'Spawn conditions'),
  scalarKey('Priority', 'Spawn priority'),
]

export const ARCHETYPE_BODY_DEFS: BodyKeyDef[] = [
  scalarKey('Group', 'Archetype group'),
  scalarKey('Display', 'Display name'),
  listDashKey('Description', 'Description lines', '"Short description"'),
  mapKey('Icon', 'Icon block', 4),
  mapKey('Leveling', 'Level settings', 4),
  listDashKey('BaseStats', 'Base stat lines', 'STRENGTH 1'),
  listDashKey('StatModifiers', 'Stat modifier lines', 'STRENGTH +1'),
  listDashKey('SpellUnlocks', 'Spell unlock lines', 'MySpell 1'),
]

export const REAGENT_BODY_DEFS: BodyKeyDef[] = [
  scalarKey('Display', 'Display name'),
  scalarKey('MinValue', 'Minimum value'),
  scalarKey('MaxValue', 'Maximum value'),
  boolKey('Global', false, 'Shared reagent'),
  mapKey('ResourceBarStates', 'Resource bar UI', 4),
]

export const EQUIPMENT_SET_BODY_DEFS: BodyKeyDef[] = [
  boolKey('Enabled', true, 'Set enabled'),
  scalarKey('Display', 'Display name'),
  listKey('Lore', 'Lore lines'),
  mapKey('Bonuses', 'Set bonuses', 4),
]

export const AUGMENT_BODY_DEFS: BodyKeyDef[] = [
  boolKey('Enabled', true, 'Type enabled'),
  scalarKey('Display', 'Display name'),
  mapKey('Formatting', 'Slot formatting', 4),
  mapKey('Icons', 'Socket icons', 4),
]

export const STAT_BODY_DEFS: BodyKeyDef[] = [
  boolKey('Enabled', true, 'Stat enabled'),
  scalarKey('Display', 'Display name'),
  scalarKey('BaseValue', 'Base value'),
  mapKey('Formatting', 'Format strings', 4),
]

export const EXPERIENCE_CURVE_BODY_DEFS: BodyKeyDef[] = [
  scalarKey('Type', 'Curve type (FORMULA)'),
  scalarKey('Formula', 'Level formula'),
]

export const EXPERIENCE_SOURCE_BODY_DEFS: BodyKeyDef[] = [
  mapKey('Sources', 'XP source list', 2),
]

export const QUEST_BODY_DEFS: BodyKeyDef[] = [
  scalarKey('display', 'Quest name'),
  scalarKey('material', 'GUI material'),
  scalarKey('tier', 'Tier id'),
  scalarKey('difficulty', 'Difficulty id'),
  boolKey('sequential', false, 'Sequential objectives'),
  boolKey('lock-to-player', false, 'Lock to player'),
  mapKey('conditions', 'Unlock conditions', 4),
  mapKey('objectives', 'Objective list', 4),
  mapKey('reward', 'Rewards', 4),
]

export const TIER_BODY_DEFS: BodyKeyDef[] = [
  scalarKey('display', 'Tier display name'),
  scalarKey('prefix', 'Chat prefix'),
  scalarKey('color', 'Color code'),
  scalarKey('weight', 'Sort weight'),
  scalarKey('description', 'Description'),
]

export const DIFFICULTY_BODY_DEFS: BodyKeyDef[] = [
  scalarKey('display', 'Difficulty display name'),
  scalarKey('color', 'Color code'),
  scalarKey('weight', 'Sort weight'),
  scalarKey('description', 'Description'),
  mapKey('multiplier', 'Amount multipliers', 6),
]

export const CLASS_BODY_DEFS: BodyKeyDef[] = [
  mapKey('display', 'Class display', 4),
  scalarKey('exp-curve', 'Experience curve id'),
  scalarKey('exp-table', 'Experience table id'),
  scalarKey('max-level', 'Max class level'),
  listKey('skill-trees', 'Skill tree ids'),
  mapKey('attributes', 'Attribute stats', 4),
  mapKey('resource', 'Health and mana', 4),
  mapKey('options', 'Class options', 4),
  mapKey('skills', 'Bound skills', 4),
  mapKey('slots', 'Skill slots', 4),
  mapKey('triggers', 'Event triggers', 4),
  mapKey('cast-particle', 'Cast particle', 4),
  mapKey('key-combos', 'Key combos', 4),
  listKey('main-exp-sources', 'Main XP sources'),
]

export const ELEMENT_BODY_DEFS: BodyKeyDef[] = [
  scalarKey('name', 'Element name'),
  scalarKey('icon', 'Icon material'),
  scalarKey('lore-icon', 'Lore icon'),
  scalarKey('color', 'Color code'),
  mapKey('regular-attack', 'Regular attack skill', 4),
  mapKey('crit-strike', 'Critical strike skill', 4),
]

/** Crucible item body keys with apply snippets. */
export const CRUCIBLE_ITEM_BODY_DEFS: BodyKeyDef[] = [
  scalarKey('Type', 'Crucible item type'),
  scalarKey('Group', 'Item group'),
  scalarKey('EquipmentSet', 'Equipment set id'),
  listKey('Stats', 'Stat lines'),
  scalarKey('MaxDurability', 'Max durability'),
  scalarKey('Durability', 'Current durability'),
  mapKey('Upgrades', 'Upgrade config'),
  mapKey('AugmentationSlots', 'Augment slots'),
  mapKey('Augmentation', 'Augment config'),
  mapKey('AugmentationSocket', 'Socket config'),
  mapKey('AugmentationRemover', 'Remover config'),
  mapKey('ItemUpdater', 'Item updater'),
  mapKey('Recipes', 'Crafting recipes'),
  mapKey('Inventory', 'Bag inventory'),
  scalarKey('Model', 'Custom model'),
  mapKey('Generation', 'Procedural generation'),
  scalarKey('Template', 'Item template'),
  mapKey('Trim', 'Armor trim'),
  mapKey('Potion', 'Potion data'),
  mapKey('Food', 'Food data'),
  mapKey('Consumable', 'Consumable data'),
]

/** Crucible Options keys with sensible defaults. */
export const CRUCIBLE_OPTION_DEFS: BodyKeyDef[] = [
  boolKey('CancelDamage', false),
  boolKey('Destroy', false),
  boolKey('DestroyOnDrop', false),
  boolKey('KeepOnDeath', false),
  boolKey('PreventDropping', false),
  scalarKey('Permission', 'Permission node'),
  boolKey('Placeable', false),
  boolKey('PreventAnvil', false),
  boolKey('PreventSmithing', false),
  boolKey('PreventCrafting', false),
  boolKey('PreventEnchanting', false),
  boolKey('PreventStacking', true),
  boolKey('Repairable', true),
  scalarKey('SkillType', 'Skill type'),
  boolKey('HideFlags', false),
]

/** Indent (spaces) where body keys appear for a category. */
export function bodyKeyIndentForCategory(category?: MythicCategory): number | null {
  switch (category) {
    case 'mobs':
    case 'skills':
    case 'items':
    case 'droptables':
    case 'randomspawns':
    case 'archetypes':
    case 'reagents':
    case 'equipment-sets':
    case 'augments':
    case 'stats':
    case 'experience-curves':
    case 'experience-sources':
      return 2
    case 'quests':
    case 'tiers':
    case 'difficulties':
      return 4
    case 'classes':
      return 0
    case 'elements':
      return 2
    default:
      return null
  }
}

export function bodyKeyDefsForCategory(
  category?: MythicCategory,
  crucible = false,
): BodyKeyDef[] {
  switch (category) {
    case 'mobs':
      return MOB_BODY_DEFS
    case 'skills': {
      const seen = new Set<string>()
      const merged: BodyKeyDef[] = []
      for (const d of [...SKILL_BODY_DEFS, ...SPELL_BODY_DEFS, ...MYTHICLIB_SKILL_BODY_DEFS]) {
        if (seen.has(d.key)) continue
        seen.add(d.key)
        merged.push(d)
      }
      return merged
    }
    case 'items': {
      if (crucible) {
        const seen = new Set<string>()
        const merged: BodyKeyDef[] = []
        for (const d of [...ITEM_BODY_DEFS, ...CRUCIBLE_ITEM_BODY_DEFS]) {
          if (seen.has(d.key)) continue
          seen.add(d.key)
          merged.push(d)
        }
        return merged
      }
      return ITEM_BODY_DEFS
    }
    case 'droptables':
      return DROPTABLE_BODY_DEFS
    case 'randomspawns':
      return RANDOMSPAWN_BODY_DEFS
    case 'archetypes':
      return ARCHETYPE_BODY_DEFS
    case 'reagents':
      return REAGENT_BODY_DEFS
    case 'equipment-sets':
      return EQUIPMENT_SET_BODY_DEFS
    case 'augments':
      return AUGMENT_BODY_DEFS
    case 'stats':
      return STAT_BODY_DEFS
    case 'experience-curves':
      return EXPERIENCE_CURVE_BODY_DEFS
    case 'experience-sources':
      return EXPERIENCE_SOURCE_BODY_DEFS
    case 'quests':
      return QUEST_BODY_DEFS
    case 'tiers':
      return TIER_BODY_DEFS
    case 'difficulties':
      return DIFFICULTY_BODY_DEFS
    case 'classes':
      return CLASS_BODY_DEFS
    case 'elements':
      return ELEMENT_BODY_DEFS
    default:
      return []
  }
}
