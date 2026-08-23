import { describe, expect, it } from 'vitest'
import { classifySoapsQuestCategory, findQuestsYmlPath } from './classify'
import {
  findQuestBlockRange,
  generateQuestYaml,
  mergeIntoQuestsYml,
  replaceQuestInQuestsYml,
} from './generators'
import { parseQuestFromFile } from './parseQuest'
import { extractQuestIds } from './questIds'
import { validateSoapsQuest } from './validate'
import { buildSoapsQuestCatalog } from './catalog'
import { scaffoldPack } from '../workspaces/scaffoldPack'
import type { FileRecord } from '../../types'

describe('scaffoldPack soapsquest', () => {
  it('creates quests.yml, tiers.yml, and difficulties.yml', () => {
    const files = scaffoldPack('soapsquest', { packName: 'Demo' })
    const paths = files.map((f) => f.path)
    expect(paths).toEqual(['quests.yml', 'tiers.yml', 'difficulties.yml'])
    const quests = files.find((f) => f.path === 'quests.yml')!
    expect(quests.category).toBe('quests')
    expect(quests.content).toContain('quests:')
    expect(quests.content).toContain('starter_quest:')
    expect(quests.content).toContain('citizens-npcs:')
    expect(files.find((f) => f.path === 'tiers.yml')!.content).toContain('tiers:')
    expect(files.find((f) => f.path === 'difficulties.yml')!.content).toContain(
      'difficulties:',
    )
  })
})

describe('classifySoapsQuestCategory', () => {
  it('maps quests.yml to quests', () => {
    expect(classifySoapsQuestCategory('quests.yml')).toBe('quests')
    expect(classifySoapsQuestCategory('plugins/SoapsQuest/quests.yml')).toBe('quests')
    expect(classifySoapsQuestCategory('tiers.yml')).toBe('tiers')
    expect(classifySoapsQuestCategory('difficulties.yml')).toBe('difficulties')
  })
})

describe('extractQuestIds', () => {
  it('reads keys under quests:', () => {
    const content = `
quests:
  starter_quest:
    display: "A"
  zombie_slayer:
    display: "B"
citizens-npcs: {}
`
    expect(extractQuestIds(content)).toEqual(['starter_quest', 'zombie_slayer'])
  })
})

describe('generateQuestYaml', () => {
  it('emits display, objectives, and reward', () => {
    const yaml = generateQuestYaml({
      id: 'zombie_slayer',
      display: '<#FF5555>Zombie Slayer',
      material: 'ROTTEN_FLESH',
      tier: 'common',
      difficulty: 'easy',
      sequential: false,
      lockToPlayer: false,
      objectives: [{ type: 'kill', target: 'ZOMBIE', amount: 15 }],
      xp: 100,
      money: 50,
      sigils: 0,
      itemRewards: [],
    })
    expect(yaml).toContain('zombie_slayer:')
    expect(yaml).toContain('display:')
    expect(yaml).toContain('objectives:')
    expect(yaml).toContain('type: kill')
    expect(yaml).toContain('target: ZOMBIE')
    expect(yaml).toContain('amount: 15')
    expect(yaml).toContain('reward:')
    expect(yaml).toContain('xp: 100')
    expect(yaml).toContain('money: 50')
    expect(yaml).not.toContain('sigils:')
  })

  it('emits conditions and item rewards when set', () => {
    const yaml = generateQuestYaml({
      id: 'gated',
      display: 'Gated Quest',
      material: 'EMERALD',
      tier: 'uncommon',
      difficulty: 'normal',
      sequential: false,
      lockToPlayer: false,
      unlockMinLevel: 10,
      unlockCost: 500,
      unlockSigilCost: 25,
      unlockPermission: 'quests.vip',
      objectives: [{ type: 'kill', target: 'ZOMBIE', amount: 5 }],
      xp: 0,
      money: 0,
      sigils: 0,
      itemRewards: [
        { material: 'DIAMOND', amount: 3, name: '<#55FFFF>Reward Diamond', chance: 100 },
      ],
    })
    expect(yaml).toContain('conditions:')
    expect(yaml).toContain('min-level: 10')
    expect(yaml).toContain('cost: 500')
    expect(yaml).toContain('sigil-cost: 25')
    expect(yaml).toContain('permission: "quests.vip"')
    expect(yaml).toContain('items:')
    expect(yaml).toContain('material: DIAMOND')
    expect(yaml).toContain('amount: 3')
    expect(yaml).toContain('name:')
  })

  it('emits command and level fields for special objectives', () => {
    const yaml = generateQuestYaml({
      id: 'special',
      display: 'Special',
      material: 'PAPER',
      tier: 'common',
      difficulty: 'easy',
      sequential: false,
      lockToPlayer: false,
      objectives: [
        { type: 'command', target: '', command: 'help', amount: 1 },
        { type: 'reachlevel', target: '', level: 30, amount: 1 },
      ],
      xp: 10,
      money: 0,
      sigils: 0,
      itemRewards: [],
    })
    expect(yaml).toContain('command: "help"')
    expect(yaml).toContain('level: 30')
    expect(yaml).not.toContain('target:')
  })
})

