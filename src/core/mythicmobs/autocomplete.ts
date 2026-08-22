import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  autocompletion,
  completionKeymap,
} from '@codemirror/autocomplete'
import { keymap } from '@codemirror/view'
import { CONDITIONS, toBlockConditionSnippet, toInlineConditionSnippet } from '../../data/mythicmobs/conditions'
import { MECHANICS } from '../../data/mythicmobs/mechanics'
import { TARGETERS } from '../../data/mythicmobs/targeters'
import { TRIGGERS } from '../../data/mythicmobs/triggers'
import type { AcPrefs, MythicCategory } from '../../types'
import {
  buildBraceAttrValueCompletions,
  ENTITY_TYPES,
  MATERIALS,
  PLACEHOLDERS,
  RANDOMSPAWN_ACTIONS,
  TIMER_TICK_PRESETS,
} from './attrValueCompletions'
import {
  attrInsertPrefix,
  attrSnippet,
  attrsFromInsertSnippet,
  findMechanic,
  getMechanicAttrs,
  parseAttrNames,
} from './skillLineAttrs'
import type { MechanicAttr } from '../../data/mythicmobs/mechanics'
import {
  bodyKeysForCategory,
  detectYamlEditContext,
  DROP_BUILTINS,
  EQUIPMENT_SLOTS,
  isConditionsListParent,
  isSkillsListParent,
} from './yamlEditContext'
import { completionScrollLoadMore } from './completionScrollLoad'

function packCompletions(ids: string[], detail: string): Completion[] {
  return ids.map((id) => ({ label: id, type: 'class' as const, detail }))
}

function filterByPrefix(options: Completion[], typed: string): Completion[] {
  if (!typed) return options
  const lower = typed.toLowerCase()
  return options.filter((o) => o.label.toLowerCase().startsWith(lower))
}

function completionResult(from: number, options: Completion[], validFor: RegExp): CompletionResult | null {
  if (options.length === 0) return null
  return { from, options, validFor }
}

// Mechanics + aliases
const mechanicCompletions: Completion[] = []
for (const m of MECHANICS) {
  mechanicCompletions.push({
    label: m.id,
    detail: m.description,
    info: m.insertSnippet,
    apply: m.insertSnippet,
    type: 'function',
    boost: 1,
  })
  for (const alias of m.aliases) {
    mechanicCompletions.push({
      label: alias,
      detail: m.id,
      info: m.insertSnippet,
      apply: m.insertSnippet,
      type: 'function',
    })
  }
}

// Targeters + shorthands
const targeterCompletions: Completion[] = []
const targeterShorthandSeen = new Set<string>()
for (const t of TARGETERS) {
  targeterCompletions.push({
    label: `@${t.id}`,
    detail: t.description,
    info: t.insertSnippet,
    apply: t.insertSnippet,
    type: 'keyword',
  })
  for (const sh of t.shorthand) {
    const label = sh.startsWith('@') ? sh : `@${sh}`
    if (targeterShorthandSeen.has(label.toLowerCase())) continue
    targeterShorthandSeen.add(label.toLowerCase())
    targeterCompletions.push({
      label,
      detail: `@${t.id}`,
      info: t.insertSnippet,
      apply: t.insertSnippet,
      type: 'keyword',
    })
  }
}

const triggerCompletions: Completion[] = TRIGGERS.map((t) => ({
  label: `~${t.id}`,
  detail: t.description,
  info: t.insertSnippet,
  apply: t.insertSnippet,
  type: 'constant',
}))

const conditionBlockCompletions: Completion[] = CONDITIONS.map((c) => ({
  label: c.id,
  detail: c.description,
  info: c.insertSnippet,
  apply: toBlockConditionSnippet(c.insertSnippet),
  type: 'variable',
}))

const conditionInlineCompletions: Completion[] = CONDITIONS.map((c) => ({
  label: c.id,
  detail: c.description,
  info: toInlineConditionSnippet(c.insertSnippet),
  apply: toInlineConditionSnippet(c.insertSnippet),
  type: 'variable',
}))

