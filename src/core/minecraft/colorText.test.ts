import { describe, expect, it } from 'vitest'
import { hexCode, insertAtSelection, parseMinecraftText } from './colorText'

describe('minecraft color text', () => {
  it('inserts a code at the cursor', () => {
    const result = insertAtSelection('Hello', 0, 0, '&c')
    expect(result.next).toBe('&cHello')
  })

  it('wraps selected text and resets after', () => {
    const result = insertAtSelection('Hello', 0, 5, '&6')
    expect(result.next).toBe('&6Hello&r')
  })

  it('builds hex codes', () => {
    expect(hexCode('#00ffff')).toBe('&#00FFFF')
  })

  it('parses legacy and hex colors', () => {
    const spans = parseMinecraftText('&cRed &#00FF00Green')
    expect(spans[0]?.color).toBe('#FF5555')
    expect(spans[0]?.text).toBe('Red ')
    expect(spans[1]?.color).toBe('#00FF00')
    expect(spans[1]?.text).toBe('Green')
  })
})
