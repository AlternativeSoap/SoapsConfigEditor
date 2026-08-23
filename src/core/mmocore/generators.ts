import { formatSkillBuffLine, loreLinesFromBuffs } from '../../data/mmocore/slotBuffs'
import { yamlQuoted } from '../mythicmobs/generators'
import { mergeLoreForMode } from './loreBuilder'
import type {
  ClassGeneratorInput,
  ClassSkillBinding,
  SkillModifierValues,
} from '../../types'
import type { MMOCorePackIndex } from './indexPack'
import { defaultExpCurveContent } from '../workspaces/scaffoldPack'
import { BUILTIN_SKILL_IDS } from '../../data/mmocore/builtinSkills'

export interface MythicLibSkillInput {
  id: string
  name: string
  icon: string
  iconCustomModelData?: number
  categories: string[]
  lore: string[]
  modifiers: Record<string, SkillModifierValues>
  manaName?: string
  trigger?: string
  /** Per-modifier item scaling; falls back to mod.base */
  itemScaling?: number
}

export interface MythicMobsSkillShellOptions {
  damageTypes?: string[]
  damageElement?: string
}

export interface PreflightItem {
  level: 'error' | 'warning'
  message: string
}

function indentBlock(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  return text
    .split('\n')
    .map((line) => (line.length ? pad + line : line))
    .join('\n')
}

function formatModifierYaml(name: string, mod: SkillModifierValues, indent = 8): string {
  const pad = ' '.repeat(indent)
  const lines = [`${pad}${name}:`, `${pad}    base: ${mod.base}`, `${pad}    per-level: ${mod.perLevel}`]
  if (mod.decimalFormat) lines.push(`${pad}    decimal-format: ${yamlQuoted(mod.decimalFormat)}`)
  if (mod.min !== undefined) lines.push(`${pad}    min: ${mod.min}`)
  if (mod.max !== undefined) lines.push(`${pad}    max: ${mod.max}`)
  return lines.join('\n')
}

function formatAttributeYaml(
  id: string,
  base: number,
  perLevel: number,
  min?: number,
  max?: number,
): string {
  const lines = [`    ${id}:`, `        base: ${base}`, `        per-level: ${perLevel}`]
  if (min !== undefined) lines.push(`        min: ${min}`)
  if (max !== undefined) lines.push(`        max: ${max}`)
  return lines.join('\n')
}

function yamlList(lines: string[], indent: number): string {
  const pad = ' '.repeat(indent)
  if (lines.length === 0) return `${pad}[]`
  return lines.map((l) => `${pad}- ${yamlQuoted(l)}`).join('\n')
}

function skillBindingYaml(skill: ClassSkillBinding): string {
  const lines = [
    `    ${skill.id}:`,
    `        level: ${skill.level}`,
  ]
  if (skill.maxLevel > 0) lines.push(`        max-level: ${skill.maxLevel}`)
  lines.push(`        unlocked-by-default: ${skill.unlockedByDefault}`)
  const trigger = skill.trigger.trim().toUpperCase()
  if (trigger) {
    lines.push(`        trigger: ${trigger}`)
    if (trigger === 'TIMER') {
      const timer = skill.timer !== undefined && skill.timer > 0 ? skill.timer : 5
      lines.push(`        timer: ${timer}`)
    }
  }
  lines.push(`        needs-bound: ${skill.needsBound}`)
  for (const [key, mod] of Object.entries(skill.modifiers)) {
    lines.push(formatModifierYaml(key, mod, 8))
  }
  lines.push(formatModifierYaml('mana', skill.mana, 8))
  lines.push(formatModifierYaml('cooldown', skill.cooldown, 8))
  return lines.join('\n')
}

