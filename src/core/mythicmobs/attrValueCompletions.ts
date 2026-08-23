import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { COMMON_MATERIALS } from '../../data/mmocore/materials'
import { MINECRAFT_SOUND_KEYS } from '../../data/mythicmobs/soundKeys'
import type { MechanicAttr } from '../../data/mythicmobs/mechanics'
import { DROPTABLE_ATTRS, ITEM_ATTRS, SKILL_REF_ATTRS, SLOT_ATTRS } from './attrRegistry'
import { EQUIPMENT_SLOTS } from './yamlEditContext'

export const BOOLEAN_VALUES = ['true', 'false']

export const POTION_EFFECTS = [
  'SPEED', 'SLOW', 'FAST_DIGGING', 'SLOW_DIGGING', 'INCREASE_DAMAGE', 'HEAL', 'HARM',
  'JUMP', 'CONFUSION', 'REGENERATION', 'DAMAGE_RESISTANCE', 'FIRE_RESISTANCE', 'WATER_BREATHING',
  'INVISIBILITY', 'BLINDNESS', 'NIGHT_VISION', 'HUNGER', 'WEAKNESS', 'POISON', 'WITHER',
  'HEALTH_BOOST', 'ABSORPTION', 'SATURATION', 'GLOWING', 'LEVITATION', 'LUCK', 'UNLUCK',
  'SLOW_FALLING', 'CONDUIT_POWER', 'DOLPHINS_GRACE', 'BAD_OMEN', 'HERO_OF_THE_VILLAGE',
  'DARKNESS', 'NAUSEA', 'INSTANT_DAMAGE', 'INSTANT_HEALTH', 'MINING_FATIGUE', 'STRENGTH',
]

export const PARTICLE_TYPES = [
  'FLAME', 'SMOKE', 'LARGE_SMOKE', 'CLOUD', 'REDSTONE', 'SPELL_WITCH', 'ENCHANTMENT_TABLE',
  'CRIT', 'MAGIC_CRIT', 'SPELL', 'INSTANT_SPELL', 'MOB_SPELL', 'MOB_SPELL_AMBIENT', 'WITCH',
  'EXPLOSION', 'HEART', 'NOTE', 'PORTAL', 'FIREWORKS_SPARK', 'VILLAGER_HAPPY', 'VILLAGER_ANGRY',
  'DRIP_WATER', 'DRIP_LAVA', 'SNOWBALL', 'SLIME', 'BUBBLE', 'SPLASH', 'FISHING', 'RAIN',
  'ITEM_SNOWBALL', 'BLOCK_DUST', 'FALLING_DUST', 'TOTEM', 'SOUL', 'SOUL_FIRE_FLAME',
  'SCRAPE', 'WAX_ON', 'WAX_OFF', 'ELECTRIC_SPARK', 'DRAGON_BREATH', 'END_ROD', 'TOTEM_OF_UNDYING',
  'COMPOSTER', 'SPORE_BLOSSOM_AIR', 'SPORE_BLOSSOM', 'GLOW', 'GLOW_SQUID_INK', 'SCULK_SOUL',
  'SCULK_CHARGE', 'SHRIEK', 'CHERRY_LEAVES', 'DECORATED_POT', 'EGG_CRACK',
]

export const DAMAGE_CAUSES = [
  'entity_attack', 'entity_sweep_attack', 'projectile', 'magic', 'fire', 'fire_tick', 'lava',
  'drowning', 'block_explosion', 'entity_explosion', 'fall', 'fly_into_wall', 'hot_floor',
  'cramming', 'lightning', 'starvation', 'poison', 'wither', 'falling_block', 'thorns',
  'dragon_breath', 'custom', 'sonic_boom', 'freeze', 'dryout', 'kill', 'void', 'contact',
]

export const TEAM_COLORS = [
  'RED', 'BLUE', 'GREEN', 'YELLOW', 'AQUA', 'WHITE', 'GRAY', 'DARK_BLUE', 'DARK_GREEN',
  'DARK_RED', 'DARK_AQUA', 'DARK_GRAY', 'BLACK', 'GOLD', 'DARK_PURPLE', 'LIGHT_PURPLE',
]