const entityTypeCompletions: Completion[] = ENTITY_TYPES.map((e) => ({
  label: e,
  type: 'enum',
}))

function buildBraceAttrCompletions(
  inside: string,
  attrs: MechanicAttr[],
  context: CompletionContext,
): CompletionResult | null {
  const existing = parseAttrNames(inside)
  const partialMatch = /(?:^|;)\s*([A-Za-z0-9_]*)$/.exec(inside)
  const typed = partialMatch?.[1] ?? ''
  const from = context.pos - typed.length

  const options: Completion[] = attrs
    .filter((a) => !existing.has(a.name.toLowerCase()))
    .filter((a) => !typed || a.name.toLowerCase().startsWith(typed.toLowerCase()))
    .map((a) => ({
      label: a.name,
      detail: a.desc || a.type,
      type: 'property' as const,
      apply:
        typed.length > 0
          ? attrSnippet(a)
          : `${attrInsertPrefix(inside)}${attrSnippet(a)}`,
    }))

  return completionResult(from, options, /^[A-Za-z0-9_=;\s]*$/)
}

function braceAttrCompletion(
  context: CompletionContext,
  packSkillIds: string[],
  packMobIds: string[],
  packItemIds: string[],
  packDroptableIds: string[],
): CompletionResult | null {
  const line = context.state.doc.lineAt(context.pos)
  const before = line.text.slice(0, context.pos - line.from)

  const tryBlock = (
    inside: string,
    attrs: MechanicAttr[],
    blockId: string,
  ): CompletionResult | null => {
    const valueResult = buildBraceAttrValueCompletions(
      inside,
      attrs,
      blockId,
      context,
      packSkillIds,
      packMobIds,
      packItemIds,
      packDroptableIds,
    )
    if (valueResult) return valueResult
    return buildBraceAttrCompletions(inside, attrs, context)
  }

  const mechMatch = /^\s+-\s+([A-Za-z][A-Za-z0-9_]*)\{([^}]*)$/.exec(before)
  if (mechMatch) {
    const mechanic = findMechanic(mechMatch[1] ?? '')
    if (mechanic) {
      const result = tryBlock(mechMatch[2] ?? '', getMechanicAttrs(mechanic), mechanic.id)
      if (result) return result
    }
  }

  const targeterMatch = /@([A-Za-z][A-Za-z0-9_]*)\{([^}]*)$/.exec(before)
  if (targeterMatch) {
    const targeter = TARGETERS.find((t) => t.id.toLowerCase() === (targeterMatch[1] ?? '').toLowerCase())
    if (targeter) {
      const attrs = attrsFromInsertSnippet(targeter.insertSnippet)
      if (attrs.length) {
        const result = tryBlock(targeterMatch[2] ?? '', attrs, targeter.id)
        if (result) return result
      }
    }
  }

  const condMatch = /\?([A-Za-z][A-Za-z0-9_]*)\{([^}]*)$/.exec(before)
  if (condMatch) {
    const condition = CONDITIONS.find((c) => c.id.toLowerCase() === (condMatch[1] ?? '').toLowerCase())
    if (condition) {
      const attrs = attrsFromInsertSnippet(condition.insertSnippet)
      if (attrs.length) {
        const result = tryBlock(condMatch[2] ?? '', attrs, condition.id)
        if (result) return result
      }
    }
  }

  return null
}

