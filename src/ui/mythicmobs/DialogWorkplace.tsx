import { useCallback, useMemo, useRef, useState } from 'react'
import { compileDialogGraph, createQuestOfferGraph } from '../../core/mythicmobs/dialogs/compile'
import {
  createBubble,
  createEmptyGraph,
  newOptionKey,
  sanitizeDialogId,
  type DialogBubble,
  type DialogGraph,
  type DialogOption,
} from '../../core/mythicmobs/dialogs/types'
import { resolveCreateFolder } from '../../core/mythicmobs/createTarget'
import type { FileRecord, PackIndex } from '../../types'
import { DialogBody, DialogFooter, DialogHeader, DialogShell } from '../DialogShell'
import { RemoveButton } from '../RemoveButton'
import { Switch } from '../Switch'

interface DialogWorkplaceProps {
  files: FileRecord[]
  packIndex: PackIndex
  onClose: () => void
  onApply: (writes: { path: string; content: string; mode: 'create' | 'append' }[]) => void
}

type ToolMode = 'select' | 'connect'

interface DragState {
  bubbleId: string
  ox: number
  oy: number
  startX: number
  startY: number
  snapshot: DialogGraph
}

interface ConnectDrag {
  fromBubbleId: string
  optionKey: string
  x: number
  y: number
}

interface HistoryEntry {
  graph: DialogGraph
}

function cloneGraph(g: DialogGraph): DialogGraph {
  return structuredClone(g)
}

