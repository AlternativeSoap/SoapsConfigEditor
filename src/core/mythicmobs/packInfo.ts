import { yamlQuoted } from './generators'

/** https://wiki.mythiccraft.io/mythicmobs/Packs */
export interface PackInfoInput {
  name: string
  version?: string
  author?: string
  iconMaterial?: string
  iconModel?: number
  url?: string
  description?: string[]
  headerComments?: string[]
}

export interface PackInfoFieldDef {
  key: string
  detail: string
  apply?: string
}

/** Root keys for packinfo.yml (wiki format). */
export const PACK_INFO_ROOT_FIELDS: PackInfoFieldDef[] = [
  { key: 'Name', detail: 'Pack name in /mm menu', apply: 'Name: ' },
  { key: 'Version', detail: 'Semver shown to players', apply: 'Version: 1.0.0' },
  { key: 'Author', detail: 'Creator or team name', apply: 'Author: ' },
  { key: 'Icon', detail: 'Item icon in the pack browser', apply: 'Icon:\n  Material: PAPER\n  Model: 0\n' },
  { key: 'URL', detail: 'Website or support link', apply: "URL: ''" },
  {
    key: 'Description',
    detail: 'Multi-line hover text (color codes allowed)',
    apply: 'Description:\n- \'&7Short summary of this pack.\'\n- \'&7Add more lines as needed.&r\'\n',
  },
]

/** Keys under Icon: */
export const PACK_INFO_ICON_FIELDS: PackInfoFieldDef[] = [
  { key: 'Material', detail: 'Bukkit material name', apply: 'Material: PAPER' },
  { key: 'Model', detail: 'CustomModelData for the icon item', apply: 'Model: 0' },
]

/** Legacy nested Pack: block (still accepted by some packs). */
export const PACK_INFO_LEGACY_PACK_FIELDS: PackInfoFieldDef[] = [
  { key: 'Name', detail: 'Pack name', apply: 'Name: ' },
  { key: 'Version', detail: 'Pack version', apply: 'Version: 1.0.0' },
  { key: 'Author', detail: 'Author name', apply: 'Author: ' },
  { key: 'Description', detail: 'Description lines', apply: 'Description:\n- \'\'\n' },
]

export const PACK_INFO_DESCRIPTION_SNIPPETS = [
  '&7A short summary of this pack.',
  '&7Shown when players hover this pack in &a/mm menu&7.',
  '&aColor codes work here.&r',
]

/** Common icon materials for the pack browser (full list still available when typing). */
export const PACK_INFO_ICON_MATERIALS = [
  'PAPER',
  'BOOK',
  'WRITTEN_BOOK',
  'MAP',
  'COMPASS',
  'DIAMOND',
  'EMERALD',
  'NETHER_STAR',
  'BLAZE_ROD',
  'END_CRYSTAL',
  'TOTEM_OF_UNDYING',
  'CHEST',
  'ENDER_CHEST',
  'PLAYER_HEAD',
  'FIREWORK_ROCKET',
  'EXPERIENCE_BOTTLE',
  'ENCHANTED_BOOK',
  'GOLDEN_APPLE',
  'DRAGON_EGG',
  'BEACON',
]

export function isPackInfoFile(filePath: string | undefined): boolean {
  if (!filePath) return false
  const base = filePath.replace(/\\/g, '/').split('/').pop()?.toLowerCase() ?? ''
  return base === 'packinfo.yml' || base.startsWith('packinfo.')
}

export function generatePackInfoYaml(input: PackInfoInput): string {
  const name = input.name.trim() || 'My Pack'
  const lines: string[] = []

  if (input.headerComments?.length) {
    for (const comment of input.headerComments) {
      lines.push(`# ${comment}`)
    }
  } else {
    lines.push('# Pack metadata for /mm menu.')
    lines.push('# https://wiki.mythiccraft.io/mythicmobs/Packs')
  }

  lines.push(`Name: ${yamlQuoted(name)}`)
  lines.push(`Version: ${input.version?.trim() || '1.0.0'}`)
  lines.push(`Author: ${yamlQuoted(input.author?.trim() || 'Your name')}`)
  lines.push('Icon:')
  lines.push(`  Material: ${input.iconMaterial?.trim().toUpperCase() || 'PAPER'}`)
  lines.push(`  Model: ${input.iconModel ?? 0}`)

  const url = input.url?.trim()
  lines.push(url ? `URL: ${yamlQuoted(url)}` : "URL: ''")

  const description =
    input.description?.filter((line) => line.trim().length > 0) ??
    PACK_INFO_DESCRIPTION_SNIPPETS.slice(0, 2)
  lines.push('Description:')
  for (const line of description) {
    lines.push(`- ${yamlQuoted(line)}`)
  }

  return `${lines.join('\n')}\n`
}
