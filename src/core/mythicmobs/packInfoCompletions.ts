import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { MATERIALS } from './attrValueCompletions'
import {
  PACK_INFO_DESCRIPTION_SNIPPETS,
  PACK_INFO_ICON_FIELDS,
  PACK_INFO_ICON_MATERIALS,
  PACK_INFO_LEGACY_PACK_FIELDS,
  PACK_INFO_ROOT_FIELDS,
  type PackInfoFieldDef,
} from './packInfo'

function filterByPrefix(options: Completion[], typed: string): Completion[] {
  if (!typed) return options
  const lower = typed.toLowerCase()
  return options.filter((o) => o.label.toLowerCase().startsWith(lower))
}

function completionResult(from: number, options: Completion[], validFor: RegExp): CompletionResult | null {
  if (options.length === 0) return null
  return { from, options, validFor }
}

function fieldCompletions(fields: PackInfoFieldDef[]): Completion[] {
  return fields.map((f) => ({
    label: f.key,
    type: 'property' as const,
    detail: f.detail,
    apply: f.apply ?? `${f.key}: `,
  }))
}

function findAncestorYamlKey(
  doc: { line: (n: number) => { text: string } },
  lineNumber: number,
  lineIndent: number,
): string | null {
  for (let i = lineNumber - 1; i >= 1; i--) {
    const text = doc.line(i).text
    const ind = text.match(/^(\s*)/)?.[1]?.length ?? 0
    if (ind >= lineIndent) continue
    const keyMatch = /^\s*([A-Za-z][A-Za-z0-9_]*):\s*(.*)?$/.exec(text)
    if (keyMatch?.[1]) return keyMatch[1]
  }
  return null
}

function isDescriptionListLine(
  doc: { line: (n: number) => { text: string } },
  lineNumber: number,
): boolean {
  for (let i = lineNumber; i >= 1; i--) {
    const text = doc.line(i).text
    if (/^Description:\s*(?:#.*)?$/.test(text)) return true
    if (/^[A-Za-z][A-Za-z0-9_]*:\s*(?:#.*)?$/.test(text)) return false
  }
  return false
}

function collectRootKeys(
  doc: { line: (n: number) => { text: string }; lines: number },
  lineNumber: number,
): Set<string> {
  const present = new Set<string>()
  for (let i = 1; i <= doc.lines; i++) {
    if (i === lineNumber) continue
    const m = /^([A-Za-z][A-Za-z0-9_]*):/.exec(doc.line(i).text)
    if (m?.[1]) present.add(m[1])
  }
  return present
}

export function packInfoCompletions(context: CompletionContext): CompletionResult | null {
  const line = context.state.doc.lineAt(context.pos)
  const before = line.text.slice(0, context.pos - line.from)
  const lineIndent = before.match(/^(\s*)/)?.[1]?.length ?? 0
  const parent = findAncestorYamlKey(context.state.doc, line.number, lineIndent)

  // Root keys (wiki format) — typing a key name
  const rootKeyMatch = /^([A-Za-z][A-Za-z0-9_]*)$/.exec(before)
  if (rootKeyMatch && lineIndent === 0) {
    const typed = rootKeyMatch[1] ?? ''
    const present = collectRootKeys(context.state.doc, line.number)
    const options = fieldCompletions(
      PACK_INFO_ROOT_FIELDS.filter((f) => !present.has(f.key) || f.key.toLowerCase().startsWith(typed.toLowerCase())),
    )
    return completionResult(context.pos - typed.length, filterByPrefix(options, typed), /^[A-Za-z][A-Za-z0-9_]*$/)
  }

  // Root keys on a blank line (Ctrl+Space)
  if (lineIndent === 0 && before.trim() === '' && context.explicit) {
    const present = collectRootKeys(context.state.doc, line.number)
    const options = fieldCompletions(PACK_INFO_ROOT_FIELDS.filter((f) => !present.has(f.key)))
    if (options.length > 0) {
      return completionResult(context.pos, options, /.*/)
    }
  }

  // Keys under Icon:
  const nestedKeyMatch = /^\s{2}([A-Za-z][A-Za-z0-9_]*)$/.exec(before)
  if (nestedKeyMatch && parent === 'Icon') {
    const typed = nestedKeyMatch[1] ?? ''
    const options = fieldCompletions(PACK_INFO_ICON_FIELDS)
    return completionResult(context.pos - typed.length, filterByPrefix(options, typed), /^[A-Za-z][A-Za-z0-9_]*$/)
  }

  // Legacy Pack: nested keys
  if (nestedKeyMatch && parent === 'Pack') {
    const typed = nestedKeyMatch[1] ?? ''
    const options = fieldCompletions(PACK_INFO_LEGACY_PACK_FIELDS)
    return completionResult(context.pos - typed.length, filterByPrefix(options, typed), /^[A-Za-z][A-Za-z0-9_]*$/)
  }

  // Icon material values
  const materialMatch = /^\s{2}Material:\s+([A-Za-z0-9_]*)$/.exec(before)
  if (materialMatch && parent === 'Icon') {
    const typed = materialMatch[1] ?? ''
    const pool = typed.length >= 2 ? MATERIALS : PACK_INFO_ICON_MATERIALS
    const options: Completion[] = pool
      .filter((m) => !typed || m.toLowerCase().startsWith(typed.toLowerCase()))
      .slice(0, 80)
      .map((m) => ({ label: m, type: 'enum' as const, detail: 'Bukkit material' }))
    return completionResult(context.pos - typed.length, options, /^[A-Za-z0-9_]*$/)
  }

  // Version presets
  const versionMatch = /^Version:\s+([0-9.]*)$/.exec(before)
  if (versionMatch) {
    const typed = versionMatch[1] ?? ''
    const presets = ['1.0.0', '0.1.0', '0.2.0', '1.1.0']
    const options: Completion[] = presets
      .filter((v) => !typed || v.startsWith(typed))
      .map((v) => ({ label: v, type: 'constant' as const }))
    return completionResult(context.pos - typed.length, options, /^[0-9.]*$/)
  }

  // Description list lines
  const descLineMatch = /^-\s*(.*)$/.exec(before)
  if (descLineMatch && isDescriptionListLine(context.state.doc, line.number)) {
    const typed = descLineMatch[1] ?? ''
    const options: Completion[] = PACK_INFO_DESCRIPTION_SNIPPETS.map((snippet) => ({
      label: snippet,
      type: 'text' as const,
      apply: `'${snippet.replace(/'/g, "''")}'`,
    }))
    return completionResult(context.pos - typed.length, options, /.*/)
  }

  // URL placeholder
  const urlMatch = /^URL:\s*(.*)$/.exec(before)
  if (urlMatch && lineIndent === 0) {
    const typed = urlMatch[1] ?? ''
    const options: Completion[] = [
      { label: "''", type: 'constant' as const, detail: 'No link' },
      { label: "'https://example.com'", type: 'text' as const, detail: 'Your site or docs' },
    ]
    return completionResult(context.pos - typed.length, options, /.*/)
  }

  return null
}
