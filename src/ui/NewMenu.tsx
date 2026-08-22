import { useEffect, useRef, useState } from 'react'
import type { CreateKind, WorkspaceKind } from '../types'
import type { MythicAddons } from '../core/workspaces/mythicAddons'

interface NewMenuProps {
  disabled: boolean
  workspace: WorkspaceKind
  mythicAddons?: MythicAddons
  onCreate: (kind: CreateKind) => void
}

const MYTHIC_ITEMS: { kind: CreateKind; label: string }[] = [
  { kind: 'mob', label: 'New mob' },
  { kind: 'item', label: 'New item' },
  { kind: 'skill', label: 'New skill' },
  { kind: 'droptable', label: 'New drop table' },
  { kind: 'randomspawn', label: 'New random spawn' },
]

const MYTHIC_RPG_ITEMS: { kind: CreateKind; label: string }[] = [
  { kind: 'spell', label: 'New spell' },
  { kind: 'archetype', label: 'New archetype' },
  { kind: 'reagent', label: 'New reagent' },
]

const MMOCORE_ITEMS: { kind: CreateKind; label: string }[] = [
  { kind: 'class', label: 'New class' },
  { kind: 'mmocore-skill', label: 'New skill' },
  { kind: 'elements', label: 'Edit elements' },
  { kind: 'skill-casting', label: 'Skill casting mode' },
]

const SOAPSQUEST_ITEMS: { kind: CreateKind; label: string }[] = [
  { kind: 'quest', label: 'New quest' },
]

export function NewMenu({ disabled, workspace, mythicAddons, onCreate }: NewMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const items =
    workspace === 'mmocore'
      ? MMOCORE_ITEMS
      : workspace === 'soapsquest'
        ? SOAPSQUEST_ITEMS
        : [
            ...MYTHIC_ITEMS,
            ...(mythicAddons?.mythicrpg ? MYTHIC_RPG_ITEMS : []),
          ]

  useEffect(() => {
    if (!open) return
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div className="new-menu-wrap" ref={ref}>
      <button
        type="button"
        className="new-menu-trigger"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        New <span className="new-menu-chevron" aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div className="new-menu-dropdown" role="menu">
          {items.map((item) => (
            <button
              key={item.kind}
              type="button"
              role="menuitem"
              className="new-menu-item"
              onClick={() => {
                setOpen(false)
                onCreate(item.kind)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
