/** Attribute names that reference a metaskill id. */
export const SKILL_REF_ATTRS = new Set([
  's', 'skill', 'skills', 'ontick', 'onhit', 'onend', 'onstart', 'oncast', 'oninteract',
  'onshoot', 'onland', 'onbegin', 'onfinish', 'onjump', 'onfall', 'onspawn', 'ondeath',
  'onattack', 'ondamaged', 'onkill', 'onblock', 'onbreak', 'onplace', 'onstep',
  'oncrouch', 'onfloat', 'onswim', 'onhold', 'onrelease', 'onswap', 'oncooldown',
  'onbounce', 'onhitblock',
])

export const DROPTABLE_ATTRS = new Set(['table'])
export const ITEM_ATTRS = new Set(['material', 'item', 'i', 'blocktype', 'block'])
export const SLOT_ATTRS = new Set(['slot'])

export function inferAttrTypeFromName(name: string, defaultVal?: string): import('../../data/mythicmobs/mechanics').MechanicAttr['type'] {
  const n = name.toLowerCase()
  if (defaultVal === 'true' || defaultVal === 'false') return 'boolean'
  if (SKILL_REF_ATTRS.has(n)) return 'skill'
  return 'string'
}
