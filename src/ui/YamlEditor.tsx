import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { yaml } from '@codemirror/lang-yaml'
import { Compartment, EditorState } from '@codemirror/state'
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as placeholderExt,
} from '@codemirror/view'
import { tags as t } from '@lezer/highlight'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { buildMythicAutocomplete, buildYamlStructureAutocomplete } from '../core/mythicmobs/autocomplete'
import {
  buildSoapsQuestAutocomplete,
  type SoapsQuestCatalog,
} from '../core/soapsquest/autocomplete'
import { resolveMythicCatalogs } from '../core/mythicmobs/resolveCatalogs'
import type { MechanicAttr } from '../data/mythicmobs/mechanics'
import {
  appendBraceBlock,
  attrSnippet,
  buildMechanicLine,
  insertAttrIntoBraceBlock,
  insertAttrIntoMechanicBlock,
  isEmptySkillLine,
  parseSkillLineContext,
  type SkillLineContext,
} from '../core/mythicmobs/skillLineAttrs'
import type { AcPrefs, MythicCategory, PackIndex, ThemeMode } from '../types'

export type { SkillLineContext }

export interface YamlEditorHandle {
  insert: (text: string) => void
  /** Jump to a quest block in quests.yml (`  quest_id:`). */
  goToQuestBlock: (questId: string) => void
  /** Adds a mechanic (if needed) and inserts an attribute on the current skill line. */
  insertMechanicAttr: (mechanicId: string, attr: MechanicAttr) => void
  /** Inserts an attribute into a targeter's `{…}` block on the current line, or appends the targeter. */
  insertTargeterAttr: (targeterId: string, attr: MechanicAttr) => void
  /** Inserts an attribute into an inline condition's `{…}` block, or appends the condition. */
  insertConditionAttr: (conditionId: string, attr: MechanicAttr) => void
}

interface YamlEditorProps {
  value: string
  theme: ThemeMode
  onChange: (value: string) => void
  placeholder?: string
  /** When provided, enables MythicMobs-aware autocomplete */
  packIndex?: PackIndex
  acPrefs?: AcPrefs
  /** Active file category — scopes YAML key and list completions. */
  fileCategory?: MythicCategory
  /** Active file path — enables packinfo.yml completions. */
  filePath?: string
  /** When true, merges Crucible mechanics/targeters/conditions/triggers into autocomplete. */
  crucibleEnabled?: boolean
  /** When set on quests.yml, suggests tier, difficulty, quest, and material values. */
  soapsQuestCatalog?: SoapsQuestCatalog
  onLineContextChange?: (context: SkillLineContext) => void
}

function yamlColors(theme: ThemeMode) {
  const dark = theme === 'dark'
  return HighlightStyle.define([
    { tag: t.comment, color: dark ? 'rgba(255, 255, 255, 0.38)' : 'rgba(18, 16, 26, 0.42)', fontStyle: 'italic' },
    { tag: t.propertyName, color: dark ? '#c4b5fd' : '#5a4a72' },
    { tag: t.definition(t.propertyName), color: dark ? '#ddd6fe' : '#4c3d66' },
    { tag: t.string, color: dark ? '#e8c4a8' : '#9a3412' },
    { tag: t.number, color: dark ? '#f0ab8e' : '#c2410c' },
    { tag: t.bool, color: dark ? '#8b7aa8' : '#6b5b8a' },
    { tag: t.null, color: dark ? '#8b7aa8' : '#6b5b8a' },
    { tag: t.atom, color: dark ? '#8b7aa8' : '#6b5b8a' },
    { tag: t.keyword, color: dark ? '#c4b5fd' : '#5a4a72' },
    { tag: t.name, color: dark ? '#ddd6fe' : '#4c3d66' },
    { tag: t.labelName, color: dark ? '#c4b5fd' : '#5a4a72' },
    { tag: t.punctuation, color: dark ? 'rgba(255, 255, 255, 0.72)' : 'rgba(18, 16, 26, 0.7)' },
    { tag: t.separator, color: dark ? 'rgba(255, 255, 255, 0.72)' : 'rgba(18, 16, 26, 0.7)' },
    { tag: t.operator, color: dark ? 'rgba(255, 255, 255, 0.72)' : 'rgba(18, 16, 26, 0.7)' },
    { tag: t.meta, color: dark ? '#c4b5fd' : '#5a4a72' },
    { tag: t.processingInstruction, color: dark ? '#8b7aa8' : '#6b5b8a' },
  ])
}

