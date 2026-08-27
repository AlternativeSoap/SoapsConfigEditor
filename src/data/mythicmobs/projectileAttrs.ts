import type { MechanicAttr } from './mechanics'

/**
 * Wiki Projectile "Inheritable Attributes".
 * Shared by projectile, missile, chainmissile, shoot, volley, and (mostly) orbital.
 */
export const PROJECTILE_INHERITABLE_ATTRS: MechanicAttr[] = [
  { name: 'onStart', type: 'skill', desc: 'Meta-skill when the projectile starts' },
  { name: 'onTick', type: 'skill', desc: 'Meta-skill each interval at projectile origin' },
  { name: 'onHit', type: 'skill', desc: 'Meta-skill when hitting an allowed entity' },
  { name: 'onEnd', type: 'skill', desc: 'Meta-skill when the projectile ends' },
  { name: 'onBounce', type: 'skill', desc: 'Meta-skill on bounce (Premium)' },
  { name: 'onHitBlock', type: 'skill', desc: 'Meta-skill when hitting a block' },
  { name: 'onInteract', type: 'skill', desc: 'Meta-skill when the projectile is interacted with' },
  { name: 'bulletType', type: 'enum', default: 'NONE', desc: 'ARROW / BLOCK / ITEM / MOB / DISPLAY / TEXT / ME / …' },
  { name: 'bullet', type: 'enum', default: 'NONE', desc: 'Alias of bulletType' },
  { name: 'interval', type: 'number', default: '1', desc: 'Ticks between position updates' },
  { name: 'hRadius', type: 'number', default: '1.25', desc: 'Horizontal hit radius' },
  { name: 'vRadius', type: 'number', default: '1.25', desc: 'Vertical hit radius' },
  { name: 'duration', type: 'number', default: '400', desc: 'Max lifetime in ticks' },
  { name: 'maxRange', type: 'number', default: '40', desc: 'Maximum travel distance in blocks' },
  { name: 'velocity', type: 'number', default: '5', desc: 'Speed in blocks per second' },
  { name: 'v', type: 'number', default: '5', desc: 'Alias of velocity' },
  { name: 'deathDelay', type: 'number', default: '2', desc: 'Delay before removing bullets on end' },
  { name: 'startYOffset', type: 'number', default: '1', desc: 'Vertical start offset from caster' },
  { name: 'startFOffset', type: 'number', default: '1', desc: 'Forward start offset from caster' },
  { name: 'targetYOffset', type: 'number', default: '0', desc: 'Vertical aim offset on target' },
  { name: 'sideOffset', type: 'number', default: '0', desc: 'Default side offset for start and end' },
  { name: 'startSideOffset', type: 'number', desc: 'Side offset at start' },
  { name: 'endSideOffset', type: 'number', desc: 'Side offset at end' },
  { name: 'startingdirection', type: 'string', desc: 'Start direction (mainly for missiles)' },
  { name: 'horizontalOffset', type: 'number', default: '0', desc: 'Rotate starting horizontal velocity' },
  { name: 'verticalOffset', type: 'number', default: '0', desc: 'Add slope to starting direction' },
  { name: 'accuracy', type: 'number', default: '1', desc: 'Shot accuracy (1 = perfect)' },
  { name: 'horizontalNoise', type: 'number', desc: 'Horizontal randomness' },
  { name: 'verticalNoise', type: 'number', desc: 'Vertical randomness' },
  { name: 'stopAtEntity', type: 'boolean', default: 'true' },
  { name: 'stopAtBlock', type: 'boolean', default: 'true' },
  { name: 'powerAffectsRange', type: 'boolean', default: 'true' },
  { name: 'powerAffectsVelocity', type: 'boolean', default: 'true' },
  { name: 'interactable', type: 'boolean', default: 'false' },
  { name: 'hitSelf', type: 'boolean', default: 'false' },
  { name: 'hitPlayers', type: 'boolean', default: 'true' },
  { name: 'hitNonPlayers', type: 'boolean', default: 'false', desc: 'Alias attr; also hnp' },
  { name: 'hnp', type: 'boolean', default: 'false', desc: 'Hit non-player entities' },
  { name: 'hitTarget', type: 'boolean', default: 'true' },
  { name: 'hitTargetOnly', type: 'boolean', default: 'false' },
  { name: 'immuneDelay', type: 'number', default: '2000', desc: 'Ms before the same target can be hit again' },
  { name: 'hitConditions', type: 'string', desc: 'Inline conditions targets must meet to be hit' },
  { name: 'stopconditions', type: 'string', desc: 'Conditions that end the projectile on hit' },
  { name: 'hitBlockConditions', type: 'string', desc: 'Conditions for which blocks stop the projectile' },
  { name: 'doEndSkillOnHit', type: 'boolean', default: 'true' },
  { name: 'fromOrigin', type: 'boolean', default: 'false', desc: 'Start from skill origin' },
  { name: 'requireLineOfSight', type: 'enum', default: 'PLAYERS_ONLY', desc: 'true / false / PLAYERS_ONLY' },
  { name: 'drawHitbox', type: 'boolean', default: 'false' },
  { name: 'tickinterpolation', type: 'number', default: '0', desc: 'Extra interpolated points between ticks' },
  { name: 'shareSubHitboxCooldown', type: 'boolean', default: 'true' },
  { name: 'hitTargeter', type: 'string', desc: 'Entity targeter applied on hit' },
]

