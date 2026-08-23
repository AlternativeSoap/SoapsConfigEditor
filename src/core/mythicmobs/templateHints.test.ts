import { describe, expect, it } from 'vitest'
import { detectTemplateHints } from './templateHints'
import type { FileRecord } from '../../types'

function mobFile(content: string, path = 'Pack/Mobs/mobs.yml'): FileRecord {
  return {
    path,
    name: 'mobs.yml',
    pack: 'Pack',
    category: 'mobs',
    content,
    ids: [],
  }
}

describe('detectTemplateHints', () => {
  it('suggests extract_template when mobs share Faction and Options', () => {
    const files = [
      mobFile(`ZombieA:
  Type: ZOMBIE
  Health: 20
  Faction: Undead
  Options:
    MovementSpeed: 0.25
    AlwaysShowName: true
    Silent: false
  Skills:
    - skill{s=AOnly} @self ~onSpawn
ZombieB:
  Type: ZOMBIE
  Health: 30
  Faction: Undead
  Options:
    MovementSpeed: 0.25
    AlwaysShowName: true
    Silent: false
  Skills:
    - skill{s=BOnly} @self ~onSpawn
ZombieC:
  Type: HUSK
  Health: 40
  Faction: Undead
  Options:
    MovementSpeed: 0.25
    AlwaysShowName: true
    Silent: false
  Skills:
    - skill{s=COnly} @self ~onSpawn
`),
    ]
    const hints = detectTemplateHints(files)
    const extract = hints.find((h) => h.kind === 'extract_template')
    expect(extract).toBeTruthy()
    expect(extract!.mobIds.length).toBeGreaterThanOrEqual(2)
    expect(extract!.keys).toEqual(expect.arrayContaining(['Faction', 'Options']))
    expect(extract!.createTemplate).toBe(true)
  })

  it('suggests use_existing_template when shared block equals a pure base mob', () => {
    const files = [
      mobFile(`UndeadBase:
  Type: ZOMBIE
  Faction: Undead
  Options:
    MovementSpeed: 0.25
    AlwaysShowName: true
    Silent: false
  Skills:
    - skill{s=Hit} @target ~onAttack
    - skill{s=Hit} @self ~onDamaged
    - skill{s=Roar} @PlayersInRadius{r=10} ~onSpawn
ZombieA:
  Type: ZOMBIE
  Health: 20
  Faction: Undead
  Options:
    MovementSpeed: 0.25
    AlwaysShowName: true
    Silent: false
  Skills:
    - skill{s=Hit} @target ~onAttack
    - skill{s=Hit} @self ~onDamaged
    - skill{s=Roar} @PlayersInRadius{r=10} ~onSpawn
ZombieB:
  Type: HUSK
  Health: 30
  Faction: Undead
  Options:
    MovementSpeed: 0.25
    AlwaysShowName: true
    Silent: false
  Skills:
    - skill{s=Hit} @target ~onAttack
    - skill{s=Hit} @self ~onDamaged
    - skill{s=Roar} @PlayersInRadius{r=10} ~onSpawn
`),
    ]
    const hints = detectTemplateHints(files)
    const useExisting = hints.find((h) => h.kind === 'use_existing_template')
    expect(useExisting).toBeTruthy()
    expect(useExisting!.templateId).toBe('UndeadBase')
    expect(useExisting!.mobIds).not.toContain('UndeadBase')
  })

  it('does not hint when only identity fields match', () => {
    const files = [
      mobFile(`A:
  Type: ZOMBIE
  Health: 20
  Damage: 2
B:
  Type: ZOMBIE
  Health: 20
  Damage: 2
`),
    ]
    const hints = detectTemplateHints(files).filter((h) => h.kind !== 'missing_template')
    expect(hints).toEqual([])
  })

  it('suppresses already-templated shared fields', () => {
    const files = [
      mobFile(`UndeadBase:
  Faction: Undead
  Options:
    MovementSpeed: 0.25
    AlwaysShowName: true
    Silent: false
ZombieA:
  Template: UndeadBase
  Health: 20
ZombieB:
  Template: UndeadBase
  Health: 30
`),
    ]
    const hints = detectTemplateHints(files).filter((h) => h.kind !== 'missing_template')
    expect(hints).toEqual([])
  })

  it('reports missing_template', () => {
    const files = [
      mobFile(`ZombieA:
  Template: MissingBase
  Health: 20
`),
    ]
    const hints = detectTemplateHints(files)
    expect(hints.some((h) => h.kind === 'missing_template' && h.templateId === 'MissingBase')).toBe(true)
  })
})
