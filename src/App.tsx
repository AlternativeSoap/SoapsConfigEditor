import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import './App.css'
import {
  attachRootHandle,
  chooseAndScanFolder,
  clearActiveFolder,
  createOrWriteTextFile,
  deleteTextFile,
  directoryPickerSupported,
  folderOpenSupported,
  getActiveRootHandle,
  getActiveRootName,
  getBackupFolderHandle,
  hasBackupFolder,
  pickBackupFolder,
  queryRootWritePermission,
  reconnectRootFolder,
  saveTextFile,
  setBackupFolderHandle,
  writePackToDirectory,
} from './core/filesystem/browserFs'
import { backupPack } from './core/filesystem/backup'
import {
  detectBrowserKind,
  folderWriteBlockedHelp,
  type BrowserKind,
} from './core/filesystem/browserCapabilities'
import {
  clearEditorSession,
  formatSessionAge,
  loadBackupHandle,
  loadEditorSession,
  loadRootHandle,
  probeEditorStorage,
  saveBackupHandle,
  saveEditorSession,
  saveRootHandle,
  type EditorSessionSnapshot,
} from './core/persistence/sessionStore'
import { classifyMythicCategory, detectPackName } from './core/mythicmobs/classify'
import {
  classifyMMOCoreCategory,
  detectMMOCorePackName,
} from './core/mmocore/classify'
import { indexMMOCorePack } from './core/mmocore/indexPack'
import { matchesSearch } from './core/search/matchFiles'
import { buildPackTree, categoryKey, CATEGORY_LABEL } from './core/search/packTree'
import { extractTopLevelIds, parseYaml } from './core/yaml/parseYaml'
import { getWorkspace, parseWorkspaceKind } from './core/workspaces/profiles'
import { sanitizePackFolderName, scaffoldPack } from './core/workspaces/scaffoldPack'
import type {
  AcPrefs,
  CreateKind,
  FileRecord,
  MythicCategory,
  PackIndex,
  SavePrefs,
  SessionLogEntry,
  SessionMode,
  ThemeMode,
  WorkspaceKind,
} from './types'
import { DEFAULT_SAVE_PREFS } from './types'
import { DEFAULT_AC_PREFS } from './core/mythicmobs/autocomplete'
import { CreateDialog } from './ui/CreateDialog'
import { DependencyPanel } from './ui/DependencyPanel'
import { PackIssuesPanel } from './ui/PackIssuesPanel'
import { NewMenu } from './ui/NewMenu'
import { NewPackDialog, type NewPackStartOptions } from './ui/NewPackDialog'
import { AlertModal } from './ui/AlertModal'
import { ClassWizardDialog } from './ui/mmocore/ClassWizardDialog'
import { CreateMythicLibSkillDialog } from './ui/mmocore/CreateMythicLibSkillDialog'
import { ElementsEditorDialog } from './ui/mmocore/ElementsEditorDialog'
import { SkillCastingDialog } from './ui/mmocore/SkillCastingDialog'
import { ReferencePanel } from './ui/ReferencePanel'
import { SettingsMenu } from './ui/SettingsMenu'
import { TopbarFileMenu } from './ui/TopbarFileMenu'
import { WorkspaceTiles } from './ui/WorkspaceTiles'
import { YamlEditor, type YamlEditorHandle } from './ui/YamlEditor'
import { EMPTY_CONTEXT, type SkillLineContext } from './core/mythicmobs/skillLineAttrs'

