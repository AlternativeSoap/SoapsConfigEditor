import type { BodyKeyDef } from '../../core/yaml/bodyKeyDefs'
import { boolKey, listKey, mapKey, quotedKey, scalarKey } from '../../core/yaml/bodyKeyDefs'
import { ALL_OBJECTIVE_TYPES } from '../soapsquest/objectiveTypes'
import { DAMAGE_MODIFIER_TYPES, damageModifierApply } from './damageTypes'
import {
  BOSS_BAR_COLORS,
  BOSS_BAR_STYLES,
  DISPLAY_ALIGNMENTS,
  DISPLAY_BILLBOARDS,
  DISPLAY_TRANSFORMS,
  DROP_METHODS,
  EXPERIENCE_SOURCE_TYPES,
  MANNEQUIN_MAIN_HANDS,
  MANNEQUIN_MODELS,
  MANNEQUIN_POSE_STARTERS,
} from './nestedEnums'

export type NestedBlockKind = 'list-dash' | 'map'

export interface NestedBlockDef {
  parentKey: string
  kind: NestedBlockKind
  childIndent: number
  entries: BodyKeyDef[] | readonly string[]
  listApply?: (label: string) => string
  detail?: string
}

function listDashBlock(
  parentKey: string,
  entries: readonly string[],
  listApply: (label: string) => string,
  detail?: string,
  childIndent = 4,
): NestedBlockDef {
  return { parentKey, kind: 'list-dash', childIndent, entries, listApply, detail }
}

function mapBlock(parentKey: string, entries: BodyKeyDef[], childIndent = 4): NestedBlockDef {
  return { parentKey, kind: 'map', childIndent, entries }
}


export const BOSS_BAR_DEFS: BodyKeyDef[] = [
  boolKey('Enabled', true, 'Show boss bar'),
  quotedKey('Title', "Bar title (use '[name]')"),
  scalarKey('Range', 'Display range in blocks'),
  scalarKey('Color', `One of: ${BOSS_BAR_COLORS.join(', ')}`),
  scalarKey('Style', `One of: ${BOSS_BAR_STYLES.join(', ')}`),
  boolKey('CreateFog', false, 'Fog effect in range'),
  boolKey('DarkenSky', false, 'Darken sky in range'),
  boolKey('PlayMusic', false, 'Boss music in range'),
]

export const MODULES_DEFS: BodyKeyDef[] = [
  boolKey('ImmunityTable', true, 'Per-player damage cooldown'),
  boolKey('ThreatTable', true, 'Threat table module'),
]

/** @deprecated Prefer inline Disguise: string (LibsDisguises). Kept for legacy nested YAML. */
export const DISGUISE_DEFS: BodyKeyDef[] = [
  scalarKey('Type', 'player, mob, misc, etc.'),
  quotedKey('Skin', 'Player skin name'),
  quotedKey('Player', 'Player name to copy'),
  scalarKey('Mob', 'Entity type for mob disguise'),
  quotedKey('Name', 'Display name override'),
  boolKey('Invisible', false, 'Hide entity model'),
]

export const THREAT_TABLE_DEFS: BodyKeyDef[] = [
  boolKey('Enabled', true, 'Enable threat table'),
  scalarKey('Decays', 'Threat decay rate'),
  scalarKey('OverThreat', 'Over-threat multiplier'),
]

export const DISPLAY_OPTIONS_DEFS: BodyKeyDef[] = [
  scalarKey('ViewRange', 'Max view range (default 1)'),
  scalarKey('Width', 'Display width'),
  scalarKey('Height', 'Display height'),
  scalarKey('ShadowRadius', 'Shadow radius'),
  scalarKey('ShadowStrength', 'Shadow opacity'),
  scalarKey('Billboard', DISPLAY_BILLBOARDS.join(' | ')),
  scalarKey('TeleportDuration', 'Teleport duration in ticks'),
  scalarKey('InterpolationDelay', 'Interpolation delay in ticks'),
  scalarKey('InterpolationDuration', 'Interpolation duration in ticks'),
  scalarKey('ColorOverride', 'Glow color (a,r,g,b or int)'),
  scalarKey('BlockLight', 'Block light 0-15 (-1 = ambient)'),
  scalarKey('SkyLight', 'Sky light 0-15 (-1 = ambient)'),
  scalarKey('Translation', 'Offset x,y,z'),
  scalarKey('Scale', 'Scale x,y,z'),
  scalarKey('LeftRotation', 'Quaternion or euler'),
  scalarKey('RightRotation', 'Quaternion or euler'),
  scalarKey('Block', 'Block state (block_display)'),
  scalarKey('Item', 'Item id (item_display)'),
  scalarKey('Transform', DISPLAY_TRANSFORMS.join(' | ')),
  quotedKey('Text', 'Text to show (text_display)'),
  scalarKey('Opacity', 'Text opacity 0-255'),
  boolKey('DefaultBackground', false, 'Use chat background color'),
  scalarKey('BackgroundColor', 'Background color (a,r,g,b or int)'),
  scalarKey('Alignment', DISPLAY_ALIGNMENTS.join(' | ')),
  scalarKey('LineWidth', 'Max line width'),
  boolKey('Shadowed', false, 'Text shadow'),
  boolKey('SeeThrough', false, 'Visible through blocks'),
]