function packIdCompletions(
  context: CompletionContext,
  before: string,
  packSkillIds: string[],
  packMobIds: string[],
  packItemIds: string[],
  packDroptableIds: string[],
): CompletionResult | null {
  const skillAttrMatch = /(?:^|;)s(?:kills)?=([A-Za-z0-9_,]*)$/.exec(before)
  if (skillAttrMatch) {
    let typed = skillAttrMatch[1] ?? ''
    if (typed.includes(',')) typed = typed.split(',').pop()?.trim() ?? typed
    return completionResult(
      context.pos - typed.length,
      filterByPrefix(packCompletions(packSkillIds, 'skill'), typed),
      /^[A-Za-z0-9_,]*$/,
    )
  }

  const skillMechanicMatch = /skill\{[^}]*s(?:kills)?=([A-Za-z0-9_]*)$/.exec(before)
  if (skillMechanicMatch) {
    const typed = skillMechanicMatch[1] ?? ''
    return completionResult(
      context.pos - typed.length,
      filterByPrefix(packCompletions(packSkillIds, 'skill'), typed),
      /^[A-Za-z0-9_]*$/,
    )
  }

  const tableMatch = /(?:^|;)table=([A-Za-z0-9_]*)$/.exec(before)
  if (tableMatch) {
    const typed = tableMatch[1] ?? ''
    return completionResult(
      context.pos - typed.length,
      filterByPrefix(packCompletions(packDroptableIds, 'droptable'), typed),
      /^[A-Za-z0-9_]*$/,
    )
  }

  const typeMobMatch = /(?:^|;)type=([A-Za-z0-9_]*)$/.exec(before)
  if (typeMobMatch && /(?:summon|mount|mythicmobtype|mobsinradius)/i.test(before)) {
    const typed = typeMobMatch[1] ?? ''
    const opts = [
      ...entityTypeCompletions,
      ...packCompletions(packMobIds, 'pack mob'),
    ]
    return completionResult(context.pos - typed.length, filterByPrefix(opts, typed), /^[A-Za-z0-9_]*$/)
  }

  return null
}

