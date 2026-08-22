import { describe, expect, it } from 'vitest'
import {
  attrInsertPrefix,
  insertAttrIntoMechanicBlock,
  parseAttrNames,
  parseSkillLineContext,
} from './skillLineAttrs'
import { MECHANICS } from '../../data/mythicmobs/mechanics'

const damage = MECHANICS.find((m) => m.id === 'damage')!

describe('skillLineAttrs', () => {
  it('parses present attrs on a mechanic line', () => {
    const ctx = parseSkillLineContext('  - damage{amount=5;ignorearmor=false} @EntitiesInRadius{r=10}')
    expect(ctx.mechanicId).toBe('damage')
    expect(ctx.presentAttrs).toEqual(['amount', 'ignorearmor'])
    expect(ctx.targeters.get('entitiesinradius')).toEqual(['r'])
  })

  it('parseAttrNames ignores incomplete trailing keys', () => {
    expect([...parseAttrNames('amount=5;igno')]).toEqual(['amount'])
  })

  it('parseAttrNames treats trailing semicolon as complete separator', () => {
    expect([...parseAttrNames('amount=5;')]).toEqual(['amount'])
    expect([...parseAttrNames('amount=5;;')]).toEqual(['amount'])
  })

  it('attrInsertPrefix avoids double semicolons', () => {
    expect(attrInsertPrefix('')).toBe('')
    expect(attrInsertPrefix('amount=5')).toBe(';')
    expect(attrInsertPrefix('amount=5;')).toBe('')
    expect(attrInsertPrefix('amount=5; ')).toBe('')
  })

  it('inserts after trailing semicolon without doubling it', () => {
    const next = insertAttrIntoMechanicBlock(
      '  - damage{amount=5;}',
      damage,
      { name: 'ignorearmor', type: 'boolean', default: 'false' },
    )
    expect(next).toBe('  - damage{amount=5;ignorearmor=false}')
  })

  it('inserts a new attribute before the closing brace', () => {
    const next = insertAttrIntoMechanicBlock(
      '  - damage{amount=5} @target',
      damage,
      { name: 'ignorearmor', type: 'boolean', default: 'false' },
    )
    expect(next).toBe('  - damage{amount=5;ignorearmor=false} @target')
  })

  it('returns null when attribute already exists', () => {
    const next = insertAttrIntoMechanicBlock(
      '  - damage{amount=5} @target',
      damage,
      { name: 'amount', type: 'number', default: '1' },
    )
    expect(next).toBeNull()
  })
})
