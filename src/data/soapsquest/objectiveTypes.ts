export type ObjectiveTargetKind =
  | 'material'
  | 'entity'
  | 'biome'
  | 'text'
  | 'any'
  | 'npc'
  | 'region'
  | 'skill'
  | 'script'
  | 'advancement'
  | 'world'

export type ObjectiveFieldMode =
  | 'target_amount'
  | 'amount_only'
  | 'command'
  | 'placeholder'
  | 'level_only'
  | 'vehicle_amount'
  | 'text_amount'
  | 'equip'
  | 'deliver_npc'
  | 'land_level'

export interface ObjectiveTypeInfo {
  id: string
  label: string
  group: string
  mode: ObjectiveFieldMode
  /** For target_amount and similar modes */
  targetKind?: ObjectiveTargetKind
  targetHint: string
  amountHint?: string
}

export const OBJECTIVE_GROUPS: { id: string; label: string; types: ObjectiveTypeInfo[] }[] = [
  {
    id: 'combat',
    label: 'Combat',
    types: [
      { id: 'kill', label: 'Kill', mode: 'target_amount', targetKind: 'entity', targetHint: 'ZOMBIE' },
      { id: 'kill_mythicmob', label: 'Kill MythicMob', mode: 'target_amount', targetKind: 'text', targetHint: 'SkeletalKnight' },
      { id: 'kill_player', label: 'Kill player', mode: 'amount_only', targetHint: '', amountHint: 'Kills required' },
      { id: 'damage', label: 'Deal damage', mode: 'amount_only', targetHint: '', amountHint: 'Damage dealt' },
      { id: 'bowshoot', label: 'Bow shoot', mode: 'amount_only', targetHint: '', amountHint: 'Arrows shot' },
      { id: 'projectile', label: 'Projectile', mode: 'target_amount', targetKind: 'material', targetHint: 'SNOWBALL' },
      { id: 'death', label: 'Death', mode: 'amount_only', targetHint: '', amountHint: 'Deaths' },
    ],
  },
  {
    id: 'blocks_items',
    label: 'Blocks and items',
    types: [
      { id: 'break', label: 'Break', mode: 'target_amount', targetKind: 'material', targetHint: 'OAK_LOG' },
      { id: 'place', label: 'Place', mode: 'target_amount', targetKind: 'material', targetHint: 'COBBLESTONE' },
      { id: 'smelt', label: 'Smelt', mode: 'target_amount', targetKind: 'material', targetHint: 'IRON_INGOT' },
      { id: 'craft', label: 'Craft', mode: 'target_amount', targetKind: 'material', targetHint: 'BREAD' },
      { id: 'enchant', label: 'Enchant', mode: 'amount_only', targetHint: '', amountHint: 'Items enchanted' },
      { id: 'anvil_repair', label: 'Anvil repair', mode: 'amount_only', targetHint: '', amountHint: 'Repairs' },
      { id: 'collect', label: 'Collect', mode: 'target_amount', targetKind: 'material', targetHint: 'WHEAT' },
      { id: 'consume', label: 'Consume', mode: 'target_amount', targetKind: 'material', targetHint: 'COOKED_BEEF' },
      { id: 'drop', label: 'Drop', mode: 'target_amount', targetKind: 'material', targetHint: 'DIAMOND' },
      { id: 'smith', label: 'Smith', mode: 'target_amount', targetKind: 'any', targetHint: 'ANY' },
    ],
  },
  {
    id: 'world_life',
    label: 'World and life',
    types: [
      { id: 'fish', label: 'Fish', mode: 'target_amount', targetKind: 'entity', targetHint: 'COD' },
      { id: 'harvest', label: 'Harvest', mode: 'target_amount', targetKind: 'material', targetHint: 'WHEAT' },
      { id: 'breed', label: 'Breed', mode: 'target_amount', targetKind: 'entity', targetHint: 'COW' },
      { id: 'tame', label: 'Tame', mode: 'target_amount', targetKind: 'entity', targetHint: 'WOLF' },
      { id: 'shear', label: 'Shear', mode: 'target_amount', targetKind: 'entity', targetHint: 'SHEEP' },
      { id: 'sleep', label: 'Sleep', mode: 'amount_only', targetHint: '', amountHint: 'Times slept' },
      { id: 'heal', label: 'Heal', mode: 'amount_only', targetHint: '', amountHint: 'Health restored' },
      { id: 'brew', label: 'Brew', mode: 'amount_only', targetHint: '', amountHint: 'Potions brewed' },
    ],
  },
  {
    id: 'movement',
    label: 'Movement',
    types: [
      { id: 'move', label: 'Move', mode: 'amount_only', targetHint: '', amountHint: 'Blocks traveled' },
      { id: 'vehicle', label: 'Vehicle', mode: 'vehicle_amount', targetHint: 'ANY', amountHint: 'Blocks ridden' },
      { id: 'elytra_fly', label: 'Elytra fly', mode: 'amount_only', targetHint: '', amountHint: 'Blocks glided' },
      { id: 'jump', label: 'Jump', mode: 'amount_only', targetHint: '', amountHint: 'Jumps' },
      { id: 'explore_biome', label: 'Explore biome', mode: 'target_amount', targetKind: 'biome', targetHint: 'PLAINS' },
      { id: 'enter_world', label: 'Enter world', mode: 'target_amount', targetKind: 'world', targetHint: 'NETHER' },
      { id: 'playtime', label: 'Playtime', mode: 'amount_only', targetHint: '', amountHint: 'Minutes online' },
    ],
  },
  {
    id: 'progression',
    label: 'Progression',
    types: [
      { id: 'reachlevel', label: 'Reach level', mode: 'level_only', targetHint: '30', amountHint: 'Target level' },
      { id: 'gainlevel', label: 'Gain level', mode: 'amount_only', targetHint: '', amountHint: 'Levels gained' },
      { id: 'xp_pickup', label: 'XP pickup', mode: 'amount_only', targetHint: '', amountHint: 'XP collected' },
      { id: 'advancement', label: 'Advancement', mode: 'target_amount', targetKind: 'advancement', targetHint: 'minecraft:story/mine_stone' },
    ],
  },
  {
    id: 'interaction',
    label: 'Interaction',
    types: [
      { id: 'interact', label: 'Interact', mode: 'target_amount', targetKind: 'material', targetHint: 'CRAFTING_TABLE' },
      { id: 'trade', label: 'Trade', mode: 'amount_only', targetHint: '', amountHint: 'Trades completed' },
      { id: 'chat', label: 'Chat', mode: 'text_amount', targetHint: 'hello', amountHint: 'Messages sent' },
      { id: 'command', label: 'Command', mode: 'command', targetHint: 'help', amountHint: 'Times run' },
      { id: 'placeholder', label: 'Placeholder', mode: 'placeholder', targetHint: 'player_level', amountHint: 'Target value' },
      { id: 'firework', label: 'Firework', mode: 'amount_only', targetHint: '', amountHint: 'Fireworks launched' },
      { id: 'equip', label: 'Equip', mode: 'equip', targetKind: 'material', targetHint: 'DIAMOND_CHESTPLATE', amountHint: 'Times equipped' },
    ],
  },
  {
    id: 'worldguard',
    label: 'WorldGuard',
    types: [
      { id: 'wg_enter_region', label: 'Enter region', mode: 'target_amount', targetKind: 'region', targetHint: 'spawn' },
      { id: 'wg_leave_region', label: 'Leave region', mode: 'target_amount', targetKind: 'region', targetHint: 'spawn' },
      { id: 'wg_time_in_region', label: 'Time in region', mode: 'target_amount', targetKind: 'region', targetHint: 'spawn', amountHint: 'Seconds' },
    ],
  },
  {
    id: 'lands',
    label: 'Lands',
    types: [
      { id: 'lands_enter_land', label: 'Enter land', mode: 'target_amount', targetKind: 'text', targetHint: 'MyLand' },
      { id: 'lands_visit_land', label: 'Visit land', mode: 'target_amount', targetKind: 'text', targetHint: 'MyLand' },
      { id: 'lands_claim_chunks', label: 'Claim chunks', mode: 'amount_only', targetHint: '', amountHint: 'Chunks claimed' },
      { id: 'lands_land_level', label: 'Land level', mode: 'land_level', targetKind: 'text', targetHint: 'MyLand', amountHint: 'Target level' },
      { id: 'lands_deposit', label: 'Deposit', mode: 'amount_only', targetHint: '', amountHint: 'Amount deposited' },
      { id: 'lands_member_count', label: 'Member count', mode: 'amount_only', targetHint: '', amountHint: 'Members required' },
    ],
  },
  {
    id: 'citizens',
    label: 'Citizens',
    types: [
      { id: 'citizens_talk_npc', label: 'Talk to NPC', mode: 'target_amount', targetKind: 'npc', targetHint: '1' },
      { id: 'citizens_deliver_npc', label: 'Deliver to NPC', mode: 'deliver_npc', targetKind: 'npc', targetHint: '1', amountHint: 'Deliveries' },
      { id: 'citizens_kill_npc', label: 'Kill NPC', mode: 'target_amount', targetKind: 'npc', targetHint: '1' },
    ],
  },
  {
    id: 'mcmmo',
    label: 'mcMMO',
    types: [
      { id: 'mcmmo_skill_level', label: 'Skill level', mode: 'target_amount', targetKind: 'skill', targetHint: 'MINING', amountHint: 'Target level' },
      { id: 'mcmmo_skill_gain', label: 'Skill gain', mode: 'target_amount', targetKind: 'skill', targetHint: 'MINING', amountHint: 'Levels gained' },
      { id: 'mcmmo_power_level', label: 'Power level', mode: 'amount_only', targetHint: '', amountHint: 'Power level' },
      { id: 'mcmmo_ability', label: 'Ability', mode: 'target_amount', targetKind: 'skill', targetHint: 'SUPER_BREAKER', amountHint: 'Uses' },
      { id: 'mcmmo_xp_gain', label: 'XP gain', mode: 'target_amount', targetKind: 'skill', targetHint: 'MINING', amountHint: 'XP gained' },
    ],
  },
  {
    id: 'denizen',
    label: 'Denizen',
    types: [
      { id: 'denizen_run', label: 'Run script', mode: 'target_amount', targetKind: 'script', targetHint: 'my_script' },
    ],
  },
]

