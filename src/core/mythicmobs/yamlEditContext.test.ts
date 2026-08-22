import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { detectYamlEditContext } from './yamlEditContext'

function doc(text: string) {
  return EditorState.create({ doc: text }).doc
}

describe('yamlEditContext', () => {
  it('detects Skills parent on mob skill list lines', () => {
    const d = doc(`MyMob:
  Type: ZOMBIE
  Skills:
    - MY_SKILL
`)
    const ctx = detectYamlEditContext(d, 4, 'mobs')
    expect(ctx.parentKey).toBe('Skills')
  })

  it('detects Conditions parent in skill files', () => {
    const d = doc(`MySkill:
  Skills:
    - damage{amount=5}
  Conditions:
    - day true
`)
    const ctx = detectYamlEditContext(d, 5, 'skills')
    expect(ctx.parentKey).toBe('Conditions')
  })

  it('normalizes lowercase skills parent key', () => {
    const d = doc(`test:
  skills:
    - dam
`)
    const ctx = detectYamlEditContext(d, 3, 'skills')
    expect(ctx.parentKey).toBe('Skills')
  })
})
