import { useEffect, useRef, useState } from 'react'
import type { SavePrefs, WorkspaceKind } from '../types'
import { DEFAULT_SAVE_PREFS } from '../types'
import { getWorkspace } from '../core/workspaces/profiles'
import { Switch } from './Switch'

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
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 120, label: '2m' },
  { value: 300, label: '5m' },
]

function leadCopy(workspaceId: WorkspaceKind): string {
  if (workspaceId === 'mythicmobs') {
    return 'Creates MythicMobs/Packs/{name}/ with starter Mobs, Items, Skills, and related files. Save into your plugins folder so paths match the server. If MythicRPG is enabled, archetype and reagent starters are included.'
  }
  if (workspaceId === 'mmocore') {
    return 'Creates MMOCore/, MythicLib/, and MythicMobs/Packs/ starters as sibling folders. Save into your plugins folder so each tree lands in the matching plugin directory.'
  }
  if (workspaceId === 'mmoitems') {
    return 'Creates MMOItems/item/material.yml. Save into your plugins folder, or open plugins/MMOItems/ and move the file into item/ if needed.'
  }
  if (workspaceId === 'soapsquest') {
    return 'Creates quests.yml, tiers.yml, and difficulties.yml for SoapsQuest. Save into plugins/SoapsQuest/ on your server.'
  }
  if (workspaceId === 'soapstraits') {
    return 'Creates traits.yml for SoapsTraits. Save into plugins/SoapsTraits/ on your server.'
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
  const [saveTarget, setSaveTarget] = useState<'browser' | 'folder'>(
    folderPickerAvailable ? 'folder' : 'browser',
  )
  const [autoSave, setAutoSave] = useState(savePrefs.autoSave)
  const [autoSaveInterval, setAutoSaveInterval] = useState(savePrefs.autoSaveInterval)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    if (!folderPickerAvailable && saveTarget === 'folder') {
      setSaveTarget('browser')
    }
  }, [folderPickerAvailable, saveTarget])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const nameOk = Boolean(packName.trim())
  const canCreate = nameOk && (saveTarget === 'browser' || folderPickerAvailable)
  const confirmLabel = workspace?.confirmLabel ?? 'Create files'

  function submit() {
    if (!canCreate) return
    onConfirm({
      packName: packName.trim(),
      saveTarget,
      autoSave,
      autoSaveInterval,
    })
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog dialog-new-pack"
        role="dialog"
        aria-labelledby="new-pack-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="new-pack-header">
          <h2 id="new-pack-title">{workspace?.startDialogTitle ?? 'Start new files'}</h2>
          <p className="new-pack-lead">{leadCopy(workspaceId)}</p>
        </header>

        <label className="new-pack-name">
          {workspace?.nameFieldLabel ?? 'Name'}
          <input
            ref={inputRef}
            value={packName}
            onChange={(e) => setPackName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={defaultName}
            required
          />
        </label>

        <div className="new-pack-panel">
          <section className="new-pack-block">
            <h3 className="new-pack-section-title">Where to save</h3>
            <div className="new-pack-save-actions" role="radiogroup" aria-label="Where to save">
              <button
                type="button"
                role="radio"
                aria-checked={saveTarget === 'browser'}
                className={`new-pack-save-btn${saveTarget === 'browser' ? ' selected' : ''}`}
                onClick={() => setSaveTarget('browser')}
              >
                <span className="new-pack-save-btn-title">Save in browser</span>
                <span className="new-pack-save-btn-desc">
                  Stays on this computer until you clear site data.
                </span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={saveTarget === 'folder'}
                className={`new-pack-save-btn${saveTarget === 'folder' ? ' selected' : ''}`}
                disabled={!folderPickerAvailable}
                title={
                  folderPickerAvailable
                    ? undefined
                    : 'Folder saving needs Chrome, Edge, or Brave'
                }
                onClick={() => setSaveTarget('folder')}
              >
                <span className="new-pack-save-btn-title">Save to folder</span>
                <span className="new-pack-save-btn-desc">
                  {folderPickerAvailable
                    ? 'Writes YAML you can copy to your server.'
                    : 'Not available in this browser. Use Save in browser instead.'}
                </span>
              </button>
            </div>
          </section>

          <section className="new-pack-block new-pack-autosave">
            <div className="new-pack-switch-row">
              <div className="new-pack-switch-copy">
                <h3 className="new-pack-section-title">Auto-save</h3>
                <p className="new-pack-switch-hint">
                  {autoSave
                    ? 'Changed files save on a timer.'
                    : 'You can turn this on later in Settings.'}
                </p>
              </div>
              <Switch
                checked={autoSave}
                onChange={setAutoSave}
                aria-label="Auto-save"
              />
            </div>
            {autoSave ? (
              <div className="new-pack-interval-row" role="group" aria-label="Auto-save interval">
                {AUTOSAVE_INTERVALS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`new-pack-chip${autoSaveInterval === opt.value ? ' active' : ''}`}
                    onClick={() => setAutoSaveInterval(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <p className="new-pack-shortcuts">
          <kbd>Ctrl</kbd>
          <kbd>S</kbd>
          <span>current file</span>
          <span className="new-pack-shortcuts-sep" aria-hidden="true">
            ·
          </span>
          <kbd>Ctrl</kbd>
          <kbd>Shift</kbd>
          <kbd>S</kbd>
          <span>all changed</span>
        </p>

        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary" disabled={!canCreate} onClick={submit}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
