import { describe, expect, it } from 'vitest'
import { buildPackZip, packZipFilename } from './packZip'

describe('exportPack', () => {
  it('builds a zip with normalized paths', () => {
    const zip = buildPackZip([
      { path: 'MythicMobs/Packs/Demo/Mobs/mobs.yml', content: 'TestMob:\n  Type: ZOMBIE\n' },
      { path: 'MythicMobs/Packs/Demo/packinfo.yml', content: 'Pack:\n  Name: Demo\n' },
    ])
    expect(zip.byteLength).toBeGreaterThan(0)
  })

  it('names export files from the pack label', () => {
    expect(packZipFilename('Galebound Covenant')).toMatch(/^Galebound_Covenant_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.zip$/)
  })
})
