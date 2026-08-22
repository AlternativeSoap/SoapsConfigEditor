import { parseYaml } from '../yaml/parseYaml'
import { yamlQuoted } from '../mythicmobs/generators'

export interface MythicLibElementRow {
  id: string
  name: string
  icon: string
  loreIcon: string
  color: string
  regularAttackId: string
  critStrikeId: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function parseElementsYaml(content: string): MythicLibElementRow[] {
  const parsed = parseYaml(content)
  const root = asRecord(parsed.data)
  if (!root) return []
  const rows: MythicLibElementRow[] = []
  for (const [id, raw] of Object.entries(root)) {
    const e = asRecord(raw)
    if (!e) continue
    const regular = asRecord(e['regular-attack'] ?? e.regularAttack) ?? {}
    const crit = asRecord(e['crit-strike'] ?? e.critStrike) ?? {}
    rows.push({
      id,
      name: asString(e.name, id),
      icon: asString(e.icon, 'BOOK'),
      loreIcon: asString(e['lore-icon'] ?? e.loreIcon, ''),
      color: asString(e.color, '&f'),
      regularAttackId: asString(
        regular['mythiclib-skill-id'] ?? regular.mythiclibSkillId ?? regular['mythicmobs-skill-id'],
      ),
      critStrikeId: asString(
        crit['mythiclib-skill-id'] ?? crit.mythiclibSkillId ?? crit['mythicmobs-skill-id'],
      ),
    })
  }
  return rows
}

export function generateElementsYaml(rows: MythicLibElementRow[]): string {
  if (rows.length === 0) {
    return `# MythicLib elements\n`
  }
  return (
    rows
      .map((r) => {
        const lines = [
          `${r.id}:`,
          `  name: ${yamlQuoted(r.name)}`,
          `  icon: ${r.icon}`,
          `  lore-icon: ${yamlQuoted(r.loreIcon || '?')}`,
          `  color: ${yamlQuoted(r.color)}`,
          `  regular-attack:`,
          `    mythiclib-skill-id: ${r.regularAttackId}`,
          `  crit-strike:`,
          `    mythiclib-skill-id: ${r.critStrikeId}`,
        ]
        return lines.join('\n')
      })
      .join('\n\n') + '\n'
  )
}

export function upsertElementRow(
  content: string,
  row: MythicLibElementRow,
): string {
  const rows = parseElementsYaml(content)
  const idx = rows.findIndex((r) => r.id.toUpperCase() === row.id.toUpperCase())
  if (idx >= 0) rows[idx] = row
  else rows.push(row)
  return generateElementsYaml(rows)
}

export function generateAttackSkillRegistrations(prefix: string, category: string): string {
  const regular = `${prefix}_regular_attack`
  const crit = `${prefix}_critical_strike`
  const cat = category.toUpperCase()
  return `${regular}:
  source: mythiclib:${regular}
  name: ${cat.charAt(0) + cat.slice(1).toLowerCase()} Regular Attack
  icon: BOOK
  categories:
    - ${cat}
  lore:
    - '&7Elemental regular attack for this class.'
    - ''
    - '&cCooldown&7: &f{cooldown}s'
    - '&9Cost&7: &f{mana} {mana_name}'

${crit}:
  source: mythiclib:${crit}
  name: ${cat.charAt(0) + cat.slice(1).toLowerCase()} Critical Strike
  icon: BOOK
  categories:
    - ${cat}
  lore:
    - '&7Elemental critical strike for this class.'
    - ''
    - '&cCooldown&7: &f{cooldown}s'
    - '&9Cost&7: &f{mana} {mana_name}'
`
}
