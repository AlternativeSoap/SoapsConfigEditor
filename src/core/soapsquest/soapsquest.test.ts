import { describe, expect, it } from 'vitest'
import { classifySoapsQuestCategory, findQuestsYmlPath } from './classify'
import { generateQuestYaml, mergeIntoQuestsYml } from './generators'
import { extractQuestIds } from './questIds'
import { scaffoldPack } from '../workspaces/scaffoldPack'

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
    expect(classifySoapsQuestCategory('tiers.yml')).toBe('other')
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