function yamlStructureCompletions(
  context: CompletionContext,
  before: string,
  fileCategory: MythicCategory | undefined,
  packSkillIds: string[],
  packMobIds: string[],
  packItemIds: string[],
  packDroptableIds: string[],
): CompletionResult | null {
  const yamlCtx = detectYamlEditContext(context.state.doc, context.state.doc.lineAt(context.pos).number, fileCategory)

  // Entity body keys (2-space indent under mob/skill/item root)
  const bodyKeyMatch = /^\s{2}([A-Za-z][A-Za-z0-9_]*)$/.exec(before)
  if (bodyKeyMatch && yamlCtx.lineIndent === 2) {
    const typed = bodyKeyMatch[1] ?? ''
    const keys = bodyKeysForCategory(fileCategory)
    if (keys.length) {
      const options: Completion[] = keys.map((k) => ({ label: k, type: 'keyword' }))
      return completionResult(context.pos - typed.length, filterByPrefix(options, typed), /^[A-Za-z][A-Za-z0-9_]*$/)
    }
  }

  // Equipment slot values
  const equipMatch = new RegExp(`^\\s{4}(${EQUIPMENT_SLOTS.join('|')}):\\s*([A-Za-z0-9_]*)$`).exec(before)
  if (equipMatch && yamlCtx.parentKey === 'Equipment') {
    const typed = equipMatch[2] ?? ''
    const opts = [...packCompletions(packItemIds, 'pack item')]
    return completionResult(context.pos - typed.length, filterByPrefix(opts, typed), /^[A-Za-z0-9_]*$/)
  }

  // Drops list entries
  const dropMatch = /^\s+-\s+([A-Za-z0-9_]*)$/.exec(before)
  if (dropMatch && yamlCtx.parentKey === 'Drops') {
    const typed = dropMatch[1] ?? ''
    const builtins: Completion[] = DROP_BUILTINS.map((b) => ({ label: b, type: 'keyword' }))
    const opts = [
      ...filterByPrefix(builtins, typed),
      ...filterByPrefix(packCompletions(packItemIds, 'pack item'), typed),
      ...filterByPrefix(packCompletions(packDroptableIds, 'droptable'), typed),
    ]
    return completionResult(context.pos - typed.length, opts, /^[A-Za-z0-9_]*$/)
  }

  // Mob Skills list: metaskill IDs; lowercase typing also offers inline mechanics
  const listMatch = /^\s+-\s+([A-Za-z0-9_]*)$/.exec(before)
  if (listMatch && isSkillsListParent(yamlCtx.parentKey) && fileCategory === 'mobs') {
    const typed = listMatch[1] ?? ''
    const skillOpts = filterByPrefix(packCompletions(packSkillIds, 'skill'), typed)
    const looksLikeMechanic = typed.length > 0 && typed === typed.toLowerCase()
    if (looksLikeMechanic && prefs.mechanics) {
      const mechOpts = filterByPrefix(mechanicCompletions, typed)
      return completionResult(
        context.pos - typed.length,
        [...mechOpts, ...skillOpts],
        /^[A-Za-z0-9_]*$/,
      )
    }
    return completionResult(context.pos - typed.length, skillOpts, /^[A-Za-z0-9_]*$/)
  }

  // Skill file Conditions block
  if (listMatch && isConditionsListParent(yamlCtx.parentKey) && fileCategory === 'skills') {
    const typed = listMatch[1] ?? ''
    return completionResult(
      context.pos - typed.length,
      filterByPrefix(conditionBlockCompletions, typed),
      /^[A-Za-z]*$/,
    )
  }

  // Item Id: material
  const itemIdMatch = /^\s+Id:\s+([A-Za-z0-9_]*)$/.exec(before)
  if (itemIdMatch && fileCategory === 'items') {
    const typed = itemIdMatch[1] ?? ''
    const opts: Completion[] = MATERIALS.map((m) => ({ label: m, type: 'enum' }))
    return completionResult(context.pos - typed.length, filterByPrefix(opts, typed), /^[A-Za-z0-9_]*$/)
  }

  // Random spawn Action / Type
  const actionMatch = /^\s+Action:\s+([A-Za-z_]*)$/.exec(before)
  if (actionMatch && fileCategory === 'randomspawns') {
    const typed = actionMatch[1] ?? ''
    const opts: Completion[] = RANDOMSPAWN_ACTIONS.map((a) => ({ label: a, type: 'enum' }))
    return completionResult(context.pos - typed.length, filterByPrefix(opts, typed), /^[A-Za-z_]*$/)
  }

  const rsTypeMatch = /^\s+Type:\s+([A-Za-z0-9_]*)$/.exec(before)
  if (rsTypeMatch && fileCategory === 'randomspawns') {
    const typed = rsTypeMatch[1] ?? ''
    const opts = [...entityTypeCompletions, ...packCompletions(packMobIds, 'pack mob')]
    return completionResult(context.pos - typed.length, filterByPrefix(opts, typed), /^[A-Za-z0-9_]*$/)
  }

  return null
}

