import { describe, expect, it } from 'vitest'
import {
  deepEqualYaml,
  mergeInherited,
  parseExcludeList,
  parseTemplateRefs,
  resolveMob,
  type MobBody,
} from './templates'

describe('parseTemplateRefs', () => {
  it('parses string, comma list, and YAML list', () => {
    expect(parseTemplateRefs('BaseA')).toEqual(['BaseA'])
    expect(parseTemplateRefs('BaseA, BaseB')).toEqual(['BaseA', 'BaseB'])
    expect(parseTemplateRefs(['BaseA', 'BaseB, BaseC'])).toEqual(['BaseA', 'BaseB', 'BaseC'])
    expect(parseTemplateRefs(null)).toEqual([])
  })
})

describe('parseExcludeList', () => {
  it('parses list and comma string', () => {
    expect(parseExcludeList(['Skills', 'Drops'])).toEqual(['Skills', 'Drops'])
    expect(parseExcludeList('Skills, Drops')).toEqual(['Skills', 'Drops'])
  })
})

describe('deepEqualYaml', () => {
  it('compares nested structures', () => {
    expect(deepEqualYaml({ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] })).toBe(true)
    expect(deepEqualYaml({ a: 1 }, { a: 2 })).toBe(false)
  })
})

describe('mergeInherited', () => {
  it('lets scalars override and concatenates skill lists', () => {
    const base: MobBody = {
      Faction: 'Undead',
      Health: 20,
      Skills: ['SKILL_A'],
      Options: { MovementSpeed: 0.2, AlwaysShowName: true },
    }
    const overlay: MobBody = {
      Health: 40,
      Skills: ['SKILL_B'],
      Options: { MovementSpeed: 0.3, Silent: true },
    }
    const merged = mergeInherited(base, overlay)
    expect(merged.Faction).toBe('Undead')
    expect(merged.Health).toBe(40)
    expect(merged.Skills).toEqual(['SKILL_A', 'SKILL_B'])
    expect(merged.Options).toEqual({
      MovementSpeed: 0.3,
      AlwaysShowName: true,
      Silent: true,
    })
  })

  it('last-wins equipment slots when detectable', () => {
    const merged = mergeInherited(
      { Equipment: ['Iron_Helmet HEAD', 'Iron_Sword HAND'] },
      { Equipment: ['Diamond_Helmet HEAD'] },
    )
    expect(merged.Equipment).toEqual(['Diamond_Helmet HEAD', 'Iron_Sword HAND'])
  })
})

describe('resolveMob', () => {
  it('applies multi-template order left to right then child', () => {
    const mobs: Record<string, MobBody> = {
      BaseA: { Faction: 'A', Health: 10, Skills: ['A1'] },
      BaseB: { Faction: 'B', Damage: 2, Skills: ['B1'] },
      Child: {
        Template: 'BaseA, BaseB',
        Health: 50,
        Skills: ['C1'],
      },
    }
    const { body, cycle, missing } = resolveMob('Child', mobs)
    expect(cycle).toBe(false)
    expect(missing).toEqual([])
    expect(body.Faction).toBe('B')
    expect(body.Damage).toBe(2)
    expect(body.Health).toBe(50)
    expect(body.Skills).toEqual(['A1', 'B1', 'C1'])
  })

  it('applies Exclude before child overlay', () => {
    const mobs: Record<string, MobBody> = {
      Base: {
        Faction: 'Undead',
        Skills: ['BASE_SKILL'],
        Options: { Silent: true },
      },
      Child: {
        Template: 'Base',
        Exclude: ['Skills'],
        Health: 30,
      },
    }
    const { body } = resolveMob('Child', mobs)
    expect(body.Faction).toBe('Undead')
    expect(body.Skills).toBeUndefined()
    expect(body.Health).toBe(30)
  })

  it('flags cycles and stops', () => {
    const mobs: Record<string, MobBody> = {
      A: { Template: 'B', Faction: 'A' },
      B: { Template: 'A', Faction: 'B' },
    }
    const result = resolveMob('A', mobs)
    expect(result.cycle).toBe(true)
  })

  it('reports missing template ids', () => {
    const mobs: Record<string, MobBody> = {
      Child: { Template: 'MissingBase', Health: 10 },
    }
    const { missing, body } = resolveMob('Child', mobs)
    expect(missing).toEqual(['MissingBase'])
    expect(body.Health).toBe(10)
  })
})
