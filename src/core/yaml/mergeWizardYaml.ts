import { yamlHasTopLevelKey } from '../mythicrpg/generators'
import type { FileRecord } from '../../types'

export type WizardYamlWrite =
  | { path: string; content: string; mode: 'create' | 'append' }
  | { error: string }

/**
 * Merge a new top-level YAML entry into an existing file, or create the file.
 * Fails loudly if the top-level key already exists.
 */
export function mergeWizardYaml(
  files: FileRecord[],
  path: string,
  yaml: string,
  header?: string,
): WizardYamlWrite {
  const existing = files.find((f) => f.path.replace(/\\/g, '/') === path)
  const key = yaml.split('\n')[0]?.replace(/:$/, '') ?? ''
  if (existing && key && yamlHasTopLevelKey(existing.content, key)) {
    return {
      error: `${key} already exists in ${path}. Pick another id or edit the existing entry.`,
    }
  }
  if (!existing) {
    const prefix = header?.trimEnd() ?? ''
    return {
      path,
      content: prefix ? `${prefix}\n${yaml}` : yaml,
      mode: 'create',
    }
  }
  const base = existing.content.trimEnd()
  return { path, content: base ? `${base}\n\n${yaml}` : yaml, mode: 'create' }
}