export const MANNEQUIN_OPTIONS_DEFS: BodyKeyDef[] = [
  boolKey('Immovable', false, 'Cannot be moved'),
  quotedKey('Description', 'Text below the name'),
  boolKey('HideDescription', false, 'Hide description'),
  scalarKey('MainHand', MANNEQUIN_MAIN_HANDS.join(' | ')),
  scalarKey('Pose', `e.g. ${MANNEQUIN_POSE_STARTERS.slice(0, 4).join(', ')}`),
  quotedKey('Player', 'Player name for skin'),
  quotedKey('Skin', 'Skin texture path'),
  quotedKey('Cape', 'Cape texture path'),
  quotedKey('Elytra', 'Elytra texture path'),
  scalarKey('Model', MANNEQUIN_MODELS.join(' | ')),
]

export const DROP_OPTIONS_ITEM_VFX_DEFS: BodyKeyDef[] = [
  scalarKey('Material', 'Default VFX material'),
  scalarKey('Model', 'Default VFX model data'),
]

export const DROP_OPTIONS_DEFS: BodyKeyDef[] = [
  scalarKey('DropMethod', DROP_METHODS.join(' | ')),
  boolKey('ShowDeathChatMessage', false),
  boolKey('ShowDeathHologram', false),
  boolKey('PerPlayerDrops', false, 'Paper only'),
  boolKey('ClientSideDrops', false),
  boolKey('Lootsplosion', false),
  boolKey('HologramItemNames', false),
  boolKey('ItemGlowByDefault', false),
  boolKey('ItemBeamByDefault', false),
  boolKey('ItemVFXByDefault', false),
  mapKey('ItemVFX', 'Default item VFX', 6),
  scalarKey('RequiredDamagePercent', 'Min damage share for drops'),
  scalarKey('HologramTimeout', 'Hologram lifetime (default 6000)'),
  { key: 'HologramMessage', detail: 'Death hologram lines', apply: 'HologramMessage:\n  - ' },
  { key: 'ChatMessage', detail: 'Death chat lines', apply: 'ChatMessage:\n  - ' },
]

export const LEVEL_MODIFIERS_DEFS: BodyKeyDef[] = [
  scalarKey('Health', 'Health per level'),
  scalarKey('Damage', 'Damage per level'),
  scalarKey('KnockbackResistance', 'Knockback resistance per level'),
  scalarKey('Power', 'Skill power per level'),
  scalarKey('Armor', 'Armor per level'),
  scalarKey('MovementSpeed', 'Movement speed per level'),
]

export const LEVELING_DEFS: BodyKeyDef[] = [
  scalarKey('MinLevel', 'Minimum level'),
  scalarKey('MaxLevel', 'Maximum level'),
  scalarKey('ExperienceCurve', 'Curve id from experience-curves.yml'),
  scalarKey('ExperienceSource', 'Source id from experience-sources.yml'),
]

export const STAT_FORMATTING_DEFS: BodyKeyDef[] = [
  scalarKey('Additive', 'Format for additive changes'),
  scalarKey('Multiply', 'Format for multiply changes'),
  scalarKey('Compound', 'Format for compound changes'),
]

export const REAGENT_BAR_STATE_DEFS: BodyKeyDef[] = [
  quotedKey('Display', 'Bar display format'),
  scalarKey('BarLength', 'Bar character count'),
  scalarKey('BarFiller', 'Filled bar character'),
  scalarKey('BarSpacer', 'Empty bar character'),
]

