import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { COMMON_MATERIALS } from '../../data/mmocore/materials'
import { AUDIENCE_TARGETER_STARTERS, AUDIENCE_VALUES } from '../../data/mythicmobs/audienceTypes'
import { EQUIPMENT_SLOT_COMPLETIONS, EQUIPMENT_SLOTS } from '../../data/mythicmobs/equipSlots'
import type { MechanicAttr } from '../../data/mythicmobs/mechanics'
import {
  isDustOptionsParticle,
  PARTICLE_FAMILY_ATTRS,
  PARTICLE_HEX_COLORS,
  PARTICLE_TYPES,
} from '../../data/mythicmobs/particleTypes'
import {
  ARROW_BULLET_TYPES,
  BULLET_TYPES,
  isMissileFamilyBlock,
  isProjectileFlightBlock,
  isProjectileInheritBlock,
  LOS_MODE_VALUES,
  MISSILE_EXTRA_ATTRS,
  PROJECTILE_BULLET_ATTRS,
  PROJECTILE_FLIGHT_ATTRS,
  PROJECTILE_INHERITABLE_ATTRS,
  PROJECTILE_TYPES,
} from '../../data/mythicmobs/projectileAttrs'
import {
  ALL_TARGETER_ATTRS,
  AUDIENCE_ATTR,
  COMMON_TARGETER_ATTRS,
  isRadiusLikeTargeter,
  isThreatTargeter,
  THREAT_TARGETER_ATTRS,
  UNIVERSAL_MECHANIC_ATTRS,
  VISIBILITY_MECHANIC_IDS,
} from '../../data/mythicmobs/sharedSkillAttrs'
import { MINECRAFT_SOUND_KEYS } from '../../data/mythicmobs/soundKeys'
import { DROPTABLE_ATTRS, ITEM_ATTRS, SKILL_REF_ATTRS, SLOT_ATTRS } from './attrRegistry'
import { parseAttrNames } from './skillLineAttrs'

export { PARTICLE_TYPES } from '../../data/mythicmobs/particleTypes'
export { EQUIPMENT_SLOTS }

export const BOOLEAN_VALUES = ['true', 'false']

export const POTION_EFFECTS = [
  'SPEED', 'SLOW', 'FAST_DIGGING', 'SLOW_DIGGING', 'INCREASE_DAMAGE', 'HEAL', 'HARM',
  'JUMP', 'CONFUSION', 'REGENERATION', 'DAMAGE_RESISTANCE', 'FIRE_RESISTANCE', 'WATER_BREATHING',
  'INVISIBILITY', 'BLINDNESS', 'NIGHT_VISION', 'HUNGER', 'WEAKNESS', 'POISON', 'WITHER',
  'HEALTH_BOOST', 'ABSORPTION', 'SATURATION', 'GLOWING', 'LEVITATION', 'LUCK', 'UNLUCK',
  'SLOW_FALLING', 'CONDUIT_POWER', 'DOLPHINS_GRACE', 'BAD_OMEN', 'HERO_OF_THE_VILLAGE',
  'DARKNESS', 'NAUSEA', 'INSTANT_DAMAGE', 'INSTANT_HEALTH', 'MINING_FATIGUE', 'STRENGTH',
]

export const DAMAGE_CAUSES = [
  'ENTITY_ATTACK', 'ENTITY_SWEEP_ATTACK', 'PROJECTILE', 'MAGIC', 'FIRE', 'FIRE_TICK', 'LAVA',
  'DROWNING', 'BLOCK_EXPLOSION', 'ENTITY_EXPLOSION', 'FALL', 'FLY_INTO_WALL', 'HOT_FLOOR',
  'CRAMMING', 'LIGHTNING', 'STARVATION', 'POISON', 'WITHER', 'FALLING_BLOCK', 'THORNS',
  'DRAGON_BREATH', 'CUSTOM', 'SONIC_BOOM', 'FREEZE', 'DRYOUT', 'KILL', 'VOID', 'CONTACT',
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

/** Common color attr names for dust hex completions. */
const HEX_COLOR_ATTRS = new Set(['color', 'c', 'color2', 'c2'])

export type AttrValueOption = { label: string; apply?: string; detail?: string }

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

export function isParticleFamilyBlock(blockId: string): boolean {
  const b = blockId.toLowerCase()
  return b.includes('particle') || b === 'atom'
}

/** Parse `key=value` pairs from an open brace interior (incomplete trailing ok). */
export function parseBraceAttrMap(inside: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const part of inside.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim().toLowerCase()
    const value = trimmed.slice(eq + 1).trim()
    if (key) map.set(key, value)
  }
  return map
}