export function DialogWorkplace({ files, packIndex, onClose, onApply }: DialogWorkplaceProps) {
  const [graph, setGraph] = useState<DialogGraph>(() => createQuestOfferGraph())
  const [selectedId, setSelectedId] = useState<string | null>(() => graph.entryBubbleId)
  const [tool, setTool] = useState<ToolMode>('select')
  const [showYaml, setShowYaml] = useState(false)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [connectDrag, setConnectDrag] = useState<ConnectDrag | null>(null)
  const [panning, setPanning] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const [past, setPast] = useState<HistoryEntry[]>([])
  const [future, setFuture] = useState<HistoryEntry[]>([])
  const [attachMobId, setAttachMobId] = useState('')
  const [status, setStatus] = useState('Drag bubbles freely. Connect options to build branches.')
  const canvasRef = useRef<HTMLDivElement>(null)

  const selected = graph.nodes.find((n) => n.id === selectedId) ?? null
  const compiled = useMemo(() => compileDialogGraph(graph), [graph])

  const pushHistory = useCallback((next: DialogGraph) => {
    setPast((p) => [...p.slice(-39), { graph: cloneGraph(graph) }])
    setFuture([])
    setGraph(next)
  }, [graph])

  const undo = () => {
    const prev = past[past.length - 1]
    if (!prev) return
    setPast((p) => p.slice(0, -1))
    setFuture((f) => [...f, { graph: cloneGraph(graph) }])
    setGraph(cloneGraph(prev.graph))
  }

  const redo = () => {
    const nxt = future[future.length - 1]
    if (!nxt) return
    setFuture((f) => f.slice(0, -1))
    setPast((p) => [...p, { graph: cloneGraph(graph) }])
    setGraph(cloneGraph(nxt.graph))
  }

  const updateBubble = (id: string, patch: Partial<DialogBubble>) => {
    pushHistory({
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    })
  }

  /** Live text edits without flooding undo history. */
  const patchBubbleLive = (id: string, patch: Partial<DialogBubble>) => {
    setGraph((g) => ({
      ...g,
      nodes: g.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    }))
  }

  const addBubble = () => {
    const idBase = `Screen${graph.nodes.length + 1}`
    const used = new Set(graph.nodes.map((n) => n.dialogId.toLowerCase()))
    let dialogId = sanitizeDialogId(idBase)
    let i = 2
    while (used.has(dialogId.toLowerCase())) {
      dialogId = sanitizeDialogId(`${idBase}_${i}`)
      i += 1
    }
    const bubble = createBubble(180 - pan.x / scale, 160 - pan.y / scale, dialogId)
    const next = { ...graph, nodes: [...graph.nodes, bubble] }
    if (!next.entryBubbleId) next.entryBubbleId = bubble.id
    pushHistory(next)
    setSelectedId(bubble.id)
    setStatus('Bubble added. Edit it in the popout, then connect options.')
  }

  const addOption = () => {
    if (!selected) {
      setStatus('Select a bubble first, then add an option.')
      return
    }
    const keys = selected.options.map((o) => o.key)
    const key = newOptionKey('Option', keys)
    const opt: DialogOption = { key, label: `<green>${key}`, width: 150 }
    updateBubble(selected.id, { options: [...selected.options, opt] })
    setStatus('Option added. Drag from its port to another bubble to connect.')
  }

  const deleteSelected = () => {
    if (!selected) return
    const id = selected.id
    pushHistory({
      ...graph,
      entryBubbleId: graph.entryBubbleId === id ? null : graph.entryBubbleId,
      nodes: graph.nodes.filter((n) => n.id !== id),
      edges: graph.edges.filter((e) => e.fromBubbleId !== id && e.toBubbleId !== id),
    })
    setSelectedId(null)
    setStatus('Bubble removed.')
  }

  const clientToCanvas = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (clientX - rect.left - pan.x) / scale,
      y: (clientY - rect.top - pan.y) / scale,
    }
  }

  const onBubblePointerDown = (e: React.PointerEvent, bubble: DialogBubble) => {
    if (tool === 'connect') return
    e.stopPropagation()
    setSelectedId(bubble.id)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    setDrag({
      bubbleId: bubble.id,
      ox: bubble.x,
      oy: bubble.y,
      startX: e.clientX,
      startY: e.clientY,
      snapshot: cloneGraph(graph),
    })
  }

  const onCanvasPointerMove = (e: React.PointerEvent) => {
    if (panning) {
      setPan({
        x: panning.panX + (e.clientX - panning.x),
        y: panning.panY + (e.clientY - panning.y),
      })
      return
    }
    if (drag) {
      const dx = (e.clientX - drag.startX) / scale
      const dy = (e.clientY - drag.startY) / scale
      setGraph((g) => ({
        ...g,
        nodes: g.nodes.map((n) =>
          n.id === drag.bubbleId ? { ...n, x: drag.ox + dx, y: drag.oy + dy } : n,
        ),
      }))
      return
    }
    if (connectDrag) {
      const pt = clientToCanvas(e.clientX, e.clientY)
      setConnectDrag({ ...connectDrag, x: pt.x, y: pt.y })
    }
  }

  const onCanvasPointerUp = (e: React.PointerEvent) => {
    if (panning) {
      setPanning(null)
      return
    }
    if (drag) {
      const moved =
        Math.abs(e.clientX - drag.startX) > 3 || Math.abs(e.clientY - drag.startY) > 3
      if (moved) {
        setPast((p) => [...p.slice(-39), { graph: drag.snapshot }])
        setFuture([])
      }
      setDrag(null)
      return
    }
    if (connectDrag) {
      const pt = clientToCanvas(e.clientX, e.clientY)
      const hit = graph.nodes.find(
        (n) =>
          n.id !== connectDrag.fromBubbleId &&
          pt.x >= n.x &&
          pt.x <= n.x + 220 &&
          pt.y >= n.y &&
          pt.y <= n.y + 120,
      )
      if (hit) {
        const exists = graph.edges.some(
          (ed) =>
            ed.fromBubbleId === connectDrag.fromBubbleId &&
            ed.optionKey === connectDrag.optionKey,
        )
        const edges = exists
          ? graph.edges.map((ed) =>
              ed.fromBubbleId === connectDrag.fromBubbleId &&
              ed.optionKey === connectDrag.optionKey
                ? { ...ed, toBubbleId: hit.id }
                : ed,
            )
          : [
              ...graph.edges,
              {
                id: crypto.randomUUID(),
                fromBubbleId: connectDrag.fromBubbleId,
                optionKey: connectDrag.optionKey,
                toBubbleId: hit.id,
              },
            ]
        const from = graph.nodes.find((n) => n.id === connectDrag.fromBubbleId)
        const nodes = graph.nodes.map((n) => {
          if (n.id !== connectDrag.fromBubbleId) return n
          return {
            ...n,
            options: n.options.map((o) =>
              o.key === connectDrag.optionKey ? { ...o, isEnd: false, skillId: undefined } : o,
            ),
          }
        })
        pushHistory({ ...graph, nodes, edges })
        setStatus(`Connected ${from?.dialogId ?? 'bubble'} → ${hit.dialogId}.`)
      } else {
        // Drop on empty canvas: create bubble + connect
        const dialogId = sanitizeDialogId(`Screen${graph.nodes.length + 1}`)
        const bubble = createBubble(pt.x - 40, pt.y - 30, dialogId)
        const edges = [
          ...graph.edges.filter(
            (ed) =>
              !(
                ed.fromBubbleId === connectDrag.fromBubbleId &&
                ed.optionKey === connectDrag.optionKey
              ),
          ),
          {
            id: crypto.randomUUID(),
            fromBubbleId: connectDrag.fromBubbleId,
            optionKey: connectDrag.optionKey,
            toBubbleId: bubble.id,
          },
        ]
        const nodes = [
          ...graph.nodes.map((n) => {
            if (n.id !== connectDrag.fromBubbleId) return n
            return {
              ...n,
              options: n.options.map((o) =>
                o.key === connectDrag.optionKey ? { ...o, isEnd: false } : o,
              ),
            }
          }),
          bubble,
        ]
        pushHistory({ ...graph, nodes, edges })
        setSelectedId(bubble.id)
        setStatus('Created and connected a new bubble.')
      }
      setConnectDrag(null)
      setTool('select')
    }
  }

  const startConnect = (bubbleId: string, optionKey: string, e: React.PointerEvent) => {
    e.stopPropagation()
    const pt = clientToCanvas(e.clientX, e.clientY)
    setTool('connect')
    setConnectDrag({ fromBubbleId: bubbleId, optionKey, x: pt.x, y: pt.y })
  }

  const deleteEdgeAt = (edgeId: string) => {
    pushHistory({ ...graph, edges: graph.edges.filter((e) => e.id !== edgeId) })
    setStatus('Connection removed.')
  }

  const saveToPack = () => {
    const dialogFolder = resolveCreateFolder('dialogs', files, '')
    const skillFolder = resolveCreateFolder('skills', files, '')
    const dialogPath = `${dialogFolder}/${compiled.dialogFileName}`
    const skillsPath = `${skillFolder}/${compiled.skillsFileName}`
    const writes: { path: string; content: string; mode: 'create' | 'append' }[] = [
      { path: dialogPath, content: compiled.dialogYaml, mode: 'create' },
    ]
    if (compiled.skillsYaml.includes('showdialog')) {
      writes.push({ path: skillsPath, content: compiled.skillsYaml, mode: 'create' })
    }

    if (attachMobId.trim() && compiled.attachSkillLine) {
      const mobFile = files.find(
        (f) => f.category === 'mobs' && f.ids.some((id) => id === attachMobId.trim()),
      )
      if (mobFile) {
        const line = `  - ${compiled.attachSkillLine}`
        let content = mobFile.content
        if (/^\s*Skills:\s*$/m.test(content) || /\n\s*Skills:\s*\n/m.test(content)) {
          content = content.replace(/(Skills:\s*\n)/, `$1${line}\n`)
        } else {
          content = content.replace(
            new RegExp(`^(${attachMobId.trim()}:\\s*\\n)`, 'm'),
            `$1  Skills:\n${line}\n`,
          )
        }
        writes.push({ path: mobFile.path, content, mode: 'create' })
      } else {
        setStatus(`Mob ${attachMobId.trim()} not found. Saved dialogs without attach.`)
      }
    }

    onApply(writes)
    setStatus(`Saved ${compiled.dialogFileName}. Save the pack to write to disk.`)
  }

  const edgePaths = graph.edges.map((edge) => {
    const from = graph.nodes.find((n) => n.id === edge.fromBubbleId)
    const to = graph.nodes.find((n) => n.id === edge.toBubbleId)
    if (!from || !to) return null
    const optIndex = Math.max(0, from.options.findIndex((o) => o.key === edge.optionKey))
    const x1 = from.x + 220
    const y1 = from.y + 56 + optIndex * 22
    const x2 = to.x
    const y2 = to.y + 40
    const mx = (x1 + x2) / 2
    return { edge, d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}` }
  }).filter(Boolean) as { edge: (typeof graph.edges)[0]; d: string }[]

  return (
    <DialogShell size="xl" className="dialog-workplace" labelledBy="dialog-workplace-title" onClose={onClose}>
      <DialogHeader
        title="Dialog workplace"
        titleId="dialog-workplace-title"
        lead="Build branching Paper dialogs. Drag freely, connect options, then save into Dialogs/."
        onClose={onClose}
      />
      <DialogBody className="dw-body">
        <aside className="dw-toolbox" aria-label="Dialog tools">
          <button type="button" className="dw-tool" onClick={addBubble}>Add bubble</button>
          <button type="button" className="dw-tool" onClick={addOption} disabled={!selected}>Add option</button>
          <button
            type="button"
            className={`dw-tool ${tool === 'connect' ? 'active' : ''}`}
            onClick={() => setTool((t) => (t === 'connect' ? 'select' : 'connect'))}
          >
            {tool === 'connect' ? 'Connecting…' : 'Connect mode'}
          </button>
          <button type="button" className="dw-tool" onClick={deleteSelected} disabled={!selected}>Delete bubble</button>
          <button type="button" className="dw-tool" onClick={undo} disabled={past.length === 0}>Undo</button>
          <button type="button" className="dw-tool" onClick={redo} disabled={future.length === 0}>Redo</button>
          <button type="button" className="dw-tool" onClick={() => { pushHistory(createEmptyGraph()); setSelectedId(null) }}>
            Clear canvas
          </button>
          <button type="button" className="dw-tool" onClick={() => { const g = createQuestOfferGraph(); pushHistory(g); setSelectedId(g.entryBubbleId) }}>
            Quest template
          </button>
          <hr className="dw-sep" />
          <label className="dw-field">
            Attach to mob
            <select value={attachMobId} onChange={(e) => setAttachMobId(e.target.value)}>
              <option value="">None</option>
              {packIndex.mobIds.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </label>
          <p className="dw-hint">Premium + Paper 1.21.6+. Filenames must contain &quot;dialog&quot;.</p>
          <p className="dw-status" role="status">{status}</p>
        </aside>

        <div
          ref={canvasRef}
          className="dw-canvas"
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
          onPointerLeave={() => { setDrag(null); setPanning(null) }}
          onPointerDown={(e) => {
            if (e.button === 1 || e.altKey || (e.button === 0 && e.target === canvasRef.current)) {
              setPanning({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y })
              setSelectedId(null)
            }
          }}
          onWheel={(e) => {
            e.preventDefault()
            const factor = e.deltaY > 0 ? 0.92 : 1.08
            setScale((s) => Math.min(1.8, Math.max(0.45, s * factor)))
          }}
        >
          <div
            className="dw-world"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
          >
            <svg className="dw-edges" aria-hidden>
              {edgePaths.map(({ edge, d }) => (
                <g key={edge.id}>
                  <path
                    d={d}
                    className="dw-edge"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      deleteEdgeAt(edge.id)
                    }}
                  />
                </g>
              ))}
              {connectDrag ? (
                <path
                  className="dw-edge dw-edge-preview"
                  d={`M ${
                    (graph.nodes.find((n) => n.id === connectDrag.fromBubbleId)?.x ?? 0) + 220
                  } ${
                    (graph.nodes.find((n) => n.id === connectDrag.fromBubbleId)?.y ?? 0) + 56
                  } L ${connectDrag.x} ${connectDrag.y}`}
                />
              ) : null}
            </svg>

            {graph.nodes.map((bubble) => {
              const isSel = bubble.id === selectedId
              const isEntry = bubble.id === graph.entryBubbleId
              return (
                <div
                  key={bubble.id}
                  className={`dw-bubble ${isSel ? 'selected' : ''} ${isEntry ? 'entry' : ''}`}
                  style={{ left: bubble.x, top: bubble.y }}
                  onPointerDown={(e) => onBubblePointerDown(e, bubble)}
                >
                  <div className="dw-bubble-head">
                    <span className="dw-bubble-id">{bubble.dialogId}</span>
                    {isEntry ? <span className="dw-badge">Entry</span> : null}
                  </div>
                  <p className="dw-bubble-title">{bubble.title.replace(/<[^>]+>/g, '')}</p>
                  <p className="dw-bubble-preview">
                    {bubble.body[0]?.type === 'text'
                      ? bubble.body[0].message.replace(/<[^>]+>/g, '')
                      : 'Item body'}
                  </p>
                  <ul className="dw-ports">
                    {bubble.options.map((opt) => (
                      <li key={opt.key}>
                        <button
                          type="button"
                          className="dw-port"
                          title="Drag to connect"
                          onPointerDown={(e) => startConnect(bubble.id, opt.key, e)}
                        >
                          {opt.label.replace(/<[^>]+>/g, '') || opt.key}
                        </button>
                      </li>
                    ))}
                  </ul>

                  {isSel ? (
                    <div
                      className="dw-popout"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="dw-popout-caret" aria-hidden />
                      <label>
                        Dialog id
                        <input
                          value={bubble.dialogId}
                          onChange={(e) =>
                            patchBubbleLive(bubble.id, { dialogId: sanitizeDialogId(e.target.value) })
                          }
                        />
                      </label>
                      <label>
                        Title
                        <input
                          value={bubble.title}
                          onChange={(e) => patchBubbleLive(bubble.id, { title: e.target.value })}
                        />
                      </label>
                      <label>
                        Body text
                        <textarea
                          rows={3}
                          value={
                            bubble.body[0]?.type === 'text' ? bubble.body[0].message : ''
                          }
                          onChange={(e) =>
                            patchBubbleLive(bubble.id, {
                              body: [{ type: 'text', message: e.target.value, width: 280 }],
                            })
                          }
                        />
                      </label>
                      <div className="dw-popout-row">
                        <span>Entry screen</span>
                        <Switch
                          checked={graph.entryBubbleId === bubble.id}
                          onChange={(on) =>
                            pushHistory({ ...graph, entryBubbleId: on ? bubble.id : null })
                          }
                          aria-label="Mark as entry screen"
                        />
                      </div>
                      <div className="dw-options-edit">
                        <span className="dw-options-label">Options</span>
                        {bubble.options.map((opt, oi) => (
                          <div key={opt.key} className="dw-option-row">
                            <input
                              value={opt.label}
                              onChange={(e) => {
                                const options = bubble.options.map((o, i) =>
                                  i === oi ? { ...o, label: e.target.value } : o,
                                )
                                patchBubbleLive(bubble.id, { options })
                              }}
                            />
                            <RemoveButton
                              size="sm"
                              aria-label={`Remove option ${opt.key}`}
                              onClick={() => {
                                pushHistory({
                                  ...graph,
                                  nodes: graph.nodes.map((n) =>
                                    n.id === bubble.id
                                      ? { ...n, options: n.options.filter((o) => o.key !== opt.key) }
                                      : n,
                                  ),
                                  edges: graph.edges.filter(
                                    (ed) =>
                                      !(ed.fromBubbleId === bubble.id && ed.optionKey === opt.key),
                                  ),
                                })
                              }}
                            />
                          </div>
                        ))}
                        <button type="button" className="dw-mini" onClick={addOption}>Add option</button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
          {graph.nodes.length === 0 ? (
            <div className="dw-empty">
              <p>Add a bubble to start your dialog.</p>
              <button type="button" onClick={addBubble}>Add bubble</button>
            </div>
          ) : null}
        </div>

        {showYaml ? (
          <aside className="dw-yaml" aria-label="YAML preview">
            <h3 className="dw-yaml-title">Live YAML</h3>
            <pre>{compiled.dialogYaml}</pre>
            {compiled.skillsYaml.includes('showdialog') ? (
              <>
                <h3 className="dw-yaml-title">Link skills</h3>
                <pre>{compiled.skillsYaml}</pre>
              </>
            ) : null}
          </aside>
        ) : null}
      </DialogBody>
      <DialogFooter className="dw-footer">
        <button type="button" className="ghost" onClick={() => setShowYaml((v) => !v)}>
          {showYaml ? 'Hide YAML' : 'Preview YAML'}
        </button>
        <button type="button" className="ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="primary" onClick={saveToPack}>Save to pack</button>
      </DialogFooter>
    </DialogShell>
  )
}