export const AUGMENT_FORMATTING_DEFS: BodyKeyDef[] = [
  scalarKey('Empty', 'Empty slot format'),
  scalarKey('Filled', 'Filled slot format'),
  boolKey('ShowEmptySlot', true, 'Show empty slots'),
]

export const AUGMENT_ICONS_DEFS: BodyKeyDef[] = [
  scalarKey('Empty', 'Empty socket icon'),
  scalarKey('Filled', 'Filled socket icon'),
  scalarKey('Invalid', 'Invalid socket icon'),
]

export const CRUCIBLE_UPGRADES_DEFS: BodyKeyDef[] = [
  scalarKey('DefaultLevel', 'Starting upgrade level'),
  scalarKey('MaxLevel', 'Maximum upgrade level'),
]

export const CRUCIBLE_ITEM_UPDATER_DEFS: BodyKeyDef[] = [
  scalarKey('Version', 'Item updater version'),
]

export const QUEST_CONDITION_DEFS: BodyKeyDef[] = [
  scalarKey('min-level', 'Minimum player level'),
  scalarKey('permission', 'Required permission'),
  scalarKey('cost', 'Money cost to unlock'),
  scalarKey('sigil-cost', 'Sigil cost to unlock'),
]

export const QUEST_OBJECTIVE_DEFS: BodyKeyDef[] = [
  scalarKey('type', `Objective type (${ALL_OBJECTIVE_TYPES.length} types)`),
  scalarKey('target', 'Target entity, material, or id'),
  scalarKey('amount', 'Required amount'),
  scalarKey('level', 'Required level'),
  scalarKey('command', 'Command to run'),
  scalarKey('placeholder', 'Placeholder id'),
  scalarKey('text', 'Text to type'),
  scalarKey('vehicle', 'Vehicle type'),
  scalarKey('slot', 'Equipment slot'),
  scalarKey('item', 'Item stack for delivery'),
]

export const CRUCIBLE_AUGMENT_SLOTS_DEFS: BodyKeyDef[] = [
  scalarKey('Type', 'Augment type id'),
  scalarKey('Amount', 'Socket count'),
  scalarKey('Chance', 'Roll chance'),
  scalarKey('MaxAmount', 'Max sockets'),
]

export const CRUCIBLE_AUGMENTATION_DEFS: BodyKeyDef[] = [
  scalarKey('Type', 'Augment type id'),
  scalarKey('Tooltip', 'Tooltip text'),
  listKey('Stats', 'Stat lines'),
]

export const CRUCIBLE_AUGMENT_SOCKET_DEFS: BodyKeyDef[] = [
  scalarKey('Type', 'Augment type id'),
  scalarKey('MaxSockets', 'Max socket count'),
]

export const CRUCIBLE_AUGMENT_REMOVER_DEFS: BodyKeyDef[] = [
  scalarKey('Type', 'Augment type id'),
  boolKey('DestroySocket', false, 'Destroy socket on use'),
  boolKey('ReturnAugment', true, 'Return augment item'),
]

export const CRUCIBLE_INVENTORY_DEFS: BodyKeyDef[] = [
  scalarKey('Size', 'Bag slot count'),
  quotedKey('Title', 'Bag GUI title'),
  boolKey('PreventBagNesting', true, 'Prevent bags inside bags'),
  boolKey('SaveOnItemUpdate', true, 'Keep contents on item update'),
  mapKey('AutoPickup', 'Auto pickup config', 6),
]

export const QUEST_REWARD_ITEM_DEFS: BodyKeyDef[] = [
  scalarKey('material', 'Item material'),
  scalarKey('amount', 'Stack size'),
  quotedKey('name', 'Custom item name'),
  scalarKey('chance', 'Drop chance 0-100'),
]

export const QUEST_REWARD_DEFS: BodyKeyDef[] = [
  scalarKey('xp', 'Experience reward'),
  scalarKey('money', 'Money reward'),
  scalarKey('sigils', 'Sigil reward'),
  { key: 'items', detail: 'Item rewards', apply: 'items:\n        - material: ' },
]

export const DIFFICULTY_MULTIPLIER_DEFS: BodyKeyDef[] = [
  scalarKey('objective-amount', 'Objective amount multiplier'),
  scalarKey('reward', 'Reward multiplier'),
]

