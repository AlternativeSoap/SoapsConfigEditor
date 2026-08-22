import { load } from 'js-yaml'
import type { ParseResult } from '../../types'

export function parseYaml(content: string): ParseResult {
  try {
    const parsed = load(content)
    return { data: parsed, issues: [] }
  } catch (error) {
    const issue = {
      message: 'Unknown YAML parse error',
      line: undefined as number | undefined,
      column: undefined as number | undefined,
    }

    if (error instanceof Error) {
      issue.message = error.message
      const maybeMarked = error as Error & {
        mark?: { line?: number; column?: number }
      }
      if (maybeMarked.mark?.line !== undefined) {
        issue.line = maybeMarked.mark.line + 1
      }
      if (maybeMarked.mark?.column !== undefined) {
        issue.column = maybeMarked.mark.column + 1
      }
    }

    return { data: null, issues: [issue] }
  }
}

export function extractTopLevelIds(data: unknown): string[] {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return []
  }
  return Object.keys(data as Record<string, unknown>)
}
