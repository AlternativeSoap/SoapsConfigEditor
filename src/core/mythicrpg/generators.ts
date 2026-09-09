import { yamlQuoted } from '../mythicmobs/generators'
import type {
  ArchetypeGeneratorInput,
  ReagentGeneratorInput,
  SpellGeneratorInput,
} from '../../types'

function listLines(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function reagentCostId(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return 'Mana'
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

function modifierKeyName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '_')
}

function withAdditiveOp(line: string): string {
  const trimmed = line.trim()
  if (!trimmed) return trimmed
  if (/\b(ADDITIVE|ADDITIVE_MULTIPLIER|MULTIPLY|COMPOUND)\b/i.test(trimmed)) {
    return trimmed
  }
  return `${trimmed} ADDITIVE`
}

/**
 * MythicRPG spell YAML matching current ExamplePack_RPG style:
 * Trigger USE / COMBAT / JOIN, Icon as a material string, Cost as Mana{amount=…},
 * and Modifiers referenced via <spell.mod.SPELL_ID.key>.
 */
export function generateSpellYaml(input: SpellGeneratorInput): string {
  const id = input.id.trim()
  const lines: string[] = [`${id}:`]
  const modId = id

  lines.push('  Spell: true')
  lines.push(`  Display: ${yamlQuoted(input.display.trim() || id)}`)

  const descLines = listLines(input.description)
  if (descLines.length > 0) {
    lines.push('  Description:')
    for (const line of descLines) {
      lines.push(`  - ${yamlQuoted(line)}`)
    }
  }

  if (input.iconMaterial.trim()) {
    lines.push(`  Icon: ${input.iconMaterial.trim().toUpperCase()}`)
  }

  const powerKey = modifierKeyName(input.modifierKey)
  const hasCost = Boolean(input.costReagent.trim() && input.costAmount > 0)
  const hasCooldown = input.cooldown > 0
  const hasPower = Boolean(powerKey) && input.castingMode !== 'passive'

  if (input.castingMode === 'bound') {
    lines.push('  Type: ACTIVE')
    lines.push('  Trigger: USE')
  } else if (input.castingMode === 'click_combo') {
    const combo = input.clickCombo.trim().toUpperCase() || 'LRR'
    lines.push('  Type: ACTIVE')
    lines.push(`  ClickCombo: ${combo}`)
    lines.push('  Trigger: COMBAT')
  } else {
    lines.push('  Global: true')
    lines.push('  Trigger: JOIN')
  }

  if (input.targeter.trim()) {
    lines.push(`  Targeter: ${yamlQuoted(input.targeter.trim())}`)
  }

  if (input.upgrades > 1) {
    lines.push(`  Upgrades: ${input.upgrades}`)
  }

  if (hasCooldown || hasCost || hasPower) {
    lines.push('  Modifiers:')
    if (hasCooldown) {
      lines.push('    cooldown:')
      lines.push(`      Base: ${input.cooldown}`)
      lines.push('      PerLevel: 0')
    }
    if (hasCost) {
      lines.push('    cost:')
      lines.push(`      Base: ${input.costAmount}`)
      lines.push('      PerLevel: 0')
    }
    if (hasPower) {
      lines.push(`    ${powerKey}:`)
      lines.push(`      Base: ${input.modifierBase}`)
      lines.push(`      PerLevel: ${input.modifierPerLevel}`)
    }
  }

  if (hasCooldown) {
    lines.push(`  Cooldown: <spell.mod.${modId}.cooldown>`)
  }

  if (hasCost) {
    const reagent = reagentCostId(input.costReagent)
    lines.push('  Cost:')
    lines.push(`  - ${reagent}{amount=<spell.mod.${modId}.cost>}`)
  }

  const statKey = input.passiveStatKey?.trim().toUpperCase()
  if (statKey && input.castingMode === 'passive') {
    lines.push('  Stats:')
    lines.push(`    ${statKey}:`)
    lines.push(`      Base: ${input.passiveStatBase ?? 1}`)
    lines.push(`      PerLevel: ${input.passiveStatPerLevel ?? 0}`)
    if (input.passiveStatMax != null) {
      lines.push(`      Max: ${input.passiveStatMax}`)
    }
  }

  const skillLines = input.skills
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      powerKey
        ? line
            .replaceAll(`<spell.modifier.${input.modifierKey.trim().toUpperCase()}>`, `<spell.mod.${modId}.${powerKey}>`)
            .replaceAll(`<spell.modifier.${powerKey}>`, `<spell.mod.${modId}.${powerKey}>`)
        : line,
    )
  if (skillLines.length === 0) {
    lines.push('  Skills: []')
  } else {
    lines.push('  Skills:')
    for (const skill of skillLines) {
      lines.push(`  - ${skill}`)
    }
  }

  return `${lines.join('\n')}\n`
}

/**
 * MythicRPG archetype YAML matching ExamplePack_RPG:
 * Bindings for hotbar spells, PointRewards, StatModifiers with ADDITIVE ops.
 */
