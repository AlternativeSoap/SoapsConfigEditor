import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  autocompletion,
  completionKeymap,
} from '@codemirror/autocomplete'
import { keymap } from '@codemirror/view'
import {
  CRUCIBLE_ITEM_BODY_KEYS,
  CRUCIBLE_LORE_PLACEHOLDERS,
  CRUCIBLE_OPTION_KEYS,
} from '../../data/mythiccrucible/itemCompletions'
import { toBlockConditionSnippet, toInlineConditionSnippet } from '../../data/mythicmobs/conditions'
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
import { resolveMythicCatalogs, type MythicCatalogs } from './resolveCatalogs'
import {
  bodyKeysForCategory,
  detectYamlEditContext,
  DROP_BUILTINS,
  EQUIPMENT_SLOTS,
  isConditionsListParent,
  isSkillsListParent,
} from './yamlEditContext'
import { BOOLEAN_VALUES } from './attrValueCompletions'
import { AI_GOAL_SELECTORS, AI_TARGET_SELECTORS } from '../../data/mythicmobs/mobAiSelectors'
import { MOB_OPTION_NAMES, mobOptionByName } from '../../data/mythicmobs/mobOptions'
import { completionScrollLoadMore } from './completionScrollLoad'
import { isPackInfoFile } from './packInfo'
import { packInfoCompletions } from './packInfoCompletions'