export function currentParticleFromInside(inside: string): string | null {
  const map = parseBraceAttrMap(inside)
  const raw = map.get('particle') ?? map.get('type')
  if (!raw) return null
  const token = raw.split(/[\s,]/)[0]?.trim()
  return token || null
}

function mergeAttrLists(base: MechanicAttr[], extra: MechanicAttr[]): MechanicAttr[] {
  const byName = new Map<string, MechanicAttr>()
  for (const a of base) byName.set(a.name.toLowerCase(), a)
  for (const a of extra) {
    if (!byName.has(a.name.toLowerCase())) byName.set(a.name.toLowerCase(), a)
  }
  return [...byName.values()]
}

/**
 * Inject shared attrs for brace name/value AC.
 * `kind` controls which shared catalogs apply (mechanics vs targeters).
 */
export function augmentBraceAttrs(
  attrs: MechanicAttr[],
  blockId: string,
  kind: 'mechanic' | 'targeter' | 'condition' = 'mechanic',
): MechanicAttr[] {
  if (kind === 'condition') return attrs

  if (kind === 'targeter') {
    let merged = mergeAttrLists(attrs, ALL_TARGETER_ATTRS)
    if (isThreatTargeter(blockId)) merged = mergeAttrLists(merged, THREAT_TARGETER_ATTRS)
    else if (isRadiusLikeTargeter(blockId)) merged = mergeAttrLists(merged, COMMON_TARGETER_ATTRS)
    return merged
  }

  let merged = mergeAttrLists(attrs, UNIVERSAL_MECHANIC_ATTRS)
  const id = blockId.toLowerCase()

  if (isParticleFamilyBlock(blockId)) {
    merged = mergeAttrLists(merged, PARTICLE_FAMILY_ATTRS)
  }
  if (VISIBILITY_MECHANIC_IDS.has(id) || isParticleFamilyBlock(blockId)) {
    merged = mergeAttrLists(merged, [AUDIENCE_ATTR])
  }
  if (isProjectileInheritBlock(blockId)) {
    merged = mergeAttrLists(merged, PROJECTILE_INHERITABLE_ATTRS)
    merged = mergeAttrLists(merged, PROJECTILE_BULLET_ATTRS)
  }
  if (isProjectileFlightBlock(blockId)) {
    merged = mergeAttrLists(merged, PROJECTILE_FLIGHT_ATTRS)
  }
  if (isMissileFamilyBlock(blockId)) {
    merged = mergeAttrLists(merged, MISSILE_EXTRA_ATTRS)
  }

  return merged
}

function syntheticAttr(attrName: string, blockId: string): MechanicAttr | null {
  const name = attrName.toLowerCase()
  if (name === 'particle') return { name: 'particle', type: 'enum', default: 'FLAME' }
  if (name === 'audience') return { name: 'audience', type: 'enum', default: 'tracked' }
  if (SLOT_ATTRS.has(name)) return { name: 'slot', type: 'enum', default: 'HEAD' }
  if (HEX_COLOR_ATTRS.has(name)) return { name: attrName, type: 'string', default: '#FF0000' }
  if (name === 'size') return { name: 'size', type: 'number', default: '1' }
  if (name === 'type' && isParticleFamilyBlock(blockId)) {
    return { name: 'type', type: 'enum', default: 'FLAME' }
  }
  if (name === 'material' && isParticleFamilyBlock(blockId)) {
    return { name: 'material', type: 'string', default: 'STONE' }
  }
  return null
}