describe('mergeIntoQuestsYml', () => {
  it('creates a new file when content is null', () => {
    const quest = generateQuestYaml({
      id: 'fresh',
      display: 'Fresh',
      material: 'PAPER',
      tier: 'common',
      difficulty: 'easy',
      sequential: false,
      lockToPlayer: false,
      objectives: [{ type: 'kill', target: 'ZOMBIE', amount: 1 }],
      xp: 10,
      money: 0,
      sigils: 0,
      itemRewards: [],
    })
    const result = mergeIntoQuestsYml(null, quest, 'fresh')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.created).toBe(true)
    expect(result.content).toContain('quests:')
    expect(result.content).toContain('fresh:')
    expect(extractQuestIds(result.content)).toEqual(['fresh'])
  })

  it('inserts under existing quests: before citizens-npcs', () => {
    const existing = `quests:
  starter_quest:
    display: "Starter"
    objectives:
      - type: kill
        target: ZOMBIE
        amount: 10
    reward:
      xp: 100

citizens-npcs: {}
`
    const quest = generateQuestYaml({
      id: 'second',
      display: 'Second',
      material: 'PAPER',
      tier: 'common',
      difficulty: 'easy',
      sequential: false,
      lockToPlayer: false,
      objectives: [{ type: 'break', target: 'OAK_LOG', amount: 5 }],
      xp: 20,
      money: 0,
      sigils: 0,
      itemRewards: [],
    })
    const result = mergeIntoQuestsYml(existing, quest, 'second')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(extractQuestIds(result.content)).toEqual(['starter_quest', 'second'])
    const secondIdx = result.content.indexOf('second:')
    const citizensIdx = result.content.indexOf('citizens-npcs:')
    expect(secondIdx).toBeGreaterThan(-1)
    expect(citizensIdx).toBeGreaterThan(secondIdx)
  })

  it('does not overwrite an existing quest id', () => {
    const existing = `quests:
  starter_quest:
    display: "Starter"
    objectives:
      - type: kill
        target: ZOMBIE
        amount: 10
    reward:
      xp: 100
`
    const quest = generateQuestYaml({
      id: 'starter_quest',
      display: 'Dup',
      material: 'PAPER',
      tier: 'common',
      difficulty: 'easy',
      sequential: false,
      lockToPlayer: false,
      objectives: [{ type: 'kill', target: 'SKELETON', amount: 1 }],
      xp: 1,
      money: 0,
      sigils: 0,
      itemRewards: [],
    })
    const result = mergeIntoQuestsYml(existing, quest, 'starter_quest')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('already exists')
    expect(existing).toBe(existing)
  })
})

describe('findQuestsYmlPath', () => {
  it('prefers an existing quests.yml path', () => {
    expect(findQuestsYmlPath([{ path: 'tiers.yml' }, { path: 'quests.yml' }])).toBe(
      'quests.yml',
    )
    expect(findQuestsYmlPath([{ path: 'SoapsQuest/quests.yml' }])).toBe(
      'SoapsQuest/quests.yml',
    )
    expect(findQuestsYmlPath([])).toBe('quests.yml')
  })
})

