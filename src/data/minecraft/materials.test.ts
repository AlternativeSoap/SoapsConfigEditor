import { describe, expect, it } from 'vitest'
import { searchMaterials, MINECRAFT_MATERIALS } from './materials'

describe('searchMaterials', () => {
  it('returns diamond materials when query is diamond', () => {
    const results = searchMaterials('diamond', 20)
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((m) => m.includes('DIAMOND'))).toBe(true)
    expect(results).toContain('DIAMOND')
    expect(results).toContain('DIAMOND_SWORD')
  })

  it('prefers names that start with the query', () => {
    const results = searchMaterials('iron', 10)
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((m) => m.startsWith('IRON'))).toBe(true)
  })

  it('returns first materials when query is empty', () => {
    const results = searchMaterials('', 5)
    expect(results).toEqual(MINECRAFT_MATERIALS.slice(0, 5))
  })
})
