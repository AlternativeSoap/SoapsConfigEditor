/** BossBar Color values (wiki: Mobs / BossBar). */
export const BOSS_BAR_COLORS = [
  'PINK',
  'BLUE',
  'RED',
  'GREEN',
  'YELLOW',
  'PURPLE',
  'WHITE',
] as const

/** BossBar Style values. */
export const BOSS_BAR_STYLES = [
  'SOLID',
  'SEGMENTED_6',
  'SEGMENTED_10',
  'SEGMENTED_12',
  'SEGMENTED_20',
] as const

/** MythicRPG experience source Types. */
export const EXPERIENCE_SOURCE_TYPES = [
  'killEntity',
  'castSpell',
  'blockBreak',
  'fish',
  'custom',
] as const

/** Experience curve types. */
export const EXPERIENCE_CURVE_TYPES = ['FORMULA', 'TABLE'] as const

/** MythicRPG archetype Group values. */
export const ARCHETYPE_GROUPS = ['CLASS', 'PROFESSION'] as const

/** Common AI goal selector apply snippets (params vary; these are starters). */
export const AI_GOAL_APPLY: Record<string, string> = {
  clear: 'clear',
  meleeattack: 'meleeattack{speed=1}',
  lookatplayers: 'lookatplayers',
  randomstroll: 'randomstroll',
  bowshoot: 'bowshoot',
  flee: 'flee',
}

/** Common AI target selector apply snippets. */
export const AI_TARGET_APPLY: Record<string, string> = {
  clear: 'clear',
  players: 'players',
  attacker: 'attacker',
  nearestplayer: 'nearestplayer',
}
