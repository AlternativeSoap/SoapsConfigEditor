export type ThemeMode = 'light' | 'dark'

export interface AcPrefs {
  /** Master switch — disables all MythicMobs autocomplete */
  enabled: boolean
  /** Suggest mechanics after "  - " on a skill line */
  mechanics: boolean
  /** Suggest @targeters */
  targeters: boolean
  /** Suggest ~triggers */
  triggers: boolean
  /** Suggest conditions */
  conditions: boolean
  /** Suggest pack skill/mob/item IDs */
  packIds: boolean
  /** Activate on every keystroke (false = only on Ctrl+Space) */
  activateOnTyping: boolean
}

export type WorkspaceKind =
  | 'mythicmobs'
  | 'mmocore'
  | 'mmoitems'
  | 'soapsquest'
  | 'soapstraits'

export type MythicCategory =
  | 'mobs'
  | 'items'
  | 'skills'
  | 'droptables'
  | 'randomspawns'
  | 'menus'
  | 'classes'
  | 'exp-curves'
  | 'gui'
  | 'archetypes'
  | 'reagents'
  | 'quests'
  | 'equipment-sets'
  | 'augments'
  | 'other'

export type SessionMode = 'opened' | 'new-pack'

export interface FileRecord {
  path: string
  name: string
  pack: string
  category: MythicCategory
  content: string
  ids: string[]
}

export interface ParseIssue {
  message: string
  line?: number
  column?: number
}

export interface ParseResult {
  data: unknown
  issues: ParseIssue[]
}

export interface FileIndex {
  byPath: Map<string, FileRecord>
  idToPath: Map<string, string>
}

export type ValidationIssueType =
  | 'missing_skill_reference'
  | 'missing_droptable_reference'
  | 'missing_spawn_mob_reference'
  | 'missing_equipment_set_reference'
  | 'missing_augment_type_reference'

export interface ValidationIssue {
  type: ValidationIssueType
  filePath: string
  /** Mob / spawn / entity that holds the bad reference */
  entityId: string
  /** Missing skill, droptable, mob, set, or augment ID */
  missingId: string
}

export interface PackIndex {
  mobIds: string[]
  itemIds: string[]
  skillIds: string[]
  droptableIds: string[]
  reagentIds: string[]
  archetypeIds: string[]
  equipmentSetIds: string[]
  augmentTypeIds: string[]
}

export type CreateKind =
  | 'mob'
  | 'item'
  | 'skill'
  | 'droptable'
  | 'randomspawn'
  | 'class'
  | 'mmocore-skill'
  | 'elements'
  | 'skill-casting'
  | 'spell'
  | 'archetype'
  | 'reagent'
  | 'quest'
  | 'equipment-set'
  | 'augment-type'
  | 'crucible-item'
  | 'bag'

/** Shared skill modifier used by MMOCore class skills + MythicLib parameters. */
export interface SkillModifierValues {
  base: number
  perLevel: number
  min?: number
  max?: number
  decimalFormat?: string
}

export interface ClassAttributeEntry {
  id: string
  base: number
  perLevel: number
  min?: number
  max?: number
  showInLore: boolean
  labelOverride?: string
}

export interface ClassSkillBinding {
  id: string
  displayName: string
  level: number
  maxLevel: number
  unlockedByDefault: boolean
  needsBound: boolean
  /** MMOCore passive trigger. Empty means active skill. */
  trigger: string
  /** Period when trigger is TIMER */
  timer?: number
  mana: SkillModifierValues
  cooldown: SkillModifierValues
  modifiers: Record<string, SkillModifierValues>
  /** Created in this wizard run. Also write MythicLib + MythicMobs. */
  isNew?: boolean
  categories?: string[]
  icon?: string
  iconCustomModelData?: number
  lore?: string[]
  mythicLibTrigger?: string
  damageTypes?: string[]
  damageElement?: string
  itemScaling?: number
}

export interface SkillBuffEntry {
  modifier: string
  amount: number
  type: 'FLAT' | 'RELATIVE'
}

export interface ClassSkillSlot {
  index: number
  name: string
  lore: string[]
  unlockedByDefault: boolean
  canManuallyBind: boolean
  formula: string
  hardset: string
  buffs: SkillBuffEntry[]
  autoLoreFromBuffs: boolean
}

export type AttributeLoreMode = 'auto' | 'custom' | 'auto-pinned'

export interface ClassGeneratorInput {
  id: string
  displayName: string
  lore: string[]
  item: string
  customModelData?: number
  maxLevel: number
  expCurve: string
  expTable: string
  skillTrees: string[]
  createExpCurveIfMissing: boolean
  options: {
    default: boolean
    display: boolean
    needsPermission: boolean
    offCombatHealthRegen: boolean
    offCombatManaRegen: boolean
    offCombatStaminaRegen: boolean
    offCombatStelliumRegen: boolean
  }
  levelUpTriggers: {
    skillPoints: boolean
    classPoints: boolean
    attributePoints: boolean
  }
  mainExpSources: string[]
  resource: {
    health: { type: string; base: number; perLevel: number; max: number; offCombat: boolean }
    mana: { type: string; base: number; perLevel: number; max: number; offCombat: boolean }
  }
  mana: {
    char: string
    icon: string
    name: string
    colorFull: string
    colorHalf: string
    colorEmpty: string
  }
  castParticle: {
    enabled: boolean
    particle: string
    red: number
    green: number
    blue: number
    size?: number
    material?: string
  }
  /** Class-specific combo → slot map. Empty omits key-combos from YAML. */
  keyCombos: Record<string, string[]>
  themeColor: string
  attributes: ClassAttributeEntry[]
  skills: ClassSkillBinding[]
  includeAttackSkills: boolean
  attackSkillPrefix: string
  /** Upsert MythicLib/elements.yml when including attack skills */
  syncElementRow: boolean
  slots: ClassSkillSlot[]
  attributeLoreMode: AttributeLoreMode
  attributeLore: string[]
  pinnedLoreLines: string[]
  includeAttackSkillsInLore: boolean
}

