import { dump } from 'js-yaml'
import { parseYaml } from '../yaml/parseYaml'
import type { TemplateHint } from './templateHints'
import {
  collectMobsFromFiles,
  deepEqualYaml,
  type MobBody,
  type YamlValue,
} from './templates'

export interface TemplateApplyOptions {
  hint: TemplateHint
  /** Keys the user chose to extract (subset of hint.keys). */
  selectedKeys: string[]
  /** Editable template id from the dialog. */
  templateId: string
  /** When true, append a new top-level template mob. */
  createTemplate: boolean
}

export interface TemplateApplyResult {
  /** path → full file content after patch */
  patches: Record<string, string>
  /** Human-readable summary for status banner */
  summary: string
}

function dumpMobEntry(id: string, body: MobBody): string {
  const doc = dump({ [id]: body }, {
    lineWidth: -1,
    noRefs: true,
  })
  return doc.trimEnd()
}

/** Replace or insert a top-level YAML entity block. Preserves surrounding entries when possible. */
export function upsertTopLevelYaml(content: string, id: string, body: MobBody): string {
  const entry = dumpMobEntry(id, body)
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const startRx = new RegExp(`^${escapeRegExp(id)}:\\s*(?:#.*)?$`)
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (startRx.test(lines[i]!)) {
      start = i
      break
    }
  }

  if (start === -1) {
    const trimmed = content.trimEnd()
    return trimmed ? `${trimmed}\n\n${entry}\n` : `${entry}\n`
  }

  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]!
    if (/^[A-Za-z0-9_][A-Za-z0-9_-]*:\s*(?:#.*)?$/.test(line)) {
      end = i
      break
    }
  }

  const before = lines.slice(0, start)
  const after = lines.slice(end)
  const next = [...before, ...entry.split('\n'), ...after]
  return `${next.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findKey(body: MobBody, name: string): string | undefined {
  if (Object.prototype.hasOwnProperty.call(body, name)) return name
  return Object.keys(body).find((k) => k.toLowerCase() === name.toLowerCase())
}

function slimChild(
  body: MobBody,
  templateId: string,
  selectedKeys: string[],
  sharedValues: Record<string, YamlValue>,
): MobBody {
  const out: MobBody = { ...body }
  // Set Template
  const existingTemplateKey = findKey(out, 'Template')
  if (existingTemplateKey && existingTemplateKey !== 'Template') delete out[existingTemplateKey]
  out.Template = templateId

  for (const key of selectedKeys) {
    const ck = findKey(out, key)
    if (!ck) continue
    if (deepEqualYaml(out[ck], sharedValues[key])) {
      delete out[ck]
    }
  }
  return out
}

function buildTemplateBody(
  selectedKeys: string[],
  sharedValues: Record<string, YamlValue>,
  seed?: MobBody,
): MobBody {
  const out: MobBody = {}
  if (seed) {
    // Keep Type if present on seed base (useful when promoting a mob)
    const typeKey = findKey(seed, 'Type')
    if (typeKey) out.Type = seed[typeKey]!
  }
  for (const key of selectedKeys) {
    if (sharedValues[key] !== undefined) out[key] = sharedValues[key]!
  }
  return out
}

/**
 * Build file patches for a confirmed template hint.
 * Does not write disk; caller merges into App dirty buffers.
 */
export function applyTemplateHint(
  files: { path: string; category?: string; content: string }[],
  options: TemplateApplyOptions,
): TemplateApplyResult {
  const { hint, selectedKeys, templateId, createTemplate } = options
  if (hint.kind === 'missing_template') {
    return { patches: {}, summary: 'Nothing to apply for a missing template reference.' }
  }
  if (!selectedKeys.length && hint.kind === 'extract_template' && createTemplate) {
    return { patches: {}, summary: 'Select at least one field to extract.' }
  }

  const { mobs, fileByMobId } = collectMobsFromFiles(files, parseYaml)
  const contentByPath = new Map<string, string>()
  for (const f of files) {
    contentByPath.set(f.path, f.content)
  }

  const sharedValues: Record<string, YamlValue> = {}
  for (const key of selectedKeys) {
    if (hint.sharedValues[key] !== undefined) {
      sharedValues[key] = hint.sharedValues[key]!
    }
  }

  // Resolve target file for new template: same file as first child when possible
  const primaryChild = hint.mobIds[0]
  const primaryPath = (primaryChild && fileByMobId[primaryChild]) || files.find((f) => f.category === 'mobs')?.path
  if (!primaryPath) {
    return { patches: {}, summary: 'No mob file found to write the template.' }
  }

  if (createTemplate) {
    const body = buildTemplateBody(selectedKeys, sharedValues)
    const current = contentByPath.get(primaryPath) ?? ''
    contentByPath.set(primaryPath, upsertTopLevelYaml(current, templateId, body))
  } else if (hint.kind === 'extract_template' && mobs[templateId]) {
    // Promoting an existing cluster mob: ensure selected keys remain on the base
    const base = { ...mobs[templateId]! }
    const body = buildTemplateBody(selectedKeys, sharedValues, base)
    // Merge identity fields back from original base
    for (const idKey of ['Type', 'Display', 'Health', 'Damage']) {
      const ck = findKey(base, idKey)
      if (ck && body[idKey] === undefined && body[ck] === undefined) {
        body[ck] = base[ck]!
      }
    }
    // Keep any non-selected keys from the base mob
    for (const [k, v] of Object.entries(base)) {
      if (k.toLowerCase() === 'template' || k.toLowerCase() === 'exclude') continue
      const selected = selectedKeys.some((s) => s.toLowerCase() === k.toLowerCase())
      if (!selected && findKey(body, k) === undefined) {
        body[k] = v
      }
    }
    const path = fileByMobId[templateId] ?? primaryPath
    const current = contentByPath.get(path) ?? ''
    contentByPath.set(path, upsertTopLevelYaml(current, templateId, body))
  }

  // Slim children
  for (const mobId of hint.mobIds) {
    if (!createTemplate && mobId === templateId) continue
    const body = mobs[mobId]
    if (!body) continue
    const path = fileByMobId[mobId]
    if (!path) continue
    // Re-read mob from patched content if same file was updated
    let currentBody = body
    const patchedContent = contentByPath.get(path)
    if (patchedContent) {
      const data = parseYaml(patchedContent).data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const entry = (data as Record<string, unknown>)[mobId]
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
          currentBody = entry as MobBody
        }
      }
    }
    const slimmed = slimChild(currentBody, templateId, selectedKeys, sharedValues)
    // use_existing: still add Template even if selectedKeys empty
    if (hint.kind === 'use_existing_template' && selectedKeys.length === 0) {
      const withTemplate = { ...currentBody }
      const tk = findKey(withTemplate, 'Template')
      if (tk && tk !== 'Template') delete withTemplate[tk]
      withTemplate.Template = templateId
      const current = contentByPath.get(path) ?? ''
      contentByPath.set(path, upsertTopLevelYaml(current, mobId, withTemplate))
      continue
    }
    const current = contentByPath.get(path) ?? ''
    contentByPath.set(path, upsertTopLevelYaml(current, mobId, slimmed))
  }

  const patches: Record<string, string> = {}
  for (const [path, content] of contentByPath) {
    const original = files.find((f) => f.path === path)?.content
    if (original !== undefined && original !== content) {
      patches[path] = content
    }
  }

  const childCount = hint.mobIds.filter((id) => createTemplate || id !== templateId).length
  const summary = createTemplate
    ? `Added template ${templateId} and updated ${childCount} mob(s). Save to keep the changes.`
    : `Set Template: ${templateId} on ${childCount} mob(s). Save to keep the changes.`

  return { patches, summary }
}

/** Preview YAML snippets for the dialog (before / after per mob). */
export function previewTemplateHint(
  files: { path: string; category?: string; content: string }[],
  options: TemplateApplyOptions,
): { id: string; before: string; after: string }[] {
  const { mobs } = collectMobsFromFiles(files, parseYaml)
  const { hint, selectedKeys, templateId, createTemplate } = options
  const rows: { id: string; before: string; after: string }[] = []

  if (createTemplate) {
    const body = buildTemplateBody(selectedKeys, Object.fromEntries(
      selectedKeys.map((k) => [k, hint.sharedValues[k]!]),
    ))
    rows.push({
      id: templateId,
      before: '(new)',
      after: dumpMobEntry(templateId, body),
    })
  }

  for (const mobId of hint.mobIds) {
    if (!createTemplate && mobId === templateId) continue
    const body = mobs[mobId]
    if (!body) continue
    const shared: Record<string, YamlValue> = {}
    for (const k of selectedKeys) {
      if (hint.sharedValues[k] !== undefined) shared[k] = hint.sharedValues[k]!
    }
    const afterBody =
      hint.kind === 'use_existing_template' && selectedKeys.length === 0
        ? (() => {
            const o = { ...body }
            const tk = findKey(o, 'Template')
            if (tk && tk !== 'Template') delete o[tk]
            o.Template = templateId
            return o
          })()
        : slimChild(body, templateId, selectedKeys, shared)
    rows.push({
      id: mobId,
      before: dumpMobEntry(mobId, body),
      after: dumpMobEntry(mobId, afterBody),
    })
  }
  return rows
}
