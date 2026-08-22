import { useRef, useState } from 'react'
import {
  FORMAT_CODES,
  hexCode,
  insertAtSelection,
  LEGACY_COLORS,
  parseMinecraftText,
} from '../core/minecraft/colorText'

interface ColorTextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  rows?: number
}

export function ColorTextField({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
}: ColorTextFieldProps) {
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const [hex, setHex] = useState('#55FFFF')

  function applyInsert(code: string): void {
    const field = fieldRef.current
    const start = field?.selectionStart ?? value.length
    const end = field?.selectionEnd ?? value.length
    const result = insertAtSelection(value, start, end, code)
    onChange(result.next)
    requestAnimationFrame(() => {
      field?.focus()
      field?.setSelectionRange(result.cursor, result.cursor)
    })
  }

  const preview = parseMinecraftText(value)
  const InputTag = multiline ? 'textarea' : 'input'

  return (
    <label className="wide color-field">
      {label}
      <div className="color-tools" role="toolbar" aria-label="Color codes">
        {LEGACY_COLORS.map((color) => (
          <button
            key={color.code}
            type="button"
            className="color-swatch"
            title={`${color.name} (${color.code})`}
            style={{ background: color.hex }}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyInsert(color.code)}
          />
        ))}
        <div className="hex-picker" title="Pick a hex color, then insert it">
          <input
            type="color"
            value={hex}
            onChange={(event) => setHex(event.target.value)}
            aria-label="Hex color"
          />
          <button
            type="button"
            className="format-chip"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyInsert(hexCode(hex))}
          >
            Hex {hex.toUpperCase()}
          </button>
        </div>
        {FORMAT_CODES.map((format) => (
          <button
            key={format.code}
            type="button"
            className="format-chip"
            title={`${format.name} (${format.code})`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyInsert(format.code)}
          >
            {format.name}
          </button>
        ))}
      </div>
      <InputTag
        ref={fieldRef as never}
        rows={multiline ? rows : undefined}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      <span className="color-preview" aria-label="Color preview">
        {preview.length === 0 ? (
          <span className="preview-empty">Preview</span>
        ) : (
          preview.map((span, index) => (
            <span
              key={`${span.text}-${index}`}
              style={{
                color: span.color,
                fontWeight: span.bold ? 700 : 400,
                fontStyle: span.italic ? 'italic' : 'normal',
                textDecoration: [
                  span.underline ? 'underline' : '',
                  span.strike ? 'line-through' : '',
                ]
                  .filter(Boolean)
                  .join(' ') || undefined,
              }}
            >
              {span.text}
            </span>
          ))
        )}
      </span>
    </label>
  )
}
