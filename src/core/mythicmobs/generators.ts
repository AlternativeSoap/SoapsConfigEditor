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

export function generateMobYaml(input: MobGeneratorInput): string {
  const skills = input.skills
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const skillBlock =
    skills.length === 0
      ? '  Skills: []'
      : ['  Skills:', ...skills.map((skill) => `    - ${skill}`)].join('\n')

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

  return `${input.id}:
  Type: ${input.type}
  Display: ${yamlQuoted(input.display)}
  Health: ${input.health}
  Damage: ${input.damage}
${dropsBlock}${equipBlock}${skillBlock}
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

  const skills = input.skills
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const skillsBlock =
    skills.length === 0
      ? '  Skills: []'
      : ['  Skills:', ...skills.map((s) => `    - ${s}`)].join('\n')

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
