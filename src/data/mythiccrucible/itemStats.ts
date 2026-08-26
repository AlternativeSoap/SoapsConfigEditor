import { ATTRIBUTE_CATALOG, normalizeAttributeId, type AttributeCatalogEntry } from '../mmocore/attributes'

/** MythicMobs / Crucible built-in stats commonly used on items (wiki Defaults). */
const MYTHIC_ITEM_STATS: AttributeCatalogEntry[] = [
  { id: 'HEALTH', label: 'Health', icon: '❤', group: 'base', description: 'Health values on the entity or item.' },
  { id: 'BONUS_DAMAGE', label: 'Bonus Damage', icon: '⚔', group: 'damage', description: 'Additional damage modifier.' },
  {
    id: 'CRITICAL_STRIKE_DAMAGE',
    label: 'Critical Strike Damage',
    icon: '✧',
    group: 'critical',
    description: 'Damage dealt via critical strike.',
  },
  {
    id: 'CRITICAL_STRIKE_RESILIENCE',
    label: 'Critical Strike Resilience',
    icon: '◎',
    group: 'critical',
    description: 'Resistance to critical strikes.',
  },
  { id: 'DODGE_CHANCE', label: 'Dodge Chance', icon: '💨', group: 'utility', description: 'Chance for an attack to fail.' },
  { id: 'DODGE_NEGATION', label: 'Dodge Negation', icon: '👁', group: 'utility', description: 'Reduces opponent dodge chance.' },
  {
    id: 'LIFESTEAL_CHANCE',
    label: 'Lifesteal Chance',
    icon: 'vamp',
    group: 'utility',
    description: 'Chance for damage dealt to heal the attacker.',
  },
  {
    id: 'LIFESTEAL_POWER',
    label: 'Lifesteal Power',
    icon: 'vamp',
    group: 'utility',
    description: 'How much healing lifesteal applies.',
  },
  { id: 'PARRY_CHANCE', label: 'Parry Chance', icon: '🛡', group: 'utility' },
  { id: 'PARRY_POWER', label: 'Parry Power', icon: '🛡', group: 'utility' },
  { id: 'PARRY_COUNTERATTACK', label: 'Parry Counterattack', icon: '⚔', group: 'utility' },
  { id: 'PARRY_NEGATION', label: 'Parry Negation', icon: '🛡', group: 'utility' },
  { id: 'FLYING_SPEED', label: 'Flying Speed', icon: '🪽', group: 'utility' },
  { id: 'FOLLOW_RANGE', label: 'Follow Range', icon: '📡', group: 'utility' },
  { id: 'LOOT_BIAS', label: 'Loot Bias', icon: '🍀', group: 'utility' },
]

const byId = new Map<string, AttributeCatalogEntry>()
for (const entry of [...ATTRIBUTE_CATALOG, ...MYTHIC_ITEM_STATS]) {
  if (!byId.has(entry.id)) byId.set(entry.id, entry)
}

/** Catalog of stats searchable when adding item / set bonus stats. */
export const ITEM_STAT_CATALOG: AttributeCatalogEntry[] = [...byId.values()].sort((a, b) =>
  a.label.localeCompare(b.label),
)

export const COMMON_ITEM_STATS = [
  'ATTACK_DAMAGE',
  'DEFENSE',
  'HEALTH',
  'CRITICAL_STRIKE_CHANCE',
  'CRITICAL_STRIKE_DAMAGE',
  'ATTACK_SPEED',
  'MOVEMENT_SPEED',
] as const

export function resolveItemStatMeta(id: string): AttributeCatalogEntry {
  const norm = normalizeAttributeId(id)
  return (
    byId.get(norm) ?? {
      id: norm,
      label: norm
        .split('_')
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' '),
      icon: '•',
      group: 'other',
    }
  )
}