/** Skills written to class YAML, including optional attack stubs. */
export function resolveClassSkills(input: ClassGeneratorInput): ClassSkillBinding[] {
  let skills = [...input.skills]
  if (input.includeAttackSkills && input.attackSkillPrefix.trim()) {
    const prefix = input.attackSkillPrefix.trim().toLowerCase()
    const regular = `${prefix}_regular_attack`
    const crit = `${prefix}_critical_strike`
    if (!skills.some((s) => s.id === regular)) {
      skills = [
        {
          id: regular,
          displayName: 'Regular Attack',
          level: 1,
          maxLevel: 1,
          unlockedByDefault: true,
          needsBound: false,
          trigger: '',
          mana: { base: 0, perLevel: 0 },
          cooldown: { base: 0, perLevel: 0 },
          modifiers: {},
        },
        ...skills,
      ]
    }
    if (!skills.some((s) => s.id === crit)) {
      skills = [
        skills[0],
        {
          id: crit,
          displayName: 'Critical Strike',
          level: 1,
          maxLevel: 1,
          unlockedByDefault: true,
          needsBound: false,
          trigger: '',
          mana: { base: 0, perLevel: 0 },
          cooldown: { base: 0, perLevel: 0 },
          modifiers: {},
        },
        ...skills.slice(1),
      ]
    }
  }
  return skills
}

export function generateClassYaml(input: ClassGeneratorInput): string {
  const attributeLore = mergeLoreForMode(input)
  const loreBlock =
    input.lore.length === 0
      ? '    lore: []'
      : `    lore:\n${yamlList(input.lore, 4)}`
  const attrLoreBlock =
    attributeLore.length === 0
      ? '    attribute-lore: []'
      : `    attribute-lore:\n${yamlList(attributeLore, 4)}`

  const itemLine =
    input.customModelData !== undefined && input.customModelData > 0
      ? `    item: '${input.item}:${input.customModelData}'`
      : `    item: ${input.item}`

  const attrBlock =
    input.attributes.length === 0
      ? 'attributes: {}'
      : `attributes:\n${input.attributes
          .map((a) => formatAttributeYaml(a.id, a.base, a.perLevel, a.min, a.max))
          .join('\n')}`

  const skillTrees =
    input.skillTrees.filter(Boolean).length === 0
      ? ''
      : `skill-trees:\n${input.skillTrees.filter(Boolean).map((t) => `    - '${t}'`).join('\n')}\n`

  const triggers: string[] = []
  if (input.levelUpTriggers.skillPoints) {
    triggers.push('    - \'command{format="mmocore admin skill-points give %player% 1"}\'')
  }
  if (input.levelUpTriggers.classPoints) {
    triggers.push('    - \'command{format="mmocore admin class-points give %player% 1"}\'')
  }
  if (input.levelUpTriggers.attributePoints) {
    triggers.push('    - \'command{format="mmocore admin attribute-points give %player% 1"}\'')
  }
  const triggersBlock =
    triggers.length === 0 ? '' : `triggers:\n    level-up:\n${triggers.join('\n')}\n\n`

  const slotsBlock = input.slots
    .map((slot) => {
      const lore =
        slot.autoLoreFromBuffs && slot.buffs.length > 0
          ? loreLinesFromBuffs(slot.buffs)
          : slot.lore
      const parts = [
        `    ${slot.index}:`,
        `        name: ${yamlQuoted(slot.name)}`,
      ]
      if (lore.length > 0) {
        parts.push('        lore:')
        for (const line of lore) parts.push(`            - ${yamlQuoted(line)}`)
      }
      parts.push(`        unlocked-by-default: ${slot.unlockedByDefault}`)
      parts.push(`        can-manually-bind: ${slot.canManuallyBind}`)
      if (slot.formula.trim()) parts.push(`        formula: ${yamlQuoted(slot.formula.trim())}`)
      if (slot.hardset.trim()) parts.push(`        hardset: ${slot.hardset.trim()}`)
      if (slot.buffs.length > 0) {
        parts.push('        skill-buffs:')
        for (const b of slot.buffs) {
          parts.push(`            - '${formatSkillBuffLine(b.modifier, b.amount, b.type)}'`)
        }
      }
      return parts.join('\n')
    })
    .join('\n')

  const skills = resolveClassSkills(input)

  const skillsBlock =
    skills.length === 0
      ? 'skills: {}'
      : `skills:\n${skills.map(skillBindingYaml).join('\n\n')}`

  const expSources =
    input.mainExpSources.length === 0
      ? ''
      : `\n# Experience sources for main class experience.\nmain-exp-sources:\n${input.mainExpSources
          .map((s) => `- '${s.replace(/'/g, "''")}'`)
          .join('\n')}\n`

  const castParticle = input.castParticle
  let castBlock = ''
  if (castParticle.enabled) {
    const lines = [
      'cast-particle:',
      `    particle: ${castParticle.particle}`,
    ]
    const needsColor = /REDSTONE|DUST|DUST_COLOR_TRANSITION/i.test(castParticle.particle)
    if (needsColor) {
      lines.push('    color:')
      lines.push(`        red: ${castParticle.red}`)
      lines.push(`        green: ${castParticle.green}`)
      lines.push(`        blue: ${castParticle.blue}`)
      if (castParticle.size !== undefined) lines.push(`    size: ${castParticle.size}`)
    }
    const needsMaterial = /BLOCK|FALLING_DUST|DUST_PILLAR|BLOCK_CRUMBLE|BLOCK_MARKER/i.test(
      castParticle.particle,
    )
    if (needsMaterial && castParticle.material?.trim()) {
      lines.push(`    material: ${castParticle.material.trim()}`)
    }
    castBlock = `${lines.join('\n')}\n`
  }

  const comboEntries = Object.entries(input.keyCombos ?? {}).filter(
    ([, keys]) => keys.length > 0,
  )
  const keyCombosBlock =
    comboEntries.length === 0
      ? ''
      : `key-combos:\n${comboEntries
          .map(
            ([slot, keys]) =>
              `    '${slot}':\n${keys.map((k) => `        - ${k}`).join('\n')}`,
          )
          .join('\n')}\n\n`

  const expTableLine = input.expTable.trim() ? `exp-table: ${input.expTable.trim()}\n` : ''

  return `display:
    name: ${yamlQuoted(input.displayName)}
