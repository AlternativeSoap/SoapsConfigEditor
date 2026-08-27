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
import { downloadPackZip, downloadTextExport } from './core/filesystem/exportPack'
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
import {
  classifySoapsQuestCategory,
  detectSoapsQuestPackName,
} from './core/soapsquest/classify'
import { buildSoapsQuestCatalog } from './core/soapsquest/catalog'
import { extractQuestIds } from './core/soapsquest/questIds'
import { indexQuestDisplays } from './core/soapsquest/parseQuest'
import { matchesSearch } from './core/search/matchFiles'
import { buildPackTree, categoryKey, CATEGORY_LABEL } from './core/search/packTree'
import { extractTopLevelIds, parseYaml } from './core/yaml/parseYaml'
import { getWorkspace, parseWorkspaceKind, wasLegacyMythicRpgWorkspace } from './core/workspaces/profiles'
import {
  DEFAULT_MYTHIC_ADDONS,
  loadMythicAddons,
  saveMythicAddons,
  type MythicAddons,
} from './core/workspaces/mythicAddons'
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
import { ArchetypeWizardDialog } from './ui/mythicrpg/ArchetypeWizardDialog'
import { ReagentWizardDialog } from './ui/mythicrpg/ReagentWizardDialog'
import { SpellWizardDialog } from './ui/mythicrpg/SpellWizardDialog'
import { QuestWizardDialog } from './ui/soapsquest/QuestWizardDialog'
import { EditQuestPickerDialog } from './ui/soapsquest/EditQuestPickerDialog'
import { QuestIssuesPanel } from './ui/soapsquest/QuestIssuesPanel'
import { ReferencePanel } from './ui/ReferencePanel'
import { SettingsMenu } from './ui/SettingsMenu'
import { TopbarFileMenu } from './ui/TopbarFileMenu'
import { WorkspaceTiles } from './ui/WorkspaceTiles'
import { YamlEditor, type YamlEditorHandle } from './ui/YamlEditor'
import { EMPTY_CONTEXT, type SkillLineContext } from './core/mythicmobs/skillLineAttrs'
import { EquipmentSetWizardDialog } from './ui/mythiccrucible/EquipmentSetWizardDialog'
import { AugmentTypeWizardDialog } from './ui/mythiccrucible/AugmentTypeWizardDialog'
import { CrucibleItemWizardDialog } from './ui/mythiccrucible/CrucibleItemWizardDialog'
import { CrucibleStatWizardDialog } from './ui/mythiccrucible/CrucibleStatWizardDialog'
import { LoreTemplateWizardDialog } from './ui/mythiccrucible/LoreTemplateWizardDialog'
import { PlaceholderWizardDialog } from './ui/mythiccrucible/PlaceholderWizardDialog'

