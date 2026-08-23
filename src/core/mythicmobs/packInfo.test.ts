import { CompletionContext } from '@codemirror/autocomplete'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { generatePackInfoYaml, isPackInfoFile } from './packInfo'
import { packInfoCompletions } from './packInfoCompletions'

function completePackInfoAt(yaml: string, lineNumber: number, col?: number) {
  const state = EditorState.create({ doc: yaml })
  const line = state.doc.line(lineNumber)
  const pos = line.from + (col ?? line.length)
  const ctx = new CompletionContext(state, pos, true)
  return packInfoCompletions(ctx)
}

describe('packInfo', () => {
  it('detects packinfo files by name', () => {
    expect(isPackInfoFile('MythicMobs/Packs/Demo/packinfo.yml')).toBe(true)
    expect(isPackInfoFile('packinfo.yml')).toBe(true)
    expect(isPackInfoFile('Mobs/mobs.yml')).toBe(false)
  })

  it('generates wiki-style packinfo with icon and description', () => {
    const yaml = generatePackInfoYaml({
      name: 'Galebound Covenant',
      author: 'Soap',
      version: '1.0.0',
      iconMaterial: 'BLAZE_ROD',
      iconModel: 0,
      url: 'https://example.com',
      description: ['&7Storm-touched mobs and gear.'],
    })
    expect(yaml).toContain('Name: "Galebound Covenant"')
    expect(yaml).toContain('Version: 1.0.0')
    expect(yaml).toContain('Author: "Soap"')
    expect(yaml).toContain('Material: BLAZE_ROD')
    expect(yaml).toContain('Model: 0')
    expect(yaml).toContain('URL: "https://example.com"')
    expect(yaml).toContain('Description:')
    expect(yaml).toContain('- "&7Storm-touched mobs and gear."')
    expect(yaml).not.toContain('Pack:')
  })

  it('suggests root keys for packinfo.yml', () => {
    const result = completePackInfoAt(
      `# Pack metadata
Name: Demo
Ver
`,
      3,
    )
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).toContain('Version')
  })

  it('suggests missing root keys on an empty line', () => {
    const result = completePackInfoAt(
      `Name: Demo
`,
      2,
    )
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).toContain('Version')
    expect(labels).toContain('Icon')
  })

  it('suggests icon materials under Icon:', () => {
    const result = completePackInfoAt(
      `Icon:
  Material: BLA
`,
      2,
    )
    const labels = result?.options.map((o) => o.label) ?? []
    expect(labels).toContain('BLAZE_ROD')
  })
})
