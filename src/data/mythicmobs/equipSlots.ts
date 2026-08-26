/** Canonical equipment slots for mob Equipment: keys and brace slot=. */
export const EQUIPMENT_SLOTS = ['HEAD', 'CHEST', 'LEGS', 'FEET', 'HAND', 'OFFHAND'] as const

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number]

/** Wiki EquipSlot aliases that resolve to a canonical slot. */
export const EQUIPMENT_SLOT_ALIASES: { label: string; apply: EquipmentSlot; detail: string }[] = [
  { label: 'HELMET', apply: 'HEAD', detail: 'alias → HEAD' },
  { label: 'HELM', apply: 'HEAD', detail: 'alias → HEAD' },
  { label: 'HAT', apply: 'HEAD', detail: 'alias → HEAD' },
  { label: 'CHESTPIECE', apply: 'CHEST', detail: 'alias → CHEST' },
  { label: 'CHESTPLATE', apply: 'CHEST', detail: 'alias → CHEST' },
  { label: 'BODY', apply: 'CHEST', detail: 'alias → CHEST' },
  { label: 'LEGGINGS', apply: 'LEGS', detail: 'alias → LEGS' },
  { label: 'PANTS', apply: 'LEGS', detail: 'alias → LEGS' },
  { label: 'BOOTS', apply: 'FEET', detail: 'alias → FEET' },
  { label: 'SHOES', apply: 'FEET', detail: 'alias → FEET' },
  { label: 'MAINHAND', apply: 'HAND', detail: 'alias → HAND' },
  { label: 'WEAPON', apply: 'HAND', detail: 'alias → HAND' },
  { label: 'SHIELD', apply: 'OFFHAND', detail: 'alias → OFFHAND' },
]

export type EquipSlotCompletion = { label: string; apply: string; detail?: string }

/** Brace slot= completions: canonical first, then wiki aliases that apply as canonical. */
export const EQUIPMENT_SLOT_COMPLETIONS: EquipSlotCompletion[] = [
  ...EQUIPMENT_SLOTS.map((slot) => ({ label: slot, apply: slot })),
  ...EQUIPMENT_SLOT_ALIASES.map((a) => ({
    label: a.label,
    apply: a.apply,
    detail: a.detail,
  })),
]
