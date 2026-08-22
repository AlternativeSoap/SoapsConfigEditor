export interface LegacyColor {
  code: string
  hex: string
  name: string
}

export const LEGACY_COLORS: LegacyColor[] = [
  { code: '&0', hex: '#000000', name: 'Black' },
  { code: '&1', hex: '#0000AA', name: 'Dark blue' },
  { code: '&2', hex: '#00AA00', name: 'Dark green' },
  { code: '&3', hex: '#00AAAA', name: 'Dark aqua' },
  { code: '&4', hex: '#AA0000', name: 'Dark red' },
  { code: '&5', hex: '#AA00AA', name: 'Dark purple' },
  { code: '&6', hex: '#FFAA00', name: 'Gold' },
  { code: '&7', hex: '#AAAAAA', name: 'Gray' },
  { code: '&8', hex: '#555555', name: 'Dark gray' },
  { code: '&9', hex: '#5555FF', name: 'Blue' },
  { code: '&a', hex: '#55FF55', name: 'Green' },
  { code: '&b', hex: '#55FFFF', name: 'Aqua' },
  { code: '&c', hex: '#FF5555', name: 'Red' },
  { code: '&d', hex: '#FF55FF', name: 'Light purple' },
  { code: '&e', hex: '#FFFF55', name: 'Yellow' },
  { code: '&f', hex: '#FFFFFF', name: 'White' },
]

export const FORMAT_CODES: { code: string; name: string }[] = [
  { code: '&l', name: 'Bold' },
  { code: '&o', name: 'Italic' },
  { code: '&n', name: 'Underline' },
  { code: '&m', name: 'Strike' },
  { code: '&r', name: 'Reset' },
]

const LEGACY_HEX: Record<string, string> = Object.fromEntries(
  LEGACY_COLORS.map((color) => [color.code[1]?.toLowerCase() ?? '', color.hex]),
)

export interface TextSpan {
  text: string
  color: string
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
}

export function hexCode(hex: string): string {
  const clean = hex.replace('#', '').toUpperCase()
  return `&#${clean}`
}

export function insertAtSelection(
  value: string,
  start: number,
  end: number,
  insert: string,
): { next: string; cursor: number } {
  const from = Math.max(0, Math.min(start, value.length))
  const to = Math.max(0, Math.min(end, value.length))
  const selected = value.slice(from, to)
  const piece = selected ? `${insert}${selected}&r` : insert
  const next = `${value.slice(0, from)}${piece}${value.slice(to)}`
  return { next, cursor: from + piece.length }
}

export function parseMinecraftText(value: string): TextSpan[] {
  const spans: TextSpan[] = []
  let color = '#FFFFFF'
  let bold = false
  let italic = false
  let underline = false
  let strike = false
  let buffer = ''

  function flush(): void {
    if (!buffer) return
    spans.push({ text: buffer, color, bold, italic, underline, strike })
    buffer = ''
  }

  for (let i = 0; i < value.length; i += 1) {
    const two = value.slice(i, i + 2)
    if ((two === '&r' || two === '&R' || two === '§r' || two === '§R') && i + 1 < value.length) {
      flush()
      color = '#FFFFFF'
      bold = false
      italic = false
      underline = false
      strike = false
      i += 1
      continue
    }
    if ((value[i] === '&' || value[i] === '§') && value[i + 1] === '#' && /^[0-9A-Fa-f]{6}/.test(value.slice(i + 2, i + 8))) {
      flush()
      color = `#${value.slice(i + 2, i + 8).toUpperCase()}`
      i += 7
      continue
    }
    if (value[i] === '<' && value[i + 1] === '#' && /^[0-9A-Fa-f]{6}>/.test(value.slice(i + 2, i + 9))) {
      flush()
      color = `#${value.slice(i + 2, i + 8).toUpperCase()}`
      i += 8
      continue
    }
    if ((value[i] === '&' || value[i] === '§') && value[i + 1]) {
      const code = value[i + 1].toLowerCase()
      if (LEGACY_HEX[code]) {
        flush()
        color = LEGACY_HEX[code]
        i += 1
        continue
      }
      if (code === 'l') {
        flush()
        bold = true
        i += 1
        continue
      }
      if (code === 'o') {
        flush()
        italic = true
        i += 1
        continue
      }
      if (code === 'n') {
        flush()
        underline = true
        i += 1
        continue
      }
      if (code === 'm') {
        flush()
        strike = true
        i += 1
        continue
      }
      if (code === 'k') {
        i += 1
        continue
      }
    }
    buffer += value[i]
  }
  flush()
  return spans
}
