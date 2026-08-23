import { describe, expect, it } from 'vitest'
import type { FileRecord } from '../../types'
import {
  defaultYamlFileNameFromId,
  dirnameOf,
  joinPath,
  resolveCreateFolder,
  sanitizeYamlFileName,
} from './createTarget'

function file(path: string, category: FileRecord['category'] = 'mobs'): FileRecord {
  return { path, name: path.split('/').pop() ?? path, content: '', category, pack: 'Demo', ids: [] }
}

describe('createTarget', () => {
  it('sanitizes yaml file names', () => {
    expect(sanitizeYamlFileName('Skeletons')).toBe('Skeletons.yml')
    expect(sanitizeYamlFileName('boss mobs.yml')).toBe('boss_mobs.yml')
    expect(sanitizeYamlFileName('../evil.yaml')).toBe('evil.yaml')
  })

  it('builds default names from ids', () => {
    expect(defaultYamlFileNameFromId('MY_NEW_MOB', 'mob')).toBe('my_new_mob.yml')
  })

  it('resolves folder from an existing mobs file', () => {
    const files = [file('MythicMobs/Packs/Demo/Mobs/mobs.yml')]
    expect(resolveCreateFolder('mobs', files, files[0]!.path)).toBe(
      'MythicMobs/Packs/Demo/Mobs',
    )
  })

  it('resolves folder from suggested path when creating beside other yaml files', () => {
    const files = [
      file('Custom Pack/Mobs/zombies.yml'),
      file('Custom Pack/Mobs/skeletons.yml'),
    ]
    expect(resolveCreateFolder('mobs', files, 'Custom Pack/Mobs/zombies.yml')).toBe(
      'Custom Pack/Mobs',
    )
  })

  it('joins paths', () => {
    expect(joinPath('Pack/Mobs', 'extra.yml')).toBe('Pack/Mobs/extra.yml')
    expect(dirnameOf('Pack/Mobs/extra.yml')).toBe('Pack/Mobs')
  })
})
