import type { Completion } from '@codemirror/autocomplete'

export interface BodyKeyDef {
  key: string
  detail?: string
  apply?: string
}

/** Field completions with optional boost so earlier defs rank higher. */
export function fieldCompletions(defs: BodyKeyDef[], boostFromOrder = false): Completion[] {
  const n = defs.length
  return defs.map((f, i) => ({
    label: f.key,
    type: 'property' as const,
    detail: f.detail,
    apply: f.apply ?? `${f.key}: `,
    ...(boostFromOrder ? { boost: n - i } : {}),
  }))
}

export function scalarKey(key: string, detail?: string): BodyKeyDef {
  return { key, detail, apply: `${key}: ` }
}

/** String field that should start as an empty quoted value (Display, Title, …). */
export function quotedKey(key: string, detail?: string): BodyKeyDef {
  return { key, detail, apply: `${key}: ""` }
}

export function listKey(key: string, detail?: string): BodyKeyDef {
  return { key, detail, apply: `${key}: []` }
}

export function mapKey(key: string, detail?: string, childIndent = 2): BodyKeyDef {
  const pad = ' '.repeat(childIndent)
  return { key, detail, apply: `${key}:\n${pad}` }
}

export function boolKey(key: string, value: boolean, detail?: string): BodyKeyDef {
  return { key, detail, apply: `${key}: ${value}` }
}

export function defsToKeys(defs: BodyKeyDef[]): string[] {
  return defs.map((d) => d.key)
}
