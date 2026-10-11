/** Editor graph for Mythic Paper Dialogs (Premium, Paper 1.21.6+). */

export type DialogAfterAction = 'CLOSE' | 'NONE' | 'WAIT_FOR_RESPONSE'

export interface DialogBodyText {
  type: 'text'
  message: string
  width?: number
}

export interface DialogBodyItem {
  type: 'item'
  item: string
  width?: number
  height?: number
  showTooltip?: boolean
}

export type DialogBodyElement = DialogBodyText | DialogBodyItem

export interface DialogOption {
  /** Stable key used for edges and glue skill names */
  key: string
  label: string
  tooltip?: string
  width?: number
  /**
   * Pack skill to run when the button is clicked.
   * If the button is also linked to another screen, both run (skill first, then showdialog).
   */
  skillId?: string
  /** Marks this option as an end (no next bubble); button has no skill or close only */
  isEnd?: boolean
}

/** Optional Mythic ExitButton block */
export interface DialogExitButton {
  label: string
  width?: number
  skillId?: string
}

export interface DialogBubble {
  id: string
  /** Mythic dialog definition id written to YAML */
  dialogId: string
  x: number
  y: number
  title: string
  externalTitle?: string
  canClose: boolean
  pause: boolean
  afterAction: DialogAfterAction
  columns: number
  body: DialogBodyElement[]
  options: DialogOption[]
  exitButton?: DialogExitButton | null
}

export interface DialogEdge {
  id: string
  fromBubbleId: string
  optionKey: string
  toBubbleId: string
}

export interface DialogGraph {
  /** Stable id for this conversation graph (used in file names) */
  graphId: string
  entryBubbleId: string | null
  nodes: DialogBubble[]
  edges: DialogEdge[]
}

export interface DialogCompileResult {
  dialogYaml: string
  skillsYaml: string
  dialogFileName: string
  skillsFileName: string
  entryDialogId: string | null
  /** Suggested mob skill line to open the entry dialog */
  attachSkillLine: string | null
}

export function newOptionKey(label: string, existing: string[]): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'option'
  let key = base
  let n = 2
  const used = new Set(existing.map((k) => k.toLowerCase()))
  while (used.has(key.toLowerCase())) {
    key = `${base}_${n}`
    n += 1
  }
  return key
}

export function createEmptyGraph(graphId = 'Conversation'): DialogGraph {
  const bubbleId = crypto.randomUUID()
  const dialogId = sanitizeDialogId(graphId)
  return {
    graphId: dialogId,
    entryBubbleId: bubbleId,
    nodes: [
      {
        id: bubbleId,
        dialogId,
        x: 120,
        y: 140,
        title: '<gold>New dialog',
        canClose: true,
        pause: false,
        afterAction: 'CLOSE',
        columns: 1,
        body: [{ type: 'text', message: '<gray>Write your message here.', width: 280 }],
        options: [
          { key: 'continue', label: '<green>Continue', width: 150, isEnd: true },
        ],
      },
    ],
    edges: [],
  }
}

export function sanitizeDialogId(raw: string): string {
  const cleaned =
    raw
      .trim()
      .replace(/[^A-Za-z0-9_\-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'Dialog'
  return cleaned
}

export function createBubble(x: number, y: number, dialogId: string): DialogBubble {
  return {
    id: crypto.randomUUID(),
    dialogId: sanitizeDialogId(dialogId),
    x,
    y,
    title: `<gold>${dialogId}`,
    canClose: true,
    pause: false,
    afterAction: 'CLOSE',
    columns: 1,
    body: [{ type: 'text', message: '<gray>…', width: 256 }],
    options: [],
  }
}
