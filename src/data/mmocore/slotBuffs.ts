export interface SlotBuffPreset {
  modifier: string
  label: string
  defaultAmount: number
  defaultType: 'FLAT' | 'RELATIVE'
}

export const SLOT_BUFF_PRESETS: SlotBuffPreset[] = [
  { modifier: 'cooldown', label: 'Cooldown', defaultAmount: -5, defaultType: 'RELATIVE' },
  { modifier: 'damage', label: 'Damage', defaultAmount: 15, defaultType: 'RELATIVE' },
  { modifier: 'duration', label: 'Duration', defaultAmount: 15, defaultType: 'RELATIVE' },
  { modifier: 'mana', label: 'Mana cost', defaultAmount: -5, defaultType: 'RELATIVE' },
  { modifier: 'range', label: 'Range', defaultAmount: 10, defaultType: 'RELATIVE' },
  { modifier: 'heal', label: 'Heal', defaultAmount: 10, defaultType: 'RELATIVE' },
  { modifier: 'ignite', label: 'Ignite', defaultAmount: 15, defaultType: 'RELATIVE' },
  { modifier: 'stun', label: 'Stun', defaultAmount: 10, defaultType: 'RELATIVE' },
  { modifier: 'charges', label: 'Charges', defaultAmount: 1, defaultType: 'FLAT' },
  { modifier: 'multiplier', label: 'Multiplier', defaultAmount: 10, defaultType: 'RELATIVE' },
  { modifier: 'bounces', label: 'Bounces', defaultAmount: 1, defaultType: 'FLAT' },
  { modifier: 'bounce_radius', label: 'Bounce radius', defaultAmount: 10, defaultType: 'RELATIVE' },
  { modifier: 'auradamage', label: 'Aura damage', defaultAmount: 10, defaultType: 'RELATIVE' },
  { modifier: 'poison_duration', label: 'Poison duration', defaultAmount: 10, defaultType: 'RELATIVE' },
]

export function formatSkillBuffLine(modifier: string, amount: number, type: 'FLAT' | 'RELATIVE'): string {
  return `skill_buff{modifier="${modifier}";amount=${amount};type="${type}"}`
}

export function loreLinesFromBuffs(
  buffs: { modifier: string; amount: number; type: 'FLAT' | 'RELATIVE' }[],
): string[] {
  if (buffs.length === 0) return []
  return buffs.map((b) => {
    const sign = b.amount > 0 ? '+' : ''
    if (b.type === 'RELATIVE') {
      return `&e${b.modifier}: &6${sign}${b.amount}%`
    }
    return `&e${b.modifier}: &6${sign}${b.amount}`
  })
}

/** Common slot formulas from the Phoenix binding wiki. */
export const FORMULA_CHIPS = [
  { value: '', label: 'Any skill' },
  { value: '<ACTIVE>', label: 'Active only' },
  { value: '<PASSIVE>', label: 'Passive only' },
  { value: '<ACTIVE> && !<PASSIVE>', label: 'Active (strict)' },
] as const

export { CLASS_SKILL_TRIGGERS, CASTING_KEYBINDS, DAMAGE_TYPE_CHIPS, DEFAULT_ELEMENT_IDS } from './triggers'
export type { ClassSkillTriggerId, CastingKeybind } from './triggers'
