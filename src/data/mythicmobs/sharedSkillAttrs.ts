import type { MechanicAttr } from './mechanics'

/** Wiki universal mechanic attributes (apply to most skill mechanics). */
export const UNIVERSAL_MECHANIC_ATTRS: MechanicAttr[] = [
  { name: 'cooldown', type: 'number', default: '0', desc: 'Skill cooldown in seconds' },
  { name: 'delay', type: 'number', default: '0', desc: 'Delay before running, in ticks' },
  { name: 'repeat', type: 'number', default: '0', desc: 'Extra times to repeat' },
  { name: 'repeatInterval', type: 'number', default: '0', desc: 'Ticks between repeats, in ticks' },
  { name: 'chance', type: 'number', default: '1', desc: 'Chance to run (0 to 1)' },
  { name: 'power', type: 'number', default: '1', desc: 'Power multiplier' },
]

/** Audience on visibility-related mechanics (beyond particle family). */
export const AUDIENCE_ATTR: MechanicAttr = {
  name: 'audience',
  type: 'enum',
  default: 'tracked',
  desc: 'Who can see this effect',
}

export const VISIBILITY_MECHANIC_IDS = new Set([
  'sound',
  'stopsound',
  'sendtitle',
  'sendactionmessage',
  'sendtoast',
  'message',
  'hologram',
  'blackscreen',
  'bloodyscreen',
  'skybox',
  'firework',
  'glow',
])

/** Wiki attrs available on every targeter. */
export const ALL_TARGETER_ATTRS: MechanicAttr[] = [
  { name: 'conditions', type: 'string', desc: 'Inline conditions for this targeter' },
  { name: 'targetconditions', type: 'string', desc: 'Alias of conditions' },
  { name: 'fallback', type: 'string', desc: 'Fallback targeter if this returns nothing' },
  { name: 'fb', type: 'string', desc: 'Alias of fallback' },
]

/** Extra attrs for entity/location radius and filter targeters. */
export const COMMON_TARGETER_ATTRS: MechanicAttr[] = [
  { name: 'r', type: 'number', default: '10', desc: 'Radius' },
  { name: 'radius', type: 'number', default: '10', desc: 'Radius (alias of r)' },
  { name: 'limit', type: 'number', desc: 'Max targets to return' },
  { name: 'sort', type: 'enum', default: 'NEAREST', desc: 'NEAREST / FURTHEST / RANDOM / HIGHEST_THREAT / LOWEST_THREAT' },
  { name: 'target', type: 'string', desc: 'Entity filter (players, monsters, …)' },
  { name: 'ignore', type: 'string', desc: 'Entity types or groups to ignore' },
]

/** Threat-table targeters often use sort/limit/stuti. */
export const THREAT_TARGETER_ATTRS: MechanicAttr[] = [
  { name: 'sort', type: 'enum', default: 'HIGHEST_THREAT', desc: 'HIGHEST_THREAT / LOWEST_THREAT / RANDOM' },
  { name: 'limit', type: 'number', default: '1', desc: 'Max targets' },
  { name: 'stuti', type: 'number', default: '0', desc: 'Skip targets up to index' },
]

export function isThreatTargeter(id: string): boolean {
  const key = id.toLowerCase()
  return key.includes('threat')
}

export function isRadiusLikeTargeter(id: string): boolean {
  const key = id.toLowerCase()
  // Do not match *InWorld / *OnServer: those have no radius/filter attrs on the wiki.
  return (
    key.includes('radius') ||
    key.includes('ring') ||
    key.includes('near') ||
    key.includes('cone') ||
    key.includes('sphere')
  )
}
