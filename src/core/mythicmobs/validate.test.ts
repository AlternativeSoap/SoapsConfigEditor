import { describe, expect, it } from 'vitest'
import type { FileRecord } from '../../types'
import { validateDroptableReferences } from './validate'

function mobFile(content: string, path = 'Mobs/mobs.yml'): FileRecord {
  return {
    path,
    content,
    category: 'mobs',
    ids: ['internal_name'],
    packName: 'Test',
  }
}

describe('validateDroptableReferences', () => {
  it('does not flag vanilla materials as missing drop tables', () => {
    const files: FileRecord[] = [
      mobFile(`internal_name:
  Type: ZOMBIE
  Drops:
  - DIAMOND 10 1
  - diamond 32 1
  - netherite_ingot 12 0.5
  - exp 5
`),
    ]
    expect(validateDroptableReferences(files)).toEqual([])
  })

  it('does not flag pack mythic items or known droptables', () => {
    const files: FileRecord[] = [
      mobFile(`Boss:
  Type: ZOMBIE
  Drops:
  - CoolSword 1 1
  - BossLoot 1
`),
      {
        path: 'Items/items.yml',
        content: 'CoolSword:\n  Id: DIAMOND_SWORD\n',
        category: 'items',
        ids: ['CoolSword'],
        packName: 'Test',
      },
      {
        path: 'DropTables/droptables.yml',
        content: 'BossLoot:\n  Drops:\n  - exp 10\n',
        category: 'droptables',
        ids: ['BossLoot'],
        packName: 'Test',
      },
    ]
    expect(validateDroptableReferences(files)).toEqual([])
  })

  it('flags unknown drop ids that are not materials or pack items', () => {
    const files: FileRecord[] = [
      mobFile(`internal_name:
  Type: ZOMBIE
  Drops:
  - MissingTable 1 1
`),
    ]
    const issues = validateDroptableReferences(files)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.missingId).toBe('MissingTable')
  })

  it('accepts inline item drops with brace attributes', () => {
    const files: FileRecord[] = [
      mobFile(`internal_name:
  Type: ZOMBIE
  Drops:
  - leather_chestplate{name="Dark Leather"} 1 1
  - DIAMOND_SWORD{enchants=DAMAGE_ALL:1} 1 1
`),
    ]
    expect(validateDroptableReferences(files)).toEqual([])
  })
})