/** Collect Option keys already present under the current Options: block. */
function collectSiblingMapKeys(
  doc: { line: (n: number) => { text: string }; lines: number },
  lineNumber: number,
): Set<string> {
  const present = new Set<string>()
  let optionsIndent = -1
  for (let i = lineNumber; i >= 1; i--) {
    const text = doc.line(i).text
    const ind = text.match(/^(\s*)/)?.[1]?.length ?? 0
    if (/^\s*Options:\s*(?:#.*)?$/.test(text)) {
      optionsIndent = ind
      break
    }
  }
  if (optionsIndent < 0) return present
  const childIndent = optionsIndent + 2
  let started = false
  for (let i = 1; i <= doc.lines; i++) {
    const text = doc.line(i).text
    const ind = text.match(/^(\s*)/)?.[1]?.length ?? 0
    if (/^\s*Options:\s*(?:#.*)?$/.test(text)) {
      started = true
      continue
    }
    if (!started) continue
    if (ind <= optionsIndent && text.trim() && !text.trim().startsWith('#')) break
    if (ind === childIndent && i !== lineNumber) {
      const m = /^\s*([A-Za-z][A-Za-z0-9_]*):/.exec(text)
      if (m?.[1]) present.add(m[1])
    }
  }
  return present
}

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

interface CatalogCompletions {
  mechanics: Completion[]
  targeters: Completion[]
  triggers: Completion[]
  conditionBlock: Completion[]
  conditionInline: Completion[]
}

function buildCatalogCompletions(catalogs: MythicCatalogs): CatalogCompletions {
  const mechanics: Completion[] = []
  for (const m of catalogs.mechanics) {
    mechanics.push({
      label: m.id,
      detail: m.description,
      info: m.insertSnippet,
      apply: m.insertSnippet,
      type: 'function',
      boost: 1,
    })
    for (const alias of m.aliases) {
      mechanics.push({
        label: alias,
        detail: m.id,
        info: m.insertSnippet,
        apply: m.insertSnippet,
        type: 'function',
      })
    }
  }

  const targeters: Completion[] = []
  const shorthandSeen = new Set<string>()
  for (const t of catalogs.targeters) {
    targeters.push({
      label: `@${t.id}`,
      detail: t.description,
      info: t.insertSnippet,
      apply: t.insertSnippet,
      type: 'keyword',
    })
    for (const sh of t.shorthand) {
      const label = sh.startsWith('@') ? sh : `@${sh}`
      if (shorthandSeen.has(label.toLowerCase())) continue
      shorthandSeen.add(label.toLowerCase())
      targeters.push({
        label,
        detail: `@${t.id}`,
        info: t.insertSnippet,
        apply: t.insertSnippet,
        type: 'keyword',
      })
    }
  }

  return {
    mechanics,
    targeters,
    triggers: catalogs.triggers.map((t) => ({
      label: `~${t.id}`,
      detail: t.description,
      info: t.insertSnippet,
      apply: t.insertSnippet,
      type: 'constant',
    })),
    conditionBlock: catalogs.conditions.map((c) => ({
      label: c.id,
      detail: c.description,
      info: c.insertSnippet,
      apply: toBlockConditionSnippet(c.insertSnippet),
      type: 'variable',
    })),
    conditionInline: catalogs.conditions.map((c) => ({
      label: c.id,
      detail: c.description,
      info: toInlineConditionSnippet(c.insertSnippet),
      apply: toInlineConditionSnippet(c.insertSnippet),
      type: 'variable',
    })),
  }
}

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
  catalogs: MythicCatalogs,
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
    const mechanic = findMechanic(mechMatch[1] ?? '', catalogs.mechanics)
    if (mechanic) {
      const result = tryBlock(mechMatch[2] ?? '', getMechanicAttrs(mechanic), mechanic.id)
      if (result) return result
    }
  }

  const targeterMatch = /@([A-Za-z][A-Za-z0-9_]*)\{([^}]*)$/.exec(before)
  if (targeterMatch) {
    const targeter = catalogs.targeters.find(
      (t) => t.id.toLowerCase() === (targeterMatch[1] ?? '').toLowerCase(),
    )
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
    const condition = catalogs.conditions.find(
      (c) => c.id.toLowerCase() === (condMatch[1] ?? '').toLowerCase(),
    )
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
  _packItemIds: string[],
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
  prefs: AcPrefs,
  completions: CatalogCompletions,
  crucible: boolean,
  packEquipmentSetIds: string[] = [],
  packAugmentTypeIds: string[] = [],
): CompletionResult | null {
  const yamlCtx = detectYamlEditContext(context.state.doc, context.state.doc.lineAt(context.pos).number, fileCategory)

  // Entity body keys (2-space indent under mob/skill/item root)
  const bodyKeyMatch = /^\s{2}([A-Za-z][A-Za-z0-9_]*)$/.exec(before)
  if (bodyKeyMatch && yamlCtx.lineIndent === 2) {
    const typed = bodyKeyMatch[1] ?? ''
    let keys = bodyKeysForCategory(fileCategory)
    if (crucible && fileCategory === 'items') {
      keys = [...keys, ...CRUCIBLE_ITEM_BODY_KEYS.filter((k) => !keys.includes(k))]
    }
    if (keys.length) {
      const options: Completion[] = keys.map((k) => ({ label: k, type: 'keyword' }))
      return completionResult(context.pos - typed.length, filterByPrefix(options, typed), /^[A-Za-z][A-Za-z0-9_]*$/)
    }
  }

  // Crucible Options keys under Options:
  if (crucible && fileCategory === 'items' && yamlCtx.parentKey === 'Options') {
    const optMatch = /^\s{4}([A-Za-z][A-Za-z0-9_]*)$/.exec(before)
    if (optMatch) {
      const typed = optMatch[1] ?? ''
      const options: Completion[] = CRUCIBLE_OPTION_KEYS.map((k) => ({ label: k, type: 'keyword' }))
      return completionResult(context.pos - typed.length, filterByPrefix(options, typed), /^[A-Za-z][A-Za-z0-9_]*$/)
    }
  }

  // EquipmentSet: pack set ids
  if (crucible && prefs.packIds && fileCategory === 'items') {
    const setMatch = /^\s+EquipmentSet:\s+([A-Za-z0-9_]*)$/.exec(before)
    if (setMatch) {
      const typed = setMatch[1] ?? ''
      return completionResult(
        context.pos - typed.length,
        filterByPrefix(packCompletions(packEquipmentSetIds, 'equipment set'), typed),
        /^[A-Za-z0-9_]*$/,
      )
    }
  }

  // Augment Type: under Augmentation* blocks
  if (crucible && prefs.packIds && fileCategory === 'items') {
    const typeMatch = /^\s+Type:\s+([A-Za-z0-9_]*)$/.exec(before)
    if (typeMatch) {
      const lineNum = context.state.doc.lineAt(context.pos).number
      const parent = findAncestorYamlKey(context.state.doc, lineNum, yamlCtx.lineIndent)
      if (
        parent &&
        /^(Augmentation|AugmentationSlots|AugmentationSocket|AugmentationRemover)$/i.test(parent)
      ) {
        const typed = typeMatch[1] ?? ''
        return completionResult(
          context.pos - typed.length,
          filterByPrefix(packCompletions(packAugmentTypeIds, 'augment type'), typed),
          /^[A-Za-z0-9_]*$/,
        )
      }
    }
  }

  // Mob Options map keys / values under Options:
  if (fileCategory === 'mobs' && yamlCtx.parentKey === 'Options') {
    const optKeyMatch = /^\s{4}([A-Za-z][A-Za-z0-9_]*)$/.exec(before)
    if (optKeyMatch && yamlCtx.lineIndent === 4) {
      const typed = optKeyMatch[1] ?? ''
      const lineNo = context.state.doc.lineAt(context.pos).number
      const present = collectSiblingMapKeys(context.state.doc, lineNo)
      const names = MOB_OPTION_NAMES.filter((n) => !present.has(n))
      const options: Completion[] = names.map((k) => ({ label: k, type: 'keyword', detail: 'option' }))
      return completionResult(context.pos - typed.length, filterByPrefix(options, typed), /^[A-Za-z][A-Za-z0-9_]*$/)
    }

    const optValMatch = /^\s{4}([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/.exec(before)
    if (optValMatch) {
      const optName = optValMatch[1] ?? ''
      const typed = optValMatch[2] ?? ''
      const entry = mobOptionByName(optName)
      if (entry) {
        let values: string[] = []
        if (entry.type === 'boolean') values = [...BOOLEAN_VALUES]
        else if (entry.type === 'enum' && entry.values?.length) values = entry.values
        else if (entry.default) values = [entry.default]
        if (values.length) {
          const options: Completion[] = values.map((v) => ({ label: v, type: 'enum', detail: optName }))
          return completionResult(
            context.pos - typed.length,
            filterByPrefix(options, typed),
            /^[A-Za-z0-9_.-]*$/,
          )
        }
      }
    }
  }

  // Equipment slot keys
  if (fileCategory === 'mobs' && yamlCtx.parentKey === 'Equipment') {
    const slotKeyMatch = /^\s{4}([A-Za-z][A-Za-z0-9_]*)$/.exec(before)
    if (slotKeyMatch && yamlCtx.lineIndent === 4) {
      const typed = slotKeyMatch[1] ?? ''
      const options: Completion[] = EQUIPMENT_SLOTS.map((k) => ({ label: k, type: 'keyword', detail: 'slot' }))
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

  // AIGoalSelectors / AITargetSelectors list items
  if (listMatch && fileCategory === 'mobs') {
    if (yamlCtx.parentKey === 'AIGoalSelectors') {
      const typed = listMatch[1] ?? ''
      const options: Completion[] = AI_GOAL_SELECTORS.map((k) => ({ label: k, type: 'keyword', detail: 'ai goal' }))
      return completionResult(context.pos - typed.length, filterByPrefix(options, typed), /^[A-Za-z0-9_]*$/)
    }
    if (yamlCtx.parentKey === 'AITargetSelectors') {
      const typed = listMatch[1] ?? ''
      const options: Completion[] = AI_TARGET_SELECTORS.map((k) => ({ label: k, type: 'keyword', detail: 'ai target' }))
      return completionResult(context.pos - typed.length, filterByPrefix(options, typed), /^[A-Za-z0-9_]*$/)
    }
  }

  if (listMatch && isSkillsListParent(yamlCtx.parentKey) && fileCategory === 'mobs') {
    const typed = listMatch[1] ?? ''
    const skillOpts = filterByPrefix(packCompletions(packSkillIds, 'skill'), typed)
    const looksLikeMechanic = typed.length > 0 && typed === typed.toLowerCase()
    if (looksLikeMechanic && prefs.mechanics) {
      const mechOpts = filterByPrefix(completions.mechanics, typed)
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
      filterByPrefix(completions.conditionBlock, typed),
      /^[A-Za-z]*$/,
    )
  }

  // Mob Template: pack mob ids
  const templateMatch = /^\s+Template:\s*([A-Za-z0-9_,\s]*)$/.exec(before)
  if (templateMatch && fileCategory === 'mobs') {
    const raw = templateMatch[1] ?? ''
    const afterComma = raw.includes(',') ? raw.slice(raw.lastIndexOf(',') + 1).trimStart() : raw.trimStart()
    const typed = afterComma
    const from = context.pos - typed.length
    return completionResult(from, filterByPrefix(packCompletions(packMobIds, 'pack mob'), typed), /^[A-Za-z0-9_]*$/)
  }

  // Mob Exclude: body keys (inline or list)
  const excludeMatch = /^\s+Exclude:\s*([A-Za-z0-9_]*)$/.exec(before)
  if (excludeMatch && fileCategory === 'mobs' && yamlCtx.lineIndent === 2) {
    const typed = excludeMatch[1] ?? ''
    const opts: Completion[] = bodyKeysForCategory('mobs')
      .filter((k) => k !== 'Template' && k !== 'Exclude')
      .map((k) => ({ label: k, type: 'keyword' }))
    return completionResult(context.pos - typed.length, filterByPrefix(opts, typed), /^[A-Za-z0-9_]*$/)
  }

  const excludeListMatch = /^\s+-\s+([A-Za-z0-9_]*)$/.exec(before)
  if (excludeListMatch && yamlCtx.parentKey === 'Exclude' && fileCategory === 'mobs') {
    const typed = excludeListMatch[1] ?? ''
    const opts: Completion[] = bodyKeysForCategory('mobs')
      .filter((k) => k !== 'Template' && k !== 'Exclude')
      .map((k) => ({ label: k, type: 'keyword' }))
    return completionResult(context.pos - typed.length, filterByPrefix(opts, typed), /^[A-Za-z0-9_]*$/)
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

/** Walk upward for the nearest YAML key with less indent than the current line. */
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

/** Completion source for Mythic YAML. Exported for unit tests. */
export function mythicCompletion(
  packMobIds: string[],
  packItemIds: string[],
  packSkillIds: string[],
  packDroptableIds: string[],
  prefs: AcPrefs,
  fileCategory: MythicCategory | undefined,
  catalogs: MythicCatalogs,
  crucible: boolean,
  packEquipmentSetIds: string[] = [],
  packAugmentTypeIds: string[] = [],
  filePath?: string,
) {
  const completions = buildCatalogCompletions(catalogs)

  return function(context: CompletionContext): CompletionResult | null {
    if (isPackInfoFile(filePath)) {
      const packInfoResult = packInfoCompletions(context)
      if (packInfoResult) return packInfoResult
    }

    const line = context.state.doc.lineAt(context.pos)
    const lineText = line.text
    const cursorCol = context.pos - line.from
    const before = lineText.slice(0, cursorCol)

    const braceResult = braceAttrCompletion(
      context,
      catalogs,
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
      prefs,
      completions,
      crucible,
      packEquipmentSetIds,
      packAugmentTypeIds,
    )
    if (yamlResult) return yamlResult

    // Placeholders inside quoted strings (base + Crucible lore)
    const placeholderMatch = /<([A-Za-z.]*)$/.exec(before)
    if (placeholderMatch) {
      const typed = placeholderMatch[1] ?? ''
      const from = context.pos - typed.length - 1
      const loreExtras = crucible
        ? CRUCIBLE_LORE_PLACEHOLDERS.filter((p) => p.startsWith('<'))
        : []
      const allPlaceholders = [...PLACEHOLDERS, ...loreExtras]
      const filtered = allPlaceholders.filter((p) => {
        const inner = p.slice(1, -1)
        return !typed || inner.toLowerCase().startsWith(typed.toLowerCase())
      })
      const opts: Completion[] = filtered.map((p) => ({ label: p, type: 'text' as const }))
      return completionResult(from, opts, /^[<A-Za-z.>]*$/)
    }

    // Crucible brace lore tokens like {stats}, plus {augments:TYPE} with pack ids
    if (crucible) {
      const augmentsTypeMatch = /\{augments(?:-each)?:([A-Za-z0-9_]*)$/.exec(before)
      if (augmentsTypeMatch && prefs.packIds) {
        const typed = augmentsTypeMatch[1] ?? ''
        return completionResult(
          context.pos - typed.length,
          filterByPrefix(packCompletions(packAugmentTypeIds, 'augment type'), typed),
          /^[A-Za-z0-9_]*$/,
        )
      }
      const braceLoreMatch = /\{([A-Za-z0-9_:-]*)$/.exec(before)
      if (braceLoreMatch) {
        const typed = braceLoreMatch[1] ?? ''
        const from = context.pos - typed.length - 1
        const opts: Completion[] = CRUCIBLE_LORE_PLACEHOLDERS.filter((p) => p.startsWith('{')).map(
          (p) => ({ label: p, type: 'text' as const }),
        )
        return completionResult(from, filterByPrefix(opts, `{${typed}`), /^\{[A-Za-z0-9_:-]*$/)
      }
    }

    // @targeter
    if (prefs.targeters) {
      const atMatch = /@([A-Za-z]*)$/.exec(before)
      if (atMatch) {
        const typed = atMatch[1] ?? ''
        return completionResult(
          context.pos - typed.length - 1,
          filterByPrefix(completions.targeters, `@${typed}`),
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
          filterByPrefix(completions.triggers, `~${typed}`),
          /^~[A-Za-z]*$/,
        )
      }
    }

    // Negated / inline conditions on skill lines
    if (prefs.conditions) {
      const inlineCondMatch = /\?([A-Za-z]*)$/.exec(before)
      if (inlineCondMatch) {
        const typed = inlineCondMatch[1] ?? ''
        const opts = completions.conditionInline.filter(
          (c) => !typed || c.label.toLowerCase().startsWith(typed.toLowerCase()),
        )
        return completionResult(context.pos - typed.length - 1, opts, /^\?[A-Za-z]*$/)
      }

      const negMatch = /!([A-Za-z]*)$/.exec(before)
      if (negMatch) {
        const typed = negMatch[1] ?? ''
        const opts = completions.conditionInline.map((c) => ({
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
          ...completions.mechanics,
          ...(prefs.conditions ? completions.conditionInline : []),
        ]
        return completionResult(context.pos - typed.length, filterByPrefix(opts, typed), /^[A-Za-z]*$/)
      }
    } else if (prefs.conditions && isConditionsListParent(yamlCtx.parentKey)) {
      const condMatch = /^\s+-\s+([A-Za-z][A-Za-z0-9_]*)$/.exec(before)
      if (condMatch) {
        const typed = condMatch[1] ?? ''
        return completionResult(
          context.pos - typed.length,
          filterByPrefix(completions.conditionBlock, typed),
          /^[A-Za-z]*$/,
        )
      }
    } else if (prefs.mechanics) {
      // Fallback: skill lines without a detected Skills: parent (flat skill files)
      const skillLineMatch = /^\s+-\s+([A-Za-z]*)$/.exec(before)
      if (skillLineMatch && fileCategory !== 'mobs') {
        const typed = skillLineMatch[1] ?? ''
        const opts = [
          ...completions.mechanics,
          ...(prefs.conditions ? completions.conditionInline : []),
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
        return completionResult(from, filterByPrefix(completions.targeters, token), /^@[A-Za-z]*$/)
      }
      if (token.startsWith('~') && prefs.triggers) {
        return completionResult(from, filterByPrefix(completions.triggers, token), /^~[A-Za-z]*$/)
      }
      if (token.startsWith('?') && prefs.conditions) {
        const typed = token.slice(1)
        const opts = completions.conditionInline.filter(
          (c) => !typed || c.label.toLowerCase().startsWith(typed.toLowerCase()),
        )
        return completionResult(from, opts, /^\?[A-Za-z]*$/)
      }
      if (token.startsWith('!') && prefs.conditions) {
        const typed = token.slice(1)
        const opts = completions.conditionInline
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
        ...(prefs.targeters ? completions.targeters : []),
        ...(prefs.triggers ? completions.triggers : []),
        ...(prefs.conditions ? completions.conditionInline : []),
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
  crucible = false,
  packEquipmentSetIds: string[] = [],
  packAugmentTypeIds: string[] = [],
  filePath?: string,
) {
  const catalogs = resolveMythicCatalogs(crucible)
  return [
    autocompletion({
      override: [
        mythicCompletion(
          packMobIds,
          packItemIds,
          packSkillIds,
          packDroptableIds,
          prefs,
          fileCategory,
          catalogs,
          crucible,
          packEquipmentSetIds,
          packAugmentTypeIds,
          filePath,
        ),
      ],
      defaultKeymap: true,
      activateOnTyping: prefs.activateOnTyping,
      maxRenderedOptions: 60,
    }),
    completionScrollLoadMore(),
    keymap.of(completionKeymap),
  ]
}
