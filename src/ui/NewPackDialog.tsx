import { useEffect, useRef, useState } from 'react'
import type { SavePrefs, WorkspaceKind } from '../types'
import { DEFAULT_SAVE_PREFS } from '../types'
import { getWorkspace } from '../core/workspaces/profiles'

export interface NewPackStartOptions {
  packName: string
  saveTarget: 'browser' | 'folder'
  autoSave: boolean
  autoSaveInterval: number
}

interface NewPackDialogProps {
  workspaceId: WorkspaceKind
  savePrefs?: SavePrefs
  folderPickerAvailable: boolean
  onClose: () => void
  onConfirm: (options: NewPackStartOptions) => void
}

const AUTOSAVE_INTERVALS: { value: number; label: string }[] = [
  { value: 10, label: '10 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
  { value: 300, label: '5 minutes' },
]

function leadCopy(workspaceId: WorkspaceKind): string {
  if (workspaceId === 'mythicmobs') {
    return 'Creates a MythicMobs Packs folder with starter mobs, items, skills, and related files.'
  }
  if (workspaceId === 'mmocore') {
    return 'Creates an MMOCore class pack with MMOCore, MythicLib, and MythicMobs starter files. Copy each folder into the matching plugins directory on your server.'
  }
  if (workspaceId === 'mmoitems') {
    return 'Creates a small MMOItems starter under item/.'
  }
  return 'Creates starter YAML for this plugin.'
}

export function NewPackDialog({
  workspaceId,
  savePrefs = DEFAULT_SAVE_PREFS,
  folderPickerAvailable,
  onClose,
  onConfirm,
}: NewPackDialogProps) {
  const workspace = getWorkspace(workspaceId)
  const defaultName = workspaceId === 'mmocore' ? 'MyClassPack' : 'MyPack'
  const [packName, setPackName] = useState(defaultName)
  const [autoSave, setAutoSave] = useState(savePrefs.autoSave)
  const [autoSaveInterval, setAutoSaveInterval] = useState(savePrefs.autoSaveInterval)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function start(saveTarget: NewPackStartOptions['saveTarget']) {
    const name = packName.trim()
    if (!name) return
    onConfirm({ packName: name, saveTarget, autoSave, autoSaveInterval })
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog dialog-new-pack"
        role="dialog"
        aria-labelledby="new-pack-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="new-pack-title">{workspace?.startDialogTitle ?? 'Start new files'}</h2>
        <p className="new-pack-lead">{leadCopy(workspaceId)}</p>

        <div className="dialog-fields new-pack-fields">
          <label>
            {workspace?.nameFieldLabel ?? 'Name'}
            <input
              ref={inputRef}
              value={packName}
              onChange={(e) => setPackName(e.target.value)}
              placeholder={defaultName}
              required
            />
          </label>

          <fieldset className="new-pack-section">
            <legend className="new-pack-section-title">Where to save</legend>
            <p className="new-pack-section-hint">
              Pick one now so your work is not lost. Browser storage keeps the pack on this computer until you clear
              site data. A folder writes YAML files you can copy to a server.
            </p>
            <div className="new-pack-save-actions">
              <button
                type="button"
                className="new-pack-save-btn"
                disabled={!packName.trim()}
                onClick={() => start('browser')}
              >
                <span className="new-pack-save-btn-title">Save in browser</span>
                <span className="new-pack-save-btn-desc">Resume later on this device. No folder needed.</span>
              </button>
              <button
                type="button"
                className="new-pack-save-btn primary"
                disabled={!packName.trim() || !folderPickerAvailable}
                title={
                  folderPickerAvailable
                    ? 'Choose a folder on your PC'
                    : 'Folder saving needs Chrome, Edge, or Brave with the File System Access API enabled'
                }
                onClick={() => start('folder')}
              >
                <span className="new-pack-save-btn-title">Save to folder on PC</span>
                <span className="new-pack-save-btn-desc">
                  {folderPickerAvailable
                    ? 'Pick a folder and write starter files immediately.'
                    : 'Not available in this browser. Use Save in browser or switch browsers.'}
                </span>
              </button>
            </div>
          </fieldset>

          <fieldset className="new-pack-section">
            <legend className="new-pack-section-title">Auto-save</legend>
            <label className="new-pack-toggle">
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
              />
              <span>Automatically save changed files</span>
            </label>
            {autoSave ? (
              <>
                <label className="new-pack-interval">
                  <span>Every</span>
                  <select
                    value={autoSaveInterval}
                    onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                  >
                    {AUTOSAVE_INTERVALS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="new-pack-section-hint">
                  Saves to disk when a folder is connected. Your session is always kept in this browser separately.
                </p>
              </>
            ) : (
              <p className="new-pack-section-hint">You can turn this on later in Settings. Use the shortcuts below to save manually.</p>
            )}
          </fieldset>

          <div className="new-pack-shortcuts">
            <span className="new-pack-section-title">Keyboard shortcuts</span>
            <ul>
              <li>
                <kbd>Ctrl</kbd> + <kbd>S</kbd> save the current file
              </li>
              <li>
                <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> save all changed files
              </li>
            </ul>
          </div>
        </div>

        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
