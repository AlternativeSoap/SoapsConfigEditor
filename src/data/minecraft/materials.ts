import { COMMON_MATERIALS } from '../mmocore/materials'

const COLORS = [
  'WHITE',
  'ORANGE',
  'MAGENTA',
  'LIGHT_BLUE',
  'YELLOW',
  'LIME',
  'PINK',
  'GRAY',
  'LIGHT_GRAY',
  'CYAN',
  'PURPLE',
  'BLUE',
  'BROWN',
  'GREEN',
  'RED',
  'BLACK',
] as const

const WOOD = [
  'OAK',
  'SPRUCE',
  'BIRCH',
  'JUNGLE',
  'ACACIA',
  'DARK_OAK',
  'MANGROVE',
  'CHERRY',
  'BAMBOO',
  'CRIMSON',
  'WARPED',
] as const

const TOOL_TIERS = [
  'WOODEN',
  'STONE',
  'IRON',
  'GOLDEN',
  'DIAMOND',
  'NETHERITE',
  'COPPER',
] as const

const TOOL_PARTS = ['SWORD', 'PICKAXE', 'AXE', 'SHOVEL', 'HOE'] as const
const ARMOR_PARTS = ['HELMET', 'CHESTPLATE', 'LEGGINGS', 'BOOTS'] as const

