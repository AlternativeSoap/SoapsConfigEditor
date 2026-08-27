import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  autocompletion,
  completionKeymap,
} from '@codemirror/autocomplete'
import { keymap } from '@codemirror/view'
import {
  CRUCIBLE_LORE_PLACEHOLDERS,
} from '../../data/mythiccrucible/itemCompletions'
import { toBlockConditionSnippet, toInlineConditionSnippet } from '../../data/mythicmobs/conditions'
import type { AcPrefs, MythicCategory } from '../../types'
import {
  augmentBraceAttrs,
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
  findMechanic,
  getConditionAttrs,
  getMechanicAttrs,
  getTargeterAttrs,
  parseAttrNames,
} from './skillLineAttrs'
import type { MechanicAttr } from '../../data/mythicmobs/mechanics'
import { resolveMythicCatalogs, type MythicCatalogs } from './resolveCatalogs'
import {
  bodyKeyDefsForCategory,
  bodyKeyIndentForCategory,
  collectSiblingBodyKeys,
  detectYamlEditContext,
  DROP_BUILTINS,
  DROP_BUILTIN_APPLY,
  EQUIPMENT_SLOTS,
  findNearestYamlParentKey,
  hasYamlAncestorKey,
  isConditionsListParent,
  isMobStructureListParent,
  isSkillsListParent,
  MOB_BODY_DEFS,
} from './yamlEditContext'
import { DAMAGE_MODIFIER_TYPES, damageModifierApply } from '../../data/mythicmobs/damageTypes'
import type { BodyKeyDef } from '../yaml/bodyKeyDefs'
import { CRUCIBLE_OPTION_DEFS } from '../yaml/bodyKeyCatalogs'
import { fieldCompletions } from '../yaml/bodyKeyDefs'
import { BOOLEAN_VALUES } from './attrValueCompletions'
import { AI_GOAL_SELECTORS, AI_TARGET_SELECTORS } from '../../data/mythicmobs/mobAiSelectors'
import { MOB_OPTION_NAMES, mobOptionByName, type MobOptionEntry } from '../../data/mythicmobs/mobOptions'
import {
  resolveNestedBlock,
  type NestedBlockDef,
  CLASS_ATTRIBUTE_VALUE_DEFS,
  CLASS_RESOURCE_BAR_DEFS,
  CLASS_SKILL_BINDING_DEFS,
} from '../../data/mythicmobs/mobNestedBlocks'
import { ALL_OBJECTIVE_TYPES } from '../../data/soapsquest/objectiveTypes'
import {
  BOSS_BAR_COLORS,
  BOSS_BAR_STYLES,
  DISPLAY_ALIGNMENTS,
  DISPLAY_BILLBOARDS,
  DISPLAY_TRANSFORMS,
  DROP_METHODS,
  EXPERIENCE_CURVE_TYPES,
  EXPERIENCE_SOURCE_TYPES,
  ARCHETYPE_GROUPS,
  AI_GOAL_APPLY,
  AI_TARGET_APPLY,
  MANNEQUIN_MAIN_HANDS,
  MANNEQUIN_MODELS,
  MANNEQUIN_POSE_STARTERS,
  RANDOMSPAWN_POSITION_TYPES,
} from '../../data/mythicmobs/nestedEnums'
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
    const lineText = doc.line(i).text
    if (/^\s*Options:\s*(?:#.*)?$/.test(lineText)) {
      optionsIndent = lineText.match(/^(\s*)/)?.[1]?.length ?? 0
      break
    }
  }
  if (optionsIndent < 0) return present

  const lineIndent = doc.line(lineNumber).text.match(/^(\s*)/)?.[1]?.length ?? 0
  const bodyKeys = new Set(MOB_BODY_DEFS.map((d) => d.key))
  let started = false
  for (let i = 1; i <= doc.lines; i++) {
    const lineText = doc.line(i).text
    const ind = lineText.match(/^(\s*)/)?.[1]?.length ?? 0
    if (/^\s*Options:\s*(?:#.*)?$/.test(lineText) && ind === optionsIndent) {
      started = true
      continue
    }
    if (!started) continue
    if (ind < optionsIndent && lineText.trim()) break
    // Nested Options: a peer body key at Options indent ends the block.
    if (lineIndent > optionsIndent && ind === optionsIndent && lineText.trim()) break
    // Same-indent Options: stop at the next mob body key (Skills, Type, ...).
    if (lineIndent === optionsIndent && ind === optionsIndent) {
      const m = /^\s*([A-Za-z][A-Za-z0-9_]*):/.exec(lineText)
      if (m?.[1] && bodyKeys.has(m[1]) && m[1] !== 'Options') break
    }
    if (ind === lineIndent && i !== lineNumber) {
      const m = /^\s*([A-Za-z][A-Za-z0-9_]*):/.exec(lineText)
      if (m?.[1]) present.add(m[1])
    }
  }
  return present
}

