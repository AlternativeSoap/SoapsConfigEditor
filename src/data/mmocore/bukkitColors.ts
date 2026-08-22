/** Bukkit ChatColor names used in MMOCore mana.color.* */
export const BUKKIT_CHAT_COLORS = [
  'BLACK',
  'DARK_BLUE',
  'DARK_GREEN',
  'DARK_AQUA',
  'DARK_RED',
  'DARK_PURPLE',
  'GOLD',
  'GRAY',
  'DARK_GRAY',
  'BLUE',
  'GREEN',
  'AQUA',
  'RED',
  'LIGHT_PURPLE',
  'YELLOW',
  'WHITE',
] as const

export type BukkitChatColor = (typeof BUKKIT_CHAT_COLORS)[number]