function chromeTheme(theme: ThemeMode) {
  const dark = theme === 'dark'
  return EditorView.theme(
    {
      '&': {
        height: '100%',
        fontSize: '0.88rem',
        backgroundColor: 'transparent',
        color: dark ? 'rgba(255, 255, 255, 0.92)' : 'rgba(18, 16, 26, 0.92)',
      },
      '.cm-scroller': {
        fontFamily: 'Consolas, ui-monospace, monospace',
        lineHeight: '1.5',
      },
      '.cm-content': {
        caretColor: dark ? '#ddd6fe' : '#5a4a72',
        padding: '8px 0',
      },
      '.cm-gutters': {
        backgroundColor: 'transparent',
        border: 'none',
        color: dark ? 'rgba(255, 255, 255, 0.32)' : 'rgba(18, 16, 26, 0.38)',
      },
      '.cm-activeLine': {
        backgroundColor: dark ? 'rgba(139, 122, 168, 0.12)' : 'rgba(107, 91, 138, 0.08)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'transparent',
        color: dark ? '#c4b5fd' : '#5a4a72',
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
        backgroundColor: dark ? 'rgba(107, 91, 138, 0.45)' : 'rgba(107, 91, 138, 0.22)',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: dark ? '#c4b5fd' : '#5a4a72',
      },
      '&.cm-focused': {
        outline: 'none',
      },
    },
    { dark },
  )
}

function themeExtensions(theme: ThemeMode) {
  return [chromeTheme(theme), syntaxHighlighting(yamlColors(theme))]
}

