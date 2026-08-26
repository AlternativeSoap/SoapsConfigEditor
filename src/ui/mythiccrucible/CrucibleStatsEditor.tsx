import { useMemo, useState } from 'react'
import {
  CRUCIBLE_STAT_MODIFIERS,
  parseCrucibleStatLines,
  serializeCrucibleStatLines,
  type CrucibleStatLine,
  type CrucibleStatModifier,
} from '../../core/mythiccrucible/statLines'
import { normalizeAttributeId } from '../../data/mmocore/attributes'
import {
  COMMON_ITEM_STATS,
  ITEM_STAT_CATALOG,
  resolveItemStatMeta,
} from '../../data/mythiccrucible/itemStats'
import { RemoveButton } from '../RemoveButton'

const MODIFIER_LABELS: Record<CrucibleStatModifier, string> = {
  ADDITIVE: 'Add flat (ADDITIVE)',
  ADDITIVE_MULTIPLIER: 'Add % (ADDITIVE_MULTIPLIER)',
  COMPOUND_MULTIPLIER: 'Multiply (COMPOUND_MULTIPLIER)',
  SETTER: 'Set exact (SETTER)',
}

interface CrucibleStatsEditorProps {
  value: string
  onChange: (next: string) => void
  /** Extra pack-defined stat ids from stats.yml */
  packStatIds?: string[]
}

export function CrucibleStatsEditor({
  value,
  onChange,
  packStatIds = [],
}: CrucibleStatsEditorProps) {
  const [search, setSearch] = useState('')
  const rows = useMemo(() => parseCrucibleStatLines(value), [value])
  const used = useMemo(() => new Set(rows.map((r) => r.id.toUpperCase())), [rows])

  const catalog = useMemo(() => {
    const extras = packStatIds
      .map((id) => normalizeAttributeId(id))
      .filter(Boolean)
      .filter((id) => !ITEM_STAT_CATALOG.some((e) => e.id === id))
      .map((id) => resolveItemStatMeta(id))
    return [...ITEM_STAT_CATALOG, ...extras]
  }, [packStatIds])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return catalog.filter(
      (entry) =>
        entry.id.toLowerCase().includes(q) ||
        entry.label.toLowerCase().includes(q) ||
        (entry.description?.toLowerCase().includes(q) ?? false),
    )
  }, [catalog, search])

  function commit(nextRows: CrucibleStatLine[]): void {
    onChange(serializeCrucibleStatLines(nextRows))
  }

  function addStat(id: string): void {
    const norm = normalizeAttributeId(id)
    if (!norm || used.has(norm)) return
    commit([...rows, { id: norm, value: '1', modifier: 'ADDITIVE' }])
    setSearch('')
  }

  function updateRow(index: number, partial: Partial<CrucibleStatLine>): void {
    commit(rows.map((row, i) => (i === index ? { ...row, ...partial } : row)))
  }

  function removeRow(index: number): void {
    commit(rows.filter((_, i) => i !== index))
  }

  const customCandidate = normalizeAttributeId(search.replace(/\s+/g, '_'))
  const canAddCustom =
    Boolean(customCandidate) &&
    !used.has(customCandidate) &&
    !filtered.some((e) => e.id === customCandidate)

  return (
    <div className="crucible-stats-editor wide">
      <div className="wz-attr-toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stats to add…"
          aria-label="Search stats to add"
        />
      </div>

      {search.trim() ? (
        <div className="attr-picker">
          {filtered.slice(0, 24).map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="chip"
              title={entry.description ?? entry.id}
              disabled={used.has(entry.id)}
              onClick={() => addStat(entry.id)}
            >
              {entry.icon} {entry.label}
            </button>
          ))}
          {canAddCustom ? (
            <button type="button" className="chip" onClick={() => addStat(customCandidate)}>
              Add {customCandidate}
            </button>
          ) : null}
          {filtered.length === 0 && !canAddCustom ? (
            <p className="dialog-note">No matching stats. Type a custom id, then click Add.</p>
          ) : null}
        </div>
      ) : (
        <div className="attr-picker">
          {COMMON_ITEM_STATS.map((id) => {
            const meta = resolveItemStatMeta(id)
            return (
              <button
                key={id}
                type="button"
                className="chip"
                disabled={used.has(id)}
                onClick={() => addStat(id)}
              >
                + {meta.label}
              </button>
            )
          })}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="dialog-note">No stats yet. Search above and click a stat to add it.</p>
      ) : (
        <div className="crucible-stats-table">
          <div className="crucible-stats-head" aria-hidden="true">
            <span>Stat</span>
            <span>Value</span>
            <span>How it applies</span>
            <span />
          </div>
          {rows.map((row, index) => {
            const meta = resolveItemStatMeta(row.id)
            return (
              <div key={`${row.id}-${index}`} className="crucible-stats-row">
                <div className="wz-attr-name" title={row.id}>
                  <span className="wz-attr-icon">{meta.icon}</span>
                  <span>
                    <strong>{meta.label}</strong>
                    <code>{row.id}</code>
                  </span>
                </div>
                <input
                  value={row.value}
                  aria-label={`${row.id} value`}
                  onChange={(e) => updateRow(index, { value: e.target.value })}
                  placeholder="5 or 20to30"
                />
                <select
                  value={row.modifier}
                  aria-label={`${row.id} modifier`}
                  onChange={(e) =>
                    updateRow(index, { modifier: e.target.value as CrucibleStatModifier })
                  }
                >
                  {CRUCIBLE_STAT_MODIFIERS.map((mod) => (
                    <option key={mod} value={mod}>
                      {MODIFIER_LABELS[mod]}
                    </option>
                  ))}
                </select>
                <RemoveButton
                  aria-label={`Remove ${row.id}`}
                  onClick={() => removeRow(index)}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
