import { describe, expect, it } from 'vitest'
import { scaffoldPack, defaultExpCurveContent } from '../workspaces/scaffoldPack'
import { classifyMMOCoreCategory, detectMMOCorePackName } from './classify'
import { buildAttributeLore } from './loreBuilder'
import {
  createDefaultClassInput,
  generateClassYaml,
  generateMythicLibSkillYaml,
  generateMythicMobsSkillShell,
  defaultMythicLibSkillLore,
  runClassPreflight,
  classFilePath,
  suggestMythicLibSkillPath,
  suggestMythicMobsSkillPath,
} from './generators'
import {
  generateElementsYaml,
  parseElementsYaml,
  upsertElementRow,
  generateAttackSkillRegistrations,
  resolvePrimaryElementId,
} from './elements'
import { indexMMOCorePack } from './indexPack'
import { parseClassYaml } from './parseClass'
import type { FileRecord } from '../../types'

describe('scaffoldPack', () => {
  it('scaffolds mythicmobs pack tree under MythicMobs/Packs', () => {
    const files = scaffoldPack('mythicmobs', { packName: 'Demo Pack' })
    expect(files.some((f) => f.path.includes('MythicMobs/Packs/Demo_Pack/Mobs/'))).toBe(true)
    expect(files.some((f) => f.path.endsWith('packinfo.yml'))).toBe(true)
  })

  it('scaffolds mmocore class pack with curve', () => {
    const files = scaffoldPack('mmocore', { packName: 'MyClassPack' })
    expect(files.some((f) => f.path === 'MMOCore/exp-curves/levels.txt')).toBe(true)
    expect(files.some((f) => f.path === 'MythicLib/skill/attack_skills.yml')).toBe(true)
    expect(files.some((f) => f.path === 'MythicLib/elements.yml')).toBe(true)
    expect(files.some((f) => f.path.includes('MythicMobs/Packs/MyClassPack/'))).toBe(true)
    expect(defaultExpCurveContent(3).trim().split('\n')).toEqual(['200', '400', '600'])
  })
})

describe('classifyMMOCore', () => {
  it('classifies class and curve paths', () => {
    expect(classifyMMOCoreCategory('MMOCore/classes/storm.yml')).toBe('classes')
    expect(classifyMMOCoreCategory('MMOCore/exp-curves/levels.txt')).toBe('exp-curves')
    expect(classifyMMOCoreCategory('MythicLib/skill/STORM_MMOCORE.yml')).toBe('skills')
    expect(detectMMOCorePackName('MythicMobs/Packs/MyClassPack/Skills/Storm.yml')).toBe(
      'MyClassPack',
    )
  })
})

describe('loreBuilder', () => {
  it('builds skill and attribute lore with mana name', () => {
    const lines = buildAttributeLore({
      themeColor: '#7dd3fc',
      manaName: 'Charge',
      includeAttackSkillsInLore: false,
      skills: [
        {
          id: 'STORM_BOLT',
          displayName: 'Storm Bolt',
          level: 1,
          maxLevel: 25,
          unlockedByDefault: true,
          needsBound: true,
          trigger: '',
          mana: { base: 1, perLevel: 0 },
          cooldown: { base: 1, perLevel: 0 },
          modifiers: {},
        },
        {
          id: 'storm_regular_attack',
          displayName: 'Regular Attack',
          level: 1,
          maxLevel: 1,
          unlockedByDefault: true,
          needsBound: false,
          trigger: '',
          mana: { base: 0, perLevel: 0 },
          cooldown: { base: 0, perLevel: 0 },
          modifiers: {},
        },
      ],
      attributes: [
        { id: 'MAX_MANA', base: 20, perLevel: 1.6, showInLore: true },
        { id: 'CRITICAL_STRIKE_CHANCE', base: 10, perLevel: 0.5, showInLore: true },
      ],
    })
    expect(lines.some((l) => l.includes('Storm Bolt'))).toBe(true)
    expect(lines.some((l) => l.includes('regular_attack'))).toBe(false)
    expect(lines.some((l) => l.includes('Charge Max'))).toBe(true)
    expect(lines.some((l) => l.includes('Critical Stats'))).toBe(true)
  })
})