export interface SavePrefs {
  autoSave: boolean
  /** Interval in seconds */
  autoSaveInterval: number
  backupFolder: string
  autoBackup: boolean
  /** 'every-save' | number of saves between backups */
  backupEvery: 'every-save' | 1 | 5 | 10
}

export const DEFAULT_SAVE_PREFS: SavePrefs = {
  autoSave: false,
  autoSaveInterval: 30,
  backupFolder: '',
  autoBackup: false,
  backupEvery: 5,
}

export interface SessionLogEntry {
  path: string
  name: string
  savedAt: number
}

export interface MobGeneratorInput {
  id: string
  type: string
  display: string
  health: number
  damage: number
  skills: string
  drops: string
  equipment: Record<string, string>
  /** Options keys the user added; only these are written to YAML. */
  options: Record<string, string | number | boolean>
  faction: string
  armor: number | ''
  /** Multiline AIGoalSelectors (one per line). */
  aiGoalSelectors: string
  /** Multiline AITargetSelectors (one per line). */
  aiTargetSelectors: string
}

export interface ItemGeneratorInput {
  id: string
  material: string
  display: string
  lore: string
  rarity: string
}

export interface SkillGeneratorInput {
  id: string
  cooldown: number
  conditions: string
  skills: string
}

export interface DropEntry {
  type: 'item' | 'mythicitem' | 'exp' | 'money' | 'command' | 'droptable'
  value: string
  chance: number
  minAmount: number
  maxAmount: number
}

export interface DroptableGeneratorInput {
  id: string
  drops: DropEntry[]
}

export interface RandomSpawnGeneratorInput {
  id: string
  action: 'ADD' | 'REPLACE' | 'DENY'
  mobType: string
  level: string
  chance: number
  worlds: string
  biomes: string
  conditions: string
}

/** MythicRPG spell casting presets used by the spell wizard. */
export type SpellCastingMode = 'bound' | 'click_combo' | 'passive'

export interface SpellGeneratorInput {
  id: string
  display: string
  description: string
  iconMaterial: string
  castingMode: SpellCastingMode
  clickCombo: string
  cooldown: number
  upgrades: number
  costReagent: string
  costAmount: number
  modifierKey: string
  modifierBase: number
  modifierPerLevel: number
  skills: string
  targeter: string
  bindable: boolean
  global: boolean
  /** Passive spell Stats block (optional). */
  passiveStatKey?: string
  passiveStatBase?: number
  passiveStatPerLevel?: number
  passiveStatMax?: number
}

export interface ArchetypeGeneratorInput {
  id: string
  display: string
  group: 'CLASS' | 'PROFESSION'
  description: string
  iconMaterial: string
  minLevel: number
  maxLevel: number
  experienceCurve: string
  experienceSource: string
  /** Newline or comma separated spell unlock lines. */
  spellUnlocks: string
  /** Single BaseStats line, e.g. MAX_HEALTH 18 or MAX_MANA '50 + 5*L' */
  baseStatLine: string
  /** Single StatModifiers line, e.g. MAX_HEALTH 1 */
  statModifierLine: string
}

export interface ReagentGeneratorInput {
  id: string
  display: string
  global: boolean
  minValue: string
  maxValue: string
  scaleWithMaxMana: boolean
  includeResourceBar: boolean
  writeMaxManaStat: boolean
  maxManaBase: number
}

/** Crucible equipment set bonus threshold. */
export interface EquipmentSetBonusInput {
  pieces: number
  stats: string
  skills: string
}

export interface EquipmentSetGeneratorInput {
  id: string
  display: string
  enabled: boolean
  lore: string
  bonuses: EquipmentSetBonusInput[]
}

export interface AugmentTypeGeneratorInput {
  id: string
  display: string
  enabled: boolean
  emptyFormat: string
  filledFormat: string
  showEmptySlot: boolean
  iconEmpty: string
  iconFilled: string
  iconInvalid: string
}

export type CrucibleItemKind = 'ITEM' | 'BAG' | 'HAT'
export type CrucibleItemRole = 'standard' | 'gem' | 'socket' | 'remover'

export interface CrucibleItemGeneratorInput {
  id: string
  material: string
  display: string
  group: string
  itemKind: CrucibleItemKind
  role: CrucibleItemRole
  lore: string
  loreTemplate: string
  /** Newline-separated STAT value MODIFIER lines */
  stats: string
  equipmentSet: string
  skills: string
  optionsCancelDamage: boolean
  optionsKeepOnDeath: boolean
  optionsPreventDropping: boolean
  optionsPlaceable: boolean
  optionsPreventEnchanting: boolean
  optionsPreventStacking: boolean
  optionsRepairable: boolean
  itemUpdaterVersion: number
  maxDurability: string
  durability: string
  defaultLevel: string
  maxLevel: string
  /** Single slot type, or empty */
  augmentSlotType: string
  augmentSlotAmount: string
  augmentSlotChance: string
  augmentSlotMaxAmount: string
  /** Gem / socket / remover type id */
  augmentType: string
  augmentTooltip: string
  augmentRemoverDestroySocket: boolean
  augmentRemoverReturnAugment: boolean
  augmentSocketMaxSockets: number
  bagSize: number
  bagTitle: string
  bagPreventNesting: boolean
  bagSaveOnUpdate: boolean
  bagAutoPickup: boolean
  recipeType: '' | 'SHAPED' | 'SHAPELESS'
  recipeIngredients: string
}


