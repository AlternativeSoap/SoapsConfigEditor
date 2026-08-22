import type { FileRecord, MythicCategory, SessionMode, WorkspaceKind } from '../../types'
import type { MythicAddons } from '../workspaces/mythicAddons'

const DB_NAME = 'soaps-config-editor'
const DB_VERSION = 1
const SESSION_KEY = 'current'
const ROOT_HANDLE_KEY = 'root'
const BACKUP_HANDLE_KEY = 'backup'

export interface EditorSessionSnapshot {
  version: 1
  savedAt: number
  workspaceId: WorkspaceKind | null
  /** MythicMobs add-on toggles (ignored for other workspaces). */
  mythicAddons?: MythicAddons
  sessionMode: SessionMode
  rootLabel: string
  packDisplayName: string
  files: FileRecord[]
  dirtyMap: Record<string, string>
  activePath: string
  draft: string
  openPacks: string[]
  openCategories: string[]
  search: string
  categoryFilter: 'all' | MythicCategory
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available.'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session')
      }
      if (!db.objectStoreNames.contains('handles')) {
        db.createObjectStore('handles')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB.'))
  })
}

async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.get(key)
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed.'))
  })
}

async function idbPut(storeName: string, key: string, value: unknown): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.put(value, key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('IndexedDB write failed.'))
  })
}

async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('IndexedDB delete failed.'))
  })
}

export async function loadEditorSession(): Promise<EditorSessionSnapshot | null> {
  try {
    const snapshot = await idbGet<EditorSessionSnapshot>('session', SESSION_KEY)
    if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.files)) return null
    return snapshot
  } catch {
    return null
  }
}

export async function saveEditorSession(snapshot: EditorSessionSnapshot): Promise<void> {
  try {
    await idbPut('session', SESSION_KEY, snapshot)
  } catch {
    /* private mode / quota */
  }
}

export async function clearEditorSession(): Promise<void> {
  try {
    await idbDelete('session', SESSION_KEY)
  } catch {
    /* ignore */
  }
}

export async function saveRootHandle(handle: FileSystemDirectoryHandle | null): Promise<void> {
  try {
    if (handle) await idbPut('handles', ROOT_HANDLE_KEY, handle)
    else await idbDelete('handles', ROOT_HANDLE_KEY)
  } catch {
    /* ignore */
  }
}

export async function loadRootHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await idbGet<FileSystemDirectoryHandle>('handles', ROOT_HANDLE_KEY)
  } catch {
    return null
  }
}

export async function saveBackupHandle(handle: FileSystemDirectoryHandle | null): Promise<void> {
  try {
    if (handle) await idbPut('handles', BACKUP_HANDLE_KEY, handle)
    else await idbDelete('handles', BACKUP_HANDLE_KEY)
  } catch {
    /* ignore */
  }
}

export async function loadBackupHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await idbGet<FileSystemDirectoryHandle>('handles', BACKUP_HANDLE_KEY)
  } catch {
    return null
  }
}

export async function probeEditorStorage(): Promise<'ok' | 'blocked' | 'unsupported'> {
  if (typeof indexedDB === 'undefined') return 'unsupported'
  try {
    await openDb()
    return 'ok'
  } catch {
    return 'blocked'
  }
}

export function formatSessionAge(savedAt: number): string {
  const mins = Math.round((Date.now() - savedAt) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours} hr ago`
  return `${Math.round(hours / 24)} days ago`
}
