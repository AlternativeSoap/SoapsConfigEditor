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

/** Display entity Billboard (wiki: Mobs / Display Options). */
export const DISPLAY_BILLBOARDS = ['FIXED', 'CENTER', 'HORIZONTAL', 'VERTICAL'] as const

/** Item display Transform values. */
export const DISPLAY_TRANSFORMS = [
  'NONE',
  'THIRDPERSON_LEFTHAND',
  'THIRDPERSON_RIGHTHAND',
  'FIRSTPERSON_LEFTHAND',
  'FIRSTPERSON_RIGHTHAND',
  'HEAD',
  'GUI',
  'GROUND',
  'FIXED',
] as const

/** Text display Alignment values. */
export const DISPLAY_ALIGNMENTS = ['CENTER', 'LEFT', 'RIGHT'] as const

/** Mannequin MainHand values. */
export const MANNEQUIN_MAIN_HANDS = ['LEFT', 'RIGHT'] as const

/** Mannequin SkinModel values. */
export const MANNEQUIN_MODELS = ['CLASSIC', 'SLIM'] as const

/** Common mannequin Pose starters (not the full Spigot enum). */
export const MANNEQUIN_POSE_STARTERS = [
  'STANDING',
  'FALL_FLYING',
  'SLEEPING',
  'SWIMMING',
  'SPIN_ATTACK',
  'SNEAKING',
  'LONG_JUMPING',
  'DYING',
  'CROUCHING',
] as const

/** FancyDrops DropMethod values. */
export const DROP_METHODS = ['VANILLA', 'FANCY'] as const

/** RandomSpawn PositionType values. */
export const RANDOMSPAWN_POSITION_TYPES = ['LAND', 'SEA'] as const

/** Common AI goal selector apply snippets (params vary; these are starters). */
export const AI_GOAL_APPLY: Record<string, string> = {
  clear: 'clear',
  meleeattack: 'meleeattack',
  lookatplayers: 'lookatplayers',
  randomstroll: 'randomstroll',
  bowshoot: 'bowshoot',
  flee: 'flee',
  fleefaction: 'fleefaction',
  gotospawn: 'gotospawn',
}

/** Optional params hint shown in the New mob AI list. */
export const AI_GOAL_PARAM_HINTS: Record<string, string> = {
  fleefaction: 'factionName',
  gotospawn: '{speed=1}',
  fleeConditional: '{safeSpeed=1;distance=8}',
  movetoblock: 'STONE',
}

/** Common AI target selector apply snippets. */
export const AI_TARGET_APPLY: Record<string, string> = {
  clear: 'clear',
  players: 'players',
  attacker: 'attacker',
  nearestplayer: 'nearestplayer',
  specificfaction: 'specificfaction',
  otherfaction: 'otherfaction',
}

export const AI_TARGET_PARAM_HINTS: Record<string, string> = {
  specificfaction: 'factionName',
  otherfaction: 'factionName',
}
