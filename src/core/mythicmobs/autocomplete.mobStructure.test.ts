import { CompletionContext } from '@codemirror/autocomplete'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { AI_GOAL_SELECTORS, AI_TARGET_SELECTORS } from '../../data/mythicmobs/mobAiSelectors'
import { MOB_OPTION_NAMES, mobOptionByName } from '../../data/mythicmobs/mobOptions'
import { DEFAULT_AC_PREFS, mythicCompletion } from './autocomplete'
import { resolveMythicCatalogs } from './resolveCatalogs'
import { detectYamlEditContext } from './yamlEditContext'

function doc(text: string) {
  return EditorState.create({ doc: text }).doc
}

function completeAt(yaml: string, lineNumber: number, col?: number) {
  const state = EditorState.create({ doc: yaml })
  const line = state.doc.line(lineNumber)
  const pos = line.from + (col ?? line.length)
  const source = mythicCompletion(
    [],
    [],
    [],
    [],
    DEFAULT_AC_PREFS,
    'mobs',
    resolveMythicCatalogs(false),
    false,
  )
  const ctx = new CompletionContext(state, pos, true)
  return source(ctx)
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

  it('suggests Equipment slot keys', () => {
    const result = completeAt(
      `Skeletal:
  Type: ZOMBIE
  Equipment:
    HE
`,
      4,
    )
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).toContain('HEAD')
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
