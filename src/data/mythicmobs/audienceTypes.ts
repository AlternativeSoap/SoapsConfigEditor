/** Wiki audience values for effect visibility (Skills/Audience). */
export const AUDIENCE_VALUES = [
  'self',
  'caster',
  'nonSelf',
  'nonSelfWorld',
  'target',
  'world',
  'tracked',
  'trackedplayers',
  'nearby',
  'nearbyplayers',
] as const

/** Starter targeter-as-audience values when the user types `@`. */
export const AUDIENCE_TARGETER_STARTERS = ['@self', '@Owner', '@PlayersInRadius'] as const
