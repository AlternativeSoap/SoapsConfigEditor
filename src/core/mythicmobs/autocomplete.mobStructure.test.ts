import { CompletionContext } from '@codemirror/autocomplete'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { AI_GOAL_SELECTORS, AI_TARGET_SELECTORS } from '../../data/mythicmobs/mobAiSelectors'
import { MOB_OPTION_NAMES, mobOptionByName } from '../../data/mythicmobs/mobOptions'
import { classifyMythicCategory } from './classify'
import { DEFAULT_AC_PREFS, mythicCompletion } from './autocomplete'
import { resolveMythicCatalogs } from './resolveCatalogs'
import { bodyKeyDefsForCategory, detectYamlEditContext } from './yamlEditContext'

function doc(text: string) {
  return EditorState.create({ doc: text }).doc
}

function completeAt(
  yaml: string,
  lineNumber: number,
  col?: number,
  fileCategory: Parameters<typeof mythicCompletion>[5] = 'mobs',
  crucible = false,
) {
  const state = EditorState.create({ doc: yaml })
  const line = state.doc.line(lineNumber)
  const pos = line.from + (col ?? line.length)
  const source = mythicCompletion(
    [],
    [],
    [],
    [],
    DEFAULT_AC_PREFS,
    fileCategory,
    resolveMythicCatalogs(crucible),
    crucible,
  )
  const ctx = new CompletionContext(state, pos, true)
  return source(ctx)
}

function applyForLabel(result: ReturnType<typeof completeAt>, label: string): string | undefined {
  const opt = result?.options.find((o) => o.label === label)
  if (!opt) return undefined
  return typeof opt.apply === 'string' ? opt.apply : undefined
}

describe('mob structure catalogs', () => {
  it('includes core Options and AI selectors', () => {
    expect(MOB_OPTION_NAMES).toContain('MovementSpeed')
    expect(MOB_OPTION_NAMES).toContain('PreventOtherDrops')
    expect(mobOptionByName('AlwaysShowName')?.type).toBe('boolean')
    expect(mobOptionByName('Despawn')?.type).toBe('enum')
    expect(AI_GOAL_SELECTORS).toContain('clear')
    expect(AI_GOAL_SELECTORS).toContain('meleeattack')
    expect(AI_TARGET_SELECTORS).toContain('clear')
    expect(AI_TARGET_SELECTORS).toContain('players')
  })
})

describe('yamlEditContext for mob Options and AI', () => {
  it('detects Options as parent for nested keys', () => {
    const d = doc(`Skeletal:
  Type: ZOMBIE
  Options:
    MovementSpeed: 0.3
    AlwaysShowName: true
`)
    expect(detectYamlEditContext(d, 4, 'mobs').parentKey).toBe('Options')
  })

  it('detects AIGoalSelectors as parent for list items', () => {
    const d = doc(`Skeletal:
  Type: ZOMBIE
  AIGoalSelectors:
    - clear
    - meleeattack
`)
    expect(detectYamlEditContext(d, 4, 'mobs').parentKey).toBe('AIGoalSelectors')
  })

  it('detects Equipment as parent for slot lines', () => {
    const d = doc(`Skeletal:
  Type: ZOMBIE
  Equipment:
    HEAD: diamond_helmet
`)
    expect(detectYamlEditContext(d, 4, 'mobs').parentKey).toBe('Equipment')
  })
})

describe('mob body-key apply snippets', () => {
  it('inserts Skills: [] when completing Skil on a mob line', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  Skil
`,
      3,
    )
    expect(applyForLabel(result, 'Skills')).toBe('Skills: []')
  })

  it('inserts scalar keys with colon and space', () => {
    const result = completeAt(
      `Skeletal:
  Typ
`,
      2,
    )
    expect(applyForLabel(result, 'Type')).toBe('Type: ')
  })

  it('skips body keys already present as siblings', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  Skills: []
  Dro
`,
      4,
    )
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).not.toContain('Skills')
    expect(labels).toContain('Drops')
    expect(applyForLabel(result, 'Drops')).toBe('Drops: []')
  })
})

