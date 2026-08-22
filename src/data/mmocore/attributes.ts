import { STAT_DESCRIPTIONS } from './statDescriptions'

export type AttributeLoreGroup = 'base' | 'critical' | 'resource' | 'utility' | 'damage' | 'other'

export interface AttributeCatalogEntry {
  id: string
  label: string
  icon: string
  group: AttributeLoreGroup
  /** Official wiki lowercase id */
  wikiId?: string
  description?: string
}

function entry(
  id: string,
  label: string,
  icon: string,
  group: AttributeLoreGroup,
  wikiId?: string,
): AttributeCatalogEntry {
  return {
    id,
    label,
    icon,
    group,
    wikiId: wikiId ?? id.toLowerCase(),
    description: STAT_DESCRIPTIONS[id],
  }
}

/** Full MMOCore / MythicLib player stats catalog (uppercase keys for class YAML). */
export const ATTRIBUTE_CATALOG: AttributeCatalogEntry[] = [
  // Vanilla
  entry('ATTACK_DAMAGE', 'Attack Damage', '⚔', 'base', 'attack_damage'),
  entry('ATTACK_SPEED', 'Attack Speed', '🗡', 'base', 'attack_speed'),
  entry('MAX_HEALTH', 'Max Health', '❤', 'base', 'max_health'),
  entry('MOVEMENT_SPEED', 'Movement Speed', '⏩', 'base', 'movement_speed'),
  entry('KNOCKBACK_RESISTANCE', 'Knockback Resistance', '🛡', 'base', 'knockback_resistance'),
  entry('ARMOR', 'Defense', '❈', 'base', 'armor'),
  entry('ARMOR_TOUGHNESS', 'Armor Toughness', '◆', 'base', 'armor_toughness'),
  entry('MAX_ABSORPTION', 'Max Absorption', '💛', 'base', 'max_absorption'),
  entry('BLOCK_BREAK_SPEED', 'Block Break Speed', '⛏', 'utility', 'block_break_speed'),
  entry('BLOCK_INTERACTION_RANGE', 'Block Interaction Range', '📏', 'utility', 'block_interaction_range'),
  entry('ENTITY_INTERACTION_RANGE', 'Entity Interaction Range', '📐', 'utility', 'entity_interaction_range'),
  entry('FALL_DAMAGE_MULTIPLIER', 'Fall Damage Multiplier', '↓', 'utility', 'fall_damage_multiplier'),
  entry('GRAVITY', 'Gravity', '⬇', 'utility', 'gravity'),
  entry('JUMP_STRENGTH', 'Jump Strength', '⬆', 'utility', 'jump_strength'),
  entry('SAFE_FALL_DISTANCE', 'Safe Fall Distance', '🪂', 'utility', 'safe_fall_distance'),
  entry('SCALE', 'Scale', '↔', 'utility', 'scale'),
  entry('STEP_HEIGHT', 'Step Height', '📶', 'utility', 'step_height'),
  entry('BURNING_TIME', 'Burning Time', '🔥', 'utility', 'burning_time'),
  entry('EXPLOSION_KNOCKBACK_RESISTANCE', 'Explosion Knockback Resistance', '💥', 'utility', 'explosion_knockback_resistance'),
  entry('MINING_EFFICIENCY', 'Mining Efficiency', '⛏', 'utility', 'mining_efficiency'),
  entry('MOVEMENT_EFFICIENCY', 'Movement Efficiency', '👟', 'utility', 'movement_efficiency'),
  entry('OXYGEN_BONUS', 'Oxygen Bonus', '🫧', 'utility', 'oxygen_bonus'),
  entry('SNEAKING_SPEED', 'Sneaking Speed', '🤫', 'utility', 'sneaking_speed'),
  entry('SUBMERGED_MINING_SPEED', 'Submerged Mining Speed', '🌊', 'utility', 'submerged_mining_speed'),
  entry('SWEEPING_DAMAGE_RATIO', 'Sweeping Damage Ratio', '⚔', 'damage', 'sweeping_damage_ratio'),
  entry('WATER_MOVEMENT_EFFICIENCY', 'Water Movement Efficiency', '💧', 'utility', 'water_movement_efficiency'),

  // Resources
  entry('MAX_MANA', 'Max Mana', '✦', 'resource', 'max_mana'),
  entry('MAX_STAMINA', 'Max Stamina', '⚡', 'resource', 'max_stamina'),
  entry('MAX_STELLIUM', 'Max Stellium', '✧', 'resource', 'max_stellium'),
  entry('HEALTH_REGENERATION', 'Health Regeneration', '❣', 'resource', 'health_regeneration'),
  entry('MANA_REGENERATION', 'Mana Regeneration', '✦', 'resource', 'mana_regeneration'),
  entry('STAMINA_REGENERATION', 'Stamina Regeneration', '⚡', 'resource', 'stamina_regeneration'),
  entry('STELLIUM_REGENERATION', 'Stellium Regeneration', '✧', 'resource', 'stellium_regeneration'),
  entry('MAX_HEALTH_REGENERATION', 'Max Health Regeneration %', '❣', 'resource', 'max_health_regeneration'),
  entry('MAX_MANA_REGENERATION', 'Max Mana Regeneration %', '✦', 'resource', 'max_mana_regeneration'),
  entry('MAX_STAMINA_REGENERATION', 'Max Stamina Regeneration %', '⚡', 'resource', 'max_stamina_regeneration'),
  entry('MAX_STELLIUM_REGENERATION', 'Max Stellium Regeneration %', '✧', 'resource', 'max_stellium_regeneration'),

  // Utility
  entry('ADDITIONAL_EXPERIENCE', 'Additional Experience', '⭐', 'utility', 'additional_experience'),
  entry('COOLDOWN_REDUCTION', 'Cooldown Reduction', '⏱', 'utility', 'cooldown_reduction'),
  entry('SPEED_MALUS_REDUCTION', 'Speed Malus Reduction', '🏃', 'utility', 'speed_malus_reduction'),
  entry('LUCK', 'Luck', '🍀', 'utility', 'luck'),

  // Crit
  entry('CRITICAL_STRIKE_CHANCE', 'Critical Hit Chance', '◎', 'critical', 'critical_strike_chance'),
  entry('CRITICAL_STRIKE_POWER', 'Critical Hit Power', '✧', 'critical', 'critical_strike_power'),
  entry('SKILL_CRITICAL_STRIKE_CHANCE', 'Skill Crit Chance', '◎', 'critical', 'skill_critical_strike_chance'),
  entry('SKILL_CRITICAL_STRIKE_POWER', 'Skill Crit Power', '✧', 'critical', 'skill_critical_strike_power'),

  // Damage multipliers
  entry('MAGIC_DAMAGE', 'Magic Damage', '✨', 'damage', 'magic_damage'),
  entry('PHYSICAL_DAMAGE', 'Physical Damage', '⚔', 'damage', 'physical_damage'),
  entry('PROJECTILE_DAMAGE', 'Projectile Damage', '🏹', 'damage', 'projectile_damage'),
  entry('WEAPON_DAMAGE', 'Weapon Damage', '🗡', 'damage', 'weapon_damage'),
  entry('SKILL_DAMAGE', 'Skill Damage', '✴', 'damage', 'skill_damage'),
  entry('UNDEAD_DAMAGE', 'Undead Damage', '💀', 'damage', 'undead_damage'),
  entry('PVP_DAMAGE', 'PvP Damage', '⚔', 'damage', 'pvp_damage'),
  entry('PVE_DAMAGE', 'PvE Damage', '👹', 'damage', 'pve_damage'),

  // Elemental (Phoenix stock)
  entry('FIRE_DAMAGE', 'Fire Damage', '🔥', 'damage', 'fire_damage'),
  entry('FIRE_DAMAGE_PERCENT', 'Fire Damage %', '🔥', 'damage', 'fire_damage_percent'),
  entry('FIRE_DEFENSE', 'Fire Defense', '🔥', 'utility', 'fire_defense'),
  entry('FIRE_DEFENSE_PERCENT', 'Fire Defense %', '🔥', 'utility', 'fire_defense_percent'),
  entry('FIRE_WEAKNESS', 'Fire Weakness', '🔥', 'utility', 'fire_weakness'),
  entry('ICE_DAMAGE', 'Ice Damage', '❄', 'damage', 'ice_damage'),
  entry('ICE_DAMAGE_PERCENT', 'Ice Damage %', '❄', 'damage', 'ice_damage_percent'),
  entry('ICE_DEFENSE', 'Ice Defense', '❄', 'utility', 'ice_defense'),
  entry('ICE_DEFENSE_PERCENT', 'Ice Defense %', '❄', 'utility', 'ice_defense_percent'),
  entry('ICE_WEAKNESS', 'Ice Weakness', '❄', 'utility', 'ice_weakness'),
  entry('WATER_DAMAGE', 'Water Damage', '💧', 'damage', 'water_damage'),
  entry('WATER_DAMAGE_PERCENT', 'Water Damage %', '💧', 'damage', 'water_damage_percent'),
  entry('WATER_DEFENSE', 'Water Defense', '💧', 'utility', 'water_defense'),
  entry('EARTH_DAMAGE', 'Earth Damage', '🪨', 'damage', 'earth_damage'),
  entry('EARTH_DAMAGE_PERCENT', 'Earth Damage %', '🪨', 'damage', 'earth_damage_percent'),
  entry('EARTH_DEFENSE', 'Earth Defense', '🪨', 'utility', 'earth_defense'),
  entry('WIND_DAMAGE', 'Wind Damage', '🌬', 'damage', 'wind_damage'),
  entry('WIND_DAMAGE_PERCENT', 'Wind Damage %', '🌬', 'damage', 'wind_damage_percent'),
  entry('THUNDER_DAMAGE', 'Thunder Damage', '⚡', 'damage', 'thunder_damage'),
  entry('THUNDER_DAMAGE_PERCENT', 'Thunder Damage %', '⚡', 'damage', 'thunder_damage_percent'),
  entry('THUNDER_DEFENSE', 'Thunder Defense', '⚡', 'utility', 'thunder_defense'),

  // On-hit / mitigation
  entry('LIFESTEAL', 'Lifesteal', 'vamp', 'utility', 'lifesteal'),
  entry('SPELL_VAMPIRISM', 'Spell Vampirism', 'vamp', 'utility', 'spell_vampirism'),
  entry('DAMAGE_REDUCTION', 'Damage Reduction', '🛡', 'utility', 'damage_reduction'),
  entry('MAGIC_DAMAGE_REDUCTION', 'Magic Damage Reduction', '🛡', 'utility', 'magic_damage_reduction'),
  entry('PHYSICAL_DAMAGE_REDUCTION', 'Physical Damage Reduction', '🛡', 'utility', 'physical_damage_reduction'),
  entry('FALL_DAMAGE_REDUCTION', 'Fall Damage Reduction', '🛡', 'utility', 'fall_damage_reduction'),
  entry('DEFENSE', 'Defense (MythicLib)', '◆', 'base', 'defense'),
]

