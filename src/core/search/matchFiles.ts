import type { FileRecord } from '../../types'

export function matchesSearch(file: FileRecord, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  if (file.path.toLowerCase().includes(needle)) return true
  if (file.name.toLowerCase().includes(needle)) return true
  if (file.ids.some((id) => id.toLowerCase().includes(needle))) return true
  return file.content.toLowerCase().includes(needle)
}