export const AURA_TYPES = ['BUFF', 'DEBUFF']

export const STRUCTURE_TYPES = [
  'VILLAGE', 'DESERT_PYRAMID', 'JUNGLE_PYRAMID', 'SWAMP_HUT', 'IGLOO', 'OCEAN_RUIN',
  'SHIPWRECK', 'BURIED_TREASURE', 'MINESHAFT', 'STRONGHOLD', 'FORTRESS', 'END_CITY',
  'BASTION_REMNANT', 'RUINED_PORTAL', 'PILLAGER_OUTPOST', 'WOODLAND_MANSION', 'TRAIL_RUINS',
]

export const ENTITY_TYPES = [
  'ZOMBIE', 'SKELETON', 'CREEPER', 'SPIDER', 'CAVE_SPIDER', 'WITCH', 'BLAZE',
  'GHAST', 'SLIME', 'MAGMA_CUBE', 'ENDERMAN', 'ENDERMITE', 'ZOMBIE_VILLAGER',
  'HUSK', 'STRAY', 'WITHER_SKELETON', 'DROWNED', 'VINDICATOR', 'EVOKER',
  'VEX', 'PILLAGER', 'RAVAGER', 'ILLUSIONER', 'ELDER_GUARDIAN', 'GUARDIAN',
  'SHULKER', 'SILVERFISH', 'PHANTOM', 'PIGLIN', 'PIGLIN_BRUTE', 'HOGLIN',
  'ZOGLIN', 'WARDEN', 'BREEZE', 'BOGGED', 'CREAKING',
  'PLAYER', 'VILLAGER', 'WANDERING_TRADER', 'IRON_GOLEM', 'SNOW_GOLEM',
  'PIG', 'COW', 'SHEEP', 'CHICKEN', 'HORSE', 'DONKEY', 'MULE', 'LLAMA',
  'WOLF', 'CAT', 'OCELOT', 'FOX', 'PANDA', 'POLAR_BEAR', 'BEE',
  'TURTLE', 'COD', 'SALMON', 'TROPICAL_FISH', 'PUFFERFISH', 'DOLPHIN',
  'SQUID', 'GLOW_SQUID', 'AXOLOTL', 'FROG', 'TADPOLE', 'ALLAY', 'SNIFFER',
  'ARMOR_STAND', 'WITHER', 'ENDER_DRAGON', 'GIANT',
]

export const BLOCK_MATERIALS = [
  'STONE', 'COBBLESTONE', 'DIRT', 'GRASS_BLOCK', 'SAND', 'GRAVEL', 'OBSIDIAN', 'ICE',
  'GLASS', 'OAK_LOG', 'BIRCH_LOG', 'SPRUCE_LOG', 'NETHERRACK', 'SOUL_SAND', 'BEDROCK',
  'DIAMOND_BLOCK', 'GOLD_BLOCK', 'IRON_BLOCK', 'EMERALD_BLOCK', 'REDSTONE_BLOCK',
]

export const MATERIALS = [...new Set([...COMMON_MATERIALS, ...BLOCK_MATERIALS])]

export const BIOMES = [
  'PLAINS', 'DESERT', 'FOREST', 'TAIGA', 'SWAMP', 'JUNGLE', 'SAVANNA', 'SNOWY_PLAINS',
  'ICE_SPIKES', 'MUSHROOM_FIELDS', 'DEEP_OCEAN', 'OCEAN', 'RIVER', 'BEACH', 'MOUNTAINS',
  'BADLANDS', 'DARK_FOREST', 'BIRCH_FOREST', 'FLOWER_FOREST', 'CHERRY_GROVE', 'MEADOW',
  'NETHER_WASTES', 'SOUL_SAND_VALLEY', 'CRIMSON_FOREST', 'WARPED_FOREST', 'BASALT_DELTAS',
  'THE_END', 'END_HIGHLANDS', 'END_MIDLANDS', 'SMALL_END_ISLANDS',
]