function resolveAttr(
  attrs: MechanicAttr[],
  attrName: string,
  blockId: string,
): MechanicAttr | null {
  const found = attrs.find((a) => a.name.toLowerCase() === attrName.toLowerCase())
  if (found) return found
  return syntheticAttr(attrName, blockId)
}

function usesHexParticleColor(inside: string, blockId: string): boolean {
  if (!isParticleFamilyBlock(blockId)) return false
  const particle = currentParticleFromInside(inside)
  return particle ? isDustOptionsParticle(particle) : false
}

function particleValueApply(particle: string, inside: string): string | undefined {
  const present = parseAttrNames(inside)
  const upper = particle.toUpperCase()
  if (upper === 'DUST') {
    if (present.has('color') || present.has('c')) return undefined
    return 'DUST;color=#FF0000'
  }
  if (upper === 'DUST_COLOR_TRANSITION') {
    let apply = 'DUST_COLOR_TRANSITION'
    if (!present.has('color') && !present.has('c')) apply += ';color=#FF0000'
    if (!present.has('color2') && !present.has('c2')) apply += ';color2=#0000FF'
    return apply === 'DUST_COLOR_TRANSITION' ? undefined : apply
  }
  return undefined
}

function matchesTyped(label: string, typed: string): boolean {
  if (!typed) return true
  return label.toLowerCase().startsWith(typed.toLowerCase())
}

function audienceOptions(typed: string): AttrValueOption[] {
  const source = typed.startsWith('@') ? AUDIENCE_TARGETER_STARTERS : AUDIENCE_VALUES
  return source.filter((v) => matchesTyped(v, typed)).map((label) => ({ label }))
}

export function valuesForAttr(
  blockId: string,
  attr: MechanicAttr,
  packSkillIds: string[],
  packMobIds: string[],
  packItemIds: string[] = [],
  packDroptableIds: string[] = [],
  braceInside = '',
): string[] {
  const type = effectiveAttrType(attr)
  const name = attr.name.toLowerCase()
  const block = blockId.toLowerCase()

  if (SKILL_REF_ATTRS.has(name) || type === 'skill') return packSkillIds
  if (DROPTABLE_ATTRS.has(name)) return packDroptableIds
  if (SLOT_ATTRS.has(name)) return [...EQUIPMENT_SLOTS]
  if (ITEM_ATTRS.has(name)) return [...new Set([...MATERIALS, ...packItemIds])]

  if (type === 'boolean') return BOOLEAN_VALUES

  // Named catalogs before generic enum-from-desc (avoids default-only results like particle → [FLAME]).
  if (name === 'damagecause' || name === 'cause') return DAMAGE_CAUSES
  if (name === 'sound') return [...MINECRAFT_SOUND_KEYS]
  if (name === 'particle') return [...PARTICLE_TYPES]
  if (name === 'audience') return [...AUDIENCE_VALUES]
  if (name === 'bullettype' || name === 'bullet') return [...BULLET_TYPES]
  if (name === 'arrowtype' || name === 'bulletarrowtype') return [...ARROW_BULLET_TYPES]
  if (name === 'requirelineofsight' || name === 'rlos' || name === 'los' || name === 'requirelos') {
    return [...LOS_MODE_VALUES]
  }
  if (name === 'highaccuracymode' || name === 'ham') return [...LOS_MODE_VALUES]
  if (HEX_COLOR_ATTRS.has(name) && usesHexParticleColor(braceInside, blockId)) {
    return [...PARTICLE_HEX_COLORS]
  }
  if (name === 'color') return TEAM_COLORS
  if (name === 'biome') return BIOMES
  if (name === 'reason') return SPAWN_REASONS
  if (name === 'mode' && block === 'gamemode') return GAMEMODES
  if (name === 'dimension') return DIMENSIONS
  if (name === 'enchantment') return ENCHANTMENTS
  if (name === 'operator') return COMPARE_OPERATORS
  if (name === 'action') return RANDOMSPAWN_ACTIONS

  if (type === 'enum') {
    const fromDesc = enumOptionsFromDesc(attr.desc, attr.default)
    if (fromDesc.length) return fromDesc
  }

  if (name === 'type') {
    if (isProjectileFlightBlock(blockId)) return [...PROJECTILE_TYPES]
    if (block === 'potion' || block === 'summonareaeffectcloud' || block === 'potionclear') {
      return POTION_EFFECTS
    }
    if (block === 'entitytype' || block === 'instype') return ENTITY_TYPES
    if (block === 'hasauratype') return AURA_TYPES
    if (block === 'mobsinradius' || block === 'mobsnearorigin' || block === 'mythicmobtype') {
      return packMobIds.length ? packMobIds : ENTITY_TYPES
    }
    if (block === 'neareststructure') return STRUCTURE_TYPES
    if (block.includes('particle') || block === 'atom') return [...PARTICLE_TYPES]
    if (block === 'summon' || block === 'mount' || block === 'summonpassenger') {
      return [...new Set([...ENTITY_TYPES, ...packMobIds])]
    }
    if (block === 'weather' || block === 'setweather') return WEATHER_TYPES
    if (block === 'shoot' || block === 'volley' || block === 'arrowvolley') {
      return ['ARROW', 'SNOWBALL', 'EGG', 'ENDERPEARL', 'POTION', 'LINGERING_POTION', 'ITEM', 'BLOCK', 'TRIDENT']
    }
  }

  if (name === 'mob' && isProjectileInheritBlock(blockId)) {
    return packMobIds.length ? packMobIds : ENTITY_TYPES
  }

  if (name === 'entitytype' || name === 'mobtype') {
    return packMobIds.length ? packMobIds : ENTITY_TYPES
  }

  if (type === 'number' && attr.default) return [attr.default]

  if (attr.default) return [attr.default]

  return []
}

