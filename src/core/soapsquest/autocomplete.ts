import {
  autocompletion,
  completionKeymap,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete'
import { keymap } from '@codemirror/view'
import { searchMaterials } from '../../data/minecraft/materials'
import { completionScrollLoadMore } from '../mythicmobs/completionScrollLoad'

export interface SoapsQuestCatalog {
  tierIds: string[]
  difficultyIds: string[]
  questIds: string[]
}

function filterOptions(ids: string[], word: string, limit = 24): Completion[] {
  const q = word.toUpperCase()
  const starts: string[] = []
  const contains: string[] = []
  for (const id of ids) {
    const up = id.toUpperCase()
    if (!q) starts.push(id)
    else if (up.startsWith(q)) starts.push(id)
    else if (up.includes(q)) contains.push(id)
  }
  return [...starts, ...contains].slice(0, limit).map((label) => ({
    label,
    type: 'constant' as const,
  }))
}

function lineValueCompletion(
  context: CompletionContext,
  keyPattern: RegExp,
  options: Completion[],
): CompletionResult | null {
  const line = context.state.doc.lineAt(context.pos)
  const before = line.text.slice(0, context.pos - line.from)
  const match = keyPattern.exec(before)
  if (!match) return null
  const word = match[1] ?? ''
  const from = context.pos - word.length
  if (word.length === 0 && !context.explicit) return null
  return { from, options, validFor: /^[\w.-]*$/ }
}

function soapsQuestCompletion(catalog: SoapsQuestCatalog) {
  return (context: CompletionContext): CompletionResult | null => {
    const line = context.state.doc.lineAt(context.pos)
    const before = line.text.slice(0, context.pos - line.from)

    const tier = lineValueCompletion(
      context,
      /tier:\s*([\w.-]*)$/,
      filterOptions(catalog.tierIds, before.match(/tier:\s*([\w.-]*)$/)?.[1] ?? ''),
    )
    if (tier) return tier

    const difficulty = lineValueCompletion(
      context,
      /difficulty:\s*([\w.-]*)$/,
      filterOptions(
        catalog.difficultyIds,
        before.match(/difficulty:\s*([\w.-]*)$/)?.[1] ?? '',
      ),
    )
    if (difficulty) return difficulty

    const questRef = lineValueCompletion(
      context,
      /(?:quest-id|quest):\s*([\w.-]*)$/,
      filterOptions(catalog.questIds, before.match(/(?:quest-id|quest):\s*([\w.-]*)$/)?.[1] ?? ''),
    )
    if (questRef) return questRef

    const materialMatch = before.match(/material:\s*([\w.-]*)$/)
    if (materialMatch) {
      const word = materialMatch[1] ?? ''
      const from = context.pos - word.length
      if (word.length === 0 && !context.explicit) return null
      const mats = searchMaterials(word, 24).map((label) => ({
        label,
        type: 'constant' as const,
      }))
      if (mats.length === 0) return null
      return { from, options: mats, validFor: /^[\w.-]*$/ }
    }

    return null
  }
}

export function buildSoapsQuestAutocomplete(catalog: SoapsQuestCatalog) {
  return [
    autocompletion({
      override: [soapsQuestCompletion(catalog)],
      activateOnTyping: true,
    }),
    keymap.of(completionKeymap),
    completionScrollLoadMore(),
  ]
}