export const GAMEMODES = ['SURVIVAL', 'CREATIVE', 'ADVENTURE', 'SPECTATOR']

export const DIMENSIONS = ['NORMAL', 'NETHER', 'THE_END']

export const SPAWN_REASONS = [
  'NATURAL', 'DEFAULT', 'SPAWNER', 'EGG', 'SLIME_SPLIT', 'JOCKEY', 'MOUNT', 'TRAP',
  'CURED', 'CUSTOM', 'BUILD_IRONGOLEM', 'BUILD_SNOWMAN', 'BUILD_WITHER', 'VILLAGE_DEFENSE',
]

export const COMPARE_OPERATORS = [
  'EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'GREATER_THAN_OR_EQUALS',
  'LESS_THAN', 'LESS_THAN_OR_EQUALS',
]

export const ENCHANTMENTS = [
  'SHARPNESS', 'SMITE', 'BANE_OF_ARTHROPODS', 'KNOCKBACK', 'FIRE_ASPECT', 'LOOTING',
  'EFFICIENCY', 'SILK_TOUCH', 'UNBREAKING', 'FORTUNE', 'POWER', 'PUNCH', 'FLAME', 'INFINITY',
  'PROTECTION', 'FIRE_PROTECTION', 'FEATHER_FALLING', 'BLAST_PROTECTION', 'PROJECTILE_PROTECTION',
  'RESPIRATION', 'AQUA_AFFINITY', 'THORNS', 'DEPTH_STRIDER', 'FROST_WALKER', 'MENDING',
  'CURSE_OF_BINDING', 'CURSE_OF_VANISHING', 'LOYALTY', 'IMPALING', 'RIPTIDE', 'CHANNELING',
  'MULTISHOT', 'QUICK_CHARGE', 'PIERCING', 'SWEEPING_EDGE', 'SOUL_SPEED', 'SWIFT_SNEAK',
]

export const WEATHER_TYPES = ['CLEAR', 'RAIN', 'STORM', 'THUNDER', 'DOWNFALL']

export const RANDOMSPAWN_ACTIONS = ['ADD', 'REPLACE', 'DENY']

export const PLACEHOLDERS = [
  '<caster.name>', '<caster.uuid>', '<caster.hp>', '<caster.mhp>', '<caster.level>',
  '<target.name>', '<target.uuid>', '<target.hp>', '<target.mhp>',
  '<trigger.name>', '<skill.name>', '<skill.cooldown>',
  '<var.name>', '<modifier.damage>',
]

export const TIMER_TICK_PRESETS = ['20', '40', '60', '100', '200', '400', '600', '1200']
export function enumOptionsFromDesc(desc?: string, defaultVal?: string): string[] {
  if (!desc) return defaultVal ? [defaultVal] : []

  const slashStart = /^([A-Za-z0-9_]+(?:\s*\/\s*[A-Za-z0-9_]+)+)/.exec(desc.trim())
  if (slashStart) {
    return slashStart[1].split('/').map((s) => s.trim()).filter(Boolean)
  }

  const egMatch = /\(e\.g\.\s*([^)]+)\)/i.exec(desc)
  if (egMatch) {
    return egMatch[1].split(/,\s*/).map((s) => s.trim()).filter(Boolean)
  }

  const caps = [...desc.matchAll(/\b([A-Z][A-Z0-9_]{1,})\b/g)].map((m) => m[1]!)
  const uniqueCaps = [...new Set(caps)]
  if (uniqueCaps.length >= 2) return uniqueCaps

  return defaultVal ? [defaultVal] : []
}

function effectiveAttrType(attr: MechanicAttr): MechanicAttr['type'] {
  if (attr.type !== 'string') return attr.type
  if (attr.default === 'true' || attr.default === 'false') return 'boolean'
  return attr.type
}

