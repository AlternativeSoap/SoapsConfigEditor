export interface ObjectiveTypeInfo {
  id: string
  label: string
  /** Suggested target value for the input placeholder */
  targetHint: string
}

/** MVP objective types that all use target + amount. */
export const MVP_OBJECTIVE_TYPES: ObjectiveTypeInfo[] = [
  { id: 'kill', label: 'Kill', targetHint: 'ZOMBIE' },
  { id: 'break', label: 'Break', targetHint: 'OAK_LOG' },
  { id: 'place', label: 'Place', targetHint: 'COBBLESTONE' },
  { id: 'craft', label: 'Craft', targetHint: 'BREAD' },
  { id: 'collect', label: 'Collect', targetHint: 'WHEAT' },
  { id: 'fish', label: 'Fish', targetHint: 'COD' },
  { id: 'harvest', label: 'Harvest', targetHint: 'WHEAT' },
  { id: 'breed', label: 'Breed', targetHint: 'COW' },
  { id: 'tame', label: 'Tame', targetHint: 'WOLF' },
  { id: 'smelt', label: 'Smelt', targetHint: 'IRON_INGOT' },
  { id: 'consume', label: 'Consume', targetHint: 'COOKED_BEEF' },
  { id: 'kill_mythicmob', label: 'Kill MythicMob', targetHint: 'SkeletalKnight' },
]

export function objectiveTypeInfo(id: string): ObjectiveTypeInfo | undefined {
  return MVP_OBJECTIVE_TYPES.find((t) => t.id === id)
}