function mobOptionApply(entry: MobOptionEntry): string {
  if (entry.type === 'boolean') return `${entry.name}: ${entry.default ?? 'false'}`
  if (entry.type === 'enum') return `${entry.name}: ${entry.default ?? entry.values?.[0] ?? ''}`
  if (entry.type === 'number') return `${entry.name}: ${entry.default ?? '0'}`
  if (entry.default) return `${entry.name}: ${entry.default}`
  return `${entry.name}: `
}

function mobOptionCompletions(names: string[]): Completion[] {
  return names.map((name) => {
    const entry = mobOptionByName(name)
    return {
      label: name,
      type: 'keyword' as const,
      detail: entry?.description ?? 'option',
      apply: entry ? mobOptionApply(entry) : `${name}: `,
    }
  })
}

function bodyKeyTypedPrefix(before: string, indent: number): string | null {
  if (indent === 0) {
    if (before === '') return ''
    const m = /^([A-Za-z][A-Za-z0-9_-]*)$/.exec(before)
    return m ? (m[1] ?? '') : null
  }
  if (new RegExp(`^\\s{${indent}}$`).test(before)) return ''
  const m = new RegExp(`^\\s{${indent}}([A-Za-z][A-Za-z0-9_-]*)$`).exec(before)
  return m ? (m[1] ?? '') : null
}

/** Typed prefix on a nested map key line (supports blank indent-only lines). */
function nestedMapTypedPrefix(before: string, indent: number, lineIndent: number): string | null {
  if (lineIndent !== indent) return null
  if (new RegExp(`^\\s{${indent}}$`).test(before)) return ''
  const m = new RegExp(`^\\s{${indent}}([A-Za-z][A-Za-z0-9_-]*)$`).exec(before)
  return m ? (m[1] ?? '') : null
}

/** Same-indent Options / Equipment key line (indent 2 or 4), including blank. */
function optionKeyTypedPrefix(before: string, lineIndent: number): string | null {
  if (lineIndent !== 2 && lineIndent !== 4) return null
  if (new RegExp(`^\\s{${lineIndent}}$`).test(before)) return ''
  const m = new RegExp(`^\\s{${lineIndent}}([A-Za-z][A-Za-z0-9_]*)$`).exec(before)
  return m ? (m[1] ?? '') : null
}

function damageModifierListCompletions(typed: string, from: number): CompletionResult | null {
  const options: Completion[] = DAMAGE_MODIFIER_TYPES.map((t) => ({
    label: t,
    type: 'enum' as const,
    detail: 'damage modifier',
    apply: damageModifierApply(t, '1'),
  }))
  return completionResult(from, filterByPrefix(options, typed), /^[A-Za-z0-9_]*$/)
}

function nestedListDashCompletions(
  block: NestedBlockDef,
  typed: string,
  from: number,
  includeDashPrefix: boolean,
): CompletionResult | null {
  const labels = block.entries as readonly string[]
  const options: Completion[] = labels.map((label) => {
    const value = block.listApply?.(label) ?? label
    return {
      label,
      type: 'enum' as const,
      detail: block.detail,
      apply: includeDashPrefix ? `- ${value}` : value,
    }
  })
  return completionResult(from, filterByPrefix(options, typed), /^[A-Za-z0-9_.<>]*$/)
}

function nestedMapCompletions(
  doc: { line: (n: number) => { text: string }; lines: number },
  lineNumber: number,
  block: NestedBlockDef,
  typed: string,
  from: number,
  siblingIndent = block.childIndent,
): CompletionResult | null {
  const defs = block.entries as BodyKeyDef[]
  const present = collectSiblingBodyKeys(doc, lineNumber, siblingIndent)
  const options = fieldCompletions(
    defs.filter((d) => !present.has(d.key)),
    true,
  )
  return completionResult(from, filterByPrefix(options, typed), /^[A-Za-z][A-Za-z0-9_-]*$/)
}