export const YamlEditor = forwardRef<YamlEditorHandle, YamlEditorProps>(
  function YamlEditor({
    value,
    theme,
    onChange,
    placeholder,
    packIndex,
    acPrefs,
    fileCategory,
    filePath,
    crucibleEnabled = false,
    soapsQuestCatalog,
    onLineContextChange,
  }, ref) {
    const parentRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)
    const themeRef = useRef(new Compartment())
    const acRef = useRef(new Compartment())
    const sqAcRef = useRef(new Compartment())
    const onChangeRef = useRef(onChange)
    const onLineContextRef = useRef(onLineContextChange)
    onChangeRef.current = onChange
    onLineContextRef.current = onLineContextChange
    const fileCategoryRef = useRef(fileCategory)
    fileCategoryRef.current = fileCategory
    const filePathRef = useRef(filePath)
    filePathRef.current = filePath
    const crucibleRef = useRef(crucibleEnabled)
    crucibleRef.current = crucibleEnabled

    function autocompleteExtensions() {
      if (packIndex && acPrefs?.enabled !== false) {
        return buildMythicAutocomplete(
          packIndex.mobIds,
          packIndex.itemIds,
          packIndex.skillIds,
          packIndex.droptableIds,
          acPrefs,
          fileCategoryRef.current,
          crucibleRef.current,
          packIndex.equipmentSetIds,
          packIndex.augmentTypeIds,
          filePathRef.current,
        )
      }
      if (fileCategoryRef.current) {
        return buildYamlStructureAutocomplete(
          fileCategoryRef.current,
          filePathRef.current,
          crucibleRef.current,
        )
      }
      return []
    }

    function publishLineContext(view: EditorView) {
      const line = view.state.doc.lineAt(view.state.selection.main.from)
      const mechanics = resolveMythicCatalogs(crucibleRef.current).mechanics
      onLineContextRef.current?.(parseSkillLineContext(line.text, mechanics))
    }

    useImperativeHandle(ref, () => ({
      insert(text: string) {
        const view = viewRef.current
        if (!view) return
        const { from, to } = view.state.selection.main
        view.dispatch({
          changes: { from, to, insert: text },
          selection: { anchor: from + text.length },
        })
        view.focus()
        publishLineContext(view)
      },
      goToQuestBlock(questId: string) {
        const view = viewRef.current
        if (!view || !questId.trim()) return
        const escaped = questId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const pattern = new RegExp(`^  ${escaped}:\\s*(?:#.*)?$`)
        for (let i = 1; i <= view.state.doc.lines; i += 1) {
          const line = view.state.doc.line(i)
          if (!pattern.test(line.text)) continue
          view.dispatch({
            selection: { anchor: line.from },
            effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
          })
          view.focus()
          publishLineContext(view)
          return
        }
      },
      insertMechanicAttr(mechanicId: string, attr: MechanicAttr) {
        const view = viewRef.current
        if (!view) return
        const activeCatalogs = resolveMythicCatalogs(crucibleRef.current)
        const mechanic = activeCatalogs.mechanics.find((m) => m.id === mechanicId)
        if (!mechanic) return

        const { from } = view.state.selection.main
        const line = view.state.doc.lineAt(from)
        const lineText = line.text

        const ctx = parseSkillLineContext(lineText, activeCatalogs.mechanics)
        if (ctx.mechanicId === mechanic.id && ctx.presentAttrs.includes(attr.name.toLowerCase())) {
          return
        }

        const updated = insertAttrIntoMechanicBlock(lineText, mechanic, attr)
        if (updated) {
          view.dispatch({
            changes: { from: line.from, to: line.to, insert: updated },
            selection: { anchor: line.from + updated.length },
          })
          view.focus()
          publishLineContext(view)
          return
        }

        const names = [mechanic.id, ...mechanic.aliases]
          .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('|')
        const bareMatch = new RegExp(`^(\\s+-\\s+(?:${names}))(?=\\s|@|~|$)`, 'i').exec(lineText)
        if (bareMatch && !/\{/.test(lineText)) {
          const next = `${bareMatch[1]}{${attrSnippet(attr)}}${lineText.slice(bareMatch[1].length)}`
          view.dispatch({
            changes: { from: line.from, to: line.to, insert: next },
            selection: { anchor: line.from + next.length },
          })
          view.focus()
          publishLineContext(view)
          return
        }

        const mechanicLine = buildMechanicLine(mechanic, attr)
        if (isEmptySkillLine(lineText)) {
          const next = `  - ${mechanicLine}`
          view.dispatch({
            changes: { from: line.from, to: line.to, insert: next },
            selection: { anchor: line.from + next.length },
          })
        } else {
          const indent = lineText.match(/^(\s*)/)?.[1] ?? ''
          const insert = `\n${indent}  - ${mechanicLine}`
          view.dispatch({
            changes: { from: line.to, to: line.to, insert },
            selection: { anchor: line.to + insert.length },
          })
        }
        view.focus()
        publishLineContext(view)
      },
      insertTargeterAttr(targeterId: string, attr: MechanicAttr) {
        const view = viewRef.current
        if (!view) return

        const { from } = view.state.selection.main
        const line = view.state.doc.lineAt(from)
        const lineText = line.text
        const ctx = parseSkillLineContext(lineText, resolveMythicCatalogs(crucibleRef.current).mechanics)
        const existing = ctx.targeters.get(targeterId.toLowerCase()) ?? []
        if (existing.includes(attr.name.toLowerCase())) return

        const updated =
          insertAttrIntoBraceBlock(lineText, '@', targeterId, attr) ??
          appendBraceBlock(lineText, '@', targeterId, attr)

        view.dispatch({
          changes: { from: line.from, to: line.to, insert: updated },
          selection: { anchor: line.from + updated.length },
        })
        view.focus()
        publishLineContext(view)
      },
      insertConditionAttr(conditionId: string, attr: MechanicAttr) {
        const view = viewRef.current
        if (!view) return

        const { from } = view.state.selection.main
        const line = view.state.doc.lineAt(from)
        const lineText = line.text
        const ctx = parseSkillLineContext(lineText, resolveMythicCatalogs(crucibleRef.current).mechanics)
        const existing = ctx.conditions.get(conditionId.toLowerCase()) ?? []
        if (existing.includes(attr.name.toLowerCase())) return

        const updated =
          insertAttrIntoBraceBlock(lineText, '?', conditionId, attr) ??
          appendBraceBlock(lineText, '?', conditionId, attr)

        view.dispatch({
          changes: { from: line.from, to: line.to, insert: updated },
          selection: { anchor: line.from + updated.length },
        })
        view.focus()
        publishLineContext(view)
      },
    }))

    useEffect(() => {
      if (!parentRef.current) return

      const state = EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          history(),
          yaml(),
          indentUnit.of('  '),
          EditorState.tabSize.of(2),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          placeholderExt(placeholder ?? ''),
          themeRef.current.of(themeExtensions(theme)),
          acRef.current.of(autocompleteExtensions()),
          sqAcRef.current.of(
            soapsQuestCatalog ? buildSoapsQuestAutocomplete(soapsQuestCatalog) : [],
          ),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString())
            }
            if (update.docChanged || update.selectionSet) {
              publishLineContext(update.view)
            }
          }),
        ],
      })

      const view = new EditorView({ state, parent: parentRef.current })
      viewRef.current = view
      publishLineContext(view)
      return () => {
        view.destroy()
        viewRef.current = null
      }
      // Created once. Value/theme updates are handled below.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
      const view = viewRef.current
      if (!view) return
      const current = view.state.doc.toString()
      if (current === value) return
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      })
    }, [value])

    useEffect(() => {
      const view = viewRef.current
      if (!view) return
      view.dispatch({
        effects: themeRef.current.reconfigure(themeExtensions(theme)),
      })
    }, [theme])

    useEffect(() => {
      const view = viewRef.current
      if (!view) return
      view.dispatch({
        effects: acRef.current.reconfigure(autocompleteExtensions()),
      })
    }, [packIndex, acPrefs, fileCategory, crucibleEnabled, filePath])

    useEffect(() => {
      const view = viewRef.current
      if (!view) return
      view.dispatch({
        effects: sqAcRef.current.reconfigure(
          soapsQuestCatalog ? buildSoapsQuestAutocomplete(soapsQuestCatalog) : [],
        ),
      })
    }, [soapsQuestCatalog])

    return <div className="yaml-editor" ref={parentRef} />
  },
)
