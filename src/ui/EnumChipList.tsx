import { useMemo, useState } from 'react'
import { RemoveButton } from './RemoveButton'

interface EnumChipListProps {
  label: string
  hint?: string
  value: string
  onChange: (next: string) => void
  options: readonly string[]
  /** Join character between chips when serializing. Default: ', ' */
  separator?: string
  placeholder?: string
  uppercase?: boolean
}

function parseChips(value: string, separator: string): string[] {
  const splitOn = separator.includes(',') ? /[,]+/ : /\n+/
  return value
    .split(splitOn)
    .map((part) => part.trim())
    .filter(Boolean)
}

function serializeChips(chips: string[], separator: string): string {
  return chips.join(separator)
}

export function EnumChipList({
  label,
  hint,
  value,
  onChange,
  options,
  separator = ', ',
  placeholder = 'Add…',
  uppercase = true,
}: EnumChipListProps) {
  const [query, setQuery] = useState('')
  const chips = parseChips(value, separator)

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    const available = options.filter(
      (opt) => !chips.some((c) => c.toLowerCase() === opt.toLowerCase()),
    )
    if (!q) return available.slice(0, 12)
    return available.filter((opt) => opt.toLowerCase().includes(q)).slice(0, 12)
  }, [chips, options, query])

  function normalize(raw: string): string {
    const trimmed = raw.trim()
    if (!trimmed) return ''
    return uppercase ? trimmed.toUpperCase().replace(/\s+/g, '_') : trimmed
  }

  function addChip(raw: string) {
    const next = normalize(raw)
    if (!next) return
    if (chips.some((c) => c.toLowerCase() === next.toLowerCase())) {
      setQuery('')
      return
    }
    onChange(serializeChips([...chips, next], separator))
    setQuery('')
  }

  function removeChip(index: number) {
    onChange(serializeChips(chips.filter((_, i) => i !== index), separator))
  }

  return (
    <div className="enum-chip-list">
      <div className="enum-chip-list-head">
        <span className="enum-chip-list-label">{label}</span>
        {hint ? <span className="field-hint">{hint}</span> : null}
      </div>
      <div className="enum-chip-rows">
        {chips.map((chip, index) => (
          <span key={`${chip}-${index}`} className="enum-chip">
            {chip}
            <RemoveButton size="sm" aria-label={`Remove ${chip}`} onClick={() => removeChip(index)} />
          </span>
        ))}
      </div>
      <div className="enum-chip-add">
        <input
          value={query}
          placeholder={placeholder}
          aria-label={`Add ${label}`}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addChip(query || suggestions[0] || '')
            }
          }}
        />
        <button type="button" className="secondary" disabled={!query.trim() && !suggestions[0]} onClick={() => addChip(query || suggestions[0] || '')}>
          Add
        </button>
      </div>
      {query.trim() && suggestions.length > 0 ? (
        <div className="enum-chip-suggestions" role="listbox">
          {suggestions.map((opt) => (
            <button key={opt} type="button" role="option" onClick={() => addChip(opt)}>
              {opt}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
