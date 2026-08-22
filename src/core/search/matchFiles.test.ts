import { describe, expect, it } from 'vitest'
import type { FileRecord } from '../../types'
import { matchesSearch } from './matchFiles'

const sample: FileRecord = {
  path: 'Custom Mobs/Mobs/Zombies.yml',
  name: 'Zombies.yml',
  pack: 'Custom Mobs',
  category: 'mobs',
  content: 'IRONSPIRE_ZOMBIE:\n  Type: ZOMBIE\n',
  ids: ['IRONSPIRE_ZOMBIE'],
}

describe('matchesSearch', () => {
  it('matches empty query', () => {
    expect(matchesSearch(sample, '')).toBe(true)
  })

  it('matches path, id, and file text', () => {
    expect(matchesSearch(sample, 'zombies')).toBe(true)
    expect(matchesSearch(sample, 'IRONSPIRE')).toBe(true)
    expect(matchesSearch(sample, 'Type: ZOMBIE')).toBe(true)
    expect(matchesSearch(sample, 'not-here')).toBe(false)
  })
})
