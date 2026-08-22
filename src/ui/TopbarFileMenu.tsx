import { useEffect, useRef, useState } from 'react'

interface TopbarFileMenuProps {
  startLabel: string
  needsSaveFolder: boolean
  folderWriteBlocked: boolean
  dirtyCount: number
  onOpenFolder: () => void
  onChooseSaveFolder: () => void
  onReconnectFolder: () => void
  onStartNewPack: () => void
  onSaveAll: () => void
  onChangeWorkspace: () => void
}

export function TopbarFileMenu({
  startLabel,
  needsSaveFolder,
  folderWriteBlocked,
  dirtyCount,
  onOpenFolder,
  onChooseSaveFolder,
  onReconnectFolder,
  onStartNewPack,
  onSaveAll,
  onChangeWorkspace,
}: TopbarFileMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
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

  function pick(action: () => void) {
    setOpen(false)
    action()
  }

  return (
    <div className="topbar-menu-wrap" ref={ref}>
      <button
        type="button"
        className={`topbar-menu-trigger${open ? ' active' : ''}${needsSaveFolder ? ' attention' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        File <span className="topbar-menu-chevron" aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div className="topbar-menu-dropdown" role="menu">
          <button type="button" className="topbar-menu-item" role="menuitem" onClick={() => pick(onOpenFolder)}>
            Open folder…
          </button>
          {needsSaveFolder ? (
            <button
              type="button"
              className="topbar-menu-item emphasis"
              role="menuitem"
              onClick={() => pick(onChooseSaveFolder)}
            >
              Choose save folder…
            </button>
          ) : null}
          {folderWriteBlocked && !needsSaveFolder ? (
            <button
              type="button"
              className="topbar-menu-item emphasis"
              role="menuitem"
              onClick={() => pick(onReconnectFolder)}
            >
              Reconnect folder…
            </button>
          ) : null}
          <button type="button" className="topbar-menu-item" role="menuitem" onClick={() => pick(onStartNewPack)}>
            {startLabel}…
          </button>
          <div className="topbar-menu-divider" role="separator" />
          <button
            type="button"
            className="topbar-menu-item"
            role="menuitem"
            disabled={dirtyCount === 0}
            onClick={() => pick(onSaveAll)}
          >
            Save all{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
            <span className="topbar-menu-shortcut">Ctrl+Shift+S</span>
          </button>
          <div className="topbar-menu-divider" role="separator" />
          <button type="button" className="topbar-menu-item muted" role="menuitem" onClick={() => pick(onChangeWorkspace)}>
            Change plugin…
          </button>
        </div>
      ) : null}
    </div>
  )
}
