export interface FsTextFile {
  path: string
  name: string
  content: string
}

export interface ScanResult {
  rootPath: string
  files: FsTextFile[]
  canWriteToDisk: boolean
}

const SKIP_DIRS = new Set(['.internal', '.git', 'node_modules', 'logs'])

const fileHandleByPath = new Map<string, FileSystemFileHandle>()
let activeRootHandle: FileSystemDirectoryHandle | null = null
let activeRootName = 'Selected Folder'
let canWriteToDisk = false

function isYamlFile(name: string): boolean {
  const lower = name.toLowerCase()
  return lower.endsWith('.yml') || lower.endsWith('.yaml')
}

function isScannableFile(name: string, pathPrefix: string): boolean {
  if (isYamlFile(name)) return true
  const lower = name.toLowerCase()
  if (!lower.endsWith('.txt')) return false
  const prefix = pathPrefix.replace(/\\/g, '/').toLowerCase()
  return prefix.includes('exp-curves') || prefix.includes('exp_curves')
}

function shouldSkipPath(parts: string[]): boolean {
  return parts.some((part) => SKIP_DIRS.has(part.toLowerCase()) || (part.startsWith('.') && part.length > 1))
}

export function folderOpenSupported(): boolean {
  return canUseDirectoryPicker() || canUseFolderInput()
}

/** True only when the browser can pick a writable folder (needed to save a new pack). */
export function directoryPickerSupported(): boolean {
  return canUseDirectoryPicker()
}

export function getCanWriteToDisk(): boolean {
  return canWriteToDisk
}

function canUseDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

function canUseFolderInput(): boolean {
  if (typeof document === 'undefined') return false
  const input = document.createElement('input')
  return 'webkitdirectory' in input
}

async function walkDirectory(
  dirHandle: FileSystemDirectoryHandle,
  pathPrefix: string,
  files: FsTextFile[],
): Promise<void> {
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'directory') {
      if (SKIP_DIRS.has(name.toLowerCase()) || name.startsWith('.')) continue
      const nextPath = pathPrefix ? `${pathPrefix}/${name}` : name
      await walkDirectory(handle, nextPath, files)
      continue
    }
    if (!isScannableFile(name, pathPrefix)) continue
    const path = pathPrefix ? `${pathPrefix}/${name}` : name
    const file = await handle.getFile()
    const content = await file.text()
    fileHandleByPath.set(path, handle)
    files.push({ path, name, content })
  }
}

async function ensureWriteAccess(handle: FileSystemDirectoryHandle): Promise<void> {
  if (typeof handle.requestPermission !== 'function') return
  const current = await handle.queryPermission?.({ mode: 'readwrite' })
  if (current === 'granted') return
  const next = await handle.requestPermission({ mode: 'readwrite' })
  if (next !== 'granted') {
    throw new Error('Write access was not granted. Allow editing this folder and try again.')
  }
}

export async function queryRootWritePermission(
  handle: FileSystemDirectoryHandle,
): Promise<PermissionState | 'unknown'> {
  if (typeof handle.queryPermission !== 'function') return 'unknown'
  return handle.queryPermission({ mode: 'readwrite' })
}

/** Attach a previously granted folder handle and rebuild file handles for saving. */
export async function attachRootHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  activeRootHandle = handle
  activeRootName = handle.name
  canWriteToDisk = true
  fileHandleByPath.clear()
  await walkDirectory(handle, '', [])
}

export function getActiveRootHandle(): FileSystemDirectoryHandle | null {
  return activeRootHandle
}

export async function reconnectRootFolder(
  handle: FileSystemDirectoryHandle,
): Promise<{ rootPath: string; canWrite: boolean }> {
  await ensureWriteAccess(handle)
  await attachRootHandle(handle)
  return { rootPath: handle.name, canWrite: true }
}

async function scanWithDirectoryPicker(): Promise<ScanResult> {
  if (!window.showDirectoryPicker) {
    throw new Error('Directory picker is not available.')
  }

  const rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
  await ensureWriteAccess(rootHandle)

  activeRootHandle = rootHandle
  activeRootName = rootHandle.name
  canWriteToDisk = true
  fileHandleByPath.clear()

  const files: FsTextFile[] = []
  await walkDirectory(rootHandle, '', files)
  return { rootPath: rootHandle.name, files, canWriteToDisk: true }
}

function scanWithFolderInput(): Promise<ScanResult> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.setAttribute('webkitdirectory', '')
    input.setAttribute('directory', '')

    input.addEventListener('cancel', () => {
      reject(new DOMException('Cancelled', 'AbortError'))
    })

    input.addEventListener('change', async () => {
      const list = input.files
      if (!list || list.length === 0) {
        reject(new DOMException('Cancelled', 'AbortError'))
        return
      }

      const files: FsTextFile[] = []
      let rootName = 'Selected Folder'

      for (const file of Array.from(list)) {
        const relative = file.webkitRelativePath || file.name
        const parts = relative.split('/').filter(Boolean)
        if (parts.length === 0) continue
        rootName = parts[0] ?? rootName
        const name = parts[parts.length - 1] ?? file.name
        const nested = parts.slice(1)
        const nestedPrefix = nested.slice(0, -1).join('/')
        if (!isScannableFile(name, nestedPrefix) || shouldSkipPath(nested)) continue
        const path = nested.join('/') || name
        files.push({ path, name, content: await file.text() })
      }

      activeRootHandle = null
      activeRootName = rootName
      canWriteToDisk = false
      fileHandleByPath.clear()
      resolve({ rootPath: rootName, files, canWriteToDisk: false })
    })

    input.click()
  })
}

