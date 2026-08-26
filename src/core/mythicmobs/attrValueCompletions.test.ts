import { describe, expect, it } from 'vitest'
import { MECHANICS } from '../../data/mythicmobs/mechanics'
import {
  augmentBraceAttrs,
  currentParticleFromInside,
  enumOptionsFromDesc,
  optionsForAttr,
  valuesForAttr,
} from './attrValueCompletions'

const damage = MECHANICS.find((m) => m.id === 'damage')!
const potion = MECHANICS.find((m) => m.id === 'potion')!

describe('attrValueCompletions', () => {
  it('parses slash-separated enum descriptions', () => {
    expect(enumOptionsFromDesc('multiply / add / set', 'multiply')).toEqual(['multiply', 'add', 'set'])
    expect(enumOptionsFromDesc('set / add', 'set')).toEqual(['set', 'add'])
  })

  it('parses e.g. lists from descriptions', () => {
    expect(enumOptionsFromDesc('Potion effect type (e.g. SLOW, SPEED, REGENERATION)')).toEqual([
      'SLOW',
      'SPEED',
      'REGENERATION',
    ])
  })

  it('returns boolean values for boolean attrs', () => {
    const attr = damage.attributes!.find((a) => a.name === 'ignorearmor')!
    expect(valuesForAttr('damage', attr, [], [], [], [])).toEqual(['true', 'false'])
  })

  it('returns potion effects for potion type attr', () => {
    const attr = potion.attributes!.find((a) => a.name === 'type')!
    const values = valuesForAttr('potion', attr, [], [], [], [])
    expect(values).toContain('SLOW')
    expect(values).toContain('REGENERATION')
  })

  it('returns pack skill ids for skill attrs', () => {
    const projectile = MECHANICS.find((m) => m.id === 'projectile')!
    const attr = projectile!.attributes!.find((a) => a.name === 'onHit')!
    expect(valuesForAttr('projectile', attr, ['MY_SKILL', 'OTHER'], [], [], [])).toEqual(['MY_SKILL', 'OTHER'])
  })

  it('returns droptable ids for table attr', () => {
    expect(valuesForAttr('fillchest', { name: 'table', type: 'string' }, [], [], [], ['LOOT_A'])).toEqual(['LOOT_A'])
  })

  it('returns materials for material attr', () => {
    const values = valuesForAttr('giveitem', { name: 'material', type: 'string' }, [], [], [], [])
    expect(values).toContain('DIAMOND')
    expect(values).toContain('STONE')
  })

  it('returns sound keys for sound attr', () => {
    const values = valuesForAttr('sound', { name: 'sound', type: 'string' }, [], [], [], [])
    expect(values).toContain('entity.player.levelup')
    expect(values).toContain('entity.warden.sonic_boom')
    expect(values).toContain('block.note_block.pling')
  })

  it('returns current particle names without legacy aliases', () => {
    const values = valuesForAttr('particle', { name: 'particle', type: 'enum' }, [], [], [], [])
    expect(values).toContain('DUST')
    expect(values).toContain('HAPPY_VILLAGER')
    expect(values).toContain('ANGRY_VILLAGER')
    expect(values).not.toContain('REDSTONE')
    expect(values).not.toContain('VILLAGER_HAPPY')
    expect(values).not.toContain('ENCHANTMENT_TABLE')
  })

  it('returns full particle catalog even when attr has a default', () => {
    const attr = MECHANICS.find((m) => m.id === 'particle')!.attributes!.find((a) => a.name === 'particle')!
    const values = valuesForAttr('particle', attr, [], [], [], [])
    expect(values.length).toBeGreaterThan(50)
    expect(values).toContain('DUST')
  })

  it('returns audience values', () => {
    const values = valuesForAttr('particle', { name: 'audience', type: 'enum' }, [], [], [], [])
    expect(values).toContain('tracked')
    expect(values).toContain('self')
    expect(values).toContain('world')
    expect(values).toContain('nearbyplayers')
  })

  it('returns equip slots including wiki aliases that apply as canonical', () => {
    const options = optionsForAttr('equip', { name: 'slot', type: 'enum' }, [], [], [], [], '', '')
    expect(options.some((o) => o.label === 'HEAD' && o.apply === 'HEAD')).toBe(true)
    const helmet = options.find((o) => o.label === 'HELMET')
    expect(helmet?.apply).toBe('HEAD')
  })

  it('applies DUST with required hex color when color is missing', () => {
    const options = optionsForAttr(
      'particlebox',
      { name: 'particle', type: 'enum' },
      [],
      [],
      [],
      [],
      'amount=5',
      'DU',
    )
    const dust = options.find((o) => o.label === 'DUST')
    expect(dust?.apply).toBe('DUST;color=#FF0000')
  })

  it('does not re-append color when selecting DUST if color already present', () => {
    const options = optionsForAttr(
      'particle',
      { name: 'particle', type: 'enum' },
      [],
      [],
      [],
      [],
      'color=#FFFFFF',
      'DUST',
    )
    const dust = options.find((o) => o.label === 'DUST')
    expect(dust?.apply).toBeUndefined()
  })

  it('returns hex colors for color= when particle is DUST', () => {
    const inside = 'particle=DUST;color='
    expect(currentParticleFromInside(inside)).toBe('DUST')
    const values = valuesForAttr(
      'particle',
      { name: 'color', type: 'string' },
      [],
      [],
      [],
      [],
      'particle=DUST',
    )
    expect(values).toContain('#FF0000')
    expect(values).not.toContain('RED')
  })

  it('keeps team colors for color= outside dust particle context', () => {
    const values = valuesForAttr('glow', { name: 'color', type: 'enum' }, [], [], [], [])
    expect(values).toContain('RED')
    expect(values).toContain('BLUE')
  })

  it('augments particlebox attrs with audience and particle', () => {
    const names = augmentBraceAttrs([], 'particlebox').map((a) => a.name)
    expect(names).toContain('audience')
    expect(names).toContain('particle')
    expect(names).toContain('color')
  })

  it('offers @ audience starters when typed value starts with @', () => {
    const options = optionsForAttr(
      'particle',
      { name: 'audience', type: 'enum' },
      [],
      [],
      [],
      [],
      '',
      '@',
    )
    expect(options.some((o) => o.label === '@Owner')).toBe(true)
    expect(options.some((o) => o.label === 'tracked')).toBe(false)
  })
})
