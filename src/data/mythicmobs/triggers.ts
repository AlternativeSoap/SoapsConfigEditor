export interface TriggerEntry {
  id: string
  description: string
  notes?: string
  insertSnippet: string
}

export const TRIGGERS: TriggerEntry[] = [
  { id: 'onCombat', description: 'Default trigger. Fires on damage, spawn, or death.', notes: 'Used when no trigger is specified', insertSnippet: '~onCombat' },
  { id: 'onAttack', description: 'When the mob hits something', insertSnippet: '~onAttack' },
  { id: 'onDamaged', description: 'When the mob is damaged', insertSnippet: '~onDamaged' },
  { id: 'onSpawn', description: 'When the mob spawns', insertSnippet: '~onSpawn' },
  { id: 'onDespawn', description: 'When the mob is despawned', insertSnippet: '~onDespawn' },
  { id: 'onReady', description: 'Triggered the first time a mob is spawned from a spawner', insertSnippet: '~onReady' },
  { id: 'onLoad', description: 'When the mob is loaded after a server restart', insertSnippet: '~onLoad' },
  { id: 'onSpawnOrLoad', description: 'When the mob either spawns or loads', insertSnippet: '~onSpawnOrLoad' },
  { id: 'onDeath', description: 'When the mob dies', insertSnippet: '~onDeath' },
  { id: 'onTimer', description: 'Every # ticks (where # is the interval in ticks)', notes: 'Requires an interval: ~onTimer:200', insertSnippet: '~onTimer:200' },
  { id: 'onInteract', description: 'When the mob is right-clicked', insertSnippet: '~onInteract' },
  { id: 'onPlayerKill', description: 'When the mob kills a player', insertSnippet: '~onPlayerKill' },
  { id: 'onEnterCombat', description: 'When the mob enters combat (requires threat tables)', insertSnippet: '~onEnterCombat' },
  { id: 'onDropCombat', description: 'When the mob leaves combat (requires threat tables)', insertSnippet: '~onDropCombat' },
  { id: 'onChangeTarget', description: 'When the mob changes targets (requires threat tables)', insertSnippet: '~onChangeTarget' },
  { id: 'onExplode', description: 'When the mob explodes (typically only for creepers)', insertSnippet: '~onExplode' },
  { id: 'onPrime', description: 'When the creeper charges up for an explosion', insertSnippet: '~onPrime' },
  { id: 'onCreeperCharge', description: 'When the creeper is charged by lightning', insertSnippet: '~onCreeperCharge' },
  { id: 'onTeleport', description: 'When the mob teleports (typically only for endermen)', insertSnippet: '~onTeleport' },
  { id: 'onSignal', description: 'When the mob receives a signal', insertSnippet: '~onSignal' },
  { id: 'onShoot', description: 'When the mob fires a projectile', insertSnippet: '~onShoot' },
  { id: 'onBowHit', description: 'When the mob\'s fired projectile hits an entity', insertSnippet: '~onBowHit' },
  { id: 'onTame', description: 'When the mob gets tamed', insertSnippet: '~onTame' },
  { id: 'onBreed', description: 'When the mob breeds with another mob', insertSnippet: '~onBreed' },
  { id: 'onTrade', description: 'When the Villager completes a trade (requires Paper)', insertSnippet: '~onTrade' },
  { id: 'onChangeWorld', description: 'When the mob changes world', insertSnippet: '~onChangeWorld' },
  { id: 'onBucket', description: 'When the cow is milked or an entity is bucketed', insertSnippet: '~onBucket' },
  { id: 'onSkillDamage', description: 'When the mob deals damage to other entities via a mechanic', insertSnippet: '~onSkillDamage' },
  { id: 'onHear', description: 'When the mob hears a sound (if hearing is enabled)', insertSnippet: '~onHear' },
  { id: 'onProjectileHit', description: 'When a mob\'s special projectile hits an entity', insertSnippet: '~onProjectileHit' },
  { id: 'onProjectileLand', description: 'When a mob\'s special projectile hits a block', insertSnippet: '~onProjectileLand' },
  { id: 'onDismounted', description: 'When the mob is dismounted from', insertSnippet: '~onDismounted' },
  { id: 'onCinematicStart', description: 'When a cinematic camera path begins playing on a player', insertSnippet: '~onCinematicStart' },
  { id: 'onCinematicEnd', description: 'When a cinematic camera path ends on a player', insertSnippet: '~onCinematicEnd' },
  { id: 'onEnterBounds', description: 'When the mob moves into a defined region', insertSnippet: '~onEnterBounds' },
  { id: 'onExitBounds', description: 'When the mob moves out of a defined region', insertSnippet: '~onExitBounds' },
]
