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
  explicit = true,
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
  const ctx = new CompletionContext(state, pos, explicit)
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
  it('inserts Skills dash list when completing Skil on a mob line', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  Skil
`,
      3,
    )
    expect(applyForLabel(result, 'Skills')).toBe('Skills:\n  - ')
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

  it('inserts Display with empty quotes', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  Dis
`,
      3,
    )
    expect(applyForLabel(result, 'Display')).toBe('Display: ""')
  })

  it('skips body keys already present as siblings', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  Skills:
  - MetaSkill
  Dro
`,
      5,
    )
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).not.toContain('Skills')
    expect(labels).toContain('Drops')
    expect(applyForLabel(result, 'Drops')).toBe('Drops:\n  - ')
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
    expect(applyForLabel(result, 'Display')).toBe('Display: ""')
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
    expect(applyForLabel(result, 'display')).toBe('display: ""')
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
    expect(applyForLabel(result, 'display')).toBe('display: ""')
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

  it('suggests damage types while typing without explicit trigger', () => {
    const yaml = `internalname:
  Display: "test"
  Health: 10
  Damage: 20
  Skills: []
  DamageModifiers:
    - FIRE 1
    - PO`
    const result = completeAt(yaml, 8, undefined, 'mobs', false, false)
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).toContain('POISON')
  })

  it('suggests damage types when list items share indent with DamageModifiers', () => {
    const yaml = `MY_NEW_MOB:
  Type: ZOMBIE
  DamageModifiers:
  - FIRE 1
  - poison 1
  - void`
    const result = completeAt(yaml, 6, undefined, 'mobs', false, false)
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).toContain('VOID')
  })

  it('suggests damage types when file category is other but parent is DamageModifiers', () => {
    const yaml = `internalname:
  DamageModifiers:
    - PO`
    const result = completeAt(yaml, 3, undefined, 'other', false, false)
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).toContain('POISON')
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

  it('suggests BossBar keys when children share indent with BossBar', () => {
    const yaml = `Skeletal:
  Type: ZOMBIE
  BossBar:
  Enabled: true
  Color: R`
    const result = completeAt(yaml, 5, undefined, 'mobs', false, false)
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).toContain('RED')
  })

  it('suggests Options keys when children share indent with Options', () => {
    const yaml = `Skeletal:
  Type: ZOMBIE
  Options:
  MovementSpeed: 0.3
  AlwaysShow`
    const result = completeAt(yaml, 5, undefined, 'mobs', false, false)
    expect(applyForLabel(result, 'AlwaysShowName')).toBe('AlwaysShowName: false')
  })

  it('suggests AI goals when list shares indent with AIGoalSelectors', () => {
    const yaml = `Skeletal:
  Type: ZOMBIE
  AIGoalSelectors:
  - clear
  - melee`
    const result = completeAt(yaml, 5, undefined, 'other', false, false)
    expect(applyForLabel(result, 'meleeattack')).toBe('meleeattack{speed=1}')
  })

  it('suggests body keys when typing a new field below a list section', () => {
    const yaml = `AshWisp:
  Type: PHANTOM
  Display: '&7Ash Wisp'
  Health: 40
  Damage: 2
  Options:
    MovementSpeed: 0.35
    Silent: true
    PreventOtherDrops: true
  AIGoalSelectors:
  - clear
  - randomstroll
  - float
  AITargetSelectors:
  - clear
  - players
  DamageMod
  Skills:
  - skill{s=AshWisp_Flicker} @self ~onTimer:80`
    const result = completeAt(yaml, 17, undefined, 'mobs', false, false)
    expect(applyForLabel(result, 'DamageModifiers')).toBe('DamageModifiers:\n  - FIRE 1')
    expect(detectYamlEditContext(doc(yaml), 17, 'mobs').parentKey).toBeNull()
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

describe('autocomplete audit hardenings', () => {
  it('scopes sibling body-key dedup to the current mob entity', () => {
    const result = completeAt(
      `MobA:
  Type: ZOMBIE
  Health: 100
MobB:
  Type: SKELETON
  Hea
`,
      6,
    )
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).toContain('Health')
  })

  it('suggests top-level mob body keys when category is other', () => {
    const result = completeAt(
      `CustomBoss:
  Typ
`,
      2,
      undefined,
      'other',
    )
    expect(applyForLabel(result, 'Type')).toBe('Type: ')
  })

  it('does not steal resource bar keys with class skill-binding handler', () => {
    const result = completeAt(
      `display:
  name: Warrior
resource:
    health:
        typ
`,
      5,
      undefined,
      'classes',
    )
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).toContain('type')
    expect(labels).not.toContain('level')
    expect(labels).not.toContain('max-level')
  })

  it('suggests attribute value keys under attributes, not skill bindings', () => {
    const result = completeAt(
      `attributes:
    MAX_HEALTH:
        bas
`,
      3,
      undefined,
      'classes',
    )
    expect(applyForLabel(result, 'base')).toBe('base: ')
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).not.toContain('level')
  })

  it('suggests skill binding keys under skills only', () => {
    const result = completeAt(
      `skills:
    STORM_BOLT:
        lev
`,
      3,
      undefined,
      'classes',
    )
    expect(applyForLabel(result, 'level')).toBe('level: ')
  })

  it('suggests resource value keys at indent 12', () => {
    const base = completeAt(
      `resource:
    health:
        type: LINEAR
        value:
            bas
`,
      5,
      undefined,
      'classes',
    )
    expect(applyForLabel(base, 'base')).toBe('base: ')
    const per = completeAt(
      `resource:
    health:
        type: LINEAR
        value:
            per
`,
      5,
      undefined,
      'classes',
    )
    expect(applyForLabel(per, 'per-level')).toBe('per-level: ')
  })

  it('suggests root mana display keys at indent 4', () => {
    const result = completeAt(
      `mana:
    cha
`,
      2,
      undefined,
      'classes',
    )
    expect(applyForLabel(result, 'char')).toBe('char: ')
  })

  it('suggests resource.mana bar keys under resource', () => {
    const typeResult = completeAt(
      `resource:
    mana:
        typ
`,
      3,
      undefined,
      'classes',
    )
    expect(applyForLabel(typeResult, 'type')).toBe('type: ')
    const off = completeAt(
      `resource:
    mana:
        off
`,
      3,
      undefined,
      'classes',
    )
    expect(applyForLabel(off, 'off-combat')).toBe('off-combat: true')
  })

  it('applies quest objectives as a list starter', () => {
    const result = completeAt(
      `quests:
  my_quest:
    obj
`,
      3,
      undefined,
      'quests',
    )
    expect(applyForLabel(result, 'objectives')).toBe('objectives:\n    - type: ')
  })
})

describe('guided catalog expansions', () => {
  it('suggests DisplayOptions keys and Billboard enums', () => {
    const keys = completeAt(
      `DisplayMob:
  Type: block_display
  DisplayOptions:
    Bil
`,
      4,
    )
    expect(applyForLabel(keys, 'Billboard')).toBe('Billboard: ')
    const enums = completeAt(
      `DisplayMob:
  Type: block_display
  DisplayOptions:
    Billboard: F
`,
      4,
    )
    const labels = enums?.options.map((o) => o.label) ?? []
    expect(labels).toContain('FIXED')
  })

  it('suggests MannequinOptions keys and MainHand enums', () => {
    const keys = completeAt(
      `Npc:
  Type: MANNEQUIN
  MannequinOptions:
    Mai
`,
      4,
    )
    expect(applyForLabel(keys, 'MainHand')).toBe('MainHand: ')
    const enums = completeAt(
      `Npc:
  Type: MANNEQUIN
  MannequinOptions:
    MainHand: L
`,
      4,
    )
    expect(enums?.options.map((o) => o.label)).toContain('LEFT')
  })

  it('suggests DropOptions and LevelModifiers keys', () => {
    const drop = completeAt(
      `Boss:
  Type: ZOMBIE
  DropOptions:
    Drop
`,
      4,
    )
    expect(applyForLabel(drop, 'DropMethod')).toBe('DropMethod: ')
    const method = completeAt(
      `Boss:
  DropOptions:
    DropMethod: F
`,
      3,
    )
    expect(method?.options.map((o) => o.label)).toContain('FANCY')
    const level = completeAt(
      `Boss:
  LevelModifiers:
    Pow
`,
      3,
    )
    expect(applyForLabel(level, 'Power')).toBe('Power: ')
  })

  it('applies Disguise as an inline scalar', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  Dis
`,
      3,
    )
    expect(applyForLabel(result, 'Disguise')).toBe('Disguise: ')
  })

  it('suggests RandomSpawn PositionType and UseWorldScaling', () => {
    const pos = completeAt(
      `ForestSpawn:
  Action: ADD
  PositionType: L
`,
      3,
      undefined,
      'randomspawns',
    )
    expect(pos?.options.map((o) => o.label)).toContain('LAND')
    const ws = completeAt(
      `ForestSpawn:
  UseWorldScaling: t
`,
      2,
      undefined,
      'randomspawns',
    )
    expect(ws?.options.map((o) => o.label)).toContain('true')
  })

  it('offers unused body keys on a blank indented line after Type', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  
`,
      3,
    )
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).toContain('Health')
    expect(labels).toContain('Display')
    expect(labels).not.toContain('Type')
  })

  it('offers entity id starter on an empty mob file', () => {
    const result = completeAt('', 1)
    expect(applyForLabel(result, 'MyMob')).toBe('MyMob:\n  ')
  })

  it('includes DisplayOptions in body-key suggestions', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  Disp
`,
      3,
    )
    expect(applyForLabel(result, 'DisplayOptions')).toBe('DisplayOptions:\n    ')
  })
})