describe('mob Options / AI / Equipment autocomplete', () => {
  it('suggests Options keys under Options:', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  Options:
    Mov
`,
      4,
    )
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).toContain('MovementSpeed')
    expect(labels.some((l) => String(l).startsWith('Mov'))).toBe(true)
  })

  it('applies boolean defaults for Options keys', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  Options:
    PreventOther
`,
      4,
    )
    expect(applyForLabel(result, 'PreventOtherDrops')).toBe('PreventOtherDrops: false')
  })

  it('suggests boolean values after an Options key', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  Options:
    AlwaysShowName: 
`,
      4,
    )
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).toContain('true')
    expect(labels).toContain('false')
  })

  it('suggests Despawn enum values', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  Options:
    Despawn: 
`,
      4,
    )
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels.length).toBeGreaterThan(0)
    expect(labels).toEqual(expect.arrayContaining(mobOptionByName('Despawn')?.values ?? []))
  })

  it('suggests AI goal selectors on list lines', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  AIGoalSelectors:
    - cle
`,
      4,
    )
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).toContain('clear')
  })

  it('applies slot colon for Equipment slot keys', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  Equipment:
    HE
`,
      4,
    )
    expect(applyForLabel(result, 'HEAD')).toBe('HEAD: ')
  })

  it('skips Options keys already present on sibling lines', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  Options:
    MovementSpeed: 0.3
    Always
`,
      5,
    )
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).not.toContain('MovementSpeed')
    expect(labels).toContain('AlwaysShowName')
  })
})

describe('MythicRPG and pack-level categories', () => {
  it('classifies stats and experience files', () => {
    expect(classifyMythicCategory('Packs/Test/stats.yml')).toBe('stats')
    expect(classifyMythicCategory('Packs/Test/experience-curves.yml')).toBe('experience-curves')
    expect(classifyMythicCategory('Packs/Test/experience-sources.yml')).toBe('experience-sources')
  })

  it('returns archetype body keys with apply snippets', () => {
    const defs = bodyKeyDefsForCategory('archetypes')
    expect(defs.some((d) => d.key === 'Display')).toBe(true)
    const result = completeAt(
      `MAGE:
  Dis
`,
      2,
      undefined,
      'archetypes',
    )
    expect(applyForLabel(result, 'Display')).toBe('Display: ')
  })

  it('returns stat body keys with apply snippets', () => {
    const result = completeAt(
      `MAX_MANA:
  Enab
`,
      2,
      undefined,
      'stats',
    )
    expect(applyForLabel(result, 'Enabled')).toBe('Enabled: true')
  })
})

describe('SoapsQuest quest body keys', () => {
  it('suggests quest body keys with apply snippets', () => {
    const result = completeAt(
      `quests:
  my_quest:
    disp
`,
      3,
      undefined,
      'quests',
    )
    expect(applyForLabel(result, 'display')).toBe('display: ')
  })

  it('suggests objectives block snippet', () => {
    const result = completeAt(
      `quests:
  my_quest:
    obj
`,
      3,
      undefined,
      'quests',
    )
    expect(applyForLabel(result, 'objectives')).toContain('objectives:')
  })

  it('suggests tier field keys', () => {
    const result = completeAt(
      `tiers:
  common:
    disp
`,
      3,
      undefined,
      'tiers',
    )
    expect(applyForLabel(result, 'display')).toBe('display: ')
  })
})

describe('MMOCore class body keys', () => {
  it('suggests top-level class keys at indent 0', () => {
    const result = completeAt(
      `dis
`,
      1,
      undefined,
      'classes',
    )
    expect(applyForLabel(result, 'display')).toContain('display:')
  })
})

describe('mob DamageModifiers autocomplete', () => {
  it('applies list-dash snippet for DamageModifiers body key', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  DamageMod
`,
      3,
    )
    expect(applyForLabel(result, 'DamageModifiers')).toBe('DamageModifiers:\n  - FIRE 1')
  })

  it('suggests damage types on list lines under DamageModifiers', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  DamageModifiers:
    - FI
`,
      4,
    )
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).toContain('FIRE')
    expect(labels).toContain('FIRE_TICK')
    expect(applyForLabel(result, 'FIRE')).toBe('FIRE 1')
  })

  it('suggests BossBar keys under BossBar block', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  BossBar:
    Enab
`,
      4,
    )
    expect(applyForLabel(result, 'Enabled')).toBe('Enabled: true')
  })

  it('suggests Modules keys under Modules block', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  Modules:
    Imm
`,
      4,
    )
    expect(applyForLabel(result, 'ImmunityTable')).toBe('ImmunityTable: true')
  })
})

describe('Crucible nested Options apply', () => {
  it('applies boolean defaults for Crucible Options keys', () => {
    const result = completeAt(
      `MyItem:
  Id: DIAMOND_SWORD
  Options:
    PreventStack
`,
      4,
      undefined,
      'items',
      true,
    )
    expect(applyForLabel(result, 'PreventStacking')).toBe('PreventStacking: true')
  })

  it('suggests Upgrades keys on Crucible items', () => {
    const result = completeAt(
      `MyItem:
  Id: DIAMOND_SWORD
  Upgrades:
    Def
`,
      4,
      undefined,
      'items',
      true,
    )
    expect(applyForLabel(result, 'DefaultLevel')).toBe('DefaultLevel: ')
  })
})

describe('nested blocks beyond mobs', () => {
  it('suggests reagent ResourceBarStates fields', () => {
    const result = completeAt(
      `Mana:
  Display: Mana
  ResourceBarStates:
    Default:
      Bar
`,
      5,
      undefined,
      'reagents',
    )
    expect(applyForLabel(result, 'BarLength')).toBe('BarLength: ')
  })

  it('suggests augment Formatting keys', () => {
    const result = completeAt(
      `GEM:
  Display: Gem
  Formatting:
    Emp
`,
      4,
      undefined,
      'augments',
    )
    expect(applyForLabel(result, 'Empty')).toBe('Empty: ')
  })

  it('suggests MythicRPG spell body keys', () => {
    const result = completeAt(
      `Fireball:
  Spel
`,
      2,
      undefined,
      'skills',
    )
    expect(applyForLabel(result, 'Spell')).toBe('Spell: true')
  })

  it('suggests quest objective type values', () => {
    const result = completeAt(
      `quests:
  my_quest:
    objectives:
      - type: ki
        target: ZOMBIE
`,
      4,
      undefined,
      'quests',
    )
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).toContain('kill')
  })

  it('suggests BossBar Color enum values', () => {
    const result = completeAt(
      `Boss:
  Type: ZOMBIE
  BossBar:
    Color: R
`,
      4,
    )
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).toContain('RED')
  })

  it('applies AI goal selector snippets', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  AIGoalSelectors:
    - melee
`,
      4,
    )
    expect(applyForLabel(result, 'meleeattack')).toBe('meleeattack{speed=1}')
  })

  it('suggests archetype Group values', () => {
    const result = completeAt(
      `Warrior:
  Group: C
`,
      2,
      undefined,
      'archetypes',
    )
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).toContain('CLASS')
  })

  it('suggests quest reward item keys', () => {
    const result = completeAt(
      `quests:
  my_quest:
    reward:
      items:
        - material: DIAMOND
          am
`,
      6,
      undefined,
      'quests',
    )
    expect(applyForLabel(result, 'amount')).toBe('amount: ')
  })

  it('applies quest items list starter under reward', () => {
    const result = completeAt(
      `quests:
  my_quest:
    reward:
      ite
`,
      4,
      undefined,
      'quests',
    )
    expect(applyForLabel(result, 'items')).toBe('items:\n        - material: ')
  })

  it('suggests Crucible Augmentation keys', () => {
    const result = completeAt(
      `MyItem:
  Id: DIAMOND_SWORD
  Augmentation:
    Typ
`,
      4,
      undefined,
      'items',
      true,
    )
    expect(applyForLabel(result, 'Type')).toBe('Type: ')
  })
})
