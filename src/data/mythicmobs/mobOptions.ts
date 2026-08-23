/** MythicMobs mob Options catalog (wiki: Mobs / Options). */

export type MobOptionType = 'boolean' | 'number' | 'string' | 'enum'

export type MobOptionGroup = 'universal' | 'group' | 'typeSpecific'

export interface MobOptionEntry {
  name: string
  type: MobOptionType
  values?: string[]
  default?: string
  group: MobOptionGroup
  description: string
}

function bool(
  name: string,
  description: string,
  def: string,
  group: MobOptionGroup = 'universal',
): MobOptionEntry {
  return { name, type: 'boolean', default: def, group, description }
}

function num(
  name: string,
  description: string,
  def: string,
  group: MobOptionGroup = 'universal',
): MobOptionEntry {
  return { name, type: 'number', default: def, group, description }
}

function str(
  name: string,
  description: string,
  def: string | undefined,
  group: MobOptionGroup = 'universal',
): MobOptionEntry {
  return { name, type: 'string', default: def, group, description }
}

function en(
  name: string,
  description: string,
  values: string[],
  def: string,
  group: MobOptionGroup = 'universal',
): MobOptionEntry {
  return { name, type: 'enum', values, default: def, group, description }
}

const DYE_COLORS = [
  'WHITE', 'ORANGE', 'MAGENTA', 'LIGHT_BLUE', 'YELLOW', 'LIME', 'PINK', 'GRAY',
  'LIGHT_GRAY', 'CYAN', 'PURPLE', 'BLUE', 'BROWN', 'GREEN', 'RED', 'BLACK',
]