/** Projectile-specific flight attrs (also used by missile / chainmissile). */
export const PROJECTILE_FLIGHT_ATTRS: MechanicAttr[] = [
  { name: 'type', type: 'enum', default: 'NORMAL', desc: 'NORMAL / METEOR' },
  { name: 'gravity', type: 'number', default: '0', desc: 'Gravity per tick (use small fractions)' },
  { name: 'bounces', type: 'boolean', default: 'false', desc: 'Bounce on impact (Premium)' },
  { name: 'bounceVelocity', type: 'number', default: '0.9', desc: 'Velocity multiplier per bounce' },
  { name: 'hugSurface', type: 'boolean', default: 'false', desc: 'Follow the ground' },
  { name: 'hugLiquid', type: 'boolean', default: 'false', desc: 'Also hug liquid surfaces' },
  { name: 'heightFromSurface', type: 'number', default: '0.5' },
  { name: 'maxClimbHeight', type: 'number', default: '3' },
  { name: 'maxDropHeight', type: 'number', default: '10' },
  { name: 'highAccuracyMode', type: 'enum', default: 'PLAYERS_ONLY', desc: 'true / false / PLAYERS_ONLY' },
]

/** Missile-only attrs on top of inheritable + flight. */
export const MISSILE_EXTRA_ATTRS: MechanicAttr[] = [
  { name: 'inertia', type: 'number', default: '1.5', desc: 'Turning rate; lower turns faster' },
  { name: 'in', type: 'number', default: '1.5', desc: 'Alias of inertia' },
  { name: 'startWithParentVelocity', type: 'boolean', default: 'false' },
]

/** Common bullet attrs (available once bulletType is set). */
export const PROJECTILE_BULLET_ATTRS: MechanicAttr[] = [
  { name: 'material', type: 'string', default: 'STONE', desc: 'Bullet material or Mythic item (BLOCK/ITEM/…)' },
  { name: 'mob', type: 'string', desc: 'Mob id for MOB bulletType' },
  { name: 'arrowType', type: 'enum', default: 'NORMAL', desc: 'NORMAL / SPECTRAL / TRIDENT' },
  { name: 'bulletModel', type: 'string', desc: 'Model / CustomModelData / MEG model' },
  { name: 'bulletText', type: 'string', desc: 'Text for TEXT bulletType' },
  { name: 'bulletspin', type: 'number', default: '0' },
  { name: 'bulletmatchdirection', type: 'boolean', default: 'false' },
  { name: 'bulletEnchanted', type: 'boolean', default: 'false' },
  { name: 'bulletscale', type: 'string', default: '0.5,0.5,0.5', desc: 'Display/TEXT bullet scale' },
  { name: 'bulletYOffset', type: 'number', default: '0' },
  { name: 'bulletforwardoffset', type: 'number', default: '1.8' },
  { name: 'audience', type: 'enum', default: 'world', desc: 'Who can see the bullet' },
]

export const BULLET_TYPES = [
  'NONE',
  'ARROW',
  'BLOCK',
  'SMALLBLOCK',
  'ITEM',
  'MOB',
  'TRACKING',
  'REALTRACKING',
  'DISPLAY',
  'TEXT',
  'ME',
] as const

export const PROJECTILE_TYPES = ['NORMAL', 'METEOR'] as const

export const ARROW_BULLET_TYPES = ['NORMAL', 'SPECTRAL', 'TRIDENT'] as const

export const LOS_MODE_VALUES = ['true', 'false', 'PLAYERS_ONLY'] as const

const PROJECTILE_INHERIT_IDS = new Set([
  'projectile',
  'missile',
  'chainmissile',
  'shoot',
  'volley',
  'arrowvolley',
  'orbital',
])

const PROJECTILE_FLIGHT_IDS = new Set(['projectile', 'missile', 'chainmissile'])

const MISSILE_IDS = new Set(['missile', 'chainmissile'])

export function isProjectileInheritBlock(blockId: string): boolean {
  return PROJECTILE_INHERIT_IDS.has(blockId.toLowerCase())
}

export function isProjectileFlightBlock(blockId: string): boolean {
  return PROJECTILE_FLIGHT_IDS.has(blockId.toLowerCase())
}

export function isMissileFamilyBlock(blockId: string): boolean {
  return MISSILE_IDS.has(blockId.toLowerCase())
}
