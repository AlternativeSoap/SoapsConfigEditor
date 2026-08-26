import { useEffect, useRef, useState } from 'react'
import type { MythicAddons } from '../core/workspaces/mythicAddons'
import type { SavePrefs, WorkspaceKind } from '../types'
import { DEFAULT_SAVE_PREFS } from '../types'
import { getWorkspace } from '../core/workspaces/profiles'
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogOption,
  DialogOptionGrid,
  DialogPanel,
  DialogShell,
  DialogSwitchRow,
} from './DialogShell'

export interface NewPackStartOptions {
  packName: string
  saveTarget: 'browser' | 'folder'
  autoSave: boolean
  autoSaveInterval: number
  includeExamples?: boolean
}

interface NewPackDialogProps {
  workspaceId: WorkspaceKind
  savePrefs?: SavePrefs
  folderPickerAvailable: boolean
  mythicAddons?: MythicAddons
  onClose: () => void
  onConfirm: (options: NewPackStartOptions) => void
}

const AUTOSAVE_INTERVALS: { value: number; label: string }[] = [
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 120, label: '2m' },
  { value: 300, label: '5m' },
]

function leadCopy(workspaceId: WorkspaceKind): string {
  if (workspaceId === 'mythicmobs') {
    return 'Creates MythicMobs/Packs/{name}/ with Mobs, Items, Skills, and related folders.'
  }
  if (workspaceId === 'mmocore') {
    return 'Creates MMOCore/, MythicLib/, and MythicMobs/Packs/ as sibling folders.'
  }
  if (workspaceId === 'mmoitems') {
    return 'Creates MMOItems/item/material.yml.'
  }
  if (workspaceId === 'soapsquest') {
    return 'Creates quests.yml, tiers.yml, and difficulties.yml.'
  }
  if (workspaceId === 'soapstraits') {
    return 'Creates traits.yml for SoapsTraits.'
  }
  return 'Creates starter YAML for this plugin.'
}

function examplesHint(addons?: MythicAddons): string {
  if (!addons) return 'Adds a small linked starter pack you can run on a server.'
  const extras: string[] = []
  if (addons.mythicrpg) extras.push('MythicRPG')
  if (addons.crucible) extras.push('Crucible')
  if (extras.length === 0) return 'Adds the Galebound starter pack with linked mobs, skills, and items.'
  return `Adds the Galebound starter pack. Also includes ${extras.join(' and ')} files from Settings.`
}

export function NewPackDialog({
  workspaceId,
  savePrefs = DEFAULT_SAVE_PREFS,
  folderPickerAvailable,
  mythicAddons,
  onClose,
  onConfirm,
}: NewPackDialogProps) {
  const workspace = getWorkspace(workspaceId)
  const defaultName = workspaceId === 'mmocore' ? 'MyClassPack' : 'MyPack'
  const [packName, setPackName] = useState(defaultName)
  const [saveTarget, setSaveTarget] = useState<'browser' | 'folder'>('browser')
  const [autoSave, setAutoSave] = useState(true)
  const [autoSaveInterval, setAutoSaveInterval] = useState(300)
  const [includeExamples, setIncludeExamples] = useState(false)
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

  const nameOk = Boolean(packName.trim())
  const canCreate = nameOk && (saveTarget === 'browser' || folderPickerAvailable)
  const confirmLabel = workspace?.confirmLabel ?? 'Create files'

  function submit() {
    if (!canCreate) return
    onConfirm({
      packName: packName.trim(),
      saveTarget,
      autoSave,
      autoSaveInterval: autoSave ? autoSaveInterval : savePrefs.autoSaveInterval,
      includeExamples: workspaceId === 'mythicmobs' ? includeExamples : undefined,
    })
  }

  return (
    <DialogShell className="dialog-pack" labelledBy="new-pack-title" onClose={onClose}>
      <DialogHeader
        title={workspace?.startDialogTitle ?? 'Start new files'}
        titleId="new-pack-title"
        onClose={onClose}
        lead={leadCopy(workspaceId)}
      />

      <DialogBody className="dialog-pack-body">
        <label className="dialog-name-field">
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

        {workspaceId === 'mythicmobs' ? (
          <DialogSwitchRow
            title="Linked examples"
            hint={examplesHint(mythicAddons)}
            checked={includeExamples}
            onChange={setIncludeExamples}
            ariaLabel="Include linked examples"
          />
        ) : null}

        <DialogPanel title="Save to">
          <DialogOptionGrid label="Save to">
            <DialogOption
              selected={saveTarget === 'browser'}
              title="Browser"
              description="Keeps files here. Export a ZIP when you need them on disk."
              onClick={() => setSaveTarget('browser')}
            />
            <DialogOption
              selected={saveTarget === 'folder'}
              title="Folder"
              description={
                folderPickerAvailable
                  ? 'Writes into a folder you choose.'
                  : 'Not available in this browser.'
              }
              disabled={!folderPickerAvailable}
              onClick={() => setSaveTarget('folder')}
            />
          </DialogOptionGrid>
        </DialogPanel>

        <div className="dialog-pack-autosave">
          <DialogSwitchRow
            title="Auto-save"
            hint={autoSave ? 'Saves changed files on a timer.' : 'Turn on to save on a timer.'}
            checked={autoSave}
            onChange={setAutoSave}
            ariaLabel="Auto-save"
          />
          {autoSave ? (
            <div className="dialog-chip-row" role="group" aria-label="Auto-save interval">
              {AUTOSAVE_INTERVALS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`dialog-chip${autoSaveInterval === value ? ' active' : ''}`}
                  onClick={() => setAutoSaveInterval(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </DialogBody>

      <DialogFooter>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="primary" disabled={!canCreate} onClick={submit}>
          {confirmLabel}
        </button>
      </DialogFooter>
    </DialogShell>
  )
}
