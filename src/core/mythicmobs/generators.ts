import type {
  DroptableGeneratorInput,
  ItemGeneratorInput,
  MobGeneratorInput,
  RandomSpawnGeneratorInput,
  SkillGeneratorInput,
} from '../../types'

export function yamlQuoted(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * Split a Skills textarea into YAML list entries.
 * Multiline `skill{s=[ ... ]}` blocks stay as one entry: inner `- ` lines are
 * Mythic array syntax, not separate YAML items.
 */
export function skillYamlListEntries(raw: string): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const entries: string[] = []
  let buf: string[] = []
  let depth = 0

  for (const line of lines) {
    if (buf.length === 0 || depth > 0) {
      buf.push(line)
    } else {
      entries.push(buf.join('\n'))
      buf = [line]
    }
    for (const ch of line) {
      if (ch === '[') depth += 1
      else if (ch === ']') depth = Math.max(0, depth - 1)
    }
  }
  if (buf.length > 0) entries.push(buf.join('\n'))
  return entries
}

/** Emit a Skills: YAML block. Only the first line of each entry gets a list marker. */
export function formatSkillsYamlBlock(
  raw: string,
  opts: { indent?: string; emptyAsList?: boolean } = {},
): string {
  const indent = opts.indent ?? '  '
  const entries = skillYamlListEntries(raw)
  if (entries.length === 0) {
    return opts.emptyAsList ? `${indent}Skills: []` : ''
  }
  const lines: string[] = [`${indent}Skills:`]
  for (const entry of entries) {
    const parts = entry.split('\n')
    lines.push(`${indent}- ${parts[0]}`)
    for (let i = 1; i < parts.length; i++) {
      lines.push(`${indent}  ${parts[i]}`)
    }
  }
  return lines.join('\n')
}

function multilineListBlock(key: string, raw: string | undefined): string {
  const lines = (raw ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return ''
  return [`  ${key}:`, ...lines.map((line) => `    - ${line}`)].join('\n') + '\n'
}

export function generateMobYaml(input: MobGeneratorInput): string {
  const skillBlock = formatSkillsYamlBlock(input.skills, { emptyAsList: true })

  const dropLines = input.drops
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const dropsBlock =
    dropLines.length === 0
      ? ''
      : ['  Drops:', ...dropLines.map((drop) => `    - ${drop}`)].join('\n') + '\n'

  const slots = ['HEAD', 'CHEST', 'LEGS', 'FEET', 'HAND', 'OFFHAND'] as const
  const equipLines = slots
    .map((slot) => {
      const val = input.equipment[slot]?.trim()
      return val ? `    ${slot}: ${val}` : null
    })
    .filter(Boolean)

  const equipBlock =
    equipLines.length === 0
      ? ''
      : ['  Equipment:', ...equipLines].join('\n') + '\n'

  const factionLine = input.faction?.trim() ? `  Faction: ${input.faction.trim()}\n` : ''
  const armorLine =
    input.armor !== '' && input.armor !== undefined && Number.isFinite(Number(input.armor))
      ? `  Armor: ${input.armor}\n`
      : ''

  const optionEntries = Object.entries(input.options ?? {})
  const optionsBlock =
    optionEntries.length === 0
      ? ''
      : [
          '  Options:',
          ...optionEntries.map(([key, value]) => {
            if (typeof value === 'boolean') return `    ${key}: ${value ? 'true' : 'false'}`
            return `    ${key}: ${value}`
          }),
        ].join('\n') + '\n'

  const aiGoalsBlock = multilineListBlock('AIGoalSelectors', input.aiGoalSelectors)
  const aiTargetsBlock = multilineListBlock('AITargetSelectors', input.aiTargetSelectors)

  return `${input.id}:
  Type: ${input.type}
  Display: ${yamlQuoted(input.display)}
  Health: ${input.health}
  Damage: ${input.damage}
${factionLine}${armorLine}${optionsBlock}${aiGoalsBlock}${aiTargetsBlock}${dropsBlock}${equipBlock}${skillBlock}
`
}

export function generateItemYaml(input: ItemGeneratorInput): string {
  const loreLines = input.lore
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const loreBlock =
    loreLines.length === 0
      ? '    Lore: []'
      : ['    Lore:', ...loreLines.map((line) => `      - ${yamlQuoted(line)}`)].join('\n')

  return `${input.id}:
  Id: ${input.material}
  Display: ${yamlQuoted(input.display)}
  Options:
${loreBlock}
  NBT:
    SoapsRarity: ${yamlQuoted(input.rarity)}
`
}

export function generateSkillYaml(input: SkillGeneratorInput): string {
  const conditions = input.conditions
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const conditionsBlock =
    conditions.length === 0
      ? ''
      : ['  Conditions:', ...conditions.map((c) => `    - ${c}`)].join('\n') + '\n'

  const skillsBlock = formatSkillsYamlBlock(input.skills, { emptyAsList: true })

  const cooldownLine = input.cooldown > 0 ? `  Cooldown: ${input.cooldown}\n` : ''

  return `${input.id}:
${cooldownLine}${conditionsBlock}${skillsBlock}
`
}

export function generateDroptableYaml(input: DroptableGeneratorInput): string {
  const dropLines = input.drops.map((drop) => {
    if (drop.type === 'exp') return `    - exp ${drop.minAmount} ${drop.maxAmount} ${drop.chance}`
    if (drop.type === 'money') return `    - money ${drop.minAmount} ${drop.maxAmount} ${drop.chance}`
    if (drop.type === 'command') return `    - command{cmd=${yamlQuoted(drop.value)}} ${drop.chance}`
    return `    - ${drop.value} ${drop.minAmount} ${drop.maxAmount} ${drop.chance}`
  })

  const dropsBlock =
    dropLines.length === 0
      ? '  Drops: []'
      : ['  Drops:', ...dropLines].join('\n')

  return `${input.id}:
${dropsBlock}
`
}

export function generateRandomSpawnYaml(input: RandomSpawnGeneratorInput): string {
  const worlds = input.worlds
    .split(',')
    .map((w) => w.trim())
    .filter(Boolean)

  const biomes = input.biomes
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean)

  const conditions = input.conditions
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const worldsBlock =
    worlds.length === 0
      ? ''
      : ['  Worlds:', ...worlds.map((w) => `    - ${w}`)].join('\n') + '\n'

  const biomesBlock =
    biomes.length === 0
      ? ''
      : ['  Biomes:', ...biomes.map((b) => `    - ${b}`)].join('\n') + '\n'

  const condBlock =
    conditions.length === 0
      ? ''
      : ['  Conditions:', ...conditions.map((c) => `    - ${c}`)].join('\n') + '\n'

  const levelLine = input.level.trim() ? `  Level: ${input.level}\n` : ''

  return `${input.id}:
  Action: ${input.action}
  Type: ${input.mobType}
${levelLine}  Chance: ${input.chance}
${worldsBlock}${biomesBlock}${condBlock}`
}