${loreBlock}
${attrLoreBlock}
${itemLine}

exp-curve: ${input.expCurve}
${expTableLine}max-level: ${input.maxLevel}
${skillTrees}
${attrBlock}

resource:
    health:
        type: ${input.resource.health.type}
        value:
            base: ${input.resource.health.base}
            per-level: ${input.resource.health.perLevel}
            max: ${input.resource.health.max}
        off-combat: ${input.resource.health.offCombat}
    mana:
        type: ${input.resource.mana.type}
        value:
            base: ${input.resource.mana.base}
            per-level: ${input.resource.mana.perLevel}
            max: ${input.resource.mana.max}
        off-combat: ${input.resource.mana.offCombat}

options:
    default: ${input.options.default}
    display: ${input.options.display}
    off-combat-health-regen: ${input.options.offCombatHealthRegen}
    off-combat-mana-regen: ${input.options.offCombatManaRegen}
    off-combat-stamina-regen: ${input.options.offCombatStaminaRegen}
    off-combat-stellium-regen: ${input.options.offCombatStelliumRegen}
    needs-permission: ${input.options.needsPermission}

${castBlock}${keyCombosBlock}skill-slots:
${slotsBlock}

mana:
    char: ${input.mana.char}
    icon: ${yamlQuoted(input.mana.icon)}
    color:
        full: ${input.mana.colorFull}
        half: ${input.mana.colorHalf}
        empty: ${input.mana.colorEmpty}
    name: ${yamlQuoted(input.mana.name)}