function nestedYamlCompletions(
  context: CompletionContext,
  before: string,
  fileCategory: MythicCategory | undefined,
  lineNumber: number,
  lineIndent: number,
  crucible = false,
): CompletionResult | null {
  const parent = findNearestYamlParentKey(context.state.doc, lineNumber, lineIndent)

  // MMOCore class indent-8: attribute values and skill bindings only under those sections.
  if (fileCategory === 'classes' && lineIndent === 8) {
    const typed = nestedMapTypedPrefix(before, 8, lineIndent)
    if (typed !== null) {
      const from = context.pos - typed.length
      if (hasYamlAncestorKey(context.state.doc, lineNumber, 8, 'attributes')) {
        const present = collectSiblingBodyKeys(context.state.doc, lineNumber, 8)
        const options = fieldCompletions(
          CLASS_ATTRIBUTE_VALUE_DEFS.filter((d) => !present.has(d.key)),
          true,
        )
        return completionResult(from, filterByPrefix(options, typed), /^[a-z][a-z0-9-]*$/)
      }
      if (hasYamlAncestorKey(context.state.doc, lineNumber, 8, 'skills')) {
        const present = collectSiblingBodyKeys(context.state.doc, lineNumber, 8)
        const options = fieldCompletions(
          CLASS_SKILL_BINDING_DEFS.filter((d) => !present.has(d.key)),
          true,
        )
        return completionResult(from, filterByPrefix(options, typed), /^[a-z][a-z0-9-]*$/)
      }
    }
  }

  if (!parent) return null

  // resource.mana uses the same parent key as root mana:; prefer resource bar keys
  // when under resource: at indent 8.
  if (
    fileCategory === 'classes' &&
    parent === 'mana' &&
    (lineIndent === 8 || lineIndent === 6) &&
    hasYamlAncestorKey(context.state.doc, lineNumber, lineIndent, 'resource')
  ) {
    const indents = [8, 6]
    for (const indent of indents) {
      const typed = nestedMapTypedPrefix(before, indent, lineIndent)
      if (typed !== null) {
        return nestedMapCompletions(
          context.state.doc,
          lineNumber,
          { parentKey: 'mana', kind: 'map', childIndent: 8, entries: CLASS_RESOURCE_BAR_DEFS },
          typed,
          context.pos - typed.length,
          indent,
        )
      }
    }
  }

  const block = resolveNestedBlock(parent, fileCategory, crucible)
  if (!block) return null

  if (block.kind === 'map') {
    // Nested children (childIndent) or Mythic same-indent siblings (childIndent - 2).
    const indents = [block.childIndent]
    if (block.childIndent >= 2) indents.push(block.childIndent - 2)
    for (const indent of indents) {
      const typed = nestedMapTypedPrefix(before, indent, lineIndent)
      if (typed !== null) {
        return nestedMapCompletions(
          context.state.doc,
          lineNumber,
          block,
          typed,
          context.pos - typed.length,
          indent,
        )
      }
    }
    return null
  }

  const listMatch = /^\s+-\s+([A-Za-z0-9_]*)$/.exec(before)
  if (listMatch && lineIndent >= block.childIndent - 2) {
    const typed = listMatch[1] ?? ''
    return nestedListDashCompletions(
      block,
      typed,
      context.pos - typed.length,
      false,
    )
  }

  const bareMatch = new RegExp(`^\\s{${block.childIndent}}([A-Za-z0-9_]*)$`).exec(before)
  if (bareMatch && lineIndent === block.childIndent) {
    const typed = bareMatch[1] ?? ''
    return nestedListDashCompletions(
      block,
      typed,
      context.pos - typed.length,
      true,
    )
  }

  return null
}

