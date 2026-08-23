/** Bukkit / Spigot damage causes used by MythicMobs DamageModifiers (wiki: Mobs / DamageModifiers). */
export const DAMAGE_MODIFIER_TYPES = [
  'BLOCK_EXPLOSION',
  'CAMPFIRE',
  'CONTACT',
  'CRAMMING',
  'CUSTOM',
  'DRAGON_BREATH',
  'DROWNING',
  'DRYOUT',
  'ENTITY_ATTACK',
  'ENTITY_EXPLOSION',
  'ENTITY_SWEEP_ATTACK',
  'FALL',
  'FALLING_BLOCK',
  'FIRE',
  'FIRE_TICK',
  'FLY_INTO_WALL',
  'FREEZE',
  'HOT_FLOOR',
  'KILL',
  'LAVA',
  'LIGHTNING',
  'MAGIC',
  'MELTING',
  'POISON',
  'PROJECTILE',
  'SONIC_BOOM',
  'STARVATION',
  'SUFFOCATION',
  'SUICIDE',
  'THORNS',
  'VOID',
  'WITHER',
  'WORLD_BORDER',
] as const

export type DamageModifierType = (typeof DAMAGE_MODIFIER_TYPES)[number]

export function damageModifierApply(type: string, multiplier = '1'): string {
  return `${type} ${multiplier}`
}