export function generateArchetypeYaml(input: ArchetypeGeneratorInput): string {
  const id = input.id.trim()
  const lines: string[] = [`${id}:`]
  lines.push(`  Group: ${input.group}`)
  lines.push(`  Display: ${yamlQuoted(input.display.trim() || id)}`)

  const descLines = listLines(input.description)
  if (descLines.length > 0) {
    lines.push('  Description:')
    for (const line of descLines) {
      lines.push(`  - ${yamlQuoted(line)}`)
    }
  }

  if (input.iconMaterial.trim()) {
    lines.push('  Icon:')
    lines.push(`    Material: ${input.iconMaterial.trim().toUpperCase()}`)
  }

  lines.push('  Leveling:')
  lines.push(`    MinLevel: ${input.minLevel}`)
  lines.push(`    MaxLevel: ${input.maxLevel}`)
  if (input.experienceCurve.trim()) {
    lines.push(`    ExperienceCurve: ${input.experienceCurve.trim()}`)
  }
  if (input.experienceSource.trim()) {
    lines.push(`    ExperienceSource: ${input.experienceSource.trim()}`)
  }

  if (input.group === 'CLASS') {
    lines.push('  PointRewards:')
    lines.push('  - Type: TALENT')
    lines.push('    PerLevel: 1')
    lines.push('  - Type: ATTRIBUTE')
    lines.push('    PerLevel: 1')
  }

  const bindings = listLines(input.spellUnlocks)
  if (bindings.length > 0) {
    lines.push('  Bindings:')
    bindings.forEach((entry, index) => {
      const slotMatch = entry.match(/^(\d+)\s+(.+)$/)
      if (slotMatch) {
        lines.push(`  - ${slotMatch[1]} ${slotMatch[2]}`)
      } else {
        lines.push(`  - ${index + 1} ${entry}`)
      }
    })
  }

  if (input.baseStatLine.trim()) {
    lines.push('  BaseStats:')
    lines.push(`  - ${input.baseStatLine.trim()}`)
  }
  if (input.statModifierLine.trim()) {
    lines.push('  StatModifiers:')
    lines.push(`  - ${withAdditiveOp(input.statModifierLine)}`)
  }

  if (input.group === 'CLASS') {
    lines.push('  InitSkills:')
    lines.push('  - modifyresource{resource=Mana;stat=MAX_MANA} @self')
  }

  return `${lines.join('\n')}\n`
}

export function generateReagentYaml(input: ReagentGeneratorInput): string {
  const id = input.id.trim()
  const lines: string[] = [`${id}:`]
  lines.push(`  Display: ${yamlQuoted(input.display.trim() || id)}`)
  lines.push(`  MinValue: ${input.minValue.trim() || '0'}`)
  const maxValue = input.scaleWithMaxMana ? 'stat.MAX_MANA' : input.maxValue.trim() || '100'
  lines.push(`  MaxValue: ${maxValue}`)
  if (input.global) {
    // Official Mana reagent omits Global; keep it when the wizard asks for it.
    lines.push('  Global: true')
  }

  if (input.includeResourceBar) {
    lines.push('  ResourceBarStates:')
    lines.push('    Default:')
    lines.push(`      Display: ${yamlQuoted('&b<name> &f<amount>/<max> <bar>')}`)
    lines.push('      BarLength: 20')
    lines.push(`      BarFiller: ${yamlQuoted('|')}`)
    lines.push(`      BarSpacer: ${yamlQuoted('.')}`)
  }

  return `${lines.join('\n')}\n`
}

/** MAX_MANA stat stub matching ExamplePack_RPG (PlayerBaseValue + Type STATIC). */
export function generateMaxManaStatYaml(baseValue: number): string {
  return `MAX_MANA:
  Enabled: true
  Type: STATIC
  AlwaysActive: true
  Display: ${yamlQuoted('Max Mana')}
  PlayerBaseValue: ${baseValue}
  MinValue: 0
  MaxValue: 1000000
  Formatting:
    Additive: ${yamlQuoted('<white>+<value> Max Mana')}
    Multiply: ${yamlQuoted('<white>+<value>% Max Mana')}
    Compound: ${yamlQuoted('<white>x<value> Max Mana')}
    Rounding: 2
`
}

export function generateManaRegenStatYaml(baseValue = 2): string {
  return `MANA_REGENERATION:
  Enabled: true
  Type: STATIC
  AlwaysActive: true
  Display: ${yamlQuoted('Mana Regeneration')}
  PlayerBaseValue: ${baseValue}
  MinValue: 0
  MaxValue: 1000000
  Formatting:
    Additive: ${yamlQuoted('<white>+<value> Mana Regeneration')}
    Multiply: ${yamlQuoted('<white>+<value>% Mana Regeneration')}
    Compound: ${yamlQuoted('<white>x<value> Mana Regeneration')}
    Rounding: 2
`
}

export function generatePointsYaml(): string {
  return `TALENT:
  Display: ${yamlQuoted('<gold>Talent Point')}

ATTRIBUTE:
  Display: ${yamlQuoted('<green>Attribute Point')}
`
}

/** Suggest pack-relative paths for MythicRPG content. */
export function suggestSpellPath(packRoot: string): string {
  return `${packRoot}/Skills/skills.yml`
}

export function suggestArchetypePath(packRoot: string): string {
  return `${packRoot}/Archetypes/classes.yml`
}

export function suggestReagentPath(packRoot: string): string {
  return `${packRoot}/reagents.yml`
}

export function suggestStatsPath(packRoot: string): string {
  return `${packRoot}/stats.yml`
}

export function suggestExperienceCurvesPath(packRoot: string): string {
  return `${packRoot}/experience-curves.yml`
}

export function suggestExperienceSourcesPath(packRoot: string): string {
  return `${packRoot}/experience-sources.yml`
}

/** True if YAML content already defines a top-level key (case-sensitive id). */
export function yamlHasTopLevelKey(content: string, id: string): boolean {
  const key = id.trim()
  if (!key) return false
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped}\\s*:`, 'm').test(content)
}

/**
 * Find the pack folder prefix for a file path (Packs/Name or MythicMobs/Packs/Name).
 * Falls back to MythicMobs/Packs/{packName}.
 */
export function resolvePackRoot(files: { path: string }[], packName: string): string {
  for (const file of files) {
    const normalized = file.path.replace(/\\/g, '/')
    const match = normalized.match(/^(.*?Packs\/[^/]+)/)
    if (match) return match[1]
  }
  return `MythicMobs/Packs/${packName}`
}
