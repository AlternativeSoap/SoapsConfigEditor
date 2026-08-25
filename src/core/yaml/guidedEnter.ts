import type { MythicCategory } from '../../types'
import { bodyKeyIndentForCategory } from './bodyKeyCatalogs'

/** True when the line looks like a finished YAML key or entity header. */
export function isCompletedYamlKeyLine(text: string): boolean {
  const t = text.trimEnd()
  if (!t || t.trimStart().startsWith('#')) return false
  // Entity / section header: Name: or Name: value
  return /^[A-Za-z0-9_-]+:\s*(?:\S.*)?$/.test(t) || /^\s+[A-Za-z0-9_-]+:\s*(?:\S.*)?$/.test(t)
}

/**
 * Indent (spaces) for the next line after Enter on a completed key.
 * Bare section headers (`Options:`, `DisplayOptions:`) get child indent (+2 or map child).
 * Value lines and list entries stay at the same sibling indent.
 */
export function nextLineIndentAfterKey(
  previousLineText: string,
  fileCategory?: MythicCategory,
): number {
  const ind = previousLineText.match(/^(\s*)/)?.[1]?.length ?? 0
  const trimmed = previousLineText.trimEnd()

  // List item: stay at list indent
  if (/^\s*-\s+/.test(previousLineText)) return ind

  // Bare map/section header (no value after colon) → nest under it
  if (/^[A-Za-z0-9_-]+:\s*$/.test(trimmed) || /^\s+[A-Za-z0-9_-]+:\s*$/.test(trimmed)) {
    return ind + 2
  }

  // Value line or entity with trailing content: sibling indent
  // After top-level entity `MyMob:` (indent 0 bare) already handled above as +2.
  // After `  Type: ZOMBIE` stay at body indent.
  const bodyIndent = bodyKeyIndentForCategory(fileCategory)
  if (bodyIndent !== null && ind === 0 && /^[A-Za-z0-9_-]+:\s+\S/.test(trimmed)) {
    // Top-level key with value (unusual for mobs) — stay at 0
    return 0
  }
  return ind
}

/** Spaces string for the next guided line. */
export function nextLineIndentSpaces(
  previousLineText: string,
  fileCategory?: MythicCategory,
): string {
  return ' '.repeat(nextLineIndentAfterKey(previousLineText, fileCategory))
}
