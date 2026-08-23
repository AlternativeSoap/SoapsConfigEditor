import { describe, expect, it } from 'vitest'
import { applyTemplateHint, upsertTopLevelYaml } from './templateApply'
import { detectTemplateHints } from './templateHints'
import { parseYaml } from '../yaml/parseYaml'
import type { FileRecord } from '../../types'

function mobFile(content: string): FileRecord {
  return {
    path: 'Pack/Mobs/mobs.yml',
    name: 'mobs.yml',
    pack: 'Pack',
    category: 'mobs',
    content,
    ids: [],
  }
}

describe('applyTemplateHint', () => {
  it('extracts a new template and slims children', () => {
    const content = `ZombieA:
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
`
    const files = [mobFile(content)]
    const hint = detectTemplateHints(files).find((h) => h.kind === 'extract_template')
    expect(hint).toBeTruthy()

    const result = applyTemplateHint(files, {
      hint: hint!,
      selectedKeys: hint!.keys,
      templateId: 'Undead_Base',
      createTemplate: true,
    })

    expect(result.patches['Pack/Mobs/mobs.yml']).toBeTruthy()
    const data = parseYaml(result.patches['Pack/Mobs/mobs.yml']!).data as Record<string, Record<string, unknown>>
    expect(data.Undead_Base?.Faction).toBe('Undead')
    expect(data.ZombieA?.Template).toBe('Undead_Base')
    expect(data.ZombieA?.Faction).toBeUndefined()
    expect(data.ZombieA?.Health).toBe(20)
    expect(data.ZombieB?.Template).toBe('Undead_Base')
    expect(data.ZombieB?.Health).toBe(30)
  })

  it('use_existing only adds Template and strips matching keys', () => {
    const content = `UndeadBase:
  Type: ZOMBIE
  Faction: Undead
  Options:
    MovementSpeed: 0.25
    AlwaysShowName: true
    Silent: false
ZombieA:
  Type: ZOMBIE
  Health: 20
  Faction: Undead
  Options:
    MovementSpeed: 0.25
    AlwaysShowName: true
    Silent: false
ZombieB:
  Type: HUSK
  Health: 30
  Faction: Undead
  Options:
    MovementSpeed: 0.25
    AlwaysShowName: true
    Silent: false
`
    const files = [mobFile(content)]
    const hint = detectTemplateHints(files).find((h) => h.kind === 'use_existing_template')
    expect(hint).toBeTruthy()
    expect(hint!.templateId).toBe('UndeadBase')

    const result = applyTemplateHint(files, {
      hint: hint!,
      selectedKeys: hint!.keys,
      templateId: hint!.templateId,
      createTemplate: false,
    })

    const data = parseYaml(result.patches['Pack/Mobs/mobs.yml']!).data as Record<string, Record<string, unknown>>
    expect(data.UndeadBase?.Faction).toBe('Undead')
    expect(data.ZombieA?.Template).toBe('UndeadBase')
    expect(data.ZombieA?.Faction).toBeUndefined()
    expect(data.ZombieB?.Template).toBe('UndeadBase')
  })
})

describe('upsertTopLevelYaml', () => {
  it('replaces an existing top-level entry', () => {
    const next = upsertTopLevelYaml(
      `A:
  Health: 1
B:
  Health: 2
`,
      'A',
      { Health: 9, Template: 'Base' },
    )
    expect(next).toContain('Health: 9')
    expect(next).toContain('Template: Base')
    expect(next).toContain('B:')
  })
})