function App() {
  const [theme, setTheme] = useState<ThemeMode>(
    () => (localStorage.getItem('soaps-theme') as ThemeMode) ?? 'dark',
  )
  const [rootLabel, setRootLabel] = useState('')
  const [files, setFiles] = useState<FileRecord[]>([])
  const [canWriteToDisk, setCanWriteToDisk] = useState(true)
  const [activePath, setActivePath] = useState('')
  const [draft, setDraft] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | MythicCategory>('all')
  const [openPacks, setOpenPacks] = useState<Set<string>>(new Set())
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())
  const [createKind, setCreateKind] = useState<CreateKind | null>(null)
  const [newPackOpen, setNewPackOpen] = useState(false)
  const [alertModal, setAlertModal] = useState<{
    title: string
    message: string
    detail?: string
    tone?: 'warning' | 'error' | 'info'
  } | null>(null)
  const [sessionMode, setSessionMode] = useState<SessionMode>('opened')
  const [packDisplayName, setPackDisplayName] = useState('MyPack')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [refPanelOpen, setRefPanelOpen] = useState(false)
  const [refPanelHidden, setRefPanelHidden] = useState(
    () => localStorage.getItem('soaps-ref-hidden') === '1',
  )
  const [depPanelOpen, setDepPanelOpen] = useState(true)
  const [packIssuesOpen, setPackIssuesOpen] = useState(true)
  const [backupReady, setBackupReady] = useState(() => hasBackupFolder())
  const [acPrefs, setAcPrefs] = useState<AcPrefs>(() => {
    try {
      const stored = localStorage.getItem('soaps-ac-prefs')
      return stored ? { ...DEFAULT_AC_PREFS, ...JSON.parse(stored) } : DEFAULT_AC_PREFS
    } catch {
      return DEFAULT_AC_PREFS
    }
  })

  function updateAcPrefs(patch: Partial<AcPrefs>) {
    setAcPrefs((prev) => {
      const next = { ...prev, ...patch }
      localStorage.setItem('soaps-ac-prefs', JSON.stringify(next))
      return next
    })
  }

  const [savePrefs, setSavePrefs] = useState<SavePrefs>(() => {
    try {
      const stored = localStorage.getItem('soaps-save-prefs')
      return stored ? { ...DEFAULT_SAVE_PREFS, ...JSON.parse(stored) } : DEFAULT_SAVE_PREFS
    } catch {
      return DEFAULT_SAVE_PREFS
    }
  })

  function updateSavePrefs(patch: Partial<SavePrefs>) {
    setSavePrefs((prev) => {
      const next = { ...prev, ...patch }
      localStorage.setItem('soaps-save-prefs', JSON.stringify(next))
      return next
    })
  }

  // dirtyMap: path → draft content for every file edited this session
  const [dirtyMap, setDirtyMap] = useState<Map<string, string>>(new Map())
  // Counter for triggering auto-backup every N saves
  const saveCountRef = useRef(0)
  // In-memory session change log
  const [sessionLog, setSessionLog] = useState<SessionLogEntry[]>([])
  const [sessionLogOpen, setSessionLogOpen] = useState(false)

  const [refPanelWidth, setRefPanelWidth] = useState(() => {
    const stored = Number(localStorage.getItem('soaps-ref-width'))
    return Number.isFinite(stored) && stored >= 200 ? stored : 280
  })
  const [workspaceId, setWorkspaceId] = useState<WorkspaceKind | null>(() =>
    parseWorkspaceKind(localStorage.getItem('soaps-workspace')),
  )
  const [sidebarHidden, setSidebarHidden] = useState(
    () => localStorage.getItem('soaps-sidebar-hidden') === '1',
  )
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = Number(localStorage.getItem('soaps-sidebar-width'))
    return Number.isFinite(stored) && stored >= 200 ? stored : 280
  })
  const [sessionHydrated, setSessionHydrated] = useState(false)
  const [folderWriteBlocked, setFolderWriteBlocked] = useState(false)
  const [browserKind, setBrowserKind] = useState<BrowserKind>('other')
  const dragRef = useRef({ active: false, startX: 0, startWidth: 280 })
  const refDragRef = useRef({ active: false, startX: 0, startWidth: 280 })
  const editorRef = useRef<YamlEditorHandle>(null)
  const [editorLineContext, setEditorLineContext] = useState<SkillLineContext>(EMPTY_CONTEXT)

  const workspace = getWorkspace(workspaceId)
  const isMythicMobs = workspaceId === 'mythicmobs'
  const isMMOCore = workspaceId === 'mmocore'
  const hasFolder = files.length > 0 || rootLabel.length > 0
  const activeFile = files.find((file) => file.path === activePath) ?? null
  const isDirty = activePath ? dirtyMap.has(activePath) : false
  const dirtyCount = dirtyMap.size
  const needsSaveFolder = sessionMode === 'new-pack' && !canWriteToDisk

  // Latest values for timers/shortcuts/async saves (avoid stale closures)
  const dirtyMapRef = useRef(dirtyMap)
  dirtyMapRef.current = dirtyMap
  const savePrefsRef = useRef(savePrefs)
  savePrefsRef.current = savePrefs
  const filesRef = useRef(files)
  filesRef.current = files
  const needsSaveFolderRef = useRef(needsSaveFolder)
  needsSaveFolderRef.current = needsSaveFolder
  const canWriteToDiskRef = useRef(canWriteToDisk)
  canWriteToDiskRef.current = canWriteToDisk
  const draftRef = useRef(draft)
  draftRef.current = draft
  const activePathRef = useRef(activePath)
  activePathRef.current = activePath
  const sessionModeRef = useRef(sessionMode)
  sessionModeRef.current = sessionMode
  const rootLabelRef = useRef(rootLabel)
  rootLabelRef.current = rootLabel
  const packDisplayNameRef = useRef(packDisplayName)
  packDisplayNameRef.current = packDisplayName
  const workspaceIdRef = useRef(workspaceId)
  workspaceIdRef.current = workspaceId
  const openPacksRef = useRef(openPacks)
  openPacksRef.current = openPacks
  const openCategoriesRef = useRef(openCategories)
  openCategoriesRef.current = openCategories
  const searchRef = useRef(search)
  searchRef.current = search
  const categoryFilterRef = useRef(categoryFilter)
  categoryFilterRef.current = categoryFilter

  function buildSessionSnapshot(): EditorSessionSnapshot | null {
    const currentFiles = filesRef.current
    if (currentFiles.length === 0 && rootLabelRef.current.length === 0) return null
    const dirtyEntries = new Map(dirtyMapRef.current)
    const path = activePathRef.current
    if (path) {
      dirtyEntries.set(path, draftRef.current)
    }
    return {
      version: 1,
      savedAt: Date.now(),
      workspaceId: workspaceIdRef.current,
      sessionMode: sessionModeRef.current,
      rootLabel: rootLabelRef.current,
      packDisplayName: packDisplayNameRef.current,
      files: currentFiles,
      dirtyMap: Object.fromEntries(dirtyEntries),
      activePath: path,
      draft: draftRef.current,
      openPacks: [...openPacksRef.current],
      openCategories: [...openCategoriesRef.current],
      search: searchRef.current,
      categoryFilter: categoryFilterRef.current,
    }
  }

  function flushSessionToBrowser(): void {
    const snapshot = buildSessionSnapshot()
    if (!snapshot) {
      void clearEditorSession()
      return
    }
    void saveEditorSession(snapshot)
    void saveRootHandle(getActiveRootHandle())
  }

  function applySessionSnapshot(snapshot: EditorSessionSnapshot): void {
    if (snapshot.workspaceId) {
      setWorkspaceId(snapshot.workspaceId)
      localStorage.setItem('soaps-workspace', snapshot.workspaceId)
    }
    setFiles(snapshot.files)
    setRootLabel(snapshot.rootLabel)
    setSessionMode(snapshot.sessionMode)
    setPackDisplayName(snapshot.packDisplayName)
    setDirtyMap(new Map(Object.entries(snapshot.dirtyMap)))
    setActivePath(snapshot.activePath)
    setDraft(snapshot.draft)
    setOpenPacks(new Set(snapshot.openPacks))
    setOpenCategories(new Set(snapshot.openCategories))
    setSearch(snapshot.search)
    setCategoryFilter(snapshot.categoryFilter)
    setSessionLog([])
  }

  function classifyFile(path: string, rootPath: string): Pick<FileRecord, 'category' | 'pack'> {
    if (workspaceId === 'mmocore') {
      return {
        category: classifyMMOCoreCategory(path),
        pack: detectMMOCorePackName(path),
      }
    }
    return {
      category: classifyMythicCategory(path),
      pack: detectPackName(path, rootPath),
    }
  }

  function toFileRecord(
    file: { path: string; name: string; content: string },
    rootPath: string,
  ): FileRecord {
    const { category, pack } = classifyFile(file.path, rootPath)
    const ids =
      category === 'exp-curves' ? [] : extractTopLevelIds(parseYaml(file.content).data)
    return { ...file, category, pack, ids }
  }
  const parseIssues = useMemo(() => {
    if (!draft.trim()) return []
    if (activeFile?.path.toLowerCase().endsWith('.txt')) return []
    return parseYaml(draft).issues
  }, [draft, activeFile?.path])

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      if (categoryFilter !== 'all' && file.category !== categoryFilter) return false
      return matchesSearch(file, search)
    })
  }, [files, search, categoryFilter])

  const packTree = useMemo(() => buildPackTree(filteredFiles), [filteredFiles])
  const searching = search.trim().length > 0
  const availableCategories = useMemo(() => {
    const found = new Set<MythicCategory>()
    for (const file of files) found.add(file.category)
    return [...found].sort((a, b) => CATEGORY_LABEL[a].localeCompare(CATEGORY_LABEL[b]))
  }, [files])

  /** Saved files with pending editor drafts applied. */
  const effectiveFiles = useMemo(() => {
    if (dirtyMap.size === 0) return files
    return files.map((f) => {
      const pending = dirtyMap.get(f.path)
      if (pending === undefined) return f
      return {
        ...f,
        content: pending,
        ids:
          f.category === 'exp-curves'
            ? []
            : extractTopLevelIds(parseYaml(pending).data),
      }
    })
  }, [files, dirtyMap])

  const packIndex = useMemo<PackIndex>(() => ({
    mobIds: effectiveFiles.filter((f) => f.category === 'mobs').flatMap((f) => f.ids),
    itemIds: effectiveFiles.filter((f) => f.category === 'items').flatMap((f) => f.ids),
    skillIds: effectiveFiles.filter((f) => f.category === 'skills').flatMap((f) => f.ids),
    droptableIds: effectiveFiles.filter((f) => f.category === 'droptables').flatMap((f) => f.ids),
  }), [effectiveFiles])

  const mmocoreIndex = useMemo(() => indexMMOCorePack(effectiveFiles), [effectiveFiles])

  const mythicPackName = useMemo(() => {
    const fromMm = files.find((f) => f.path.replace(/\\/g, '/').includes('MythicMobs/Packs/'))
    if (fromMm) {
      const parts = fromMm.path.replace(/\\/g, '/').split('/')
      const idx = parts.findIndex((p) => p.toLowerCase() === 'packs')
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
    }
    return sanitizePackFolderName(packDisplayName)
  }, [files, packDisplayName])

  function isPackOpen(pack: string): boolean {
    if (searching) return true
    return openPacks.has(pack)
  }

  function isCategoryOpen(pack: string, category: MythicCategory): boolean {
    if (searching) return true
    return openCategories.has(categoryKey(pack, category))
  }

  function selectWorkspace(id: WorkspaceKind): void {
    setWorkspaceId(id)
    localStorage.setItem('soaps-workspace', id)
  }

  function changeWorkspace(): void {
    if (dirtyMap.size > 0) {
      const leave = window.confirm(`You have ${dirtyMap.size} unsaved file(s). Switch workspace and discard them?`)
      if (!leave) return
    }
    clearActiveFolder()
    void clearEditorSession()
    void saveRootHandle(null)
    setFiles([])
    setRootLabel('')
    setActivePath('')
    setDraft('')
    setDirtyMap(new Map())
    setSessionLog([])
    setStatusMessage('')
    setCreateKind(null)
    setRefPanelOpen(false)
    setSessionMode('opened')
    setCanWriteToDisk(true)
    setFolderWriteBlocked(false)
  }

  function applyTheme(nextTheme: ThemeMode): void {
    setTheme(nextTheme)
    localStorage.setItem('soaps-theme', nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
  }

  function toggleSidebar(): void {
    setSidebarHidden((hidden) => {
      const next = !hidden
      localStorage.setItem('soaps-sidebar-hidden', next ? '1' : '0')
      return next
    })
  }

  function startSidebarResize(event: React.PointerEvent<HTMLDivElement>): void {
    if (sidebarHidden) return
    event.preventDefault()
    dragRef.current = { active: true, startX: event.clientX, startWidth: sidebarWidth }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveSidebarResize(event: React.PointerEvent<HTMLDivElement>): void {
    if (!dragRef.current.active) return
    const next = Math.min(560, Math.max(200, dragRef.current.startWidth + event.clientX - dragRef.current.startX))
    setSidebarWidth(next)
  }

  function endSidebarResize(): void {
    if (!dragRef.current.active) return
    dragRef.current.active = false
    setSidebarWidth((width) => {
      localStorage.setItem('soaps-sidebar-width', String(width))
      return width
    })
  }

  function toggleRefPanel(): void {
    setRefPanelHidden((hidden) => {
      const next = !hidden
      localStorage.setItem('soaps-ref-hidden', next ? '1' : '0')
      return next
    })
  }

  function startRefResize(event: React.PointerEvent<HTMLDivElement>): void {
    if (refPanelHidden) return
    event.preventDefault()
    refDragRef.current = { active: true, startX: event.clientX, startWidth: refPanelWidth }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveRefResize(event: React.PointerEvent<HTMLDivElement>): void {
    if (!refDragRef.current.active) return
    // Dragging left = making panel wider (panel is on the right)
    const delta = refDragRef.current.startX - event.clientX
    const next = Math.min(560, Math.max(200, refDragRef.current.startWidth + delta))
    setRefPanelWidth(next)
  }

  function endRefResize(): void {
    if (!refDragRef.current.active) return
    refDragRef.current.active = false
    setRefPanelWidth((width) => {
      localStorage.setItem('soaps-ref-width', String(width))
      return width
    })
  }

  async function reconnectFolder(): Promise<void> {
    const stored = await loadRootHandle()
    if (!stored) {
      await openFolder()
      return
    }
    try {
      const { rootPath } = await reconnectRootFolder(stored)
      setCanWriteToDisk(true)
      setFolderWriteBlocked(false)
      setSessionMode('opened')
      setRootLabel(rootPath)
      await saveRootHandle(stored)
      setStatusMessage(`Reconnected to ${rootPath}. You can save files to disk again.`)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setStatusMessage('Could not reconnect to the saved folder. Open the folder again and allow access.')
      await openFolder()
    }
  }

  async function openFolder(): Promise<void> {
    if (dirtyMap.size > 0) {
      const leave = window.confirm(
        `You have ${dirtyMap.size} unsaved file(s). Open another folder and discard them?`,
      )
      if (!leave) return
    }
    try {
      const result = await chooseAndScanFolder()
      const mapped: FileRecord[] = result.files.map((file) =>
        toFileRecord(file, result.rootPath),
      )
      mapped.sort((a, b) => a.path.localeCompare(b.path))
      setFiles(mapped)
      setRootLabel(result.rootPath)
      setCanWriteToDisk(result.canWriteToDisk)
      setSessionMode('opened')
      setSearch('')
      setCategoryFilter('all')
      setOpenPacks(new Set())
      setOpenCategories(new Set())
      setActivePath('')
      setDraft('')
      setDirtyMap(new Map())
      setSessionLog([])
      setFolderWriteBlocked(false)
      await saveRootHandle(getActiveRootHandle())
      flushSessionToBrowser()
      setStatusMessage(
        mapped.length === 0
          ? 'No YAML files found in that folder. Choose a different folder, or start new files from the welcome screen.'
          : `Loaded ${mapped.length} files from ${result.rootPath}.`,
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message =
        error instanceof Error ? error.message : 'Could not open folder. Try again or pick another folder.'
      setStatusMessage(message)
    }
  }

  async function commitPackToFolder(
    records: FileRecord[],
    dirty: Map<string, string> = new Map(),
  ): Promise<boolean> {
    if (!directoryPickerSupported()) {
      showFolderWriteBlockedModal()
      return false
    }
    try {
      const snapshot = records.map((f) => ({
        path: f.path,
        content: dirty.get(f.path) ?? f.content,
      }))
      const { rootPath } = await writePackToDirectory(snapshot)
      const nextFiles = records.map((f) => ({
        ...f,
        content: dirty.get(f.path) ?? f.content,
        ids:
          f.category === 'exp-curves'
            ? []
            : extractTopLevelIds(parseYaml(dirty.get(f.path) ?? f.content).data),
      }))
      setFiles(nextFiles)
      setDirtyMap(new Map())
      setCanWriteToDisk(true)
      setSessionMode('opened')
      setRootLabel(rootPath)
      setFolderWriteBlocked(false)
      await saveRootHandle(getActiveRootHandle())
      flushSessionToBrowser()
      return true
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false
      const message =
        error instanceof Error
          ? error.message
          : 'Could not save the files. Check folder permissions and try again.'
      if (/directory picker/i.test(message)) {
        showFolderWriteBlockedModal()
      } else {
        setAlertModal({
          tone: 'error',
          title: 'Could not save files',
          message,
        })
      }
      return false
    }
  }

  async function startNewPack(options: NewPackStartOptions): Promise<void> {
    if (!workspaceId) return
    updateSavePrefs({
      autoSave: options.autoSave,
      autoSaveInterval: options.autoSaveInterval,
    })

    const scaffolded = scaffoldPack(workspaceId, { packName: options.packName })
    const mapped = scaffolded
      .map((file) => toFileRecord(file, options.packName))
      .sort((a, b) => a.path.localeCompare(b.path))
    clearActiveFolder()
    setPackDisplayName(options.packName)
    setFiles(mapped)
    setRootLabel(
      options.saveTarget === 'folder'
        ? `New: ${options.packName}`
        : `New: ${options.packName} (browser)`,
    )
    setCanWriteToDisk(false)
    setSessionMode('new-pack')
    setSearch('')
    setCategoryFilter('all')
    setOpenPacks(new Set(mapped.map((f) => f.pack)))
    setOpenCategories(new Set())
    setActivePath(mapped[0]?.path ?? '')
    setDraft(mapped[0]?.content ?? '')
    setDirtyMap(new Map())
    setNewPackOpen(false)
    setFolderWriteBlocked(false)
    flushSessionToBrowser()

    if (options.saveTarget === 'folder') {
      const saved = await commitPackToFolder(mapped)
      if (saved) {
        setStatusMessage(
          `Created “${options.packName}” and saved to disk. Use Ctrl+S to save edits, Ctrl+Shift+S for all files.`,
        )
      } else {
        setStatusMessage(
          `Created “${options.packName}” in this browser. Use File → Choose save folder when you are ready to write to disk.`,
        )
      }
      return
    }

    setStatusMessage(
      `Created “${options.packName}” in this browser. It stays here until you clear site data. Use Ctrl+S to save the current file.`,
    )
  }

  function showFolderWriteBlockedModal(): void {
    const help = folderWriteBlockedHelp(browserKind, directoryPickerSupported())
    setAlertModal({
      tone: 'warning',
      title: 'Cannot choose a save folder',
      message: help.message,
      detail: help.detail,
    })
  }

  async function bindSaveFolder(): Promise<boolean> {
    if (!directoryPickerSupported()) {
      showFolderWriteBlockedModal()
      return false
    }
    const ok = await commitPackToFolder(files, dirtyMap)
    if (ok) setStatusMessage(`Saved files to ${getActiveRootName()}.`)
    return ok
  }

  function confirmStartNewPack(options: NewPackStartOptions): void {
    if (dirtyMap.size > 0) {
      const leave = window.confirm(
        `You have ${dirtyMap.size} unsaved file(s). Start new files and discard them?`,
      )
      if (!leave) return
    }
    void startNewPack(options)
  }

  async function applyMultiFileWrite(
    writes: { path: string; content: string; mode: 'create' | 'append' | 'delete' }[],
  ): Promise<void> {
    let nextFiles = [...files]
    const nextDirty = new Map(dirtyMap)
    let firstPath = ''
    const deleteErrors: string[] = []

    for (const write of writes) {
      if (write.mode === 'delete') {
        nextFiles = nextFiles.filter((f) => f.path !== write.path)
        nextDirty.delete(write.path)
        if (activePath === write.path) {
          setActivePath('')
          setDraft('')
        }
        if (canWriteToDisk) {
          try {
            await deleteTextFile(write.path)
          } catch (err) {
            deleteErrors.push(
              err instanceof Error ? err.message : `Could not delete ${write.path}`,
            )
          }
        }
        continue
      }

      const name = write.path.split('/').pop() ?? write.path
      const existing = nextFiles.find((f) => f.path === write.path)
      const content = write.content
      if (existing) {
        nextFiles = nextFiles.map((f) =>
          f.path === write.path
            ? {
                ...f,
                content,
                ids:
                  f.category === 'exp-curves'
                    ? []
                    : extractTopLevelIds(parseYaml(content).data),
              }
            : f,
        )
      } else {
        const rec = toFileRecord({ path: write.path, name, content }, rootLabel || packDisplayName)
        nextFiles.push(rec)
      }
      nextDirty.set(write.path, content)
      if (!firstPath) firstPath = write.path
    }

    nextFiles.sort((a, b) => a.path.localeCompare(b.path))
    setFiles(nextFiles)
    setDirtyMap(nextDirty)
    if (firstPath) {
      setActivePath(firstPath)
      setDraft(nextDirty.get(firstPath) ?? '')
    }
    setCreateKind(null)
    const deleted = writes.filter((w) => w.mode === 'delete').length
    const baseMsg = `Prepared ${writes.length - deleted} file(s)${deleted ? `, removed ${deleted}` : ''}. ${
      needsSaveFolder ? 'Choose a save folder to write them to disk.' : 'Save to keep changes.'
    }`
    setStatusMessage(
      deleteErrors.length > 0
        ? `${baseMsg} Could not delete from disk: ${deleteErrors.join('; ')}`
        : baseMsg,
    )
  }

  function selectFile(file: FileRecord): void {
    if (file.path === activePath) return
    // Navigate to file — if it has unsaved changes in dirtyMap, restore them
    const pendingDraft = dirtyMap.get(file.path)
    setActivePath(file.path)
    setDraft(pendingDraft ?? file.content)
    setStatusMessage('')
    setOpenPacks((current) => new Set(current).add(file.pack))
    setOpenCategories((current) => new Set(current).add(categoryKey(file.pack, file.category)))
  }

  function togglePack(pack: string): void {
    setOpenPacks((current) => {
      const next = new Set(current)
      if (next.has(pack)) next.delete(pack)
      else next.add(pack)
      return next
    })
  }

  function toggleCategory(pack: string, category: MythicCategory): void {
    const key = categoryKey(pack, category)
    setOpenCategories((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  /** Save a single file by path+content. Returns updated FileRecord or null on failure. */
  async function saveOne(
    filePath: string,
    content: string,
    silent = false,
  ): Promise<FileRecord | null> {
    const fileRec = filesRef.current.find((f) => f.path === filePath)
    if (!fileRec) return null
    try {
      let result: { backupPath: string | null; downloaded: boolean }
      try {
        result = await saveTextFile(filePath, content)
        // If downloaded while we can write, file was new — create it on disk
        if (result.downloaded && canWriteToDiskRef.current && !needsSaveFolderRef.current) {
          await createOrWriteTextFile(filePath, content)
          result = { backupPath: null, downloaded: false }
        }
      } catch (err) {
        if (canWriteToDiskRef.current && !needsSaveFolderRef.current) {
          await createOrWriteTextFile(filePath, content)
          result = { backupPath: null, downloaded: false }
        } else {
          throw err
        }
      }
      const parsed = filePath.toLowerCase().endsWith('.txt')
        ? { data: null, issues: [] }
        : parseYaml(content)
      const updated: FileRecord = {
        ...fileRec,
        content,
        ids: fileRec.category === 'exp-curves' ? [] : extractTopLevelIds(parsed.data),
      }
      if (!silent) {
        if (result.downloaded) {
          setStatusMessage(`Downloaded ${fileRec.name}. Move it into the original folder to replace the file.`)
        } else {
          const backup = result.backupPath ? ` Backup: ${result.backupPath}.` : ''
          setStatusMessage(`Saved ${filePath}.${backup}`)
        }
      }
      setSessionLog((prev) => {
        const filtered = prev.filter((e) => e.path !== filePath)
        return [{ path: filePath, name: fileRec.name, savedAt: Date.now() }, ...filtered].slice(0, 50)
      })
      saveCountRef.current += 1
      return updated
    } catch (err) {
      if (!silent) {
        setStatusMessage(
          err instanceof Error
            ? err.message
            : 'Could not save the file. Check folder access and try again.',
        )
      }
      return null
    }
  }

  async function checkAndMaybeBackup(currentFiles: FileRecord[]) {
    if (!savePrefsRef.current.autoBackup || !hasBackupFolder()) return
    const every = savePrefsRef.current.backupEvery
    const shouldBackup =
      every === 'every-save' ||
      (typeof every === 'number' && saveCountRef.current % every === 0)
    if (!shouldBackup) return
    try {
      const name = await backupPack(currentFiles)
      setStatusMessage((prev) => `${prev} · Backup: ${name}`)
    } catch (err) {
      console.warn('Auto-backup failed:', err)
    }
  }

  async function saveActiveFile(): Promise<void> {
    if (!activeFile) return
    if (needsSaveFolder) {
      const ok = await bindSaveFolder()
      if (!ok) return
      return
    }
    const parsed = parseYaml(draft)
    if (parsed.issues.length > 0 && !activeFile.path.endsWith('.txt')) {
      const force = window.confirm('This file has YAML errors. Save anyway?')
      if (!force) return
    }
    const updated = await saveOne(activeFile.path, draft)
    if (!updated) return
    const nextFiles = files.map((f) => (f.path === updated.path ? updated : f))
    setFiles(nextFiles)
    setDirtyMap((prev) => { const next = new Map(prev); next.delete(activeFile.path); return next })
    await checkAndMaybeBackup(
      nextFiles.map((f) => {
        const pending = dirtyMapRef.current.get(f.path)
        return pending !== undefined && f.path !== updated.path
          ? { ...f, content: pending }
          : f
      }),
    )
  }

  async function saveAllFiles(silent = false): Promise<void> {
    if (dirtyMapRef.current.size === 0) return
    if (needsSaveFolderRef.current) {
      if (!silent) await bindSaveFolder()
      return
    }
    const entries = [...dirtyMapRef.current.entries()]
    let updatedFiles = [...filesRef.current]
    const stillDirty = new Map(dirtyMapRef.current)
    let savedCount = 0
    for (const [path, content] of entries) {
      const updated = await saveOne(path, content, true)
      if (updated) {
        updatedFiles = updatedFiles.map((f) => (f.path === path ? updated : f))
        stillDirty.delete(path)
        savedCount++
      }
    }
    setFiles(updatedFiles)
    setDirtyMap(stillDirty)
    if (!silent) {
      if (savedCount === entries.length) setStatusMessage(`Saved ${savedCount} file(s).`)
      else setStatusMessage(`Saved ${savedCount} of ${entries.length} file(s). Some could not be written.`)
    }
    if (savedCount > 0) {
      await checkAndMaybeBackup(
        updatedFiles.map((f) => {
          const pending = stillDirty.get(f.path)
          return pending !== undefined ? { ...f, content: pending } : f
        }),
      )
    }
  }

  // Keep save handlers fresh for keyboard / auto-save
  const saveActiveFileRef = useRef(saveActiveFile)
  saveActiveFileRef.current = saveActiveFile
  const saveAllFilesRef = useRef(saveAllFiles)
  saveAllFilesRef.current = saveAllFiles
  const effectiveFilesRef = useRef(effectiveFiles)
  effectiveFilesRef.current = effectiveFiles

  // ── Restore session from browser storage on startup ───────────────────────
  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      try {
        const kind = await detectBrowserKind()
        if (!cancelled) setBrowserKind(kind)

        const storage = await probeEditorStorage()
        if (!cancelled && storage === 'blocked') {
          setStatusMessage(
            'Browser storage is blocked. Turn off Shields for this site or allow cookies and site data so your session can be saved.',
          )
        }

        const snapshot = await loadEditorSession()
        const backupHandle = await loadBackupHandle()
        if (backupHandle) {
          const perm = await queryRootWritePermission(backupHandle)
          if (perm === 'granted') {
            setBackupFolderHandle(backupHandle)
            setBackupReady(true)
          }
        }
        if (!snapshot || cancelled) return

        applySessionSnapshot(snapshot)

        let writeBlocked = false
        const rootHandle = await loadRootHandle()
        if (rootHandle) {
          const perm = await queryRootWritePermission(rootHandle)
          if (perm === 'granted') {
            await attachRootHandle(rootHandle)
            setCanWriteToDisk(true)
            setFolderWriteBlocked(false)
          } else {
            setCanWriteToDisk(false)
            writeBlocked = true
            setFolderWriteBlocked(true)
          }
        } else {
          setCanWriteToDisk(false)
          writeBlocked = snapshot.sessionMode === 'new-pack'
          setFolderWriteBlocked(writeBlocked)
        }

        const age = formatSessionAge(snapshot.savedAt)
        const diskNote = writeBlocked ? ' Reconnect a folder to save files to disk.' : ''
        setStatusMessage(
          `Restored your last session (${snapshot.files.length} files, ${age}). Edits stay in this browser until you clear site data.${diskNote}`,
        )
      } catch {
        /* ignore corrupt storage */
      } finally {
        if (!cancelled) setSessionHydrated(true)
      }
    }
    void hydrate()
    return () => {
      cancelled = true
    }
  }, [])

  // ── Auto-save session to browser storage ─────────────────────────────────
  useEffect(() => {
    if (!sessionHydrated) return
    const timer = setTimeout(() => flushSessionToBrowser(), 1200)
    return () => clearTimeout(timer)
  }, [
    sessionHydrated,
    files,
    dirtyMap,
    activePath,
    draft,
    rootLabel,
    sessionMode,
    packDisplayName,
    workspaceId,
    openPacks,
    openCategories,
    search,
    categoryFilter,
  ])

  useEffect(() => {
    if (!sessionHydrated) return
    function flushOnHide() {
      if (document.visibilityState === 'hidden') flushSessionToBrowser()
    }
    document.addEventListener('visibilitychange', flushOnHide)
    window.addEventListener('pagehide', flushOnHide)
    return () => {
      document.removeEventListener('visibilitychange', flushOnHide)
      window.removeEventListener('pagehide', flushOnHide)
    }
  }, [sessionHydrated])

  // ── Auto-save ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!savePrefs.autoSave) return
    const ms = savePrefs.autoSaveInterval * 1000
    const id = setInterval(() => {
      if (needsSaveFolderRef.current) return
      if (dirtyMapRef.current.size === 0) return
      void saveAllFilesRef.current(true)
    }, ms)
    return () => clearInterval(id)
  }, [savePrefs.autoSave, savePrefs.autoSaveInterval])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key === 's' && !e.shiftKey) {
        e.preventDefault()
        void saveActiveFileRef.current()
      }
      if (ctrl && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault()
        void saveAllFilesRef.current(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Warn on tab close / refresh when dirty ─────────────────────────────────
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (dirtyMapRef.current.size === 0) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  function appendYamlToFile(targetPath: string, yaml: string): boolean {
    const target = files.find((file) => file.path === targetPath)
    if (!target) {
      setStatusMessage('That file is not in the current folder.')
      return false
    }
    const currentContent = dirtyMap.get(target.path) ?? target.content
    const newIds = extractTopLevelIds(parseYaml(yaml).data)
    const existingIds = extractTopLevelIds(parseYaml(currentContent).data)
    const collision = newIds.find((id) => existingIds.includes(id))
    if (collision) {
      setStatusMessage(`Skill id ${collision} already exists in ${target.path}. Rename the preset ids or remove the duplicate.`)
      return false
    }
    const nextDraft = currentContent.trim() ? `${currentContent.trimEnd()}\n\n${yaml}` : yaml
    setActivePath(target.path)
    setDraft(nextDraft)
    setDirtyMap((prev) => new Map(prev).set(target.path, nextDraft))
    setFiles((prev) =>
      prev.map((f) =>
        f.path === target.path
          ? { ...f, ids: extractTopLevelIds(parseYaml(nextDraft).data) }
          : f,
      ),
    )
    return true
  }

  function insertGenerated(targetPath: string, yaml: string): void {
    if (dirtyMap.has(activePath) && activePath !== targetPath) {
      const leave = window.confirm('You have unsaved changes. Discard them and add the new YAML?')
      if (!leave) return
    }
    if (appendYamlToFile(targetPath, yaml)) {
      setCreateKind(null)
      setStatusMessage(`Added to ${targetPath}. Save the file to keep it.`)
    }
  }

  function insertPresetYaml(yaml: string): void {
    if (!activePath) {
      setStatusMessage('Open a YAML file first, then insert the preset.')
      return
    }
    if (appendYamlToFile(activePath, yaml)) {
      setStatusMessage('Preset skills added to the open file. Save to keep them.')
    }
  }

  function suggestedPathForKind(kind: CreateKind): string {
    if (
      kind === 'class' ||
      kind === 'mmocore-skill' ||
      kind === 'elements' ||
      kind === 'skill-casting'
    ) {
      return activePath
    }
    const category =
      kind === 'mob' ? 'mobs'
      : kind === 'item' ? 'items'
      : kind === 'skill' ? 'skills'
      : kind === 'droptable' ? 'droptables'
      : 'randomspawns'
    return files.find((f) => f.category === category)?.path ?? activePath
  }

  function handleCreate(kind: CreateKind): void {
    setCreateKind(kind)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  if (!sessionHydrated) {
    return (
      <main className="welcome dashboard">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={56} height={56} />
        <h1>Soaps Config Editor</h1>
        <p className="welcome-note">Loading your last session…</p>
      </main>
    )
  }

  if (!hasFolder) {
    return (
      <main className="welcome dashboard">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={56} height={56} />
        <h1>Soaps Config Editor</h1>
        <p>Choose the plugin you want to edit. This tells the editor which tools to show.</p>
        <WorkspaceTiles selected={workspaceId} onSelect={selectWorkspace} />
        {workspace ? (
          <>
            <p>{workspace.hint}</p>
            <div className="welcome-actions">
              <button
                type="button"
                className="primary"
                onClick={openFolder}
                disabled={!folderOpenSupported()}
              >
                Open folder
              </button>
              <button type="button" className="primary" onClick={() => setNewPackOpen(true)}>
                {workspace.startLabel}
              </button>
            </div>
          </>
        ) : (
          <p className="welcome-note">Select a plugin above to continue.</p>
        )}
        <p className="welcome-note">
          Edits save automatically in this browser. Close the tab and come back anytime, unless you clear site data
          for this page.
        </p>
        {browserKind === 'brave' && !directoryPickerSupported() ? (
          <p className="welcome-note welcome-note-brave">
            In Brave, folder saving is off by default. Open{' '}
            <code>brave://flags/#file-system-access-api</code>, set File System Access API to Enabled, and relaunch
            Brave. Open folder still works read-only without that flag. Chrome and Edge can save to a folder with no
            extra setup.
          </p>
        ) : (
          <p className="welcome-note">
            To write YAML files to a folder on disk, use Open folder or Choose save folder in Chrome or Edge. Brave
            needs the File System Access API flag enabled first.
          </p>
        )}
        <SettingsMenu
          theme={theme}
          onThemeChange={applyTheme}
          open={settingsOpen}
          onOpen={() => setSettingsOpen(true)}
          onClose={() => setSettingsOpen(false)}
          acPrefs={acPrefs}
          onAcPrefsChange={updateAcPrefs}
          showAcSettings={false}
          savePrefs={savePrefs}
          onSavePrefsChange={updateSavePrefs}
          backupReady={backupReady}
          onBackupNow={async () => {}}
          onPickBackupFolder={async () => {
            try {
              const name = await pickBackupFolder()
              updateSavePrefs({ backupFolder: name })
              setBackupReady(true)
              await saveBackupHandle(getBackupFolderHandle())
            } catch { /* cancelled */ }
          }}
        />
        {statusMessage ? <p className="status-copy">{statusMessage}</p> : null}
        {newPackOpen && workspaceId ? (
          <NewPackDialog
            workspaceId={workspaceId}
            savePrefs={savePrefs}
            folderPickerAvailable={directoryPickerSupported()}
            onClose={() => setNewPackOpen(false)}
            onConfirm={confirmStartNewPack}
          />
        ) : null}
        {alertModal ? (
          <AlertModal
            title={alertModal.title}
            message={alertModal.message}
            detail={alertModal.detail}
            tone={alertModal.tone}
            onClose={() => setAlertModal(null)}
          />
        ) : null}
      </main>
    )
  }

  return (
    <main className={`app-shell${refPanelOpen ? ' ref-open' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={28} height={28} />
          <div className="brand-text">
            <h1>Soaps Config Editor</h1>
            <p className="brand-subtitle">
              {workspace?.name ?? 'YAML'} · {rootLabel}
              {needsSaveFolder ? <span className="brand-badge">Browser only</span> : null}
              {dirtyCount > 0 ? <span className="brand-badge dirty">{dirtyCount} unsaved</span> : null}
            </p>
          </div>
        </div>
        <div className="topbar-actions">
          <TopbarFileMenu
            startLabel={workspace?.startLabel ?? 'Start new files'}
            needsSaveFolder={needsSaveFolder}
            folderWriteBlocked={folderWriteBlocked}
            dirtyCount={dirtyCount}
            onOpenFolder={() => void openFolder()}
            onChooseSaveFolder={() => void bindSaveFolder()}
            onReconnectFolder={() => void reconnectFolder()}
            onStartNewPack={() => setNewPackOpen(true)}
            onSaveAll={() => void saveAllFiles(false)}
            onChangeWorkspace={changeWorkspace}
          />
          <button
            type="button"
            className={needsSaveFolder || isDirty ? 'primary' : ''}
            onClick={saveActiveFile}
            disabled={!activeFile}
            title="Save (Ctrl+S)"
          >
            {needsSaveFolder ? 'Save to folder' : canWriteToDisk ? 'Save' : 'Download'}
            {isDirty ? ' *' : ''}
          </button>
          {isMythicMobs || isMMOCore ? (
            <NewMenu
              disabled={files.length === 0}
              workspace={isMMOCore ? 'mmocore' : 'mythicmobs'}
              onCreate={handleCreate}
            />
          ) : null}
          {isMythicMobs ? (
            <button
              type="button"
              className={`topbar-toggle${refPanelOpen ? ' active' : ''}`}
              onClick={() => setRefPanelOpen((v) => !v)}
              title="Toggle reference panel"
              aria-pressed={refPanelOpen}
            >
              Reference
            </button>
          ) : null}
          <SettingsMenu
            theme={theme}
            onThemeChange={applyTheme}
            open={settingsOpen}
            onOpen={() => setSettingsOpen(true)}
            onClose={() => setSettingsOpen(false)}
            acPrefs={acPrefs}
            onAcPrefsChange={updateAcPrefs}
            showAcSettings={isMythicMobs}
            savePrefs={savePrefs}
            onSavePrefsChange={updateSavePrefs}
            backupReady={backupReady}
            iconOnly
            onBackupNow={async () => {
              try {
                const name = await backupPack(effectiveFilesRef.current)
                setStatusMessage(`Backup created: ${name}`)
              } catch (err) {
                setStatusMessage(err instanceof Error ? err.message : 'Backup failed.')
              }
            }}
            onPickBackupFolder={async () => {
              try {
                const name = await pickBackupFolder()
                updateSavePrefs({ backupFolder: name })
                setBackupReady(true)
                await saveBackupHandle(getBackupFolderHandle())
              } catch { /* cancelled */ }
            }}
          />
        </div>
      </header>

      {statusMessage ? <p className="banner">{statusMessage}</p> : null}

      <section
        className={[
          'workspace',
          sidebarHidden ? 'collapsed' : '',
          refPanelOpen && isMythicMobs ? 'has-ref' : '',
          refPanelOpen && isMythicMobs && refPanelHidden ? 'ref-collapsed' : '',
        ].filter(Boolean).join(' ')}
        style={{
          '--sidebar-width': `${sidebarWidth}px`,
          '--ref-width': `${refPanelWidth}px`,
        } as CSSProperties}
      >
        <aside className="sidebar">
          <div className="sidebar-tools">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search files, IDs, or text"
            />
            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value as 'all' | MythicCategory)
              }
              aria-label="Filter by type"
            >
              <option value="all">All types</option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABEL[category]}
                </option>
              ))}
            </select>
          </div>
          <div className="file-groups">
            {packTree.length === 0 ? (
              <p className="empty-copy">No files match that search. Clear the filter or try another term.</p>
            ) : (
              packTree.map((pack) => {
                const packOpen = isPackOpen(pack.pack)
                return (
                  <section key={pack.pack} className="pack-node">
                    <button
                      type="button"
                      className="tree-row pack"
                      onClick={() => togglePack(pack.pack)}
                      aria-expanded={packOpen}
                    >
                      <span className="chevron">{packOpen ? '▾' : '▸'}</span>
                      <span className="tree-label" title={pack.pack}>
                        {pack.pack}
                      </span>
                      <span className="tree-count">{pack.fileCount}</span>
                    </button>
                    {packOpen
                      ? pack.categories.map((node) => {
                          const catOpen = isCategoryOpen(pack.pack, node.category)
                          return (
                            <div key={node.category} className="category-node">
                              <button
                                type="button"
                                className="tree-row category"
                                onClick={() => toggleCategory(pack.pack, node.category)}
                                aria-expanded={catOpen}
                              >
                                <span className="chevron">{catOpen ? '▾' : '▸'}</span>
                                <span className="tree-label">{node.label}</span>
                                <span className="tree-count">{node.files.length}</span>
                              </button>
                              {catOpen
                                ? node.files.map((file) => (
                                    <button
                                      key={file.path}
                                      type="button"
                                      className={
                                        file.path === activePath
                                          ? 'tree-row file active'
                                          : 'tree-row file'
                                      }
                                      title={file.path}
                                      onClick={() => selectFile(file)}
                                    >
                                      <span className="tree-label">
                                        {file.name}
                                        {dirtyMap.has(file.path) ? <span className="dirty-dot" title="Unsaved changes"> ●</span> : null}
                                      </span>
                                    </button>
                                  ))
                                : null}
                            </div>
                          )
                        })
                      : null}
                  </section>
                )
              })
            )}
          </div>

          {isMythicMobs && activeFile && (
            <div className="dep-panel-wrap">
              <button
                type="button"
                className="dep-panel-toggle"
                onClick={() => setDepPanelOpen((v) => !v)}
                aria-expanded={depPanelOpen}
              >
                <span className="chevron">{depPanelOpen ? '▾' : '▸'}</span>
                Dependencies
              </button>
              {depPanelOpen && (
                <DependencyPanel
                  activeFile={effectiveFiles.find((f) => f.path === activePath) ?? activeFile}
                  allFiles={effectiveFiles}
                  onNavigate={(path) => {
                    const f = files.find((x) => x.path === path)
                    if (f) selectFile(f)
                  }}
                />
              )}
            </div>
          )}

          {isMythicMobs && files.length > 0 && (
            <div className="dep-panel-wrap">
              <button
                type="button"
                className="dep-panel-toggle"
                onClick={() => setPackIssuesOpen((v) => !v)}
                aria-expanded={packIssuesOpen}
              >
                <span className="chevron">{packIssuesOpen ? '▾' : '▸'}</span>
                Pack issues
              </button>
              {packIssuesOpen && (
                <PackIssuesPanel
                  files={effectiveFiles}
                  onNavigate={(path) => {
                    const f = files.find((x) => x.path === path)
                    if (f) selectFile(f)
                  }}
                />
              )}
            </div>
          )}

          {sessionLog.length > 0 && (
            <div className="dep-panel-wrap">
              <button
                type="button"
                className="dep-panel-toggle"
                onClick={() => setSessionLogOpen((v) => !v)}
                aria-expanded={sessionLogOpen}
              >
                <span className="chevron">{sessionLogOpen ? '▾' : '▸'}</span>
                Saved this session
                <span className="dep-link-cat" style={{ marginLeft: 4 }}>{sessionLog.length}</span>
              </button>
              {sessionLogOpen && (
                <div className="dep-panel">
                  {sessionLog.map((entry) => (
                    <button
                      key={entry.path + entry.savedAt}
                      type="button"
                      className="dep-link"
                      onClick={() => { const f = files.find((x) => x.path === entry.path); if (f) selectFile(f) }}
                      title={entry.path}
                    >
                      <span className="dep-link-id">{entry.name}</span>
                      <span className="dep-link-file">
                        {new Date(entry.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>

        <div
          className="split-bar"
          onPointerDown={startSidebarResize}
          onPointerMove={moveSidebarResize}
          onPointerUp={endSidebarResize}
          onPointerCancel={endSidebarResize}
        >
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={sidebarHidden ? 'Show file list' : 'Hide file list'}
            title={sidebarHidden ? 'Show file list' : 'Hide file list'}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={toggleSidebar}
          >
            {sidebarHidden ? '›' : '‹'}
          </button>
        </div>

        <section className="editor-pane">
          <div className="editor-meta">
            <strong>{activeFile?.path ?? 'No file selected'}</strong>
            {isDirty ? <span>Unsaved</span> : null}
          </div>
          <YamlEditor
            ref={editorRef}
            value={draft}
            theme={theme}
            onChange={(value) => {
              setDraft(value)
              if (activePath) {
                const original = files.find((f) => f.path === activePath)?.content ?? ''
                setDirtyMap((prev) => {
                  const next = new Map(prev)
                  if (value !== original) next.set(activePath, value)
                  else next.delete(activePath)
                  return next
                })
              }
            }}
            placeholder="Select a file from the list."
            packIndex={isMythicMobs ? packIndex : undefined}
            acPrefs={isMythicMobs ? acPrefs : undefined}
            fileCategory={isMythicMobs ? activeFile?.category : undefined}
            onLineContextChange={setEditorLineContext}
          />
          {parseIssues.length > 0 ? (
            <p className="error-copy">
              {parseIssues[0]?.message}
              {parseIssues[0]?.line ? ` (line ${parseIssues[0].line})` : ''}
            </p>
          ) : null}
        </section>

        {refPanelOpen && isMythicMobs ? (
          <>
            <div
              className="split-bar ref-split-bar"
              onPointerDown={startRefResize}
              onPointerMove={moveRefResize}
              onPointerUp={endRefResize}
              onPointerCancel={endRefResize}
            >
              <button
                type="button"
                className="sidebar-toggle"
                aria-label={refPanelHidden ? 'Show reference panel' : 'Hide reference panel'}
                title={refPanelHidden ? 'Show reference panel' : 'Hide reference panel'}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={toggleRefPanel}
              >
                {refPanelHidden ? '‹' : '›'}
              </button>
            </div>
            <aside className={refPanelHidden ? 'ref-panel-wrap ref-panel-hidden' : 'ref-panel-wrap'}>
              <ReferencePanel
                onInsert={(snippet) => editorRef.current?.insert(snippet)}
                onInsertPreset={insertPresetYaml}
                onInsertMechanicAttr={(mechanicId, attr) =>
                  editorRef.current?.insertMechanicAttr(mechanicId, attr)
                }
                onInsertTargeterAttr={(targeterId, attr) =>
                  editorRef.current?.insertTargeterAttr(targeterId, attr)
                }
                onInsertConditionAttr={(conditionId, attr) =>
                  editorRef.current?.insertConditionAttr(conditionId, attr)
                }
                lineContext={editorLineContext}
              />
            </aside>
          </>
        ) : null}
      </section>

      {createKind &&
      isMythicMobs &&
      createKind !== 'class' &&
      createKind !== 'mmocore-skill' &&
      createKind !== 'elements' &&
      createKind !== 'skill-casting' ? (
        <CreateDialog
          kind={createKind}
          files={files}
          packIndex={packIndex}
          suggestedPath={suggestedPathForKind(createKind)}
          onClose={() => setCreateKind(null)}
          onInsert={insertGenerated}
        />
      ) : null}
      {createKind === 'class' && isMMOCore ? (
        <ClassWizardDialog
          files={effectiveFiles}
          index={mmocoreIndex}
          packName={mythicPackName}
          onClose={() => setCreateKind(null)}
          onApply={(out) => applyMultiFileWrite(out.files)}
        />
      ) : null}
      {createKind === 'mmocore-skill' && isMMOCore ? (
        <CreateMythicLibSkillDialog
          files={effectiveFiles}
          packName={mythicPackName}
          existingSkillIds={mmocoreIndex.mythicLibSkills.map((s) => s.id)}
          onClose={() => setCreateKind(null)}
          onApply={(out) => applyMultiFileWrite(out.files)}
        />
      ) : null}
      {createKind === 'elements' && isMMOCore ? (
        <ElementsEditorDialog
          files={effectiveFiles}
          onClose={() => setCreateKind(null)}
          onApply={(path, content) => {
            applyMultiFileWrite([{ path, content, mode: 'create' }])
            setCreateKind(null)
          }}
        />
      ) : null}
      {createKind === 'skill-casting' && isMMOCore ? (
        <SkillCastingDialog
          files={effectiveFiles}
          onClose={() => setCreateKind(null)}
          onApply={(path, content) => {
            applyMultiFileWrite([{ path, content, mode: 'create' }])
            setCreateKind(null)
          }}
        />
      ) : null}
      {newPackOpen && workspaceId ? (
        <NewPackDialog
          workspaceId={workspaceId}
          savePrefs={savePrefs}
          folderPickerAvailable={directoryPickerSupported()}
          onClose={() => setNewPackOpen(false)}
          onConfirm={confirmStartNewPack}
        />
      ) : null}
      {alertModal ? (
        <AlertModal
          title={alertModal.title}
          message={alertModal.message}
          detail={alertModal.detail}
          tone={alertModal.tone}
          onClose={() => setAlertModal(null)}
        />
      ) : null}
    </main>
  )
}

export default App
