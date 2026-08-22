import { describe, expect, it } from 'vitest'
import { extractTopLevelIds, parseYaml } from './parseYaml'

describe('parseYaml', () => {
  it('returns data for valid yaml', () => {
    const result = parseYaml('FOO:\n  Type: ZOMBIE\n')
    expect(result.issues).toEqual([])
    expect(extractTopLevelIds(result.data)).toEqual(['FOO'])
  })

  it('returns a line number for invalid yaml', () => {
    const result = parseYaml('FOO:\n  Type: ZOMBIE\n BAD')
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0]?.line).toBeGreaterThan(0)
  })
})
