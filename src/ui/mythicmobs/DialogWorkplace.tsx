import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { compileDialogGraph, createQuestOfferGraph } from '../../core/mythicmobs/dialogs/compile'
import {
  createBubble,
  createEmptyGraph,
  newOptionKey,
  sanitizeDialogId,
  type DialogAfterAction,
  type DialogBubble,
  type DialogGraph,
  type DialogOption,
} from '../../core/mythicmobs/dialogs/types'

function stripMm(text: string): string {
  return text.replace(/<[^>]+>/g, '')
}

function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={
          locked
            ? 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v10H6V11Z'
            : 'M7 11V8a5 5 0 0 1 9.9-1M6 11h12v10H6V11Z'
        }
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
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

const BUBBLE_W = 228
/** Must match .dw-dot size/offset in App.css */
const DOT_SIZE = 14
const DOT_TOP = 52
const DOT_OUTSET = 8
const DOT_CENTER_Y = DOT_TOP + DOT_SIZE / 2
const DOT_OUT_X = BUBBLE_W + DOT_OUTSET - DOT_SIZE / 2
const DOT_IN_X = -DOT_OUTSET + DOT_SIZE / 2

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
  /** Created when the source bubble has no free option left */
  newOption?: DialogOption
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
  const [showYaml, setShowYaml] = useState(false)
  const [yamlExpanded, setYamlExpanded] = useState(false)
  const yamlExpandedRef = useRef(false)
  yamlExpandedRef.current = yamlExpanded
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [connectDrag, setConnectDrag] = useState<ConnectDrag | null>(null)
  const [panning, setPanning] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [past, setPast] = useState<HistoryEntry[]>([])
  const [future, setFuture] = useState<HistoryEntry[]>([])
  const [attachMobId, setAttachMobId] = useState('')
  /** Option chosen on a bubble before clicking the out-dot (so the edge maps to the right button). */
  const [preferredOption, setPreferredOption] = useState<{ bubbleId: string; key: string } | null>(null)
  /** Bubbles whose settings stay open (multiple locks allowed). */
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [status, setStatus] = useState(
    'Double-click empty canvas to add a bubble. Drag to pan. Use dots to connect. Scroll to zoom.',
  )
  const canvasRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const panRef = useRef(pan)
  const scaleRef = useRef(scale)
  const panRafRef = useRef(0)
  const connectRef = useRef<ConnectDrag | null>(null)
  const selectedIdRef = useRef(selectedId)
  selectedIdRef.current = selectedId
  const graphRef = useRef(graph)
  graphRef.current = graph
  const deleteBubbleRef = useRef<(id: string) => void>(() => {})

  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false
    return Boolean(
      target.closest(
        '.dw-bubble, .dw-dot, .dw-popout, .dw-option-chip, .dw-edge-group, .dw-empty button',
      ),
    )
  }

  const setConnect = (next: ConnectDrag | null) => {
    connectRef.current = next
    setConnectDrag(next)
  }

  const applyWorldTransform = useCallback((x: number, y: number, s: number) => {
    panRef.current = { x, y }
    scaleRef.current = s
    const el = worldRef.current
    if (!el) return
    el.style.transformOrigin = '0 0'
    // CSS zoom keeps HTML text sharp; transform scale rasterizes and blurs when zoomed.
    const useZoom = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('zoom', '1')
    if (useZoom) {
      el.style.transform = `translate3d(${x / s}px, ${y / s}px, 0)`
      el.style.setProperty('zoom', String(s))
    } else {
      el.style.removeProperty('zoom')
      el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`
    }
  }, [])

  useEffect(() => {
    if (panning) return
    applyWorldTransform(pan.x, pan.y, scale)
  }, [pan, scale, panning, applyWorldTransform])

  useEffect(() => {
    const isTypingTarget = (t: EventTarget | null) =>
      t instanceof HTMLInputElement ||
      t instanceof HTMLTextAreaElement ||
      t instanceof HTMLSelectElement ||
      (t instanceof HTMLElement && t.isContentEditable)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && yamlExpandedRef.current) {
        e.preventDefault()
        setYamlExpanded(false)
        return
      }
      if (e.code === 'Escape' && connectRef.current) {
        e.preventDefault()
        setConnect(null)
        setStatus('Connection cancelled.')
        return
      }
      if ((e.code === 'Delete' || e.key === 'Delete') && !e.repeat && !isTypingTarget(e.target)) {
        const id = selectedIdRef.current
        if (!id) return
        e.preventDefault()
        deleteBubbleRef.current(id)
        return
      }
      if (e.code !== 'Space' || e.repeat) return
      if (isTypingTarget(e.target)) return
      e.preventDefault()
      setSpaceHeld(true)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setSpaceHeld(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      if (panRafRef.current) cancelAnimationFrame(panRafRef.current)
    }
  }, [])

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

  const addBubble = (at?: { x: number; y: number }) => {
    const idBase = `Screen${graph.nodes.length + 1}`
    const used = new Set(graph.nodes.map((n) => n.dialogId.toLowerCase()))
    let dialogId = sanitizeDialogId(idBase)
    let i = 2
    while (used.has(dialogId.toLowerCase())) {
      dialogId = sanitizeDialogId(`${idBase}_${i}`)
      i += 1
    }
    const x = at?.x ?? 180 - panRef.current.x / scaleRef.current
    const y = at?.y ?? 160 - panRef.current.y / scaleRef.current
    const bubble = createBubble(x, y, dialogId)
    const next = { ...graph, nodes: [...graph.nodes, bubble] }
    if (!next.entryBubbleId) next.entryBubbleId = bubble.id
    pushHistory(next)
    setSelectedId(bubble.id)
    setStatus('Bubble added. Edit it in the popout, then use the right-side dot to connect.')
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
    setStatus('Option added. Connect this bubble with the right-side dot when you are ready.')
  }

  const removeBubble = (id: string) => {
    const g = graphRef.current
    if (!g.nodes.some((n) => n.id === id)) return
    pushHistory({
      ...g,
      entryBubbleId: g.entryBubbleId === id ? null : g.entryBubbleId,
      nodes: g.nodes.filter((n) => n.id !== id),
      edges: g.edges.filter((e) => e.fromBubbleId !== id && e.toBubbleId !== id),
    })
    setSelectedId((cur) => (cur === id ? null : cur))
    setPreferredOption(null)
    setPinnedIds((ids) => ids.filter((p) => p !== id))
    setConnect(null)
    setStatus('Bubble removed.')
  }
  deleteBubbleRef.current = removeBubble

  const deleteSelected = () => {
    if (!selected) return
    removeBubble(selected.id)
  }

  const togglePin = (id: string) => {
    setPinnedIds((ids) => {
      if (ids.includes(id)) {
        setStatus('Settings unlocked for this bubble.')
        return ids.filter((p) => p !== id)
      }
      setStatus('Settings locked open. You can still open and lock other bubbles.')
      return [...ids, id]
    })
    setSelectedId(id)
  }

  const clientToCanvas = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const { x: px, y: py } = panRef.current
    const s = scaleRef.current
    return {
      x: (clientX - rect.left - px) / s,
      y: (clientY - rect.top - py) / s,
    }
  }

  const finishConnect = (toBubbleId: string) => {
    const link = connectRef.current
    if (!link || link.fromBubbleId === toBubbleId) {
      setConnect(null)
      return
    }
    const from = graph.nodes.find((n) => n.id === link.fromBubbleId)
    const to = graph.nodes.find((n) => n.id === toBubbleId)
    if (!from || !to) {
      setConnect(null)
      return
    }

    const nodes = graph.nodes.map((n) => {
      if (n.id !== link.fromBubbleId) return n
      const withOption = link.newOption ? [...n.options, link.newOption] : n.options
      return {
        ...n,
        options: withOption.map((o) =>
          o.key === link.optionKey ? { ...o, isEnd: false, skillId: undefined } : o,
        ),
      }
    })

    const exists = graph.edges.some(
      (ed) => ed.fromBubbleId === link.fromBubbleId && ed.optionKey === link.optionKey,
    )
    const edges = exists
      ? graph.edges.map((ed) =>
          ed.fromBubbleId === link.fromBubbleId && ed.optionKey === link.optionKey
            ? { ...ed, toBubbleId }
            : ed,
        )
      : [
          ...graph.edges,
          {
            id: crypto.randomUUID(),
            fromBubbleId: link.fromBubbleId,
            optionKey: link.optionKey,
            toBubbleId,
          },
        ]

    pushHistory({ ...graph, nodes, edges })
    setConnect(null)
    const optLabel =
      nodes
        .find((n) => n.id === link.fromBubbleId)
        ?.options.find((o) => o.key === link.optionKey)?.label ?? link.optionKey
    setStatus(`Connected “${stripMm(optLabel)}” from ${from.dialogId} → ${to.dialogId}.`)
  }

  const beginConnectFrom = (bubble: DialogBubble, e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setDrag(null)
    const linked = new Set(
      graph.edges.filter((ed) => ed.fromBubbleId === bubble.id).map((ed) => ed.optionKey),
    )
    const preferred =
      preferredOption?.bubbleId === bubble.id
        ? bubble.options.find((o) => o.key === preferredOption.key)
        : undefined
    const free =
      preferred && !linked.has(preferred.key)
        ? preferred
        : bubble.options.find((o) => !linked.has(o.key))
    const pt = clientToCanvas(e.clientX, e.clientY)
    if (free) {
      setConnect({
        fromBubbleId: bubble.id,
        optionKey: free.key,
        x: pt.x,
        y: pt.y,
      })
      setStatus(
        `Connecting “${stripMm(free.label) || free.key}”. Click another bubble to finish. Esc cancels.`,
      )
    } else {
      const key = newOptionKey(`Option${bubble.options.length + 1}`, bubble.options.map((o) => o.key))
      const newOption: DialogOption = { key, label: `<green>${key}`, width: 150 }
      setConnect({
        fromBubbleId: bubble.id,
        optionKey: key,
        newOption,
        x: pt.x,
        y: pt.y,
      })
      setStatus('Connecting a new option. Click another bubble to finish. Esc cancels.')
    }
    setPreferredOption(null)
    setSelectedId(bubble.id)
  }

  const onBubblePointerDown = (e: React.PointerEvent, bubble: DialogBubble) => {
    if (spaceHeld || e.button === 1) return
    e.stopPropagation()

    if (connectRef.current || connectDrag) {
      if (bubble.id === (connectRef.current ?? connectDrag)?.fromBubbleId) {
        setConnect(null)
        setStatus('Connection cancelled.')
        return
      }
      finishConnect(bubble.id)
      return
    }

    setSelectedId(bubble.id)
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
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
      const nextX = panning.panX + (e.clientX - panning.x)
      const nextY = panning.panY + (e.clientY - panning.y)
      if (panRafRef.current) cancelAnimationFrame(panRafRef.current)
      panRafRef.current = requestAnimationFrame(() => {
        applyWorldTransform(nextX, nextY, scaleRef.current)
      })
      return
    }
    if (drag) {
      const s = scaleRef.current
      const dx = (e.clientX - drag.startX) / s
      const dy = (e.clientY - drag.startY) / s
      setGraph((g) => ({
        ...g,
        nodes: g.nodes.map((n) =>
          n.id === drag.bubbleId ? { ...n, x: drag.ox + dx, y: drag.oy + dy } : n,
        ),
      }))
      return
    }
    const link = connectRef.current
    if (link) {
      const pt = clientToCanvas(e.clientX, e.clientY)
      const next = { ...link, x: pt.x, y: pt.y }
      connectRef.current = next
      setConnectDrag(next)
    }
  }

  const endPan = () => {
    if (panRafRef.current) {
      cancelAnimationFrame(panRafRef.current)
      panRafRef.current = 0
    }
    setPan({ ...panRef.current })
    setPanning(null)
  }

  const onCanvasPointerUp = (e: React.PointerEvent) => {
    if (panning) {
      endPan()
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
    }
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
    const fromOuts = graph.edges.filter((ed) => ed.fromBubbleId === from.id)
    const outIndex = Math.max(0, fromOuts.findIndex((ed) => ed.id === edge.id))
    const outCount = Math.max(1, fromOuts.length)
    // Keep endpoints on the dots; spread only the curve so multiple links stay readable.
    const bend = (outIndex - (outCount - 1) / 2) * 36
    const x1 = from.x + DOT_OUT_X
    const y1 = from.y + DOT_CENTER_Y
    const x2 = to.x + DOT_IN_X
    const y2 = to.y + DOT_CENTER_Y
    const span = Math.max(48, Math.abs(x2 - x1) * 0.45)
    const c1x = x1 + span
    const c1y = y1 + bend
    const c2x = x2 - span
    const c2y = y2 + bend
    const opt = from.options.find((o) => o.key === edge.optionKey)
    const label = stripMm(opt?.label ?? edge.optionKey) || edge.optionKey
    return {
      edge,
      d: `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`,
      label,
      lx: (x1 + x2) / 2,
      ly: (y1 + y2) / 2 + bend * 0.35 - 8,
    }
  }).filter(Boolean) as {
    edge: (typeof graph.edges)[0]
    d: string
    label: string
    lx: number
    ly: number
  }[]

  const connectFrom = connectDrag
    ? graph.nodes.find((n) => n.id === connectDrag.fromBubbleId)
    : null
  const connectPreview =
    connectDrag && connectFrom
      ? {
          x1: connectFrom.x + DOT_OUT_X,
          y1: connectFrom.y + DOT_CENTER_Y,
          x2: connectDrag.x,
          y2: connectDrag.y,
        }
      : null

  return (
    <DialogShell size="xl" className="dialog-workplace" labelledBy="dialog-workplace-title" onClose={onClose}>
      <DialogHeader
        title="Dialog workplace"
        titleId="dialog-workplace-title"
        lead="Build branching Paper dialogs. Drag freely, connect with the side dots, then save into Dialogs/."
        onClose={onClose}
      />
      <DialogBody className="dw-body">
        <aside className="dw-toolbox" aria-label="Dialog tools">
          <button type="button" className="dw-tool" onClick={addBubble}>Add bubble</button>
          <button type="button" className="dw-tool" onClick={addOption} disabled={!selected}>Add option</button>
          <button type="button" className="dw-tool" onClick={deleteSelected} disabled={!selected}>Delete bubble</button>
          <button type="button" className="dw-tool" onClick={undo} disabled={past.length === 0}>Undo</button>
          <button type="button" className="dw-tool" onClick={redo} disabled={future.length === 0}>Redo</button>
          <button
            type="button"
            className="dw-tool"
            onClick={() => {
              pushHistory(createEmptyGraph())
              setSelectedId(null)
              setPinnedIds([])
            }}
          >
            Clear canvas
          </button>
          <button
            type="button"
            className="dw-tool"
            onClick={() => {
              const g = createQuestOfferGraph()
              pushHistory(g)
              setSelectedId(g.entryBubbleId)
              setPinnedIds([])
            }}
          >
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
          className={[
            'dw-canvas',
            panning || spaceHeld ? 'is-panning' : '',
            drag ? 'is-dragging-bubble' : '',
            connectDrag ? 'is-connecting' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          tabIndex={0}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
          onPointerCancel={() => {
            setDrag(null)
            endPan()
            setConnect(null)
          }}
          onPointerDown={(e) => {
            if (
              connectDrag &&
              e.button === 0 &&
              !e.altKey &&
              !spaceHeld &&
              !isInteractiveTarget(e.target)
            ) {
              e.preventDefault()
              setConnect(null)
              setStatus('Connection cancelled.')
              setSelectedId(null)
              return
            }
            const wantPan =
              e.button === 1 ||
              e.altKey ||
              spaceHeld ||
              (e.button === 0 && !isInteractiveTarget(e.target) && !connectDrag)
            if (!wantPan) return
            e.preventDefault()
            canvasRef.current?.setPointerCapture?.(e.pointerId)
            setPanning({
              x: e.clientX,
              y: e.clientY,
              panX: panRef.current.x,
              panY: panRef.current.y,
            })
            // Clear selection only; locked settings stay open.
            if (!spaceHeld) setSelectedId(null)
          }}
          onWheel={(e) => {
            e.preventDefault()
            const rect = canvasRef.current?.getBoundingClientRect()
            if (!rect) return
            const factor = e.deltaY > 0 ? 0.9 : 1.1
            const prev = scaleRef.current
            const next = Math.min(2, Math.max(0.35, prev * factor))
            if (next === prev) return
            const cx = e.clientX - rect.left
            const cy = e.clientY - rect.top
            const ratio = next / prev
            const p = panRef.current
            const nextPan = {
              x: cx - (cx - p.x) * ratio,
              y: cy - (cy - p.y) * ratio,
            }
            applyWorldTransform(nextPan.x, nextPan.y, next)
            setPan(nextPan)
            setScale(next)
          }}
          onDoubleClick={(e) => {
            if (isInteractiveTarget(e.target) || connectDrag || spaceHeld) return
            e.preventDefault()
            const pt = clientToCanvas(e.clientX, e.clientY)
            // Place so the click lands near the bubble center.
            addBubble({ x: pt.x - BUBBLE_W / 2, y: pt.y - 48 })
          }}
        >
          <div ref={worldRef} className="dw-world">
            <svg className="dw-edges" aria-hidden>
              {edgePaths.map(({ edge, d, label, lx, ly }) => (
                <g
                  key={edge.id}
                  className="dw-edge-group"
                  onPointerDown={(ev) => {
                    ev.stopPropagation()
                    ev.preventDefault()
                  }}
                  onClick={(ev) => {
                    ev.stopPropagation()
                    deleteEdgeAt(edge.id)
                  }}
                >
                  <path d={d} className="dw-edge-hit" />
                  <path d={d} className="dw-edge" />
                  <rect
                    className="dw-edge-label-bg"
                    x={lx - Math.min(54, 6 + label.length * 3.2)}
                    y={ly - 9}
                    width={Math.min(108, 12 + label.length * 6.4)}
                    height={18}
                    rx={6}
                  />
                  <text
                    className="dw-edge-label"
                    x={lx}
                    y={ly + 4}
                    textAnchor="middle"
                    fill="#f2eefc"
                  >
                    {label.length > 16 ? `${label.slice(0, 15)}…` : label}
                  </text>
                  <title>Click to remove connection</title>
                </g>
              ))}
              {connectPreview ? (
                <path
                  className="dw-edge dw-edge-preview"
                  d={`M ${connectPreview.x1} ${connectPreview.y1} L ${connectPreview.x2} ${connectPreview.y2}`}
                />
              ) : null}
            </svg>

            {graph.nodes.map((bubble) => {
              const isSel = bubble.id === selectedId
              const isPinned = pinnedIds.includes(bubble.id)
              const showSettings = isPinned || isSel
              const isEntry = bubble.id === graph.entryBubbleId
              const isSource = connectDrag?.fromBubbleId === bubble.id
              return (
                <div
                  key={bubble.id}
                  className={[
                    'dw-bubble',
                    isSel ? 'selected' : '',
                    isPinned ? 'pinned' : '',
                    isEntry ? 'entry' : '',
                    isSource ? 'is-connect-source' : '',
                    connectDrag && !isSource ? 'is-connect-target' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    left: bubble.x,
                    top: bubble.y,
                    zIndex: isSel ? 5 : showSettings ? 4 : undefined,
                  }}
                  onPointerDown={(e) => onBubblePointerDown(e, bubble)}
                >
                  <button
                    type="button"
                    className="dw-dot dw-dot-in"
                    aria-label={`Connect into ${bubble.dialogId}`}
                    title="Drop connection here"
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      if (connectDrag && connectDrag.fromBubbleId !== bubble.id) {
                        finishConnect(bubble.id)
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="dw-dot dw-dot-out"
                    aria-label={`Connect from ${bubble.dialogId}`}
                    title="Start a connection"
                    onPointerDown={(e) => {
                      if (connectDrag && connectDrag.fromBubbleId !== bubble.id) {
                        e.stopPropagation()
                        e.preventDefault()
                        finishConnect(bubble.id)
                        return
                      }
                      beginConnectFrom(bubble, e)
                    }}
                  />
                  <div className="dw-bubble-head">
                    <span className="dw-bubble-id">{bubble.dialogId}</span>
                    {isEntry ? <span className="dw-badge">Entry</span> : null}
                  </div>
                  <p className="dw-bubble-title">{stripMm(bubble.title)}</p>
                  <p className="dw-bubble-preview">
                    {bubble.body[0]?.type === 'text'
                      ? stripMm(bubble.body[0].message)
                      : 'Item body'}
                  </p>
                  {bubble.options.length > 0 ? (
                    <ul className="dw-option-chips" aria-label="Options">
                      {bubble.options.map((opt) => {
                        const link = graph.edges.find(
                          (ed) => ed.fromBubbleId === bubble.id && ed.optionKey === opt.key,
                        )
                        const target = link
                          ? graph.nodes.find((n) => n.id === link.toBubbleId)
                          : null
                        const preferred =
                          preferredOption?.bubbleId === bubble.id &&
                          preferredOption.key === opt.key
                        const chipLabel = stripMm(opt.label) || opt.key
                        return (
                          <li key={opt.key}>
                            <button
                              type="button"
                              className={[
                                'dw-option-chip',
                                link ? 'linked' : '',
                                preferred ? 'preferred' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              title={
                                target
                                  ? `Goes to ${target.dialogId}. Select this button, then use the right-side dot to reconnect.`
                                  : 'Select this button, then use the right-side dot to connect.'
                              }
                              onPointerDown={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                setSelectedId(bubble.id)
                                setPreferredOption({ bubbleId: bubble.id, key: opt.key })
                                setStatus(
                                  target
                                    ? `“${chipLabel}” selected (→ ${target.dialogId}). Use the right-side dot to reconnect.`
                                    : `“${chipLabel}” selected. Use the right-side dot to connect it.`,
                                )
                              }}
                            >
                              {chipLabel}
                              {target ? (
                                <span className="dw-chip-target">→ {target.dialogId}</span>
                              ) : null}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}

                  {showSettings ? (
                    <div
                      className={`dw-popout ${isPinned ? 'is-locked' : ''}`}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="dw-popout-caret" aria-hidden />
                      <div className="dw-popout-head">
                        <span className="dw-popout-heading">Screen settings</span>
                        <button
                          type="button"
                          className={`dw-lock-btn ${isPinned ? 'active' : ''}`}
                          aria-label={isPinned ? 'Unlock settings panel' : 'Lock settings panel open'}
                          aria-pressed={isPinned}
                          title={
                            isPinned
                              ? 'Unlock so this panel can close'
                              : 'Lock this panel open. Other bubbles can stay locked too.'
                          }
                          onClick={() => togglePin(bubble.id)}
                        >
                          <LockIcon locked={isPinned} />
                        </button>
                      </div>
                      <div className="dw-popout-grid">
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
                        <label className="dw-span-2">
                          Body text
                          <textarea
                            rows={2}
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
                        <div className="dw-popout-row">
                          <span>Allow ESC close</span>
                          <Switch
                            checked={bubble.canClose}
                            onChange={(on) => updateBubble(bubble.id, { canClose: on })}
                            aria-label="Allow ESC close"
                          />
                        </div>
                        <label>
                          After button click
                          <select
                            value={bubble.afterAction}
                            onChange={(e) =>
                              updateBubble(bubble.id, {
                                afterAction: e.target.value as DialogAfterAction,
                              })
                            }
                          >
                            <option value="CLOSE">Close dialog</option>
                            <option value="NONE">Keep open (NONE)</option>
                            <option value="WAIT_FOR_RESPONSE">Wait for response</option>
                          </select>
                        </label>
                        <label>
                          Exit button label
                          <input
                            value={bubble.exitButton?.label ?? ''}
                            placeholder="Optional, e.g. Close"
                            onChange={(e) => {
                              const label = e.target.value
                              patchBubbleLive(bubble.id, {
                                exitButton: label.trim()
                                  ? {
                                      label,
                                      width: bubble.exitButton?.width ?? 100,
                                      skillId: bubble.exitButton?.skillId,
                                    }
                                  : null,
                              })
                            }}
                          />
                        </label>
                      </div>
                      <div className="dw-options-edit">
                        <span className="dw-options-label">Buttons</span>
                        {bubble.options.map((opt, oi) => (
                          <div key={opt.key} className="dw-option-block">
                            <div className="dw-option-row">
                              <input
                                value={opt.label}
                                aria-label={`Button label ${opt.key}`}
                                placeholder="Label"
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
                            <div className="dw-option-meta-row">
                              <input
                                className="dw-option-meta"
                                value={opt.tooltip ?? ''}
                                placeholder="Tooltip"
                                aria-label={`Tooltip for ${opt.key}`}
                                onChange={(e) => {
                                  const options = bubble.options.map((o, i) =>
                                    i === oi ? { ...o, tooltip: e.target.value } : o,
                                  )
                                  patchBubbleLive(bubble.id, { options })
                                }}
                              />
                              <input
                                className="dw-option-meta"
                                value={opt.skillId ?? ''}
                                placeholder="Custom skill"
                                aria-label={`Skill for ${opt.key}`}
                                onChange={(e) => {
                                  const options = bubble.options.map((o, i) =>
                                    i === oi
                                      ? { ...o, skillId: e.target.value.trim() || undefined }
                                      : o,
                                  )
                                  patchBubbleLive(bubble.id, { options })
                                }}
                              />
                            </div>
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
            <div className="dw-yaml-head">
              <h3 className="dw-yaml-title">Live YAML</h3>
              <button
                type="button"
                className="dw-mini"
                onClick={() => setYamlExpanded(true)}
              >
                View all
              </button>
            </div>
            <div className="dw-yaml-scroll">
              <pre>{compiled.dialogYaml}</pre>
              {compiled.skillsYaml.includes('showdialog') ? (
                <>
                  <h3 className="dw-yaml-title">Link skills</h3>
                  <pre>{compiled.skillsYaml}</pre>
                </>
              ) : null}
            </div>
          </aside>
        ) : null}

        {showYaml && yamlExpanded ? (
          <div className="dw-yaml-expanded" role="dialog" aria-label="Full YAML preview">
            <div className="dw-yaml-expanded-bar">
              <h3 className="dw-yaml-title">Live YAML</h3>
              <button
                type="button"
                className="dw-mini"
                onClick={() => setYamlExpanded(false)}
              >
                Collapse
              </button>
            </div>
            <div className="dw-yaml-expanded-scroll">
              <pre>{compiled.dialogYaml}</pre>
              {compiled.skillsYaml.includes('showdialog') ? (
                <>
                  <h3 className="dw-yaml-title">Link skills</h3>
                  <pre>{compiled.skillsYaml}</pre>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </DialogBody>
      <DialogFooter className="dw-footer">
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setShowYaml((v) => {
              if (v) setYamlExpanded(false)
              return !v
            })
          }}
        >
          {showYaml ? 'Hide YAML' : 'Preview YAML'}
        </button>
        <button type="button" className="ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="primary" onClick={saveToPack}>Save to pack</button>
      </DialogFooter>
    </DialogShell>
  )
}
