import { describe, expect, it } from 'vitest'
import { isCompletedYamlKeyLine, nextLineIndentAfterKey } from '../yaml/guidedEnter'

describe('guidedEnter', () => {
  it('detects completed entity and body key lines', () => {
    expect(isCompletedYamlKeyLine('MyMob:')).toBe(true)
    expect(isCompletedYamlKeyLine('  Type: ZOMBIE')).toBe(true)
    expect(isCompletedYamlKeyLine('  Options:')).toBe(true)
    expect(isCompletedYamlKeyLine('  Typ')).toBe(false)
    expect(isCompletedYamlKeyLine('')).toBe(false)
  })

  it('nests under bare section headers and keeps sibling indent for values', () => {
    expect(nextLineIndentAfterKey('MyMob:', 'mobs')).toBe(2)
    expect(nextLineIndentAfterKey('  Type: ZOMBIE', 'mobs')).toBe(2)
    expect(nextLineIndentAfterKey('  Options:', 'mobs')).toBe(4)
    expect(nextLineIndentAfterKey('  DisplayOptions:', 'mobs')).toBe(4)
    expect(nextLineIndentAfterKey('    Billboard: FIXED', 'mobs')).toBe(4)
  })
})
