import { useEffect, useMemo, useState } from 'react'
import { findQuestsYmlPath } from '../../core/soapsquest/classify'
import { indexQuestDisplays } from '../../core/soapsquest/parseQuest'
import { extractQuestIds } from '../../core/soapsquest/questIds'
import type { FileRecord } from '../../types'
import { DialogBody, DialogFooter, DialogHeader, DialogShell } from '../DialogShell'

interface EditQuestPickerDialogProps {
  files: FileRecord[]
  onClose: () => void
  onSelect: (questId: string) => void
}

export function EditQuestPickerDialog({ files, onClose, onSelect }: EditQuestPickerDialogProps) {
  const questsPath = useMemo(() => findQuestsYmlPath(files), [files])
  const questsFile = useMemo(
    () => files.find((f) => f.path.replace(/\\/g, '/') === questsPath),
    [files, questsPath],
  )

  const questIds = useMemo(() => {
    if (!questsFile) return []
    return extractQuestIds(questsFile.content).sort()
  }, [questsFile])

  const labels = useMemo(() => {
    if (!questsFile) return new Map<string, string>()
    return indexQuestDisplays(questsFile.content)
  }, [questsFile])

  const [selected, setSelected] = useState('')

  useEffect(() => {
    setSelected(questIds[0] ?? '')
  }, [questIds])

  function submit(): void {
    if (!selected) return
    onSelect(selected)
  }

  return (
    <DialogShell size="sm" labelledBy="edit-quest-picker-title" onClose={onClose}>
      <DialogHeader
        title="Edit quest"
        titleId="edit-quest-picker-title"
        onClose={onClose}
        lead={
          questIds.length === 0
            ? `No quests found in ${questsPath}. Create one first, or open a folder that contains quests.yml.`
            : 'Opens the quest wizard with the selected entry loaded.'
        }
      />

      {questIds.length > 0 ? (
        <DialogBody>
          <label className="wz-field">
            Quest
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              {questIds.map((id) => (
                <option key={id} value={id}>
                  {labels.get(id) && labels.get(id) !== id
                    ? `${id} (${labels.get(id)})`
                    : id}
                </option>
              ))}
            </select>
          </label>
        </DialogBody>
      ) : null}

      <DialogFooter>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="primary" disabled={!selected} onClick={submit}>
          Edit quest
        </button>
      </DialogFooter>
    </DialogShell>
  )
}
