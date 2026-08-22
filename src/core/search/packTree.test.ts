import { describe, expect, it } from 'vitest'
import type { FileRecord } from '../../types'
import { buildPackTree } from './packTree'

function file(path: string, pack: string, category: FileRecord['category']): FileRecord {
  return {
    path,
    name: path.split('/').pop() ?? path,
    pack,
    category,
    content: '',
    ids: [],
  }
}

describe('buildPackTree', () => {
  it('nests files under pack then category', () => {
    const tree = buildPackTree([
      file('A/Mobs/one.yml', 'A', 'mobs'),
      file('A/Items/two.yml', 'A', 'items'),
      file('B/Mobs/three.yml', 'B', 'mobs'),
    ])
    expect(tree.map((node) => node.pack)).toEqual(['A', 'B'])
    expect(tree[0]?.fileCount).toBe(2)
    expect(tree[0]?.categories.map((node) => node.category)).toEqual(['items', 'mobs'])
  })
})
