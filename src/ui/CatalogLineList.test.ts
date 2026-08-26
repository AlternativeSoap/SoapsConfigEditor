import { describe, expect, it } from 'vitest'
import {
  formatCatalogLine,
  linesFromMultiline,
  multilineFromRows,
  parseCatalogLine,
} from './CatalogLineList'

describe('CatalogLineList helpers', () => {
  it('parses brace attributes and space args', () => {
    expect(parseCatalogLine('meleeattack{speed=1}')).toEqual({
      id: 'meleeattack',
      params: '{speed=1}',
    })
    expect(parseCatalogLine('specificfaction good')).toEqual({
      id: 'specificfaction',
      params: 'good',
    })
    expect(parseCatalogLine('clear')).toEqual({ id: 'clear', params: '' })
  })

  it('round-trips multiline AI lists', () => {
    const text = 'clear\nmeleeattack\nspecificfaction good'
    expect(multilineFromRows(linesFromMultiline(text))).toBe(text)
    expect(formatCatalogLine({ id: 'gotospawn', params: '{speed=1}' })).toBe('gotospawn{speed=1}')
  })
})