export const ATTRIBUTE_BY_ID = new Map(ATTRIBUTE_CATALOG.map((a) => [a.id, a]))

export function normalizeAttributeId(raw: string): string {
  return raw.trim().toUpperCase().replace(/-/g, '_')
}

export function resolveAttributeMeta(id: string): AttributeCatalogEntry {
  const norm = normalizeAttributeId(id)
  return (
    ATTRIBUTE_BY_ID.get(norm) ?? {
      id: norm,
      label: norm
        .split('_')
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' '),
      icon: '•',
      group: 'other',
    }
  )
}

/** Default starter attributes for new classes. */
export const DEFAULT_CLASS_ATTRIBUTES = [
  { id: 'ATTACK_DAMAGE', base: 2.8, perLevel: 0.07, max: 10, showInLore: true },
  { id: 'MAX_HEALTH', base: 25, perLevel: 0.8, max: 100, showInLore: true },
  { id: 'KNOCKBACK_RESISTANCE', base: 0.02, perLevel: 0.006, max: 0.2, showInLore: true },
  { id: 'ARMOR', base: 0.5, perLevel: 0.05, max: 10, showInLore: true },
  { id: 'MAX_MANA', base: 20, perLevel: 1.6, max: 50, showInLore: true },
  { id: 'MANA_REGENERATION', base: 0.8, perLevel: 0.7, showInLore: true },
  { id: 'CRITICAL_STRIKE_CHANCE', base: 10, perLevel: 0.5, max: 40, showInLore: true },
  { id: 'CRITICAL_STRIKE_POWER', base: 8, perLevel: 0.8, max: 40, showInLore: true },
  { id: 'SKILL_CRITICAL_STRIKE_CHANCE', base: 8, perLevel: 0.7, max: 36, showInLore: true },
  { id: 'SKILL_CRITICAL_STRIKE_POWER', base: 8, perLevel: 0.7, max: 36, showInLore: true },
  { id: 'SKILL_DAMAGE', base: 1, perLevel: 0, showInLore: false },
] as const
