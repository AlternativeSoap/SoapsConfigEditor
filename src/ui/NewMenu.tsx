import { useEffect, useRef, useState, type ReactNode } from 'react'
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

const MYTHIC_CRUCIBLE_ITEMS: { kind: CreateKind; label: string }[] = [
  { kind: 'equipment-set', label: 'New equipment set' },
  { kind: 'augment-type', label: 'New augment type' },
  { kind: 'crucible-item', label: 'New Crucible item' },
  { kind: 'bag', label: 'New bag' },
]

const MMOCORE_ITEMS: { kind: CreateKind; label: string }[] = [
  { kind: 'class', label: 'New class' },
  { kind: 'mmocore-skill', label: 'New skill' },
  { kind: 'elements', label: 'Edit elements' },
  { kind: 'skill-casting', label: 'Skill casting mode' },
]

const SOAPSQUEST_ITEMS: { kind: CreateKind; label: string }[] = [
  { kind: 'quest', label: 'New quest' },
  { kind: 'edit-quest', label: 'Edit quest' },
]

function MenuSection({
  label,
  items,
  onCreate,
  onPicked,
}: {
  label?: string
  items: { kind: CreateKind; label: string }[]
  onCreate: (kind: CreateKind) => void
  onPicked: () => void
}): ReactNode {
  if (items.length === 0) return null
  return (
    <>
      {label ? (
        <div className="new-menu-section" role="presentation">
          {label}
        </div>
      ) : null}
      {items.map((item) => (
        <button
          key={item.kind}
          type="button"
          role="menuitem"
          className="new-menu-item"
          onClick={() => {
            onPicked()
            onCreate(item.kind)
          }}
        >
          {item.label}
        </button>
      ))}
    </>
  )
}

export function NewMenu({ disabled, workspace, mythicAddons, onCreate }: NewMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
          {workspace === 'mmocore' ? (
            <MenuSection items={MMOCORE_ITEMS} onCreate={onCreate} onPicked={() => setOpen(false)} />
          ) : workspace === 'soapsquest' ? (
            <MenuSection items={SOAPSQUEST_ITEMS} onCreate={onCreate} onPicked={() => setOpen(false)} />
          ) : (
            <>
              <MenuSection items={MYTHIC_ITEMS} onCreate={onCreate} onPicked={() => setOpen(false)} />
              <MenuSection
                label="MythicRPG"
                items={mythicAddons?.mythicrpg ? MYTHIC_RPG_ITEMS : []}
                onCreate={onCreate}
                onPicked={() => setOpen(false)}
              />
              <MenuSection
                label="Crucible"
                items={mythicAddons?.crucible ? MYTHIC_CRUCIBLE_ITEMS : []}
                onCreate={onCreate}
                onPicked={() => setOpen(false)}
              />
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