export const ALL_OBJECTIVE_TYPES: ObjectiveTypeInfo[] = OBJECTIVE_GROUPS.flatMap((g) => g.types)

export function objectiveTypeInfo(id: string): ObjectiveTypeInfo | undefined {
  return ALL_OBJECTIVE_TYPES.find((t) => t.id === id)
}

export function defaultObjectiveForType(type: string): import('../../core/soapsquest/generators').QuestObjectiveInput {
  const info = objectiveTypeInfo(type)
  const base = {
    type,
    target: info?.targetHint ?? '',
    amount: 1,
    command: '',
    placeholder: '',
    level: info?.mode === 'level_only' ? 5 : 1,
    vehicle: 'ANY',
    text: '',
    slot: 'CHEST',
    item: 'WHEAT:16',
  }
  if (info?.mode === 'amount_only') {
    return { ...base, target: '', amount: 10 }
  }
  if (info?.mode === 'vehicle_amount') {
    return { ...base, vehicle: 'ANY', amount: 100 }
  }
  if (info?.mode === 'command') {
    return { ...base, command: 'help', target: '', amount: 1 }
  }
  if (info?.mode === 'placeholder') {
    return { ...base, placeholder: 'player_level', target: '', amount: 5 }
  }
  if (info?.mode === 'level_only') {
    return { ...base, level: 5, target: '', amount: 1 }
  }
  if (info?.mode === 'text_amount') {
    return { ...base, text: 'hello', target: '', amount: 1 }
  }
  if (info?.mode === 'equip') {
    return { ...base, target: 'DIAMOND_CHESTPLATE', slot: 'CHEST', amount: 1 }
  }
  if (info?.mode === 'deliver_npc') {
    return { ...base, target: '1', item: 'WHEAT:16', amount: 1 }
  }
  if (info?.mode === 'land_level') {
    return { ...base, target: 'MyLand', level: 5, amount: 1 }
  }
  return { ...base, target: info?.targetHint ?? 'ZOMBIE', amount: 10 }
}