export async function chooseAndScanFolder(): Promise<ScanResult> {
  if (canUseDirectoryPicker()) {
    try {
      return await scanWithDirectoryPicker()
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
    }
  }

  if (canUseFolderInput()) {
    return scanWithFolderInput()
  }

  throw new Error('This browser cannot open folders. Try Chrome, Edge, Brave, or Firefox.')
}

function downloadText(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function saveTextFile(
  filePath: string,
  content: string,
): Promise<{ backupPath: string | null; downloaded: boolean }> {
  const fileHandle = fileHandleByPath.get(filePath)
  if (!fileHandle) {
    const filename = filePath.split('/').pop() ?? 'file.yml'
    downloadText(filename, content)
    return { backupPath: null, downloaded: true }
  }

  const original = await (await fileHandle.getFile()).text()
  const backupName = `${fileHandle.name}.bak.${Date.now()}`
  const parentPath = filePath.split('/').slice(0, -1).join('/')
  const backupDisplay = parentPath
    ? `${activeRootName}/${parentPath}/${backupName}`
    : `${activeRootName}/${backupName}`

  let backupPath: string | null = null
  try {
    const backupDir = await resolveParentDirectory(filePath)
    const backupHandle = await backupDir.getFileHandle(backupName, { create: true })
    const backupWritable = await backupHandle.createWritable()
    await backupWritable.write(original)
    await backupWritable.close()
    backupPath = backupDisplay
  } catch {
    backupPath = null
  }

  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()

  return { backupPath, downloaded: false }
}

// ── Backup folder ──────────────────────────────────────────────────────────
let backupFolderHandle: FileSystemDirectoryHandle | null = null

export function hasBackupFolder(): boolean {
  return backupFolderHandle !== null
}

export function getBackupFolderHandle(): FileSystemDirectoryHandle | null {
  return backupFolderHandle
}

export async function pickBackupFolder(): Promise<string> {
  if (!window.showDirectoryPicker) throw new Error('Directory picker not available.')
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
  await ensureWriteAccess(handle)
  backupFolderHandle = handle
  return handle.name
}

export function setBackupFolderHandle(handle: FileSystemDirectoryHandle | null): void {
  backupFolderHandle = handle
}

export async function writeBackupZip(filename: string, data: Uint8Array): Promise<void> {
  if (!backupFolderHandle) throw new Error('No backup folder selected.')
  const fileHandle = await backupFolderHandle.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(data instanceof Uint8Array ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer : data)
  await writable.close()
}

async function resolveParentDirectory(filePath: string): Promise<FileSystemDirectoryHandle> {
  if (!activeRootHandle) {
    throw new Error('No folder is open. Open a folder first.')
  }
  const segments = filePath.split('/').filter(Boolean)
  if (segments.length === 0) {
    throw new Error('Invalid file path')
  }
  let current = activeRootHandle
  for (let i = 0; i < segments.length - 1; i += 1) {
    current = await current.getDirectoryHandle(segments[i], { create: false })
  }
  return current
}

/** Remove a file under the active folder. No-op if the pack is memory-only. */
export async function deleteTextFile(filePath: string): Promise<void> {
  fileHandleByPath.delete(filePath)
  if (!activeRootHandle || !canWriteToDisk) return
  const parent = await resolveParentDirectory(filePath)
  const name = filePath.split('/').pop()
  if (!name) throw new Error('Invalid file path')
  await parent.removeEntry(name)
}

async function ensureDirectoryPath(
  root: FileSystemDirectoryHandle,
  dirPath: string,
): Promise<FileSystemDirectoryHandle> {
  const segments = dirPath.split('/').filter(Boolean)
  let current = root
  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment, { create: true })
  }
  return current
}

/** Bind an in-memory pack to a picked folder and write all files. */
export async function writePackToDirectory(
  files: { path: string; content: string }[],
): Promise<{ rootPath: string }> {
  if (!window.showDirectoryPicker) {
    throw new Error('Directory picker is not available.')
  }
  const rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
  await ensureWriteAccess(rootHandle)

  activeRootHandle = rootHandle
  activeRootName = rootHandle.name
  canWriteToDisk = true
  fileHandleByPath.clear()

  for (const file of files) {
    const segments = file.path.split('/').filter(Boolean)
    if (segments.length === 0) continue
    const fileName = segments[segments.length - 1]
    const parentPath = segments.slice(0, -1).join('/')
    const parent = parentPath
      ? await ensureDirectoryPath(rootHandle, parentPath)
      : rootHandle
    const handle = await parent.getFileHandle(fileName, { create: true })
    const writable = await handle.createWritable()
    await writable.write(file.content)
    await writable.close()
    fileHandleByPath.set(file.path, handle)
  }

  return { rootPath: rootHandle.name }
}

/** Create or overwrite a file under the active root (for new class/skill files). */
export async function createOrWriteTextFile(
  filePath: string,
  content: string,
): Promise<void> {
  if (!activeRootHandle || !canWriteToDisk) {
    // No disk binding — caller keeps content in memory / dirtyMap
    return
  }
  const segments = filePath.split('/').filter(Boolean)
  if (segments.length === 0) throw new Error('Invalid file path')
  const fileName = segments[segments.length - 1]
  const parentPath = segments.slice(0, -1).join('/')
  const parent = parentPath
    ? await ensureDirectoryPath(activeRootHandle, parentPath)
    : activeRootHandle
  const handle = await parent.getFileHandle(fileName, { create: true })
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
  fileHandleByPath.set(filePath, handle)
}

export function clearActiveFolder(): void {
  activeRootHandle = null
  activeRootName = 'Selected Folder'
  canWriteToDisk = false
  fileHandleByPath.clear()
}

export function getActiveRootName(): string {
  return activeRootName
}