/** Rich options for brace value AC (supports apply / detail). */
export function optionsForAttr(
  blockId: string,
  attr: MechanicAttr,
  packSkillIds: string[],
  packMobIds: string[],
  packItemIds: string[] = [],
  packDroptableIds: string[] = [],
  braceInside = '',
  typed = '',
): AttrValueOption[] {
  const name = attr.name.toLowerCase()

  if (SLOT_ATTRS.has(name)) {
    return EQUIPMENT_SLOT_COMPLETIONS.filter((o) => matchesTyped(o.label, typed))
  }

  if (name === 'audience') {
    return audienceOptions(typed)
  }

  if (name === 'particle' || (name === 'type' && isParticleFamilyBlock(blockId))) {
    return PARTICLE_TYPES.filter((p) => matchesTyped(p, typed)).map((p) => {
      const apply = particleValueApply(p, braceInside)
      return {
        label: p,
        ...(apply ? { apply } : {}),
        ...(isDustOptionsParticle(p) ? { detail: 'requires color hex' } : {}),
      }
    })
  }

  if (HEX_COLOR_ATTRS.has(name) && usesHexParticleColor(braceInside, blockId)) {
    return PARTICLE_HEX_COLORS.filter((c) => matchesTyped(c, typed)).map((label) => ({ label }))
  }

  const values = valuesForAttr(
    blockId,
    attr,
    packSkillIds,
    packMobIds,
    packItemIds,
    packDroptableIds,
    braceInside,
  )
  return values.filter((v) => matchesTyped(v, typed)).map((label) => ({
    label,
    detail: effectiveAttrType(attr),
  }))
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

  const attr = resolveAttr(attrs, attrName, blockId)
  if (!attr) return null

  const options = optionsForAttr(
    blockId,
    attr,
    packSkillIds,
    packMobIds,
    packItemIds,
    packDroptableIds,
    inside,
    typed,
  )
  if (options.length === 0) return null

  const from = context.pos - typed.length
  const completions: Completion[] = options.map((o) => ({
    label: o.label,
    type: 'enum',
    detail: o.detail,
    ...(o.apply ? { apply: o.apply } : {}),
  }))

  return { from, options: completions, validFor: /^[^;,]*$/ }
}
