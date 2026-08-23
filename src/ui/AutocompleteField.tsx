import { useEffect, useId, useMemo, useRef, useState } from 'react'

interface AutocompleteFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  search: (query: string, limit?: number) => string[]
  placeholder?: string
  /** Uppercase values on change (Bukkit enum style). */
  uppercase?: boolean
  limit?: number
}

export function AutocompleteField({
  label,
  value,
  onChange,
  search,
  placeholder,
  uppercase = true,
  limit = 12,
}: AutocompleteFieldProps) {
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const suggestions = useMemo(() => search(value, limit), [search, value, limit])

  useEffect(() => {
    setHighlight(0)
  }, [value, suggestions.length])

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  function normalize(next: string): string {
    const trimmed = next.trim()
    return uppercase ? trimmed.toUpperCase().replace(/\s+/g, '_') : trimmed
  }

  function pick(option: string): void {
    onChange(normalize(option))
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }
    if (!open || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter' && suggestions[highlight]) {
      e.preventDefault()
      pick(suggestions[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && value.trim().length > 0 && suggestions.length > 0

  return (
    <label className="wz-field autocomplete-field">
      {label}
      <div className="autocomplete-wrap" ref={wrapRef}>
        <input
          value={value}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-controls={showList ? listId : undefined}
          aria-expanded={showList}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(normalize(e.target.value))
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
        {showList ? (
          <ul className="autocomplete-list" id={listId} role="listbox">
            {suggestions.map((option, i) => (
              <li key={option}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === highlight}
                  className={i === highlight ? 'active' : undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(option)}
                  onMouseEnter={() => setHighlight(i)}
                >
                  {option}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </label>
  )
}
