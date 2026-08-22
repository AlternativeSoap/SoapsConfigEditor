import { resolveAttributeMeta } from '../../data/mmocore/attributes'
import type { ClassAttributeEntry, ClassGeneratorInput, ClassSkillBinding } from '../../types'

export interface LoreBuilderInput {
  attributes: ClassAttributeEntry[]
  skills: ClassSkillBinding[]
  manaName: string
  themeColor: string
  includeAttackSkillsInLore: boolean
  pinnedLines?: string[]
}

function isAttackSkill(id: string): boolean {
  const lower = id.toLowerCase()
  return lower.endsWith('_regular_attack') || lower.endsWith('_critical_strike')
}

function formatStatValue(n: number): string {
  if (Number.isInteger(n)) return String(n)
  return String(Math.round(n * 1000) / 1000)
}

function manaAwareLabel(attrId: string, manaName: string, override?: string): string {
  if (override) return override
  if (attrId === 'MAX_MANA') return `${manaName} Max`
  if (attrId === 'MANA_REGENERATION') return `${manaName} Regeneration`
  return resolveAttributeMeta(attrId).label
}

/**
 * Build display.attribute-lore from attributes + skills (single source of truth).
 */
export function buildAttributeLore(input: LoreBuilderInput): string[] {
  const color = input.themeColor || '#ffb0b8'
  const lines: string[] = []

  const skillList = input.skills.filter((s) => {
    if (input.includeAttackSkillsInLore) return true
    return !isAttackSkill(s.id)
  })

  if (skillList.length > 0) {
    lines.push(`<gradient:${color}:${color}><underlined>Skills</gradient>&7:`)
    for (const skill of skillList) {
      lines.push(`&7- <color:${color}>${skill.displayName || skill.id}`)
    }
    lines.push('')
  }

  const groups: { key: string; title: string; filter: (a: ClassAttributeEntry) => boolean }[] = [
    {
      key: 'base',
      title: 'Base Stats',
      filter: (a) => {
        const g = resolveAttributeMeta(a.id).group
        return a.showInLore && (g === 'base' || g === 'resource' || g === 'other' || g === 'utility' || g === 'damage')
          && resolveAttributeMeta(a.id).group !== 'critical'
      },
    },
    {
      key: 'critical',
      title: 'Critical Stats',
      filter: (a) => a.showInLore && resolveAttributeMeta(a.id).group === 'critical',
    },
  ]

  // Split base vs resource for nicer Elementals-style layout: base first, then we already
  // include resource in "Base Stats" like Fire pack.
  const baseAttrs = input.attributes.filter((a) => {
    if (!a.showInLore) return false
    return resolveAttributeMeta(a.id).group !== 'critical'
  })
  const critAttrs = input.attributes.filter(
    (a) => a.showInLore && resolveAttributeMeta(a.id).group === 'critical',
  )

  if (baseAttrs.length > 0) {
    lines.push(`<gradient:${color}:${color}><underlined>Base Stats</gradient>&7:`)
    for (const attr of baseAttrs) {
      const meta = resolveAttributeMeta(attr.id)
      const label = manaAwareLabel(attr.id, input.manaName, attr.labelOverride)
      const per = formatStatValue(attr.perLevel)
      lines.push(
        `&7${meta.icon} &7${label}: <color:${color}>${formatStatValue(attr.base)} &7(⬈ +${per})`,
      )
    }
    lines.push('')
  }

  if (critAttrs.length > 0) {
    lines.push(`<gradient:${color}:${color}><underlined>Critical Stats</gradient>&7:`)
    for (const attr of critAttrs) {
      const meta = resolveAttributeMeta(attr.id)
      const label = manaAwareLabel(attr.id, input.manaName, attr.labelOverride)
      const per = formatStatValue(attr.perLevel)
      lines.push(
        `&7${meta.icon} &7${label}: <color:${color}>${formatStatValue(attr.base)} &7(⬈ +${per})`,
      )
    }
  }

  // Trim trailing blank
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()

  if (input.pinnedLines && input.pinnedLines.length > 0) {
    if (lines.length > 0) lines.push('')
    lines.push(...input.pinnedLines)
  }

  void groups
  return lines
}

export function mergeLoreForMode(
  input: ClassGeneratorInput,
): string[] {
  if (input.attributeLoreMode === 'custom') {
    return [...input.attributeLore]
  }
  const generated = buildAttributeLore({
    attributes: input.attributes,
    skills: input.skills,
    manaName: input.mana.name,
    themeColor: input.themeColor,
    includeAttackSkillsInLore: input.includeAttackSkillsInLore,
    pinnedLines: input.attributeLoreMode === 'auto-pinned' ? input.pinnedLoreLines : undefined,
  })
  return generated
}