export function valuesForAttr(
  blockId: string,
  attr: MechanicAttr,
  packSkillIds: string[],
  packMobIds: string[],
  packItemIds: string[] = [],
  packDroptableIds: string[] = [],
): string[] {
  const type = effectiveAttrType(attr)
  const name = attr.name.toLowerCase()
  const block = blockId.toLowerCase()

  if (SKILL_REF_ATTRS.has(name) || type === 'skill') return packSkillIds
  if (DROPTABLE_ATTRS.has(name)) return packDroptableIds
  if (SLOT_ATTRS.has(name)) return [...EQUIPMENT_SLOTS]
  if (ITEM_ATTRS.has(name)) return [...new Set([...MATERIALS, ...packItemIds])]

  if (type === 'boolean') return BOOLEAN_VALUES

  if (type === 'enum') {
    const fromDesc = enumOptionsFromDesc(attr.desc, attr.default)
    if (fromDesc.length) return fromDesc
  }

  if (name === 'damagecause' || name === 'cause') return DAMAGE_CAUSES
  if (name === 'sound') return [...MINECRAFT_SOUND_KEYS]
  if (name === 'particle') return PARTICLE_TYPES
  if (name === 'color') return TEAM_COLORS
  if (name === 'biome') return BIOMES
  if (name === 'reason') return SPAWN_REASONS
  if (name === 'mode' && block === 'gamemode') return GAMEMODES
  if (name === 'dimension') return DIMENSIONS
  if (name === 'enchantment') return ENCHANTMENTS
  if (name === 'operator') return COMPARE_OPERATORS
  if (name === 'action') return RANDOMSPAWN_ACTIONS

  if (name === 'type') {
    if (block === 'potion' || block === 'summonareaeffectcloud' || block === 'potionclear') {
      return POTION_EFFECTS
    }
    if (block === 'entitytype' || block === 'instype') return ENTITY_TYPES
    if (block === 'hasauratype') return AURA_TYPES
    if (block === 'mobsinradius' || block === 'mobsnearorigin' || block === 'mythicmobtype') {
      return packMobIds.length ? packMobIds : ENTITY_TYPES
    }
    if (block === 'neareststructure') return STRUCTURE_TYPES
    if (block.includes('particle')) return PARTICLE_TYPES
    if (block === 'summon' || block === 'mount' || block === 'summonpassenger') {
      return [...new Set([...ENTITY_TYPES, ...packMobIds])]
    }
    if (block === 'weather' || block === 'setweather') return WEATHER_TYPES
  }

  if (name === 'entitytype' || name === 'mobtype') {
    return packMobIds.length ? packMobIds : ENTITY_TYPES
  }

  if (type === 'number' && attr.default) return [attr.default]

  if (attr.default) return [attr.default]

  return []
}

export function buildBraceAttrValueCompletions(
  inside: string,
  attrs: MechanicAttr[],
  blockId: string,
  context: CompletionContext,
  packSkillIds: string[],
  packMobIds: string[],
  packItemIds: string[] = [],
  packDroptableIds: string[] = [],
): CompletionResult | null {
  const valueMatch = /(?:^|;)\s*([A-Za-z0-9_]+)=([^;]*)$/.exec(inside)
  if (!valueMatch) return null

  const attrName = valueMatch[1] ?? ''
  let typed = valueMatch[2] ?? ''

  if (attrName.toLowerCase() === 'skills' && typed.includes(',')) {
    typed = typed.split(',').pop()?.trim() ?? typed
  }

  const attr = attrs.find((a) => a.name.toLowerCase() === attrName.toLowerCase())
  if (!attr) return null

  const values = valuesForAttr(blockId, attr, packSkillIds, packMobIds, packItemIds, packDroptableIds)
  if (values.length === 0) return null

  const filtered = values.filter(
    (v) => !typed || v.toLowerCase().startsWith(typed.toLowerCase()),
  )
  if (filtered.length === 0) return null

  const from = context.pos - typed.length
  const options: Completion[] = filtered.map((v) => ({
    label: v,
    type: 'enum',
    detail: effectiveAttrType(attr),
  }))

  return { from, options, validFor: /^[^;,]*$/ }
}
