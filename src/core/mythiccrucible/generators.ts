import { formatSkillsYamlBlock, yamlQuoted } from '../mythicmobs/generators'
import type {
  AugmentTypeGeneratorInput,
  CrucibleItemGeneratorInput,
  CrucibleLoreTemplateGeneratorInput,
  CruciblePlaceholderGeneratorInput,
  CrucibleStatGeneratorInput,
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

function parseDescRows(rows: { level: string; text: string }[]): { level: string; text: string }[] {
  return rows.filter((r) => r.level.trim() && r.text.trim())
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

export function suggestCrucibleStatsPath(packRoot: string): string {
  return `${packRoot}/stats.yml`
}

export function suggestLoreTemplatesPath(packRoot: string): string {
  return `${packRoot}/lore-templates.yml`
}

export function suggestPlaceholdersPath(packRoot: string): string {
  return `${packRoot}/placeholders.yml`
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

export function generateCrucibleStatYaml(input: CrucibleStatGeneratorInput): string {
  const id = input.id.trim().toUpperCase().replace(/\s+/g, '_') || 'MY_STAT'
  const lines: string[] = [`${id}:`]
  if (input.display.trim()) {
    lines.push(`  Display: ${yamlQuoted(input.display.trim())}`)
  }
  lines.push(`  BaseValue: ${input.baseValue}`)
  if (input.formattingEnabled) {
    lines.push('  Formatting:')
    lines.push('    Enabled: true')
    if (input.nameFormat.trim()) {
      lines.push(`    Name: ${yamlQuoted(input.nameFormat.trim())}`)
    }
    if (input.valueFormat.trim()) {
      lines.push(`    Value: ${yamlQuoted(input.valueFormat.trim())}`)
    }
  }
  return `${lines.join('\n')}\n`
}

export function generateLoreTemplateYaml(input: CrucibleLoreTemplateGeneratorInput): string {
  const id = input.id.trim().replace(/\s+/g, '_') || 'MyTemplate'
  const lines: string[] = [`${id}:`]
  lines.push('  Lines:')
  const loreLines = listLines(input.lines)
  if (loreLines.length === 0) {
    lines.push(`  - ''`)
  } else {
    for (const line of loreLines) {
      lines.push(`  - ${yamlQuoted(line)}`)
    }
  }
  return `${lines.join('\n')}\n`
}

export function generatePlaceholderYaml(input: CruciblePlaceholderGeneratorInput): string {
  const id = input.id.trim().replace(/\s+/g, '_') || 'MyPlaceholder'
  if (input.kind === 'simple') {
    return `${id}: ${yamlQuoted(input.value.trim() || 'value')}\n`
  }
  if (input.kind === 'random') {
    const values = listLines(input.randomValues)
    const lines: string[] = [`${id}:`]
    for (const v of values.length ? values : ['red', 'green', 'blue']) {
      lines.push(`- ${yamlQuoted(v)}`)
    }
    return `${lines.join('\n')}\n`
  }
  const lines: string[] = [`${id}:`]
  if (input.dayValue.trim()) {
    lines.push('  Day:')
    lines.push('    Conditions:')
    lines.push('    - day')
    lines.push(`    Value: ${yamlQuoted(input.dayValue.trim())}`)
  }
  if (input.nightValue.trim()) {
    lines.push('  Night:')
    lines.push('    Conditions:')
    lines.push('    - night')
    lines.push(`    Value: ${yamlQuoted(input.nightValue.trim())}`)
  }
  lines.push(`  Default: ${yamlQuoted(input.defaultValue.trim() || 'default')}`)
  return `${lines.join('\n')}\n`
}

function emitAugmentSlots(lines: string[], input: CrucibleItemGeneratorInput): void {
  const slots = input.augmentSlots.filter((s) => s.type.trim())
  if (slots.length === 0) return
  lines.push('  AugmentationSlots:')
  if (slots.length === 1) {
    const slot = slots[0]!
    lines.push(`    Type: ${slot.type.trim().toUpperCase()}`)
    lines.push(`    Amount: ${slot.amount.trim() || '1'}`)
    if (slot.chance.trim()) lines.push(`    Chance: ${slot.chance.trim()}`)
    if (slot.maxAmount.trim()) lines.push(`    MaxAmount: ${slot.maxAmount.trim()}`)
    return
  }
  for (const slot of slots) {
    lines.push(`  - Type: ${slot.type.trim().toUpperCase()}`)
    lines.push(`    Amount: ${slot.amount.trim() || '1'}`)
    if (slot.chance.trim()) lines.push(`    Chance: ${slot.chance.trim()}`)
    if (slot.maxAmount.trim()) lines.push(`    MaxAmount: ${slot.maxAmount.trim()}`)
  }
}

function emitUpgrades(lines: string[], input: CrucibleItemGeneratorInput): void {
  const levelRows = parseDescRows(input.levelDescriptions)
  const upgradeRows = parseDescRows(input.upgradeDescriptions)
  const equations = listLines(input.upgradeEquations)
  const hasAny =
    input.defaultLevel.trim() ||
    input.maxLevel.trim() ||
    input.setEquipLevel ||
    input.defaultLevelDescription.trim() ||
    input.defaultUpgradeDescription.trim() ||
    levelRows.length > 0 ||
    upgradeRows.length > 0 ||
    equations.length > 0
  if (!hasAny) return

  lines.push('  Upgrades:')
  if (input.defaultLevel.trim()) lines.push(`    DefaultLevel: ${input.defaultLevel.trim()}`)
  if (input.maxLevel.trim()) lines.push(`    MaxLevel: ${input.maxLevel.trim()}`)
  if (input.setEquipLevel) lines.push('    SetEquipLevel: true')
  if (input.defaultUpgradeDescription.trim()) {
    lines.push(`    DefaultUpgradeDescription: ${yamlQuoted(input.defaultUpgradeDescription.trim())}`)
  }
  if (upgradeRows.length > 0) {
    lines.push('    UpgradeDescription:')
    for (const row of upgradeRows) {
      lines.push(`      ${row.level.trim()}: ${yamlQuoted(row.text.trim())}`)
    }
  }
  if (input.defaultLevelDescription.trim()) {
    lines.push(`    DefaultLevelDescription: ${yamlQuoted(input.defaultLevelDescription.trim())}`)
  }
  if (levelRows.length > 0) {
    lines.push('    LevelDescription:')
    for (const row of levelRows) {
      lines.push(`      ${row.level.trim()}: ${yamlQuoted(row.text.trim())}`)
    }
  }
  if (equations.length > 0) {
    lines.push('    Stats:')
    lines.push('      Equations:')
    for (const eq of equations) {
      lines.push(`      - ${eq}`)
    }
  }
}

function emitBagInventory(lines: string[], input: CrucibleItemGeneratorInput): void {
  const blacklist = listLines(input.bagBlacklist)
  const whitelist = listLines(input.bagWhitelist)
  lines.push('  Inventory:')
  lines.push(`    Size: ${input.bagSize}`)
  lines.push(`    Title: ${yamlQuoted(input.bagTitle.trim() || input.display.trim() || 'Bag')}`)
  lines.push(`    PreventBagNesting: ${input.bagPreventNesting}`)
  lines.push(`    SaveOnItemUpdate: ${input.bagSaveOnUpdate}`)
  if (input.bagAutoPickup || blacklist.length > 0 || whitelist.length > 0) {
    lines.push('    AutoPickup:')
    lines.push(`      Enabled: ${input.bagAutoPickup}`)
    if (input.bagAutoPickup) {
      lines.push(`      OnlyWhenFull: ${input.bagAutoPickupOnlyWhenFull}`)
    }
    if (blacklist.length > 0) {
      lines.push('      BlacklistedItems:')
      for (const item of blacklist) lines.push(`      - ${item}`)
    }
    if (whitelist.length > 0) {
      lines.push('      WhitelistedItems:')
      for (const item of whitelist) lines.push(`      - ${item}`)
    }
  }
  const hasSounds =
    input.bagSoundOpen.trim() ||
    input.bagSoundClose.trim() ||
    input.bagSoundPickup.trim() ||
    input.bagSoundVolume.trim() ||
    input.bagSoundPitch.trim()
  if (hasSounds) {
    lines.push('    Sounds:')
    if (input.bagSoundOpen.trim()) lines.push(`      Open: ${yamlQuoted(input.bagSoundOpen.trim())}`)
    if (input.bagSoundClose.trim()) lines.push(`      Close: ${yamlQuoted(input.bagSoundClose.trim())}`)
    if (input.bagSoundPickup.trim()) lines.push(`      Pickup: ${yamlQuoted(input.bagSoundPickup.trim())}`)
    if (input.bagSoundVolume.trim()) lines.push(`      Volume: ${input.bagSoundVolume.trim()}`)
    if (input.bagSoundPitch.trim()) lines.push(`      Pitch: ${input.bagSoundPitch.trim()}`)
  }
  if (input.bagNearlyFullEnabled) {
    lines.push('    Notifications:')
    lines.push('      NearlyFull:')
    lines.push('        Enabled: true')
    if (input.bagNearlyFullThreshold.trim()) {
      lines.push(`        Threshold: ${input.bagNearlyFullThreshold.trim()}`)
    }
    if (input.bagNearlyFullMessage.trim()) {
      lines.push(`        Message: ${yamlQuoted(input.bagNearlyFullMessage.trim())}`)
    }
  }
}

function emitCraftSkills(lines: string[], raw: string, indent: string): void {
  const block = formatSkillsYamlBlock(raw, { indent })
  if (!block) return
  lines.push(block.replace(`${indent}Skills:`, `${indent}CraftSkills:`))
}

function emitRecipes(lines: string[], input: CrucibleItemGeneratorInput): void {
  if (!input.recipeType) return
  const type = input.recipeType
  const cooking = ['FURNACE', 'CAMPFIRE', 'BLASTING', 'SMOKING', 'STONECUTTING'].includes(type)
  const shaped = type === 'SHAPED' || type === 'SHAPELESS'
  if (shaped && listLines(input.recipeIngredients).length === 0) return
  if (cooking && !input.recipeIngredient.trim()) return
  if (type === 'BREWING' && (!input.recipeIngredient.trim() || !input.recipeInputItem.trim())) return
  if (type === 'SMITHING' && !input.recipeIngredient.trim()) return

  lines.push('  Recipes:')
  lines.push(`    ${type}_1:`)
  lines.push(`      Type: ${type}`)
  lines.push(`      Amount: ${input.recipeAmount || 1}`)

  if (shaped) {
    lines.push('      Ingredients:')
    for (const row of listLines(input.recipeIngredients)) {
      lines.push(`      - ${row}`)
    }
    const leftover = listLines(input.recipeLeftover)
    if (leftover.length > 0) {
      lines.push('      IngredientsLeftover:')
      for (const left of leftover) lines.push(`      - ${left}`)
    }
    const conds = listLines(input.recipeConditions)
    if (conds.length > 0) {
      lines.push('      Conditions:')
      for (const c of conds) lines.push(`      - ${c}`)
    }
    emitCraftSkills(lines, input.recipeCraftSkills, '      ')
  } else if (cooking) {
    lines.push(`      Ingredient: ${input.recipeIngredient.trim()}`)
    if (input.recipeCookingTime.trim()) lines.push(`      CookingTime: ${input.recipeCookingTime.trim()}`)
    if (input.recipeExperience.trim()) lines.push(`      Experience: ${input.recipeExperience.trim()}`)
  } else if (type === 'SMITHING') {
    lines.push(`      Ingredient: ${input.recipeIngredient.trim()}`)
    if (input.recipeSmithingTemplate.trim()) {
      lines.push(`      Template: ${input.recipeSmithingTemplate.trim()}`)
    }
  } else if (type === 'BREWING') {
    lines.push(`      Ingredient: ${input.recipeIngredient.trim()}`)
    lines.push(`      InputItem: ${input.recipeInputItem.trim()}`)
  }
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

  emitUpgrades(lines, input)

  if (input.equipmentSet.trim()) {
    lines.push(`  EquipmentSet: ${input.equipmentSet.trim().toUpperCase()}`)
  }

  const stats = listLines(input.stats)
  if (stats.length > 0 && input.role !== 'socket' && input.role !== 'remover' && input.role !== 'gem') {
    lines.push('  Stats:')
    for (const stat of stats) {
      lines.push(`  - ${stat}`)
    }
  }

  if (input.role === 'standard') {
    emitAugmentSlots(lines, input)
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

  if (input.role === 'consumable' || input.consumableMode !== 'none') {
    const mode = input.consumableMode
    if (mode === 'potion' || mode === 'both') {
      lines.push('  Potion:')
      lines.push(`    Type: ${input.potionType.trim() || 'REGENERATION'}`)
      if (input.potionDuration.trim()) lines.push(`    Duration: ${input.potionDuration.trim()}`)
      if (input.potionAmplifier.trim()) lines.push(`    Amplifier: ${input.potionAmplifier.trim()}`)
      if (input.potionAmbient) lines.push('    Ambient: true')
      if (!input.potionParticles) lines.push('    Particles: false')
    }
    if (mode === 'food' || mode === 'both') {
      lines.push('  Food:')
      if (input.foodNutrition.trim()) lines.push(`    Nutrition: ${input.foodNutrition.trim()}`)
      if (input.foodSaturation.trim()) lines.push(`    Saturation: ${input.foodSaturation.trim()}`)
      if (input.foodCanAlwaysEat) lines.push('    CanAlwaysEat: true')
    }
  }

  if (input.itemKind === 'BAG') {
    emitBagInventory(lines, input)
  }

  if (input.role !== 'gem') {
    pushSkillsBlock(lines, input.skills, '  ')
  }

  emitRecipes(lines, input)

  return `${lines.join('\n')}\n`
}
