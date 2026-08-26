export type CrucibleStatModifier =
  | 'ADDITIVE'
  | 'ADDITIVE_MULTIPLIER'
  | 'COMPOUND_MULTIPLIER'
  | 'SETTER'

export const CRUCIBLE_STAT_MODIFIERS: CrucibleStatModifier[] = [
  'ADDITIVE',
  'ADDITIVE_MULTIPLIER',
  'COMPOUND_MULTIPLIER',
  'SETTER',
]

export interface CrucibleStatLine {
  id: string
  value: string
  modifier: CrucibleStatModifier
}

const MODIFIER_SET = new Set<string>(CRUCIBLE_STAT_MODIFIERS)

export function parseCrucibleStatLines(raw: string): CrucibleStatLine[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/)
      const id = (parts[0] ?? '').toUpperCase()
      const last = parts[parts.length - 1]?.toUpperCase() ?? ''
      const hasModifier = parts.length >= 3 && MODIFIER_SET.has(last)
      const modifier = (hasModifier ? last : 'ADDITIVE') as CrucibleStatModifier
      const value = hasModifier ? parts.slice(1, -1).join(' ') : parts.slice(1).join(' ')
      return {
        id,
        value: value || '1',
        modifier,
      }
    })
    .filter((row) => row.id)
}

export function serializeCrucibleStatLines(rows: CrucibleStatLine[]): string {
  return rows
    .filter((row) => row.id.trim())
    .map((row) => `${row.id.trim().toUpperCase()} ${row.value.trim() || '0'} ${row.modifier}`)
    .join('\n')
}
