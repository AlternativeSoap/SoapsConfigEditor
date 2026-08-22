import { useEffect, useState } from 'react'
import {
  generateElementsYaml,
  parseElementsYaml,
  type MythicLibElementRow,
} from '../../core/mmocore/elements'
import { DEFAULT_ELEMENT_IDS } from '../../data/mmocore/triggers'
import type { FileRecord } from '../../types'

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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

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
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog dialog-lg"
        role="dialog"
        aria-labelledby="elements-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header-row">
          <h2 id="elements-title">MythicLib elements</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="dialog-fields">
          <p>
            Register elemental damage types and wire their regular-attack / crit-strike skill ids.
            Script bodies for those skills stay in MythicLib YAML.
          </p>
          {rows.length === 0 ? (
            <p className="wz-empty">No elements yet. Add a row to begin.</p>
          ) : null}
          {rows.map((row, idx) => (
            <div key={idx} className="skill-card">
              <div className="wz-card-head">
                <strong>{row.id || 'New element'}</strong>
                <button
                  type="button"
                  className="wz-icon-btn"
                  onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                >
                  ×
                </button>
              </div>
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
                <label>
                  Critical strike skill id
                  <input
                    value={row.critStrikeId}
                    onChange={(e) => updateRow(idx, { critStrikeId: e.target.value })}
                    placeholder="storm_critical_strike"
                  />
                </label>
              </div>
            </div>
          ))}
          <datalist id="element-id-suggestions">
            {DEFAULT_ELEMENT_IDS.map((el) => (
              <option key={el} value={el} />
            ))}
          </datalist>
          <button type="button" className="chip" onClick={() => setRows((prev) => [...prev, EMPTY_ROW()])}>
            Add element
          </button>
        </div>
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={submit}>
            Save elements.yml
          </button>
        </div>
      </div>
    </div>
  )
}