export const CLASS_DISPLAY_DEFS: BodyKeyDef[] = [
  quotedKey('name', 'Class display name'),
  listKey('lore', 'Class lore lines'),
  listKey('attribute-lore', 'Attribute lore lines'),
  scalarKey('item', 'GUI material'),
]

export const CLASS_OPTIONS_DEFS: BodyKeyDef[] = [
  boolKey('default', false, 'Default class'),
  boolKey('display', true, 'Show in class list'),
  boolKey('off-combat-health-regen', true),
  boolKey('off-combat-mana-regen', true),
  boolKey('off-combat-stamina-regen', true),
  boolKey('off-combat-stellium-regen', true),
  boolKey('needs-permission', false),
]

export const CLASS_RESOURCE_DEFS: BodyKeyDef[] = [
  mapKey('health', 'Health resource', 8),
  mapKey('mana', 'Mana resource', 8),
]

export const CLASS_RESOURCE_BAR_DEFS: BodyKeyDef[] = [
  scalarKey('type', 'LINEAR or INTEGER'),
  mapKey('value', 'Resource values', 12),
  boolKey('off-combat', true, 'Regen out of combat'),
]

export const CLASS_RESOURCE_VALUE_DEFS: BodyKeyDef[] = [
  scalarKey('base', 'Base value'),
  scalarKey('per-level', 'Per-level gain'),
  scalarKey('max', 'Maximum value'),
]

export const CLASS_SKILL_BINDING_DEFS: BodyKeyDef[] = [
  scalarKey('level', 'Starting skill level'),
  scalarKey('max-level', 'Maximum skill level'),
  boolKey('unlocked-by-default', true),
  boolKey('needs-bound', false),
  scalarKey('trigger', 'TIMER, ATTACK, etc.'),
  scalarKey('timer', 'Timer interval when trigger is TIMER'),
]

export const CLASS_ATTRIBUTE_VALUE_DEFS: BodyKeyDef[] = [
  scalarKey('base', 'Base value'),
  scalarKey('per-level', 'Per-level gain'),
  scalarKey('min', 'Minimum value'),
  scalarKey('max', 'Maximum value'),
]

export const CLASS_MANA_DEFS: BodyKeyDef[] = [
  scalarKey('char', 'Mana bar character'),
  scalarKey('icon', 'Mana icon'),
  mapKey('color', 'Bar colors', 8),
  quotedKey('name', 'Mana display name'),
]

export const CLASS_MANA_COLOR_DEFS: BodyKeyDef[] = [
  scalarKey('full', 'Full bar color'),
  scalarKey('half', 'Half bar color'),
  scalarKey('empty', 'Empty bar color'),
]

export const MYTHICLIB_SKILL_BODY_DEFS: BodyKeyDef[] = [
  mapKey('parameters', 'Skill parameters', 4),
  listKey('categories', 'Skill categories'),
  quotedKey('name', 'Skill display name'),
  listKey('lore', 'Skill lore'),
  mapKey('icon', 'Icon material', 4),
  scalarKey('source', 'MythicMobs skill source id'),
  scalarKey('trigger', 'Skill trigger'),
]

export const MOB_NESTED_BLOCKS: Record<string, NestedBlockDef> = {
  DamageModifiers: listDashBlock(
    'DamageModifiers',
    DAMAGE_MODIFIER_TYPES,
    (t) => damageModifierApply(t, '1'),
    'Damage type and multiplier',
  ),
  KillMessages: listDashBlock(
    'KillMessages',
    ['<killer.name> slayed <mob.name>'],
    (t) => t,
    'Death message line',
  ),
  BossBar: mapBlock('BossBar', BOSS_BAR_DEFS),
  Modules: mapBlock('Modules', MODULES_DEFS),
  // Legacy nested Disguise maps only; prefer scalar Disguise: on the mob body.
  Disguise: mapBlock('Disguise', DISGUISE_DEFS),
  ThreatTable: mapBlock('ThreatTable', THREAT_TABLE_DEFS),
  DisplayOptions: mapBlock('DisplayOptions', DISPLAY_OPTIONS_DEFS),
  MannequinOptions: mapBlock('MannequinOptions', MANNEQUIN_OPTIONS_DEFS),
  DropOptions: mapBlock('DropOptions', DROP_OPTIONS_DEFS),
  ItemVFX: mapBlock('ItemVFX', DROP_OPTIONS_ITEM_VFX_DEFS, 6),
  LevelModifiers: mapBlock('LevelModifiers', LEVEL_MODIFIERS_DEFS),
}

