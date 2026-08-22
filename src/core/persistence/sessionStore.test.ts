import { describe, expect, it, beforeEach } from 'vitest'
import {
  clearEditorSession,
  loadEditorSession,
  saveEditorSession,
  type EditorSessionSnapshot,
} from './sessionStore'

const idbAvailable = typeof indexedDB !== 'undefined'

const snapshot: EditorSessionSnapshot = {
  version: 1,
  savedAt: Date.now(),
  workspaceId: 'mythicmobs',
  sessionMode: 'new-pack',
  rootLabel: 'New: Demo (unsaved)',
  packDisplayName: 'Demo',
  files: [
    {
      path: 'Packs/Demo/mobs/DemoMob.yml',
      name: 'DemoMob.yml',
      pack: 'Demo',
      category: 'mobs',
      content: 'DemoMob:\n  Type: ZOMBIE\n',
      ids: ['DemoMob'],
    },
  ],
  dirtyMap: {},
  activePath: 'Packs/Demo/mobs/DemoMob.yml',
  draft: 'DemoMob:\n  Type: ZOMBIE\n',
  openPacks: ['Demo'],
  openCategories: [],
  search: '',
  categoryFilter: 'all',
}

describe('sessionStore', () => {
  beforeEach(async () => {
    await clearEditorSession()
  })

  it.skipIf(!idbAvailable)('saves and loads an editor session snapshot', async () => {
    await saveEditorSession(snapshot)
    const loaded = await loadEditorSession()
    expect(loaded?.rootLabel).toBe(snapshot.rootLabel)
    expect(loaded?.files).toHaveLength(1)
    expect(loaded?.files[0]?.ids).toEqual(['DemoMob'])
  })

  it.skipIf(!idbAvailable)('returns null when no session is stored', async () => {
    expect(await loadEditorSession()).toBeNull()
  })
})