describe('generators', () => {
  it('generates class yaml with attributes and slots', () => {
    const input = createDefaultClassInput({ id: 'storm', displayName: 'Storm' })
    input.skills = [
      {
        id: 'STORM_BOLT',
        displayName: 'Bolt',
        level: 1,
        maxLevel: 10,
        unlockedByDefault: true,
        needsBound: true,
        trigger: '',
        isNew: true,
        categories: ['STORM'],
        mana: { base: 10, perLevel: -0.2, min: 5 },
        cooldown: { base: 20, perLevel: -0.1, min: 10 },
        modifiers: { damage: { base: 8, perLevel: 0.5, max: 20 } },
      },
    ]
    const yaml = generateClassYaml(input)
    expect(yaml).toContain('name: "Storm"')
    expect(yaml).toContain('ATTACK_DAMAGE:')
    expect(yaml).toContain('skill-slots:')
    expect(yaml).toContain('STORM_BOLT:')
    expect(yaml).toContain('mmocore admin skill-points')
    expect(classFilePath('storm')).toBe('MMOCore/classes/storm.yml')
    expect(yaml).not.toContain('key-combos:')
  })

  it('omits key-combos when empty and writes them when set', () => {
    const input = createDefaultClassInput({ id: 'storm' })
    expect(generateClassYaml(input)).not.toContain('key-combos:')
    input.keyCombos = { '1': ['LEFT_CLICK', 'RIGHT_CLICK'] }
    const yaml = generateClassYaml(input)
    expect(yaml).toContain('key-combos:')
    expect(yaml).toContain('LEFT_CLICK')
  })

  it('writes cast-particle size for dust particles', () => {
    const input = createDefaultClassInput({ id: 'storm' })
    input.castParticle = {
      enabled: true,
      particle: 'REDSTONE',
      red: 1,
      green: 2,
      blue: 3,
      size: 1.5,
    }
    const yaml = generateClassYaml(input)
    expect(yaml).toContain('size: 1.5')
  })

  it('writes passive trigger and timer on class skills', () => {
    const input = createDefaultClassInput({ id: 'storm' })
    input.skills = [
      {
        id: 'STORM_AURA',
        displayName: 'Aura',
        level: 1,
        maxLevel: 10,
        unlockedByDefault: true,
        needsBound: false,
        trigger: 'TIMER',
        timer: 5,
        mana: { base: 0, perLevel: 0 },
        cooldown: { base: 5, perLevel: -0.1 },
        modifiers: {},
      },
    ]
    const yaml = generateClassYaml(input)
    expect(yaml).toContain('trigger: TIMER')
    expect(yaml).toContain('timer: 5')
    expect(yaml).toContain('needs-bound: false')
  })

  it('suggests CLASS_MMOCORE and shared Skills/{Class}.yml paths', () => {
    expect(suggestMythicLibSkillPath('storm')).toBe('MythicLib/skill/STORM_MMOCORE.yml')
    expect(suggestMythicMobsSkillPath('MyClassPack', 'storm')).toBe(
      'MythicMobs/Packs/MyClassPack/Skills/Storm.yml',
    )
  })

  it('generates mythiclib and mythicmobs stubs with conventions', () => {
    const lore = defaultMythicLibSkillLore('STORM_BOLT', 'Charge', ['damage'])
    expect(lore.some((l) => l.includes('{mana_name}'))).toBe(true)
    const ml = generateMythicLibSkillYaml({
      id: 'STORM_BOLT',
      name: 'Bolt',
      icon: 'BOOK',
      categories: ['STORM'],
      lore,
      modifiers: { damage: { base: 8, perLevel: 0.5, max: 20 } },
    })
    expect(ml).toContain('source: mythicmobs:STORM_BOLT')
    expect(ml).toContain('categories:')
    expect(ml).toContain('item: 8')
    const mm = generateMythicMobsSkillShell(
      'STORM_BOLT',
      { damage: { base: 8, perLevel: 0.5 } },
      { damageTypes: ['SKILL', 'MAGIC'], damageElement: 'STORM' },
    )
    expect(mm).toContain('<modifier.damage>')
    expect(mm).toContain('types=SKILL,MAGIC')
    expect(mm).toContain('element=STORM')
    expect(mm).toContain('pkb=false')
    expect(mm).toContain('mmoCanTarget')
  })

  it('preflight accepts attack skills when syncing elements row', () => {
    const input = createDefaultClassInput({ id: 'storm' })
    input.includeAttackSkills = true
    input.attackSkillPrefix = 'storm'
    input.syncElementRow = true
    input.skills = []
    const index = indexMMOCorePack([])
    const issues = runClassPreflight(input, index)
    expect(issues.some((i) => i.message.includes('storm_regular_attack'))).toBe(false)
  })

  it('preflight warns but does not error when attack skills are on and sync is off', () => {
    const input = createDefaultClassInput({ id: 'storm' })
    input.includeAttackSkills = true
    input.attackSkillPrefix = 'storm'
    input.syncElementRow = false
    input.skills = []
    const index = indexMMOCorePack([])
    const issues = runClassPreflight(input, index)
    expect(issues.some((i) => i.level === 'error' && i.message.includes('storm_regular_attack'))).toBe(
      false,
    )
    expect(issues.some((i) => i.level === 'warning' && i.message.includes('Update MythicLib'))).toBe(
      true,
    )
  })

  it('preflight flags missing mythiclib skill', () => {
    const input = createDefaultClassInput({ id: 'x' })
    input.skills = [
      {
        id: 'MISSING_SKILL',
        displayName: 'Missing',
        level: 1,
        maxLevel: 1,
        unlockedByDefault: true,
        needsBound: true,
        trigger: '',
        mana: { base: 0, perLevel: 0 },
        cooldown: { base: 0, perLevel: 0 },
        modifiers: {},
      },
    ]
    const emptyFiles: FileRecord[] = []
    const index = indexMMOCorePack(emptyFiles)
    const issues = runClassPreflight(input, index)
    expect(issues.some((i) => i.level === 'error' && i.message.includes('MISSING_SKILL'))).toBe(
      true,
    )
  })
})