function buildMaterialList(): string[] {
  const set = new Set<string>(COMMON_MATERIALS)

  const extras = [
    'PAPER',
    'BOOK',
    'WRITABLE_BOOK',
    'WRITTEN_BOOK',
    'MAP',
    'FILLED_MAP',
    'COMPASS',
    'CLOCK',
    'LEAD',
    'NAME_TAG',
    'SADDLE',
    'BUCKET',
    'WATER_BUCKET',
    'LAVA_BUCKET',
    'MILK_BUCKET',
    'POWDER_SNOW_BUCKET',
    'AXOLOTL_BUCKET',
    'TADPOLE_BUCKET',
    'COD_BUCKET',
    'SALMON_BUCKET',
    'TROPICAL_FISH_BUCKET',
    'PUFFERFISH_BUCKET',
    'ROTTEN_FLESH',
    'BONE',
    'STRING',
    'FEATHER',
    'GUNPOWDER',
    'WHEAT',
    'WHEAT_SEEDS',
    'BEETROOT',
    'BEETROOT_SEEDS',
    'CARROT',
    'POTATO',
    'POISONOUS_POTATO',
    'MELON_SLICE',
    'MELON_SEEDS',
    'PUMPKIN_SEEDS',
    'SWEET_BERRIES',
    'GLOW_BERRIES',
    'APPLE',
    'GOLDEN_APPLE',
    'ENCHANTED_GOLDEN_APPLE',
    'BREAD',
    'COOKED_BEEF',
    'COOKED_PORKCHOP',
    'COOKED_CHICKEN',
    'COOKED_MUTTON',
    'COOKED_RABBIT',
    'COOKED_COD',
    'COOKED_SALMON',
    'RAW_BEEF',
    'RAW_PORKCHOP',
    'RAW_CHICKEN',
    'RAW_MUTTON',
    'RAW_RABBIT',
    'COD',
    'SALMON',
    'TROPICAL_FISH',
    'PUFFERFISH',
    'COAL',
    'CHARCOAL',
    'IRON_INGOT',
    'GOLD_INGOT',
    'COPPER_INGOT',
    'NETHERITE_INGOT',
    'NETHERITE_SCRAP',
    'DIAMOND',
    'EMERALD',
    'LAPIS_LAZULI',
    'QUARTZ',
    'AMETHYST_SHARD',
    'FLINT',
    'CLAY_BALL',
    'BRICK',
    'NETHER_BRICK',
    'PRISMARINE_SHARD',
    'PRISMARINE_CRYSTALS',
    'NAUTILUS_SHELL',
    'HEART_OF_THE_SEA',
    'SCUTE',
    'TURTLE_SCUTE',
    'RABBIT_HIDE',
    'RABBIT_FOOT',
    'BLAZE_ROD',
    'BLAZE_POWDER',
    'MAGMA_CREAM',
    'GHAST_TEAR',
    'ENDER_PEARL',
    'ENDER_EYE',
    'SHULKER_SHELL',
    'PHANTOM_MEMBRANE',
    'ECHO_SHARD',
    'DRAGON_BREATH',
    'TOTEM_OF_UNDYING',
    'NETHER_STAR',
    'EXPERIENCE_BOTTLE',
    'FIREWORK_ROCKET',
    'FIREWORK_STAR',
    'FIRE_CHARGE',
    'ELYTRA',
    'TRIDENT',
    'CROSSBOW',
    'BOW',
    'SHIELD',
    'FISHING_ROD',
    'CARROT_ON_A_STICK',
    'WARPED_FUNGUS_ON_A_STICK',
    'FLINT_AND_STEEL',
    'SHEARS',
    'BRUSH',
    'SPYGLASS',
    'GOAT_HORN',
    'RECOVERY_COMPASS',
    'BUNDLE',
    'MINECART',
    'CHEST_MINECART',
    'FURNACE_MINECART',
    'TNT_MINECART',
    'HOPPER_MINECART',
    'OAK_BOAT',
    'OAK_CHEST_BOAT',
    'RAIL',
    'POWERED_RAIL',
    'DETECTOR_RAIL',
    'ACTIVATOR_RAIL',
    'COMMAND_BLOCK',
    'KNOWLEDGE_BOOK',
    'VILLAGER_SPAWN_EGG',
    'ZOMBIE_SPAWN_EGG',
    'SKELETON_SPAWN_EGG',
    'CREEPER_SPAWN_EGG',
    'SPAWNER',
    'ANVIL',
    'CHIPPED_ANVIL',
    'DAMAGED_ANVIL',
    'SMITHING_TABLE',
    'CRAFTING_TABLE',
    'FURNACE',
    'BLAST_FURNACE',
    'SMOKER',
    'BREWING_STAND',
    'ENCHANTING_TABLE',
    'GRINDSTONE',
    'STONECUTTER',
    'LOOM',
    'CARTOGRAPHY_TABLE',
    'FLETCHING_TABLE',
    'COMPOSTER',
    'BARREL',
    'CHEST',
    'TRAPPED_CHEST',
    'ENDER_CHEST',
    'SHULKER_BOX',
    'BEACON',
    'CONDUIT',
    'RESPAWN_ANCHOR',
    'LODESTONE',
    'NETHER_PORTAL',
    'GRASS_BLOCK',
    'DIRT',
    'COARSE_DIRT',
    'PODZOL',
    'ROOTED_DIRT',
    'MUD',
    'CLAY',
    'SAND',
    'RED_SAND',
    'GRAVEL',
    'STONE',
    'COBBLESTONE',
    'MOSSY_COBBLESTONE',
    'DEEPSLATE',
    'COBBLED_DEEPSLATE',
    'COAL_ORE',
    'IRON_ORE',
    'GOLD_ORE',
    'DIAMOND_ORE',
    'EMERALD_ORE',
    'LAPIS_ORE',
    'REDSTONE_ORE',
    'COPPER_ORE',
    'NETHER_GOLD_ORE',
    'ANCIENT_DEBRIS',
    'OBSIDIAN',
    'CRYING_OBSIDIAN',
    'NETHERRACK',
    'SOUL_SAND',
    'SOUL_SOIL',
    'BASALT',
    'BLACKSTONE',
    'GLOWSTONE',
    'SEA_LANTERN',
    'TORCH',
    'LANTERN',
    'SOUL_TORCH',
    'SOUL_LANTERN',
    'CAMPFIRE',
    'SOUL_CAMPFIRE',
    'GLASS',
    'TINTED_GLASS',
    'ICE',
    'PACKED_ICE',
    'BLUE_ICE',
    'SNOW_BLOCK',
    'SNOWBALL',
    'POWDER_SNOW',
    'SLIME_BLOCK',
    'HONEY_BLOCK',
    'HAY_BLOCK',
    'SPONGE',
    'WET_SPONGE',
    'TNT',
    'BEDROCK',
    'BARRIER',
    'STRUCTURE_VOID',
    'DRAGON_EGG',
    'END_STONE',
    'PURPUR_BLOCK',
    'PRISMARINE',
    'DARK_PRISMARINE',
    'SPONGE',
    'SCULK',
    'SCULK_CATALYST',
    'SCULK_SHRIEKER',
    'SCULK_SENSOR',
    'CALCITE',
    'TUFF',
    'DRIPSTONE_BLOCK',
    'POINTED_DRIPSTONE',
    'AMETHYST_BLOCK',
    'BUDDING_AMETHYST',
    'MOSS_BLOCK',
    'AZALEA',
    'FLOWERING_AZALEA',
    'BIG_DRIPLEAF',
    'SMALL_DRIPLEAF',
    'SPORE_BLOSSOM',
    'GLOW_LICHEN',
    'HANGING_ROOTS',
    'ROOTED_DIRT',
    'MANGROVE_ROOTS',
    'MUDDY_MANGROVE_ROOTS',
    'FROGSPAWN',
    'TADPOLE_BUCKET',
    'CHORUS_FRUIT',
    'CHORUS_FLOWER',
    'POPPED_CHORUS_FRUIT',
    'BEETROOT_SOUP',
    'MUSHROOM_STEW',
    'RABBIT_STEW',
    'SUSPICIOUS_STEW',
    'POTION',
    'SPLASH_POTION',
    'LINGERING_POTION',
    'TIPPED_ARROW',
    'ARROW',
    'SPECTRAL_ARROW',
    'SUGAR',
    'PAPER',
    'BOOK',
    'LEATHER',
    'RABBIT_FOOT',
    'GLISTERING_MELON_SLICE',
    'GOLDEN_CARROT',
    'FERMENTED_SPIDER_EYE',
    'SPIDER_EYE',
    'BLAZE_POWDER',
    'MAGMA_CREAM',
    'BREWING_STAND',
    'CAULDRON',
    'WATER_CAULDRON',
    'LAVA_CAULDRON',
    'POWDER_SNOW_CAULDRON',
    'DIAMOND_BLOCK',
    'GOLD_BLOCK',
    'IRON_BLOCK',
    'EMERALD_BLOCK',
    'LAPIS_BLOCK',
    'REDSTONE_BLOCK',
    'COAL_BLOCK',
    'COPPER_BLOCK',
    'NETHERITE_BLOCK',
    'RAW_IRON_BLOCK',
    'RAW_GOLD_BLOCK',
    'RAW_COPPER_BLOCK',
  ]

  for (const m of extras) set.add(m)

  for (const tier of TOOL_TIERS) {
    for (const part of TOOL_PARTS) set.add(`${tier}_${part}`)
    for (const part of ARMOR_PARTS) {
      if (tier === 'WOODEN' && part !== 'HELMET') continue
      if (tier === 'STONE' && part !== 'HELMET') continue
      set.add(`${tier}_${part}`)
    }
  }
  set.add('LEATHER_HELMET')
  set.add('LEATHER_CHESTPLATE')
  set.add('LEATHER_LEGGINGS')
  set.add('LEATHER_BOOTS')
  set.add('CHAINMAIL_HELMET')
  set.add('CHAINMAIL_CHESTPLATE')
  set.add('CHAINMAIL_LEGGINGS')
  set.add('CHAINMAIL_BOOTS')

  for (const wood of WOOD) {
    set.add(`${wood}_LOG`)
    set.add(`${wood}_WOOD`)
    set.add(`STRIPPED_${wood}_LOG`)
    set.add(`STRIPPED_${wood}_WOOD`)
    set.add(`${wood}_PLANKS`)
    set.add(`${wood}_SLAB`)
    set.add(`${wood}_STAIRS`)
    set.add(`${wood}_FENCE`)
    set.add(`${wood}_FENCE_GATE`)
    set.add(`${wood}_DOOR`)
    set.add(`${wood}_TRAPDOOR`)
    set.add(`${wood}_BUTTON`)
    set.add(`${wood}_PRESSURE_PLATE`)
    set.add(`${wood}_SIGN`)
    set.add(`${wood}_HANGING_SIGN`)
    set.add(`${wood}_LEAVES`)
    set.add(`${wood}_SAPLING`)
    if (wood !== 'CRIMSON' && wood !== 'WARPED') {
      set.add(`${wood}_BOAT`)
      set.add(`${wood}_CHEST_BOAT`)
    }
  }

  for (const color of COLORS) {
    set.add(`${color}_WOOL`)
    set.add(`${color}_CARPET`)
    set.add(`${color}_CONCRETE`)
    set.add(`${color}_CONCRETE_POWDER`)
    set.add(`${color}_TERRACOTTA`)
    set.add(`${color}_STAINED_GLASS`)
    set.add(`${color}_STAINED_GLASS_PANE`)
    set.add(`${color}_BED`)
    set.add(`${color}_BANNER`)
    set.add(`${color}_SHULKER_BOX`)
    set.add(`${color}_CANDLE`)
    set.add(`${color}_DYE`)
    set.add(`${color}_GLAZED_TERRACOTTA`)
  }

  return [...set].sort()
}

export const MINECRAFT_MATERIALS: readonly string[] = buildMaterialList()

/** Filter materials by substring match. Prefers names that start with the query. */
export function searchMaterials(query: string, limit = 12): string[] {
  const q = query.trim().toUpperCase().replace(/\s+/g, '_')
  if (!q) return MINECRAFT_MATERIALS.slice(0, limit)

  const starts: string[] = []
  const contains: string[] = []
  for (const material of MINECRAFT_MATERIALS) {
    if (material.startsWith(q)) starts.push(material)
    else if (material.includes(q)) contains.push(material)
    if (starts.length + contains.length >= limit * 3) break
  }

  return [...starts, ...contains].slice(0, limit)
}
