/** Phoenix MythicLib skill triggers for class bindings and MythicLib skill defaults. */
export const CLASS_SKILL_TRIGGERS = [
  { id: '', label: 'Active (cast from slot)', group: 'active' },
  // Combat
  { id: 'ATTACK', label: 'On attack', group: 'combat' },
  { id: 'DAMAGED', label: 'When damaged', group: 'combat' },
  { id: 'DAMAGED_BY_ENTITY', label: 'Damaged by entity', group: 'combat' },
  { id: 'KILL_ENTITY', label: 'On kill', group: 'combat' },
  { id: 'KILL_PLAYER', label: 'On player kill', group: 'combat' },
  { id: 'DEATH', label: 'On death', group: 'combat' },
  { id: 'ENTER_COMBAT', label: 'Enter combat', group: 'combat' },
  { id: 'QUIT_COMBAT', label: 'Quit combat', group: 'combat' },
  // Clicks
  { id: 'RIGHT_CLICK', label: 'Right click', group: 'clicks' },
  { id: 'LEFT_CLICK', label: 'Left click', group: 'clicks' },
  { id: 'SHIFT_RIGHT_CLICK', label: 'Sneak + right click', group: 'clicks' },
  { id: 'SHIFT_LEFT_CLICK', label: 'Sneak + left click', group: 'clicks' },
  // Projectiles
  { id: 'SHOOT_BOW', label: 'Shoot bow', group: 'projectiles' },
  { id: 'ARROW_HIT', label: 'Arrow hit', group: 'projectiles' },
  { id: 'ARROW_LAND', label: 'Arrow land', group: 'projectiles' },
  { id: 'ARROW_TICK', label: 'Arrow tick', group: 'projectiles' },
  { id: 'SHOOT_TRIDENT', label: 'Shoot trident', group: 'projectiles' },
  { id: 'TRIDENT_HIT', label: 'Trident hit', group: 'projectiles' },
  { id: 'TRIDENT_LAND', label: 'Trident land', group: 'projectiles' },
  { id: 'TRIDENT_TICK', label: 'Trident tick', group: 'projectiles' },
  // Blocks
  { id: 'BREAK_BLOCK', label: 'Break block', group: 'blocks' },
  { id: 'PLACE_BLOCK', label: 'Place block', group: 'blocks' },
  // Items
  { id: 'DROP_ITEM', label: 'Drop item', group: 'items' },
  { id: 'SHIFT_DROP_ITEM', label: 'Sneak + drop item', group: 'items' },
  { id: 'SWAP_ITEMS', label: 'Swap hands', group: 'items' },
  { id: 'SHIFT_SWAP_ITEMS', label: 'Sneak + swap hands', group: 'items' },
  // Misc
  { id: 'LOGIN', label: 'On login', group: 'misc' },
  { id: 'SNEAK', label: 'On sneak', group: 'misc' },
  { id: 'TELEPORT', label: 'On teleport', group: 'misc' },
  { id: 'TIMER', label: 'On timer', group: 'misc' },
] as const

export type ClassSkillTriggerId = (typeof CLASS_SKILL_TRIGGERS)[number]['id']

/** Combo keybinds for class key-combos / skill casting. */
export const CASTING_KEYBINDS = [
  'LEFT_CLICK',
  'RIGHT_CLICK',
  'DROP',
  'SWAP_HANDS',
  'CROUCH',
] as const

export type CastingKeybind = (typeof CASTING_KEYBINDS)[number]

/** Common mmodamage type chips. */
export const DAMAGE_TYPE_CHIPS = [
  'SKILL',
  'MAGIC',
  'PHYSICAL',
  'PROJECTILE',
  'WEAPON',
  'UNARMED',
  'ON_HIT',
] as const

/** Phoenix stock + common element ids for pickers. */
export const DEFAULT_ELEMENT_IDS = [
  'FIRE',
  'ICE',
  'WATER',
  'EARTH',
  'WIND',
  'AIR',
  'THUNDER',
  'LIGHTNING',
] as const
