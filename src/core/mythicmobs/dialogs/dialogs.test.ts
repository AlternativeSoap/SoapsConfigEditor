import { describe, expect, it } from 'vitest'
import { classifyMythicCategory } from '../classify'
import { compileDialogGraph, createQuestOfferGraph } from './compile'
import { createEmptyGraph } from './types'
import { extractDialogRefsFromContent, validateDialogReferences } from '../validate'
import type { FileRecord } from '../../../types'

describe('dialogs classify', () => {
  it('classifies Dialogs folder and dialog filenames', () => {
    expect(classifyMythicCategory('MythicMobs/Packs/Demo/Dialogs/dialogs.yml')).toBe('dialogs')
    expect(classifyMythicCategory('Packs/Demo/quest-dialog.yml')).toBe('dialogs')
    expect(classifyMythicCategory('Packs/Demo/ExampleDialogs.yml')).toBe('dialogs')
  })
})

describe('compileDialogGraph', () => {
  it('emits dialog screens and glue showdialog skills for edges', () => {
    const compiled = compileDialogGraph(createQuestOfferGraph())
    expect(compiled.dialogYaml).toContain('QuestOffer:')
    expect(compiled.dialogYaml).toContain('QuestAccepted:')
    expect(compiled.dialogYaml).toContain('Buttons:')
    expect(compiled.skillsYaml).toContain('showdialog{dialog=QuestAccepted}')
    expect(compiled.skillsYaml).toContain('showdialog{dialog=QuestDeclined}')
    expect(compiled.attachSkillLine).toContain('showdialog{dialog=QuestOffer}')
    expect(compiled.dialogFileName).toContain('dialog')
  })

  it('skips glue skills for end options with no edge', () => {
    const g = createEmptyGraph('Notice')
    const compiled = compileDialogGraph(g)
    expect(compiled.dialogYaml).toContain('Notice:')
    expect(compiled.skillsYaml).not.toContain('showdialog{')
  })
})

describe('validateDialogReferences', () => {
  it('extracts dialog refs from skill lines', () => {
    expect(extractDialogRefsFromContent('- showdialog{dialog=Welcome} @trigger')).toEqual(['Welcome'])
    expect(extractDialogRefsFromContent('- opendialog{d=QuestOffer} @PIR{r=5}')).toEqual(['QuestOffer'])
  })

  it('flags missing dialog ids', () => {
    const files: FileRecord[] = [
      {
        path: 'Packs/Demo/Skills/skills.yml',
        name: 'skills.yml',
        pack: 'Demo',
        category: 'skills',
        content: 'Open:\n  Skills:\n  - showdialog{dialog=MissingOne} @trigger\n',
        ids: ['Open'],
      },
      {
        path: 'Packs/Demo/Dialogs/dialogs.yml',
        name: 'dialogs.yml',
        pack: 'Demo',
        category: 'dialogs',
        content: 'Welcome:\n  Title: Hi\n',
        ids: ['Welcome'],
      },
    ]
    const issues = validateDialogReferences(files)
    expect(issues.some((i) => i.missingId === 'MissingOne')).toBe(true)
  })
})
