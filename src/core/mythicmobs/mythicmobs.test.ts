import { describe, expect, it } from 'vitest'
import { classifyMythicCategory, detectPackName } from './classify'
import { generateItemYaml, generateMobYaml } from './generators'
import { validateMobSkillReferences } from './validate'
import type { FileRecord } from '../../types'

describe('mythicmobs helpers', () => {
  it('classifies category from nested and root-relative paths', () => {
    expect(classifyMythicCategory('Some Pack/Mobs/test.yml')).toBe('mobs')
    expect(classifyMythicCategory('Mobs/test.yml')).toBe('mobs')
    expect(classifyMythicCategory('Some Pack/skills/test.yml')).toBe('skills')
    expect(classifyMythicCategory('packinfo.yml')).toBe('other')
  })

  it('detects pack names from Packs folders and single-pack roots', () => {
    expect(detectPackName('Packs/Custom Mobs/Mobs/test.yml')).toBe('Custom Mobs')
    expect(detectPackName('Custom Mobs/Mobs/test.yml')).toBe('Custom Mobs')
    expect(detectPackName('Mobs/test.yml', 'Soaps Items')).toBe('Soaps Items')
  })

  it('generates mob yaml with skills', () => {
    const yaml = generateMobYaml({
      id: 'TEST_MOB',
      type: 'ZOMBIE',
      display: 'Test Mob',
      health: 20,
      damage: 2,
      skills: 'SKILL_A\nSKILL_B',
      drops: '',
      equipment: {},
      options: {},
      faction: '',
      armor: '',
      aiGoalSelectors: '',
      aiTargetSelectors: '',
    })
    expect(yaml).toContain('TEST_MOB:')
    expect(yaml).toContain('- SKILL_A')
  })

  it('generates mob Options, Faction, Armor, and AI selectors when set', () => {
    const yaml = generateMobYaml({
      id: 'BOSS',
      type: 'ZOMBIE',
      display: 'Boss',
      health: 100,
      damage: 8,
      skills: '',
      drops: '',
      equipment: {},
      options: { MovementSpeed: 0.3, AlwaysShowName: true },
      faction: 'Undead',
      armor: 10,
      aiGoalSelectors: 'clear\nmeleeattack',
      aiTargetSelectors: 'clear\nplayers',
    })
    expect(yaml).toContain('Faction: Undead')
    expect(yaml).toContain('Armor: 10')
    expect(yaml).toContain('Options:')
    expect(yaml).toContain('MovementSpeed: 0.3')
    expect(yaml).toContain('AlwaysShowName: true')
    expect(yaml).toContain('AIGoalSelectors:')
    expect(yaml).toContain('- meleeattack')
    expect(yaml).toContain('AITargetSelectors:')
    expect(yaml).toContain('- players')
  })

  it('omits Options and AI blocks when empty', () => {
    const yaml = generateMobYaml({
      id: 'PLAIN',
      type: 'PIG',
      display: 'Pig',
      health: 10,
      damage: 0,
      skills: '',
      drops: '',
      equipment: {},
      options: {},
      faction: '',
      armor: '',
      aiGoalSelectors: '',
      aiTargetSelectors: '',
    })
    expect(yaml).not.toContain('Options:')
    expect(yaml).not.toContain('AIGoalSelectors:')
    expect(yaml).not.toContain('Faction:')
  })

  it('generates item lore from real newlines', () => {
    const yaml = generateItemYaml({
      id: 'TEST_ITEM',
      material: 'STICK',
      display: 'Test Item',
      lore: 'First line\nSecond line',
      rarity: 'COMMON',
    })
    expect(yaml).toContain('- "First line"')
    expect(yaml).toContain('- "Second line"')
  })

  it('reports missing skill references for bare IDs and skill{s=}', () => {
    const files: FileRecord[] = [
      {
        path: 'Pack/Skills/skills.yml',
        name: 'skills.yml',
        pack: 'Pack',
        category: 'skills',
        content: `SKILL_A:
  Skills: []
`,
        ids: ['SKILL_A'],
      },
      {
        path: 'Pack/Mobs/mobs.yml',
        name: 'mobs.yml',
        pack: 'Pack',
        category: 'mobs',
        content: `MOB_A:
  Skills:
    - SKILL_A
    - SKILL_B
    - skill{s=SKILL_C} @target ~onAttack
    - damage{amount=5} @NearestPlayer ~onAttack
`,
        ids: ['MOB_A'],
      },
    ]
    const issues = validateMobSkillReferences(files)
    const missing = issues.map((i) => i.missingId).sort()
    expect(missing).toEqual(['SKILL_B', 'SKILL_C'])
  })
})
