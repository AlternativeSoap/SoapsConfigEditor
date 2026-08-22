import { describe, expect, it } from 'vitest'
import { MECHANICS } from '../../data/mythicmobs/mechanics'
import { enumOptionsFromDesc, valuesForAttr } from './attrValueCompletions'

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
})
