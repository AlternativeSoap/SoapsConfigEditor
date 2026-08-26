import { useMemo, useState } from 'react'
import {
  CONDITIONS,
  toBlockConditionSnippet,
  type ConditionEntry,
} from '../data/mythicmobs/conditions'
import { RemoveButton } from './RemoveButton'
import { Switch } from './Switch'

interface ConditionBlockListProps {
  label?: string
  hint?: string
  value: string
  onChange: (next: string) => void
  conditions?: readonly ConditionEntry[]
}

function parseLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function linePass(line: string): boolean {
  return !/\bfalse\s*$/i.test(line)
}

function withPass(line: string, pass: boolean): string {
  const body = line.replace(/\s+(true|false)\s*$/i, '').trim()
  if (!body) return ''
  return `${body} ${pass ? 'true' : 'false'}`
}

export function ConditionBlockList({
  label = 'Conditions',
  hint = 'Pick a condition, then adjust attributes if needed',
  value,
  onChange,
  conditions = CONDITIONS,
}: ConditionBlockListProps) {
  const [query, setQuery] = useState('')
  const lines = parseLines(value)

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = !q
      ? conditions
      : conditions.filter(
          (c) =>
            c.id.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q),
        )
    return list.slice(0, 12)
  }, [conditions, query])

  function commit(next: string[]) {
    onChange(next.join('\n'))
  }

  function addCondition(entry: ConditionEntry) {
    const snippet = toBlockConditionSnippet(entry.insertSnippet)
    if (!snippet) return
    commit([...lines, snippet])
    setQuery('')
  }

  function updateLine(index: number, nextLine: string) {
    commit(lines.map((line, i) => (i === index ? nextLine : line)))
  }

  function removeLine(index: number) {
    commit(lines.filter((_, i) => i !== index))
  }

  return (
    <div className="condition-block-list">
      <div className="condition-block-list-head">
        <span className="condition-block-list-label">{label}</span>
        {hint ? <span className="field-hint">{hint}</span> : null}
      </div>
      <div className="condition-block-rows">
        {lines.map((line, index) => (
          <div key={`${line}-${index}`} className="condition-block-row">
            <input
              value={line.replace(/\s+(true|false)\s*$/i, '').trim()}
              aria-label={`Condition ${index + 1}`}
              onChange={(e) => updateLine(index, withPass(e.target.value, linePass(line)))}
            />
            <div className="condition-block-pass">
              <span className="field-hint">{linePass(line) ? 'true' : 'false'}</span>
              <Switch
                checked={linePass(line)}
                onChange={(pass) => updateLine(index, withPass(line, pass))}
                aria-label={`Condition ${index + 1} result`}
                size="sm"
              />
            </div>
            <RemoveButton
              aria-label={`Remove condition ${index + 1}`}
              onClick={() => removeLine(index)}
            />
          </div>
        ))}
      </div>
      <div className="condition-block-add">
        <input
          value={query}
          placeholder="Search conditions…"
          aria-label="Search conditions"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && suggestions[0]) {
              e.preventDefault()
              addCondition(suggestions[0])
            }
          }}
        />
      </div>
      {query.trim() && suggestions.length > 0 ? (
        <div className="condition-block-suggestions" role="listbox">
          {suggestions.map((c) => (
            <button
              key={c.id}
              type="button"
              role="option"
              onClick={() => addCondition(c)}
            >
              <strong>{c.id}</strong>
              <span>{c.description}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
