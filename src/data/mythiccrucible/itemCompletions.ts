/** Lore / placeholder snippets for Crucible dynamic lore. */
export const CRUCIBLE_LORE_PLACEHOLDERS = [
  '{stats}',
  '{stats-each}',
  '{augments:TYPE}',
  '{augments-each:TYPE}',
  '{equipment-set}',
  '<stat.display>',
  '<augment.display>',
  '<augment.icon>',
  '<augment.type>',
  '<augment.tooltip>',
  '<lore.Description>',
  '<item.group>',
  '<item.level.description>',
  '<item.upgrade.description>',
] as const

/** Common weapon lore that shows stats (and optionally the equipment set block). */
export const DEFAULT_WEAPON_STATS_LORE =
  '{stats}\n{stats}<gray>Stats:\n{stats-each}<white><stat.display>'

export const DEFAULT_SET_PIECE_LORE = `${DEFAULT_WEAPON_STATS_LORE}\n{equipment-set}`