describe('elements', () => {
  it('round-trips elements.yml rows', () => {
    const yaml = generateElementsYaml([
      {
        id: 'STORM',
        name: 'Storm',
        icon: 'LIGHTNING_ROD',
        loreIcon: '⚡',
        color: '&b',
        regularAttackId: 'storm_regular_attack',
        critStrikeId: 'storm_critical_strike',
      },
    ])
    const rows = parseElementsYaml(yaml)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.id).toBe('STORM')
    expect(rows[0]?.regularAttackId).toBe('storm_regular_attack')
    const next = upsertElementRow(yaml, {
      id: 'STORM',
      name: 'Storm',
      icon: 'LIGHTNING_ROD',
      loreIcon: '⚡',
      color: '&3',
      regularAttackId: 'storm_regular_attack',
      critStrikeId: 'storm_critical_strike',
    })
    expect(next).toContain('color: "&3"')
  })

  it('appends only missing attack skill registrations', () => {
    const onlyCritMissing = generateAttackSkillRegistrations(
      'storm',
      'STORM',
      new Set(['storm_regular_attack']),
    )
    expect(onlyCritMissing).toContain('storm_critical_strike:')
    expect(onlyCritMissing).not.toContain('storm_regular_attack:')
  })

  it('resolves element id from skill category before class id', () => {
    expect(
      resolvePrimaryElementId({
        id: 'mage',
        skills: [{ categories: ['STORM'], damageElement: undefined }],
      }),
    ).toBe('STORM')
    expect(resolvePrimaryElementId({ id: 'mage', skills: [] })).toBe('MAGE')
  })
})

describe('parseClassYaml', () => {
  it('round-trips core fields from a minimal class yaml', () => {
    const yaml = `display:
  name: "Storm"
  lore:
    - "A charged class"
  attribute-lore:
    - "Skills:"
  item: LIGHTNING_ROD
max-level: 40
exp-curve: levels
attributes:
  MAX_HEALTH:
    base: 20
    per-level: 1
options:
  default: false
  display: true
skills:
  STORM_BOLT:
    level: 2
    max-level: 10
    needs-bound: true
    damage:
      base: 5
      per-level: 1
    mana:
      base: 10
      per-level: -0.2
    cooldown:
      base: 20
      per-level: -0.1
  STORM_AURA:
    level: 1
    max-level: 5
    trigger: ATTACK
    mana:
      base: 0
      per-level: 0
    cooldown:
      base: 5
      per-level: 0
  storm_regular_attack:
    level: 1
    max-level: 1
    unlocked-by-default: true
    needs-bound: false
    mana:
      base: 0
      per-level: 0
    cooldown:
      base: 0
      per-level: 0
`
    const parsed = parseClassYaml(yaml, 'storm')
    expect(parsed.displayName).toBe('Storm')
    expect(parsed.maxLevel).toBe(40)
    expect(parsed.attributes.some((a) => a.id === 'MAX_HEALTH' && a.base === 20)).toBe(true)
    expect(parsed.skills[0]?.id).toBe('STORM_BOLT')
    expect(parsed.skills[0]?.modifiers.damage?.base).toBe(5)
    expect(parsed.skills[1]?.trigger).toBe('ATTACK')
    expect(parsed.skills[1]?.needsBound).toBe(false)
    expect(parsed.includeAttackSkills).toBe(true)
    expect(parsed.attackSkillPrefix).toBe('storm')
    expect(parsed.attributeLoreMode).toBe('custom')
    expect(parsed.keyCombos).toEqual({})
  })
})