export const SPELL_NESTED_BLOCKS: Record<string, NestedBlockDef> = {
  Icon: mapBlock('Icon', [scalarKey('Material', 'Icon material')], 4),
  Modifiers: mapBlock('Modifiers', [scalarKey('DAMAGE', 'Modifier block')], 4),
  Stats: mapBlock('Stats', [scalarKey('STRENGTH', 'Stat block')], 4),
  Cost: listDashBlock('Cost', ['mana 10'], (t) => t, 'Reagent cost line', 4),
}

export const ARCHETYPE_NESTED_BLOCKS: Record<string, NestedBlockDef> = {
  Leveling: mapBlock('Leveling', LEVELING_DEFS),
  Icon: mapBlock('Icon', [scalarKey('Material', 'Icon material')], 4),
  Description: listDashBlock(
    'Description',
    ['A short description line'],
    (t) => `"${t}"`,
    'Description line',
    2,
  ),
  BaseStats: listDashBlock('BaseStats', ['STRENGTH 1'], (t) => t, 'Base stat line', 2),
  StatModifiers: listDashBlock('StatModifiers', ['STRENGTH +1'], (t) => t, 'Stat modifier line', 2),
  SpellUnlocks: listDashBlock('SpellUnlocks', ['MySpell 1'], (t) => t, 'Spell unlock line', 2),
}

export const STAT_NESTED_BLOCKS: Record<string, NestedBlockDef> = {
  Formatting: mapBlock('Formatting', STAT_FORMATTING_DEFS),
}

export const ELEMENT_NESTED_BLOCKS: Record<string, NestedBlockDef> = {
  'regular-attack': mapBlock('regular-attack', [scalarKey('mythiclib-skill-id', 'Skill id')], 4),
  'crit-strike': mapBlock('crit-strike', [scalarKey('mythiclib-skill-id', 'Skill id')], 4),
}

export const REAGENT_NESTED_BLOCKS: Record<string, NestedBlockDef> = {
  ResourceBarStates: mapBlock('ResourceBarStates', [mapKey('Default', 'Default bar state', 4)], 4),
  Default: mapBlock('Default', REAGENT_BAR_STATE_DEFS, 6),
}

export const AUGMENT_NESTED_BLOCKS: Record<string, NestedBlockDef> = {
  Formatting: mapBlock('Formatting', AUGMENT_FORMATTING_DEFS),
  Icons: mapBlock('Icons', AUGMENT_ICONS_DEFS),
}

export const EXPERIENCE_SOURCE_NESTED_BLOCKS: Record<string, NestedBlockDef> = {
  Sources: mapBlock(
    'Sources',
    [
      scalarKey('Type', EXPERIENCE_SOURCE_TYPES.join(' | ')),
      scalarKey('Default', 'Default XP amount'),
      mapKey('Values', 'Entity or block values', 4),
    ],
    4,
  ),
}

export const EQUIPMENT_SET_NESTED_BLOCKS: Record<string, NestedBlockDef> = {
  Bonuses: listDashBlock('Bonuses', ['Pieces: 2'], (t) => t, 'Set bonus entry', 4),
}

export const QUEST_NESTED_BLOCKS: Record<string, NestedBlockDef> = {
  conditions: mapBlock('conditions', QUEST_CONDITION_DEFS, 6),
  objectives: mapBlock('objectives', QUEST_OBJECTIVE_DEFS, 8),
  reward: mapBlock('reward', QUEST_REWARD_DEFS, 6),
  items: mapBlock('items', QUEST_REWARD_ITEM_DEFS, 10),
}

export const DIFFICULTY_NESTED_BLOCKS: Record<string, NestedBlockDef> = {
  multiplier: mapBlock('multiplier', DIFFICULTY_MULTIPLIER_DEFS, 6),
}

