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

export function generateSpellYaml(input: SpellGeneratorInput): string {
  const id = input.id.trim()
  const lines: string[] = [`${id}:`]

  if (input.cooldown > 0) {
    lines.push(`  Cooldown: ${input.cooldown}`)
  }
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

  lines.push('  Spell: true')

  if (input.global || input.castingMode === 'passive') {
    lines.push('  Global: true')
  }

  if (input.castingMode === 'bound') {
    lines.push('  Bindable: true')
    lines.push('  Trigger: ~onUse')
  } else if (input.castingMode === 'click_combo') {
    const combo = input.clickCombo.trim().toUpperCase() || 'LRR'
    lines.push(`  ClickCombo: ${combo}`)
    lines.push('  Trigger: ~onCombat')
  } else {
    lines.push('  Bindable: false')
    lines.push('  Trigger: ~onJoin')
  }

  if (input.targeter.trim()) {
    lines.push(`  Targeter: ${yamlQuoted(input.targeter.trim())}`)
  }

  if (input.upgrades > 1) {
    lines.push(`  Upgrades: ${input.upgrades}`)
  }

  const reagent = input.costReagent.trim()
  if (reagent && input.costAmount > 0) {
    lines.push('  Cost:')
    lines.push(`  - ${reagent.toLowerCase()} ${input.costAmount}`)
  }

  const modKey = input.modifierKey.trim().toUpperCase()
  if (modKey) {
    lines.push('  Modifiers:')
    lines.push(`    ${modKey}:`)
    lines.push(`      Base: ${input.modifierBase}`)
    lines.push(`      PerLevel: ${input.modifierPerLevel}`)
  }

  const statKey = input.passiveStatKey?.trim().toUpperCase()
  if (statKey) {
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

  if (input.baseStatLine.trim()) {
    lines.push('  BaseStats:')
    lines.push(`  - ${input.baseStatLine.trim()}`)
  }
  if (input.statModifierLine.trim()) {
    lines.push('  StatModifiers:')
    lines.push(`  - ${input.statModifierLine.trim()}`)
  }

  const unlocks = listLines(input.spellUnlocks)
  if (unlocks.length > 0) {
    lines.push('  SpellUnlocks:')
    for (const unlock of unlocks) {
      lines.push(`  - ${unlock}`)
    }
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
  lines.push(`  Global: ${input.global ? 'true' : 'false'}`)

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

export function generateMaxManaStatYaml(baseValue: number): string {
  return `MAX_MANA:
  Enabled: true
  Display: ${yamlQuoted('Max Mana')}
  BaseValue: ${baseValue}
  Formatting:
    Additive: ${yamlQuoted('+<value> Max Mana')}
    Multiply: ${yamlQuoted('+<value> Max Mana')}
    Compound: ${yamlQuoted('x<value> Max Mana')}
`
}

/** Suggest pack-relative paths for MythicRPG content. */
export function suggestSpellPath(packRoot: string): string {
  return `${packRoot}/skills/skills.yml`
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