function fileIdsForCategory(category: MythicCategory, content: string): string[] {
  if (category === 'exp-curves') return []
  if (category === 'quests') return extractQuestIds(content)
  return extractTopLevelIds(parseYaml(content).data)
}

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
  const [openQuestFiles, setOpenQuestFiles] = useState<Set<string>>(new Set())
  const pendingQuestScrollRef = useRef<string | null>(null)
  const [createKind, setCreateKind] = useState<CreateKind | null>(null)
  const [editingQuestId, setEditingQuestId] = useState<string | null>(null)
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
  const [questIssuesOpen, setQuestIssuesOpen] = useState(true)
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
  const [workspaceId, setWorkspaceId] = useState<WorkspaceKind | null>(() => {
    const raw = localStorage.getItem('soaps-workspace')
    const parsed = parseWorkspaceKind(raw)
    if (wasLegacyMythicRpgWorkspace(raw)) {
      const next = { ...loadMythicAddons(), mythicrpg: true }
      saveMythicAddons(next)
      if (parsed) localStorage.setItem('soaps-workspace', parsed)
    }
    return parsed
  })
  const [mythicAddons, setMythicAddons] = useState<MythicAddons>(() => loadMythicAddons())
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
  const isSoapsQuest = workspaceId === 'soapsquest'
  const mythicRpgEnabled = isMythicMobs && mythicAddons.mythicrpg
  const crucibleEnabled = isMythicMobs && mythicAddons.crucible
  const hasFolder = files.length > 0 || rootLabel.length > 0
  const activeFile = files.find((file) => file.path === activePath) ?? null
  const isDirty = activePath ? dirtyMap.has(activePath) : false
  const dirtyCount = dirtyMap.size
  const needsSaveFolder = sessionMode === 'new-pack' && !canWriteToDisk
  const canExportFromBrowser = !canWriteToDisk && files.length > 0

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
  const mythicAddonsRef = useRef(mythicAddons)
  mythicAddonsRef.current = mythicAddons
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
      mythicAddons: mythicAddonsRef.current,
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
      const rawId = snapshot.workspaceId as string
      const migrated = parseWorkspaceKind(rawId)
      if (migrated) {
        setWorkspaceId(migrated)
        localStorage.setItem('soaps-workspace', migrated)
      }
      if (wasLegacyMythicRpgWorkspace(rawId) || snapshot.mythicAddons) {
        const next = wasLegacyMythicRpgWorkspace(rawId)
          ? { ...(snapshot.mythicAddons ?? loadMythicAddons()), mythicrpg: true }
          : { ...DEFAULT_MYTHIC_ADDONS, ...snapshot.mythicAddons }
        setMythicAddons(next)
        saveMythicAddons(next)
      }
    } else if (snapshot.mythicAddons) {
      const next = { ...DEFAULT_MYTHIC_ADDONS, ...snapshot.mythicAddons }
      setMythicAddons(next)
      saveMythicAddons(next)
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
    if (workspaceId === 'soapsquest') {
      return {
        category: classifySoapsQuestCategory(path),
        pack: detectSoapsQuestPackName(path),
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
    const ids = fileIdsForCategory(category, file.content)
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
        ids: fileIdsForCategory(f.category, pending),
      }
    })
  }, [files, dirtyMap])

  const packIndex = useMemo<PackIndex>(() => ({
    mobIds: effectiveFiles.filter((f) => f.category === 'mobs').flatMap((f) => f.ids),
    itemIds: effectiveFiles.filter((f) => f.category === 'items').flatMap((f) => f.ids),
    skillIds: effectiveFiles.filter((f) => f.category === 'skills').flatMap((f) => f.ids),
    droptableIds: effectiveFiles.filter((f) => f.category === 'droptables').flatMap((f) => f.ids),
    reagentIds: effectiveFiles.filter((f) => f.category === 'reagents').flatMap((f) => f.ids),
    archetypeIds: effectiveFiles.filter((f) => f.category === 'archetypes').flatMap((f) => f.ids),
    equipmentSetIds: effectiveFiles.filter((f) => f.category === 'equipment-sets').flatMap((f) => f.ids),
    augmentTypeIds: effectiveFiles.filter((f) => f.category === 'augments').flatMap((f) => f.ids),
    loreTemplateIds: effectiveFiles.filter((f) => f.category === 'lore-templates').flatMap((f) => f.ids),
    statIds: effectiveFiles.filter((f) => f.category === 'stats').flatMap((f) => f.ids),
  }), [effectiveFiles])

  const mmocoreIndex = useMemo(() => indexMMOCorePack(effectiveFiles), [effectiveFiles])

  const soapsQuestCatalog = useMemo(() => {
    if (!isSoapsQuest) return undefined
    const active = effectiveFiles.find((f) => f.path === activePath)
    if (!active || active.category !== 'quests') return undefined
    return buildSoapsQuestCatalog(effectiveFiles)
  }, [isSoapsQuest, effectiveFiles, activePath])

  const questsFileEntry = useMemo(() => {
    if (!isSoapsQuest) return null
  return (
      effectiveFiles.find((f) => {
        const n = f.path.replace(/\\/g, '/').toLowerCase()
        return n === 'quests.yml' || n.endsWith('/quests.yml')
      }) ?? null
    )
  }, [isSoapsQuest, effectiveFiles])

  const questDisplayLabels = useMemo(() => {
    if (!questsFileEntry) return new Map<string, string>()
    return indexQuestDisplays(questsFileEntry.content)
  }, [questsFileEntry])

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

  function updateMythicAddons(partial: Partial<MythicAddons>): void {
    setMythicAddons((prev) => {
      const next = { ...prev, ...partial }
      saveMythicAddons(next)
      return next
    })
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

      const hasRpgContent = mapped.some(
        (f) => f.category === 'reagents' || f.category === 'archetypes',
      )
      const hasCrucibleContent = mapped.some(
        (f) =>
          f.category === 'equipment-sets' ||
          f.category === 'augments' ||
          f.category === 'lore-templates' ||
          f.category === 'placeholders' ||
          f.category === 'stats',
      )
      const addonPatch: Partial<MythicAddons> = {}
      if (workspaceId === 'mythicmobs' && hasRpgContent && !mythicAddons.mythicrpg) {
        addonPatch.mythicrpg = true
      }
      if (workspaceId === 'mythicmobs' && hasCrucibleContent && !mythicAddons.crucible) {
        addonPatch.crucible = true
      }
      if (Object.keys(addonPatch).length > 0) {
        updateMythicAddons(addonPatch)
      }

      const addonNote =
        addonPatch.mythicrpg && addonPatch.crucible
          ? ' MythicRPG and Crucible tools were enabled because this folder includes those files.'
          : addonPatch.mythicrpg
            ? ' MythicRPG tools were enabled because this folder includes archetype or reagent files.'
            : addonPatch.crucible
              ? ' Crucible tools were enabled because this folder includes equipment set or augment files.'
              : ''

      setStatusMessage(
        mapped.length === 0
          ? 'No YAML files found in that folder. Choose a different folder, or start new files from the welcome screen.'
          : `Loaded ${mapped.length} files from ${result.rootPath}.${addonNote}`,
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
        ids: fileIdsForCategory(f.category, dirty.get(f.path) ?? f.content),
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

    const scaffolded = scaffoldPack(workspaceId, {
      packName: options.packName,
      mythicAddons: workspaceId === 'mythicmobs' ? mythicAddons : undefined,
      includeExamples: workspaceId === 'mythicmobs' ? options.includeExamples : undefined,
    })
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
          `Created “${options.packName}” in this browser. Use Export ZIP when you are ready to download the files, or File → Choose save folder to write to disk.`,
        )
      }
      return
    }

    setStatusMessage(
      `Created “${options.packName}” in this browser. It stays here until you clear site data. Use Export ZIP to download the files.`,
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
                ids: fileIdsForCategory(f.category, content),
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

  function toggleOpenQuestFile(path: string): void {
    setOpenQuestFiles((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  function openQuestInEditor(file: FileRecord, questId: string): void {
    selectFile(file)
    pendingQuestScrollRef.current = questId
  }

  useEffect(() => {
    const questId = pendingQuestScrollRef.current
    if (!questId || activeFile?.category !== 'quests') return
    pendingQuestScrollRef.current = null
    requestAnimationFrame(() => {
      editorRef.current?.goToQuestBlock(questId)
    })
  }, [activePath, draft, activeFile?.category])

  async function exportPackAsZip(): Promise<void> {
    const snapshot = effectiveFilesRef.current.map((f) => ({
      path: f.path,
      content: f.content,
    }))
    if (snapshot.length === 0) {
      setStatusMessage('No files to export.')
      return
    }
    try {
      const name = downloadPackZip(snapshot, packDisplayNameRef.current || 'pack')
      setStatusMessage(
        `Downloaded ${name} with ${snapshot.length} file(s). Unzip it into your server plugins folder.`,
      )
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Could not export the pack.')
    }
  }

  function exportCurrentFile(): void {
    if (!activeFile) return
    try {
      downloadTextExport(activeFile.path, draftRef.current)
      setStatusMessage(`Downloaded ${activeFile.name}. Move it into your config folder to use it on the server.`)
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Could not export the file.')
    }
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
      const updated: FileRecord = {
        ...fileRec,
        content,
        ids: fileIdsForCategory(fileRec.category, content),
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
    mythicAddons,
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

  function applyFilePatches(patches: Record<string, string>, summary: string): void {
    const entries = Object.entries(patches)
    if (entries.length === 0) return
    setDirtyMap((prev) => {
      const next = new Map(prev)
      for (const [path, content] of entries) next.set(path, content)
      return next
    })
    setFiles((prev) =>
      prev.map((f) => {
        const content = patches[f.path]
        if (content === undefined) return f
        return { ...f, ids: fileIdsForCategory(f.category, content) }
      }),
    )
    const firstPath = entries[0]![0]
    if (activePath && patches[activePath] !== undefined) {
      setDraft(patches[activePath]!)
    } else if (patches[firstPath] !== undefined) {
      setActivePath(firstPath)
      setDraft(patches[firstPath]!)
    }
    setStatusMessage(summary)
  }

  function insertGenerated(targetPath: string, yaml: string): void {
    const normalized = targetPath.replace(/\\/g, '/')
    const exists = files.some((f) => f.path.replace(/\\/g, '/') === normalized)

    if (dirtyMap.has(activePath) && activePath !== normalized) {
      const leave = window.confirm('You have unsaved changes. Discard them and add the new YAML?')
      if (!leave) return
    }

    if (!exists) {
      void applyMultiFileWrite([{ path: normalized, content: yaml, mode: 'create' }])
      setStatusMessage(`Created ${normalized}. Save to write it to disk.`)
      return
    }

    if (appendYamlToFile(normalized, yaml)) {
      setCreateKind(null)
      setStatusMessage(`Added to ${normalized}. Save the file to keep it.`)
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
      kind === 'skill-casting' ||
      kind === 'spell' ||
      kind === 'archetype' ||
      kind === 'reagent' ||
      kind === 'equipment-set' ||
      kind === 'augment-type' ||
      kind === 'crucible-item' ||
      kind === 'bag' ||
      kind === 'crucible-stat' ||
      kind === 'lore-template' ||
      kind === 'placeholder'
    ) {
      return activePath
    }
    const category =
      kind === 'mob' ? 'mobs'
      : kind === 'item' ? 'items'
      : kind === 'skill' ? 'skills'
      : kind === 'droptable' ? 'droptables'
      : 'randomspawns'
    const active = files.find((f) => f.path === activePath)
    if (active?.category === category) return activePath
    return files.find((f) => f.category === category)?.path ?? activePath
  }

  function handleCreate(kind: CreateKind): void {
    if (kind === 'quest') setEditingQuestId(null)
    setCreateKind(kind)
  }

  function closeQuestWizard(): void {
    setCreateKind(null)
    setEditingQuestId(null)
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
        <img
          className="welcome-brand"
          src={`${import.meta.env.BASE_URL}favicon.svg`}
          alt=""
          width={56}
          height={56}
        />
        <h1 className="welcome-brand">Soaps Config Editor</h1>
        <p className="welcome-lead">Choose a plugin to continue.</p>
        <WorkspaceTiles
          selected={workspaceId}
          onSelect={selectWorkspace}
          mythicAddons={mythicAddons}
          onMythicAddonsChange={updateMythicAddons}
        />
        {workspace ? (
          <div className="welcome-focus" key={workspace.id}>
            <p className="welcome-hint">{workspace.hint}</p>
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
          </div>
        ) : null}
        {browserKind === 'brave' && !directoryPickerSupported() ? (
          <p className="welcome-note welcome-note-brave">
            In Brave, set <code>brave://flags/#file-system-access-api</code> to Enabled, then relaunch, to save
            files to a folder.
          </p>
        ) : (
          <p className="welcome-note">Chrome or Edge can save files to a folder on disk.</p>
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
          mythicAddons={workspaceId === 'mythicmobs' ? mythicAddons : undefined}
          onMythicAddonsChange={workspaceId === 'mythicmobs' ? updateMythicAddons : undefined}
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
            mythicAddons={workspaceId === 'mythicmobs' ? mythicAddons : undefined}
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
            canExport={canExportFromBrowser}
            folderWriteBlocked={folderWriteBlocked}
            dirtyCount={dirtyCount}
            hasActiveFile={Boolean(activeFile)}
            onOpenFolder={() => void openFolder()}
            onChooseSaveFolder={() => void bindSaveFolder()}
            onReconnectFolder={() => void reconnectFolder()}
            onStartNewPack={() => setNewPackOpen(true)}
            onSaveAll={() => void saveAllFiles(false)}
            onExportPack={() => void exportPackAsZip()}
            onExportCurrentFile={exportCurrentFile}
            onChangeWorkspace={changeWorkspace}
          />
          {canExportFromBrowser ? (
        <button
          type="button"
              className={needsSaveFolder ? 'primary' : ''}
              onClick={() => void exportPackAsZip()}
              title="Download all files as a ZIP"
        >
              Export ZIP
        </button>
          ) : null}
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
          {isMythicMobs || isMMOCore || isSoapsQuest ? (
            <NewMenu
              disabled={files.length === 0}
              workspace={
                isMMOCore ? 'mmocore' : isSoapsQuest ? 'soapsquest' : 'mythicmobs'
              }
              mythicAddons={isMythicMobs ? mythicAddons : undefined}
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
            showAcSettings={isMythicMobs || isMMOCore}
            mythicAddons={isMythicMobs ? mythicAddons : undefined}
            onMythicAddonsChange={isMythicMobs ? updateMythicAddons : undefined}
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
                                ? node.files.map((file) => {
                                    const isQuestsFile =
                                      isSoapsQuest &&
                                      file.category === 'quests' &&
                                      file.name.toLowerCase() === 'quests.yml'
                                    const questListOpen = openQuestFiles.has(file.path)
                                    const questIds = isQuestsFile ? file.ids : []
                                    return (
                                      <div key={file.path}>
                                        <div
                                          className={
                                            file.path === activePath
                                              ? 'tree-row file file-row-split active'
                                              : 'tree-row file file-row-split'
                                          }
                                        >
                                          {isQuestsFile && questIds.length > 0 ? (
                                            <button
                                              type="button"
                                              className="tree-row-chevron"
                                              aria-expanded={questListOpen}
                                              aria-label={
                                                questListOpen ? 'Collapse quests' : 'Expand quests'
                                              }
                                              onClick={() => toggleOpenQuestFile(file.path)}
                                            >
                                              {questListOpen ? '▾' : '▸'}
                                            </button>
                                          ) : (
                                            <span className="tree-row-chevron-spacer" aria-hidden="true" />
                                          )}
                                          <button
                                            type="button"
                                            className="tree-row-file-label"
                                            title={file.path}
                                            onClick={() => selectFile(file)}
                                          >
                                            <span className="tree-label">
                                              {file.name}
                                              {dirtyMap.has(file.path) ? (
                                                <span className="dirty-dot" title="Unsaved changes">
                                                  {' '}
                                                  ●
                                                </span>
                                              ) : null}
                                            </span>
                                          </button>
                                        </div>
                                        {isQuestsFile && questListOpen
                                          ? questIds.map((questId) => {
                                              const label = questDisplayLabels.get(questId)
                                              const subtitle =
                                                label && label !== questId ? label : null
                                              return (
                                                <button
                                                  key={`${file.path}:${questId}`}
                                                  type="button"
                                                  className="tree-row file quest-entry"
                                                  title={questId}
                                                  onClick={() => openQuestInEditor(file, questId)}
                                                >
                                                  <span className="tree-label">
                                                    {questId}
                                                    {subtitle ? (
                                                      <span className="tree-label-muted">
                                                        {' '}
                                                        · {subtitle}
                                                      </span>
                                                    ) : null}
                                                  </span>
                                                </button>
                                              )
                                            })
                                          : null}
                                      </div>
                                    )
                                  })
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
                  onApplyPatches={applyFilePatches}
                />
              )}
        </div>
          )}

          {isSoapsQuest && files.length > 0 && (
            <div className="dep-panel-wrap">
              <button
                type="button"
                className="dep-panel-toggle"
                onClick={() => setQuestIssuesOpen((v) => !v)}
                aria-expanded={questIssuesOpen}
              >
                <span className="chevron">{questIssuesOpen ? '▾' : '▸'}</span>
                Quest issues
              </button>
              {questIssuesOpen && (
                <QuestIssuesPanel
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
          {activeFile?.category === 'packinfo' ? (
            <p className="editor-hint">
              Pack metadata for <code>/mm menu</code>. Type a key for suggestions (Name, Version, Icon, Description).
            </p>
          ) : null}
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
            packIndex={isMythicMobs || isMMOCore ? packIndex : undefined}
            acPrefs={isMythicMobs || isMMOCore || isSoapsQuest ? acPrefs : undefined}
            fileCategory={
              isMythicMobs || isMMOCore || isSoapsQuest ? activeFile?.category : undefined
            }
            filePath={activeFile?.path}
            crucibleEnabled={crucibleEnabled}
            soapsQuestCatalog={soapsQuestCatalog}
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
                crucibleEnabled={crucibleEnabled}
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
      createKind !== 'skill-casting' &&
      createKind !== 'spell' &&
      createKind !== 'archetype' &&
      createKind !== 'reagent' &&
      createKind !== 'quest' &&
      createKind !== 'edit-quest' &&
      createKind !== 'equipment-set' &&
      createKind !== 'augment-type' &&
      createKind !== 'crucible-item' &&
      createKind !== 'bag' &&
      createKind !== 'crucible-stat' &&
      createKind !== 'lore-template' &&
      createKind !== 'placeholder' ? (
        <CreateDialog
          kind={createKind}
          files={files}
          packIndex={packIndex}
          suggestedPath={suggestedPathForKind(createKind)}
          crucibleEnabled={crucibleEnabled}
          onClose={() => setCreateKind(null)}
          onInsert={insertGenerated}
        />
      ) : null}
      {createKind === 'spell' && mythicRpgEnabled ? (
        <SpellWizardDialog
          files={effectiveFiles}
          packName={mythicPackName}
          reagentIds={packIndex.reagentIds}
          existingSkillIds={packIndex.skillIds}
          crucibleEnabled={crucibleEnabled}
          onClose={() => setCreateKind(null)}
          onApply={(out) => {
            void applyMultiFileWrite(out.files)
          }}
        />
      ) : null}
      {createKind === 'archetype' && mythicRpgEnabled ? (
        <ArchetypeWizardDialog
          files={effectiveFiles}
          packName={mythicPackName}
          skillIds={packIndex.skillIds}
          existingArchetypeIds={packIndex.archetypeIds}
          onClose={() => setCreateKind(null)}
          onApply={(out) => {
            void applyMultiFileWrite(out.files)
          }}
        />
      ) : null}
      {createKind === 'reagent' && mythicRpgEnabled ? (
        <ReagentWizardDialog
          files={effectiveFiles}
          packName={mythicPackName}
          existingReagentIds={packIndex.reagentIds}
          onClose={() => setCreateKind(null)}
          onApply={(out) => {
            void applyMultiFileWrite(out.files)
          }}
        />
      ) : null}
      {(createKind === 'equipment-set') && crucibleEnabled ? (
        <EquipmentSetWizardDialog
          files={effectiveFiles}
          packName={mythicPackName}
          existingSetIds={packIndex.equipmentSetIds}
          crucibleEnabled={crucibleEnabled}
          packStatIds={packIndex.statIds}
          onClose={() => setCreateKind(null)}
          onApply={(out) => {
            void applyMultiFileWrite(out.files)
            setCreateKind(null)
            setStatusMessage('Equipment set added. Save the file to keep it.')
          }}
        />
      ) : null}
      {createKind === 'augment-type' && crucibleEnabled ? (
        <AugmentTypeWizardDialog
          files={effectiveFiles}
          packName={mythicPackName}
          existingTypeIds={packIndex.augmentTypeIds}
          onClose={() => setCreateKind(null)}
          onApply={(out) => {
            void applyMultiFileWrite(out.files)
            setCreateKind(null)
            setStatusMessage('Augment type added. Save the file to keep it.')
          }}
        />
      ) : null}
      {(createKind === 'crucible-item' || createKind === 'bag') && crucibleEnabled ? (
        <CrucibleItemWizardDialog
          files={effectiveFiles}
          packName={mythicPackName}
          existingItemIds={packIndex.itemIds}
          equipmentSetIds={packIndex.equipmentSetIds}
          augmentTypeIds={packIndex.augmentTypeIds}
          loreTemplateIds={packIndex.loreTemplateIds}
          packStatIds={packIndex.statIds}
          crucibleEnabled={crucibleEnabled}
          initialAsBag={createKind === 'bag'}
          onClose={() => setCreateKind(null)}
          onApply={(out) => {
            void applyMultiFileWrite(out.files)
            setCreateKind(null)
            setStatusMessage(
              createKind === 'bag'
                ? 'Bag added. Save the file to keep it.'
                : 'Crucible item added. Save the file to keep it.',
            )
          }}
        />
      ) : null}
      {createKind === 'crucible-stat' && crucibleEnabled ? (
        <CrucibleStatWizardDialog
          files={effectiveFiles}
          packName={mythicPackName}
          existingStatIds={packIndex.statIds}
          onClose={() => setCreateKind(null)}
          onApply={(out) => {
            void applyMultiFileWrite(out.files)
            setCreateKind(null)
            setStatusMessage('Stat added. Save the file to keep it.')
          }}
        />
      ) : null}
      {createKind === 'lore-template' && crucibleEnabled ? (
        <LoreTemplateWizardDialog
          files={effectiveFiles}
          packName={mythicPackName}
          existingIds={packIndex.loreTemplateIds}
          onClose={() => setCreateKind(null)}
          onApply={(out) => {
            void applyMultiFileWrite(out.files)
            setCreateKind(null)
            setStatusMessage('Lore template added. Save the file to keep it.')
          }}
        />
      ) : null}
      {createKind === 'placeholder' && crucibleEnabled ? (
        <PlaceholderWizardDialog
          files={effectiveFiles}
          packName={mythicPackName}
          existingIds={effectiveFiles
            .filter((f) => f.category === 'placeholders')
            .flatMap((f) => f.ids)}
          onClose={() => setCreateKind(null)}
          onApply={(out) => {
            void applyMultiFileWrite(out.files)
            setCreateKind(null)
            setStatusMessage('Placeholder added. Save the file to keep it.')
          }}
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
      {createKind === 'edit-quest' && isSoapsQuest ? (
        <EditQuestPickerDialog
          files={effectiveFiles}
          onClose={() => setCreateKind(null)}
          onSelect={(questId) => {
            setEditingQuestId(questId)
            setCreateKind('quest')
          }}
        />
      ) : null}
      {createKind === 'quest' && isSoapsQuest ? (
        <QuestWizardDialog
          files={effectiveFiles}
          editingQuestId={editingQuestId}
          onClose={closeQuestWizard}
          onApply={(out) => {
            const wasEdit = editingQuestId != null
            void applyMultiFileWrite(out.files)
            closeQuestWizard()
            setStatusMessage(
              wasEdit
                ? 'Quest updated. Save the file to keep it.'
                : 'Quest added. Save the file to keep it.',
            )
          }}
        />
      ) : null}
      {newPackOpen && workspaceId ? (
        <NewPackDialog
          workspaceId={workspaceId}
          savePrefs={savePrefs}
          folderPickerAvailable={directoryPickerSupported()}
          mythicAddons={workspaceId === 'mythicmobs' ? mythicAddons : undefined}
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