describe('parseQuestFromFile', () => {
  it('round-trips a simple quest', () => {
    const content = `quests:
  zombie_slayer:
    display: "<#FF5555>Zombie Slayer"
    material: ROTTEN_FLESH
    tier: common
    difficulty: easy
    objectives:
      - type: kill
        target: ZOMBIE
        amount: 15
    reward:
      xp: 100
      money: 50
`
    const parsed = parseQuestFromFile(content, 'zombie_slayer')
    expect(parsed?.id).toBe('zombie_slayer')
    expect(parsed?.display).toContain('Zombie Slayer')
    expect(parsed?.objectives[0].type).toBe('kill')
    expect(parsed?.xp).toBe(100)
  })

  it('round-trips conditions and item rewards', () => {
    const content = `quests:
  sigil_master:
    display: "Contract"
    material: EMERALD
    tier: uncommon
    difficulty: normal
    conditions:
      min-level: 5
      cost: 100
      sigil-cost: 10
      permission: "quests.contract"
    objectives:
      - type: kill
        target: ZOMBIE
        amount: 10
    reward:
      items:
        - material: IRON_SWORD
          amount: 1
          name: "<#55FF55>Blade"
          chance: 100
      sigils: 20
`
    const parsed = parseQuestFromFile(content, 'sigil_master')
    expect(parsed?.unlockMinLevel).toBe(5)
    expect(parsed?.unlockCost).toBe(100)
    expect(parsed?.unlockSigilCost).toBe(10)
    expect(parsed?.unlockPermission).toBe('quests.contract')
    expect(parsed?.itemRewards).toHaveLength(1)
    expect(parsed?.itemRewards[0].material).toBe('IRON_SWORD')
    expect(parsed?.itemRewards[0].name).toContain('Blade')
    expect(parsed?.sigils).toBe(20)

    const yaml = generateQuestYaml(parsed!)
    expect(yaml).toContain('conditions:')
    expect(yaml).toContain('min-level: 5')
    expect(yaml).toContain('items:')
    expect(yaml).toContain('material: IRON_SWORD')
  })
})

describe('replaceQuestInQuestsYml', () => {
  it('replaces an existing quest block in place', () => {
    const existing = `quests:
  starter_quest:
    display: "Old"
    objectives:
      - type: kill
        target: ZOMBIE
        amount: 5
    reward:
      xp: 10

citizens-npcs: {}
`
    const updated = generateQuestYaml({
      id: 'starter_quest',
      display: 'New title',
      material: 'PAPER',
      tier: 'common',
      difficulty: 'easy',
      sequential: false,
      lockToPlayer: false,
      objectives: [{ type: 'kill', target: 'SKELETON', amount: 3 }],
      xp: 20,
      money: 0,
      sigils: 0,
      itemRewards: [],
    })
    const result = replaceQuestInQuestsYml(existing, 'starter_quest', updated, 'starter_quest')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.content).toContain('New title')
    expect(result.content).toContain('SKELETON')
    expect(result.content).not.toContain('display: "Old"')
    expect(extractQuestIds(result.content)).toEqual(['starter_quest'])
  })
})

describe('validateSoapsQuest', () => {
  const questsFile = (content: string): FileRecord => ({
    path: 'quests.yml',
    name: 'quests.yml',
    pack: 'SoapsQuest',
    category: 'quests',
    content,
    ids: extractQuestIds(content),
  })

  it('flags missing display and unknown tier', () => {
    const files = [
      questsFile(`quests:
  bad_quest:
    tier: not_a_tier
    objectives:
      - type: kill
        target: ZOMBIE
        amount: 1
    reward:
      xp: 1
`),
      {
        path: 'tiers.yml',
        name: 'tiers.yml',
        pack: 'SoapsQuest',
        category: 'other',
        content: 'tiers:\n  common:\n    display: "&fCommon"\n    weight: 1\n',
        ids: ['common'],
      },
    ]
    const issues = validateSoapsQuest(files)
    expect(issues.some((i) => i.type === 'missing_display' && i.questId === 'bad_quest')).toBe(
      true,
    )
    expect(issues.some((i) => i.type === 'unknown_tier' && i.questId === 'bad_quest')).toBe(true)
  })

  it('flags missing quest references from citizens-npcs', () => {
    const files = [
      questsFile(`quests:
  only_quest:
    display: "Only"
    objectives:
      - type: kill
        target: ZOMBIE
        amount: 1
    reward:
      xp: 1

citizens-npcs:
  "1":
    quest: missing_quest
    message: "Hi"
`),
    ]
    const issues = validateSoapsQuest(files)
    expect(issues.some((i) => i.type === 'missing_quest_reference')).toBe(true)
  })
})

describe('buildSoapsQuestCatalog', () => {
  it('reads tiers, difficulties, and quest ids from workspace files', () => {
    const files = scaffoldPack('soapsquest', { packName: 'Demo' })
    const catalog = buildSoapsQuestCatalog(files)
    expect(catalog.tierIds).toContain('common')
    expect(catalog.difficultyIds).toContain('easy')
    expect(catalog.questIds).toContain('starter_quest')
  })
})

describe('findQuestBlockRange', () => {
  it('finds quest block boundaries', () => {
    const content = `quests:
  first:
    display: "A"
  second:
    display: "B"

citizens-npcs: {}
`
    const range = findQuestBlockRange(content, 'first')
    expect(range).not.toBeNull()
    if (!range) return
    expect(content.slice(range.start, range.end)).toContain('first:')
    expect(content.slice(range.start, range.end)).not.toContain('second:')
  })
})