${triggersBlock}${skillsBlock}
${expSources}`
}

export function generateMythicLibSkillYaml(input: MythicLibSkillInput): string {
  const paramLines: string[] = ['  parameters:']
  for (const [key, mod] of Object.entries(input.modifiers)) {
    const itemVal =
      input.itemScaling !== undefined ? input.itemScaling : mod.base
    paramLines.push(`    ${key}:`)
    paramLines.push(`      name: ${key.charAt(0).toUpperCase()}${key.slice(1)}`)
    paramLines.push('      player:')
    paramLines.push(`        base: ${mod.base}`)
    paramLines.push(`        per-level: ${mod.perLevel}`)
    if (mod.max !== undefined) paramLines.push(`        max: ${mod.max}`)
    if (mod.min !== undefined) paramLines.push(`        min: ${mod.min}`)
    paramLines.push(`      item: ${itemVal}`)
  }

  const cats =
    input.categories.length === 0
      ? '  categories: []'
      : `  categories:\n${input.categories.map((c) => `    - ${c}`).join('\n')}`

  const lore =
    input.lore.length === 0
      ? '  lore: []'
      : `  lore:\n${input.lore.map((l) => `  - ${yamlQuoted(l)}`).join('\n')}`

  const triggerLine = input.trigger?.trim()
    ? `  trigger: ${input.trigger.trim().toUpperCase()}\n`
    : ''

  let iconBlock: string
  if (input.iconCustomModelData !== undefined && input.iconCustomModelData > 0) {
    iconBlock = `  icon:\n    item: ${input.icon}\n    custom_model_data: ${input.iconCustomModelData}`
  } else {
    iconBlock = `  icon: ${input.icon}`
  }

  return `${input.id}:
${paramLines.join('\n')}
${cats}
${triggerLine}  name: ${input.name}
${lore}
${iconBlock}
  source: mythicmobs:${input.id}
`
}

export function generateMythicMobsSkillShell(
  id: string,
  modifiers: Record<string, SkillModifierValues>,
  options?: MythicMobsSkillShellOptions,
): string {
  const hasDamage = 'damage' in modifiers
  const types = (options?.damageTypes?.length ? options.damageTypes : ['SKILL', 'MAGIC']).join(',')
  const element = options?.damageElement?.trim()
  const elementPart = element ? `;element=${element.toUpperCase()}` : ''
  const skills: string[] = [
    `  # Castable stub. Polish mechanics in the MythicMobs workspace.`,
    `  Skills:`,
  ]
  if (hasDamage) {
    skills.push(
      `  - mmodamage{amount="<modifier.damage> * <mmostat.skill_damage>";types=${types}${elementPart};pkb=false} @Target{conditions=[  - mmoCanTarget{interaction=OFFENSE_ACTION} true ]}`,
      `  - particle{particle=CRIT;amount=12;hSpread=0.4;vSpread=0.4;speed=0.05} @TargetLocation`,
    )
  } else {
    const first = Object.keys(modifiers)[0]
    if (first) {
      skills.push(`  - message{m="<caster.name> used ${id} (modifier.${first}=<modifier.${first}>)"} @self`)
    }
    skills.push(
      `  - particle{particle=CRIT;amount=8;hSpread=0.3;vSpread=0.3;speed=0.02} @SelfLocation`,
    )
  }

  return `${id}:
${skills.join('\n')}
`
}

export function defaultMythicLibSkillLore(
  skillId: string,
  _manaName: string,
  modifierKeys: string[],
): string[] {
  const lines = [
    '&7A castable class skill.',
    '',
  ]
  for (const key of modifierKeys) {
    const label = key.charAt(0).toUpperCase() + key.slice(1)
    lines.push(`&7${label}&7: &f{${key}}`)
  }
  lines.push('')
  lines.push('&cCooldown&7: &f{cooldown}s')
  lines.push('&9Cost&7: &f{mana} {mana_name}')
  lines.push('')
  lines.push(`&aLevel&7: &f%mmocore_skill_level_${skillId}%`)
  return lines
}

export function starterMainExpSources(): string[] {
  return [
    'killmob{type=ZOMBIE;amount=8-20}',
    'killmob{type=SKELETON;amount=10-22}',
    'killmob{type=CREEPER;amount=10-25}',
    'killmob{type=SPIDER;amount=10-24}',
    'killmob{type=ENDERMAN;amount=8-20}',
    'killmob{type=BLAZE;amount=14-35}',
    'killmob{type=WITCH;amount=6-16}',
    'killmob{type=WITHER_SKELETON;amount=6-18}',
  ]
}

