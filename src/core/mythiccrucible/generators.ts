import { formatSkillsYamlBlock, yamlQuoted } from '../mythicmobs/generators'
import type {
  AugmentTypeGeneratorInput,
  CrucibleItemGeneratorInput,
  EquipmentSetGeneratorInput,
} from '../../types'

function listLines(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function pushSkillsBlock(lines: string[], raw: string, indent: string): void {
  const block = formatSkillsYamlBlock(raw, { indent })
  if (block) lines.push(block)
}

export function resolvePackRoot(files: { path: string; pack: string }[], packName: string): string {
  const hit = files.find((f) => f.pack === packName)
  if (!hit) return `MythicMobs/Packs/${packName}`
  const normalized = hit.path.replace(/\\/g, '/')
  const packsIdx = normalized.indexOf('/Packs/')
  if (packsIdx >= 0) {
    const after = normalized.slice(packsIdx + '/Packs/'.length)
    const packSeg = after.split('/')[0]
    return normalized.slice(0, packsIdx + '/Packs/'.length + (packSeg?.length ?? 0))
  }
  return `MythicMobs/Packs/${packName}`
}

export function suggestEquipmentSetPath(packRoot: string): string {
  return `${packRoot}/equipment-sets.yml`
}

export function suggestAugmentsPath(packRoot: string): string {
  return `${packRoot}/augments.yml`
}

export function suggestCrucibleItemPath(packRoot: string): string {
  return `${packRoot}/Items/items.yml`
}

export function generateEquipmentSetYaml(input: EquipmentSetGeneratorInput): string {
  const id = input.id.trim().toUpperCase().replace(/\s+/g, '_') || 'MY_SET'
  const lines: string[] = [`${id}:`]
  lines.push(`  Enabled: ${input.enabled}`)
  lines.push(`  Display: ${yamlQuoted(input.display.trim() || id)}`)

  const lore = listLines(input.lore)
  if (lore.length > 0) {
    lines.push('  Lore:')
    for (const line of lore) {
      lines.push(`  - ${yamlQuoted(line)}`)
    }
  }

  const bonuses = input.bonuses.filter((b) => b.pieces > 0)
  if (bonuses.length > 0) {
    lines.push('  Bonuses:')
    for (const bonus of bonuses) {
      lines.push(`  - Pieces: ${bonus.pieces}`)
      const stats = listLines(bonus.stats)
      if (stats.length > 0) {
        lines.push('    Stats:')
        for (const stat of stats) {
          lines.push(`    - ${stat}`)
        }
      }
      pushSkillsBlock(lines, bonus.skills, '    ')
    }
  }

  return `${lines.join('\n')}\n`
}

export function generateAugmentTypeYaml(input: AugmentTypeGeneratorInput): string {
  const id = input.id.trim().toUpperCase().replace(/\s+/g, '_') || 'GEM'
  const lines: string[] = [`${id}:`]
  lines.push(`  Enabled: ${input.enabled}`)
  lines.push(`  Display: ${yamlQuoted(input.display.trim() || id)}`)
  lines.push('  Formatting:')
  lines.push(`    Empty: ${yamlQuoted(input.emptyFormat)}`)
  lines.push(`    Filled: ${yamlQuoted(input.filledFormat)}`)
  lines.push(`    ShowEmptySlot: ${input.showEmptySlot}`)
  lines.push('  Icons:')
  lines.push(`    Empty: ${yamlQuoted(input.iconEmpty)}`)
  lines.push(`    Filled: ${yamlQuoted(input.iconFilled)}`)
  lines.push(`    Invalid: ${yamlQuoted(input.iconInvalid)}`)
  return `${lines.join('\n')}\n`
}

export function generateCrucibleItemYaml(input: CrucibleItemGeneratorInput): string {
  const id = input.id.trim().replace(/\s+/g, '_') || 'MY_ITEM'
  const lines: string[] = [`${id}:`]
  lines.push(`  Id: ${input.material.trim().toUpperCase() || 'STONE'}`)

  if (input.itemKind === 'BAG') {
    lines.push('  Type: BAG')
  } else if (input.itemKind === 'HAT') {
    lines.push('  Type: HAT')
  }

  if (input.display.trim()) {
    lines.push(`  Display: ${yamlQuoted(input.display.trim())}`)
  }
  if (input.group.trim()) {
    lines.push(`  Group: ${yamlQuoted(input.group.trim())}`)
  }

  const loreLines = listLines(input.lore)
  if (input.loreTemplate.trim() || loreLines.length > 0) {
    lines.push('  Lore:')
    if (input.loreTemplate.trim()) {
      lines.push(`    Template: ${input.loreTemplate.trim()}`)
    }
    if (loreLines.length === 1 && !input.loreTemplate.trim()) {
      lines.push(`  - ${yamlQuoted(loreLines[0]!)}`)
    } else if (loreLines.length > 0) {
      if (input.loreTemplate.trim()) {
        lines.push(`    Description: ${yamlQuoted(loreLines.join(' '))}`)
      } else {
        for (const line of loreLines) {
          lines.push(`  - ${yamlQuoted(line)}`)
        }
      }
    }
  }

  const optionEntries: [string, boolean][] = [
    ['CancelDamage', input.optionsCancelDamage],
    ['KeepOnDeath', input.optionsKeepOnDeath],
    ['PreventDropping', input.optionsPreventDropping],
    ['Placeable', input.optionsPlaceable],
    ['PreventEnchanting', input.optionsPreventEnchanting],
    ['PreventStacking', input.optionsPreventStacking],
    ['Repairable', input.optionsRepairable],
  ]
  // Placeable defaults true in game; only emit when false (or other toggles that are true)
  const activeOptions = optionEntries.filter(([key, value]) => {
    if (key === 'Placeable' || key === 'Repairable') return !value
    return value
  })
  if (activeOptions.length > 0) {
    lines.push('  Options:')
    for (const [key, value] of activeOptions) {
      if (key === 'Placeable' || key === 'Repairable') {
        lines.push(`    ${key}: false`)
      } else {
        lines.push(`    ${key}: ${value}`)
      }
    }
  }

  if (input.itemUpdaterVersion > 0 || input.role === 'gem') {
    lines.push('  ItemUpdater:')
    lines.push(`    Version: ${input.itemUpdaterVersion}`)
  }

  if (input.maxDurability.trim()) {
    lines.push(`  MaxDurability: ${input.maxDurability.trim()}`)
  }
  if (input.durability.trim()) {
    lines.push(`  Durability: ${input.durability.trim()}`)
  }

  if (input.defaultLevel.trim() || input.maxLevel.trim()) {
    lines.push('  Upgrades:')
    if (input.defaultLevel.trim()) {
      lines.push(`    DefaultLevel: ${input.defaultLevel.trim()}`)
    }
    if (input.maxLevel.trim()) {
      lines.push(`    MaxLevel: ${input.maxLevel.trim()}`)
    }
  }

  if (input.equipmentSet.trim()) {
    lines.push(`  EquipmentSet: ${input.equipmentSet.trim().toUpperCase()}`)
  }

  const stats = listLines(input.stats)
  if (stats.length > 0 && input.role !== 'socket' && input.role !== 'remover') {
    if (input.role === 'gem') {
      // Stats go under Augmentation below
    } else {
      lines.push('  Stats:')
      for (const stat of stats) {
        lines.push(`  - ${stat}`)
      }
    }
  }

  if (input.role === 'standard' && input.augmentSlotType.trim()) {
    lines.push('  AugmentationSlots:')
    lines.push(`    Type: ${input.augmentSlotType.trim().toUpperCase()}`)
    lines.push(`    Amount: ${input.augmentSlotAmount.trim() || '1'}`)
    if (input.augmentSlotChance.trim()) {
      lines.push(`    Chance: ${input.augmentSlotChance.trim()}`)
    }
    if (input.augmentSlotMaxAmount.trim()) {
      lines.push(`    MaxAmount: ${input.augmentSlotMaxAmount.trim()}`)
    }
  }

  if (input.role === 'gem' && input.augmentType.trim()) {
    lines.push('  Augmentation:')
    lines.push(`    Type: ${input.augmentType.trim().toUpperCase()}`)
    if (input.augmentTooltip.trim()) {
      lines.push(`    Tooltip: ${yamlQuoted(input.augmentTooltip.trim())}`)
    }
    if (stats.length > 0) {
      lines.push('    Stats:')
      for (const stat of stats) {
        lines.push(`    - ${stat}`)
      }
    }
    pushSkillsBlock(lines, input.skills, '    ')
  }

  if (input.role === 'socket' && input.augmentType.trim()) {
    lines.push('  AugmentationSocket:')
    lines.push(`    Type: ${input.augmentType.trim().toUpperCase()}`)
    lines.push(`    MaxSockets: ${input.augmentSocketMaxSockets}`)
  }

  if (input.role === 'remover' && input.augmentType.trim()) {
    lines.push('  AugmentationRemover:')
    lines.push(`    Type: ${input.augmentType.trim().toUpperCase()}`)
    lines.push(`    DestroySocket: ${input.augmentRemoverDestroySocket}`)
    lines.push(`    ReturnAugment: ${input.augmentRemoverReturnAugment}`)
  }

  if (input.itemKind === 'BAG') {
    lines.push('  Inventory:')
    lines.push(`    Size: ${input.bagSize}`)
    lines.push(`    Title: ${yamlQuoted(input.bagTitle.trim() || input.display.trim() || 'Bag')}`)
    lines.push(`    PreventBagNesting: ${input.bagPreventNesting}`)
    lines.push(`    SaveOnItemUpdate: ${input.bagSaveOnUpdate}`)
    if (input.bagAutoPickup) {
      lines.push('    AutoPickup:')
      lines.push('      Enabled: true')
      lines.push('      OnlyWhenFull: true')
    }
  }

  if (input.role !== 'gem') {
    pushSkillsBlock(lines, input.skills, '  ')
  }

  if (input.recipeType && listLines(input.recipeIngredients).length > 0) {
    const ingredients = listLines(input.recipeIngredients)
    lines.push('  Recipes:')
    lines.push(`    ${input.recipeType}_1:`)
    lines.push(`      Type: ${input.recipeType}`)
    lines.push('      Amount: 1')
    lines.push('      Ingredients:')
    for (const row of ingredients) {
      lines.push(`      - ${row}`)
    }
  }

  return `${lines.join('\n')}\n`
}
