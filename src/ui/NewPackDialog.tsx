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
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 120, label: '2m' },
  { value: 300, label: '5m' },
]

function leadCopy(workspaceId: WorkspaceKind, includeExamples: boolean): string {
  if (workspaceId === 'mythicmobs') {
    if (includeExamples) {
      return 'Creates MythicMobs/Packs/{name}/ with a linked Galebound example pack: mobs, skills, loot, and items that reference each other. MythicRPG and Crucible add-ons in Settings add more linked files when those add-ons are enabled.'
    }
    return 'Creates MythicMobs/Packs/{name}/ with empty Mobs, Items, Skills, and related folders. Turn on linked examples below for a small starter pack you can run on a server. Save into your plugins folder so paths match the server.'
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

function exampleAddonSummary(addons: MythicAddons): string {
  const parts: string[] = ['MythicMobs core']
  if (addons.mythicrpg) parts.push('MythicRPG spells and archetypes')
  if (addons.crucible) parts.push('Crucible sets, gear, stats, and lore templates')
  return parts.join(', ')
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
  const [saveTarget, setSaveTarget] = useState<'browser' | 'folder'>(
    folderPickerAvailable ? 'folder' : 'browser',
  )
  const [autoSave, setAutoSave] = useState(savePrefs.autoSave)
  const [autoSaveInterval, setAutoSaveInterval] = useState(savePrefs.autoSaveInterval)
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
      autoSaveInterval,
      includeExamples: workspaceId === 'mythicmobs' ? includeExamples : undefined,
    })
  }

  return (
    <DialogShell className="dialog-pack" labelledBy="new-pack-title" onClose={onClose}>
      <DialogHeader
        title={workspace?.startDialogTitle ?? 'Start new files'}
        titleId="new-pack-title"
        onClose={onClose}
        lead={leadCopy(workspaceId, includeExamples)}
      />

      <DialogBody>
        {workspaceId === 'mythicmobs' ? (
          <DialogPanel>
            <DialogSwitchRow
              title="Include linked examples"
              hint={
                mythicAddons && includeExamples
                  ? `Adds the Galebound Covenant starter pack with cross-linked mobs, skills, loot, and items. Includes: ${exampleAddonSummary(mythicAddons)}.`
                  : 'Adds the Galebound Covenant starter pack with cross-linked mobs, skills, loot, and items. MythicRPG and Crucible content follows your Settings add-ons.'
              }
              checked={includeExamples}
              onChange={setIncludeExamples}
              ariaLabel="Include linked examples"
            />
          </DialogPanel>
        ) : null}

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

        <DialogPanel title="Where to save">
          <DialogOptionGrid label="Where to save">
            <DialogOption
              selected={saveTarget === 'browser'}
              title="Save in browser"
              description="Stays on this computer until you clear site data. Export ZIP when you want the files on disk."
              onClick={() => setSaveTarget('browser')}
            />
            <DialogOption
              selected={saveTarget === 'folder'}
              title="Save to folder"
              description={
                folderPickerAvailable
                  ? 'Writes files directly into a folder you choose. Best for server plugin directories.'
                  : 'Folder access is not available in this browser. Use Save in browser or open in Chrome, Edge, or Brave.'
              }
              disabled={!folderPickerAvailable}
              onClick={() => setSaveTarget('folder')}
            />
          </DialogOptionGrid>
        </DialogPanel>

        <DialogPanel title="Auto-save">
          <DialogSwitchRow
            title="Auto-save"
            hint={
              autoSave
                ? 'Changed files save on a timer.'
                : 'You can turn this on later in Settings.'
            }
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
        </DialogPanel>
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
