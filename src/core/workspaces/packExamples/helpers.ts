import type { FileRecord } from '../../../types'

export function exampleFile(
  path: string,
  content: string,
  pack: string,
  category: FileRecord['category'],
): FileRecord {
  const name = path.split('/').pop() ?? path
  return { path, name, pack, category, content, ids: [] }
}

export function packBase(packName: string): string {
  return `MythicMobs/Packs/${packName}`
}