export function createDefaultClassInput(partial?: Partial<ClassGeneratorInput>): ClassGeneratorInput {
  const id = partial?.id ?? 'new_class'
  return {
    id,
    displayName: partial?.displayName ?? 'New Class',
    lore: partial?.lore ?? [
      'A custom class created with Soaps Config Editor.',
      'Edit this flavor text to match your theme.',
    ],
    item: partial?.item ?? 'BLAZE_POWDER',
    customModelData: partial?.customModelData,
    maxLevel: partial?.maxLevel ?? 50,
    expCurve: partial?.expCurve ?? 'levels',
    expTable: partial?.expTable ?? '',
    skillTrees: partial?.skillTrees ?? [],
    createExpCurveIfMissing: partial?.createExpCurveIfMissing ?? true,
    options: {
      default: false,
      display: true,
      needsPermission: false,
      offCombatHealthRegen: false,
      offCombatManaRegen: true,
      offCombatStaminaRegen: false,
      offCombatStelliumRegen: false,
      ...partial?.options,
    },
    levelUpTriggers: {
      skillPoints: true,
      classPoints: true,
      attributePoints: true,
      ...partial?.levelUpTriggers,
    },
    mainExpSources: partial?.mainExpSources ?? starterMainExpSources(),
    resource: {
      health: { type: 'MAX', base: 1, perLevel: 0.1, max: 100, offCombat: true },
      mana: { type: 'MAX', base: 1, perLevel: 0.05, max: 100, offCombat: false },
      ...partial?.resource,
    },
    mana: {
      char: '♦',
      icon: '&b♦',
      name: 'Mana',
      colorFull: 'AQUA',
      colorHalf: 'DARK_AQUA',
      colorEmpty: 'GRAY',
      ...partial?.mana,
    },
    castParticle: {
      enabled: true,
      particle: 'REDSTONE',
      red: 100,
      green: 180,
      blue: 255,
      size: 1,
      ...partial?.castParticle,
    },
    keyCombos: partial?.keyCombos ?? {},
    themeColor: partial?.themeColor ?? '#7dd3fc',
    attributes: partial?.attributes ?? [
      { id: 'ATTACK_DAMAGE', base: 2.8, perLevel: 0.07, max: 10, showInLore: true },
      { id: 'MAX_HEALTH', base: 25, perLevel: 0.8, max: 100, showInLore: true },
      { id: 'KNOCKBACK_RESISTANCE', base: 0.02, perLevel: 0.006, max: 0.2, showInLore: true },
      { id: 'ARMOR', base: 0.5, perLevel: 0.05, max: 10, showInLore: true },
      { id: 'MAX_MANA', base: 20, perLevel: 1.6, max: 50, showInLore: true },
      { id: 'MANA_REGENERATION', base: 0.8, perLevel: 0.7, showInLore: true },
      { id: 'CRITICAL_STRIKE_CHANCE', base: 10, perLevel: 0.5, max: 40, showInLore: true },
      { id: 'CRITICAL_STRIKE_POWER', base: 8, perLevel: 0.8, max: 40, showInLore: true },
      { id: 'SKILL_CRITICAL_STRIKE_CHANCE', base: 8, perLevel: 0.7, max: 36, showInLore: true },
      { id: 'SKILL_CRITICAL_STRIKE_POWER', base: 8, perLevel: 0.7, max: 36, showInLore: true },
      { id: 'SKILL_DAMAGE', base: 1, perLevel: 0, showInLore: false },
    ],
    skills: partial?.skills ?? [],
    includeAttackSkills: partial?.includeAttackSkills ?? false,
    attackSkillPrefix: partial?.attackSkillPrefix ?? id,
    syncElementRow: partial?.syncElementRow ?? true,
    slots: partial?.slots ?? [
      { index: 1, name: 'Skill Slot I', lore: [], unlockedByDefault: true, canManuallyBind: true, formula: '', hardset: '', buffs: [], autoLoreFromBuffs: false },
      { index: 2, name: 'Skill Slot II', lore: [], unlockedByDefault: true, canManuallyBind: true, formula: '', hardset: '', buffs: [], autoLoreFromBuffs: false },
      { index: 3, name: 'Skill Slot III', lore: [], unlockedByDefault: true, canManuallyBind: true, formula: '', hardset: '', buffs: [], autoLoreFromBuffs: false },
      { index: 4, name: 'Skill Slot IV', lore: [], unlockedByDefault: false, canManuallyBind: true, formula: '', hardset: '', buffs: [{ modifier: 'cooldown', amount: -5, type: 'RELATIVE' }], autoLoreFromBuffs: true },
      { index: 5, name: 'Skill Slot V', lore: [], unlockedByDefault: false, canManuallyBind: true, formula: '', hardset: '', buffs: [{ modifier: 'duration', amount: 15, type: 'RELATIVE' }], autoLoreFromBuffs: true },
      { index: 6, name: 'Skill Slot VI', lore: [], unlockedByDefault: false, canManuallyBind: true, formula: '', hardset: '', buffs: [{ modifier: 'damage', amount: 15, type: 'RELATIVE' }], autoLoreFromBuffs: true },
    ],
    attributeLoreMode: partial?.attributeLoreMode ?? 'auto',
    attributeLore: partial?.attributeLore ?? [],
    pinnedLoreLines: partial?.pinnedLoreLines ?? [],
    includeAttackSkillsInLore: partial?.includeAttackSkillsInLore ?? false,
  }
}