/** Full Options catalog used by New mob picker and YAML autocomplete. */
export const MOB_OPTIONS: MobOptionEntry[] = [
  // Universal
  bool('AlwaysShowName', 'Whether the name tag is always displayed.', 'false'),
  num('AttackSpeed', 'Attack speed of the mob.', '1'),
  bool('VisibleByDefault', 'Whether the mob is visible by default when it spawns or loads.', 'true'),
  bool('Invisible', 'Applies permanent invisibility without a potion.', 'false'),
  bool('Collidable', 'Whether the mob has collisions.', 'true'),
  bool('DigOutOfGround', 'Teleports the mob up if it takes suffocation damage.', 'false'),
  en(
    'Despawn',
    'How the mob despawns (NORMAL, CHUNK, NEVER, PERSISTENT, NPC).',
    ['true', 'false', 'NORMAL', 'CHUNK', 'NEVER', 'PERSISTENT', 'NPC'],
    'true',
  ),
  num('FollowRange', 'Range in blocks for targeting or tracking.', '32'),
  bool('Glowing', 'Whether the mob permanently glows.', 'false'),
  bool('HealOnReload', 'Heal non-despawning mobs when their chunk reloads.', 'false'),
  bool('Invincible', 'Immune to all damage (cannot be changed by skill commands).', 'false'),
  bool('Interactable', 'Whether players can interact with the mob.', 'false'),
  bool('LockPitch', 'Prevents the mob head from looking up or down.', 'false'),
  num('KnockbackResistance', 'Knockback resistance from 0 to 1.', '0'),
  num('MaxCombatDistance', 'Players farther than this cannot damage the mob.', '256'),
  num('MovementSpeed', 'Movement speed (vanilla default is often around 0.2).', '0.2'),
  bool('NoAI', 'Disables AI and prevents skill casting.', 'false'),
  num('NoDamageTicks', 'Invulnerability ticks after taking damage.', '10'),
  bool('NoGravity', 'Disables gravity (velocity mechanic will not work).', 'false'),
  bool('PassthroughDamage', 'Redirect damage to the summoning parent.', 'false'),
  bool('PreventItemPickup', 'Prevent picking up items.', 'true'),
  bool('PreventLeashing', 'Prevent leashing.', 'true'),
  bool('PreventMobKillDrops', 'Prevent the mob kill target from dropping loot.', 'false'),
  bool('PreventOtherDrops', 'Prevent vanilla loot table drops.', 'false'),
  bool('PreventRandomEquipment', 'Prevent spawning with random equipment.', 'false'),
  bool('PreventRenaming', 'Prevent nametag renaming.', 'true'),
  bool('PreventSunburn', 'Prevent burning in sunlight.', 'false'),
  bool('PreventTransformation', 'Prevent conversion into other entity types.', 'true'),
  bool('PreventVanillaDamage', 'Cancel vanilla melee damage from this mob (skills still run).', 'false'),
  bool('RepeatAllSkills', 'Repeat HP-threshold skills if the mob heals above the threshold.', 'false'),
  num('ReviveHealth', 'Health after a cancelled death (-1 = max health).', '-1'),
  num('Scale', 'Entity scale (-1 ignores this option).', '-1'),
  bool('ShowHealth', 'Broadcast health messages when damaged.', 'false'),
  bool('Silent', 'Suppress vanilla sound effects.', 'false'),
  bool('UseThreatTable', 'Enable threat tables for this mob.', 'false'),
  bool('RandomizeProperties', 'Allow vanilla spawn randomization (equipment, baby, jockey, etc.).', 'true'),

  // Breedable / age
  num('Age', 'Age value (-1 baby, 1 adult). Breedable mobs.', '1', 'group'),
  bool('AgeLock', 'Lock age so babies do not grow.', 'false', 'group'),
  bool('Adult', 'Force adult status when Age does not apply.', 'true', 'group'),
  bool('Baby', 'Force baby status when Age does not apply.', 'false', 'group'),

  // Colorable
  en('Color', 'Wool or collar color for colorable mobs.', DYE_COLORS, 'WHITE', 'group'),

  // Neutral / angry
  bool('Angry', 'Start angry (wolves, zombified piglins, etc.).', 'false', 'group'),

  // Slime / magma
  bool('PreventSlimeSplit', 'Prevent slime or magma cube splitting.', 'false', 'typeSpecific'),
  num('Size', 'Slime, magma cube, or phantom size.', '1', 'typeSpecific'),

  // Raiders
  bool('CanJoinRaid', 'Whether this raider can join raids.', 'true', 'typeSpecific'),
  bool('PatrolLeader', 'Mark as patrol leader.', 'false', 'typeSpecific'),
  bool('PatrolSpawnPoint', 'Use as patrol spawn point.', 'false', 'typeSpecific'),

  // Tameable
  bool('Tameable', 'Allow taming where supported.', 'false', 'group'),
  bool('Tamed', 'Spawn already tamed.', 'false', 'group'),
  en('CollarColor', 'Collar color for wolves and cats.', DYE_COLORS, 'RED', 'typeSpecific'),

  // Zombie / drowned / hoglin
  bool('PreventJockeyMounts', 'Prevent jockey mounting behavior.', 'false', 'typeSpecific'),
  bool('PreventConversion', 'Prevent drowned or hoglin conversion.', 'false', 'typeSpecific'),
  num('ReinforcementsChance', 'Chance to call zombie reinforcements (0-1).', '0', 'typeSpecific'),

  // Armor stand
  bool('CanMove', 'Armor stand can be moved.', 'false', 'typeSpecific'),
  bool('CanTick', 'Armor stand ticks.', 'true', 'typeSpecific'),
  bool('HasArms', 'Armor stand shows arms.', 'false', 'typeSpecific'),
  bool('HasBasePlate', 'Armor stand has a base plate.', 'true', 'typeSpecific'),
  bool('HasGravity', 'Armor stand has gravity.', 'true', 'typeSpecific'),
  bool('Marker', 'Armor stand marker mode.', 'false', 'typeSpecific'),
  bool('Small', 'Small armor stand.', 'false', 'typeSpecific'),
  str('Pose', 'Armor stand pose string.', undefined, 'typeSpecific'),
  str('ItemHead', 'Armor stand head item.', undefined, 'typeSpecific'),
  str('ItemBody', 'Armor stand chest item.', undefined, 'typeSpecific'),
  str('ItemLegs', 'Armor stand legs item.', undefined, 'typeSpecific'),
  str('ItemFeet', 'Armor stand feet item.', undefined, 'typeSpecific'),
  str('ItemHand', 'Armor stand main hand item.', undefined, 'typeSpecific'),
  str('ItemOffhand', 'Armor stand offhand item.', undefined, 'typeSpecific'),

  // Bee
  num('Anger', 'Bee anger ticks.', '0', 'typeSpecific'),
  bool('HasNectar', 'Bee has nectar.', 'false', 'typeSpecific'),
  bool('HasStung', 'Bee has already stung.', 'false', 'typeSpecific'),
  bool('PreventStingerLoss', 'Prevent bee stinger loss.', 'false', 'typeSpecific'),

  // Horse / pig
  bool('Saddled', 'Spawn with a saddle.', 'false', 'typeSpecific'),
  en(
    'HorseColor',
    'Horse base color.',
    ['WHITE', 'CREAMY', 'CHESTNUT', 'BROWN', 'BLACK', 'GRAY', 'DARK_BROWN'],
    'BROWN',
    'typeSpecific',
  ),
  en(
    'HorseStyle',
    'Horse style.',
    ['NONE', 'WHITE', 'WHITEFIELD', 'WHITE_DOTS', 'BLACK_DOTS'],
    'NONE',
    'typeSpecific',
  ),

  // Cat / fox / parrot / frog / axolotl variants
  str('CatType', 'Cat variant.', undefined, 'typeSpecific'),
  str('Variant', 'Entity variant (parrot, axolotl, frog, etc.).', undefined, 'typeSpecific'),
  bool('Jockey', 'Spawn as a chicken jockey style mount pair where supported.', 'false', 'typeSpecific'),

  // Creeper
  num('ExplosionRadius', 'Creeper explosion radius.', '3', 'typeSpecific'),
  bool('FuseTicks', 'Creeper fuse length in ticks (legacy name used in some packs).', 'false', 'typeSpecific'),
  num('Fuse', 'Creeper fuse ticks.', '30', 'typeSpecific'),
  bool('Powered', 'Charged creeper.', 'false', 'typeSpecific'),
  bool('PreventSuicide', 'Prevent creeper self-detonation death.', 'false', 'typeSpecific'),

  // Villager
  en(
    'Profession',
    'Villager profession.',
    [
      'NONE', 'ARMORER', 'BUTCHER', 'CARTOGRAPHER', 'CLERIC', 'FARMER', 'FISHERMAN',
      'FLETCHER', 'LEATHERWORKER', 'LIBRARIAN', 'MASON', 'NITWIT', 'SHEPHERD', 'TOOLSMITH', 'WEAPONSMITH',
    ],
    'NONE',
    'typeSpecific',
  ),
  en(
    'VillagerType',
    'Villager biome type (Options Type for villagers).',
    ['DESERT', 'JUNGLE', 'PLAINS', 'SAVANNA', 'SNOW', 'SWAMP', 'TAIGA'],
    'PLAINS',
    'typeSpecific',
  ),
  num('Level', 'Villager profession level.', '1', 'typeSpecific'),

  // Boat
  en(
    'BoatType',
    'Boat wood type.',
    ['OAK', 'SPRUCE', 'BIRCH', 'JUNGLE', 'ACACIA', 'DARK_OAK', 'MANGROVE', 'CHERRY', 'BAMBOO'],
    'OAK',
    'typeSpecific',
  ),

  // Sheep
  bool('Sheared', 'Spawn sheep already sheared.', 'false', 'typeSpecific'),

  // Snowman
  bool('Derp', 'Snow golem derp mode (no pumpkin).', 'false', 'typeSpecific'),

  // Enderman
  bool('PreventTeleport', 'Prevent enderman teleporting.', 'false', 'typeSpecific'),

  // Phantom
  num('PhantomSize', 'Phantom size (alias of Size for phantoms).', '1', 'typeSpecific'),
]

const byName = new Map(MOB_OPTIONS.map((entry) => [entry.name.toLowerCase(), entry]))

export const MOB_OPTION_NAMES: string[] = MOB_OPTIONS.map((entry) => entry.name)

export function mobOptionByName(name: string): MobOptionEntry | undefined {
  return byName.get(name.toLowerCase())
}

/** Format an option value for YAML emission. */
export function formatMobOptionValue(entry: MobOptionEntry, value: string | number | boolean): string {
  if (entry.type === 'boolean') {
    return value === true || value === 'true' ? 'true' : 'false'
  }
  if (entry.type === 'number') {
    const n = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(n) ? String(n) : String(entry.default ?? value)
  }
  return String(value)
}