export const CLASS_NESTED_BLOCKS: Record<string, NestedBlockDef> = {
  display: mapBlock('display', CLASS_DISPLAY_DEFS, 4),
  options: mapBlock('options', CLASS_OPTIONS_DEFS, 4),
  resource: mapBlock('resource', CLASS_RESOURCE_DEFS, 4),
  health: mapBlock('health', CLASS_RESOURCE_BAR_DEFS, 8),
  // Root `mana:` display block (indent 4). Resource `mana:` under resource: is
  // handled specially in nestedYamlCompletions via CLASS_RESOURCE_BAR_DEFS.
  mana: mapBlock('mana', CLASS_MANA_DEFS, 4),
  color: mapBlock('color', CLASS_MANA_COLOR_DEFS, 8),
  value: mapBlock('value', CLASS_RESOURCE_VALUE_DEFS, 12),
}

export const CRUCIBLE_ITEM_NESTED_BLOCKS: Record<string, NestedBlockDef> = {
  Upgrades: mapBlock('Upgrades', CRUCIBLE_UPGRADES_DEFS, 4),
  ItemUpdater: mapBlock('ItemUpdater', CRUCIBLE_ITEM_UPDATER_DEFS, 4),
  AugmentationSlots: mapBlock('AugmentationSlots', CRUCIBLE_AUGMENT_SLOTS_DEFS, 4),
  Augmentation: mapBlock('Augmentation', CRUCIBLE_AUGMENTATION_DEFS, 4),
  AugmentationSocket: mapBlock('AugmentationSocket', CRUCIBLE_AUGMENT_SOCKET_DEFS, 4),
  AugmentationRemover: mapBlock('AugmentationRemover', CRUCIBLE_AUGMENT_REMOVER_DEFS, 4),
  Inventory: mapBlock('Inventory', CRUCIBLE_INVENTORY_DEFS, 4),
  Stats: listDashBlock('Stats', ['DAMAGE 5'], (t) => t, 'Item stat line', 4),
}

export function nestedBlocksForCategory(
  category?: string,
  crucible = false,
): Record<string, NestedBlockDef> {
  switch (category) {
    case 'mobs':
      return MOB_NESTED_BLOCKS
    case 'skills':
      return SPELL_NESTED_BLOCKS
    case 'archetypes':
      return ARCHETYPE_NESTED_BLOCKS
    case 'stats':
      return STAT_NESTED_BLOCKS
    case 'elements':
      return ELEMENT_NESTED_BLOCKS
    case 'reagents':
      return REAGENT_NESTED_BLOCKS
    case 'augments':
      return AUGMENT_NESTED_BLOCKS
    case 'experience-sources':
      return EXPERIENCE_SOURCE_NESTED_BLOCKS
    case 'equipment-sets':
      return EQUIPMENT_SET_NESTED_BLOCKS
    case 'quests':
      return QUEST_NESTED_BLOCKS
    case 'difficulties':
      return DIFFICULTY_NESTED_BLOCKS
    case 'classes':
      return CLASS_NESTED_BLOCKS
    case 'items':
      return crucible ? CRUCIBLE_ITEM_NESTED_BLOCKS : {}
    default:
      return {}
  }
}

/** Prefer category blocks; fall back so parent-key completions work if classification is wrong. */
export function resolveNestedBlock(
  parentKey: string,
  category?: string,
  crucible = false,
): NestedBlockDef | null {
  const primary = nestedBlocksForCategory(category, crucible)
  if (primary[parentKey]) return primary[parentKey]

  const fallbacks: Record<string, NestedBlockDef>[] = [
    MOB_NESTED_BLOCKS,
    SPELL_NESTED_BLOCKS,
    ARCHETYPE_NESTED_BLOCKS,
    STAT_NESTED_BLOCKS,
    ELEMENT_NESTED_BLOCKS,
    REAGENT_NESTED_BLOCKS,
    AUGMENT_NESTED_BLOCKS,
    EXPERIENCE_SOURCE_NESTED_BLOCKS,
    EQUIPMENT_SET_NESTED_BLOCKS,
    QUEST_NESTED_BLOCKS,
    DIFFICULTY_NESTED_BLOCKS,
    CLASS_NESTED_BLOCKS,
  ]
  if (crucible) fallbacks.push(CRUCIBLE_ITEM_NESTED_BLOCKS)

  for (const source of fallbacks) {
    if (source[parentKey]) return source[parentKey]
  }
  return null
}

export { BOSS_BAR_COLORS, BOSS_BAR_STYLES, EXPERIENCE_SOURCE_TYPES }