export function runClassPreflight(
  input: ClassGeneratorInput,
  index: MMOCorePackIndex,
  options?: {
    creatingSkillIds?: Set<string>
    creatingMythicMobsIds?: Set<string>
    /** When editing an existing class, skip duplicate-id error for this id */
    allowExistingClassId?: string
  },
): PreflightItem[] {
  const items: PreflightItem[] = []
  const creatingSkills = options?.creatingSkillIds ?? new Set<string>()
  const creatingMm = options?.creatingMythicMobsIds ?? new Set<string>()
  const allowId = options?.allowExistingClassId?.toLowerCase()

  if (!input.id.trim()) items.push({ level: 'error', message: 'Class id is required.' })
  if (!/^[a-zA-Z0-9_]+$/.test(input.id.trim())) {
    items.push({ level: 'error', message: 'Class id must be alphanumeric / underscore only.' })
  }
  if (!input.displayName.trim()) items.push({ level: 'error', message: 'Display name is required.' })

  const idLower = input.id.toLowerCase()
  if (
    index.classIds.map((c) => c.toLowerCase()).includes(idLower) &&
    allowId !== idLower
  ) {
    items.push({ level: 'error', message: `Class "${input.id}" already exists.` })
  }

  if (!index.expCurves.includes(input.expCurve) && !input.createExpCurveIfMissing) {
    items.push({
      level: 'warning',
      message: `Exp curve "${input.expCurve}" was not found in this workspace. Turn on “Create exp curve file if missing”, or pick an existing curve.`,
    })
  }

  if (input.options.default && index.defaultClassIds.length > 0) {
    items.push({
      level: 'warning',
      message: `Another default class already exists (${index.defaultClassIds.join(', ')}). Only one class should be default.`,
    })
  }
  if (!input.options.default && index.defaultClassIds.length === 0) {
    items.push({
      level: 'warning',
      message: 'No default class in this workspace. Enable “Default class for new players”, or keep a Human class as default.',
    })
  }

  if (!index.hasMythicLib) {
    items.push({
      level: 'warning',
      message:
        'MythicLib folder not found. Skill registration files will not be written until you open a workspace that includes a MythicLib/ folder (plugins/MythicLib on the server).',
    })
  }
  if (!index.hasMythicMobs) {
    items.push({
      level: 'warning',
      message:
        'MythicMobs folder not found. Skill mechanic files will not be written until you open a workspace that includes MythicMobs/ (skills may live under MythicMobs/Packs/ or MythicMobs/Skills/).',
    })
  }

  const mlIds = new Set(index.mythicLibSkills.map((s) => s.id))
  const mmIds = new Set(index.mythicMobsSkillIds)
  const resolvedSkills = resolveClassSkills(input)
  const attackPrefix = input.attackSkillPrefix.trim().toLowerCase()
  const attackSkillIds =
    input.includeAttackSkills && attackPrefix
      ? new Set([`${attackPrefix}_regular_attack`, `${attackPrefix}_critical_strike`])
      : new Set<string>()
  const builtinIds = new Set(BUILTIN_SKILL_IDS.map((s) => s.id))

  if (input.includeAttackSkills && !input.syncElementRow && attackPrefix) {
    const missing = [...attackSkillIds].filter((id) => !mlIds.has(id) && !creatingSkills.has(id))
    if (missing.length > 0) {
      items.push({
        level: 'warning',
        message: `Attack skills (${missing.join(', ')}) are bound on the class but will not be registered until you turn on “Update MythicLib/elements.yml”, or add them under MythicLib/skill yourself.`,
      })
    }
  }

  for (const skill of input.skills) {
    if (skill.isNew && mlIds.has(skill.id)) {
      items.push({
        level: 'error',
        message: `Skill "${skill.id}" already exists in MythicLib. Attach the existing skill instead of creating a duplicate stub.`,
      })
    }
  }

  for (const skill of resolvedSkills) {
    const knownMl =
      mlIds.has(skill.id) ||
      creatingSkills.has(skill.id) ||
      skill.isNew ||
      attackSkillIds.has(skill.id) ||
      builtinIds.has(skill.id)
    if (!knownMl) {
      items.push({
        level: 'error',
        message: `Skill "${skill.id}" is not registered in MythicLib. Attach an existing skill or create a new stub in this wizard.`,
      })
    } else if (builtinIds.has(skill.id) && !mlIds.has(skill.id) && !skill.isNew) {
      items.push({
        level: 'warning',
        message: `Skill "${skill.id}" is a Phoenix built-in. It is not in this workspace's MythicLib/skill folder; the server must provide it.`,
      })
    }
    const ml = index.mythicLibSkills.find((s) => s.id === skill.id)
    const sourceId = ml?.source?.replace(/^mythicmobs:/i, '') ?? (skill.isNew ? skill.id : '')
    if (sourceId && !mmIds.has(sourceId) && !creatingMm.has(sourceId) && !skill.isNew) {
      items.push({
        level: 'warning',
        message: `MythicMobs skill "${sourceId}" was not found for ${skill.id}. Add it under MythicMobs or create a stub.`,
      })
    }
    if (skill.trigger.trim().toUpperCase() === 'TIMER' && (skill.timer === undefined || skill.timer <= 0)) {
      items.push({
        level: 'warning',
        message: `Skill "${skill.id}" uses TIMER. A timer of 5 seconds will be written if left blank.`,
      })
    }
  }

  for (const tree of input.skillTrees.filter(Boolean)) {
    items.push({
      level: 'warning',
      message: `Skill tree "${tree}" is referenced. Make sure that tree exists on the server.`,
    })
  }

  if (input.options.needsPermission) {
    items.push({
      level: 'warning',
      message: `Players need permission mmocore.class.${input.id} to select this class.`,
    })
  }

  return items
}

export function ensureExpCurveFile(
  curveId: string,
): { path: string; content: string; name: string } {
  return {
    path: `MMOCore/exp-curves/${curveId}.txt`,
    name: `${curveId}.txt`,
    content: defaultExpCurveContent(),
  }
}

export function classFilePath(classId: string): string {
  return `MMOCore/classes/${classId}.yml`
}

export function suggestMythicLibSkillPath(classId: string): string {
  return `MythicLib/skill/${classId.toUpperCase()}_MMOCORE.yml`
}

export function suggestMythicMobsSkillPath(packName: string, classId: string): string {
  const stem = classId.charAt(0).toUpperCase() + classId.slice(1)
  return `MythicMobs/Packs/${packName}/Skills/${stem}.yml`
}

export function capitalizeClassFileStem(classId: string): string {
  return classId.charAt(0).toUpperCase() + classId.slice(1)
}

export { indentBlock }
