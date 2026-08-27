export type TargeterKind = 'entity' | 'location' | 'meta' | 'special'

export interface TargeterEntry {
  id: string
  shorthand: string[]
  kind: TargeterKind
  description: string
  insertSnippet: string
}

export const TARGETER_KIND_LABELS: Record<TargeterKind, string> = {
  entity: 'Entity',
  location: 'Location',
  meta: 'Meta',
  special: 'Special',
}

export const TARGETERS: TargeterEntry[] = [
  // Single-entity
  { id: 'Self', shorthand: ['@Caster', '@Boss', '@Mob'], kind: 'entity', description: 'Targets the caster of the mechanic', insertSnippet: '@Self' },
  { id: 'Target', shorthand: ['@T'], kind: 'entity', description: 'Targets the caster\'s current target', insertSnippet: '@Target' },
  { id: 'Trigger', shorthand: [], kind: 'entity', description: 'Targets the entity that triggered the skill', insertSnippet: '@Trigger' },
  { id: 'NearestPlayer', shorthand: [], kind: 'entity', description: 'Targets the nearest player in radius', insertSnippet: '@NearestPlayer{r=10}' },
  { id: 'WolfOwner', shorthand: [], kind: 'entity', description: 'Targets the owner of the wolf', insertSnippet: '@WolfOwner' },
  { id: 'Owner', shorthand: [], kind: 'entity', description: 'Targets the owner of the mob', insertSnippet: '@Owner' },
  { id: 'Parent', shorthand: ['@summoner'], kind: 'entity', description: 'Targets the parent of the mob', insertSnippet: '@Parent' },
  { id: 'Mount', shorthand: [], kind: 'entity', description: 'Targets the caster\'s original mount', insertSnippet: '@Mount' },
  { id: 'Father', shorthand: ['@dad', '@daddy'], kind: 'entity', description: 'Targets the father of the casting mob', insertSnippet: '@Father' },
  { id: 'Mother', shorthand: ['@mom', '@mommy'], kind: 'entity', description: 'Targets the mother of the casting mob', insertSnippet: '@Mother' },
  { id: 'Passenger', shorthand: [], kind: 'entity', description: 'Targets the rider of the casting mob', insertSnippet: '@Passenger' },
  { id: 'PlayerByName', shorthand: ['@specificplayer'], kind: 'entity', description: 'Targets a specific player by name', insertSnippet: '@PlayerByName{name=Notch}' },
  { id: 'UniqueIdentifier', shorthand: ['@UUID'], kind: 'entity', description: 'Targets a specific entity by their UUID', insertSnippet: '@UniqueIdentifier{uuid=<var.uuid>}' },
  { id: 'Vehicle', shorthand: [], kind: 'entity', description: 'Targets the caster\'s vehicle', insertSnippet: '@Vehicle' },
  { id: 'InteractionLastAttacker', shorthand: ['@lastAttacker'], kind: 'entity', description: 'Targets the last entity that attacked the casting INTERACTION entity', insertSnippet: '@InteractionLastAttacker' },
  { id: 'InteractionLastInteract', shorthand: ['@lastInteract'], kind: 'entity', description: 'Targets the last entity that interacted with the casting INTERACTION entity', insertSnippet: '@InteractionLastInteract' },
  // Multi-entity
  { id: 'LivingInCone', shorthand: ['@EIC', '@LEIC', '@entitiesInCone', '@livingEntitiesInCone'], kind: 'entity', description: 'Targets all living entities in a cone', insertSnippet: '@LivingInCone{angle=60;length=5}' },
  { id: 'LivingInWorld', shorthand: ['@EIW'], kind: 'entity', description: 'Targets all living entities in the caster\'s world', insertSnippet: '@LivingInWorld' },
  { id: 'NotLivingNearOrigin', shorthand: ['@NLNO', '@nonLivingNearOrigin'], kind: 'entity', description: 'Targets all non-living entities in a radius near the origin', insertSnippet: '@NotLivingNearOrigin{r=5}' },
  { id: 'PlayersInRadius', shorthand: ['@PIR'], kind: 'entity', description: 'Targets all players in the given radius', insertSnippet: '@PlayersInRadius{r=10}' },
  { id: 'MobsInRadius', shorthand: ['@MIR'], kind: 'entity', description: 'Targets all MythicMobs in a radius', insertSnippet: '@MobsInRadius{r=10;type=MyMob}' },
  { id: 'EntitiesInRadius', shorthand: ['@EIR', '@livingInRadius', '@livingEntitiesInRadius', '@allInRadius'], kind: 'entity', description: 'Targets all entities in the given radius', insertSnippet: '@EntitiesInRadius{r=10}' },
  { id: 'EntitiesInRing', shorthand: ['@EIRR'], kind: 'entity', description: 'Targets all entities in the given ring', insertSnippet: '@EntitiesInRing{r=5;r2=10}' },
  { id: 'EntitiesInRingNearOrigin', shorthand: ['@ERNO'], kind: 'entity', description: 'Targets all entities in the given ring around the origin', insertSnippet: '@EntitiesInRingNearOrigin{r=5;r2=10}' },
  { id: 'PlayersInWorld', shorthand: ['@World'], kind: 'entity', description: 'Targets all players in the current world', insertSnippet: '@PlayersInWorld' },
  { id: 'PlayersOnServer', shorthand: ['@Server', '@Everyone'], kind: 'entity', description: 'Targets all players on the server', insertSnippet: '@PlayersOnServer' },
  { id: 'PlayersInRing', shorthand: [], kind: 'entity', description: 'Targets all players between the specified min and max radius', insertSnippet: '@PlayersInRing{r=5;r2=10}' },
  { id: 'PlayersNearOrigin', shorthand: ['@PNO'], kind: 'entity', description: 'Targets players near the origin of a meta-skill', insertSnippet: '@PlayersNearOrigin{r=10}' },
  { id: 'TrackedPlayers', shorthand: ['@tracked'], kind: 'entity', description: 'Targets players within the render distance of the caster', insertSnippet: '@TrackedPlayers' },
  { id: 'MobsNearOrigin', shorthand: [], kind: 'entity', description: 'Targets all MythicMobs in a radius around the origin', insertSnippet: '@MobsNearOrigin{r=10}' },
  { id: 'EntitiesNearOrigin', shorthand: ['@ENO'], kind: 'entity', description: 'Targets all entities near the origin of a meta-skill', insertSnippet: '@EntitiesNearOrigin{r=10}' },
  { id: 'Children', shorthand: ['@child', '@summons'], kind: 'entity', description: 'Targets any child entities summoned by the caster', insertSnippet: '@Children' },
  { id: 'Siblings', shorthand: ['@sibling', '@brothers', '@sisters'], kind: 'entity', description: 'Targets any mobs that share the same parent as the caster', insertSnippet: '@Siblings' },
  { id: 'ItemsNearOrigin', shorthand: [], kind: 'entity', description: 'Targets item drops near the origin of a meta-skill', insertSnippet: '@ItemsNearOrigin{r=5}' },
  { id: 'ItemsInRadius', shorthand: ['@IIR'], kind: 'entity', description: 'Targets all item drops in the given radius', insertSnippet: '@ItemsInRadius{r=5}' },
  // Threat table
  { id: 'ThreatTable', shorthand: ['@TT'], kind: 'entity', description: 'Targets every entity on the casting mob\'s threat table', insertSnippet: '@ThreatTable' },
  { id: 'ThreatTablePlayers', shorthand: [], kind: 'entity', description: 'Targets all players on the casting mob\'s threat table', insertSnippet: '@ThreatTablePlayers' },
  { id: 'RandomThreatTarget', shorthand: ['@RTT'], kind: 'entity', description: 'Targets a random entity on the casting mob\'s threat table', insertSnippet: '@RandomThreatTarget' },
  { id: 'RandomThreatTargetLocation', shorthand: ['@RTTL'], kind: 'location', description: 'Targets the location of a random entity on the threat table', insertSnippet: '@RandomThreatTargetLocation' },
  // Single-location
  { id: 'SelfLocation', shorthand: ['@casterLocation', '@bossLocation', '@mobLocation'], kind: 'location', description: 'Targets the caster\'s location', insertSnippet: '@SelfLocation' },
  { id: 'SelfEyeLocation', shorthand: ['@eyeDirection', '@casterEyeLocation', '@bossEyeLocation', '@mobEyeLocation'], kind: 'location', description: 'Targets the caster\'s eye location', insertSnippet: '@SelfEyeLocation' },
  { id: 'Forward', shorthand: [], kind: 'location', description: 'Targets a location in front of caster\'s facing direction', insertSnippet: '@Forward{f=5;y=1}' },
  { id: 'ProjectileForward', shorthand: [], kind: 'location', description: 'Targets a location in front of the casting projectile', insertSnippet: '@ProjectileForward{f=1}' },
  { id: 'TargetLocation', shorthand: ['@TL', '@targetloc'], kind: 'location', description: 'Targets the caster\'s target\'s location', insertSnippet: '@TargetLocation' },
  { id: 'TargetPredictedLocation', shorthand: ['@TPL', '@targetPredictedLoc', '@PredictedTargetLocation'], kind: 'location', description: 'Targets the predicted location of the caster\'s target', insertSnippet: '@TargetPredictedLocation{ticks=10}' },
  { id: 'TriggerLocation', shorthand: [], kind: 'location', description: 'Targets the location of the entity that triggered the skill', insertSnippet: '@TriggerLocation' },
  { id: 'SpawnLocation', shorthand: [], kind: 'location', description: 'Targets the world\'s spawn location', insertSnippet: '@SpawnLocation' },
  { id: 'CasterSpawnLocation', shorthand: [], kind: 'location', description: 'Targets the location the caster spawned at', insertSnippet: '@CasterSpawnLocation' },
  { id: 'Location', shorthand: [], kind: 'location', description: 'Targets the specified coordinates in the caster\'s world', insertSnippet: '@Location{location=0,64,0}' },
  { id: 'Origin', shorthand: ['@source'], kind: 'location', description: 'Targets the location of the origin of a meta-skill', insertSnippet: '@Origin' },
  { id: 'ObstructingBlock', shorthand: [], kind: 'location', description: 'Targets the block in front of the caster that is obstructing it', insertSnippet: '@ObstructingBlock' },
  { id: 'TargetBlock', shorthand: [], kind: 'location', description: 'Targets the block the casting player is looking at', insertSnippet: '@TargetBlock' },
  { id: 'TrackedLocation', shorthand: [], kind: 'location', description: 'Targets the mob\'s tracked location', insertSnippet: '@TrackedLocation' },
  { id: 'NearestStructure', shorthand: [], kind: 'location', description: 'Targets the nearest structure of the specified type', insertSnippet: '@NearestStructure{type=VILLAGE;r=100}' },
  { id: 'VariableLocation', shorthand: ['@varLocation'], kind: 'location', description: 'Targets the location stored in the specified variable', insertSnippet: '@VariableLocation{var=myLocVar}' },
  { id: 'HighestBlock', shorthand: [], kind: 'location', description: 'Targets the highest block at the skill origin', insertSnippet: '@HighestBlock' },
  { id: 'PlayerLocationByName', shorthand: [], kind: 'location', description: 'Targets a specific player\'s location by name', insertSnippet: '@PlayerLocationByName{name=Notch}' },
  { id: 'EscapeLocation', shorthand: [], kind: 'location', description: 'Targets a nearby safe escape location', insertSnippet: '@EscapeLocation' },
  { id: 'OwnerLocation', shorthand: [], kind: 'location', description: 'Targets the position of the owner of the mob', insertSnippet: '@OwnerLocation' },
  { id: 'ParentLocation', shorthand: ['@summonerlocation'], kind: 'location', description: 'Targets the position of the parent of the mob', insertSnippet: '@ParentLocation' },
  // Multi-location
  { id: 'ForwardWall', shorthand: [], kind: 'location', description: 'Targets a plane in front of the caster', insertSnippet: '@ForwardWall{f=5;height=3;width=3}' },
  { id: 'PlayerLocationsInRadius', shorthand: ['@PLIR'], kind: 'location', description: 'Targets all player locations in the given radius', insertSnippet: '@PlayerLocationsInRadius{r=10}' },
  { id: 'Pin', shorthand: [], kind: 'location', description: 'Targets the location(s) of a pin', insertSnippet: '@Pin{pin=myPin}' },
  { id: 'Ring', shorthand: [], kind: 'location', description: 'Target points to form a ring of locations', insertSnippet: '@Ring{radius=3;points=12}' },
  { id: 'RandomRingPoint', shorthand: [], kind: 'location', description: 'Targets random points in a ring around the caster', insertSnippet: '@RandomRingPoint{radius=5}' },
  { id: 'Cone', shorthand: [], kind: 'location', description: 'Returns point locations that comprise a cone', insertSnippet: '@Cone{angle=45;length=5;points=10}' },
  { id: 'Sphere', shorthand: [], kind: 'location', description: 'Targets points in a sphere around the caster', insertSnippet: '@Sphere{radius=3;points=20}' },
  { id: 'Rectangle', shorthand: ['@cube', '@cuboid'], kind: 'location', description: 'Returns point locations that comprise a rectangle', insertSnippet: '@Rectangle{xSize=3;ySize=3;zSize=3}' },
  { id: 'RandomLocationsNearCaster', shorthand: ['@randomLocations', '@RLNC'], kind: 'location', description: 'Targets random locations near the caster', insertSnippet: '@RandomLocationsNearCaster{r=5;amount=3}' },
  { id: 'RandomLocationsNearOrigin', shorthand: ['@RLO', '@RLNO', '@randomLocationsOrigin'], kind: 'location', description: 'Targets random locations near the origin', insertSnippet: '@RandomLocationsNearOrigin{r=5;amount=3}' },
  { id: 'BlocksNearOrigin', shorthand: ['@BNO'], kind: 'location', description: 'Targets all blocks in a radius around the origin', insertSnippet: '@BlocksNearOrigin{r=3}' },
  { id: 'RingAroundOrigin', shorthand: ['@RAO', '@ringOrigin'], kind: 'location', description: 'Targets locations in a ring around the origin', insertSnippet: '@RingAroundOrigin{radius=3;points=12}' },
  { id: 'Spawners', shorthand: [], kind: 'location', description: 'Targets the location of the specified spawners', insertSnippet: '@Spawners{spawner=mySpawner}' },
  { id: 'BlocksInPinRegion', shorthand: [], kind: 'location', description: 'Targets the blocks in a region delimited by two pins', insertSnippet: '@BlocksInPinRegion{pin1=pin1;pin2=pin2}' },
  // Meta-entity
  { id: 'LivingInLine', shorthand: ['@EIL', '@LEIL', '@entitiesInLine', '@livingEntitiesInLine'], kind: 'meta', description: 'Targets entities in a line between the inherited target and the caster', insertSnippet: '@LivingInLine{r=1}' },
  { id: 'LivingNearTargetLocation', shorthand: ['@LNTL', '@ENT', '@ENTL'], kind: 'meta', description: 'Targets all living entities near the inherited target', insertSnippet: '@LivingNearTargetLocation{r=5}' },
  { id: 'PlayersNearTargetLocations', shorthand: ['@PNTL', '@playersNearTargetLocation'], kind: 'meta', description: 'Targets all players near the inherited targets', insertSnippet: '@PlayersNearTargetLocations{r=5}' },
  { id: 'TargetedTarget', shorthand: ['@Targeted'], kind: 'meta', description: 'Targets the inherited targeted entities', insertSnippet: '@TargetedTarget' },
  // Meta-location
  { id: 'Line', shorthand: [], kind: 'meta', description: 'Targets locations between the mob and the inherited targets', insertSnippet: '@Line{points=10}' },
  { id: 'RandomLocationsNearTargets', shorthand: ['@RLNT', '@RLNTE', '@RLNTL', '@randomLocationsNearTarget', '@randomLocationsNearTargetEntities', '@randomLocationsNearTargetLocations'], kind: 'meta', description: 'Targets random locations around the inherited targets', insertSnippet: '@RandomLocationsNearTargets{r=3;amount=3}' },
  { id: 'FloorOfTargets', shorthand: ['@FOT', '@floorsOfTarget'], kind: 'meta', description: 'Targets the blocks underneath the inherited targets', insertSnippet: '@FloorOfTargets' },
  { id: 'LocationsOfTargets', shorthand: ['@LOT', '@locationOfTarget'], kind: 'meta', description: 'Targets the location of the inherited target entities', insertSnippet: '@LocationsOfTargets' },
  { id: 'TargetedLocation', shorthand: ['@targetedLoc', '@targetedLocations'], kind: 'meta', description: 'Targets the location of the inherited target locations', insertSnippet: '@TargetedLocation' },
  { id: 'BlocksInRadius', shorthand: ['@BIR'], kind: 'meta', description: 'Targets all blocks in a radius of the inherited targets', insertSnippet: '@BlocksInRadius{r=3}' },
  { id: 'BlocksInChunk', shorthand: ['@BIC'], kind: 'meta', description: 'Targets all blocks in a chunk relative to the inherited target', insertSnippet: '@BlocksInChunk' },
  { id: 'BlockVein', shorthand: ['@vein', '@bv'], kind: 'meta', description: 'Targets adjacent blocks matching the blocktype from origin', insertSnippet: '@BlockVein{blocktype=STONE}' },
  // Special
  { id: 'None', shorthand: [], kind: 'special', description: 'Provides no target (useful for mechanics with no target input)', insertSnippet: '@None' },
  { id: 'Region', shorthand: [], kind: 'special', description: 'Special targeter to target a WorldGuard region', insertSnippet: '@Region{region=myRegion}' },
  { id: 'ChunksInWERegion', shorthand: ['@chunksInWGRegion'], kind: 'special', description: 'Targets chunk corners within a WorldEdit region', insertSnippet: '@ChunksInWERegion{region=myRegion}' },
]
