import { useState } from 'react'
import {
  generateElementsYaml,
  parseElementsYaml,
  type MythicLibElementRow,
} from '../../core/mmocore/elements'
import { DEFAULT_ELEMENT_IDS } from '../../data/mmocore/triggers'
import type { FileRecord } from '../../types'
import {
  DialogAddButton,
  DialogBody,
  DialogCard,
  DialogFooter,
  DialogHeader,
  DialogShell,
} from '../DialogShell'

interface ElementsEditorDialogProps {
  files: FileRecord[]
  onClose: () => void
  onApply: (path: string, content: string) => void
}

const EMPTY_ROW = (): MythicLibElementRow => ({
  id: '',
  name: '',
  icon: 'BOOK',
  loreIcon: '⚡',
  color: '&b',
  regularAttackId: '',
  critStrikeId: '',
})

export function ElementsEditorDialog({ files, onClose, onApply }: ElementsEditorDialogProps) {
  const path = 'MythicLib/elements.yml'
  const existing = files.find((f) => f.path === path)
  const [rows, setRows] = useState<MythicLibElementRow[]>(() =>
    parseElementsYaml(existing?.content ?? ''),
  )

  function updateRow(idx: number, patch: Partial<MythicLibElementRow>): void {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  function submit(): void {
    const cleaned = rows
      .map((r) => ({
        ...r,
        id: r.id.trim().toUpperCase().replace(/\s+/g, '_'),
      }))
      .filter((r) => r.id)
    onApply(path, generateElementsYaml(cleaned))
  }

  return (
    <DialogShell size="lg" labelledBy="elements-title" onClose={onClose}>
      <DialogHeader
        title="MythicLib elements"
        titleId="elements-title"
        onClose={onClose}
        lead="Register elemental damage types and wire their regular-attack and crit-strike skill ids. Script bodies stay in MythicLib YAML."
      />

      <DialogBody>
        {rows.length === 0 ? (
          <p className="wz-empty">No elements yet. Add one below.</p>
        ) : (
          rows.map((row, idx) => (
            <DialogCard
              key={idx}
              title={row.id || `Element ${idx + 1}`}
              removeLabel={`Remove ${row.id || `element ${idx + 1}`}`}
              onRemove={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
            >
              <div className="wz-grid-2">
                <label>
                  Id
                  <input
                    list="element-id-suggestions"
                    value={row.id}
                    onChange={(e) => updateRow(idx, { id: e.target.value })}
                    placeholder="STORM"
                  />
                </label>
                <label>
                  Name
                  <input
                    value={row.name}
                    onChange={(e) => updateRow(idx, { name: e.target.value })}
                  />
                </label>
                <label>
                  Icon
                  <input
                    value={row.icon}
                    onChange={(e) => updateRow(idx, { icon: e.target.value })}
                  />
                </label>
                <label>
                  Lore icon
                  <input
                    value={row.loreIcon}
                    onChange={(e) => updateRow(idx, { loreIcon: e.target.value })}
                  />
                </label>
                <label>
                  Color
                  <input
                    value={row.color}
                    onChange={(e) => updateRow(idx, { color: e.target.value })}
                  />
                </label>
                <label>
                  Regular attack skill id
                  <input
                    value={row.regularAttackId}
                    onChange={(e) => updateRow(idx, { regularAttackId: e.target.value })}
                    placeholder="storm_regular_attack"
                  />
                </label>
                <label className="wide">
                  Critical strike skill id
                  <input
                    value={row.critStrikeId}
                    onChange={(e) => updateRow(idx, { critStrikeId: e.target.value })}
                    placeholder="storm_critical_strike"
                  />
                </label>
              </div>
            </DialogCard>
          ))
        )}
        <datalist id="element-id-suggestions">
          {DEFAULT_ELEMENT_IDS.map((el) => (
            <option key={el} value={el} />
          ))}
        </datalist>
        <DialogAddButton onClick={() => setRows((prev) => [...prev, EMPTY_ROW()])}>
          Add element
        </DialogAddButton>
      </DialogBody>

      <DialogFooter>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="primary" onClick={submit}>
          Save elements.yml
        </button>
      </DialogFooter>
    </DialogShell>
  )
}
