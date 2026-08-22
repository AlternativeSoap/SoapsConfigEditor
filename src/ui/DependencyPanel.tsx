import { useMemo } from 'react'
import { buildFileDeps } from '../core/mythicmobs/deps'
import type { FileRecord } from '../types'

interface DependencyPanelProps {
  activeFile: FileRecord
  allFiles: FileRecord[]
  onNavigate: (path: string) => void
}

const CATEGORY_LABEL: Record<string, string> = {
  mobs: 'Mob',
  items: 'Item',
  skills: 'Skill',
  droptables: 'Drop Table',
  randomspawns: 'Random Spawn',
}

function shortPath(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts.slice(-2).join('/')
}

export function DependencyPanel({ activeFile, allFiles, onNavigate }: DependencyPanelProps) {
  const deps = useMemo(
    () => buildFileDeps(activeFile, allFiles),
    [activeFile, allFiles],
  )

  const empty = deps.uses.length === 0 && deps.usedBy.length === 0

  return (
    <div className="dep-panel">
      <div className="dep-panel-title">Dependencies</div>

      {empty && (
        <p className="dep-empty">No cross-file references found in this file.</p>
      )}

      {deps.uses.length > 0 && (
        <section className="dep-section">
          <div className="dep-section-label">Uses</div>
          {deps.uses.map((link) => (
            <button
              key={link.id + link.filePath}
              type="button"
              className="dep-link"
              onClick={() => onNavigate(link.filePath)}
              title={link.filePath}
            >
              <span className="dep-link-id">{link.id}</span>
              <span className="dep-link-cat">{CATEGORY_LABEL[link.category] ?? link.category}</span>
              <span className="dep-link-file">{shortPath(link.filePath)}</span>
            </button>
          ))}
        </section>
      )}

      {deps.usedBy.length > 0 && (
        <section className="dep-section">
          <div className="dep-section-label">Used by</div>
          {deps.usedBy.map((u) => (
            <button
              key={u.filePath}
              type="button"
              className="dep-link"
              onClick={() => onNavigate(u.filePath)}
              title={u.filePath}
            >
              <span className="dep-link-id">{u.targetId}</span>
              <span className="dep-link-file">{shortPath(u.filePath)}</span>
            </button>
          ))}
        </section>
      )}
    </div>
  )
}