function nestedEnumValueCompletions(
  context: CompletionContext,
  before: string,
  fileCategory: MythicCategory | undefined,
  lineNumber: number,
  lineIndent: number,
): CompletionResult | null {
  const parent = findNearestYamlParentKey(context.state.doc, lineNumber, lineIndent)

  const scalarEnum = (
    pattern: RegExp,
    values: readonly string[],
    validFor: RegExp,
  ): CompletionResult | null => {
    const match = pattern.exec(before)
    if (!match) return null
    const typed = match[1] ?? ''
    const options: Completion[] = values.map((v) => ({ label: v, type: 'enum' as const }))
    return completionResult(context.pos - typed.length, filterByPrefix(options, typed), validFor)
  }

  if (parent === 'BossBar') {
    const color = scalarEnum(/^\s+Color:\s+([A-Za-z_]*)$/, BOSS_BAR_COLORS, /^[A-Za-z_]*$/)
    if (color) return color
    const style = scalarEnum(/^\s+Style:\s+([A-Za-z0-9_]*)$/, BOSS_BAR_STYLES, /^[A-Za-z0-9_]*$/)
    if (style) return style
  }

  if (parent === 'DisplayOptions') {
    const billboard = scalarEnum(/^\s+Billboard:\s+([A-Za-z_]*)$/, DISPLAY_BILLBOARDS, /^[A-Za-z_]*$/)
    if (billboard) return billboard
    const transform = scalarEnum(/^\s+Transform:\s+([A-Za-z_]*)$/, DISPLAY_TRANSFORMS, /^[A-Za-z_]*$/)
    if (transform) return transform
    const alignment = scalarEnum(/^\s+Alignment:\s+([A-Za-z_]*)$/, DISPLAY_ALIGNMENTS, /^[A-Za-z_]*$/)
    if (alignment) return alignment
  }

  if (parent === 'MannequinOptions') {
    const hand = scalarEnum(/^\s+MainHand:\s+([A-Za-z_]*)$/, MANNEQUIN_MAIN_HANDS, /^[A-Za-z_]*$/)
    if (hand) return hand
    const model = scalarEnum(/^\s+Model:\s+([A-Za-z_]*)$/, MANNEQUIN_MODELS, /^[A-Za-z_]*$/)
    if (model) return model
    const pose = scalarEnum(/^\s+Pose:\s+([A-Za-z_]*)$/, MANNEQUIN_POSE_STARTERS, /^[A-Za-z_]*$/)
    if (pose) return pose
  }

  if (parent === 'DropOptions') {
    const method = scalarEnum(/^\s+DropMethod:\s+([A-Za-z_]*)$/, DROP_METHODS, /^[A-Za-z_]*$/)
    if (method) return method
  }

  if (parent === 'Sources' || fileCategory === 'experience-curves' || fileCategory === 'exp-curves') {
    if (fileCategory === 'experience-curves' || fileCategory === 'exp-curves' || parent === 'Sources') {
      const curveOrSrc = scalarEnum(
        /^\s+Type:\s+([A-Za-z_]*)$/,
        parent === 'Sources' ? EXPERIENCE_SOURCE_TYPES : EXPERIENCE_CURVE_TYPES,
        /^[A-Za-z_]*$/,
      )
      if (curveOrSrc) return curveOrSrc
    }
  }

  if (fileCategory === 'quests' || parent === 'objectives') {
    const objType = scalarEnum(
      /type:\s+([\w-]*)$/,
      ALL_OBJECTIVE_TYPES.map((t) => t.id),
      /^[\w-]*$/,
    )
    if (objType) return objType
  }

  {
    // Archetype Group — skip item files (Crucible also has Group:)
    if (fileCategory !== 'items') {
      const group = scalarEnum(/^\s+Group:\s+([A-Za-z_]*)$/, ARCHETYPE_GROUPS, /^[A-Za-z_]*$/)
      if (group) return group
    }
  }

  return null
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
    kind: 'mechanic' | 'targeter' | 'condition' = 'mechanic',
  ): CompletionResult | null => {
    const merged = augmentBraceAttrs(attrs, blockId, kind)
    const valueResult = buildBraceAttrValueCompletions(
      inside,
      merged,
      blockId,
      context,
      packSkillIds,
      packMobIds,
      packItemIds,
      packDroptableIds,
    )
    if (valueResult) return valueResult
    return buildBraceAttrCompletions(inside, merged, context)
  }

  const mechMatch = /^\s+-\s+([A-Za-z][A-Za-z0-9_]*)\{([^}]*)$/.exec(before)
  if (mechMatch) {
    const mechanic = findMechanic(mechMatch[1] ?? '', catalogs.mechanics)
    if (mechanic) {
      const result = tryBlock(mechMatch[2] ?? '', getMechanicAttrs(mechanic), mechanic.id, 'mechanic')
      if (result) return result
    }
  }

  const targeterMatch = /@([A-Za-z][A-Za-z0-9_]*)\{([^}]*)$/.exec(before)
  if (targeterMatch) {
    const targeter = catalogs.targeters.find(
      (t) =>
        t.id.toLowerCase() === (targeterMatch[1] ?? '').toLowerCase() ||
        t.shorthand.some((s) => s.replace(/^@/, '').toLowerCase() === (targeterMatch[1] ?? '').toLowerCase()),
    )
    if (targeter) {
      const result = tryBlock(targeterMatch[2] ?? '', getTargeterAttrs(targeter), targeter.id, 'targeter')
      if (result) return result
    }
  }

  const condMatch = /\?([A-Za-z][A-Za-z0-9_]*)\{([^}]*)$/.exec(before)
  if (condMatch) {
    const condition = catalogs.conditions.find(
      (c) => c.id.toLowerCase() === (condMatch[1] ?? '').toLowerCase(),
    )
    if (condition) {
      const result = tryBlock(condMatch[2] ?? '', getConditionAttrs(condition), condition.id, 'condition')
      if (result) return result
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
  const lineNumber = context.state.doc.lineAt(context.pos).number

  const nestedResult = nestedYamlCompletions(
    context,
    before,
    fileCategory,
    lineNumber,
    yamlCtx.lineIndent,
    crucible,
  )
  if (nestedResult) return nestedResult

  const dmgModListMatch = /^\s+-\s+([A-Za-z0-9_]*)$/.exec(before)
  if (dmgModListMatch && yamlCtx.parentKey === 'DamageModifiers') {
    const typed = dmgModListMatch[1] ?? ''
    return damageModifierListCompletions(typed, context.pos - typed.length)
  }

  const enumValueResult = nestedEnumValueCompletions(
    context,
    before,
    fileCategory,
    lineNumber,
    yamlCtx.lineIndent,
  )
  if (enumValueResult) return enumValueResult

  const bodyIndent = bodyKeyIndentForCategory(fileCategory)
  if (bodyIndent !== null) {
    const typed = bodyKeyTypedPrefix(before, bodyIndent)
    // Skip when inside a nested block (Options, BossBar, ...) at the same indent.
    if (typed !== null && yamlCtx.lineIndent === bodyIndent && !yamlCtx.parentKey) {
      const defs = bodyKeyDefsForCategory(fileCategory, crucible)
      if (defs.length) {
        const lineNo = context.state.doc.lineAt(context.pos).number
        const present = collectSiblingBodyKeys(context.state.doc, lineNo, bodyIndent)
        const filtered = defs.filter((d) => !present.has(d.key))
        const options = fieldCompletions(filtered, true)
        return completionResult(
          context.pos - typed.length,
          filterByPrefix(options, typed),
          /^[A-Za-z][A-Za-z0-9_-]*$/,
        )
      }
    }
  }

  // Internal name / entity id starters (indent 0, or quest entity at indent 2)
  const entityStarter = entityIdStarterCompletions(context, before, fileCategory)
  if (entityStarter) return entityStarter

  // Crucible Options keys under Options: (items, or misclassified other)
  if (
    crucible &&
    yamlCtx.parentKey === 'Options' &&
    (fileCategory === 'items' || fileCategory === 'other' || fileCategory === undefined)
  ) {
    const typed = optionKeyTypedPrefix(before, yamlCtx.lineIndent)
    if (typed !== null) {
      const lineNo = context.state.doc.lineAt(context.pos).number
      const present = collectSiblingMapKeys(context.state.doc, lineNo)
      const filtered = CRUCIBLE_OPTION_DEFS.filter((d) => !present.has(d.key))
      const options = fieldCompletions(filtered, true)
      const result = completionResult(context.pos - typed.length, filterByPrefix(options, typed), /^[A-Za-z][A-Za-z0-9_]*$/)
      if (result) return result
    }
  }

  // EquipmentSet: pack set ids
  if (crucible && prefs.packIds && (fileCategory === 'items' || fileCategory === 'other' || fileCategory === undefined)) {
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
  if (crucible && prefs.packIds && (fileCategory === 'items' || fileCategory === 'other' || fileCategory === undefined)) {
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

  // Mob Options map keys / values under Options: (parent-key; works if category is wrong)
  if (
    yamlCtx.parentKey === 'Options' &&
    fileCategory !== 'items' &&
    fileCategory !== 'skills' &&
    !(crucible && (fileCategory === 'other' || fileCategory === undefined))
  ) {
    const typed = optionKeyTypedPrefix(before, yamlCtx.lineIndent)
    if (typed !== null) {
      const lineNo = context.state.doc.lineAt(context.pos).number
      const present = collectSiblingMapKeys(context.state.doc, lineNo)
      const names = MOB_OPTION_NAMES.filter((n) => !present.has(n))
      const options = mobOptionCompletions(names)
      return completionResult(context.pos - typed.length, filterByPrefix(options, typed), /^[A-Za-z][A-Za-z0-9_]*$/)
    }

    const optValMatch = /^\s{2,4}([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/.exec(before)
    if (optValMatch) {
      const optName = optValMatch[1] ?? ''
      const typedVal = optValMatch[2] ?? ''
      const entry = mobOptionByName(optName)
      if (entry) {
        let values: string[] = []
        if (entry.type === 'boolean') values = [...BOOLEAN_VALUES]
        else if (entry.type === 'enum' && entry.values?.length) values = entry.values
        else if (entry.default) values = [entry.default]
        if (values.length) {
          const options: Completion[] = values.map((v) => ({ label: v, type: 'enum', detail: optName }))
          return completionResult(
            context.pos - typedVal.length,
            filterByPrefix(options, typedVal),
            /^[A-Za-z0-9_.-]*$/,
          )
        }
      }
    }
  }

  // Equipment slot keys (parent-key; Mythic same-indent or nested)
  if (yamlCtx.parentKey === 'Equipment' && fileCategory !== 'items') {
    const typed = optionKeyTypedPrefix(before, yamlCtx.lineIndent)
    if (typed !== null) {
      const options: Completion[] = EQUIPMENT_SLOTS.map((k) => ({
        label: k,
        type: 'keyword' as const,
        detail: 'slot',
        apply: `${k}: `,
      }))
      return completionResult(context.pos - typed.length, filterByPrefix(options, typed), /^[A-Za-z][A-Za-z0-9_]*$/)
    }
  }

  // Equipment slot values
  const equipMatch = new RegExp(`^\\s{2,4}(${EQUIPMENT_SLOTS.join('|')}):\\s*([A-Za-z0-9_]*)$`).exec(before)
  if (equipMatch && yamlCtx.parentKey === 'Equipment') {
    const typed = equipMatch[2] ?? ''
    const opts = [...packCompletions(packItemIds, 'pack item')]
    return completionResult(context.pos - typed.length, filterByPrefix(opts, typed), /^[A-Za-z0-9_]*$/)
  }

  // Drops list entries
  const dropMatch = /^\s+-\s+([A-Za-z0-9_]*)$/.exec(before)
  if (dropMatch && yamlCtx.parentKey === 'Drops') {
    const typed = dropMatch[1] ?? ''
    const builtins: Completion[] = DROP_BUILTINS.map((b) => ({
      label: b,
      type: 'keyword' as const,
      apply: DROP_BUILTIN_APPLY[b],
    }))
    const opts = [
      ...filterByPrefix(builtins, typed),
      ...filterByPrefix(packCompletions(packItemIds, 'pack item'), typed),
      ...filterByPrefix(packCompletions(packDroptableIds, 'droptable'), typed),
    ]
    return completionResult(context.pos - typed.length, opts, /^[A-Za-z0-9_]*$/)
  }

  // Mob Skills list: metaskill IDs; lowercase typing also offers inline mechanics
  const listMatch = /^\s+-\s+([A-Za-z0-9_]*)$/.exec(before)

  // AIGoalSelectors / AITargetSelectors — parent-key only (Mythic same-indent lists)
  if (listMatch) {
    if (yamlCtx.parentKey === 'AIGoalSelectors') {
      const typed = listMatch[1] ?? ''
      const options: Completion[] = AI_GOAL_SELECTORS.map((k) => ({
        label: k,
        type: 'keyword' as const,
        detail: 'ai goal',
        apply: AI_GOAL_APPLY[k] ?? k,
      }))
      return completionResult(context.pos - typed.length, filterByPrefix(options, typed), /^[A-Za-z0-9_]*$/)
    }
    if (yamlCtx.parentKey === 'AITargetSelectors') {
      const typed = listMatch[1] ?? ''
      const options: Completion[] = AI_TARGET_SELECTORS.map((k) => ({
        label: k,
        type: 'keyword' as const,
        detail: 'ai target',
        apply: AI_TARGET_APPLY[k] ?? k,
      }))
      return completionResult(context.pos - typed.length, filterByPrefix(options, typed), /^[A-Za-z0-9_]*$/)
    }
  }

  // Mob Skills list (not skill-file Skills: mechanics lists)
  if (listMatch && isSkillsListParent(yamlCtx.parentKey) && fileCategory !== 'skills') {
    const typed = listMatch[1] ?? ''
    const skillOpts = filterByPrefix(packCompletions(packSkillIds, 'skill'), typed)
    if (prefs.mechanics) {
      const mechOpts = filterByPrefix(completions.mechanics, typed)
      return completionResult(
        context.pos - typed.length,
        [...mechOpts, ...skillOpts],
        /^[A-Za-z0-9_]*$/,
      )
    }
    return completionResult(context.pos - typed.length, skillOpts, /^[A-Za-z0-9_]*$/)
  }

  // Conditions block — parent Conditions: is enough
  if (listMatch && isConditionsListParent(yamlCtx.parentKey)) {
    const typed = listMatch[1] ?? ''
    return completionResult(
      context.pos - typed.length,
      filterByPrefix(completions.conditionBlock, typed),
      /^[A-Za-z]*$/,
    )
  }

  // Mob Template: pack mob ids
  const templateMatch = /^\s+Template:\s*([A-Za-z0-9_,\s]*)$/.exec(before)
  if (templateMatch && (fileCategory === 'mobs' || fileCategory === 'other' || fileCategory === undefined)) {
    const raw = templateMatch[1] ?? ''
    const afterComma = raw.includes(',') ? raw.slice(raw.lastIndexOf(',') + 1).trimStart() : raw.trimStart()
    const typed = afterComma
    const from = context.pos - typed.length
    return completionResult(from, filterByPrefix(packCompletions(packMobIds, 'pack mob'), typed), /^[A-Za-z0-9_]*$/)
  }

  // Mob Exclude: body keys (inline or list)
  const excludeMatch = /^\s+Exclude:\s*([A-Za-z0-9_]*)$/.exec(before)
  if (
    excludeMatch &&
    (fileCategory === 'mobs' || fileCategory === 'other' || fileCategory === undefined) &&
    (yamlCtx.lineIndent === 2 || yamlCtx.lineIndent === 0)
  ) {
    const typed = excludeMatch[1] ?? ''
    const opts: Completion[] = MOB_BODY_DEFS.filter((d) => d.key !== 'Template' && d.key !== 'Exclude')
      .map((d) => ({
        label: d.key,
        type: 'keyword' as const,
        apply: d.apply ?? `${d.key}: `,
      }))
    return completionResult(context.pos - typed.length, filterByPrefix(opts, typed), /^[A-Za-z0-9_]*$/)
  }

  const excludeListMatch = /^\s+-\s+([A-Za-z0-9_]*)$/.exec(before)
  if (excludeListMatch && yamlCtx.parentKey === 'Exclude') {
    const typed = excludeListMatch[1] ?? ''
    const opts: Completion[] = MOB_BODY_DEFS.filter((d) => d.key !== 'Template' && d.key !== 'Exclude')
      .map((d) => ({
        label: d.key,
        type: 'keyword' as const,
        apply: d.apply ?? `${d.key}: `,
      }))
    return completionResult(context.pos - typed.length, filterByPrefix(opts, typed), /^[A-Za-z0-9_]*$/)
  }

  // Item Id: material
  const itemIdMatch = /^\s+Id:\s+([A-Za-z0-9_]*)$/.exec(before)
  if (itemIdMatch && fileCategory === 'items') {
    const typed = itemIdMatch[1] ?? ''
    const opts: Completion[] = MATERIALS.map((m) => ({ label: m, type: 'enum' }))
    return completionResult(context.pos - typed.length, filterByPrefix(opts, typed), /^[A-Za-z0-9_]*$/)
  }

  // Random spawn Action / Type / PositionType / UseWorldScaling
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

  const posTypeMatch = /^\s+PositionType:\s+([A-Za-z_]*)$/.exec(before)
  if (posTypeMatch && fileCategory === 'randomspawns') {
    const typed = posTypeMatch[1] ?? ''
    const opts: Completion[] = RANDOMSPAWN_POSITION_TYPES.map((a) => ({ label: a, type: 'enum' }))
    return completionResult(context.pos - typed.length, filterByPrefix(opts, typed), /^[A-Za-z_]*$/)
  }

  const useWsMatch = /^\s+UseWorldScaling:\s+([A-Za-z]*)$/.exec(before)
  if (useWsMatch && fileCategory === 'randomspawns') {
    const typed = useWsMatch[1] ?? ''
    const opts: Completion[] = BOOLEAN_VALUES.map((v) => ({ label: v, type: 'enum' }))
    return completionResult(context.pos - typed.length, filterByPrefix(opts, typed), /^[A-Za-z]*$/)
  }

  return null
}

/** Starter snippets for a new entity / internal name at the category root. */
function entityIdStarterCompletions(
  context: CompletionContext,
  before: string,
  fileCategory: MythicCategory | undefined,
): CompletionResult | null {
  const starters: Partial<
    Record<MythicCategory, { label: string; detail: string; apply: string; boost?: number }[]>
  > = {
    mobs: [
      {
        label: 'MyMob',
        detail: 'Internal name (entity id)',
        apply: 'MyMob:\n  ',
        boost: 10,
      },
      {
        label: 'ZOMBIE',
        detail: 'Vanilla override id (Type optional)',
        apply: 'ZOMBIE:\n  ',
        boost: 5,
      },
    ],
    skills: [
      { label: 'MySkill', detail: 'Internal name (skill id)', apply: 'MySkill:\n  ', boost: 10 },
    ],
    items: [
      { label: 'MyItem', detail: 'Internal name (item id)', apply: 'MyItem:\n  ', boost: 10 },
    ],
    droptables: [
      {
        label: 'MyDropTable',
        detail: 'Internal name (droptable id)',
        apply: 'MyDropTable:\n  ',
        boost: 10,
      },
    ],
    randomspawns: [
      {
        label: 'MyRandomSpawn',
        detail: 'Internal name (randomspawn id)',
        apply: 'MyRandomSpawn:\n  ',
        boost: 10,
      },
    ],
    archetypes: [
      {
        label: 'MyArchetype',
        detail: 'Internal name (archetype id)',
        apply: 'MyArchetype:\n  ',
        boost: 10,
      },
    ],
    reagents: [
      {
        label: 'MyReagent',
        detail: 'Internal name (reagent id)',
        apply: 'MyReagent:\n  ',
        boost: 10,
      },
    ],
    classes: [
      {
        label: 'display',
        detail: 'Class files start with body keys (no wrapper id)',
        apply: 'display:\n    name: ',
        boost: 10,
      },
    ],
    other: [
      {
        label: 'MyMob',
        detail: 'Internal name (entity id)',
        apply: 'MyMob:\n  ',
        boost: 10,
      },
    ],
  }

  const questStarters = [
    {
      label: 'my_quest',
      detail: 'Internal name (quest id)',
      apply: '  my_quest:\n    ',
      boost: 10,
    },
  ]

  if (fileCategory === 'quests') {
    const line = context.state.doc.lineAt(context.pos)
    const lineBefore = line.text.slice(0, context.pos - line.from)
    const lineIndent = lineBefore.match(/^(\s*)/)?.[1]?.length ?? 0
    if (lineIndent > 2) return null
    if (lineBefore.trim() !== '' && !/^\s*[A-Za-z][A-Za-z0-9_-]*$/.test(lineBefore)) return null
    const typed =
      lineBefore.trim() === '' ? '' : (lineBefore.match(/^\s*([A-Za-z][A-Za-z0-9_-]*)$/)?.[1] ?? '')
    const opts = filterByPrefix(
      questStarters.map((s) => ({
        label: s.label,
        type: 'class' as const,
        detail: s.detail,
        apply: lineIndent >= 2 && s.apply.startsWith('  ') ? s.apply.slice(2) : s.apply,
        boost: s.boost,
      })),
      typed,
    )
    return completionResult(context.pos - typed.length, opts, /^[A-Za-z][A-Za-z0-9_-]*$/)
  }

  if (!fileCategory || !starters[fileCategory]) return null
  // Indent 0 only (classes body keys also at 0 — starter still useful on empty file)
  if (before.includes('\n')) return null
  const lineIndent = before.match(/^(\s*)/)?.[1]?.length ?? 0
  if (lineIndent !== 0) return null
  if (before !== '' && !/^[A-Za-z][A-Za-z0-9_-]*$/.test(before)) return null
  // Do not steal body-key completions for classes when typing known class keys
  if (fileCategory === 'classes' && before !== '') {
    const defs = bodyKeyDefsForCategory('classes')
    if (defs.some((d) => d.key.startsWith(before))) return null
  }

  const typed = before
  const opts = filterByPrefix(
    starters[fileCategory]!.map((s) => ({
      label: s.label,
      type: 'class' as const,
      detail: s.detail,
      apply: s.apply,
      boost: s.boost,
    })),
    typed,
  )
  return completionResult(context.pos - typed.length, opts, /^[A-Za-z][A-Za-z0-9_-]*$/)
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
    if (prefs.packIds && (fileCategory === 'mobs' || fileCategory === 'other' || fileCategory === undefined)) {
      const typeKeyMatch = /^\s*Type:\s+([A-Za-z0-9_]*)$/.exec(before)
      if (typeKeyMatch) {
        const typed = typeKeyMatch[1] ?? ''
        const opts = [...entityTypeCompletions, ...packCompletions(packMobIds, 'pack mob')]
        return completionResult(context.pos - typed.length, filterByPrefix(opts, typed), /^[A-Za-z0-9_]*$/)
      }
    }

    const yamlCtx = detectYamlEditContext(context.state.doc, line.number, fileCategory)

    // Skill line mechanics under a Skills: list (any file except mob metaskill lists)
    if (
      prefs.mechanics &&
      isSkillsListParent(yamlCtx.parentKey) &&
      fileCategory === 'skills' &&
      !isMobStructureListParent(yamlCtx.parentKey)
    ) {
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
      if (
        skillLineMatch &&
        fileCategory !== 'mobs' &&
        !isMobStructureListParent(yamlCtx.parentKey)
      ) {
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

/** Body-key structure autocomplete without mechanics, pack IDs, or skill-line catalogs. */
export const STRUCTURE_ONLY_AC_PREFS: AcPrefs = {
  enabled: true,
  mechanics: false,
  targeters: false,
  triggers: false,
  conditions: false,
  packIds: false,
  activateOnTyping: true,
}

export function buildYamlStructureAutocomplete(
  fileCategory?: MythicCategory,
  filePath?: string,
  crucible = false,
) {
  return buildMythicAutocomplete(
    [],
    [],
    [],
    [],
    STRUCTURE_ONLY_AC_PREFS,
    fileCategory,
    crucible,
    [],
    [],
    filePath,
  )
}
