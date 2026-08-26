import { RemoveButton } from './RemoveButton'

export interface CatalogLineRow {
  id: string
  params: string
}

export function parseCatalogLine(line: string): CatalogLineRow {
  const trimmed = line.trim()
  if (!trimmed) return { id: '', params: '' }
  const brace = /^([A-Za-z0-9_]+)(\{.*\})$/.exec(trimmed)
  if (brace) return { id: brace[1] ?? '', params: brace[2] ?? '' }
  const space = trimmed.indexOf(' ')
  if (space > 0) {
    return { id: trimmed.slice(0, space), params: trimmed.slice(space + 1).trim() }
  }
  return { id: trimmed, params: '' }
}

export function formatCatalogLine(row: CatalogLineRow): string {
  const id = row.id.trim()
  if (!id) return ''
  const params = row.params.trim()
  if (!params) return id
  if (params.startsWith('{')) return `${id}${params}`
  return `${id} ${params}`
}

export function linesFromMultiline(text: string): CatalogLineRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCatalogLine)
}

export function multilineFromRows(rows: CatalogLineRow[]): string {
  return rows.map(formatCatalogLine).filter(Boolean).join('\n')
}

interface CatalogLineListProps {
  label: string
  hint?: string
  value: string
  onChange: (next: string) => void
  options: readonly string[]
  /** When picking an option, prefer this insert over the bare id. */
  applyMap?: Record<string, string>
  /** Placeholder for the params field by selector id. */
  paramHints?: Record<string, string>
  addLabel?: string
}

export function CatalogLineList({
  label,
  hint,
  value,
  onChange,
  options,
  applyMap = {},
  paramHints = {},
  addLabel = 'Add',
}: CatalogLineListProps) {
  const rows = linesFromMultiline(value)

  function commit(next: CatalogLineRow[]) {
    onChange(multilineFromRows(next))
  }

  function updateRow(index: number, patch: Partial<CatalogLineRow>) {
    commit(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function removeRow(index: number) {
    commit(rows.filter((_, i) => i !== index))
  }

  function addFromOption(optionId: string) {
    if (!optionId) return
    const applied = applyMap[optionId] ?? optionId
    const parsed = parseCatalogLine(applied)
    commit([...rows, parsed])
  }

  return (
    <div className="catalog-line-list">
      <div className="catalog-line-list-head">
        <span className="catalog-line-list-label">{label}</span>
        {hint ? <span className="field-hint">{hint}</span> : null}
      </div>
      <div className="catalog-line-rows">
        {rows.map((row, index) => (
          <div key={`${row.id}-${index}`} className="catalog-line-row">
            <select
              value={options.includes(row.id) ? row.id : ''}
              aria-label={`${label} ${index + 1}`}
              onChange={(e) => {
                const nextId = e.target.value
                if (!nextId) return
                const applied = applyMap[nextId] ?? nextId
                const parsed = parseCatalogLine(applied)
                updateRow(index, parsed)
              }}
            >
              {!options.includes(row.id) && row.id ? (
                <option value="">{row.id} (custom)</option>
              ) : null}
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <input
              value={row.params}
              placeholder={paramHints[row.id] ?? 'Attributes or args (optional)'}
              aria-label={`${label} ${index + 1} attributes`}
              onChange={(e) => updateRow(index, { params: e.target.value })}
            />
            <RemoveButton
              aria-label={`Remove ${row.id || label}`}
              onClick={() => removeRow(index)}
            />
          </div>
        ))}
      </div>
      <div className="catalog-line-add">
        <select
          defaultValue=""
          aria-label={addLabel}
          onChange={(e) => {
            addFromOption(e.target.value)
            e.target.value = ''
          }}
        >
          <option value="" disabled>
            {addLabel}…
          </option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
