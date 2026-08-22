import type { FileRecord, MythicCategory } from '../../types'

export const CATEGORY_LABEL: Record<MythicCategory, string> = {
  mobs: 'Mobs',
  items: 'Items',
  skills: 'Skills',
  droptables: 'Drop tables',
  randomspawns: 'Random spawns',
  menus: 'Menus',
  classes: 'Classes',
  'exp-curves': 'Exp curves',
  gui: 'GUI',
  other: 'Other',
}

export interface PackNode {
  pack: string
  categories: CategoryNode[]
  fileCount: number
}

export interface CategoryNode {
  category: MythicCategory
  label: string
  files: FileRecord[]
}

export function buildPackTree(files: FileRecord[]): PackNode[] {
  const packs = new Map<string, Map<MythicCategory, FileRecord[]>>()

  for (const file of files) {
    const categories = packs.get(file.pack) ?? new Map<MythicCategory, FileRecord[]>()
    const list = categories.get(file.category) ?? []
    list.push(file)
    categories.set(file.category, list)
    packs.set(file.pack, categories)
  }

  return [...packs.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([pack, categories]) => {
      const nodes: CategoryNode[] = [...categories.entries()]
        .sort((a, b) => CATEGORY_LABEL[a[0]].localeCompare(CATEGORY_LABEL[b[0]]))
        .map(([category, categoryFiles]) => ({
          category,
          label: CATEGORY_LABEL[category],
          files: categoryFiles.sort((a, b) => a.name.localeCompare(b.name)),
        }))
      return {
        pack,
        categories: nodes,
        fileCount: nodes.reduce((sum, node) => sum + node.files.length, 0),
      }
    })
}

export function categoryKey(pack: string, category: MythicCategory): string {
  return `${pack}::${category}`
}