function mythicCompletion(
  packMobIds: string[],
  packItemIds: string[],
  packSkillIds: string[],
  packDroptableIds: string[],
  prefs: AcPrefs,
  fileCategory?: MythicCategory,
) {
  return function(context: CompletionContext): CompletionResult | null {
    const line = context.state.doc.lineAt(context.pos)
    const lineText = line.text
    const cursorCol = context.pos - line.from
    const before = lineText.slice(0, cursorCol)

    const braceResult = braceAttrCompletion(
      context,
      packSkillIds,
      packMobIds,
      packItemIds,
      packDroptableIds,
    )
    if (braceResult) return braceResult

    if (prefs.packIds) {
      const packResult = packIdCompletions(
        context,
        before,
        packSkillIds,
        packMobIds,
        packItemIds,
        packDroptableIds,
      )
      if (packResult) return packResult
    }

    const yamlResult = yamlStructureCompletions(
      context,
      before,
      fileCategory,
      packSkillIds,
      packMobIds,
      packItemIds,
      packDroptableIds,
    )
    if (yamlResult) return yamlResult

    // Placeholders inside quoted strings
    const placeholderMatch = /<([A-Za-z.]*)$/.exec(before)
    if (placeholderMatch) {
      const typed = placeholderMatch[1] ?? ''
      const from = context.pos - typed.length - 1
      const filtered = PLACEHOLDERS.filter((p) => {
        const inner = p.slice(1, -1)
        return !typed || inner.toLowerCase().startsWith(typed.toLowerCase())
      })
      const opts: Completion[] = filtered.map((p) => ({ label: p, type: 'text' as const }))
      return completionResult(from, opts, /^[<A-Za-z.>]*$/)
    }

    // @targeter
    if (prefs.targeters) {
      const atMatch = /@([A-Za-z]*)$/.exec(before)
      if (atMatch) {
        const typed = atMatch[1] ?? ''
        return completionResult(
          context.pos - typed.length - 1,
          filterByPrefix(targeterCompletions, `@${typed}`),
          /^@[A-Za-z]*$/,
        )
      }
    }

    // ~trigger with timer interval
    if (prefs.triggers) {
      const timerMatch = /~onTimer:([0-9]*)$/.exec(before)
      if (timerMatch) {
        const typed = timerMatch[1] ?? ''
        const opts: Completion[] = TIMER_TICK_PRESETS.map((t) => ({ label: t, type: 'number' }))
        return completionResult(context.pos - typed.length, filterByPrefix(opts, typed), /^[0-9]*$/)
      }

      const tildeMatch = /~([A-Za-z]*)$/.exec(before)
      if (tildeMatch) {
        const typed = tildeMatch[1] ?? ''
        return completionResult(
          context.pos - typed.length - 1,
          filterByPrefix(triggerCompletions, `~${typed}`),
          /^~[A-Za-z]*$/,
        )
      }
    }

    // Negated / inline conditions on skill lines
    if (prefs.conditions) {
      const inlineCondMatch = /\?([A-Za-z]*)$/.exec(before)
      if (inlineCondMatch) {
        const typed = inlineCondMatch[1] ?? ''
        const opts = conditionInlineCompletions.filter(
          (c) => !typed || c.label.toLowerCase().startsWith(typed.toLowerCase()),
        )
        return completionResult(context.pos - typed.length - 1, opts, /^\?[A-Za-z]*$/)
      }

      const negMatch = /!([A-Za-z]*)$/.exec(before)
      if (negMatch) {
        const typed = negMatch[1] ?? ''
        const opts = conditionInlineCompletions.map((c) => ({
          ...c,
          apply: `!${c.label}`,
          label: `!${c.label}`,
        }))
        return completionResult(context.pos - typed.length - 1, filterByPrefix(opts, `!${typed}`), /^![A-Za-z]*$/)
      }
    }

    // Mob Type: (mob files only)
    if (prefs.packIds && (fileCategory === 'mobs' || fileCategory === undefined)) {
      const typeKeyMatch = /^\s*Type:\s+([A-Za-z0-9_]*)$/.exec(before)
      if (typeKeyMatch) {
        const typed = typeKeyMatch[1] ?? ''
        const opts = [...entityTypeCompletions, ...packCompletions(packMobIds, 'pack mob')]
        return completionResult(context.pos - typed.length, filterByPrefix(opts, typed), /^[A-Za-z0-9_]*$/)
      }
    }

    const yamlCtx = detectYamlEditContext(context.state.doc, line.number, fileCategory)

    // Skill line mechanics under a Skills: list (any file except mob metaskill lists)
    if (prefs.mechanics && isSkillsListParent(yamlCtx.parentKey) && fileCategory !== 'mobs') {
      const skillLineMatch = /^\s+-\s+([A-Za-z]*)$/.exec(before)
      if (skillLineMatch) {
        const typed = skillLineMatch[1] ?? ''
        const opts = [
          ...mechanicCompletions,
          ...(prefs.conditions ? conditionInlineCompletions : []),
        ]
        return completionResult(context.pos - typed.length, filterByPrefix(opts, typed), /^[A-Za-z]*$/)
      }
    } else if (prefs.conditions && isConditionsListParent(yamlCtx.parentKey)) {
      const condMatch = /^\s+-\s+([A-Za-z][A-Za-z0-9_]*)$/.exec(before)
      if (condMatch) {
        const typed = condMatch[1] ?? ''
        return completionResult(
          context.pos - typed.length,
          filterByPrefix(conditionBlockCompletions, typed),
          /^[A-Za-z]*$/,
        )
      }
    } else if (prefs.mechanics) {
      // Fallback: skill lines without a detected Skills: parent (flat skill files)
      const skillLineMatch = /^\s+-\s+([A-Za-z]*)$/.exec(before)
      if (skillLineMatch && fileCategory !== 'mobs') {
        const typed = skillLineMatch[1] ?? ''
        const opts = [
          ...mechanicCompletions,
          ...(prefs.conditions ? conditionInlineCompletions : []),
        ]
        return completionResult(context.pos - typed.length, filterByPrefix(opts, typed), /^[A-Za-z]*$/)
      }
    }

    // Targeter / trigger / condition suffix after a mechanic on the same line
    const skillSuffixMatch = /^\s+-\s+\S+\s+([@~?!][A-Za-z]*)$/.exec(before)
    if (skillSuffixMatch) {
      const token = skillSuffixMatch[1] ?? ''
      const from = context.pos - token.length
      if (token.startsWith('@') && prefs.targeters) {
        return completionResult(from, filterByPrefix(targeterCompletions, token), /^@[A-Za-z]*$/)
      }
      if (token.startsWith('~') && prefs.triggers) {
        return completionResult(from, filterByPrefix(triggerCompletions, token), /^~[A-Za-z]*$/)
      }
      if (token.startsWith('?') && prefs.conditions) {
        const typed = token.slice(1)
        const opts = conditionInlineCompletions.filter(
          (c) => !typed || c.label.toLowerCase().startsWith(typed.toLowerCase()),
        )
        return completionResult(from, opts, /^\?[A-Za-z]*$/)
      }
      if (token.startsWith('!') && prefs.conditions) {
        const typed = token.slice(1)
        const opts = conditionInlineCompletions
          .filter((c) => !typed || c.label.toLowerCase().startsWith(typed.toLowerCase()))
          .map((c) => ({ ...c, apply: `!${c.label}`, label: `!${c.label}` }))
        return completionResult(from, opts, /^![A-Za-z]*$/)
      }
    }

    if (!context.explicit) return null

    const afterMechanic = /^\s+-\s+\S+\s+([A-Za-z@~?!]*)$/.exec(before)
    if (afterMechanic) {
      const typed = afterMechanic[1] ?? ''
      const opts = [
        ...(prefs.targeters ? targeterCompletions : []),
        ...(prefs.triggers ? triggerCompletions : []),
        ...(prefs.conditions ? conditionInlineCompletions : []),
      ]
      return completionResult(context.pos - typed.length, filterByPrefix(opts, typed), /^[@~?!A-Za-z]*$/)
    }

    return null
  }
}

export const DEFAULT_AC_PREFS: AcPrefs = {
  enabled: true,
  mechanics: true,
  targeters: true,
  triggers: true,
  conditions: true,
  packIds: true,
  activateOnTyping: true,
}

export function buildMythicAutocomplete(
  packMobIds: string[],
  packItemIds: string[],
  packSkillIds: string[],
  packDroptableIds: string[],
  prefs: AcPrefs = DEFAULT_AC_PREFS,
  fileCategory?: MythicCategory,
) {
  return [
    autocompletion({
      override: [
        mythicCompletion(packMobIds, packItemIds, packSkillIds, packDroptableIds, prefs, fileCategory),
      ],
      defaultKeymap: true,
      activateOnTyping: prefs.activateOnTyping,
      maxRenderedOptions: 60,
    }),
    completionScrollLoadMore(),
    keymap.of(completionKeymap),
  ]
}
